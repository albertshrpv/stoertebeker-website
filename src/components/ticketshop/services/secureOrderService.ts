import { ordersApi, type CreateOrderIntentRequest, type CreateGuestOrderIntentRequest, type CreateOrderRequest, type CreateGuestOrderRequest, type OrderIntentResponse, type SecurityError, type SecurityErrorCode } from '../api/orders';
import type { ApiResponse } from '../api/types';

/**
 * Enhanced Order Security Service
 * Implements the two-step secure order flow: Intent Creation → Order Placement
 */
export class SecureOrderService {
  /**
   * Creates an order intent for authenticated customers
   */
  static async createOrderIntent(orderData: CreateOrderIntentRequest): Promise<OrderIntentResponse> {
    try {
      const response = await ordersApi.createOrderIntent(orderData);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create order intent');
      }
      return response.data;
    } catch (error) {
      console.error('Order intent creation failed:', error);
      throw error;
    }
  }

  /**
   * Creates an order intent for guest customers
   */
  static async createGuestOrderIntent(orderData: CreateGuestOrderIntentRequest): Promise<OrderIntentResponse> {
    try {
      const response = await ordersApi.createGuestOrderIntent(orderData);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create guest order intent');
      }
      return response.data;
    } catch (error) {
      console.error('Guest order intent creation failed:', error);
      throw error;
    }
  }

  /**
   * Places a secure order for authenticated customers
   */
  static async placeOrder(orderData: Omit<CreateOrderRequest, 'intent_id' | 'nonce' | 'session_id'>, intent: OrderIntentResponse['data'], sessionId: string): Promise<ApiResponse<{ order: any }>> {
    const secureOrderData: CreateOrderRequest = {
      ...orderData,
      intent_id: intent.intentId,
      nonce: intent.nonce,
      session_id: sessionId
    };

    try {
      const response = await ordersApi.createOrder(secureOrderData);
      return response.data;
    } catch (error) {
      console.error('Secure order placement failed:', error);
      throw error;
    }
  }

  /**
   * Places a secure guest order
   */
  static async placeGuestOrder(orderData: Omit<CreateGuestOrderRequest, 'intent_id' | 'nonce' | 'session_id'>, intent: OrderIntentResponse['data'], sessionId: string): Promise<ApiResponse<{ order: any; customer_id: string; address_id: string }>> {
    const secureOrderData: CreateGuestOrderRequest = {
      ...orderData,
      intent_id: intent.intentId,
      nonce: intent.nonce,
      session_id: sessionId
    };

    try {
      const response = await ordersApi.createGuestOrder(secureOrderData);
      return response.data;
    } catch (error) {
      console.error('Secure guest order placement failed:', error);
      throw error;
    }
  }

  /**
   * Complete secure order flow for authenticated customers
   */
  static async placeSecureOrder(
    intentData: CreateOrderIntentRequest, 
    orderData: Omit<CreateOrderRequest, 'intent_id' | 'nonce' | 'session_id'>
  ): Promise<ApiResponse<{ order: any }>> {
    try {
      // Step 1: Create intent
      const intent = await this.createOrderIntent(intentData);
      
      // Step 2: Place order with intent
      const order = await this.placeOrder(orderData, intent.data, intentData.sessionId);
      return order;
      
    } catch (error) {
      console.error('Secure order placement failed:', error);
      throw error;
    }
  }

  /**
   * Complete secure order flow for guest customers
   */
  static async placeSecureGuestOrder(
    intentData: CreateGuestOrderIntentRequest, 
    orderData: Omit<CreateGuestOrderRequest, 'intent_id' | 'nonce' | 'session_id'>
  ): Promise<ApiResponse<{ order: any; customer_id: string; address_id: string }>> {
    try {
      // Step 1: Create intent
      const intent = await this.createGuestOrderIntent(intentData);
      
      // Step 2: Place order with intent
      const order = await this.placeGuestOrder(orderData, intent.data, intentData.sessionId);
      return order;
      
    } catch (error) {
      console.error('Secure guest order placement failed:', error);
      throw error;
    }
  }

  /**
   * Determines if an error is security-related and can be retried
   */
  static isSecurityError(error: any): error is SecurityError {
    return error?.code && [
      'SESSION_REQUIRED',
      'INVALID_INTENT', 
      'INVALID_NONCE',
      'SESSION_MISMATCH',
      'SEAT_MISMATCH',
      'AMOUNT_MISMATCH',
      'ALREADY_USED'
    ].includes(error.code);
  }

  /**
   * Determines if a security error requires creating a new intent
   */
  static requiresNewIntent(errorCode: SecurityErrorCode): boolean {
    return [
      'INVALID_INTENT',
      'INVALID_NONCE', 
      'ALREADY_USED',
      'SEAT_MISMATCH',
      'AMOUNT_MISMATCH'
    ].includes(errorCode);
  }

  /**
   * Gets user-friendly error message for security errors
   */
  static getSecurityErrorMessage(errorCode: SecurityErrorCode): string {
    const messages = {
      'SESSION_REQUIRED': 'No active session found. Please reserve seats first.',
      'INVALID_INTENT': 'Order intent not found or expired. Please try again.',
      'INVALID_NONCE': 'Security token invalid or expired. Please try again.',
      'SESSION_MISMATCH': 'Session mismatch detected. Please refresh and try again.',
      'SEAT_MISMATCH': 'Selected seats have changed. Please update your selection.',
      'AMOUNT_MISMATCH': 'Order total has changed. Please verify pricing and try again.',
      'ALREADY_USED': 'This order has already been processed. Please create a new order.'
    };
    
    return messages[errorCode] || 'A security validation error occurred. Please try again.';
  }
}
