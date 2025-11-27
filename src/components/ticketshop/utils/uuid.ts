/**
 * Utility functions for generating UUIDs
 */

/**
 * Generates a proper UUID v4 using the browser's crypto.randomUUID() function
 * Falls back to a custom implementation if crypto.randomUUID() is not available
 */
export function generateUUID(): string {
  // Use browser's built-in crypto.randomUUID() if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for environments without crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
