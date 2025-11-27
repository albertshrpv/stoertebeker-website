import type { AddressData } from "./customer";

// Customer JWT payload interface
export interface CustomerJWTPayload {
    customerId: string;
    email: string;
    clientId: string;
    iat?: number;
    exp?: number;
}

// Authenticated customer interface
export interface AuthenticatedCustomer {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    date_of_birth?: Date;
    client_id: string;
    is_active: boolean;
    addresses: AddressData[];
}

export interface CustomerLoginResponse {
    success: boolean;
    message: string;
    data?: {
        customer: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone?: string;
            clientId: string;
            addresses: AddressData[];
        };
        token: string;
        expiresIn: string;
    };
}

export interface CustomerRequestCodeResponse {
    success: boolean;
    message: string;
    data?: {
        expiresAt: Date;
        expiresInMinutes: number;
    };
}