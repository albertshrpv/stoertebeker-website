import React, { useEffect, useCallback } from 'react';
import { useBooking } from '../contexts/BookingContext';
import type { Notification } from '../types/reservation';
import './NotificationBanner.css';

export function NotificationBanner() {
    const { state, dispatch } = useBooking();

    const removeNotification = useCallback((id: string) => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    }, [dispatch]);

    if (state.notifications.length === 0) {
        return null;
    }

    // Separate notifications by type
    const criticalNotifications = state.notifications.filter(
        n => n.type === 'warning' || n.type === 'error'
    );
    const regularNotifications = state.notifications.filter(
        n => n.type === 'info' || n.type === 'success'
    );

    return (
        <>
            {/* Critical notifications (warning/error) - centered with overlay */}
            {criticalNotifications.length > 0 && (
                <div className="notification-overlay">
                    <div className="notification-center-container">
                        {criticalNotifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onRemove={removeNotification}
                                isCentered={true}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Regular notifications (info/success) - bottom */}
            {regularNotifications.length > 0 && (
                <div className="notification-banner p-4 md:p-6 space-y-3">
                    {regularNotifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onRemove={removeNotification}
                            isCentered={false}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

interface NotificationItemProps {
    notification: Notification;
    onRemove: (id: string) => void;
    isCentered?: boolean;
}

function NotificationItem({ notification, onRemove, isCentered = false }: NotificationItemProps) {
    // Auto-remove after duration
    useEffect(() => {
        if (notification.duration) {
            const timer = setTimeout(() => {
                onRemove(notification.id);
            }, notification.duration);

            return () => clearTimeout(timer);
        }
    }, [notification.id, notification.duration, onRemove]);

    const getNotificationStyles = (type: Notification['type']) => {
        switch (type) {
            case 'success':
                return {
                    container: 'bg-white border-[1.5px] border-green-500 text-gray-900 shadow-xl',
                    iconBg: 'bg-green-500',
                    icon: (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    )
                };
            case 'warning':
                return {
                    container: 'bg-white border-[1.5px] border-yellow-500 text-gray-900 shadow-xl',
                    iconBg: 'bg-yellow-500',
                    icon: (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    )
                };
            case 'error':
                return {
                    container: 'bg-white border-[1.5px] border-red-500 text-gray-900 shadow-xl',
                    iconBg: 'bg-red-500',
                    icon: (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    )
                };
            case 'info':
            default:
                return {
                    container: 'bg-white border-[1.5px] border-darkBlue text-gray-900 shadow-xl',
                    iconBg: 'bg-darkBlue',
                    icon: (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    )
                };
        }
    };

    const styles = getNotificationStyles(notification.type);

    if (isCentered) {
        // Centered modal-like layout for warnings/errors
        return (
            <div className={`
                relative rounded-md px-6 py-5
                ${styles.container}
                notification-center-enter
                max-w-md w-full mx-auto
                transition-all duration-300
            `}>
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 ${styles.iconBg} rounded-md p-2.5 flex items-center justify-center`}>
                        {styles.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-medium leading-relaxed">
                            {notification.message}
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <button
                            onClick={() => onRemove(notification.id)}
                            className="inline-flex text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-darkBlue focus:ring-offset-2 rounded-md p-1 transition-colors duration-300"
                            aria-label="Benachrichtigung schließen"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.7402 1L1.00053 14.7397" stroke="black" strokeWidth="1" strokeLinecap="round" />
                                <path d="M14.9961 14.9941L1.25639 1.25438" stroke="black" strokeWidth="1" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Bottom layout for info/success
    return (
        <div className={`
            relative rounded-md px-6 py-4
            ${styles.container}
            notification-enter
            max-w-screen-2xl w-full mx-auto
            transition-all duration-300
        `}>
            <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 ${styles.iconBg} rounded-md p-2 flex items-center justify-center`}>
                    {styles.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base font-medium leading-relaxed">
                        {notification.message}
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <button
                        onClick={() => onRemove(notification.id)}
                        className="inline-flex text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-darkBlue focus:ring-offset-2 rounded-md p-1 transition-colors duration-300"
                        aria-label="Benachrichtigung schließen"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.7402 1L1.00053 14.7397" stroke="black" strokeWidth="1" strokeLinecap="round" />
                            <path d="M14.9961 14.9941L1.25639 1.25438" stroke="black" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}