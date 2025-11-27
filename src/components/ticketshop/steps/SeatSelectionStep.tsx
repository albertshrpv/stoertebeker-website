import React, { useEffect, useState, useRef } from 'react';
import { useBooking } from '../contexts/BookingContext';
import { useSocket } from '../contexts/SocketContext';
import { componentContentPadding } from '../../../lib/utils';
import SeatPlanViewer, { type SeatInfo } from '../components/SeatPlanViewer';
import SeatPriceSelectionModal from '../components/SeatPriceSelectionModal';
import PreShowPriceSelectionModal from '../components/PreShowPriceSelectionModal';
import SeatGroupAccordion from '../components/SeatGroupAccordion';
import SeatConflictDialog from '../components/SeatConflictDialog';
import { isPresaleStarted, getPresaleStartDate, getTimeUntilPresale } from '../utils/presaleCheck';
import type { CompleteSeatGroup, CompletePrice } from '../types/pricing';
import type { CrossSellingLineItem, TicketAddOnLineItem, TicketLineItem } from '../types/lineItem';
import { useEventShow } from '../hooks/useEventShows';
import { getBlockedSeats, createReservations } from '../api/reservations';
import type { WebSocketEvents, SeatReservationRequestItem } from '../types/reservation';
import { allocateSeatsForTickets, allocateSeatsFreeMode } from '../utils/seatAllocation';
import { formatPrice } from '../utils/priceFormatting';
import { getSeatDisplayName, getSeatDisplayNameWithSeatGroupName } from '../utils/seatInfo';
import { FrontendCrossSellingProductType, type CrossSellingProductData } from '../types/crossSellingProduct';
import { generateUUID } from '../utils/uuid';
import { MainSelect } from '../components/MainSelect';
import { MainButton } from '../components/MainButton';
import LoadingSpinner from '../components/LoadingSpinner';
import TitleText from '../components/TitleText';
import SeatPlanViewerMobile, { type SeatPlanViewerMobileHandle } from '../components/SeatPlanViewerMobile';
import type { EventSeriesData } from '../types/eventSeries';
import { isIOSSafari, isIOSDevice } from '../utils/device';


const text = '<p>Jetzt geht es darum, den perfekten Platz für Ihr unvergessliches Abenteuer auszuwählen. Klicken Sie einfach auf Ihren Wunschplatz und sichern Sie sich den besten Blick auf die Bühne – Ihre Reise beginnt hier!</p>';




export function SeatSelectionStep() {
    const { state, dispatch, goToNextStep, goToPreviousStep, canGoToNextStep, canGoToPreviousStep, showNotification } = useBooking();
    const { socket, isConnected } = useSocket();
    const [isLoadingSvg, setIsLoadingSvg] = useState(false);
    const [svgContent, setSvgContent] = useState('');
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        seat: SeatInfo | null;
        seatGroup: CompleteSeatGroup | null;
    }>({
        isOpen: false,
        seat: null,
        seatGroup: null
    });

    // State for confirmation dialog
    const [conflictDialog, setConflictDialog] = useState<{
        isOpen: boolean;
        conflictType: 'manual-to-bestplatz' | 'bestplatz-to-manual';
        pendingAction: (() => void) | null;
    }>({
        isOpen: false,
        conflictType: 'manual-to-bestplatz',
        pendingAction: null
    });
    const [view, setView] = useState<'seat' | 'group' | 'free'>('seat');
    const [isWheelchairMode, setIsWheelchairMode] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const [preShowModalData, setPreShowModalData] = useState<{
        isOpen: boolean;
        ticketId: string | null;
        products: CrossSellingProductData[];
    }>({
        isOpen: false,
        ticketId: null,
        products: []
    });
    const seatTabRef = useRef<HTMLButtonElement>(null);
    const groupTabRef = useRef<HTMLButtonElement>(null);

    // Mobile-specific state
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
    const [isTabExpanded, setIsTabExpanded] = useState(false);
    const mobileViewerRef = useRef<SeatPlanViewerMobileHandle | null>(null);
    const mobileViewerContainerRef = useRef<HTMLDivElement | null>(null);
    const [showMobileControls, setShowMobileControls] = useState(false);
    // Track latest blocked seats fetch to ignore stale responses
    const latestBlockedFetchTokenRef = useRef<number>(0);
    // Track the slug currently being fetched to prevent duplicate requests
    const fetchingSlugRef = useRef<string | null>(null);

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
            setIsTablet(window.innerWidth > 768 && window.innerWidth < 1280); // xl breakpoint
            setIsMobileOrTablet(window.innerWidth < 1280); // xl breakpoint
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Visibility detection via scroll/resize (more robust)
    useEffect(() => {
        const updateVisibility = () => {
            const freeSeat = state.selectedShow?.free_seat_selection;
            if ((!isMobileOrTablet )|| view !== 'seat' || freeSeat) {
                setShowMobileControls(false);
                return;
            }
            const el = mobileViewerContainerRef.current;
            if (!el) {
                setShowMobileControls(false);
                return;
            }
            const rect = el.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
            const ratio = rect.height > 0 ? (visibleHeight / rect.height) : 0;
            setShowMobileControls(ratio >= 0.2);
        };

        updateVisibility();
        window.addEventListener('scroll', updateVisibility, { passive: true });
        window.addEventListener('resize', updateVisibility);
        return () => {
            window.removeEventListener('scroll', updateVisibility as any);
            window.removeEventListener('resize', updateVisibility as any);
        };
    }, [isMobileOrTablet, view, state.selectedShow?.free_seat_selection]);

    // Fetch complete show data if pricing structure is missing
    const { data: completeShow, isLoading: isLoadingShow } = useEventShow(
        state.selectedMinimalShow?.slug || ''
    );


    // Update the selected show with complete data when it's fetched
    useEffect(() => {
        if (completeShow) {
            const oldSlug = state.selectedShow?.slug;
            const newSlug = completeShow.slug;
            // console.log('🔵 [SeatSelectionStep] completeShow arrived:', {
            //     oldSlug,
            //     newSlug,
            //     slugChanged: newSlug !== oldSlug,
            //     currentFetchingSlug: fetchingSlugRef.current
            // });
            
            // Reset fetching ref when new complete show arrives to allow fresh fetch
            // This ensures we can fetch blocked seats even if component remounted
            if (newSlug !== oldSlug) {
                // console.log('🟡 [SeatSelectionStep] Slug changed, resetting fetchingSlugRef');
                fetchingSlugRef.current = null;
            }
            dispatch({ type: 'SET_SELECTED_SHOW', payload: completeShow });
        }
    }, [completeShow, state.selectedMinimalShow, state.selectedShow?.slug, dispatch]);

    // Handle loading state from useEventShow
    useEffect(() => {
        dispatch({ type: 'SET_LOADING', payload: isLoadingShow });
    }, [isLoadingShow, dispatch]);

    // Clear basket if it contains tickets from a different show
    useEffect(() => {
        if (state.selectedMinimalShow && state.basket.line_items.length > 0) {
            const ticketItems = state.basket.line_items.filter(item => item.type === 'ticket') as TicketLineItem[];

            // Check if any ticket in the basket is from a different show
            const hasTicketsFromDifferentShow = ticketItems.some(ticket =>
                ticket.show_id !== state.selectedMinimalShow!.id
            );

            if (hasTicketsFromDifferentShow) {
                // console.log('🧹 Clearing basket - tickets from different show detected');
                dispatch({ type: 'CLEAR_BASKET' });
                showNotification('Warenkorb wurde geleert - Sie können nur Tickets für eine Vorstellung gleichzeitig buchen.', 'info');
            }
        }
    }, [state.selectedMinimalShow?.id, dispatch, showNotification]);

    // Get seat groups from the selected show's pricing structure
    const seatGroups = state.selectedShow?.pricing_structure?.seat_groups || [];
    const isFreeSeatSelection = state.selectedShow?.free_seat_selection;

    // Reset view when a new show is selected
    useEffect(() => {
        if (state.selectedShow?.id) {
            if (isFreeSeatSelection) {
                setView('free');
            } else {
                // Reset to seat selection mode for regular shows
                setView('seat');
            }
        }
    }, [state.selectedShow?.id, isFreeSeatSelection]);


    // Helper functions for conflict detection and seat clearing
    const hasManualSeats = (): boolean => {
        const ticketItems = state.basket.line_items.filter(item => item.type === 'ticket') as TicketLineItem[];
        return ticketItems.some(ticket => ticket.seat.seat_number !== 'Bestplatz');
    };

    const hasBestplatzSeats = (): boolean => {
        const ticketItems = state.basket.line_items.filter(item => item.type === 'ticket') as TicketLineItem[];
        return ticketItems.some(ticket => ticket.seat.seat_number === 'Bestplatz');
    };

    const clearManualSeats = (): void => {
        const ticketItems = state.basket.line_items.filter(item => item.type === 'ticket') as TicketLineItem[];
        const manualSeatTickets = ticketItems.filter(ticket => ticket.seat.seat_number !== 'Bestplatz');

        manualSeatTickets.forEach(ticket => {
            dispatch({ type: 'REMOVE_LINE_ITEM', payload: ticket.id });
        });
    };

    const clearBestplatzSeats = (): void => {
        const ticketItems = state.basket.line_items.filter(item => item.type === 'ticket') as TicketLineItem[];
        const bestplatzTickets = ticketItems.filter(ticket => ticket.seat.seat_number === 'Bestplatz');

        bestplatzTickets.forEach(ticket => {
            dispatch({ type: 'REMOVE_LINE_ITEM', payload: ticket.id });
        });
    };

    // Handle confirmation dialog actions
    const handleConflictConfirm = () => {
        if (conflictDialog.pendingAction) {
            conflictDialog.pendingAction();
        }
        setConflictDialog({
            isOpen: false,
            conflictType: 'manual-to-bestplatz',
            pendingAction: null
        });
    };

    const handleConflictCancel = () => {
        setConflictDialog({
            isOpen: false,
            conflictType: 'manual-to-bestplatz',
            pendingAction: null
        });
    };

    // Load SVG content
    useEffect(() => {
        const loadSvg = async () => {
            try {
                setIsLoadingSvg(true);
                const response = await fetch('/seats.svg');
                const content = await response.text();
                setSvgContent(content);
            } catch (error) {
                console.error('Error loading SVG:', error);
            } finally {
                setIsLoadingSvg(false);
            }
        };

        loadSvg();
    }, []);

    // Load blocked seats and setup WebSocket when show is selected
    useEffect(() => {
        if (state.selectedShow && socket) {
            // console.log('🔌 SeatSelectionStep: Setting up WebSocket for show:', state.selectedShow.id);
            setupReservationListeners();

            // Join show room for real-time updates
            if (state.selectedShow?.id) {
                // console.log('📡 Emitting join-show event for show ID:', state.selectedShow.id);
                socket.emit('join-show', state.selectedShow.id);
            }

            return () => {
                // Leave show room and cleanup listeners
                if (state.selectedShow?.id) {
                    // console.log('📡 Emitting leave-show event for show ID:', state.selectedShow.id);
                    socket?.emit('leave-show', state.selectedShow.id);
                }
                cleanupReservationListeners();
            };
        }
    }, [state.selectedShow?.id, socket]); // Only depend on show ID, not the entire show object

    // Load blocked seats whenever the selected show's slug changes
    useEffect(() => {
        const slug = state.selectedShow?.slug;
        const minimalSlug = state.selectedMinimalShow?.slug;
        
        // console.log('🟢 [SeatSelectionStep] useEffect triggered for blocked seats:', {
        //     slug,
        //     minimalSlug,
        //     slugsMatch: slug === minimalSlug,
        //     currentFetchingSlug: fetchingSlugRef.current,
        //     willFetch: slug && slug === minimalSlug && fetchingSlugRef.current !== slug
        // });
        
        if (!slug) {
            // Reset tracking when slug becomes null/undefined
            // console.log('🟠 [SeatSelectionStep] No slug, resetting fetchingSlugRef');
            fetchingSlugRef.current = null;
            return;
        }

        // IMPORTANT: Only fetch if selectedShow slug matches selectedMinimalShow slug
        // This prevents fetching for stale shows when a new date is selected but completeShow hasn't loaded yet
        if (slug !== minimalSlug) {
            // console.log('⏭️ [SeatSelectionStep] Slug mismatch - waiting for completeShow to load:', {
            //     selectedShowSlug: slug,
            //     minimalShowSlug: minimalSlug
            // });
            return;
        }

        // Only fetch if this is a different slug than what's currently being fetched
        // This prevents duplicate requests when the component remounts or slug changes rapidly
        if (fetchingSlugRef.current === slug) {
            // Already fetching this slug, skip
            // console.log('⏭️ [SeatSelectionStep] Already fetching this slug, skipping:', slug);
            return;
        }

        // Fetch blocked seats for this slug
        // console.log('✅ [SeatSelectionStep] Calling loadBlockedSeats for slug:', slug);
        loadBlockedSeats(slug);
    }, [state.selectedShow?.slug, state.selectedMinimalShow?.slug]);

    const loadBlockedSeats = async (showSlug: string) => {
        if (!showSlug) {
            // console.log('⚠️ [SeatSelectionStep] No show slug for loading blocked seats');
            return;
        }

        // Mark this slug as being fetched
        const previousFetchingSlug = fetchingSlugRef.current;
        fetchingSlugRef.current = showSlug;
        // console.log('🔄 [SeatSelectionStep] loadBlockedSeats called:', {
        //     showSlug,
        //     previousFetchingSlug,
        //     newFetchingSlug: fetchingSlugRef.current,
        //     currentSelectedSlug: state.selectedShow?.slug
        // });

        try {
            // Increment token and capture for this fetch
            const fetchToken = ++latestBlockedFetchTokenRef.current;
            const blockedSeatIds = await getBlockedSeats(showSlug);
            // Ignore if a newer fetch has been initiated
            if (fetchToken !== latestBlockedFetchTokenRef.current) {
                // console.log('⏭️ Ignoring blocked seats due to newer fetch in-flight', { receivedFor: showSlug });
                // Reset ref if this was the last fetch for this slug
                if (fetchingSlugRef.current === showSlug) {
                    fetchingSlugRef.current = null;
                }
                return;
            }
            // console.log('📊 Blocked seats loaded:', {
            //     showSlug,
            //     blockedSeatCount: blockedSeatIds.length,
            //     blockedSeats: blockedSeatIds
            // });
            // If user switched shows while awaiting, ignore stale response
            if (state.selectedShow?.slug !== showSlug) {
                // console.log('⏭️ Ignoring blocked seats for stale show', {
                //     receivedFor: showSlug,
                //     currentShowSlug: state.selectedShow?.slug
                // });
                // Reset ref if this was the last fetch for this slug
                if (fetchingSlugRef.current === showSlug) {
                    fetchingSlugRef.current = null;
                }
                return;
            }
            dispatch({ type: 'SET_BLOCKED_SEATS', payload: blockedSeatIds });
            // Reset fetching ref only if this was the last fetch for this slug
            if (fetchingSlugRef.current === showSlug) {
                fetchingSlugRef.current = null;
            }
        } catch (error) {
            console.error('❌ Failed to load blocked seats:', error);
            // Reset fetching ref on error
            if (fetchingSlugRef.current === showSlug) {
                fetchingSlugRef.current = null;
            }
        }
    };

    const setupReservationListeners = () => {
        if (!socket) {
            // console.log('⚠️ SeatSelectionStep: No socket available for reservation listeners');
            return;
        }

        // console.log('🔌 SeatSelectionStep: Setting up reservation event listeners');
        // console.log('📡 Registering listener for reservation:created');
        socket.on('reservation:created', handleSeatsBlocked);
        // console.log('📡 Registering listener for reservation:expired');
        socket.on('reservation:expired', handleSeatsUnblocked);
        // console.log('📡 Registering listener for reservation:released');
        socket.on('reservation:released', handleSeatsUnblocked);

        // Log socket connection status
        // console.log('🔌 Socket connection status:', {
        //     connected: socket.connected,
        //     id: socket.id,
        //     isConnected: isConnected
        // });
    };

    const cleanupReservationListeners = () => {
        if (!socket) {
            // console.log('⚠️ SeatSelectionStep: No socket available for cleanup');
            return;
        }

        // console.log('🧹 SeatSelectionStep: Cleaning up reservation event listeners');
        // console.log('📡 Removing listener for reservation:created');
        socket.off('reservation:created', handleSeatsBlocked);
        // console.log('📡 Removing listener for reservation:expired');
        socket.off('reservation:expired', handleSeatsUnblocked);
        // console.log('📡 Removing listener for reservation:released');
        socket.off('reservation:released', handleSeatsUnblocked);

        // console.log('✅ SeatSelectionStep: WebSocket event listeners cleanup completed');
    };

    const handleSeatsBlocked = (data: WebSocketEvents['reservation:created']) => {
        // console.log('📡 WebSocket: reservation:created event received:', data);
        // console.log('📊 Event data details:', {
        //     showId: data?.showId,
        //     seatIds: data?.seatIds,
        //     sessionId: data?.sessionId,
        //     timestamp: data?.timestamp ? new Date(data.timestamp).toISOString() : 'N/A'
        // });

        // Ignore events from our own session
        if (data.sessionId === state.sessionId) {
            // console.log('🔇 Ignoring reservation event from own session:', data.sessionId);
            return;
        }

        if (data.showId === state.selectedShow?.id) {
            // console.log('✅ Event matches current show and is from another session, processing seat blocking');
            // Update seat availability immediately
            dispatch({ type: 'UPDATE_SEAT_AVAILABILITY', payload: { seatIds: data.seatIds, available: false } });

            // Remove from user's selection if they had selected these seats
            const userSelectedBlockedSeats = selectedSeatIds.filter(id => data.seatIds.includes(id));
            if (userSelectedBlockedSeats.length > 0) {
                // console.log('⚠️ User had selected seats that are now blocked by another session:', userSelectedBlockedSeats);
                dispatch({ type: 'REMOVE_SEATS_FROM_SELECTION', payload: userSelectedBlockedSeats });
                showNotification(`${userSelectedBlockedSeats.length} ${userSelectedBlockedSeats.length === 1 ? 'Sitzplatz' : 'Sitzplätze'} wurden gerade von einem anderen Benutzer reserviert und aus Ihrer Auswahl entfernt.`, 'warning', 1000000);
            } else {
                // console.log('✅ No user-selected seats were blocked');
            }
        } else {
            // console.log('❌ Event showId does not match current show:', {
            //     eventShowId: data.showId,
            //     currentShowId: state.selectedShow?.id
            // });
        }
    };

    const handleSeatsUnblocked = (data: WebSocketEvents['reservation:expired'] | WebSocketEvents['reservation:released']) => {
        // console.log('📡 WebSocket: reservation:expired/released event received:', data);
        // console.log('📊 Event data details:', {
        //     showId: data?.showId,
        //     seatIds: data?.seatIds,
        //     timestamp: data?.timestamp ? new Date(data.timestamp).toISOString() : 'N/A'
        // });

        if (data.showId === state.selectedShow?.id) {
            // console.log('✅ Event matches current show, processing seat unblocking');
            dispatch({ type: 'UPDATE_SEAT_AVAILABILITY', payload: { seatIds: data.seatIds, available: true } });
        } else {
            // console.log('❌ Event showId does not match current show:', {
            //     eventShowId: data.showId,
            //     currentShowId: state.selectedShow?.id
            // });
        }
    };

    // Move to basket by creating reservations
    const moveToBasket = async () => {
        if (!state.selectedShow) {
            showNotification('Keine Vorstellung ausgewählt', 'error');
            return;
        }

        // Separate Bestplatz tickets from regular seat selections
        const ticketItems = state.basket.line_items.filter(item => item.type === 'ticket') as TicketLineItem[];
        const bestplatzTickets = ticketItems.filter(ticket => ticket.seat.seat_number === 'Bestplatz');
        const regularSeatTickets = ticketItems.filter(ticket => ticket.seat.seat_number !== 'Bestplatz');

        if (ticketItems.length === 0) {
            showNotification('Bitte wählen Sie mindestens einen Platz aus', 'warning');
            return;
        }


        // GENERALIZED LINKED SEAT VALIDATION
        // Check if all seats with linked_seat_number have their linked seat in the basket
        const seatsWithLinkedSeats = regularSeatTickets.filter(ticket => ticket.seat.linked_seat_number);
        const seatIdsInBasket = new Set(regularSeatTickets.map(ticket => ticket.seat.seat_number));

        const missingLinkedSeats = seatsWithLinkedSeats.filter(ticket => {
            return !seatIdsInBasket.has(ticket.seat.linked_seat_number!.padStart(4, '0'));
        });

        if (missingLinkedSeats.length > 0) {
            const displayName = getSeatDisplayName(missingLinkedSeats[0].seat, state.language);

            const missingSeatsInfo = missingLinkedSeats.map(ticket => {
                const linkedSeatNumber = ticket.seat.linked_seat_number!;
                // TODO: if linked seat number is not a 4 digit string, add leading zeros
                const linkedSeatNumberWithZeros = linkedSeatNumber.padStart(4, '0');

                const linkedSeat = seatGroups.find(group => group.seats.some(seat => seat.seat_number === linkedSeatNumberWithZeros))?.seats.find(seat => seat.seat_number === linkedSeatNumberWithZeros);
                const linkedSeatDisplayName = getSeatDisplayName(linkedSeat!, state.language);


                return `${linkedSeatDisplayName}`;
            }).join(', ');

            const message = `Die ausgewählten Rollstuhlplätze können nur zusammen mit den unmittelbar danebenliegenden Plätzen auf der Tribüne gebucht werden.\n Fehlende Haupttribünen-Plätze: ${missingSeatsInfo}`;

            showNotification(message, 'warning', 1000000);
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        try {
            let seatReservations: SeatReservationRequestItem[] = [];

            // Handle regular seat selections (already have specific seats)
            seatReservations.push(...regularSeatTickets.map(ticket => ({
                seatId: ticket.seat.seat_number,
                priceId: ticket.price_category.id
            })));

            // Handle Bestplatz tickets (need seat allocation)
            if (bestplatzTickets.length > 0) {
                // console.log('🎯 Allocating seats for Bestplatz tickets:', bestplatzTickets.length);

                // Group Bestplatz tickets by seat group (price category doesn't matter for allocation)
                const ticketGroups = new Map<string, {
                    seatGroup: CompleteSeatGroup;
                    quantity: number;
                    tickets: TicketLineItem[];
                }>();

                bestplatzTickets.forEach(ticket => {
                    const groupKey = `${ticket.seat_group_id}`;
                    const seatGroup = seatGroups.find(sg => sg.id === ticket.seat_group_id);

                    if (!seatGroup) {
                        console.error('Seat group not found:', ticket.seat_group_id);
                        return;
                    }

                    if (!ticketGroups.has(groupKey)) {
                        ticketGroups.set(groupKey, {
                            seatGroup,
                            quantity: 0,
                            tickets: []
                        });
                    }

                    const group = ticketGroups.get(groupKey)!;
                    group.quantity++;
                    group.tickets.push(ticket);
                });

                // Allocate seats for each group
                // console.log('🎯 Allocating seats for Bestplatz tickets:', ticketGroups.size);
                // Combine globally blocked seats with reserved seats across all groups
                const reservedSeatIds = seatGroups.flatMap(g => (g.reservation_active && g.reserved_seats?.length ? g.reserved_seats : []));
                const combinedBlockedSeats = Array.from(new Set([...
                    state.blockedSeats,
                ...reservedSeatIds
                ]));
                const allocationResults = new Map<string, { success: boolean; allocatedSeats: string[]; message?: string }>();
                for (const [key, g] of ticketGroups.entries()) {
                    if (isFreeSeatSelection || view === 'free') {
                        // Use free mode allocation per group
                        const result = allocateSeatsFreeMode(g.seatGroup, g.quantity, combinedBlockedSeats);
                        allocationResults.set(key, result);
                        if (result.success) {
                            combinedBlockedSeats.push(...result.allocatedSeats);
                        }
                    } else {
                        // Use regular allocation
                        const resultMap = allocateSeatsForTickets([{ seatGroup: g.seatGroup, quantity: g.quantity }], combinedBlockedSeats);
                        const res = resultMap.get(`${g.seatGroup.id}`) || { success: false, allocatedSeats: [], message: 'Allocation failed' };
                        allocationResults.set(key, res);
                        if (res.success) {
                            combinedBlockedSeats.push(...res.allocatedSeats);
                        }
                    }
                }

                // Process allocation results
                let allocationSuccess = true;
                const allocatedSeatIds: string[] = [];

                for (const [groupKey, result] of allocationResults) {
                    if (!result.success) {
                        allocationSuccess = false;
                        showNotification(`Sitzplatz-Zuteilung fehlgeschlagen: ${result.message}`, 'error');
                        break;
                    }

                    allocatedSeatIds.push(...result.allocatedSeats);

                    // Update tickets with real seat assignments for all modes (including free).
                    const group = ticketGroups.get(groupKey)!;
                    group.tickets.forEach((ticket, index) => {
                        if (index < result.allocatedSeats.length) {
                            const allocatedSeatId = result.allocatedSeats[index];
                            const allocatedSeat = group.seatGroup.seats.find(s => s.seat_number === allocatedSeatId);

                            // console.log('🎯 Allocated seat:', allocatedSeatId);
                            if (allocatedSeat) {
                                const displayName = getSeatDisplayName(allocatedSeat, state.language);

                                dispatch({
                                    type: 'UPDATE_LINE_ITEM',
                                    payload: {
                                        id: ticket.id,
                                        item: {
                                            seat: allocatedSeat,
                                            name: `${group.seatGroup.name} - ${displayName}`
                                        }
                                    }
                                });
                            }
                        }
                    });

                    // Show allocation success message with different styling based on allocation quality
                    const gapCount = result.message?.includes('Abständen') || result.message?.includes('nicht nebeneinander') ? 'info' : 'success';
                    // showNotification(result.message || 'Plätze erfolgreich zugeteilt', gapCount as any);
                }

                if (!allocationSuccess) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                    return;
                }

                // Add allocated seats with their price categories to reservations
                for (const [groupKey, result] of allocationResults) {
                    if (result.success) {
                        const group = ticketGroups.get(groupKey)!;
                        // Add each allocated seat using the corresponding ticket's price category
                        result.allocatedSeats.forEach((seatId, idx) => {
                            const ticket = group.tickets[idx];
                            const priceId = ticket?.price_category.id;
                            if (priceId) {
                                seatReservations.push({ seatId, priceId });
                            }
                        });
                    }
                }

                // Show summary of allocated seats
                if (allocatedSeatIds.length > 0) {
                    // console.log('✅ Successfully allocated seats:', allocatedSeatIds);
                }
            }

            // Create reservations for all seats (regular + allocated Bestplatz)
            // console.log('🔒 Creating reservations for seats:', seatReservations);
            const response = await createReservations({
                showId: state.selectedShow.id,
                seatReservations: seatReservations,
                sessionId: state.sessionId,
            });

            // Store reservation data in context
            dispatch({ type: 'SET_RESERVATION_DATA', payload: response.data });

            // Move to basket step
            dispatch({ type: 'SET_STEP', payload: 'warenkorb' });

            showNotification('Plätze erfolgreich reserviert!', 'success');

        } catch (error: any) {
            console.error('Reservation error:', error);

            if (error.response?.status === 409) {
                // Conflict - some seats already reserved
                const errorMessage = error.response?.data?.message || 'Einige Plätze sind nicht mehr verfügbar';

                // Get current blocked seats directly from server
                const currentBlockedSeats = await (async () => {
                    try {
                        if (!state.selectedShow) return [];
                        const blockedSeatIds = await getBlockedSeats(state.selectedShow.slug);
                        // Update local state with fresh data
                        dispatch({ type: 'SET_BLOCKED_SEATS', payload: blockedSeatIds });
                        return blockedSeatIds;
                    } catch (error) {
                        console.error('Failed to fetch current blocked seats:', error);
                        return [];
                    }
                })();

                // Find which of our selected seats are actually blocked
                const conflictingSeats = selectedSeatIds.filter(seatId =>
                    currentBlockedSeats.includes(seatId)
                );

                if (conflictingSeats.length > 0) {
                    // Remove only the conflicting seats
                    dispatch({ type: 'REMOVE_SEATS_FROM_SELECTION', payload: conflictingSeats });
                    showNotification(
                        `${conflictingSeats.length} Platz/Plätze sind nicht mehr verfügbar und wurden aus Ihrer Auswahl entfernt. Sie können andere Plätze auswählen oder es erneut versuchen.`,
                        'warning'
                    );
                } else {
                    // No seats are actually blocked - might be a temporary server issue
                    showNotification('Temporärer Fehler beim Reservieren. Bitte versuchen Sie es erneut.', 'warning');
                }

            } else {
                showNotification('Fehler beim Reservieren der Plätze. Bitte versuchen Sie es erneut.', 'error');
            }
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    // Get selected seat IDs from basket
    const selectedSeatIds = state.basket.line_items
        .filter(item => item.type === 'ticket')
        .map(item => (item as TicketLineItem).seat.seat_number);

    // Handle seat click - opens modal if seat is available
    const handleSeatClick = (seatId: string, seatGroup: CompleteSeatGroup, seatInfo: SeatInfo) => {
        // Check if seat is blocked
        if (state.blockedSeats.includes(seatId)) {
            showNotification('Dieser Platz ist bereits reserviert oder gebucht', 'warning');
            return;
        }

        setModalState({
            isOpen: true,
            seat: seatInfo,
            seatGroup
        });
    };

    // Handle price category selection from modal
    const handlePriceCategorySelect = (seatId: string, seatGroup: CompleteSeatGroup, priceCategory: CompletePrice) => {
        if (!state.selectedShow) return;

        // Check if there are existing Bestplatzwahl seats that would conflict
        if (hasBestplatzSeats()) {
            // Show confirmation dialog
            const addManualSeat = () => {
                // Clear Bestplatzwahl seats first
                clearBestplatzSeats();
                // Then add the manual seat
                addTicketToBasket(seatId, seatGroup, priceCategory);
            };

            setConflictDialog({
                isOpen: true,
                conflictType: 'bestplatz-to-manual',
                pendingAction: addManualSeat
            });
            return;
        }

        // No conflict, add directly
        addTicketToBasket(seatId, seatGroup, priceCategory);
    };

    // Helper function to add ticket to basket
    const addTicketToBasket = (seatId: string, seatGroup: CompleteSeatGroup, priceCategory: CompletePrice) => {
        if (!state.selectedShow) return;

        // Find the seat in the group
        const seat = seatGroup.seats.find(s => s.seat_number === seatId);
        if (!seat) return;

        const seatDisplayName = isFreeSeatSelection
            ? `${seatGroup.name} - Freie Platzwahl`
            : getSeatDisplayNameWithSeatGroupName(seat, seatGroup.name, state.language);

        // Create ticket line item
        const ticketLineItem: TicketLineItem = {
            id: generateUUID(),
            type: 'ticket',
            quantity: 1,
            unit_price: parseFloat(priceCategory.price),
            total_price: parseFloat(priceCategory.price),
            currency: priceCategory.currency,
            vat_rate: priceCategory.vat_rate,
            name: seatDisplayName,
            show_id: state.selectedShow.id,
            show_date: state.selectedShow.date,
            show_time: state.selectedShow.show_time,
            seat: seat,
            seat_group_id: seatGroup.id,
            seat_group_name: seatGroup.name,
            price_category: priceCategory,
            free_seat_selection: isFreeSeatSelection
        };

        dispatch({ type: 'ADD_LINE_ITEM', payload: ticketLineItem });
    };

    const hasTicketPreShow = (ticketId: string) => {
        const preShowAddOns = state.basket.line_items.filter(item => item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW) as TicketAddOnLineItem[];
        return preShowAddOns.some(item => (item as TicketAddOnLineItem).ticket_line_item_id === ticketId);
    };

    const toggleTicketPreShow = (ticketId: string) => {
        // console.log(`🔄 toggleTicketPreShow called with ticketId: ${ticketId}`);

        if (hasTicketPreShow(ticketId)) {
            // Find the pre-show add-on for this ticket and remove it
            const preShowAddOn = state.basket.line_items.find(item =>
                item.type === 'crossselling' &&
                (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW &&
                (item as TicketAddOnLineItem).ticket_line_item_id === ticketId
            );
            if (preShowAddOn) {
                dispatch({ type: 'REMOVE_LINE_ITEM', payload: preShowAddOn.id });
            }
        } else {
            // Get all available pre-show products, filtered by link_key
            const ticketItem = state.basket.line_items.find(item => item.type === 'ticket' && item.id === ticketId) as TicketLineItem | undefined;
            const ticketPriceLinkKey = ticketItem?.price_category?.link_key;

            const preShowProductsAll = state.selectedShow?.cross_selling_products?.filter(product =>
                product.type_name === FrontendCrossSellingProductType.PRE_SHOW
            ) || [];

            const preShowProducts = preShowProductsAll.filter((product) => {
                const keys = product.link_keys || [];
                if (keys.length === 0) return true; // available for all
                if (!ticketPriceLinkKey) return false; // requires specific key
                return keys.includes(ticketPriceLinkKey);
            });

            if (preShowProducts.length === 0) return;

            if (preShowProducts.length === 1) {
                // Single variant - add directly
                const preShow = preShowProducts[0];
                const preShowAddOn: TicketAddOnLineItem = {
                    id: generateUUID(),
                    type: 'crossselling',
                    cross_selling_product_type: FrontendCrossSellingProductType.PRE_SHOW,
                    product_id: ticketId,
                    product: preShow,
                    ticket_line_item_id: ticketId,
                    quantity: 1,
                    unit_price: Number(preShow.price),
                    total_price: Number(preShow.price),
                    currency: preShow.currency || 'EUR',
                    vat_rate: preShow.vat_rate || 7,
                    name: preShow.name,
                    system_fee: preShow.system_fee,
                    system_fee_vat_rate: preShow.system_fee_vat_rate,
                    generate_qr_code: preShow.generate_qr_code,
                    is_refundable: preShow.is_refundable,
                };

                dispatch({ type: 'ADD_LINE_ITEM', payload: preShowAddOn });
            } else {
                // Multiple variants - show modal for selection
                setPreShowModalData({
                    isOpen: true,
                    ticketId: ticketId,
                    products: preShowProducts
                });
            }
        };
    };

    // Handle pre-show variant selection from modal
    const handlePreShowSelection = (selectedProduct: CrossSellingProductData) => {
        if (!preShowModalData.ticketId) return;

        // Guard: ensure the selected product is compatible with current ticket price link_key
        const ticketItem = state.basket.line_items.find(item => item.type === 'ticket' && item.id === preShowModalData.ticketId) as TicketLineItem | undefined;
        const ticketPriceLinkKey = ticketItem?.price_category?.link_key;
        const keys = selectedProduct.link_keys || [];
        const isCompatible = keys.length === 0 || (!!ticketPriceLinkKey && keys.includes(ticketPriceLinkKey));
        if (!isCompatible) {
            showNotification('Dieses Vorprogramm ist für diese Preiskategorie nicht verfügbar.', 'warning');
            setPreShowModalData({ isOpen: false, ticketId: null, products: [] });
            return;
        }

        const preShowAddOn: TicketAddOnLineItem = {
            id: generateUUID(),
            type: 'crossselling',
            cross_selling_product_type: FrontendCrossSellingProductType.PRE_SHOW,
            product_id: preShowModalData.ticketId,
            product: selectedProduct,
            ticket_line_item_id: preShowModalData.ticketId,
            quantity: 1,
            unit_price: Number(selectedProduct.price),
            total_price: Number(selectedProduct.price),
            currency: selectedProduct.currency || 'EUR',
            vat_rate: selectedProduct.vat_rate || 7,
            name: selectedProduct.name,
            system_fee: selectedProduct.system_fee,
            system_fee_vat_rate: selectedProduct.system_fee_vat_rate,
            generate_qr_code: selectedProduct.generate_qr_code,
            is_refundable: selectedProduct.is_refundable,
        };

        dispatch({ type: 'ADD_LINE_ITEM', payload: preShowAddOn });
        setPreShowModalData({ isOpen: false, ticketId: null, products: [] });
    };

    // Handle closing the pre-show modal
    const handleClosePreShowModal = () => {
        setPreShowModalData({ isOpen: false, ticketId: null, products: [] });
    };

    // Handle seat deselection
    const handleSeatDeselect = (seatId: string, seatInfo?: SeatInfo) => {
        // Find the line item for this seat and remove it
        const lineItem = state.basket.line_items.find(item =>
            item.type === 'ticket' &&
            (item as TicketLineItem).seat.seat_number === seatId
        );

        if (lineItem) {
            dispatch({ type: 'REMOVE_LINE_ITEM', payload: lineItem.id });
        }
    };

    // Handle removing specific line item by ID (for basket)
    const handleRemoveLineItem = (itemId: string) => {
        dispatch({ type: 'REMOVE_LINE_ITEM', payload: itemId });
    };

    // Handle removing all tickets of a specific group (for grouped Bestplatz tickets)
    const handleRemoveGroupedTickets = (seatGroupId: string, priceCategoryId: string) => {
        const ticketsToRemove = state.basket.line_items.filter(item => {
            if (item.type !== 'ticket') return false;
            const ticketItem = item as TicketLineItem;
            return ticketItem.seat_group_id === seatGroupId &&
                ticketItem.price_category.id === priceCategoryId &&
                ticketItem.seat.seat_number === 'Bestplatz';
        });

        ticketsToRemove.forEach(ticket => {
            dispatch({ type: 'REMOVE_LINE_ITEM', payload: ticket.id });
        });
    };

    // Handle changing price category for individual tickets
    const handlePriceCategoryChange = (ticketId: string, newPriceCategoryId: string) => {
        // Find the ticket line item
        const ticketItem = state.basket.line_items.find(item =>
            item.type === 'ticket' && item.id === ticketId
        ) as TicketLineItem | undefined;

        if (!ticketItem) {
            console.error('Ticket not found:', ticketId);
            return;
        }

        // Find the seat group to get the new price category
        const seatGroup = seatGroups.find(g => g.id === ticketItem.seat_group_id);
        if (!seatGroup) {
            console.error('Seat group not found for ticket:', ticketItem.seat_group_id);
            return;
        }

        // Find the new price category
        const newPriceCategory = seatGroup.prices.find(p => p.id === newPriceCategoryId);
        if (!newPriceCategory) {
            console.error('Price category not found:', newPriceCategoryId);
            return;
        }

        // Calculate new prices
        const newUnitPrice = parseFloat(newPriceCategory.price);
        const newTotalPrice = newUnitPrice * ticketItem.quantity;

        // Create updated name
        const seatDisplayName = getSeatDisplayName(ticketItem.seat, state.language);
        const newName = ticketItem.free_seat_selection
            ? `${ticketItem.seat_group_name} - Freie Platzwahl`
            : `${ticketItem.seat_group_name} - ${seatDisplayName}`;

        // Update the ticket line item
        dispatch({
            type: 'UPDATE_LINE_ITEM',
            payload: {
                id: ticketId,
                item: {
                    price_category: newPriceCategory,
                    unit_price: newUnitPrice,
                    total_price: newTotalPrice,
                    name: newName,
                    currency: newPriceCategory.currency,
                    vat_rate: newPriceCategory.vat_rate
                }
            }
        });

        // After updating, remove incompatible ticket add-ons (pre-show) for this ticket
        const ticketPriceLinkKey = newPriceCategory.link_key;
        state.basket.line_items.forEach(item => {
            if (item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW) {
                const addOn = item as TicketAddOnLineItem;
                if (addOn.ticket_line_item_id !== ticketId) return;
                const keys = addOn.product?.link_keys || [];
                const isCompatible = keys.length === 0 || (!!ticketPriceLinkKey && keys.includes(ticketPriceLinkKey));
                if (!isCompatible) {
                    dispatch({ type: 'REMOVE_LINE_ITEM', payload: addOn.id });
                }
            }
        });
    };

    // Group tickets for display
    const groupTicketsForDisplay = () => {
        const ticketItems = state.basket.line_items.filter(item => item.type === 'ticket') as TicketLineItem[];
        const grouped: { [key: string]: TicketLineItem[] } = {};
        const individual: TicketLineItem[] = [];

        ticketItems.forEach(ticket => {
            if (ticket.seat.seat_number === 'Bestplatz') {
                // Group Bestplatz tickets by seat group and price category
                const groupKey = `${ticket.seat_group_id}-${ticket.price_category.id}`;
                if (!grouped[groupKey]) {
                    grouped[groupKey] = [];
                }
                grouped[groupKey].push(ticket);
            } else {
                // Keep individual seat selections separate
                individual.push(ticket);
            }
        });

        return { grouped, individual };
    };

    // Calculate indicator position based on active tab
    const updateIndicatorPosition = () => {
        if (seatTabRef.current && groupTabRef.current) {
            const activeTab = view === 'seat' ? seatTabRef.current : groupTabRef.current;
            const rect = activeTab.getBoundingClientRect();
            const containerRect = seatTabRef.current.parentElement?.getBoundingClientRect();

            if (containerRect) {
                const left = rect.left - containerRect.left;
                const width = rect.width;
                setIndicatorStyle({ left, width });
            }
        }
    };

    // Update indicator position when view changes and on initial load or navigation
    useEffect(() => {
        updateIndicatorPosition();
    }, [view, state.selectedShow, state.currentStep]);

    // Recalculate indicator position on window resize to keep both bars aligned
    useEffect(() => {
        const handleResize = () => {
            updateIndicatorPosition();
        };

        window.addEventListener('resize', handleResize);
        // Initial call to ensure correct measurement after layout changes
        handleResize();
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [view, state.selectedShow, state.currentStep]);

    // Handle adding price category to basket (for accordion view)
    const handleAddPriceToBasket = (seatGroup: CompleteSeatGroup, priceCategory: CompletePrice, quantity: number) => {
        if (!state.selectedShow) return;

        // Check if there are existing manual seats that would conflict
        if (hasManualSeats()) {
            // Show confirmation dialog
            const addBestplatzTickets = () => {
                // Clear manual seats first
                clearManualSeats();
                // Then add the Bestplatzwahl tickets
                addBestplatzTicketsToBasket(seatGroup, priceCategory, quantity);
            };

            setConflictDialog({
                isOpen: true,
                conflictType: 'manual-to-bestplatz',
                pendingAction: addBestplatzTickets
            });
            return;
        }

        // No conflict, add directly
        addBestplatzTicketsToBasket(seatGroup, priceCategory, quantity);
    };

    // Helper function to add Bestplatzwahl tickets to basket
    const addBestplatzTicketsToBasket = (seatGroup: CompleteSeatGroup, priceCategory: CompletePrice, quantity: number) => {
        if (!state.selectedShow) return;

        // For best seat booking, we'll create generic tickets without specific seat numbers
        for (let i = 0; i < quantity; i++) {
            const ticketLineItem: TicketLineItem = {
                id: generateUUID(),
                type: 'ticket',
                quantity: 1,
                unit_price: parseFloat(priceCategory.price),
                total_price: parseFloat(priceCategory.price),
                currency: priceCategory.currency,
                vat_rate: priceCategory.vat_rate,
                name: isFreeSeatSelection ? `${seatGroup.name} - Freie Platzwahl` : `${seatGroup.name} - ${priceCategory.category_name}`,
                show_id: state.selectedShow.id,
                show_date: state.selectedShow.date,
                show_time: state.selectedShow.show_time,
                seat: {
                    id: generateUUID(),
                    seat_number: 'Bestplatz', // Generic seat for group booking
                    seat_row: "Bestplatz",
                    seat_row_number: -1,
                    type: "bestplatz",
                },
                seat_group_id: seatGroup.id,
                seat_group_name: seatGroup.name,
                price_category: priceCategory,
                free_seat_selection: isFreeSeatSelection,
                best_seat_origin: true
            };

            dispatch({ type: 'ADD_LINE_ITEM', payload: ticketLineItem });
        }
    };


    if (isLoadingSvg || isLoadingShow) {
        return (
            <LoadingSpinner />
        );
    }

    const series = state.initData?.availableSeries ?? [];
    const selectedSeries: EventSeriesData | undefined = series.find(s => s.id === state.selectedShow?.series_id);

    if (!state.selectedShow?.bookable_by?.includes('main-organizer')) {
        return (
            <div className="">
                {
                    !isFreeSeatSelection ? (
                        <TitleText subtitle={selectedSeries?.subtitle} title={`<h1>${state.selectedShow?.name.split("-")[0].split("»")[0]} <span class="!font-normal">${state.selectedShow?.name.split("2026 ")[1].replace("2026", "")}</span></h1>`} text={text} />
                    ) : (
                        <TitleText subtitle={selectedSeries?.subtitle} title={`<h1>${state.selectedShow?.name}</h1>`} text={text} />
                    )
                }
                <section className={`max-w-screen-2xl mx-auto w-full px-6 md:px-16 xl:px-20`}>
                    <div className="text-center py-12">
                        <div className="text-gray-500 mb-4">
                            Verkauf nicht verfügbar
                        </div>
                        <div className="text-sm text-gray-400">
                            Aktuell ist es nicht möglich Karten für diese Vorstellung zu buchen. Bitte kommen Sie zu einem späteren Zeitpunkt wieder.
                        </div>
                    </div>
                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <MainButton
                            handleClick={goToPreviousStep}
                            style='secondary'
                            size='small'
                            label='Zurück'
                            disabled={!canGoToPreviousStep()}
                        />
                    </div>
                </section>
            </div>
        );
    }

    // Check if presale has started - if not, show message and prevent booking
    if (state.selectedShow && !isPresaleStarted(state.selectedShow)) {
        const presaleStartDate = getPresaleStartDate(state.selectedShow, state.language);
        const timeUntilPresale = getTimeUntilPresale(state.selectedShow);
        const isGerman = state.language === 'de';

        return (
            <div className="">
                {
                    !isFreeSeatSelection ? (
                        <TitleText subtitle={selectedSeries?.subtitle} title={`<h1>${state.selectedShow?.name.split("-")[0].split("»")[0]} <span class="!font-normal">${state.selectedShow?.name.split("2026 ")[1].replace("2026", "")}</span></h1>`} text={text} />
                    ) : (
                        <TitleText subtitle={selectedSeries?.subtitle} title={`<h1>${state.selectedShow?.name}</h1>`} text={text} />
                    )
                }
                <section className={`max-w-screen-2xl mx-auto w-full px-6 md:px-16 xl:px-20`}>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h2 className="text-lg font-medium text-blue-900 mb-2">
                                    {isGerman ? 'Vorverkauf noch nicht gestartet' : 'Presale not yet started'}
                                </h2>
                                <div className="text-blue-800">
                                    <p className="mb-2">
                                        {isGerman
                                            ? `Der Vorverkauf für diese Vorstellung beginnt am ${presaleStartDate}.`
                                            : `Presale for this show starts on ${presaleStartDate}.`
                                        }
                                    </p>
                                    {timeUntilPresale && (
                                        <div className="text-sm">
                                            {isGerman ? (
                                                <p>
                                                    Noch {timeUntilPresale.days > 0 && `${timeUntilPresale.days} Tag${timeUntilPresale.days !== 1 ? 'e' : ''} `}
                                                    {timeUntilPresale.hours > 0 && `${timeUntilPresale.hours} Stunde${timeUntilPresale.hours !== 1 ? 'n' : ''} `}
                                                    {timeUntilPresale.minutes > 0 && `${timeUntilPresale.minutes} Minute${timeUntilPresale.minutes !== 1 ? 'n' : ''}`}
                                                    {timeUntilPresale.days === 0 && timeUntilPresale.hours === 0 && timeUntilPresale.minutes === 0 && 'weniger als eine Minute'}
                                                </p>
                                            ) : (
                                                <p>
                                                    {timeUntilPresale.days > 0 && `${timeUntilPresale.days} day${timeUntilPresale.days !== 1 ? 's' : ''} `}
                                                    {timeUntilPresale.hours > 0 && `${timeUntilPresale.hours} hour${timeUntilPresale.hours !== 1 ? 's' : ''} `}
                                                    {timeUntilPresale.minutes > 0 && `${timeUntilPresale.minutes} minute${timeUntilPresale.minutes !== 1 ? 's' : ''}`}
                                                    {timeUntilPresale.days === 0 && timeUntilPresale.hours === 0 && timeUntilPresale.minutes === 0 && 'less than a minute'}
                                                    remaining
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <MainButton
                            handleClick={goToPreviousStep}
                            disabled={!canGoToPreviousStep()}
                            label="Zurück"
                            style='secondary'
                            className='w-[150px]'
                            size='small'
                        />
                    </div>
                </section>
            </div>
        );
    }

    // Check if pricing structure is available
    if (!state.selectedShow?.pricing_structure?.seat_groups || seatGroups.length === 0) {
        return (
            <div className="">
                {
                    !isFreeSeatSelection ? (
                        <TitleText subtitle={selectedSeries?.subtitle} title={`<h1>${state.selectedShow?.name.split("-")[0].split("»")[0]} <span class="!font-normal">${state.selectedShow?.name.split("2026 ")[1].replace("2026", "")}</span></h1>`} text={text} />
                    ) : (
                        <TitleText subtitle={selectedSeries?.subtitle} title={`<h1>${state.selectedShow?.name}</h1>`} text={text} />
                    )
                }
                <section className={`max-w-screen-2xl mx-auto w-full px-6 md:px-16 xl:px-20`}>
                    <div className="text-center py-12">
                        <div className="text-gray-500 mb-4">
                            Lade Preisstruktur...
                        </div>
                        <div className="text-sm text-gray-400">
                            Bitte warten Sie, während die Sitzplatzinformationen geladen werden.
                        </div>
                    </div>
                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={goToPreviousStep}
                            disabled={!canGoToPreviousStep()}
                            className={`
                            px-6 py-2 rounded-md font-medium
                            ${canGoToPreviousStep()
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }
                        `}
                        >
                            Zurück
                        </button>
                        <button
                            onClick={goToNextStep}
                            disabled={true}
                            className="px-6 py-2 rounded-md font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
                        >
                            Weiter
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="">
            {
                !isFreeSeatSelection ? (
                    <TitleText subtitle={selectedSeries?.subtitle} title={`<h1>${state.selectedShow?.name.split("-")[0].split("»")[0]} <span class="!font-normal">${state.selectedShow?.name.split("2026 ")[1].replace("2026", "")}</span></h1>`} text={text} />
                ) : (
                    <TitleText subtitle={selectedSeries?.subtitle} title={`<h1>${state.selectedShow?.name}</h1>`} text={text} />
                )
            }
            <section className={`w-full`}>
                <div className='max-w-screen-2xl mx-auto px-6 md:px-16 xl:px-20'>
                    {/* Tab Interface - Hidden on mobile or when free seat selection is enabled */}
                    {isFreeSeatSelection ? (
                        <div className="">
                            <div className="mb-4 lg:mb-8 lg:pt-8 text-lg lg:text-xl 2xl:text-2xl font-medium">
                                Sitzplätze auswählen
                            </div>
                        </div>
                    ) : (
                        <div className={`relative flex justify-start mb-12 lg:pt-8 text-lg lg:text-xl 2xl:text-2xl font-medium ${isMobileOrTablet ? 'hidden' : ''}`}>
                            <div className="relative flex gap-8 lg:gap-16">
                                <button
                                    ref={seatTabRef}
                                    onClick={() => setView('seat')}
                                    className={`relative px-0 py-2 lg:py-4 text-black transition-colors duration-200 ${view === 'seat' ? 'text-darkBlue' : 'hover:text-gray-700'
                                        }`}
                                >
                                    Sitzplatzwahl
                                </button>
                                <button
                                    ref={groupTabRef}
                                    onClick={() => setView('group')}
                                    className={`relative px-0 py-2 lg:py-4 text-black transition-colors duration-200 ${view === 'group' ? 'text-darkBlue' : 'hover:text-gray-700'
                                        }`}
                                >
                                    Bestplatzwahl
                                </button>
                                <a 
                                    href="/de/barrierefreiheit"
                                    target="_blank"
                                    className="group relative px-0 py-2 lg:py-4 text-black transition-colors duration-200 hover:text-gray-700"
                                    aria-label="Barrierfreie Buchung - Weitere Informationen zur barrierefreien Buchung"
                                    title="Hinweise für barrierefreie Buchung"
                                >
                                    <span className="sr-only">Hinweise für barrierefreie Buchung</span>
                                    <svg className="block group-hover:hidden" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <rect x="0.85" y="0.85" width="33.9994" height="33.9994" rx="16.9997" stroke="#19263D" stroke-width="1.7"/>
                                        <path d="M17.9825 22.2263L17.9865 22.232L15.6026 28.819C15.5439 28.9842 15.4529 29.136 15.3348 29.2655C15.2167 29.3951 15.0739 29.4998 14.9148 29.5734C14.6758 29.6854 14.409 29.724 14.1481 29.6842C13.8871 29.6445 13.6439 29.5281 13.4492 29.3499C13.2545 29.1718 13.117 28.9398 13.0543 28.6834C12.9915 28.4271 13.0063 28.1579 13.0967 27.9099L14.7602 23.3033C14.8922 22.9567 14.9965 22.6001 15.0721 22.2369C15.1393 21.8682 15.1874 21.4963 15.2161 21.1226C15.28 20.4482 15.3253 19.7177 15.36 19.0166C15.3947 18.3155 15.4187 17.6357 15.4373 17.0732C15.4613 16.3721 15.272 16.3267 14.7095 16.1934L14.5922 16.1668L9.79369 15.2631C9.62111 15.2326 9.45622 15.1684 9.30847 15.0742C9.16072 14.98 9.033 14.8575 8.93262 14.7139C8.78349 14.4963 8.7023 14.2393 8.6993 13.9755C8.69631 13.7117 8.77166 13.453 8.91581 13.232C9.05997 13.0111 9.26643 12.8379 9.50908 12.7344C9.75172 12.6309 10.0196 12.6017 10.2789 12.6505L15.4347 13.6182C15.6048 13.6337 15.7713 13.6528 15.9433 13.6726C15.9788 13.6767 16.0145 13.6808 16.0505 13.6849C16.6849 13.7718 17.3242 13.819 17.9646 13.8262C18.7617 13.8106 19.5573 13.751 20.3478 13.6475C20.4308 13.6383 20.5122 13.6288 20.5926 13.6194C20.7445 13.6016 20.8927 13.5842 21.041 13.5702L25.9061 12.6585C26.2513 12.5869 26.6107 12.655 26.9058 12.8478C27.0521 12.9467 27.1772 13.0738 27.274 13.2215C27.3707 13.3693 27.4371 13.5347 27.4694 13.7084C27.5016 13.882 27.4991 14.0603 27.4618 14.2329C27.4246 14.4055 27.3534 14.569 27.2524 14.7139C27.1534 14.8584 27.0268 14.9821 26.88 15.0777C26.7332 15.1733 26.5689 15.239 26.3967 15.2711L21.7474 16.1455C21.5928 16.1801 21.4542 16.2041 21.3315 16.2228C20.8463 16.3054 20.6064 16.3481 20.6357 17.0385C20.6571 17.5424 20.7184 18.1449 20.7984 18.774C20.8917 19.5124 21.0143 20.2962 21.1423 21.0133C21.2249 21.4852 21.3022 21.8637 21.4088 22.2263C21.4225 22.2726 21.4361 22.3191 21.4497 22.3658C21.543 22.6848 21.6399 23.0163 21.7794 23.4046L23.4082 27.9099C23.4987 28.1579 23.5134 28.4271 23.4507 28.6834C23.3879 28.9398 23.2505 29.1718 23.0557 29.3499C22.861 29.5281 22.6178 29.6445 22.3569 29.6842C22.0959 29.724 21.8291 29.6854 21.5901 29.5734C21.431 29.4998 21.2882 29.3951 21.1701 29.2655C21.052 29.136 20.961 28.9842 20.9023 28.819L18.516 22.2606C18.5109 22.2466 18.5048 22.233 18.4977 22.22L18.3759 21.9971C18.3175 21.8903 18.1645 21.8894 18.1049 21.9955L17.9788 22.2199L17.9825 22.2263Z" fill="#19263D"/>
                                        <path d="M18.1104 12.767C19.5097 12.767 20.6442 11.6326 20.6442 10.2332C20.6442 8.83387 19.5097 7.69946 18.1104 7.69946C16.711 7.69946 15.5766 8.83387 15.5766 10.2332C15.5766 11.6326 16.711 12.767 18.1104 12.767Z" fill="#19263D"/>
                                    </svg>

                                    <svg className="hidden group-hover:block" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <rect x="0.85" y="0.85" width="33.9994" height="33.9994" rx="16.9997" fill="#19263D" stroke="#19263D" stroke-width="1.7"/>
                                        <path d="M17.9825 22.2263L17.9865 22.232L15.6026 28.819C15.5439 28.9842 15.4529 29.136 15.3348 29.2655C15.2167 29.3951 15.0739 29.4998 14.9148 29.5734C14.6758 29.6854 14.409 29.724 14.1481 29.6842C13.8871 29.6445 13.6439 29.5281 13.4492 29.3499C13.2545 29.1718 13.117 28.9398 13.0543 28.6834C12.9915 28.4271 13.0063 28.1579 13.0967 27.9099L14.7602 23.3033C14.8922 22.9567 14.9965 22.6001 15.0721 22.2369C15.1393 21.8682 15.1874 21.4963 15.2161 21.1226C15.28 20.4482 15.3253 19.7177 15.36 19.0166C15.3947 18.3155 15.4187 17.6357 15.4373 17.0732C15.4613 16.3721 15.272 16.3267 14.7095 16.1934L14.5922 16.1668L9.79369 15.2631C9.62111 15.2326 9.45622 15.1684 9.30847 15.0742C9.16072 14.98 9.033 14.8575 8.93262 14.7139C8.78349 14.4963 8.7023 14.2393 8.6993 13.9755C8.69631 13.7117 8.77166 13.453 8.91581 13.232C9.05997 13.0111 9.26643 12.8379 9.50908 12.7344C9.75172 12.6309 10.0196 12.6017 10.2789 12.6505L15.4347 13.6182C15.6048 13.6337 15.7713 13.6528 15.9433 13.6726C15.9788 13.6767 16.0145 13.6808 16.0505 13.6849C16.6849 13.7718 17.3242 13.819 17.9646 13.8262C18.7617 13.8106 19.5573 13.751 20.3478 13.6475C20.4308 13.6383 20.5122 13.6288 20.5926 13.6194C20.7445 13.6016 20.8927 13.5842 21.041 13.5702L25.9061 12.6585C26.2513 12.5869 26.6107 12.655 26.9058 12.8478C27.0521 12.9467 27.1772 13.0738 27.274 13.2215C27.3707 13.3693 27.4371 13.5347 27.4694 13.7084C27.5016 13.882 27.4991 14.0603 27.4618 14.2329C27.4246 14.4055 27.3534 14.569 27.2524 14.7139C27.1534 14.8584 27.0268 14.9821 26.88 15.0777C26.7332 15.1733 26.5689 15.239 26.3967 15.2711L21.7474 16.1455C21.5928 16.1801 21.4542 16.2041 21.3315 16.2228C20.8463 16.3054 20.6064 16.3481 20.6357 17.0385C20.6571 17.5424 20.7184 18.1449 20.7984 18.774C20.8917 19.5124 21.0143 20.2962 21.1423 21.0133C21.2249 21.4852 21.3022 21.8637 21.4088 22.2263C21.4225 22.2726 21.4361 22.3191 21.4497 22.3658C21.543 22.6848 21.6399 23.0163 21.7794 23.4046L23.4082 27.9099C23.4987 28.1579 23.5134 28.4271 23.4507 28.6834C23.3879 28.9398 23.2505 29.1718 23.0557 29.3499C22.861 29.5281 22.6178 29.6445 22.3569 29.6842C22.0959 29.724 21.8291 29.6854 21.5901 29.5734C21.431 29.4998 21.2882 29.3951 21.1701 29.2655C21.052 29.136 20.961 28.9842 20.9023 28.819L18.516 22.2606C18.5109 22.2466 18.5048 22.233 18.4977 22.22L18.3759 21.9971C18.3175 21.8903 18.1645 21.8894 18.1049 21.9955L17.9788 22.2199L17.9825 22.2263Z" fill="white"/>
                                        <path d="M18.1104 12.767C19.5097 12.767 20.6442 11.6326 20.6442 10.2332C20.6442 8.83387 19.5097 7.69946 18.1104 7.69946C16.711 7.69946 15.5766 8.83387 15.5766 10.2332C15.5766 11.6326 16.711 12.767 18.1104 12.767Z" fill="white"/>
                                    </svg>
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    Hinweise für barrierefreie Buchung
                                        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                                    </span>
                                </a>

                                {/* Single sliding indicator bar */}
                                <div
                                    className="absolute bottom-2 h-0.5 bg-darkBlue transition-all duration-300 ease-in-out"
                                    style={{
                                        left: `${indicatorStyle.left}px`,
                                        width: `${indicatorStyle.width}px`
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className={`max-w-[2000px] bg-[#ECEAE6] mx-auto w-full ${isMobileOrTablet ? 'relative' : ''}`}>
                    {isMobileOrTablet ? (
                        // Mobile Layout
                        <div className={`relative w-full overflow-x-hidden`}>
                            {/* Mobile Tab Interface - hidden when free seat selection is enabled */}
                            {!isFreeSeatSelection && (
                                <div className="px-6 py-4 bg-white border-b border-gray-200">
                                    <div className="relative flex gap-8 lg:gap-16">
                                        <button
                                            ref={seatTabRef}
                                            onClick={() => setView('seat')}
                                            className={`relative px-0 py-2 lg:py-4 text-black transition-colors duration-200 ${view === 'seat' ? 'text-darkBlue' : 'hover:text-gray-700'
                                                }`}
                                        >
                                            Sitzplatzwahl
                                        </button>
                                        <button
                                            ref={groupTabRef}
                                            onClick={() => setView('group')}
                                            className={`relative px-0 py-2 lg:py-4 text-black transition-colors duration-200 ${view === 'group' ? 'text-darkBlue' : 'hover:text-gray-700'
                                                }`}
                                        >
                                            Bestplatzwahl
                                        </button>
                                        <a 
                                    href="/de/barrierefreiheit"
                                    target="_blank"
                                    className="group relative px-0 py-2 lg:py-4 text-black transition-colors duration-200 hover:text-gray-700"
                                    aria-label="Barrierfreie Buchung - Weitere Informationen zur barrierefreien Buchung"
                                    title="Hinweise für barrierefreie Buchung"
                                >
                                    <span className="sr-only">Hinweise für barrierefreie Buchung</span>
                                    <svg className="block group-hover:hidden" width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <rect x="0.85" y="0.85" width="33.9994" height="33.9994" rx="16.9997" stroke="#19263D" stroke-width="1.7"/>
                                        <path d="M17.9825 22.2263L17.9865 22.232L15.6026 28.819C15.5439 28.9842 15.4529 29.136 15.3348 29.2655C15.2167 29.3951 15.0739 29.4998 14.9148 29.5734C14.6758 29.6854 14.409 29.724 14.1481 29.6842C13.8871 29.6445 13.6439 29.5281 13.4492 29.3499C13.2545 29.1718 13.117 28.9398 13.0543 28.6834C12.9915 28.4271 13.0063 28.1579 13.0967 27.9099L14.7602 23.3033C14.8922 22.9567 14.9965 22.6001 15.0721 22.2369C15.1393 21.8682 15.1874 21.4963 15.2161 21.1226C15.28 20.4482 15.3253 19.7177 15.36 19.0166C15.3947 18.3155 15.4187 17.6357 15.4373 17.0732C15.4613 16.3721 15.272 16.3267 14.7095 16.1934L14.5922 16.1668L9.79369 15.2631C9.62111 15.2326 9.45622 15.1684 9.30847 15.0742C9.16072 14.98 9.033 14.8575 8.93262 14.7139C8.78349 14.4963 8.7023 14.2393 8.6993 13.9755C8.69631 13.7117 8.77166 13.453 8.91581 13.232C9.05997 13.0111 9.26643 12.8379 9.50908 12.7344C9.75172 12.6309 10.0196 12.6017 10.2789 12.6505L15.4347 13.6182C15.6048 13.6337 15.7713 13.6528 15.9433 13.6726C15.9788 13.6767 16.0145 13.6808 16.0505 13.6849C16.6849 13.7718 17.3242 13.819 17.9646 13.8262C18.7617 13.8106 19.5573 13.751 20.3478 13.6475C20.4308 13.6383 20.5122 13.6288 20.5926 13.6194C20.7445 13.6016 20.8927 13.5842 21.041 13.5702L25.9061 12.6585C26.2513 12.5869 26.6107 12.655 26.9058 12.8478C27.0521 12.9467 27.1772 13.0738 27.274 13.2215C27.3707 13.3693 27.4371 13.5347 27.4694 13.7084C27.5016 13.882 27.4991 14.0603 27.4618 14.2329C27.4246 14.4055 27.3534 14.569 27.2524 14.7139C27.1534 14.8584 27.0268 14.9821 26.88 15.0777C26.7332 15.1733 26.5689 15.239 26.3967 15.2711L21.7474 16.1455C21.5928 16.1801 21.4542 16.2041 21.3315 16.2228C20.8463 16.3054 20.6064 16.3481 20.6357 17.0385C20.6571 17.5424 20.7184 18.1449 20.7984 18.774C20.8917 19.5124 21.0143 20.2962 21.1423 21.0133C21.2249 21.4852 21.3022 21.8637 21.4088 22.2263C21.4225 22.2726 21.4361 22.3191 21.4497 22.3658C21.543 22.6848 21.6399 23.0163 21.7794 23.4046L23.4082 27.9099C23.4987 28.1579 23.5134 28.4271 23.4507 28.6834C23.3879 28.9398 23.2505 29.1718 23.0557 29.3499C22.861 29.5281 22.6178 29.6445 22.3569 29.6842C22.0959 29.724 21.8291 29.6854 21.5901 29.5734C21.431 29.4998 21.2882 29.3951 21.1701 29.2655C21.052 29.136 20.961 28.9842 20.9023 28.819L18.516 22.2606C18.5109 22.2466 18.5048 22.233 18.4977 22.22L18.3759 21.9971C18.3175 21.8903 18.1645 21.8894 18.1049 21.9955L17.9788 22.2199L17.9825 22.2263Z" fill="#19263D"/>
                                        <path d="M18.1104 12.767C19.5097 12.767 20.6442 11.6326 20.6442 10.2332C20.6442 8.83387 19.5097 7.69946 18.1104 7.69946C16.711 7.69946 15.5766 8.83387 15.5766 10.2332C15.5766 11.6326 16.711 12.767 18.1104 12.767Z" fill="#19263D"/>
                                    </svg>

                                    <svg className="hidden group-hover:block" width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <rect x="0.85" y="0.85" width="33.9994" height="33.9994" rx="16.9997" fill="#19263D" stroke="#19263D" stroke-width="1.7"/>
                                        <path d="M17.9825 22.2263L17.9865 22.232L15.6026 28.819C15.5439 28.9842 15.4529 29.136 15.3348 29.2655C15.2167 29.3951 15.0739 29.4998 14.9148 29.5734C14.6758 29.6854 14.409 29.724 14.1481 29.6842C13.8871 29.6445 13.6439 29.5281 13.4492 29.3499C13.2545 29.1718 13.117 28.9398 13.0543 28.6834C12.9915 28.4271 13.0063 28.1579 13.0967 27.9099L14.7602 23.3033C14.8922 22.9567 14.9965 22.6001 15.0721 22.2369C15.1393 21.8682 15.1874 21.4963 15.2161 21.1226C15.28 20.4482 15.3253 19.7177 15.36 19.0166C15.3947 18.3155 15.4187 17.6357 15.4373 17.0732C15.4613 16.3721 15.272 16.3267 14.7095 16.1934L14.5922 16.1668L9.79369 15.2631C9.62111 15.2326 9.45622 15.1684 9.30847 15.0742C9.16072 14.98 9.033 14.8575 8.93262 14.7139C8.78349 14.4963 8.7023 14.2393 8.6993 13.9755C8.69631 13.7117 8.77166 13.453 8.91581 13.232C9.05997 13.0111 9.26643 12.8379 9.50908 12.7344C9.75172 12.6309 10.0196 12.6017 10.2789 12.6505L15.4347 13.6182C15.6048 13.6337 15.7713 13.6528 15.9433 13.6726C15.9788 13.6767 16.0145 13.6808 16.0505 13.6849C16.6849 13.7718 17.3242 13.819 17.9646 13.8262C18.7617 13.8106 19.5573 13.751 20.3478 13.6475C20.4308 13.6383 20.5122 13.6288 20.5926 13.6194C20.7445 13.6016 20.8927 13.5842 21.041 13.5702L25.9061 12.6585C26.2513 12.5869 26.6107 12.655 26.9058 12.8478C27.0521 12.9467 27.1772 13.0738 27.274 13.2215C27.3707 13.3693 27.4371 13.5347 27.4694 13.7084C27.5016 13.882 27.4991 14.0603 27.4618 14.2329C27.4246 14.4055 27.3534 14.569 27.2524 14.7139C27.1534 14.8584 27.0268 14.9821 26.88 15.0777C26.7332 15.1733 26.5689 15.239 26.3967 15.2711L21.7474 16.1455C21.5928 16.1801 21.4542 16.2041 21.3315 16.2228C20.8463 16.3054 20.6064 16.3481 20.6357 17.0385C20.6571 17.5424 20.7184 18.1449 20.7984 18.774C20.8917 19.5124 21.0143 20.2962 21.1423 21.0133C21.2249 21.4852 21.3022 21.8637 21.4088 22.2263C21.4225 22.2726 21.4361 22.3191 21.4497 22.3658C21.543 22.6848 21.6399 23.0163 21.7794 23.4046L23.4082 27.9099C23.4987 28.1579 23.5134 28.4271 23.4507 28.6834C23.3879 28.9398 23.2505 29.1718 23.0557 29.3499C22.861 29.5281 22.6178 29.6445 22.3569 29.6842C22.0959 29.724 21.8291 29.6854 21.5901 29.5734C21.431 29.4998 21.2882 29.3951 21.1701 29.2655C21.052 29.136 20.961 28.9842 20.9023 28.819L18.516 22.2606C18.5109 22.2466 18.5048 22.233 18.4977 22.22L18.3759 21.9971C18.3175 21.8903 18.1645 21.8894 18.1049 21.9955L17.9788 22.2199L17.9825 22.2263Z" fill="white"/>
                                        <path d="M18.1104 12.767C19.5097 12.767 20.6442 11.6326 20.6442 10.2332C20.6442 8.83387 19.5097 7.69946 18.1104 7.69946C16.711 7.69946 15.5766 8.83387 15.5766 10.2332C15.5766 11.6326 16.711 12.767 18.1104 12.767Z" fill="white"/>
                                    </svg>
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    Hinweise für barrierefreie Buchung
                                        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                                    </span>
                                </a>
                                        {/* Single sliding indicator bar */}
                                        <div
                                            className="absolute bottom-0 h-0.5 bg-darkBlue transition-all duration-300 ease-in-out"
                                            style={{
                                                left: `${indicatorStyle.left}px`,
                                                width: `${indicatorStyle.width}px`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Full-width seat plan for mobile */}
                            <div ref={mobileViewerContainerRef} className={`w-full bg-stone relative ${(!isFreeSeatSelection && view === 'seat') ? `${isTablet ? 'h-[800px]' : 'h-[460px]'}` : `${isTablet ? 'h-[800px]' : 'h-[460px]'}`}`}>
                                {(!isFreeSeatSelection && view === "seat") ? (
                                    <div className="h-full w-full">
                                        <SeatPlanViewerMobile
                                            ref={mobileViewerRef}
                                            svgContent={svgContent}
                                            seatGroups={seatGroups}
                                            selectedSeats={selectedSeatIds}
                                            blockedSeats={state.blockedSeats}
                                            isWheelchairMode={isWheelchairMode}
                                            onSeatClick={handleSeatClick}
                                            onSeatDeselect={handleSeatDeselect}
                                            className="h-full"
                                        />
                                    </div>
                                ) : (
                                    <SeatGroupAccordion
                                        seatGroups={isFreeSeatSelection ? seatGroups : seatGroups.filter(group => !group.name.toLocaleLowerCase().includes("rollstuhl"))}
                                        onAddToBasket={handleAddPriceToBasket}
                                        blockedSeats={state.blockedSeats}
                                    />
                                )}

                                {/* Mobile video overlay over the seat viewer area only (keeps bottom basket panel on top) */}
                                {isVideoPlaying && (
                                    <div className="absolute inset-0 z-10">
                                        <video
                                            className="w-full h-full object-cover"
                                            autoPlay
                                            muted
                                            playsInline
                                            loop
                                            preload="none"
                                            src="/videos/drohnenvideo_desktop.mp4"
                                        />
                                        <button
                                            onClick={() => setIsVideoPlaying(false)}
                                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow"
                                            aria-label="Video schließen"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M14.7402 1L1.00053 14.7397" stroke="black" strokeWidth="1" strokeLinecap="round" />
                                                <path d="M14.9961 14.9941L1.25639 1.25438" stroke="black" strokeWidth="1" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Mobile bottom panel will be added here */}

                        </div>
                    ) : (
                        // Desktop Layout (original)
                        <div className='flex w-full relative'>
                            <div className={`w-2/3 bg-stone relative ${(!isFreeSeatSelection && view === 'seat') ? 'h-[800px]' : 'min-h-[800px]'}`}>
                                {(!isFreeSeatSelection && view === "seat") ? (
                                    <div className="">
                                        <SeatPlanViewer
                                            svgContent={svgContent}
                                            seatGroups={seatGroups}
                                            selectedSeats={selectedSeatIds}
                                            blockedSeats={state.blockedSeats}
                                            isWheelchairMode={isWheelchairMode}
                                            isVideoPlaying={isVideoPlaying}
                                            onSeatClick={handleSeatClick}
                                            onSeatDeselect={handleSeatDeselect}
                                            onWheelchairModeToggle={() => setIsWheelchairMode(!isWheelchairMode)}
                                            onVideoPlay={() => setIsVideoPlaying(true)}
                                            className="h-[800px]"
                                        />
                                    </div>
                                ) : (
                                    <SeatGroupAccordion
                                        seatGroups={isFreeSeatSelection ? seatGroups : seatGroups.filter(group => !group.name.toLocaleLowerCase().includes("rollstuhl"))}
                                        onAddToBasket={handleAddPriceToBasket}
                                        blockedSeats={state.blockedSeats}
                                    />
                                )}
                            </div>

                                <div className={`flex flex-col w-1/3 bg-white shadow-[0_-20px_20px_-10px_rgba(0,0,0,0.08)] z-10 py-16 pl-16 pr-8 ${view === 'group' ? 'sticky top-0 h-auto' : 'h-[800px]'}`}>
                                <h2 className="font-medium text-black mb-6 text-2xl flex-shrink-0">
                                    Ausgewählte Plätze ({state.basket.line_items.filter(item => item.type === 'ticket').length})
                                </h2>
                                {
                                    isWheelchairMode && (
                                        <div className="text-gray-500 mb-4 text-xs font-light">
                                            Hinweis für Rollstuhlfahrer: die designierten Rollstuhlplätze neben den Reihen können nur jeweils mit dem Sitzplatz der benachbarten Reihe gebucht werden.
                                        </div>
                                    )
                                }
                                {/* Selected seats summary */}
                                {state.basket.line_items.filter(item => item.type === 'ticket').length > 0 ? (
                                    <div className={`overflow-hidden ${view === 'group' ? '' : 'flex-1'}`}>
                                        <div className="h-full overflow-y-auto pr-8">
                                            <div className="space-y-2">
                                                {(() => {
                                                    const { grouped, individual } = groupTicketsForDisplay();

                                                    return (
                                                        <>
                                                            {/* Display grouped Bestplatz tickets */}
                                                            {Object.entries(grouped).map(([groupKey, tickets]) => {
                                                                const firstTicket = tickets[0];
                                                                const seatGroup = seatGroups.find(g => g.id === firstTicket.seat_group_id);
                                                                const quantity = tickets.length;
                                                                const totalPrice = tickets.reduce((sum, ticket) => sum + ticket.unit_price, 0);

                                                                return (
                                                                    <div key={`group-${groupKey}`} className="py-8 border-b-4 border-gray-100">
                                                                        <div className="flex items-center justify-between mb-4">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className='flex flex-col gap-2'>
                                                                                    <div className="text-base font-medium text-black">
                                                                                        {firstTicket.seat_group_name}
                                                                                    </div>
                                                                                    <div className="text-sm text-gray-600">
                                                                                        {firstTicket.free_seat_selection ? 'Freie Platzwahl' : 'Bestplatz'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => handleRemoveGroupedTickets(firstTicket.seat_group_id, firstTicket.price_category.id)}
                                                                                className="w-10 h-10 flex items-center justify-center text-black/60 hover:text-black rounded"
                                                                                title="Alle Tickets dieser Kategorie entfernen"
                                                                            >
                                                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                    <path d="M14.7402 1L1.00053 14.7397" stroke="black" stroke-width="1" stroke-linecap="round" />
                                                                                    <path d="M14.9961 14.9941L1.25639 1.25438" stroke="black" stroke-width="1" stroke-linecap="round" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex justify-between items-center">
                                                                            <div className="text-base text-black">
                                                                                {quantity}x {firstTicket.price_category.category_name}
                                                                            </div>
                                                                            <div className="text-base font-medium text-black">
                                                                                {formatPrice(totalPrice)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Display individual seat tickets */}
                                                            {individual.map((ticketItem) => {
                                                                // Check if pre-show is available for this ticket (link_key-aware)
                                                                const ticketPriceLinkKey = ticketItem.price_category?.link_key;
                                                                const preShowProductsAll = state.selectedShow?.cross_selling_products?.filter(product => product.type_name === FrontendCrossSellingProductType.PRE_SHOW) || [];
                                                                const preShowProducts = preShowProductsAll.filter((product) => {
                                                                    const keys = product.link_keys || [];
                                                                    if (keys.length === 0) return true;
                                                                    if (!ticketPriceLinkKey) return false;
                                                                    return keys.includes(ticketPriceLinkKey);
                                                                });
                                                                const availablePreShowCount = preShowProducts.length;
                                                                const ticketHasPreShow = hasTicketPreShow(ticketItem.id);
                                                                const defaultPreShowProduct = preShowProducts[0];
                                                                const selectedPreShowProduct = ticketHasPreShow ? state.basket.line_items.find(item => item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW && (item as TicketAddOnLineItem).ticket_line_item_id === ticketItem.id) as TicketAddOnLineItem | null : null;

                                                                return (
                                                                    <div className="flex flex-col gap-3 py-6 border-t border-black first:border-t-0">
                                                                        <div key={ticketItem.id} className="flex items-center justify-between mb-2">
                                                                            <div className="flex items-center gap-4 w-full">
                                                                                <div className='flex flex-col gap-2 w-full'>
                                                                                    <div className="text-base font-medium text-black">
                                                                                        {ticketItem.free_seat_selection ? `${ticketItem.seat_group_name} - Freie Platzwahl` : getSeatDisplayNameWithSeatGroupName(ticketItem.seat, ticketItem.seat_group_name, state.language)}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 ml-2">
                                                                                <button
                                                                                    onClick={() => handleSeatDeselect(ticketItem.seat.seat_number)}
                                                                                    className="w-12 h-12 flex items-center justify-center text-black/60 hover:text-black rounded"
                                                                                    title="Platz entfernen"
                                                                                    aria-label="Ticket entfernen"
                                                                                >
                                                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                        <path d="M14.7402 1L1.00053 14.7397" stroke="black" stroke-width="1" stroke-linecap="round" />
                                                                                        <path d="M14.9961 14.9941L1.25639 1.25438" stroke="black" stroke-width="1" stroke-linecap="round" />
                                                                                    </svg>

                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <div className="mb-4">
                                                                            {(() => {
                                                                                const seatGroup = seatGroups.find(g => g.id === ticketItem.seat_group_id);
                                                                                if (!seatGroup) return null;

                                                                                const priceOptions = seatGroup.prices
                                                                                    .sort((a, b) => a.sort_order - b.sort_order)
                                                                                    .map(price => ({
                                                                                        value: price.id,
                                                                                        label: `${price.category_name} - ${formatPrice(price.price)}`
                                                                                    }));

                                                                                return (
                                                                                    <MainSelect
                                                                                        value={ticketItem.price_category.id}
                                                                                        onChange={(value) => handlePriceCategoryChange(ticketItem.id, value)}
                                                                                        options={priceOptions}
                                                                                        className="w-full text-base"
                                                                                    />
                                                                                );
                                                                            })()}
                                                                        </div>

                                                                        {/* Pre-show Section */}
                                                                        {availablePreShowCount > 0 && (
                                                                            <div className="flex w-full justify-between gap-2 items-center text-base pt-4" style={{ borderTopStyle: 'dashed', borderTopWidth: '1px', borderTopColor: '#d1d5db', borderImage: 'repeating-linear-gradient(to right, #d1d5db 0, #d1d5db 3px, transparent 3px, transparent 6px) 1' }}>
                                                                                {ticketHasPreShow && selectedPreShowProduct ? (
                                                                                    <div className="flex items-center justify-between w-full">
                                                                                        <div>
                                                                                            {selectedPreShowProduct.product.name} {formatPrice(selectedPreShowProduct.product.price)}
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => toggleTicketPreShow(ticketItem.id)}
                                                                                            className="w-12 h-6 flex items-center justify-center text-black/60 hover:text-black rounded"
                                                                                            aria-label="Vorprogramm entfernen"
                                                                                        >
                                                                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                                <path d="M14.7402 1L1.00053 14.7397" stroke="black" stroke-width="1" stroke-linecap="round" />
                                                                                                <path d="M14.9961 14.9941L1.25639 1.25438" stroke="black" stroke-width="1" stroke-linecap="round" />
                                                                                            </svg>
                                                                                        </button >
                                                                                    </div>
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={() => toggleTicketPreShow(ticketItem.id)}
                                                                                        className="flex gap-2 items-center text-base font-medium"
                                                                                    >
                                                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                            <circle cx="8" cy="8" r="8" fill="#19263D" />
                                                                                            <path d="M12.4072 8.16516L4.07686 8.16516" stroke="white" stroke-width="0.8" stroke-linecap="round" />
                                                                                            <path d="M8.24243 12.4849V4.15449" stroke="white" stroke-width="0.8" stroke-linecap="round" />
                                                                                        </svg>


                                                                                        <span>{defaultPreShowProduct?.action_label ? defaultPreShowProduct?.action_label : 'Vorprogramm hinzufügen'}</span>
                                                                                        {
                                                                                            availablePreShowCount === 1 ? <span> ({formatPrice(defaultPreShowProduct?.price || 0)})</span> : null
                                                                                        }
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="text-gray-500 mb-4">
                                            Keine Plätze ausgewählt. Klicken Sie auf einen verfügbaren Platz, um ihn auszuwählen.
                                        </div>
                                    </div>
                                )}
                                {/* <div className='flex-grow'></div> */}
                                {(state.basket.financial_breakdown?.subtotal || 0) > 0 && (
                                    <div className="mt-12 flex flex-col gap-8 pr-8">
                                        <div className="flex justify-between items-center text-2xl font-medium text-black">
                                            <span>{state.basket.line_items.filter(item => item.type === 'ticket').length} Tickets:</span>
                                            <span>{formatPrice(state.basket.financial_breakdown?.subtotal || 0)}</span>
                                        </div>
                                        <MainButton
                                            handleClick={moveToBasket}
                                            disabled={selectedSeatIds.length === 0 || state.isLoading}
                                            label={state.isLoading ? 'Reserviere Plätze...' : 'Weiter zum Warenkorb'}
                                            size='large'
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Desktop video overlay - spans both seat viewer and basket area */}
                            {isVideoPlaying && (
                                <div className="absolute inset-0 z-20">
                                    <video
                                        className="w-full h-full object-cover"
                                        autoPlay
                                        muted
                                        playsInline
                                        loop
                                        preload="none"
                                        src="/videos/drohnenvideo_desktop.mp4"
                                    />
                                    <button
                                        onClick={() => setIsVideoPlaying(false)}
                                        className="absolute top-6 md:top-12 right-6 md:right-16 lg:right-20 w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow"
                                        aria-label="Video schließen"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M14.7402 1L1.00053 14.7397" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
                                            <path d="M14.9961 14.9941L1.25639 1.25438" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mobile Bottom Panel */}
                    {/* Bottom Tab */}
                    {isMobileOrTablet && (
                        <div className={`${isTabExpanded ? 'fixed z-30' : 'sticky z-20'} bottom-0 left-0 right-0 flex flex-col`} style={{ paddingBottom: isIOSSafari() ? 'env(safe-area-inset-bottom)' : undefined }}>
                            {/* Controls inline in the sticky header, only when seat viewer ≥20% visible */}
                            <div className={`absolute -top-10 left-0 right-0 flex w-full justify-center items-center gap-3 ${(showMobileControls && !isVideoPlaying) ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
                                <div
                                    className="flex flex-row justify-evenly items-center"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg width='120' height='36' viewBox='0 0 103 30' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 3.42086C0 2.04468 1.116 0.928679 2.49219 0.928679H29.9014C29.9014 2.30486 31.0174 3.42086 32.3936 3.42086C33.6837 3.42075 34.7445 2.44009 34.8721 1.18363L34.8848 0.928679H67.2783C67.2783 2.30486 68.3943 3.42086 69.7705 3.42086C71.0607 3.42086 72.1215 2.44009 72.249 1.18363L72.2627 0.928679H99.6719C101.048 0.928679 102.164 2.04468 102.164 3.42086V27.5077C102.164 28.8839 101.048 29.9999 99.6719 29.9999H72.2627C72.2627 28.6237 71.1467 27.5077 69.7705 27.5077C68.3943 27.5077 67.2783 28.6237 67.2783 29.9999H34.8848C34.8848 28.6238 33.7697 27.5078 32.3936 27.5077C31.0174 27.5077 29.9014 28.6237 29.9014 29.9999H2.49219C1.116 29.9999 0 28.8839 0 27.5077V3.42086Z' fill='white'/%3E%3C/svg%3E")`,
                                        backgroundSize: 'contain',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center',
                                        width: '110px',
                                        height: '34px'
                                    }}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); mobileViewerRef.current?.zoomIn(); }}
                                        className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded text-black"
                                        title="Zoom In"
                                        aria-label="Zoom In"
                                    >
                                        <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M13.8159 7.74561L0.597903 7.7456" stroke="black" strokeWidth="1.10906" strokeLinecap="round" />
                                            <path d="M7.20752 14.5999V1.3819" stroke="black" strokeWidth="1.10906" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); mobileViewerRef.current?.resetView(); }}
                                        className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded text-black"
                                        title="Reset View"
                                        aria-label="Reset View"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 10H6V15M15 6H10V1" stroke="black" strokeWidth="1.11" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); mobileViewerRef.current?.zoomOut(); }}
                                        className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded text-black"
                                        title="Zoom Out"
                                        aria-label="Zoom Out"
                                    >
                                        <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M14.6938 7.34674L1.47583 7.34674" stroke="black" strokeWidth="1.10906" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsWheelchairMode(!isWheelchairMode); }}
                                    className={`w-8 h-8 rounded-md flex items-center justify-center ${isWheelchairMode ? 'bg-darkBlue hover:bg-darkBlue/80' : 'bg-white hover:bg-gray-100'} transition-all duration-300 ease-in-out`}
                                    aria-label="Rollstuhlplätze"
                                    title={isWheelchairMode ? 'Normale Ansicht' : 'Rollstuhlplätze anzeigen'}
                                >
                                    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path className={isWheelchairMode ? "fill-white transition-all duration-300 ease-in-out" : "fill-black transition-all duration-300 ease-in-out" } fillRule="evenodd" clipRule="evenodd" d="M5.76616 1.55555C5.76616 2.41466 5.07773 3.11111 4.22851 3.11111C3.3793 3.11111 2.69087 2.41466 2.69087 1.55555C2.69087 0.696445 3.3793 0 4.22851 0C5.07773 0 5.76616 0.696445 5.76616 1.55555ZM3.74746 8.42237L3.00058 3.88888H6.09703L6.80178 8.16663H8.13399C8.9337 8.16663 9.59991 8.78677 9.66632 9.59301L10 13.2222H8.45703L8.13399 9.72219H5.26418C4.51252 9.72219 3.87104 9.17243 3.74746 8.42237ZM3.8441 12.4444C4.84836 12.4444 5.70271 11.7951 6.01933 10.8889H7.61132C7.25515 12.664 5.70386 14 3.8441 14C1.72106 14 0 12.2589 0 10.1111C0 8.57857 0.876289 7.25308 2.14963 6.61946L2.43628 8.26273C1.88971 8.68941 1.53764 9.35867 1.53764 10.1111C1.53764 11.3998 2.57028 12.4444 3.8441 12.4444Z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsVideoPlaying(true); }}
                                    className={`w-8 h-8 rounded-md flex items-center justify-center bg-white hover:bg-gray-100`}
                                    aria-label="Video abspielen"
                                    title="Video abspielen"
                                >
                                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path className='stroke-black' d="M0.600098 10.9659V2.23468C0.600098 1.51471 0.600098 1.15432 0.733501 0.9413C0.849934 0.755378 1.0294 0.633308 1.22864 0.604124C1.45683 0.570697 1.73671 0.740223 2.29567 1.07879L9.50309 5.44442L9.5057 5.44574C10.1234 5.8199 10.4324 6.00707 10.5338 6.25653C10.6222 6.47415 10.6222 6.72536 10.5338 6.94298C10.4323 7.19279 10.1225 7.38072 9.50309 7.75594L2.29567 12.1216C1.73631 12.4604 1.45691 12.6293 1.22864 12.5958C1.0294 12.5666 0.849934 12.4446 0.733501 12.2587C0.600098 12.0456 0.600098 11.6859 0.600098 10.9659Z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                            <div className={`shadow-[0_0_50px_rgba(0,0,0,0.15)] rounded-t-3xl overflow-hidden ${isTablet ? 'mx-6' : ''}`}>
                                {/* Tab Header */}
                                <div className={`bg-white border-t border-gray-200 px-4 lg:px-6 transition-all duration-300`}>
                                    <div className="flex items-center justify-between gap-2 font-medium text-lg lg:text-xl py-4 lg:py-4">
                                        <button
                                            onClick={() => setIsTabExpanded(!isTabExpanded)}
                                            className="flex items-center gap-3 w-full"
                                            aria-expanded={isTabExpanded}
                                        >
                                            <svg
                                                className={`w-6 h-6 transition-transform duration-300 ${isTabExpanded ? '' : 'rotate-180'}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            <span className="hidden lg:block">
                                                {state.basket.line_items.filter(item => item.type === 'ticket').length} Tickets: {formatPrice(state.basket.financial_breakdown?.subtotal || 0)}
                                            </span>
                                            <span className="lg:hidden">
                                                {state.basket.line_items.filter(item => item.type === 'ticket').length} Tickets
                                            </span>
                                        </button>

                                        <div className="lg:hidden whitespace-nowrap">
                                            {formatPrice(state.basket.financial_breakdown?.subtotal || 0)}
                                        </div>

                                        {
                                            isTablet ? (
                                                <MainButton
                                                    handleClick={moveToBasket}
                                                    disabled={selectedSeatIds.length === 0 || state.isLoading || state.basket.line_items.filter(item => item.type === 'ticket').length === 0}
                                                    label={state.isLoading ? 'Reserviere Plätze...' : 'Zum Warenkorb'}
                                                    className='whitespace-nowrap'
                                                />
                                            ) : null
                                        }
                                    </div>
                                </div>

                                {/* Expanded Panel */}
                                <div
                                    className={`bg-white overflow-hidden ${isTabExpanded ? 'max-h-[60vh]' : 'max-h-0'} transition-[max-height] duration-300 ease-in-out`}
                                >
                                    {state.basket.line_items.filter(item => item.type === 'ticket').length > 0 ? (
                                        <div className="p-6 pb-28 max-h-[50vh] overflow-y-auto" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
                                            <h2 className="font-medium text-black mb-6 text-xl">
                                                Ausgewählte Plätze ({state.basket.line_items.filter(item => item.type === 'ticket').length})
                                            </h2>
                                            {
                                                isWheelchairMode && (
                                                    <div className="text-gray-500 mb-4 text-xs font-light">
                                                        Hinweis für Rollstuhlfahrer: die designierten Rollstuhlplätze neben den Reihen können nur jeweils mit dem Sitzplatz der benachbarten Reihe gebucht werden.
                                                    </div>
                                                )
                                            }
                                            <div className="space-y-4">
                                                {(() => {
                                                    const { grouped, individual } = groupTicketsForDisplay();

                                                    return (
                                                        <>
                                                            {/* Display grouped Bestplatz tickets */}
                                                            {Object.entries(grouped).map(([groupKey, tickets]) => {
                                                                const firstTicket = tickets[0];
                                                                const seatGroup = seatGroups.find(g => g.id === firstTicket.seat_group_id);
                                                                const quantity = tickets.length;
                                                                const totalPrice = tickets.reduce((sum, ticket) => sum + ticket.unit_price, 0);

                                                                return (
                                                                    <div key={`group-${groupKey}`} className="py-4 border-b border-gray-100">
                                                                        <div className="flex items-start justify-between mb-3">
                                                                            <div className="flex items-start gap-3">
                                                                                <div className='flex flex-col gap-1'>
                                                                                    <div className="font-medium text-base text-black">
                                                                                        {firstTicket.seat_group_name}
                                                                                    </div>
                                                                                    <div className="text-sm text-gray-600">
                                                                                        {firstTicket.free_seat_selection ? 'Freie Platzwahl' : 'Bestplatz'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleRemoveGroupedTickets(firstTicket.seat_group_id, firstTicket.price_category.id);
                                                                                }}
                                                                                className="w-8 h-8 flex items-center justify-center text-black/60 hover:text-black rounded"
                                                                                title="Alle Tickets dieser Kategorie entfernen"
                                                                            >
                                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex justify-between items-center">
                                                                            <div className="text-base text-black">
                                                                                {quantity}x {firstTicket.price_category.category_name}
                                                                            </div>
                                                                            <div className="text-base font-medium text-black">
                                                                                {formatPrice(totalPrice)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Display individual seat tickets */}
                                                            {individual.map((ticketItem) => {
                                                                // Check if pre-show is available for this ticket (link_key-aware)
                                                                const ticketPriceLinkKey = ticketItem.price_category?.link_key;
                                                                const preShowProductsAll = state.selectedShow?.cross_selling_products?.filter(product => product.type_name === FrontendCrossSellingProductType.PRE_SHOW) || [];
                                                                const preShowProducts = preShowProductsAll.filter((product) => {
                                                                    const keys = product.link_keys || [];
                                                                    if (keys.length === 0) return true;
                                                                    if (!ticketPriceLinkKey) return false;
                                                                    return keys.includes(ticketPriceLinkKey);
                                                                });
                                                                const availablePreShowCount = preShowProducts.length;
                                                                const ticketHasPreShow = hasTicketPreShow(ticketItem.id);
                                                                const defaultPreShowProduct = preShowProducts[0];
                                                                const selectedPreShowProduct = ticketHasPreShow ? state.basket.line_items.find(item => item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW && (item as TicketAddOnLineItem).ticket_line_item_id === ticketItem.id) as TicketAddOnLineItem | null : null;

                                                                return (
                                                                    <div key={ticketItem.id} className="py-4 border-b border-gray-100">
                                                                        <div className="flex items-start justify-between mb-3">
                                                                            <div className="flex items-start gap-3 flex-1">
                                                                                <div className='flex flex-col gap-2 w-full'>
                                                                                    <div className="font-medium text-base text-black">
                                                                                        {ticketItem.free_seat_selection ? `${ticketItem.seat_group_name} - Freie Platzwahl` : getSeatDisplayNameWithSeatGroupName(ticketItem.seat, ticketItem.seat_group_name, state.language)}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleSeatDeselect(ticketItem.seat.seat_number);
                                                                                }}
                                                                                className="w-8 h-8 flex items-center justify-center text-black/60 hover:text-black rounded ml-2"
                                                                                title="Platz entfernen"
                                                                                aria-label="Ticket entfernen"
                                                                            >
                                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                        <div className="mb-3">
                                                                            {(() => {
                                                                                const seatGroup = seatGroups.find(g => g.id === ticketItem.seat_group_id);
                                                                                if (!seatGroup) return null;

                                                                                const priceOptions = seatGroup.prices
                                                                                    .sort((a, b) => a.sort_order - b.sort_order)
                                                                                    .map(price => ({
                                                                                        value: price.id,
                                                                                        label: `${price.category_name} - ${formatPrice(price.price)}`
                                                                                    }));

                                                                                return (
                                                                                    <MainSelect
                                                                                        value={ticketItem.price_category.id}
                                                                                        onChange={(value) => handlePriceCategoryChange(ticketItem.id, value)}
                                                                                        options={priceOptions}
                                                                                        className="w-full text-base"
                                                                                    />
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        {/* Pre-show Section */}
                                                                        {availablePreShowCount > 0 && (
                                                                            <div className="flex w-full justify-between gap-2 items-center text-base mt-2 pt-4" style={{ borderTopStyle: 'dashed', borderTopWidth: '1px', borderTopColor: '#d1d5db', borderImage: 'repeating-linear-gradient(to right, #d1d5db 0, #d1d5db 3px, transparent 3px, transparent 6px) 1' }}>
                                                                                {ticketHasPreShow && selectedPreShowProduct ? (
                                                                                    <div className="flex items-center justify-between w-full">
                                                                                        <div>
                                                                                            {selectedPreShowProduct.product.name} {formatPrice(selectedPreShowProduct.product.price)}
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                toggleTicketPreShow(ticketItem.id);
                                                                                            }}
                                                                                            className="w-8 h-8 flex items-center justify-center text-black/60 hover:text-black rounded"
                                                                                            aria-label="Vorprogramm entfernen"
                                                                                        >
                                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                            </svg>
                                                                                        </button >
                                                                                    </div>
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            toggleTicketPreShow(ticketItem.id);
                                                                                        }}
                                                                                        className="flex gap-2 items-center text-base font-medium"
                                                                                    >
                                                                                        <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                            <circle cx="7.23607" cy="8.04516" r="7.23607" fill="#19263D" />
                                                                                            <path d="M11.2227 8.19458L3.68776 8.19458" stroke="white" stroke-width="0.723607" stroke-linecap="round" />
                                                                                            <path d="M7.45557 12.1018V4.56691" stroke="white" stroke-width="0.723607" stroke-linecap="round" />
                                                                                        </svg>


                                                                                        <span>{defaultPreShowProduct?.action_label ? defaultPreShowProduct?.action_label : 'Vorprogramm hinzufügen'}</span>
                                                                                        {
                                                                                            availablePreShowCount === 1 ? <span> ({formatPrice(defaultPreShowProduct?.price || 0)})</span> : null
                                                                                        }
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="text-gray-500 mb-4">
                                                Keine Plätze ausgewählt. Klicken Sie auf einen verfügbaren Platz, um ihn auszuwählen.
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Fixed Bottom Button */}
                                {
                                    state.basket.line_items.filter(item => item.type === 'ticket').length > 0 ? (
                                        <div className="bg-white border-t border-gray-200 p-6 lg:hidden">
                                            <MainButton
                                                handleClick={moveToBasket}
                                                disabled={selectedSeatIds.length === 0 || state.isLoading || state.basket.line_items.filter(item => item.type === 'ticket').length === 0}
                                                label={state.isLoading ? 'Reserviere Plätze...' : 'Weiter zum Warenkorb'}
                                                className='w-full'
                                            />
                                        </div>
                                    ) : null
                                }
                            </div>
                            {/* iOS bottom safe-area background shim (all iOS browsers) */}
                            {isIOSDevice() && (
                                <div aria-hidden={true} className="fixed bottom-0 left-0 right-0 z-10 pointer-events-none bg-white" style={{ height: 'env(safe-area-inset-bottom)' }} />
                            )}
                        </div>
                    )}

                    {/* Fixed controls removed; now integrated in sticky header above */}
                </div >
            </section >

            {/* Seat Selection Modal */}
            {
                modalState.seatGroup && modalState.seat && (
                    <SeatPriceSelectionModal
                        isOpen={modalState.isOpen}
                        onClose={() => setModalState({ isOpen: false, seat: null, seatGroup: null })}
                        seat={modalState.seat}
                        seatGroup={modalState.seatGroup}
                        onSelectPriceCategory={handlePriceCategorySelect}
                    />
                )
            }

            {/* Seat Conflict Confirmation Dialog */}
            <SeatConflictDialog
                isOpen={conflictDialog.isOpen}
                onClose={handleConflictCancel}
                onConfirm={handleConflictConfirm}
                conflictType={conflictDialog.conflictType}
            />

            {/* Pre-show Price Selection Modal */}
            <PreShowPriceSelectionModal
                isOpen={preShowModalData.isOpen}
                onClose={handleClosePreShowModal}
                preShowProducts={preShowModalData.products}
                onSelectPriceCategory={handlePreShowSelection}
            />
        </div >
    );
}