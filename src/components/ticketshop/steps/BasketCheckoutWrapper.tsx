import React, { useEffect, useRef } from 'react';
import { useBooking } from '../contexts/BookingContext';
import { useSocket } from '../contexts/SocketContext';
import { extendReservation } from '../api/reservations';
import type { WebSocketEvents } from '../types/reservation';
import { BasketStep } from './BasketStep';
import { CheckoutStep } from './CheckoutStep';
import { componentContentPadding } from '../../../lib/utils';

export function BasketCheckoutWrapper() {
    const { state, dispatch, showNotification } = useBooking();
    const { socket, isConnected } = useSocket();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasExpiredRef = useRef(false);

    // Setup reservation timer and WebSocket listeners
    useEffect(() => {
        // console.log('🔄 Timer wrapper useEffect triggered - reservationData changed:', !!state.reservationData);

        // Always clear existing timer first
        if (intervalRef.current) {
            // console.log('🧹 Clearing existing interval in wrapper:', intervalRef.current);
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (state.reservationData) {
            // console.log('📋 Reservation data available, setting up timer and WebSocket in wrapper');
            hasExpiredRef.current = false; // Reset expired flag for new reservation
            setupReservationTimer();
            setupUserNotifications();
        } else {
            // console.log('⚠️ No reservation data, cleaning up timer and WebSocket');
            cleanupUserNotifications();
        }

        return () => {
            // console.log('🧹 Timer wrapper cleanup running');
            cleanupUserNotifications();
            if (intervalRef.current) {
                // console.log('🧹 Cleaning up interval in wrapper cleanup');
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [state.reservationData, socket]);

    const setupReservationTimer = () => {
        // console.log('🔧 Setting up reservation timer in wrapper');
        if (intervalRef.current) {
            // console.log('🧹 Clearing existing interval:', intervalRef.current);
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const updateTimer = () => {
            if (!state.reservationData) {
                // console.log('⚠️ No reservation data, skipping timer update');
                return;
            }

            // Check if already expired to prevent infinite loop
            if (hasExpiredRef.current) {
                // console.log('🚫 Timer update skipped - already expired');
                return;
            }

            const expiresAt = new Date(state.reservationData.expiresAt).getTime();
            const remaining = Math.max(0, expiresAt - Date.now());

            dispatch({ type: 'SET_TIME_REMAINING', payload: remaining });

            if (remaining <= 0) {
                // console.log('🚨 Timer reached zero, calling handleReservationExpired');
                handleReservationExpired();
            }
        };

        // Update immediately
        // console.log('🚀 Initial timer update in wrapper');
        updateTimer();

        // Update every second
        const newIntervalId = setInterval(updateTimer, 1000);
        // console.log('⏱️ Created new interval in wrapper:', newIntervalId);
        intervalRef.current = newIntervalId;
    };

    const handleReservationExpired = async () => {
        if (hasExpiredRef.current) {
            // console.log('🚫 Reservation expiry already handled');
            return;
        }

        hasExpiredRef.current = true;
        // console.log('⏰ Reservation expired in wrapper...');

        // Clear timer
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Reset reservation state
        dispatch({ type: 'RESET_RESERVATION_STATE' });

        // Show notification and redirect to seat selection
        showNotification('Ihre Reservierung ist abgelaufen. Bitte wählen Sie erneut Plätze aus.', 'warning', 8000);
        dispatch({ type: 'SET_STEP', payload: 'sitzplatz' });
    };

    const setupUserNotifications = () => {
        if (!socket) {
            // console.log('⚠️ No socket available for notifications');
            return;
        }

        // console.log('🔌 Setting up WebSocket event listeners for BasketCheckoutWrapper');
        // console.log('📡 Registering listener for user:reservation:expired');
        socket.on('user:reservation:expired', (data) => {
            // console.log('📡 WebSocket: user:reservation:expired event received:', data);
            // console.log('📊 Event data details:', {
            //     reservationId: data?.reservationId,
            //     showId: data?.showId,
            //     seatIds: data?.seatIds,
            //     timestamp: new Date().toISOString()
            // });
            handleReservationExpired();
        });

        // console.log('📡 Registering listener for user:reservation:extended');
        socket.on('user:reservation:extended', (data) => {
            // console.log('📡 WebSocket: user:reservation:extended event received:', data);
            // console.log('📊 Event data details:', {
            //     reservationId: data?.reservationId,
            //     newExpiresAt: data?.newExpiresAt,
            //     oldExpiresAt: data?.oldExpiresAt,
            //     timestamp: new Date().toISOString()
            // });
            handleReservationExtended(data);
        });

        // Log socket connection status
        // console.log('🔌 Socket connection status:', {
        //     connected: socket.connected,
        //     id: socket.id,
        //     isConnected: isConnected
        // });
    };

    const cleanupUserNotifications = () => {
        if (!socket) {
            // console.log('⚠️ No socket available for cleanup');
            return;
        }

        // console.log('🧹 Cleaning up WebSocket event listeners for BasketCheckoutWrapper');
        // console.log('📡 Removing all listeners for user:reservation:expired');
        socket.off('user:reservation:expired');
        // console.log('📡 Removing all listeners for user:reservation:extended');
        socket.off('user:reservation:extended');

        // console.log('✅ WebSocket event listeners cleanup completed');
    };

    const handleReservationExtended = (data: WebSocketEvents['user:reservation:extended']) => {
        const newExpiresAt = new Date(data.newExpiresAt).getTime();
        const newTimeRemaining = newExpiresAt - Date.now();

        // Update the reservation data with the new expiration time and canExtend flag
        if (state.reservationData) {
            const updatedReservationData = {
                ...state.reservationData,
                expiresAt: newExpiresAt,
                canExtend: false // Extension can only happen once
            };
            dispatch({ type: 'SET_RESERVATION_DATA', payload: updatedReservationData });
        }

        dispatch({ type: 'SET_TIME_REMAINING', payload: newTimeRemaining });
        dispatch({ type: 'SET_CAN_EXTEND', payload: false });
        dispatch({ type: 'SET_IS_EXTENDING', payload: false });

        showNotification('Reservierung um 5 Minuten verlängert!', 'success');
    };

    const formatMinutes = (milliseconds: number) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        return minutes;
    };

    const formatSeconds = (milliseconds: number) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const seconds = totalSeconds % 60;
        return seconds;
    };

    const extendReservationHandler = async () => {
        if (!state.reservationData?.reservations?.[0] || !state.canExtend || state.isExtending || !state.sessionId) {
            return;
        }

        const showId = state.reservationData?.reservations?.[0]?.show_id || state.selectedShow?.id;
        if (!showId) {
            console.error('No show ID available for extension');
            showNotification('Fehler beim Verlängern der Reservierung. Show ID nicht verfügbar.', 'error');
            return;
        }

        dispatch({ type: 'SET_IS_EXTENDING', payload: true });

        try {
            await extendReservation(state.sessionId, showId);
            // Extension success will be handled via WebSocket notification
        } catch (error) {
            console.error('Extension error:', error);
            showNotification('Fehler beim Verlängern der Reservierung. Bitte versuchen Sie es erneut.', 'error');
            dispatch({ type: 'SET_IS_EXTENDING', payload: false });
        }
    };

    // Timer component
    const ReservationTimer = () => {
        // Don't render if there's no reservation or time remaining
        if (!state.reservationData || state.timeRemaining <= 0) {
            return null;
        }

        const isWarning = state.timeRemaining < 120000; // Less than 2 minutes
        const isCritical = state.timeRemaining < 60000; // Less than 1 minute

        return (
            <div className={`flex relative items-center px-6 h-16 bg-white shadow-[0_0_20px_rgba(0,0,0,0.08)] z-10 rounded-sm ${isCritical
                ? 'border-b-4 border-red-500'
                : isWarning
                    ? 'border-b-4 border-yellow-300'
                    : 'border-b-4 border-gray-100'
                }`}>
                <div className="flex lg:hidden w-full h-full justify-center items-center gap-2 text-xs">
                    {isWarning || isCritical ? 'Ihre Reservierung läuft bald ab: ' : 'Ihre Tickets werden reserviert für: '}
                    {state.timeRemaining > 60000 && (
                        <span className="font-medium ml-0">
                            {formatMinutes(state.timeRemaining)} Min {formatSeconds(state.timeRemaining)} Sek
                        </span>
                    )}
                    {state.timeRemaining <= 60000 && (
                        <span className="font-medium ml-0">
                            {formatSeconds(state.timeRemaining)} Sekunden
                        </span>
                    )}
                </div>
                <div className="hidden lg:flex w-full h-full justify-center items-center gap-2">
                    <span className="">
                        {isWarning || isCritical ? 'Ihre Reservierung läuft bald ab: ' : 'Ihre Tickets werden reserviert für: '}
                    </span>
                    {state.timeRemaining > 60000 && (
                        <span className="font-medium ml-0">
                            {formatMinutes(state.timeRemaining)} Minuten {formatSeconds(state.timeRemaining)} Sekunden
                        </span>
                    )}
                    {state.timeRemaining <= 60000 && (
                        <span className="font-medium ml-0">
                            {formatSeconds(state.timeRemaining)} Sekunden
                        </span>
                    )}
                </div>

                <div className="hidden absolute top-2 right-12 lg:flex items-center gap-2 py-2">
                    {state.canExtend && state.timeRemaining > 0 && (
                        <button
                            onClick={extendReservationHandler}
                            disabled={state.isExtending}
                            className="px-3 py-1 rounded-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {state.isExtending ? 'Verlängert...' : '+ 5 Min'}
                        </button>
                    )}
                    {!state.canExtend && (
                        <p className="text-sm text-gray-600 py-1">Reservierung wurde bereits einmal verlängert</p>
                    )}
                </div>

                <div className="flex absolute top-2 right-2 lg:hidden items-center gap-2 py-2">
                    {state.canExtend && state.timeRemaining > 0 && (
                        <button
                            onClick={extendReservationHandler}
                            disabled={state.isExtending}
                            className="p-1 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {state.isExtending ? (
                                <div className='animate-spin w-4 h-4 rounded-full'></div>
                            ) :
                                <div className='border border-gray-400 p-1 flex items-center justify-center rounded-full'>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                            }
                        </button>
                    )}
                </div>

            </div>
        );
    };

    return (
        <div>
            <div className={``}>
                <ReservationTimer />
            </div>
            {state.currentStep === 'warenkorb' && <BasketStep />}
            {state.currentStep === 'checkout' && <CheckoutStep />}
        </div>
    );
}