import React, { Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBooking } from '../contexts/BookingContext';
import type { BookingStep } from '../contexts/BookingContext';
import { StepIndicator } from '../components/StepIndicator';
import { NotificationBanner } from '../components/NotificationBanner';

// Lazy-loaded steps/pages to reduce initial bundle and memory footprint
const DateSelectionStep = lazy(() => import('../steps/DateSelectionStep').then(m => ({ default: m.DateSelectionStep })));
const SeatSelectionStep = lazy(() => import('../steps/SeatSelectionStep').then(m => ({ default: m.SeatSelectionStep })));
const BasketCheckoutWrapper = lazy(() => import('../steps/BasketCheckoutWrapper').then(m => ({ default: m.BasketCheckoutWrapper })));
const OrderConfirmationStep = lazy(() => import('../steps/OrderConfirmationStep').then(m => ({ default: m.OrderConfirmationStep })));
const VoucherShopPage = lazy(() => import('./VoucherShopPage').then(m => ({ default: m.VoucherShopPage })));

export function BookingProcessPage() {
    const { state, goToStep } = useBooking();
    const location = useLocation();
    const navigate = useNavigate();

    // Guards for direct refresh navigation without selected show
    React.useEffect(() => {
        const hasSelectedShow = !!state.selectedMinimalShow || !!state.selectedShow;
        const hasRecoveredReservation = !!state.reservationData && Array.isArray(state.reservationData.reservations) && state.reservationData.reservations.length > 0;
        const hasOrderData = !!state.placedOrderSnapshot || !!state.placedOrderNumber;

        // If on order confirmation step but order data is missing (e.g., after refresh), redirect to date selection
        if (state.currentStep === 'zahlung' && !hasOrderData) {
            const params = new URLSearchParams(location.search);
            params.set('s', 'datum');
            navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
            goToStep('datum');
            return;
        }

        if (!hasSelectedShow) {
            // Always send users to date selection on refresh for basket/checkout.
            // Reservation restoration logic will handle bringing them back later.
            // Skip this check for voucher flow - vouchers don't need selected show
            if ((state.currentStep === 'warenkorb' || state.currentStep === 'checkout') && state.flowMode !== 'vouchers') {
                const params = new URLSearchParams(location.search);
                params.set('s', 'datum');
                navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
                goToStep('datum');
                return;
            }

            // Keep existing behavior for seat selection: only redirect if no recovered reservation
            if (state.currentStep === 'sitzplatz' && !hasRecoveredReservation) {
                const params = new URLSearchParams(location.search);
                params.set('s', 'datum');
                navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
                goToStep('datum');
                return;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.currentStep, state.selectedMinimalShow, state.selectedShow, state.reservationData, state.placedOrderSnapshot, state.placedOrderNumber]);

    // Sync step with URL (?s=datum|sitzplatz|warenkorb|checkout|zahlung|gutscheine)
    const allSteps: BookingStep[] = ['datum', 'sitzplatz', 'warenkorb', 'checkout', 'zahlung', 'gutscheine'];
    const validSteps = state.flowMode === 'vouchers'
        ? (['gutscheine', 'checkout', 'zahlung'] as BookingStep[])
        : (['datum', 'sitzplatz', 'warenkorb', 'checkout', 'zahlung'] as BookingStep[]);

    // On location change (back/forward), apply URL step to state
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const s = params.get('s') as BookingStep | null;
        const reset = params.get('reset');

        // Normalize after reset reload: remove reset flag and keep s=datum
        if (reset === '1') {
            params.delete('reset');
            if (!params.get('s')) params.set('s', 'datum');
            navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
            return;
        }

        // If the order is completed (zahlung), any attempt to go back to earlier steps
        // should send the user to the beginning (datum) and hard-reload to start fresh.
        if (state.currentStep === 'zahlung' && s && s !== 'zahlung') {
            params.set('s', 'datum');
            params.set('reset', '1');
            const fullPath = typeof window !== 'undefined' ? window.location.pathname : location.pathname;
            const isEnglishLocale = fullPath.startsWith('/en/');
            const shopBase = isEnglishLocale ? '/en/shop' : '/de/shop';
            const url = `${shopBase}?${params.toString()}`;
            window.location.replace(url); // full reload, replace current history entry
            return;
        }

        // If URL asks for basket/checkout but reservation is gone, normalize to seat selection
        // Skip this check for voucher flow - vouchers don't need reservations
        if ((s === 'warenkorb' || s === 'checkout') && !state.reservationData && state.flowMode !== 'vouchers') {
            params.set('s', 'sitzplatz');
            navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
            goToStep('sitzplatz');
            return;
        }

        // If URL asks for zahlung but order data is missing (e.g., after refresh), normalize to date selection
        const hasOrderData = !!state.placedOrderSnapshot || !!state.placedOrderNumber;
        if (s === 'zahlung' && !hasOrderData) {
            params.set('s', 'datum');
            navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
            goToStep('datum');
            return;
        }

        if (s && validSteps.includes(s) && s !== state.currentStep) {
            goToStep(s);
        }
    }, [location.key]);

    // Defensive: if currently in basket/checkout without reservation, force back to seat selection
    // Skip this check for voucher flow - vouchers don't need reservations
    React.useEffect(() => {
        if ((state.currentStep === 'warenkorb' || state.currentStep === 'checkout') && !state.reservationData && state.flowMode !== 'vouchers') {
            const params = new URLSearchParams(location.search);
            params.set('s', 'sitzplatz');
            navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
            goToStep('sitzplatz');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.currentStep, state.reservationData, state.flowMode]);

    // When state changes, push URL change if needed (enables back/forward)
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const currentParam = params.get('s');
        if (state.currentStep !== currentParam) {
            if (allSteps.includes(state.currentStep)) {
                params.set('s', state.currentStep);
                navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: false });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.currentStep]);

    const renderCurrentStep = () => {
        switch (state.currentStep) {
            case 'datum':
                return <DateSelectionStep />;
            case 'sitzplatz':
                return <SeatSelectionStep />;
            case 'warenkorb':
            case 'checkout':
                return <BasketCheckoutWrapper />;
            case 'gutscheine':
                return <VoucherShopPage />;
            case 'zahlung':
                return <OrderConfirmationStep />;
            default:
                return <DateSelectionStep />;
        }
    };

    return (
        <div className="lg:min-h-[90vh] xl:min-h-screen">
            {/* Step Indicator */}
            <StepIndicator />
            
            {/* Notification Banner - Fixed positioned at bottom */}
            <NotificationBanner />
            
            {/* Main Content */}
            <div className="">
                <Suspense fallback={<div className="p-8 text-center">Wird geladen…</div>}>
                    {renderCurrentStep()}
                </Suspense>
            </div>
        </div>
    );
}
