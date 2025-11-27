import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { customerAuthApi } from '../api/customerAuth';
import type { AuthenticatedCustomer } from '../types/customerAuth';
import type { UpdateCustomerData } from '../types/customer';

interface AuthContextType {
    // State
    isAuthenticated: boolean;
    customer: AuthenticatedCustomer | null;
    isLoading: boolean;
    error: string | null;

    // OTP Login Flow
    otpState: 'idle' | 'requesting' | 'verifying' | 'sent';
    otpEmail: string;
    otpError: string | null;

    // Actions
    requestOTP: (email: string) => Promise<void>;
    verifyOTP: (email: string, code: string) => Promise<void>;
    updateCustomer: (updateData: UpdateCustomerData) => Promise<void>;
    logout: () => void;
    clearOTPState: () => void;
    validateAndRestoreAuth: () => Promise<void>;
    
    // Utility
    getDefaultAddress: () => any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    // Main auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [customer, setCustomer] = useState<AuthenticatedCustomer | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start with loading true for initial validation
    const [error, setError] = useState<string | null>(null);

    // OTP flow state
    const [otpState, setOtpState] = useState<'idle' | 'requesting' | 'verifying' | 'sent'>('idle');
    const [otpEmail, setOtpEmail] = useState('');
    const [otpError, setOtpError] = useState<string | null>(null);

    // Validate and restore authentication on app load
    const validateAndRestoreAuth = async () => {
        // console.log('🔍 AuthContext: Starting auth validation...');
        const token = localStorage.getItem('token');
        // console.log('🔍 AuthContext: Token found:', !!token);
        if (!token) {
            // console.log('❌ AuthContext: No token found, setting isLoading to false');
            setIsLoading(false);
            return;
        }

        try {
            const response = await customerAuthApi.getCurrentCustomer();
            
            if (response.data?.success && response.data.data) {
                const { customer: customerData, token: refreshedToken } = response.data.data;
                
                // Update token if refreshed
                localStorage.setItem('token', refreshedToken);
                
                // Convert API response to AuthenticatedCustomer format
                const authenticatedCustomer: AuthenticatedCustomer = {
                    id: customerData.id,
                    email: customerData.email,
                    first_name: customerData.firstName,
                    last_name: customerData.lastName,
                    phone: customerData.phone,
                    date_of_birth: customerData.dateOfBirth ? new Date(customerData.dateOfBirth) : undefined,
                    client_id: customerData.clientId,
                    is_active: true,
                    addresses: customerData.addresses
                };

                setCustomer(authenticatedCustomer);
                setIsAuthenticated(true);
                setError(null);
                // console.log('✅ AuthContext: Auth validation successful, user authenticated');
            } else {
                // Invalid token or API error
                // console.log('❌ AuthContext: Invalid token or API error');
                localStorage.removeItem('token');
                setIsAuthenticated(false);
                setCustomer(null);
            }
        } catch (error) {
            // console.error('❌ AuthContext: Auth validation failed:', error);
            // Remove invalid token
            localStorage.removeItem('token');
            setIsAuthenticated(false);
            setCustomer(null);
        } finally {
            // console.log('🏁 AuthContext: Auth validation complete, setting isLoading to false');
            setIsLoading(false);
        }
    };

    // Request OTP for login
    const requestOTP = async (email: string) => {
        setOtpState('requesting');
        setOtpError(null);
        setOtpEmail(email);

        try {
            await customerAuthApi.requestCode(email);
            setOtpState('sent');
        } catch (error) {
            // console.error('Error requesting OTP:', error);
            setOtpError(error instanceof Error ? error.message : 'Fehler beim Senden des Codes');
            setOtpState('idle');
        }
    };

    // Verify OTP and login
    const verifyOTP = async (email: string, code: string) => {
        setOtpState('verifying');
        setOtpError(null);

        try {
            const response = await customerAuthApi.verifyCode(email, code);
            
            if (response.data && response.data.success) {
                const token = response.data.data?.token;
                const customerData = response.data.data?.customer;

                if (!token || !customerData) {
                    throw new Error('Token or customer data not found');
                }

                // Store token
                localStorage.setItem('token', token);

                // Convert response data to AuthenticatedCustomer format
                const authenticatedCustomer: AuthenticatedCustomer = {
                    id: customerData.id,
                    email: customerData.email,
                    first_name: customerData.firstName,
                    last_name: customerData.lastName,
                    phone: customerData.phone,
                    client_id: customerData.clientId,
                    is_active: true,
                    addresses: customerData.addresses
                };

                setCustomer(authenticatedCustomer);
                setIsAuthenticated(true);
                setOtpState('idle');
                setOtpEmail('');
                setError(null);
            } else {
                setOtpError(response.data?.message || 'Ungültiger Code');
                setOtpState('sent'); // Back to sent state so user can retry
            }
        } catch (error) {
            // console.error('Error verifying OTP:', error);
            setOtpError(error instanceof Error ? error.message : 'Fehler bei der Anmeldung');
            setOtpState('sent'); // Back to sent state so user can retry
        }
    };

    // Update customer information
    const updateCustomer = async (updateData: UpdateCustomerData) => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated');
        }

        setError(null);

        try {
            const response = await customerAuthApi.updateCustomer(updateData);

            if (response.data?.success && response.data.data?.customer) {
                setCustomer(response.data.data.customer);
            } else {
                throw new Error(response.data?.message || 'Fehler beim Aktualisieren der Kundendaten');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Kundendaten';
            setError(errorMessage);
            throw error;
        }
    };

    // Logout user
    const logout = () => {
        // console.log('🔓 AuthContext: Logout called');
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setCustomer(null);
        setError(null);
        clearOTPState();
        // console.log('🔓 AuthContext: Logout complete - isAuthenticated set to false, customer set to null');
    };

    // Clear OTP state
    const clearOTPState = () => {
        setOtpState('idle');
        setOtpEmail('');
        setOtpError(null);
    };

    // Get default address helper
    const getDefaultAddress = () => {
        if (!customer || !customer.addresses) return null;
        return customer.addresses.find(addr => addr.is_default) || customer.addresses[0] || null;
    };

    // Validate auth on mount
    useEffect(() => {
        validateAndRestoreAuth();
    }, []);

    const value: AuthContextType = {
        // State
        isAuthenticated,
        customer,
        isLoading,
        error,

        // OTP Login Flow
        otpState,
        otpEmail,
        otpError,

        // Actions
        requestOTP,
        verifyOTP,
        updateCustomer,
        logout,
        clearOTPState,
        validateAndRestoreAuth,

        // Utility
        getDefaultAddress,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}