// Session management utilities based on the integration guide

export const SessionManager = {
  getSessionId(): string {
    let sessionId = localStorage.getItem('booking-session-id');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem('booking-session-id', sessionId);
    }
    return sessionId;
  },
  
  generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  clearSession(): void {
    localStorage.removeItem('booking-session-id');
  }
};