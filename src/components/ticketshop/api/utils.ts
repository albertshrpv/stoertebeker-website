import type { PaginationParams } from './types';

// Helper function to build query string from parameters
export const buildQueryString = (params: PaginationParams): string => {
    const filteredParams = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: String(value) }), {} as Record<string, string>);

    return new URLSearchParams(filteredParams).toString();
}; 