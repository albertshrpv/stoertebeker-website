import { api } from './base';
import type { CustomerLoginResponse, CustomerRequestCodeResponse, AuthenticatedCustomer } from '../types/customerAuth';
import type { UpdateCustomerData } from '../types/customer';

export const customerAuthApi = {
    requestCode: (email: string) => api.post<CustomerRequestCodeResponse>(`/customer-auth/request-code`, { email }),
    verifyCode: (email: string, code: string) => api.post<CustomerLoginResponse>(`/customer-auth/verify-code`, { email, code }),
    updateCustomer: (updateData: UpdateCustomerData) => api.post<{
        success: boolean;
        message: string;
        data?: {
            customer: AuthenticatedCustomer;
        };
    }>(`/customer-auth/update`, updateData),
    getCurrentCustomer: () => api.get<{
        success: boolean;
        data?: {
            customer: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                phone?: string;
                dateOfBirth?: string;
                clientId: string;
                addresses: any[];
            };
            token: string;
        };
    }>(`/customer-auth/me`),
}; 