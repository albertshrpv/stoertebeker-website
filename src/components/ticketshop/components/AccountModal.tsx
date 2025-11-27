import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MainTextInput } from './MainTextInput';
import { OTPInput } from './OTPInput';
import { MainButton } from './MainButton';

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
    const navigate = useNavigate();
    const {
        isAuthenticated,
        customer,
        otpState,
        otpError,
        requestOTP,
        verifyOTP,
        logout,
        clearOTPState
    } = useAuth();

    // Local state for login form
    const [loginEmail, setLoginEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [localOtpState, setLocalOtpState] = useState<'idle' | 'requesting' | 'verifying' | 'sent'>('idle');
    const [localOtpError, setLocalOtpError] = useState<string | null>(null);

    // Clear OTP code when there's an error to allow easy retry
    // useEffect(() => {
    //     if (otpError) {
    //         setOtpCode('');
    //     }
    // }, [otpError]);

    // Clear form when modal is closed
    useEffect(() => {
        if (!isOpen) {
            setLoginEmail('');
            setOtpCode('');
            setLocalOtpState('idle');
            setLocalOtpError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleRequestOTP = async () => {
        if (!loginEmail.trim()) return;
        setLocalOtpState('requesting');
        setLocalOtpError(null);

        try {
            await requestOTP(loginEmail);
            setLocalOtpState('sent');
        } catch (error) {
            setLocalOtpError(error instanceof Error ? error.message : 'Fehler beim Senden des Codes');
            setLocalOtpState('idle');
        }
    };

    const handleVerifyOTP = async () => {
        if (!otpCode.trim() || !loginEmail.trim()) return;

        // Store the current authentication state before verification
        const wasAuthenticated = isAuthenticated;
        setLocalOtpState('verifying');
        setLocalOtpError(null);

        try {
            await verifyOTP(loginEmail, otpCode);

            // Only close modal and clear form if user is now authenticated (successful login)
            if (isAuthenticated && !wasAuthenticated) {
                setLoginEmail('');
                setOtpCode('');
                setLocalOtpState('idle');
                onClose();
            } else {
                // Verification failed
                setLocalOtpError('Ungültiger Code');
                setLocalOtpState('sent');
            }
        } catch (error) {
            setLocalOtpError('Ungültiger Code');
            setLocalOtpState('sent');
        }
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    const handleBackToEmailInput = () => {
        setOtpCode('');
        setLocalOtpState('idle');
        setLocalOtpError(null);
    };

    const renderLoggedInContent = () => (
        <div className="flex flex-col ">
            <div className="py-6 flex flex-col gap-4">
                <button
                    className="w-full py-3 text-left font-medium flex items-center justify-between"
                    onClick={() => {
                        onClose();
                        const currentPath = window.location.pathname;
                        const isEnglish = currentPath.startsWith('/en/');
                        const ordersPath = isEnglish ? '/en/shop/account/orders' : '/de/shop/konto/bestellungen';
                        window.location.href = ordersPath;
                    }}
                >
                    <span>
                        Meine Bestellungen
                    </span>
                    <svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0.999999 1L9 9L1 17" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </button>

                <button
                    className="w-full py-3 text-left font-medium flex items-center justify-between"
                    onClick={() => {
                        onClose();
                        const currentPath = window.location.pathname;
                        const isEnglish = currentPath.startsWith('/en/');
                        const profilePath = isEnglish ? '/en/shop/account/profile' : '/de/shop/konto/profil';
                        window.location.href = profilePath;
                    }}
                >
                    <span>
                        Persönliche Daten
                    </span>
                    <svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0.999999 1L9 9L1 17" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </button>
            </div>

            <MainButton
                handleClick={handleLogout}
                label='Abmelden'
                className='w-full'
            />


        </div>
    );

    const renderLoginContent = () => {
        if (localOtpState === 'sent' || localOtpState === 'verifying') {
            return (
                <div className="space-y-8 py-6">
                    <p className="text-sm">
                        Wir haben einen Anmeldecode an <strong>{loginEmail}</strong> gesendet. Der Code ist gültig für 15 Minuten.
                    </p>

                    <div>
                        <OTPInput
                            value={otpCode}
                            onChange={setOtpCode}
                            disabled={localOtpState === 'verifying'}
                            error={localOtpError || undefined}
                        />
                    </div>

                    <div className='flex gap-4'>
                        <MainButton
                            handleClick={handleBackToEmailInput}
                            label='Zurück'
                            className='w-1/3'
                            style='secondary'
                        />
                        <MainButton
                            handleClick={handleVerifyOTP}
                            label={localOtpState === 'verifying' ? 'Anmeldung läuft...' : 'Anmelden'}
                            disabled={!otpCode.trim() || localOtpState === 'verifying'}
                            className='w-2/3'
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className="py-6 space-y-6">
                <h3 className="font-medium text-black mb-2">
                    E-Mail-Adresse
                </h3>

                <div className="space-y-4">
                    <MainTextInput
                        type="email"
                        value={loginEmail}
                        onChange={setLoginEmail}
                        placeholder="ihre.email@beispiel.de"
                        error={localOtpError || undefined}
                        disabled={localOtpState === 'requesting'}
                    />

                    <MainButton
                        handleClick={handleRequestOTP}
                        label={localOtpState === 'requesting' ? 'Code wird gesendet...' : 'Anmeldecode senden'}
                        disabled={!loginEmail.trim() || localOtpState === 'requesting'}
                        className='w-full'
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleOverlayClick}>
            <div className="bg-white rounded-lg max-w-xl w-full mx-4 py-8 px-6 lg:px-12">
                <div className='flex justify-between items-center pb-6 border-b border-gray-200'>
                    <h2 className="text-xl font-semibold text-black">
                        <h3>
                            {isAuthenticated ? `Willkommen ${customer?.first_name || customer?.email}` : 'Ihre Bestellhistorie'}
                        </h3>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.7432 1.00003L1.00346 14.7397" stroke="black" stroke-width="1.5" stroke-linecap="round" />
                            <path d="M14.999 14.994L1.25932 1.25435" stroke="black" stroke-width="1.5" stroke-linecap="round" />
                        </svg>
                    </button>
                </div>

                {isAuthenticated ? renderLoggedInContent() : renderLoginContent()}
            </div>
        </div>
    );
}
