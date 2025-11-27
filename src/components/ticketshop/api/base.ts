import axios from 'axios';
import { ApiValidationError } from './types';
import { API_URL, CLIENT_ID } from '../../../environment';





// Simple API client
export const api = axios.create({
    baseURL: API_URL + '/public',
    headers: {
        'Content-Type': 'application/json',
        'x-client-id': CLIENT_ID,
        'Accept-Language': 'de'
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle API responses and errors
api.interceptors.response.use(
    (response) => {
        // Return the response data for successful requests
        return response;
    },
    (error) => {
        // Handle structured API errors
        if (error.response?.data?.success === false) {
            const { message, errors } = error.response.data;

            if (errors && Array.isArray(errors)) {
                // This is a validation error
                throw new ApiValidationError(message || 'Validation failed', errors);
            }

            // This is a general API error
            throw new Error(message || 'An error occurred');
        }

        // Handle network errors or other issues
        throw error;
    }
); 