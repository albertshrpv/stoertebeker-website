import React, { createContext, useContext, useReducer, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import type { EventShowData, MinimalEventShowData } from '../types/eventShow';
import type { BasketData, LineItem, CrossSellingLineItem, TicketAddOnLineItem } from '../types/lineItem';
import type { ReservationResponse, Notification, WebSocketEvents } from '../types/reservation';
import { SessionManager } from '../utils/session';
import { NotificationManager } from '../utils/notifications';
import { getUserReservations, releaseReservationsBySession } from '../api/reservations';
import { eventsApi } from '../api/events';
import type { TicketLineItem } from '../types/lineItem';
import type { InitData } from '../hooks/useInitData';
import { getSeatDisplayNameWithSeatGroupName } from '../utils/seatInfo';
import { FrontendCrossSellingProductType } from '../types/crossSellingProduct';
import { calculateFinancialBreakdown } from '../utils/financialBreakdown';
import { generateUUID } from '../utils/uuid';
import { couponsApi } from '../api/coupons';
import { buildCouponApplicationContext, checkForDuplicateCoupons } from '../utils/couponHelpers';

export type BookingStep = 'datum' | 'sitzplatz' | 'warenkorb' | 'checkout' | 'zahlung' | 'gutscheine';

// Simple localStorage for selected show persistence
// const SELECTED_SHOW_KEY = 'stoertebeker_selected_show';

// const saveSelectedShow = (show: EventShowData | null, seriesId: string) => {
//     if (show) {
//         try {
//             localStorage.setItem(SELECTED_SHOW_KEY, JSON.stringify({ show, seriesId, timestamp: Date.now() }));
//         } catch (e) {
//             console.warn('Failed to save show to localStorage');
//         }
//     } else {
//         localStorage.removeItem(SELECTED_SHOW_KEY);
//     }
// };

// const loadSelectedShow = (seriesId: string): EventShowData | null => {
//     try {
//         const stored = localStorage.getItem(SELECTED_SHOW_KEY);
//         if (!stored) return null;

//         const data = JSON.parse(stored);
//         const isExpired = Date.now() - data.timestamp > 24 * 60 * 60 * 1000; // 24 hours
//         const isSameSeries = data.seriesId === seriesId;

//         if (isExpired || !isSameSeries) {
//             localStorage.removeItem(SELECTED_SHOW_KEY);
//             return null;
//         }

//         return data.show;
//     } catch (e) {
//         localStorage.removeItem(SELECTED_SHOW_KEY);
//         return null;
//     }
// };


export interface BookingState {
    // Current step
    currentStep: BookingStep;
    // Current flow mode
    flowMode: 'tickets' | 'vouchers';

    // Series and show data
    seasonId: string;
    selectedMinimalShow: MinimalEventShowData | null;
    selectedShow: EventShowData | null;
    initData: InitData | null;
    // Basket data
    basket: BasketData;

    // Shipping option
    shippingOption: string | null;

    // UI state
    isLoading: boolean;
    error: string | null;

    // Reservation data
    reservationData: ReservationResponse['data'] | null;
    timeRemaining: number;
    canExtend: boolean;
    isExtending: boolean;
    blockedSeats: string[];

    // Note: WebSocket is now managed by SocketContext

    // Session
    sessionId: string;

    // UI state
    notifications: Notification[];
    
    // Seat plan viewer UI state
    hasSeatPlanInteracted: boolean; // Track if user has interacted with seat plan zoom prompt

    // Order confirmation
    placedOrderNumber: number | null;
    placedOrderSnapshot: any | null;

    // Coupon state
    appliedCoupons: string[]; // Array of applied coupon codes
    couponValidationInProgress: boolean;
    couponError: string | null;
    isRevalidatingCoupons: boolean;

    // Language
    language: 'de' | 'en';
}

export type BookingAction =
    | { type: 'SET_STEP'; payload: BookingStep }
    | { type: 'SET_FLOW_MODE'; payload: 'tickets' | 'vouchers' }
    | { type: 'SET_SEASON_ID'; payload: string }
    | { type: 'SET_INIT_DATA'; payload: InitData }
    | { type: 'SET_SELECTED_SHOW'; payload: EventShowData }
    | { type: 'SET_SELECTED_MINIMAL_SHOW'; payload: MinimalEventShowData }
    | { type: 'ADD_LINE_ITEM'; payload: LineItem }
    | { type: 'SET_LINE_ITEMS'; payload: LineItem[] }
    | { type: 'REMOVE_LINE_ITEM'; payload: string }
    | { type: 'UPDATE_LINE_ITEM'; payload: { id: string; item: Partial<LineItem> } }
    | { type: 'CLEAR_BASKET' }
    | { type: 'SET_SHIPPING_OPTION'; payload: string | null }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'RESET_BOOKING' }
    // Reservation actions
    | { type: 'SET_RESERVATION_DATA'; payload: ReservationResponse['data'] | null }
    | { type: 'SET_TIME_REMAINING'; payload: number }
    | { type: 'SET_CAN_EXTEND'; payload: boolean }
    | { type: 'SET_IS_EXTENDING'; payload: boolean }
    | { type: 'SET_BLOCKED_SEATS'; payload: string[] }
    | { type: 'UPDATE_SEAT_AVAILABILITY'; payload: { seatIds: string[]; available: boolean } }
    | { type: 'REMOVE_SEATS_FROM_SELECTION'; payload: string[] }
    | { type: 'RESET_RESERVATION_STATE' }
    | { type: 'RELEASE_RESERVATIONS_KEEP_SELECTIONS' }
    // WebSocket actions

    // Notification actions
    | { type: 'ADD_NOTIFICATION'; payload: Notification }
    | { type: 'REMOVE_NOTIFICATION'; payload: string }
    // Seat plan viewer UI actions
    | { type: 'SET_SEAT_PLAN_INTERACTED'; payload: boolean }
    // Order actions
    | { type: 'SET_PLACED_ORDER'; payload: { orderNumber: number | null; orderSnapshot: any | null } }
    // Coupon actions
    | { type: 'SET_APPLIED_COUPONS'; payload: string[] }
    | { type: 'ADD_APPLIED_COUPON'; payload: string }
    | { type: 'REMOVE_APPLIED_COUPON'; payload: string }
    | { type: 'SET_COUPON_VALIDATION_IN_PROGRESS'; payload: boolean }
    | { type: 'SET_COUPON_ERROR'; payload: string | null }
    | { type: 'SET_IS_REVALIDATING_COUPONS'; payload: boolean }
    | { type: 'CLEAR_COUPON_STATE' };

const initialState: BookingState = {
    currentStep: 'datum',
    flowMode: 'tickets',
    seasonId: '',
    selectedMinimalShow: null,
    selectedShow: null,
    initData: null,
    basket: {
        line_items: [],
        financial_breakdown: null
    },
    shippingOption: null,
    isLoading: false,
    error: null,
    // Reservation state
    reservationData: null,
    timeRemaining: 0,
    canExtend: true,
    isExtending: false,
    blockedSeats: [],

    // Session state
    sessionId: SessionManager.getSessionId(),
    // UI state
    notifications: [],
    hasSeatPlanInteracted: false,
    // Order confirmation
    placedOrderNumber: null,
    placedOrderSnapshot: null,

    // Coupon state
    appliedCoupons: [],
    couponValidationInProgress: false,
    couponError: null,
    isRevalidatingCoupons: false,

    // Language
    language: 'de'
};

// Financial calculation is now handled by the consolidated function in utils/financialBreakdown.ts

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
    switch (action.type) {
        case 'SET_STEP':
            return { ...state, currentStep: action.payload };

        case 'SET_FLOW_MODE':
            // If flow mode is actually changing, clear basket and related state to avoid inconsistencies
            if (state.flowMode !== action.payload) {
                // console.log(`🔄 Flow mode changing from ${state.flowMode} to ${action.payload} - clearing basket and related state`);
                return {
                    ...state,
                    flowMode: action.payload,
                    basket: { ...initialState.basket },
                    shippingOption: null,
                    reservationData: null,
                    timeRemaining: 0,
                    canExtend: true,
                    isExtending: false,
                    blockedSeats: [],
                    appliedCoupons: [],
                    couponValidationInProgress: false,
                    couponError: null,
                    isRevalidatingCoupons: false,
                    // Clear show selections to prevent API from treating voucher orders as ticket orders
                    selectedShow: null,
                    selectedMinimalShow: null
                };
            }
            return { ...state, flowMode: action.payload };

        case 'SET_SEASON_ID':
            return { ...state, seasonId: action.payload };

        case 'SET_INIT_DATA':
            // console.log('SET_INIT_DATA', action.payload);

            // If we have line items but no breakdown yet (because initData was null), recalc
            if (state.basket.line_items.length > 0 && !state.basket.financial_breakdown) {
                const deliveryOption = action.payload.deliveryOptions.find(opt => opt.id === state.shippingOption);
                const breakdown = calculateFinancialBreakdown(
                    state.basket.line_items,
                    action.payload.mainOrganizer,
                    deliveryOption
                );

                return {
                    ...state,
                    initData: action.payload,
                    basket: {
                        ...state.basket,
                        financial_breakdown: breakdown
                    }
                };
            }

            return { ...state, initData: action.payload };

        case 'SET_SELECTED_SHOW':
            // Clear blocked seats if the slug changed to ensure fresh data
            const newSlug = action.payload?.slug;
            const oldSlug = state.selectedShow?.slug;
            const slugChanged = newSlug !== oldSlug;
            // console.log('🔴 [BookingContext] SET_SELECTED_SHOW:', {
            //     oldSlug,
            //     newSlug,
            //     slugChanged,
            //     willClearBlockedSeats: slugChanged,
            //     currentBlockedSeatsCount: state.blockedSeats.length
            // });
            return { 
                ...state, 
                selectedShow: action.payload,
                // Clear blocked seats if slug changed (new date selected)
                blockedSeats: slugChanged ? [] : state.blockedSeats
            };

        case 'SET_SELECTED_MINIMAL_SHOW':
            // Clear blocked seats when date changes to ensure fresh data
            const minimalShowSlug = action.payload?.slug;
            // console.log('🟣 [BookingContext] SET_SELECTED_MINIMAL_SHOW:', {
            //     slug: minimalShowSlug,
            //     currentBlockedSeatsCount: state.blockedSeats.length,
            //     clearingBlockedSeats: true
            // });
            return { 
                ...state, 
                selectedMinimalShow: action.payload,
                blockedSeats: []
            };

        case 'ADD_LINE_ITEM':
            // If initData is not loaded yet, just add the item without calculating totals
            if (!state.initData) {
                const newLineItems = [...state.basket.line_items, action.payload];
                return {
                    ...state,
                    basket: {
                        ...state.basket,
                        line_items: newLineItems
                    }
                };
            }

            // For non-crossselling items or new crossselling items, add normally
            const newLineItems = [...state.basket.line_items, action.payload];
            const deliveryOptionForAdd = state.initData.deliveryOptions.find(opt => opt.id === state.shippingOption);
            const newBreakdown = calculateFinancialBreakdown(newLineItems, state.initData.mainOrganizer!, deliveryOptionForAdd);
            return {
                ...state,
                basket: {
                    ...state.basket,
                    line_items: newLineItems,
                    financial_breakdown: newBreakdown
                }
            };

        case 'SET_LINE_ITEMS':
            // Replace entire line_items array (used for grouped cross-selling operations)
            if (!state.initData) {
                return {
                    ...state,
                    basket: {
                        ...state.basket,
                        line_items: action.payload
                    }
                };
            }
            {
                const deliveryOptionForSet = state.initData.deliveryOptions.find(opt => opt.id === state.shippingOption);
                const breakdownForSet = calculateFinancialBreakdown(action.payload, state.initData.mainOrganizer!, deliveryOptionForSet);
                return {
                    ...state,
                    basket: {
                        ...state.basket,
                        line_items: action.payload,
                        financial_breakdown: breakdownForSet
                    }
                };
            }

        // if line item is a ticket, remove all ticket addons with the same ticket_line_item_id
        case 'REMOVE_LINE_ITEM':
            const lineItemsToRemove: string[] = [];

            const itemToRemove = state.basket.line_items.find(item => item.id === action.payload);
            lineItemsToRemove.push(action.payload);

            if (itemToRemove && itemToRemove.type === 'ticket') {
                const ticketAddOns = state.basket.line_items.filter(item => item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW && (item as TicketAddOnLineItem).ticket_line_item_id === itemToRemove.id) as TicketAddOnLineItem[];
                ticketAddOns.forEach(item => {
                    lineItemsToRemove.push(item.id);
                });
            }

            const filteredLineItems = state.basket.line_items.filter(item => !lineItemsToRemove.includes(item.id));

            // If initData is not loaded yet, just remove the items without calculating totals
            if (!state.initData) {
                return {
                    ...state,
                    basket: {
                        ...state.basket,
                        line_items: filteredLineItems
                    }
                };
            }

            const deliveryOptionForRemove = state.initData.deliveryOptions.find(opt => opt.id === state.shippingOption);
            const filteredBreakdown = calculateFinancialBreakdown(filteredLineItems, state.initData.mainOrganizer!, deliveryOptionForRemove);

            return {
                ...state,
                basket: {
                    ...state.basket,
                    line_items: filteredLineItems,
                    financial_breakdown: filteredBreakdown
                }
            };

        case 'UPDATE_LINE_ITEM':
            const updatedLineItems = state.basket.line_items.map(item =>
                item.id === action.payload.id
                    ? { ...item, ...action.payload.item } as LineItem
                    : item
            );

            // If initData is not loaded yet, just update the items without calculating totals
            if (!state.initData) {
                return {
                    ...state,
                    basket: {
                        ...state.basket,
                        line_items: updatedLineItems
                    }
                };
            }

            const deliveryOptionForUpdate = state.initData.deliveryOptions.find(opt => opt.id === state.shippingOption);
            const updatedBreakdown = calculateFinancialBreakdown(updatedLineItems, state.initData.mainOrganizer!, deliveryOptionForUpdate);
            return {
                ...state,
                basket: {
                    ...state.basket,
                    line_items: updatedLineItems,
                    financial_breakdown: updatedBreakdown
                }
            };

        case 'CLEAR_BASKET':
            return {
                ...state,
                basket: { ...initialState.basket }
            };

        case 'SET_SHIPPING_OPTION':
            if (!state.initData) {
                return { ...state, shippingOption: action.payload };
            }
            // Recalculate financial breakdown with new delivery option
            const newDeliveryOption = state.initData.deliveryOptions.find(opt => opt.id === action.payload);
            const recalculatedBreakdown = calculateFinancialBreakdown(state.basket.line_items, state.initData.mainOrganizer, newDeliveryOption);
            return {
                ...state,
                shippingOption: action.payload,
                basket: {
                    ...state.basket,
                    financial_breakdown: recalculatedBreakdown
                }
            };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'SET_ERROR':
            return { ...state, error: action.payload };

        case 'RESET_BOOKING':
            return { ...initialState };

        // Reservation actions
        case 'SET_RESERVATION_DATA':
            return { ...state, reservationData: action.payload };

        case 'SET_TIME_REMAINING':
            return { ...state, timeRemaining: action.payload };

        case 'SET_CAN_EXTEND':
            return { ...state, canExtend: action.payload };

        case 'SET_IS_EXTENDING':
            return { ...state, isExtending: action.payload };

        case 'SET_BLOCKED_SEATS':
            return { ...state, blockedSeats: action.payload };

        case 'UPDATE_SEAT_AVAILABILITY':
            // This action is for WebSocket updates to seat availability
            // The actual seat state is managed in the SeatPlanViewer component
            return {
                ...state,
                blockedSeats: action.payload.available
                    ? state.blockedSeats.filter(seatId => !action.payload.seatIds.includes(seatId))
                    : [...new Set([...state.blockedSeats, ...action.payload.seatIds])]
            };

        case 'REMOVE_SEATS_FROM_SELECTION':
            const filteredItems = state.basket.line_items.filter(item => {
                if (item.type !== 'ticket') return true;
                const ticketItem = item as any; // Type assertion for seat access
                return !action.payload.includes(ticketItem.seat?.seat_number);
            });

            // If initData is not loaded yet, just filter the items without calculating totals
            if (!state.initData) {
                return {
                    ...state,
                    basket: {
                        ...state.basket,
                        line_items: filteredItems
                    }
                };
            }

            const deliveryOptionForSeatRemoval = state.initData.deliveryOptions.find(opt => opt.id === state.shippingOption);
            const newBreakdownAfterRemoval = calculateFinancialBreakdown(filteredItems, state.initData.mainOrganizer!, deliveryOptionForSeatRemoval);
            return {
                ...state,
                basket: {
                    ...state.basket,
                    line_items: filteredItems,
                    financial_breakdown: newBreakdownAfterRemoval
                }
            };

        case 'RESET_RESERVATION_STATE':
            return {
                ...state,
                reservationData: null,
                timeRemaining: 0,
                canExtend: true,
                isExtending: false,
                blockedSeats: [],
                basket: { ...initialState.basket }
            };

        case 'RELEASE_RESERVATIONS_KEEP_SELECTIONS':
            // Clear all coupons when going back to seat selection
            const basketWithoutCoupons = {
                ...state.basket,
                line_items: state.basket.line_items.filter(item => item.type !== 'coupon')
            };

            // Split tickets into convertible (Bestplatz/free origin) and manual seat tickets
            const tickets = basketWithoutCoupons.line_items.filter(i => i.type === 'ticket') as TicketLineItem[];
            const convertibleTickets = tickets.filter(t => (t.seat?.seat_number === 'Bestplatz') || (t as any).best_seat_origin || (t as any).free_seat_selection);
            const manualSeatTickets = tickets.filter(t => !(t.seat?.seat_number === 'Bestplatz') && !(t as any).best_seat_origin && !(t as any).free_seat_selection);

            // Group convertible tickets by (seat_group_id, price_category.id)
            const grouped = new Map<string, { sample: TicketLineItem; count: number }>();
            for (const t of convertibleTickets) {
                const key = `${t.seat_group_id}-${t.price_category.id}`;
                if (!grouped.has(key)) {
                    grouped.set(key, { sample: t, count: 0 });
                }
                grouped.get(key)!.count += 1;
            }

            const rebuiltLineItems = [
                // Keep non-ticket items except coupons (already filtered)
                ...basketWithoutCoupons.line_items.filter(i => i.type !== 'ticket'),
                // Keep manual seat tickets exactly as they are
                ...manualSeatTickets,
                // Recreate grouped Bestplatz/free tickets for convertible ones
                ...Array.from(grouped.values()).flatMap(({ sample, count }) => {
                    const arr: TicketLineItem[] = [];
                    for (let i = 0; i < count; i++) {
                        arr.push({
                            id: generateUUID(),
                            type: 'ticket',
                            quantity: 1,
                            unit_price: sample.unit_price,
                            total_price: sample.total_price,
                            currency: sample.currency,
                            vat_rate: sample.vat_rate,
                            name: (sample as any).free_seat_selection ? `${sample.seat_group_name} - Freie Platzwahl` : `${sample.seat_group_name} - ${sample.price_category.category_name}`,
                            show_id: sample.show_id,
                            show_date: sample.show_date,
                            show_time: sample.show_time,
                            seat: {
                                id: generateUUID(),
                                seat_number: 'Bestplatz',
                                seat_row: 'Bestplatz',
                                seat_row_number: -1,
                                type: 'bestplatz'
                            },
                            seat_group_id: sample.seat_group_id,
                            seat_group_name: sample.seat_group_name,
                            price_category: sample.price_category,
                            free_seat_selection: (sample as any).free_seat_selection === true,
                            best_seat_origin: true
                        });
                    }
                    return arr;
                })
            ];

            // Recalculate totals without coupons
            const deliveryOptionForRelease = state.initData?.deliveryOptions.find(opt => opt.id === state.shippingOption);
            const recalculatedBreakdownForRelease = state.initData ?
                calculateFinancialBreakdown(rebuiltLineItems, state.initData.mainOrganizer!, deliveryOptionForRelease) :
                null;

            return {
                ...state,
                currentStep: 'sitzplatz',
                reservationData: null,
                timeRemaining: 0,
                canExtend: true,
                isExtending: false,
                blockedSeats: [],
                appliedCoupons: [],
                couponError: null,
                basket: {
                    ...basketWithoutCoupons,
                    line_items: rebuiltLineItems,
                    financial_breakdown: recalculatedBreakdownForRelease
                }
            };

        // WebSocket is now managed by SocketContext

        // Notification actions
        case 'ADD_NOTIFICATION':
            return {
                ...state,
                notifications: [...state.notifications, action.payload]
            };

        case 'REMOVE_NOTIFICATION':
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.payload)
            };

        case 'SET_SEAT_PLAN_INTERACTED':
            return {
                ...state,
                hasSeatPlanInteracted: action.payload
            };

        case 'SET_PLACED_ORDER':
            return {
                ...state,
                placedOrderNumber: action.payload.orderNumber,
                placedOrderSnapshot: action.payload.orderSnapshot,
            };

        // Coupon actions
        case 'SET_APPLIED_COUPONS':
            return {
                ...state,
                appliedCoupons: action.payload
            };

        case 'ADD_APPLIED_COUPON':
            return {
                ...state,
                appliedCoupons: [...state.appliedCoupons, action.payload]
            };

        case 'REMOVE_APPLIED_COUPON':
            return {
                ...state,
                appliedCoupons: state.appliedCoupons.filter(code => code !== action.payload)
            };

        case 'SET_COUPON_VALIDATION_IN_PROGRESS':
            return {
                ...state,
                couponValidationInProgress: action.payload
            };

        case 'SET_COUPON_ERROR':
            return {
                ...state,
                couponError: action.payload
            };

        case 'SET_IS_REVALIDATING_COUPONS':
            return {
                ...state,
                isRevalidatingCoupons: action.payload
            };

        case 'CLEAR_COUPON_STATE':
            return {
                ...state,
                appliedCoupons: [],
                couponValidationInProgress: false,
                couponError: null,
                isRevalidatingCoupons: false
            };

        default:
            return state;
    }
}

interface BookingContextType {
    state: BookingState;
    dispatch: React.Dispatch<BookingAction>;

    // Helper functions
    goToStep: (step: BookingStep) => void;
    goToNextStep: () => void;
    goToPreviousStep: () => void;
    canGoToNextStep: () => boolean;
    canGoToPreviousStep: () => boolean;

    // Reservation helpers
    releaseReservationsKeepSelections: (targetAfterRelease?: BookingStep) => Promise<void>;
    showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
    recoverSession: () => Promise<void>;

    // Coupon helpers
    checkAutoApplyCoupons: () => Promise<void>;
    revalidateExistingCoupons: (codes?: string[]) => Promise<void>;

    // Socket state (from SocketContext)
    socket: Socket | null;
    isConnected: boolean;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

interface BookingProviderProps {
    children: ReactNode;
    seasonId: string;
    language: 'de' | 'en';
}

export function BookingProvider({ children, seasonId, language }: BookingProviderProps) {
    const [state, dispatch] = useReducer(bookingReducer, {
        ...initialState,
        seasonId,
        language
    });
    const { socket, isConnected } = useSocket();
    const { customer } = useAuth();

    // Track if this is the initial load to prevent unnecessary revalidation
    const [hasInitialized, setHasInitialized] = React.useState(false);

    // Initialize session recovery on mount
    useEffect(() => {
        recoverSession();
    }, []);


    // Scroll to top when step changes
    useEffect(() => {
        scrollToTop();
    }, [state.currentStep]);

    // Memoize filtered line items to prevent unnecessary re-renders
    const nonCouponLineItems = useMemo(() =>
        state.basket.line_items.filter(item => item.type !== 'coupon'),
        [state.basket.line_items]
    );

    // Track only ticket and cross-selling items for coupon revalidation
    const ticketAndCrossSellingItems = useMemo(() =>
        state.basket.line_items.filter(item => item.type === 'ticket' || item.type === 'crossselling'),
        [state.basket.line_items]
    );

    // Create a stable identifier for ticket and cross-selling items to trigger revalidation
    const ticketAndCrossSellingSignature = useMemo(() => {
        return ticketAndCrossSellingItems
            .map(item => `${item.type}-${item.id}-${item.quantity}-${item.total_price}`)
            .sort()
            .join('|');
    }, [ticketAndCrossSellingItems]);

    // Auto-apply coupons when basket content changes
    useEffect(() => {
        if (state.currentStep === 'warenkorb' && state.selectedShow && state.initData && nonCouponLineItems.length > 0) {
            // Use requestAnimationFrame to run after all synchronous updates are complete
            const rafId = requestAnimationFrame(() => {
                checkAutoApplyCoupons();
            });

            return () => cancelAnimationFrame(rafId);
        }
    }, [
        nonCouponLineItems, // Use memoized filtered items
        state.currentStep,
        state.selectedShow?.id,
        state.initData
    ]);

    // Mark as initialized after first render to prevent unnecessary initial revalidation
    useEffect(() => {
        if (state.currentStep === 'warenkorb' && state.selectedShow && state.initData) {
            setHasInitialized(true);
        }
    }, [state.currentStep, state.selectedShow, state.initData]);

    // Track revalidation state to prevent race conditions
    const [isRevalidationScheduled, setIsRevalidationScheduled] = React.useState(false);

    // Previous signature to detect actual changes
    const prevSignatureRef = useRef<string>('');

    // Removed latestStateRef to avoid one-tick lag on effects that read state

    // Revalidate existing coupons when ticket or cross-selling items change
    // This ensures proper evaluation of auto-apply coupon conditions
    useEffect(() => {
        // Only proceed if we have the necessary context and coupons to revalidate
        if (
            hasInitialized &&
            (state.currentStep === 'warenkorb' || state.currentStep === 'checkout') &&
            state.selectedShow &&
            state.initData &&
            state.appliedCoupons.length > 0 &&
            !state.couponValidationInProgress &&
            !state.isRevalidatingCoupons &&
            !isRevalidationScheduled
        ) {
            // Check if signature actually changed (not just empty on first load)
            const hasSignatureChanged = ticketAndCrossSellingSignature !== prevSignatureRef.current;
            const hasTicketsOrCrossSelling = ticketAndCrossSellingItems.length > 0;

            // Update the previous signature
            prevSignatureRef.current = ticketAndCrossSellingSignature;

            // Revalidate if:
            // 1. Signature changed (items added, removed, or modified)
            // 2. OR we have no tickets/cross-selling items but still have coupons (should remove auto-apply coupons)
            if (hasSignatureChanged || (!hasTicketsOrCrossSelling && state.appliedCoupons.length > 0)) {
                // console.log('🔄 Revalidating coupons:', {
                //     reason: hasSignatureChanged ? 'signature changed' : 'no items but have coupons',
                //     step: state.currentStep,
                //     signature: ticketAndCrossSellingSignature,
                //     itemCount: ticketAndCrossSellingItems.length,
                //     couponsCount: state.appliedCoupons.length
                // });

                setIsRevalidationScheduled(true);

                // Use requestAnimationFrame to ensure revalidation happens after all DOM updates
                const rafId = requestAnimationFrame(async () => {
                    try {
                        await revalidateExistingCoupons();
                    } finally {
                        setIsRevalidationScheduled(false);
                    }
                });

                return () => {
                    cancelAnimationFrame(rafId);
                    setIsRevalidationScheduled(false);
                };
            }
        } else {
            // Update the reference even when not revalidating
            prevSignatureRef.current = ticketAndCrossSellingSignature;
        }
    }, [
        hasInitialized,
        ticketAndCrossSellingSignature,
        ticketAndCrossSellingItems.length, // Track count separately to catch empty basket case
        state.currentStep,
        state.selectedShow?.id,
        state.initData,
        state.appliedCoupons.length,
        isRevalidationScheduled
        // Notably NOT including state.couponValidationInProgress or isRevalidatingCoupons 
        // in dependencies to avoid triggering during validation processes
    ]);

    // Helper function to show notifications
    const showNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration: number = 5000) => {
        const notification = {
            id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message,
            type,
            duration
        };

        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
        // Auto-removal is handled by the NotificationBanner component
    };

    // Register the notification callback with NotificationManager
    useEffect(() => {
        NotificationManager.setGlobalCallback(showNotification);

        return () => {
            // Clean up callback on unmount
            NotificationManager.setGlobalCallback(() => { });
        };
    }, []);



    // Function to restore booking from reservation data
    const restoreBookingFromReservation = async (reservationData: ReservationResponse['data']) => {
        try {
            // Get the show_id from the first reservation
            const firstReservation = reservationData.reservations[0];
            if (!firstReservation) {
                console.warn('No reservations found in reservation data');
                return;
            }

            const showId = firstReservation.show_id;

            // Fetch complete show data directly by ID (no dependency on availableShows)
            let completeShow: EventShowData;
            try {
                // console.log('🔍 Fetching show data by ID:', showId);
                const response = await eventsApi.shows.getById(showId);
                if (!response.data.success || !response.data.data) {
                    throw new Error('Failed to fetch show data by ID');
                }
                completeShow = response.data.data as EventShowData;
                // console.log('✅ Successfully fetched show data:', completeShow.name);
            } catch (error) {
                console.error('❌ Failed to fetch show data by ID:', showId, error);
                throw new Error(`Could not restore session: Show ${showId} not found`);
            }

            // Set the selected show
            dispatch({ type: 'SET_SELECTED_SHOW', payload: completeShow });

            // If we have pricing structure, recreate line items
            if (completeShow.pricing_structure?.seat_groups) {
                const lineItems: TicketLineItem[] = [];

                // Process each reservation
                for (const reservation of reservationData.reservations) {
                    const seatId = reservation.seat_id;

                    // Find which seat group this seat belongs to
                    let foundSeatGroup = null;
                    let foundSeat = null;

                    for (const seatGroup of completeShow.pricing_structure.seat_groups) {
                        const seat = seatGroup.seats?.find(s => s.seat_number === seatId);
                        if (seat) {
                            foundSeatGroup = seatGroup;
                            foundSeat = seat;
                            break;
                        }
                    }

                    if (foundSeatGroup && foundSeat) {
                        // Find the exact price category that was originally selected
                        const priceCategory = foundSeatGroup.prices?.find(p => p.id === reservation.price_id);
                        if (priceCategory) {
                            const displayName = (completeShow.free_seat_selection ? `${foundSeatGroup.name} - Freie Platzwahl` : getSeatDisplayNameWithSeatGroupName(foundSeat, foundSeatGroup.name, state.language));

                            const ticketLineItem: TicketLineItem = {
                                id: generateUUID(),
                                type: 'ticket',
                                quantity: 1,
                                unit_price: parseFloat(priceCategory.price),
                                total_price: parseFloat(priceCategory.price),
                                currency: priceCategory.currency,
                                vat_rate: priceCategory.vat_rate,
                                name: displayName,
                                show_id: completeShow.id,
                                show_date: completeShow.date,
                                show_time: completeShow.show_time,
                                seat: foundSeat,
                                seat_group_id: foundSeatGroup.id,
                                seat_group_name: foundSeatGroup.name,
                                price_category: priceCategory,
                                free_seat_selection: completeShow.free_seat_selection === true
                            };

                            lineItems.push(ticketLineItem);
                            // console.log(`✅ Restored seat ${seatId} with original price category: ${priceCategory.category_name}`);
                        } else {
                            console.warn('Price category not found for reservation:', {
                                reservationId: reservation.id,
                                seatId,
                                priceId: reservation.price_id,
                                availablePrices: foundSeatGroup.prices?.map(p => ({ id: p.id, name: p.category_name }))
                            });
                        }
                    } else {
                        console.warn('Seat not found in pricing structure:', seatId);
                    }
                }

                // Add all line items to basket
                for (const lineItem of lineItems) {
                    dispatch({ type: 'ADD_LINE_ITEM', payload: lineItem });
                }

                // console.log(`Restored ${lineItems.length} line items from reservation`);
            } else {
                console.warn('No pricing structure available for show restoration');
            }
        } catch (error) {
            console.error('Error restoring booking from reservation:', error);
        }
    };

    // Silent session recovery - only acts if reservations exist
    const recoverSession = async () => {
        try {
            const reservations = await getUserReservations({ sessionId: state.sessionId });

            // Only proceed if there are actual reservations to restore
            if (reservations && reservations.length > 0) {
                // console.log('🔍 Found existing reservations, restoring session...', reservations.length);
                const reservationData = reservations[0];

                // Check if reservation is still valid
                const expiresAt = new Date(reservationData.expiresAt).getTime();
                if (expiresAt > Date.now()) {
                    // Valid reservation found - restore booking state
                    dispatch({ type: 'SET_RESERVATION_DATA', payload: reservationData });

                    // Set canExtend flag from the reservation data if available
                    if (typeof reservationData.canExtend === 'boolean') {
                        dispatch({ type: 'SET_CAN_EXTEND', payload: reservationData.canExtend });
                        // console.log('🔄 Restored canExtend flag:', reservationData.canExtend);
                    }

                    // Set time remaining if available
                    if (reservationData.timeRemaining) {
                        dispatch({ type: 'SET_TIME_REMAINING', payload: reservationData.timeRemaining });
                        // console.log('⏰ Restored timeRemaining:', reservationData.timeRemaining);
                    }

                    // Restore show data and line items
                    await restoreBookingFromReservation(reservationData);

                    dispatch({ type: 'SET_STEP', payload: 'warenkorb' });
                    showNotification('Ihre Reservierung wurde wiederhergestellt!', 'success');
                    // console.log('✅ Session restored successfully');
                } else {
                    // console.log('Found expired reservation, ignoring');
                }
            } else {
                // No reservations - silent, do nothing
                // console.log('🔕 No active reservations found - starting fresh');
            }
        } catch (error) {
            // Silent failure - don't interfere with normal flow
            // console.log('🔕 Session recovery failed silently:', error);
        }
    };

    // Step navigation order
    const steps: BookingStep[] = ['datum', 'sitzplatz', 'warenkorb', 'checkout', 'zahlung'];

    const scrollToTop = () => {
        window.scrollTo(0, 0);
    };

    const goToStep = (step: BookingStep) => {
        // Synchronous guard: if navigating backward from a reserved state, normalize state
        const isLeavingReservedState = (state.currentStep === 'warenkorb' || state.currentStep === 'checkout');
        const isGoingBackToSeatOrDate = (step === 'sitzplatz' || step === 'datum');

        if (isLeavingReservedState && isGoingBackToSeatOrDate) {
            // Prefer async API release via helper, but we must also immediately normalize local state
            // to keep UI consistent even if the API call happens elsewhere.
            // We trigger the async release but do not await here.
            releaseReservationsKeepSelections(step);
            return; // releaseReservationsKeepSelections will dispatch the step change
        }

        dispatch({ type: 'SET_STEP', payload: step });
    };

    const goToNextStep = () => {
        const currentIndex = steps.indexOf(state.currentStep);
        if (currentIndex < steps.length - 1) {
            dispatch({ type: 'SET_STEP', payload: steps[currentIndex + 1] });
        }
    };

    const goToPreviousStep = () => {
        const currentIndex = steps.indexOf(state.currentStep);
        if (currentIndex > 0) {
            dispatch({ type: 'SET_STEP', payload: steps[currentIndex - 1] });
        }
    };

    const canGoToNextStep = () => {
        switch (state.currentStep) {
            case 'datum':
                return state.selectedMinimalShow !== null;
            case 'sitzplatz':
                // In the reservation system, we only move to basket after reserving seats
                return state.reservationData !== null;
            case 'warenkorb':
                // Check for duplicate coupons before allowing checkout
                const duplicateCoupons = checkForDuplicateCoupons(state);
                if (duplicateCoupons.length > 0) {
                    return false;
                }
                return state.reservationData !== null && state.timeRemaining > 0 && state.shippingOption !== null;
            case 'checkout':
                return false; // Last step
            default:
                return false;
        }
    };

    const canGoToPreviousStep = () => {
        return state.currentStep !== 'datum';
    };

    const releaseReservationsKeepSelections = async (targetAfterRelease?: BookingStep) => {
        if (!state.sessionId || !(state.reservationData?.reservations?.[0]?.show_id || state.selectedShow?.id) || state.basket.line_items.length === 0) {
            // No reservations to release, just navigate
            dispatch({ type: 'RELEASE_RESERVATIONS_KEEP_SELECTIONS' });
            if (targetAfterRelease) {
                dispatch({ type: 'SET_STEP', payload: targetAfterRelease });
            } else if (state.currentStep === 'warenkorb' || state.currentStep === 'checkout') {
                dispatch({ type: 'SET_STEP', payload: 'sitzplatz' });
            }
            return;
        }

        try {
            const showId = state.reservationData?.reservations?.[0]?.show_id || state.selectedShow?.id;
            await releaseReservationsBySession(state.sessionId, showId!);

            // Release reservations but keep selections
            dispatch({ type: 'RELEASE_RESERVATIONS_KEEP_SELECTIONS' });
            if (targetAfterRelease) {
                dispatch({ type: 'SET_STEP', payload: targetAfterRelease });
            } else if (state.currentStep === 'warenkorb' || state.currentStep === 'checkout') {
                dispatch({ type: 'SET_STEP', payload: 'sitzplatz' });
            }

        } catch (error) {
            console.error('Error releasing reservations:', error);
            // showNotification('Fehler beim Freigeben der Reservierung. Navigation wird fortgesetzt.', 'warning');

            // Even if release fails, navigate back (may happen if reservations already expired)
            dispatch({ type: 'RELEASE_RESERVATIONS_KEEP_SELECTIONS' });
            if (targetAfterRelease) {
                dispatch({ type: 'SET_STEP', payload: targetAfterRelease });
            } else if (state.currentStep === 'warenkorb' || state.currentStep === 'checkout') {
                dispatch({ type: 'SET_STEP', payload: 'sitzplatz' });
            }
        }
    };

    // Check for auto-applicable coupons
    const checkAutoApplyCoupons = async () => {
        if (!state.selectedShow || !state.initData || nonCouponLineItems.length === 0) {
            return;
        }

        try {
            const orderContext = buildCouponApplicationContext(state, customer?.id);
            const response = await couponsApi.autoApply(orderContext);

            if (response.data.success && response.data.data.length > 0) {
                // Add auto-applicable coupons to basket
                response.data.data.forEach(autoApplyCoupon => {
                    // Check if this coupon is not already applied
                    const isAlreadyApplied = state.appliedCoupons.includes(autoApplyCoupon.lineItem.coupon_code);
                    if (!isAlreadyApplied) {
                        dispatch({ type: 'ADD_LINE_ITEM', payload: autoApplyCoupon.lineItem });
                        dispatch({ type: 'ADD_APPLIED_COUPON', payload: autoApplyCoupon.lineItem.coupon_code });

                        showNotification(
                            `Automatischer Rabatt angewendet: ${autoApplyCoupon.lineItem.name}`,
                            'success',
                            4000
                        );
                    }
                });
            }
        } catch (error) {
            console.warn('Auto-apply coupons failed silently:', error);
            // Auto-apply should fail silently to not disrupt user flow
        }
    };

    // Re-validate existing coupons when basket changes
    const revalidateExistingCoupons = async (codes?: string[]) => {
        const current = state;
        const codesToValidate = codes && codes.length > 0 ? codes : current.appliedCoupons;
        if (codesToValidate.length === 0 || !current.selectedShow || !current.initData || current.isRevalidatingCoupons) {
            return;
        }

        // console.log('🔄 Starting coupon revalidation for codes:', codesToValidate);
        dispatch({ type: 'SET_IS_REVALIDATING_COUPONS', payload: true });

        try {
            const orderContext = buildCouponApplicationContext(current, customer?.id);
            // console.log('📊 Revalidation context:', {
            //     ticketCount: orderContext.lineItems.filter((item: any) => item.type === 'ticket').length,
            //     totalValue: current.basket.financial_breakdown?.total_amount || 0,
            //     couponsToValidate: codesToValidate
            // });

            const response = await couponsApi.validate({
                codes: codesToValidate,
                context: orderContext
            });

            if (response.data.success) {
                const { validCoupons, rejectedCoupons } = response.data.data;
                // console.log('✅ Revalidation results:', {
                //     validCount: validCoupons.length,
                //     rejectedCount: rejectedCoupons.length,
                //     valid: validCoupons.map(c => c.code),
                //     rejected: rejectedCoupons.map(c => c.code)
                // });

                // Remove all existing coupon line items first
                const existingCouponItems = state.basket.line_items.filter(item => item.type === 'coupon');
                existingCouponItems.forEach(item => {
                    dispatch({ type: 'REMOVE_LINE_ITEM', payload: item.id });
                });

                // Clear existing applied coupons list
                dispatch({ type: 'SET_APPLIED_COUPONS', payload: [] });

                // Add all valid coupons back
                validCoupons.forEach(validCoupon => {
                    dispatch({ type: 'ADD_LINE_ITEM', payload: validCoupon.lineItem });
                    dispatch({ type: 'ADD_APPLIED_COUPON', payload: validCoupon.code });
                });

                // Show notifications for rejected coupons (especially important for auto-apply)
                rejectedCoupons.forEach(rejected => {
                    // Auto-apply coupons are typically named differently or can be inferred from the error message
                    const seemsAutoApply = rejected.code.includes('AUTO') || rejected.errors.some(error => error.includes('minimum'));
                    const message = seemsAutoApply
                        ? `Automatischer Rabatt '${rejected.code}' wurde entfernt (Bedingungen nicht mehr erfüllt)`
                        : `Gutschein ${rejected.code} ist nicht mehr gültig und wurde entfernt: ${rejected.errors.join(', ')}`;

                    showNotification(message, 'warning', 5000);
                });
            }
        } catch (error) {
            console.warn('Coupon revalidation failed silently:', error);
            // Revalidation should fail silently to not disrupt user flow
        } finally {
            dispatch({ type: 'SET_IS_REVALIDATING_COUPONS', payload: false });
        }
    };

    const contextValue: BookingContextType = {
        state,
        dispatch,
        goToStep,
        goToNextStep,
        goToPreviousStep,
        canGoToNextStep,
        canGoToPreviousStep,
        releaseReservationsKeepSelections,
        showNotification,
        recoverSession,
        checkAutoApplyCoupons,
        revalidateExistingCoupons,
        socket,
        isConnected
    };

    return (
        <BookingContext.Provider value={contextValue}>
            {children}
        </BookingContext.Provider>
    );
}

export function useBooking() {
    const context = useContext(BookingContext);
    if (context === undefined) {
        throw new Error('useBooking must be used within a BookingProvider');
    }
    return context;
}