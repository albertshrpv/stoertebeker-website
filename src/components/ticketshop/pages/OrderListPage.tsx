import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { componentContentPadding, componentContentPaddingX } from '../../../lib/utils';
import { formatPrice } from '../utils/priceFormatting';
import { ordersApi } from '../api/orders';
import type { OrderData } from '../types/order';
import { MainButton } from '../components/MainButton';

export function OrderListPage() {
    const { customer, isAuthenticated, isLoading } = useAuth();
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            }
        }
    }, [isAuthenticated, customer, isLoading]);

    useEffect(() => {
        if (isAuthenticated && customer) {
            fetchCustomerOrders();
        }
    }, [isAuthenticated, customer]);

    const fetchCustomerOrders = async () => {
        if (!customer) return;

        try {
            setLoading(true);
            setError(null);

            const response = await ordersApi.getOrdersByCustomerId(customer.id);

            if (response.data && response.data.success) {
                setOrders(response.data.data?.orders || []);
            } else {
                setError(response.data?.message || 'Fehler beim Laden der Bestellungen');
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError('Fehler beim Laden der Bestellungen');
        } finally {
            setLoading(false);
        }
    };

    const getPaymentStatusLabel = (status: OrderData['payment_status']) => {
        switch (status) {
            case 'paid': return 'Bezahlt';
            case 'pending': return 'Ausstehend';
            case 'failed': return 'Fehlgeschlagen';
            case 'refunded': return 'Erstattet';
            case 'partly_refunded': return 'Teilweise erstattet';
            case 'expired': return 'Abgelaufen';
            default: return status;
        }
    };

    const getShowName = (order: OrderData) => {
        return order.series_snapshot?.name || order.show_snapshot?.name || '-';
    };

    const getShowDate = (order: OrderData) => {
        return order.show_snapshot?.start_time || order.show_snapshot?.date;
    };

    const getLineItemsCount = (order: OrderData) => {
        return order.line_items?.length || 0;
    };

    // Show loading state while auth is being validated
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Lade Bestellungen...</p>
                </div>
            </div>
        );
    }

    // This should rarely be reached due to useEffect redirect, but keeping as fallback
    if (!isAuthenticated || !customer) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-4">Nicht angemeldet</h2>
                    <p className="text-gray-600">Bitte melden Sie sich an, um Ihre Bestellungen zu sehen.</p>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-white">
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
                <div className="mb-6 lg:mb-24">
                    <div className='flex gap-4'>
                        <h1 className="text-xl md:text-2xl lg:text-4xl font-medium mb-4">Meine Bestellungen</h1>
                        {
                            !loading && !error && orders.length > 0 && (
                                <div className='bg-[#F3F3F3] w-8 h-8 md:w-12 md:h-12 flex items-center justify-center rounded-md p-2 font-medium text-xl md:text-2xl'>
                                    {orders.length}
                                </div>
                            )
                        }
                    </div>
                    {/* <p className="text-xl">{customer?.first_name} {customer?.last_name}</p> */}
                </div>

                {loading && (
                    <div className="bg-white rounded-lg p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Lade Bestellungen...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                        <div className="text-center text-red-600">
                            <p className="font-medium">Fehler</p>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {!loading && !error && orders.length === 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                        <h3 className="text-lg font-medium text-black mb-2">Keine Bestellungen gefunden</h3>
                        <p className="text-gray-600 mb-4">Sie haben noch keine Tickets bestellt.</p>
                        <Link
                            to="/"
                            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Tickets kaufen
                        </Link>
                    </div>
                )}

                {!loading && !error && orders.length > 0 && (
                    <div className="space-y-6">
                        {orders.map((order) => {
                            return (
                                <a
                                    key={order.id}
                                    href={`${window.location.pathname.startsWith('/en/') ? '/en/shop/account/orders' : '/de/shop/konto/bestellungen'}/${order.order_number}`}
                                    className="bg-gray-50 hover:bg-darkBlue hover:text-white hover:cursor-pointer transition-colors duration-300 rounded-xl px-6 sm:px-10 py-6 w-full grid grid-cols-2 lg:flex gap-4 sm:gap-16 sm:items-center"
                                >
                                    <div className='space-y-1'>
                                        <div className='text-xs'>Datum</div>
                                        <div className='font-medium'>{new Date(order.created_at).toLocaleDateString('de-DE', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                        })}</div>
                                    </div>
                                    <div className='space-y-1'>
                                        <div className='text-xs'>Bestellnummer</div>
                                        <div className='font-medium'>{order.order_number}</div>
                                    </div>
                                    <div className='space-y-1 min-w-0 break-words'>
                                        <div className='text-xs'>Vorstellung</div>
                                        <div className='font-medium'>{getShowName(order)}</div>
                                    </div>
                                    <div className='space-y-1'>
                                        <div className='text-xs'>Zahlungsstatus</div>
                                        <div className='font-medium'>{getPaymentStatusLabel(order.payment_status)}</div>
                                    </div>
                                    <div className='hidden sm:block flex-grow'></div>
                                    <div className='space-y-1 self-end sm:self-auto'>
                                        <div className='text-xs'>Summe</div>
                                        <div className='font-medium'>{formatPrice(order.total_amount)}</div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </div >
    );
}
