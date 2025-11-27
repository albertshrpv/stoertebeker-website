import type { OrderAddressData, OrderFinancialBreakdown } from '../types/order';
import { api } from './base';
import type { ApiResponse } from './types';

export type TicketType = 'e-ticket' | 'printed-ticket' | 'digital-ticket';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
export type DeliveryStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled';

// Order intent request for authenticated customers
export interface CreateOrderIntentRequest {
  sessionId: string;
  // Optional for voucher-only orders (no show/series context)
  showId?: string;
  seriesId?: string;
  totalAmount: number;
  currency: string;
  customerId?: string;  // optional for authenticated customers
}

// Order intent request for guest customers
export interface CreateGuestOrderIntentRequest {
  sessionId: string;
  // Optional for voucher-only orders (no show/series context)
  showId?: string;
  seriesId?: string;
  totalAmount: number;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// Order intent response
export interface OrderIntentResponse {
  success: true;
  message: string;
  data: {
    intentId: string;
    nonce: string;
    expiresAt: number;
    validation: {
      expectedSeatIds: string[];
      expectedTotal: number;
      expectedCurrency: string;
    };
  };
}

// Security error codes
export type SecurityErrorCode = 
  | 'SESSION_REQUIRED' 
  | 'INVALID_INTENT' 
  | 'INVALID_NONCE' 
  | 'SESSION_MISMATCH' 
  | 'SEAT_MISMATCH' 
  | 'AMOUNT_MISMATCH' 
  | 'ALREADY_USED';

// Security validation error
export interface SecurityError extends ApiError {
  code: SecurityErrorCode;
}


// Order creation request for existing customer
export interface CreateOrderRequest {
  // Security fields (required)
  intent_id: string;        // Order intent ID
  nonce: string;           // One-time nonce
  session_id: string;      // Session ID
  
  customer_id: string;      // Required - existing customer UUID
  total_amount: number;     // Final total amount
  currency?: string;        // Defaults to 'EUR'
  ticket_type?: TicketType; // Defaults to 'e-ticket'
  
  // Required financial breakdown
  financial_breakdown: OrderFinancialBreakdown;
  
  // Event identifiers (optional for voucher-only orders)
  show_id?: string;          // UUID of the event show
  series_id?: string;        // UUID of the event series
  
  // Payment details
  selected_payment_method_id: string; // UUID of payment method
  payment_status?: PaymentStatus;
  payment_transaction_id?: string | null;
  payment_transaction_data?: any | null;
  
  // Optional addresses (can override customer defaults)
  delivery_address?: OrderAddressData;
  billing_address?: OrderAddressData;
  
  // Optional delivery
  delivery_option_id?: string;
  delivery_status?: DeliveryStatus;
  
  // Order items
  line_items?: any[] | null;
}


// Order creation request for new/guest customer
export interface CreateGuestOrderRequest {
  // Security fields (required)
  intent_id: string;        // Order intent ID
  nonce: string;           // One-time nonce
  session_id: string;      // Session ID
  
  // Customer information (will create or find existing customer)
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  
  // Address information (will create or find existing address)
  company?: string;
  street: string;
  address_add?: string;
  postcode: string;
  city: string;
  country_code: string;     // ISO-2 code like "DE", "US", etc.
  
  // Order details
  total_amount: number;
  currency?: string;
  ticket_type?: TicketType;
  
  // Required financial breakdown
  financial_breakdown: OrderFinancialBreakdown;
  
  // Event identifiers (optional for voucher-only orders)
  show_id?: string;
  series_id?: string;
  
  // Payment details
  selected_payment_method_id: string;
  payment_status?: PaymentStatus;
  payment_transaction_id?: string | null;
  payment_transaction_data?: any | null;
  
  // Optional delivery
  delivery_option_id?: string;
  delivery_status?: DeliveryStatus;
  
  // Order items
  line_items?: any[] | null;
}


// Error response types
export interface ApiError {
  success: false;
  message: string;
  data?: any;
}

// Seat availability conflicts (HTTP 409)
export interface SeatConflictError extends ApiError {
  data: {
    booked: string[];     // Array of "showId:seatNumber" already booked
    reserved: string[];   // Array of "showId:seatNumber" reserved by others
  };
}

// Validation errors (HTTP 400)
export interface ValidationError extends ApiError {
  message: string; // Specific validation failure message
}

export const ordersApi = {
  // Order Intent creation
  createOrderIntent: (payload: CreateOrderIntentRequest) =>
    api.post<OrderIntentResponse>('/order-intents', payload),
  
  createGuestOrderIntent: (payload: CreateGuestOrderIntentRequest) =>
    api.post<OrderIntentResponse>('/order-intents/guest', payload),

  // Secure order creation
  createOrder: (payload: CreateOrderRequest) =>
    api.post<ApiResponse<{ order: any }>>('/orders', payload),

  createGuestOrder: (payload: CreateGuestOrderRequest) =>
    api.post<ApiResponse<{ order: any; customer_id: string; address_id: string }>>('/orders/guest', payload),

  // Order retrieval
  getByOrderNumber: (orderNumber: number) =>
    api.get<ApiResponse<{ order: any }>>(`/orders/number/${orderNumber}`),

  getOrdersByCustomerId: (customerId: string) =>
    api.get<ApiResponse<{ orders: any[] }>>(`/orders/customer/${customerId}`),
};


