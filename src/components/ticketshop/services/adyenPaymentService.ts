import { api } from '../api/base';
import type { ApiResponse } from '../api/types';

// Simplified Adyen types based on Sessions flow
export interface AdyenSessionRequest {
  orderId: string;
  returnUrl?: string;
}

export interface AdyenSessionResponse {
  sessionId: string;       // session ID field
  sessionData: string;      // Session data for Drop-in
}

export interface AdyenPaymentDetails {
  sessionId: string;
  sessionResult: string;   // From Drop-in onSubmit
  orderId: string;
}

export interface AdyenPaymentResult {
  resultCode: string;      // "Authorised", "Refused", "Pending", etc.
  pspReference?: string;
  refusalReason?: string;
}

/**
 * Minimal Adyen Payment Service following Sessions flow
 */
class AdyenPaymentService {
  /**
   * Creates a payment session
   */
  async createSession(request: AdyenSessionRequest): Promise<AdyenSessionResponse> {
    // console.log('🔄 Creating Adyen session with request:', request);
    
    const response = await api.post<ApiResponse<AdyenSessionResponse>>(
      '/adyen/sessions',
      request
    );
    
    // console.log('📥 Raw API response:', response);
    // console.log('📥 Response data:', response.data);
    // console.log('📥 Response success:', response.data.success);
    // console.log('📥 Response data.data:', response.data.data);
    
    if (!response.data.success || !response.data.data) {
      console.error('❌ API response indicates failure:', response.data);
      throw new Error(response.data.message || 'Failed to create session');
    }
    
    const sessionData = response.data.data;
    // console.log('✅ Returning session data:', sessionData);
    // console.log('🔍 Session ID (sessionId field):', sessionData.sessionId);
    // console.log('🔍 Session data type:', typeof sessionData.sessionData);
    
    return sessionData;
  }
}

// Export service instance
export const adyenPaymentService = new AdyenPaymentService();

// Result code helpers
export const isSuccessfulPayment = (resultCode: string): boolean => {
  return resultCode === 'Authorised';
};

export const isFailedPayment = (resultCode: string): boolean => {
  return ['Refused', 'Cancelled', 'Error'].includes(resultCode);
};
