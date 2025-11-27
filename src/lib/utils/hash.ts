/**
 * Creates a deterministic hash string from component type and block ID
 * Returns format: sr-{hash}
 */
export function createComponentHash(componentType: string, blockId: string): string {
  // Simple hash function that combines component type and block ID
  const str = `${componentType}-${blockId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string and take first 8 chars
  const hexHash = Math.abs(hash).toString(16).slice(0, 8);
  return `sr-${hexHash}`;
} 