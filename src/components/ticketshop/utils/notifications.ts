// Notification management utilities
import type { NotificationType } from '../types/reservation';

// Global notification callback - will be set by the BookingContext
let globalNotificationCallback: ((message: string, type: NotificationType, duration?: number) => void) | null = null;

export const NotificationManager = {
  // Register the global notification callback from BookingContext
  setGlobalCallback(callback: (message: string, type: NotificationType, duration?: number) => void) {
    globalNotificationCallback = callback;
  },
  
  show(message: string, type: NotificationType = 'info', duration: number = 5000): void {
    // Use the global callback if available (from BookingContext)
    if (globalNotificationCallback) {
      globalNotificationCallback(message, type, duration);
    } else {
      // Fallback to console logging if no callback is registered
      // console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
};