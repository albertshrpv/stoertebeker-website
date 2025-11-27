// Reservation API functions based on the integration guide
import { api } from './base';
import type { 
  ReservationRequest, 
  ReservationResponse, 
  BlockedSeatsResponse 
} from '../types/reservation';

/**
 * Get blocked seat IDs for a show
 */
export async function getBlockedSeats(showSlug: string): Promise<string[]> {
  try {
    const response = await api.get<BlockedSeatsResponse>(`/reservations/show/${showSlug}`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to load blocked seats:', error);
    return [];
  }
}

/**
 * Create reservations for selected seats
 */
export async function createReservations(request: ReservationRequest): Promise<ReservationResponse> {
  const response = await api.post<ReservationResponse>('/reservations', request);
  return response.data;
}

/**
 * Extend all reservations for a session/show
 */
export async function extendReservation(sessionId: string, showId: string): Promise<{ success: boolean; message: string }> {
  const response = await api.put(`/reservations/session/${sessionId}/show/${showId}/extend`);
  return response.data;
}

/**
 * Release a reservation
 */
export async function releaseReservation(sessionSeatId: string): Promise<{ success: boolean; message: string }> {
  const response = await api.delete(`/reservations/${sessionSeatId}`);
  return response.data;
}

/**
 * Release all reservations for a session/show
 */
export async function releaseReservationsBySession(sessionId: string, showId: string): Promise<{ success: boolean; message: string }> {
  const response = await api.delete(`/reservations/session/${sessionId}/show/${showId}`);
  return response.data;
}

/**
 * Get user reservations by session or email
 */
export async function getUserReservations(params: { sessionId?: string; customerEmail?: string }): Promise<ReservationResponse['data'][]> {
  const searchParams = new URLSearchParams();
  if (params.sessionId) searchParams.append('sessionId', params.sessionId);
  if (params.customerEmail) searchParams.append('customerEmail', params.customerEmail);
  
  const response = await api.get<{ success: boolean; data: ReservationResponse['data'][] }>(`/reservations/user?${searchParams}`);
  return response.data.data;
}