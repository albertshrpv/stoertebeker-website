
// Types for API responses
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    errors?: Array<{
        field: string;
        message: string;
    }>;
}

export interface SearchParams {
    search?: string;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
}

export interface EventSeriesPaginationParams extends PaginationParams {
    season_id?: string;
}

// Event-Show specific pagination params
export interface EventShowPaginationParams extends PaginationParams {
    season_id?: string;
    series_id?: string;
    date_from?: string;
    date_to?: string;
}

// Custom error class for API validation errors
export class ApiValidationError extends Error {
    public errors: Array<{ field: string; message: string }>;

    constructor(message: string, errors: Array<{ field: string; message: string }>) {
        super(message);
        this.name = 'ApiValidationError';
        this.errors = errors;
    }
} 