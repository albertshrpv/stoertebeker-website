// Reservation types based on the integration guide

export interface ReservationData {
  id: string;
  seat_id: string;
  show_id: string;
  price_id: string; // Added: ID of the selected price category
  expires_at: string;
  status: 'active' | 'expired' | 'released';
}

export interface ReservationResponse {
  success: boolean;
  message: string;
  data: {
    reservations: ReservationData[];
    expiresAt: number; // timestamp
    canExtend: boolean;
    timeRemaining: number; // milliseconds
  };
}

export interface BlockedSeatsResponse {
  success: boolean;
  data: string[]; // Array of blocked seat IDs
}

export interface SeatReservationRequestItem {
  seatId: string;
  priceId: string; // ID of the selected price category
}

export interface ReservationRequest {
  showId: string;
  seatReservations: SeatReservationRequestItem[]; // Required format with price categories
  sessionId?: string;
  customerEmail?: string;
  durationMinutes?: number;
}

// WebSocket event types
export interface WebSocketEvents {
  'reservation:created': {
    showId: string;
    seatIds: string[];
    sessionId: string;
    timestamp: number;
  };
  'reservation:expired': {
    showId: string;
    seatIds: string[];
    timestamp: number;
  };
  'reservation:released': {
    showId: string;
    seatIds: string[];
    timestamp: number;
  };
  'user:reservation:expired': {
    reservationId: string;
    showId: string;
    timestamp: number;
  };
  'user:reservation:extended': {
    reservationId: string;
    newExpiresAt: string;
    showId: string;
  };
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}