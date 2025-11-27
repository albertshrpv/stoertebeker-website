import type { SeatConflictError, ValidationError, ApiError, SecurityError, SecurityErrorCode } from '../api/orders';

export interface OrderResult {
  success: boolean;
  order?: any;
  customer_id?: string;
  address_id?: string;
  error?: {
    type: 'seat_conflict' | 'validation_error' | 'network_error' | 'security_error' | 'unknown_error';
    message: string;
    bookedSeats?: string[];
    reservedSeats?: string[];
    securityCode?: SecurityErrorCode;
  };
}

/**
 * Handles order creation errors according to the implementation guide
 */
export async function handleOrderError(error: any): Promise<OrderResult> {
  try {
    // Check if it's a Response object with status
    if (error.response?.status === 409) {
      // Seat conflict error
      try {
        const conflictData = await error.response.json();
        return {
          success: false,
          error: {
            type: 'seat_conflict',
            message: 'Some seats are no longer available',
            bookedSeats: conflictData.data?.booked || [],
            reservedSeats: conflictData.data?.reserved || []
          }
        };
      } catch {
        return {
          success: false,
          error: {
            type: 'seat_conflict',
            message: 'Seat availability conflict occurred'
          }
        };
      }
      
    } else if (error.response?.status === 400) {
      // Check if it's a security error first
      try {
        const errorData = await error.response.json();
        if (errorData.code && ['SESSION_REQUIRED', 'INVALID_INTENT', 'INVALID_NONCE', 'SESSION_MISMATCH', 'SEAT_MISMATCH', 'AMOUNT_MISMATCH', 'ALREADY_USED'].includes(errorData.code)) {
          return {
            success: false,
            error: {
              type: 'security_error',
              message: errorData.message || 'Security validation failed',
              securityCode: errorData.code
            }
          };
        }
        
        // Regular validation error
        return {
          success: false,
          error: {
            type: 'validation_error',
            message: errorData.message || 'Validation failed'
          }
        };
      } catch {
        return {
          success: false,
          error: {
            type: 'validation_error',
            message: 'Request validation failed'
          }
        };
      }
      
    } else if (error.name === 'TypeError' || error.message?.includes('fetch')) {
      // Network error
      return {
        success: false,
        error: {
          type: 'network_error',
          message: 'Network connection failed. Please check your internet connection.'
        }
      };
      
    } else {
      // Other/unknown errors
      return {
        success: false,
        error: {
          type: 'unknown_error',
          message: error.message || 'An unexpected error occurred'
        }
      };
    }
  } catch (parseError) {
    // If we can't parse the error, return a generic unknown error
    return {
      success: false,
      error: {
        type: 'unknown_error',
        message: 'An unexpected error occurred during order processing'
      }
    };
  }
}

/**
 * Creates a friendly error message for display to users
 */
export function getOrderErrorMessage(error: OrderResult['error']): string {
  if (!error) return 'An unknown error occurred';
  
  switch (error.type) {
    case 'seat_conflict':
      let message = 'Einige Plätze sind nicht mehr verfügbar. ';
      if (error.bookedSeats?.length) {
        message += `Bereits gebuchte Plätze: ${error.bookedSeats.join(', ')}. `;
      }
      if (error.reservedSeats?.length) {
        message += `Von anderen reservierte Plätze: ${error.reservedSeats.join(', ')}. `;
      }
      message += 'Bitte wählen Sie andere Plätze aus.';
      return message;
      
    case 'security_error':
      return getSecurityErrorMessage(error.securityCode);
      
    case 'validation_error':
      return `Validierungsfehler: ${error.message}`;
      
    case 'network_error':
      return 'Netzwerkverbindung fehlgeschlagen. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
      
    default:
      return `Ein Fehler ist aufgetreten: ${error.message}`;
  }
}

/**
 * Gets user-friendly error message for security errors
 */
export function getSecurityErrorMessage(securityCode?: SecurityErrorCode): string {
  if (!securityCode) return 'Ein Sicherheitsfehler ist aufgetreten. Bitte versuchen Sie es erneut.';
  
  const messages = {
    'SESSION_REQUIRED': 'Keine aktive Sitzung gefunden. Bitte reservieren Sie zuerst Plätze.',
    'INVALID_INTENT': 'Bestellabsicht nicht gefunden oder abgelaufen. Bitte versuchen Sie es erneut.',
    'INVALID_NONCE': 'Sicherheitstoken ungültig oder abgelaufen. Bitte versuchen Sie es erneut.',
    'SESSION_MISMATCH': 'Sitzungskonflikt erkannt. Bitte aktualisieren Sie die Seite und versuchen Sie es erneut.',
    'SEAT_MISMATCH': 'Ausgewählte Plätze haben sich geändert. Bitte aktualisieren Sie Ihre Auswahl.',
    'AMOUNT_MISMATCH': 'Bestellsumme hat sich geändert. Bitte überprüfen Sie die Preise und versuchen Sie es erneut.',
    'ALREADY_USED': 'Diese Bestellung wurde bereits verarbeitet. Bitte erstellen Sie eine neue Bestellung.'
  };
  
  return messages[securityCode] || 'Ein Sicherheitsfehler ist aufgetreten. Bitte versuchen Sie es erneut.';
}

/**
 * Determines if an error is retryable by the user
 */
export function isRetryableError(error: OrderResult['error']): boolean {
  if (!error) return false;
  
  // Network and unknown errors are always retryable
  if (error.type === 'network_error' || error.type === 'unknown_error') {
    return true;
  }
  
  // Some security errors are retryable
  if (error.type === 'security_error' && error.securityCode) {
    return ['INVALID_INTENT', 'INVALID_NONCE', 'ALREADY_USED'].includes(error.securityCode);
  }
  
  return false;
}

/**
 * Determines if an error requires seat reselection
 */
export function requiresSeatReselection(error: OrderResult['error']): boolean {
  if (!error) return false;
  
  // Seat conflicts always require reselection
  if (error.type === 'seat_conflict') {
    return true;
  }
  
  // Seat mismatch security error requires reselection
  if (error.type === 'security_error' && error.securityCode === 'SEAT_MISMATCH') {
    return true;
  }
  
  return false;
}

/**
 * Determines if an error requires creating a new order intent
 */
export function requiresNewIntent(error: OrderResult['error']): boolean {
  if (!error) return false;
  
  if (error.type === 'security_error' && error.securityCode) {
    return ['INVALID_INTENT', 'INVALID_NONCE', 'ALREADY_USED', 'SEAT_MISMATCH', 'AMOUNT_MISMATCH'].includes(error.securityCode);
  }
  
  return false;
}
