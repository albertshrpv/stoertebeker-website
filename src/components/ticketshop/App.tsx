import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { BookingProvider } from './contexts/BookingContext';
import { ProtectedRoute } from './components/ProtectedRoute';
// Lazy-loaded pages and layout to reduce initial bundle and memory footprint
const BookingProcessPage = lazy(() => import('./pages/BookingProcessPage').then(m => ({ default: m.BookingProcessPage })));
const CustomerProfilePage = lazy(() => import('./pages/CustomerProfilePage').then(m => ({ default: m.CustomerProfilePage })));
const OrderListPage = lazy(() => import('./pages/OrderListPage').then(m => ({ default: m.OrderListPage })));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));

export default function App() {
    // For development/testing, we'll use a hardcoded seriesId
    // In production, this would come from props or URL parameters
    // TODO: change to get from props; fill props from Strapi Website Settings; change to season id insetad, fetch all series and standalone shows for that season
    const seasonId = "4caf5ec2-56d0-4c59-817c-a8e54448b523";

    // Determine the current locale and route type from the URL
    const currentPath = window.location.pathname;
    const isEnglish = currentPath.startsWith('/en/');
    const currentLocale = isEnglish ? 'en' : 'de';
    
    // Check if we're in customer account routes, voucher routes, or main booking process
    const isCustomerRoute = isEnglish 
        ? currentPath.includes('/shop/account') 
        : currentPath.includes('/shop/konto');
    const isVoucherRoute = false;

    // Set basename and route structure based on route type
    let basePath: string;
    let routeStructure: 'customer' | 'booking' | 'voucher';

    if (isCustomerRoute) {
        basePath = isEnglish ? '/en/shop/account' : '/de/shop/konto';
        routeStructure = 'customer';
    } else {
        basePath = isEnglish ? '/en/shop' : '/de/shop';
        routeStructure = 'booking';
    }


    const [showPage, setShowPage] = useState<boolean | null>(null);
    const [remainingTime, setRemainingTime] = useState<number>(0);
    const BLOCK_STORAGE_KEY = 'ticketshop_block_timestamp';
    const BLOCK_DURATION_MS = 2 * 60 * 1000; // 2 minutes

    useEffect(() => {
        // Check if user was previously blocked
        const blockedTimestamp = localStorage.getItem(BLOCK_STORAGE_KEY);
        const now = Date.now();

        if (blockedTimestamp) {
            const timeSinceBlock = now - parseInt(blockedTimestamp, 10);
            
            // If less than 2 minutes have passed, keep them blocked
            if (timeSinceBlock < BLOCK_DURATION_MS) {
                const remaining = Math.ceil((BLOCK_DURATION_MS - timeSinceBlock) / 1000);
                setRemainingTime(remaining);
                setShowPage(false);
                
                // Set up countdown timer
                const interval = setInterval(() => {
                    const currentTime = Date.now();
                    const elapsed = currentTime - parseInt(blockedTimestamp, 10);
                    const remaining = Math.ceil((BLOCK_DURATION_MS - elapsed) / 1000);
                    
                    if (remaining <= 0) {
                        clearInterval(interval);
                        localStorage.removeItem(BLOCK_STORAGE_KEY);
                        setRemainingTime(0);
                    } else {
                        setRemainingTime(remaining);
                    }
                }, 1000);
                
                return () => clearInterval(interval);
            } else {
                // Block period expired, remove the timestamp
                localStorage.removeItem(BLOCK_STORAGE_KEY);
            }
        }

        // User can try again - perform random check
        const randomNumber1to10 = Math.floor(Math.random() * 1) + 1;
        const allowed = randomNumber1to10 === 1;

        if (!allowed) {
            // Block user and store timestamp
            localStorage.setItem(BLOCK_STORAGE_KEY, now.toString());
            setRemainingTime(Math.ceil(BLOCK_DURATION_MS / 1000));
            setShowPage(false);
            
            // Set up countdown timer
            const interval = setInterval(() => {
                const currentTime = Date.now();
                const elapsed = currentTime - now;
                const remaining = Math.ceil((BLOCK_DURATION_MS - elapsed) / 1000);
                
                if (remaining <= 0) {
                    clearInterval(interval);
                    localStorage.removeItem(BLOCK_STORAGE_KEY);
                    setRemainingTime(0);
                } else {
                    setRemainingTime(remaining);
                }
            }, 1000);
            
            return () => clearInterval(interval);
        }

        setShowPage(allowed);
    }, []);

    // Show loading state while checking
    if (showPage === null) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!showPage) {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;

        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="mb-6">
                        <svg className="mx-auto h-16 w-16 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">Zu viele Anfragen</h1>
                    {remainingTime > 0 ? (
                        <>
                            <p className="text-gray-600 mb-6">Bitte versuchen Sie es später erneut.</p>
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <p className="text-sm text-gray-500 mb-1">Bitte warten Sie noch:</p>
                                <p className="text-xl font-semibold text-gray-900">
                                    {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`}
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-gray-600 mb-6">Sie können die Seite jetzt neu laden und es erneut versuchen.</p>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <p className="text-sm text-green-700 font-medium">Bereit zum erneuten Versuch</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <BrowserRouter basename={basePath}>
            <QueryProvider>
                <AuthProvider>
                    <SocketProvider>
                        <BookingProvider seasonId={seasonId} language={currentLocale}>
                            <Suspense fallback={<div className="p-8 text-center">Wird geladen…</div>}>
                                <Routes>
                                {routeStructure === 'customer' ? (
                                    /* Customer Account Routes */
                                    <>
                                        {/* Profile */}
                                        <Route path="/" element={
                                            <ProtectedRoute>
                                                <CustomerProfilePage />
                                            </ProtectedRoute>
                                        } />
                                        <Route path="/profil" element={
                                            <ProtectedRoute>
                                                <CustomerProfilePage />
                                            </ProtectedRoute>
                                        } />
                                        
                                        {/* Orders */}
                                        <Route path="/bestellungen" element={
                                            <ProtectedRoute>
                                                <OrderListPage />
                                            </ProtectedRoute>
                                        } />
                                        <Route path="/bestellungen/:orderId" element={
                                            <ProtectedRoute>
                                                <OrderDetailPage />
                                            </ProtectedRoute>
                                        } />
                                        
                                        {/* English routes */}
                                        {isEnglish && (
                                            <>
                                                <Route path="/profile" element={
                                                    <ProtectedRoute>
                                                        <CustomerProfilePage />
                                                    </ProtectedRoute>
                                                } />
                                                <Route path="/orders" element={
                                                    <ProtectedRoute>
                                                        <OrderListPage />
                                                    </ProtectedRoute>
                                                } />
                                                <Route path="/orders/:orderId" element={
                                                    <ProtectedRoute>
                                                        <OrderDetailPage />
                                                    </ProtectedRoute>
                                                } />
                                            </>
                                        )}
                                        
                                        {/* Fallback for customer routes */}
                                        <Route path="*" element={<Navigate to="/" replace />} />
                                    </>
                                ) : (
                                    /* Booking Process Routes */
                                    <>
                                        <Route path="/" element={<BookingProcessPage />} />
                                        {/* Fallback for booking routes */}
                                        <Route path="*" element={<Navigate to="/" replace />} />
                                    </>
                                )}
                                </Routes>
                            </Suspense>
                        </BookingProvider>
                    </SocketProvider>
                </AuthProvider>
            </QueryProvider>
        </BrowserRouter>
    );
}
