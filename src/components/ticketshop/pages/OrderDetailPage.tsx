import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { componentContentPadding, componentContentPaddingX } from '../../../lib/utils';
import { ordersApi } from '../api/orders';
import type { OrderData } from '../types/order';
import { MainButton } from '../components/MainButton';
import {
    adyenPaymentService,
    type AdyenSessionResponse
} from '../services/adyenPaymentService';
import { AdyenCheckout, Dropin } from '@adyen/adyen-web/auto';

// Import Adyen CSS
import '@adyen/adyen-web/styles/adyen.css';
import OrderOverview from '../components/OrderOverview';
import { PUBLIC_ADYEN_CLIENT_KEY, PUBLIC_ADYEN_ENVIRONMENT } from '../../../environment';

export function OrderDetailPage() {
    const { orderId } = useParams<{ orderId: string }>();
    const { customer, isAuthenticated, isLoading } = useAuth();
    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Payment modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isAdyenPayment, setIsAdyenPayment] = useState<boolean>(false);
    const [adyenSessionData, setAdyenSessionData] = useState<AdyenSessionResponse | null>(null);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');
    const [paymentError, setPaymentError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated && customer && orderId) {
            fetchOrderDetail();
        }
    }, [isAuthenticated, customer, orderId]);

    const fetchOrderDetail = async () => {
        if (!orderId) return;

        try {
            setLoading(true);
            setError(null);

            // Parse orderId - could be UUID or order number
            const isOrderNumber = /^\d+$/.test(orderId);

            let response;
            if (isOrderNumber) {
                response = await ordersApi.getByOrderNumber(parseInt(orderId));
            } else {
                // If it's a UUID, we need to get all customer orders and find the matching one
                // For now, try the order number approach first
                response = await ordersApi.getByOrderNumber(parseInt(orderId));
            }

            if (response.data && response.data.success) {
                setOrder(response.data.data?.order || null);
            } else {
                setError(response.data?.message || 'Bestellung nicht gefunden');
            }
        } catch (err) {
            console.error('Error fetching order detail:', err);
            setError('Fehler beim Laden der Bestelldetails');
        } finally {
            setLoading(false);
        }
    };

    // Check if this is an Adyen payment based on the order snapshot
    useEffect(() => {
        if (order) {
            const paymentMethodName = order.payment_method_snapshot?.payment_method.key;
            if (paymentMethodName === 'adyen-online') {
                setIsAdyenPayment(true);
            }
        }
    }, [order]);

    const getAdyenConfig = () => ({
        environment: PUBLIC_ADYEN_ENVIRONMENT,
        clientKey: PUBLIC_ADYEN_CLIENT_KEY
    });

    const openPaymentModal = () => {
        setShowPaymentModal(true);
        setPaymentStatus('pending');
        setPaymentError(null);
        setAdyenSessionData(null);
    };

    const closePaymentModal = () => {
        setShowPaymentModal(false);
        setPaymentStatus('pending');
        setPaymentError(null);
        setAdyenSessionData(null);
    };

    const createAdyenSession = async () => {
        if (!order) return;

        setIsCreatingSession(true);
        try {
            const sessionData = await adyenPaymentService.createSession({
                orderId: order.id
            });
            setAdyenSessionData(sessionData);

            const adyenConfig = getAdyenConfig();
            const checkout = await AdyenCheckout({
                environment: adyenConfig.environment,
                clientKey: adyenConfig.clientKey,
                session: {
                    id: sessionData.sessionId,
                    sessionData: sessionData.sessionData,
                },
                onPaymentCompleted: (result) => {
                    // console.log('🎉 Payment completed:', result);

                    // Check Adyen's result code to determine payment status
                    if (result.resultCode === 'Authorised') {
                        setPaymentStatus('success');
                        // Refetch order to reflect payment status change
                        fetchOrderDetail();
                    } else if (result.resultCode === 'Refused' || result.resultCode === 'Error') {
                        setPaymentStatus('failed');
                        setPaymentError('Zahlung fehlgeschlagen');
                    } else {
                        // Handle other result codes like 'Pending', 'Cancelled', etc.
                        setPaymentStatus('failed');
                        setPaymentError(`Zahlungsstatus: ${result.resultCode}`);
                    }
                },
                onError: (error) => {
                    console.error('❌ Payment error:', error);
                    setPaymentStatus('failed');
                    setPaymentError(error.message || 'Zahlung fehlgeschlagen');
                },
            });
            const dropin = new Dropin(checkout).mount('#adyen-dropin-modal');

        } catch (error: any) {
            console.error('Failed to create Adyen session:', error);
            setPaymentError(error.message || 'Fehler beim Initialisieren der Zahlung');
        } finally {
            setIsCreatingSession(false);
        }
    };

    // Create Adyen session when modal opens for Adyen payments
    useEffect(() => {
        if (showPaymentModal && isAdyenPayment && order && paymentStatus === 'pending' && !adyenSessionData && !isCreatingSession) {
            createAdyenSession();
        }
    }, [showPaymentModal, isAdyenPayment, order, paymentStatus, adyenSessionData, isCreatingSession]);

    // Redirect helper function
    const redirectToTickets = () => {
        const currentPath = window.location.pathname;
        const isEnglish = currentPath.startsWith('/en/');
        const ticketsPath = isEnglish ? '/en/shop' : '/de/shop';
        window.location.href = ticketsPath;
    };

    // Handle authentication state changes
    useEffect(() => {
        // Only check after loading is complete
        if (!isLoading) {
            if (!isAuthenticated || !customer) {
                redirectToTickets();
                return;
            }
        }
    }, [isAuthenticated, customer, isLoading]);

    // Show loading state while auth is being validated
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 mx-auto mb-4"></div>
                    <p className="text-gray-600">Lade Bestellung...</p>
                </div>
            </div>
        );
    }

    // This should rarely be reached due to useEffect redirect, but keeping as fallback
    if (!isAuthenticated || !customer) {
        redirectToTickets();
        return null;
    }

    if (!orderId) {
        const currentPath = window.location.pathname;
        const isEnglish = currentPath.startsWith('/en/');
        const ordersPath = isEnglish ? '/en/shop/account/orders' : '/de/shop/konto/bestellungen';
        window.location.href = ordersPath;
        return null;
    }

    const getPaymentStatusLabel = (status: OrderData['payment_status']) => {
        switch (status) {
            case 'pending': return 'Ausstehend';
            case 'expired': return 'Abgelaufen';
            case 'failed': return 'Fehlgeschlagen';
            case 'paid': return 'Bezahlt';
            case 'refunded': return 'Erstattet';
            case 'partly_refunded': return 'Teilweise erstattet';
            default: return status;
        }
    };

    const getPaymentStatusColor = (status: OrderData['payment_status']) => {
        switch (status) {
            case 'paid': return 'text-green-600 bg-green-50 border border-green-500';
            case 'pending': return 'text-yellow-600 bg-yellow-50 border border-yellow-500';
            case 'failed': return 'text-red-600 bg-red-50 border border-red-500';
            case 'refunded': return 'text-blue-600 bg-blue-50 border border-blue-500';
            case 'expired': return 'text-gray-600 bg-gray-50 border border-gray-500';
            case 'partly_refunded': return 'text-blue-600 bg-blue-50 border border-blue-500';
            default: return 'text-gray-600 bg-gray-50 border border-gray-500';
        }
    };

    if (!order || loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 mx-auto mb-4"></div>
                <p className="text-gray-600">Lade Bestelldetails...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                <div className="text-center text-red-600">
                    <p className="font-medium">Fehler</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className='w-full bg-darkBlue'>
                <div className={`w-full max-w-screen-2xl mx-auto ${componentContentPaddingX} py-5 text-white flex items-center justify-between`}>
                    <div className='hidden lg:block font-medium text-xl'>
                        Guten Tag {customer?.first_name} {customer?.last_name}
                    </div>
                    <div className='w-full lg:w-auto flex items-center justify-center gap-4'>
                        <button
                            className='bg-white text-darkBlue font-medium text-xs lg:text-sm rounded-full px-4 lg:px-6 py-2'
                            disabled
                        >
                            Meine Bestellungen
                        </button>
                        <button
                            className='bg-darkBlue border-[1.5px] border-white text-white hover:bg-white hover:text-darkBlue transition-colors duration-300 font-medium text-xs lg:text-sm rounded-full px-6 py-2'
                            onClick={() => {
                                window.location.href = window.location.pathname.startsWith('/en/') ? '/en/shop/account/profile' : '/de/shop/konto/profil';
                            }}
                        >
                            Persönliche Daten
                        </button>
                    </div>
                </div>
            </div>
            <div className={`max-w-screen-2xl mx-auto ${componentContentPadding}`}>
                <div className="flex flex-col lg:flex-row justify-between items-center mb-12 lg:mb-24 gap-6">
                    <div className='flex w-full flex-row items-center gap-2 lg:gap-8'>
                        <div className='flex gap-8 items-center'>
                            <button
                                className='group bg-gray-50 w-8 lg:w-12 h-8 lg:h-12 flex items-center justify-center rounded-full border-2 border-darkBlue hover:bg-darkBlue hover:text-white hover:cursor-pointer transition-colors duration-300 p-2 font-medium text-2xl'
                                onClick={() => {
                                    window.location.href = window.location.pathname.startsWith('/en/') ? '/en/shop/account/orders' : '/de/shop/konto/bestellungen';
                                }}
                            >
                                <svg className='group-hover:stroke-white group-hover:fill-white fill-darkBlue stroke-darkBlue transition-colors duration-300 w-4 lg:w-6' viewBox="0 0 25 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.13752 18.196L1.75 10.8665L9.13752 10.8665C6.44392 10.8665 5.08986 14.1186 6.98753 16.0302L9.13752 18.196Z" />
                                    <path d="M1.75 10.8665L6.67501 5.98011L9.13752 3.53693L6.99103 5.68205C5.07716 7.5947 6.43176 10.8665 9.13752 10.8665L1.75 10.8665Z" />
                                    <path d="M23.25 10.8665L9.13752 10.8665M1.75 10.8665L6.67501 5.98011L9.13752 3.53693M1.75 10.8665L9.13752 18.196M1.75 10.8665L9.13752 10.8665M11.6 1.09375L9.13752 3.53693M11.6 20.6392L9.13752 18.196M9.13752 3.53693L6.99103 5.68205C5.07716 7.5947 6.43176 10.8665 9.13752 10.8665M9.13752 18.196L6.98753 16.0302C5.08986 14.1186 6.44392 10.8665 9.13752 10.8665" stroke-width="1.56149" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>

                            </button>
                            <h1 className="text-xl lg:text-4xl font-medium whitespace-nowrap">Bestellung #{order.order_number}</h1>

                        </div>
                        <span className={`inline-flex px-3 lg:px-8 py-1 lg:py-2 text-sm lg:text-base font-medium rounded-full ${getPaymentStatusColor(order.payment_status!)} whitespace-nowrap`}>
                            {getPaymentStatusLabel(order.payment_status)}
                        </span>
                    </div>
                    <div className='flex w-full flex-col md:flex-row items-center justify-end gap-2'>
                        {order.payment_status === 'pending' && (
                            <MainButton
                                style="primary"
                                handleClick={openPaymentModal}
                                label="Zahlung abschließen"
                                size='small'
                                className='w-full md:w-auto'
                            />
                        )}
                        {/* <MainButton
                            style="secondary"
                            handleClick={() => {
                                window.location.href = window.location.pathname.startsWith('/en/') ? '/en/shop/account/orders' : '/de/shop/konto/bestellungen';
                            }}
                            label="Zurück zu Bestellungen"
                            size='small'
                            className='w-full md:w-auto'
                        /> */}
                    </div>
                </div>

                {!loading && !error && order && (
                    <OrderOverview order={order} />
                )}

                {/* Payment Modal */}
                {showPaymentModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-2xl font-semibold">Zahlung abschließen</h2>
                                <button
                                    onClick={closePaymentModal}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                            <p className="mb-6">
                                Bitte schließen Sie Ihre Zahlung ab, um die Bestellung abzuschließen.
                            </p>

                            {paymentError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                                    {paymentError}
                                </div>
                            )}

                            {/* Payment Success */}
                            {paymentStatus === 'success' && (
                                <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-md">
                                    <div className="flex items-center">
                                        <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <div>
                                            <h3 className="text-lg font-semibold text-green-900">Zahlung erfolgreich!</h3>
                                            <p className="text-green-800">Ihre Bestellung wurde erfolgreich bezahlt.</p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <button
                                            onClick={closePaymentModal}
                                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                        >
                                            Schließen
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Payment Failed */}
                            {paymentStatus === 'failed' && (
                                <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-md">
                                    <div className="flex items-center">
                                        <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <div>
                                            <h3 className="text-lg font-semibold text-red-900">Zahlung fehlgeschlagen</h3>
                                            <p className="text-red-800">Bitte versuchen Sie es erneut oder wählen Sie eine andere Zahlungsmethode.</p>
                                            <button
                                                onClick={() => {
                                                    setPaymentStatus('pending');
                                                    setPaymentError(null);
                                                    createAdyenSession();
                                                }}
                                                className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                                            >
                                                Erneut versuchen
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Adyen Payment Form */}
                            {isAdyenPayment && paymentStatus === 'pending' && (
                                <div className="mb-8">
                                    {isCreatingSession && (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8"></div>
                                            <span className="ml-3 text-darkBlue">Zahlungsformular wird geladen...</span>
                                        </div>
                                    )}

                                    {adyenSessionData && getAdyenConfig().clientKey && (
                                        <div id="adyen-dropin-modal"></div>
                                    )}
                                </div>
                            )}

                            {/* Bank Transfer Payment Form */}
                            {!isAdyenPayment && paymentStatus === 'pending' && (
                                <div className="mb-8 p-6 bg-white rounded-2xl">
                                    <h3 className="text-lg font-semibold">Zahlung per Überweisung</h3>
                                    <p className="mt-1">Bitte überweisen Sie den Rechnungsbetrag. Die Tickets werden nach Zahlungseingang freigegeben.</p>
                                    <div className="mt-4 bg-gray-50 rounded-md p-6 text-base">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="">Empfänger</div>
                                            <div className="font-medium text-black">Störtebeker Festspiele GmbH & Co. KG</div>
                                            <div className="">IBAN</div>
                                            <div className="font-medium text-black">DE23 1505 0500 0833 0018 09</div>
                                            <div className="">BIC</div>
                                            <div className="font-medium text-black">NOLADE21GRW</div>
                                            <div className="">Bank</div>
                                            <div className="font-medium text-black">Sparkasse Vorpommern</div>
                                            <div className="">Verwendungszweck</div>
                                            <div className="font-medium text-black">Bestellnummer #{order.order_number ?? '—'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
