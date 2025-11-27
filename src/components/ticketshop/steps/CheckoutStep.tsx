import React, { useState, useEffect } from 'react';
import { useBooking } from '../contexts/BookingContext';
import { formatPrice } from '../utils/priceFormatting';
import { componentContentPadding, componentContentPaddingX } from '../../../lib/utils';
import type { CrossSellingLineItem, TicketLineItem, TicketAddOnLineItem, CouponLineItem } from '../types/lineItem';
import type { AuthenticatedCustomer } from '../types/customerAuth';
import { CustomerAddressModal } from '../components/CustomerAddressModal';
import { useAuth } from '../contexts/AuthContext';
import { ordersApi, type CreateOrderRequest, type CreateGuestOrderRequest, type CreateOrderIntentRequest, type CreateGuestOrderIntentRequest } from '../api/orders';
import { createOrderFinancialBreakdown } from '../utils/financialBreakdown';
import { handleOrderError, getOrderErrorMessage, isRetryableError, requiresSeatReselection, requiresNewIntent, type OrderResult } from '../utils/orderErrorHandling';
import { SecureOrderService } from '../services/secureOrderService';
import { FrontendCrossSellingProductType, type CrossSellingProductData } from '../types/crossSellingProduct';
import { MainButton } from '../components/MainButton';
import PreShowPriceSelectionModal from '../components/PreShowPriceSelectionModal';
import { MainSelect } from '../components/MainSelect';
import { getSeatDisplayNameWithSeatGroupName } from '../utils/seatInfo';
import { generateUUID } from '../utils/uuid';
import { MainTextInput } from '../components/MainTextInput';
import { OTPInput } from '../components/OTPInput';
import { getSeatDisplayName, getTicketRowAndSeat } from '../utils/seatInfo';
import type { ClientPaymentMethod } from '../types/paymentMethod';
import { ALL_COUNTRIES } from '../utils/countries';
import type { EventSeriesData } from '../types/eventSeries';
import { isIOSSafari, isIOSDevice } from '../utils/device';

const COUNTRY_OPTIONS = ALL_COUNTRIES.map(country => ({
    value: country.code,
    label: country.name
}));

export function CheckoutStep() {
    const { state, goToPreviousStep, canGoToPreviousStep, dispatch, goToStep, showNotification } = useBooking();
    const {
        isAuthenticated,
        customer: authenticatedCustomer,
        otpState,
        otpEmail,
        otpError,
        requestOTP,
        verifyOTP,
        updateCustomer,
        logout,
        clearOTPState
    } = useAuth();

    // Get seat groups from the selected show's pricing structure
    const seatGroups = state.selectedShow?.pricing_structure?.seat_groups || [];

    // Local UI state
    const [loginEmail, setLoginEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [showAddressModal, setShowAddressModal] = useState(false);

    const [selectedBillingAddressName, setSelectedBillingAddressName] = useState<string | null>(null);
    const [selectedDeliveryAddressName, setSelectedDeliveryAddressName] = useState<string | null>(null);
    const [useDifferentDeliveryAddress, setUseDifferentDeliveryAddress] = useState(false);
    const [showBillingAddressModal, setShowBillingAddressModal] = useState(false);
    const [showDeliveryAddressModal, setShowDeliveryAddressModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        country: 'DE',
        street: '',
        company: '',
        addressAdd: '',
        postalCode: '',
        city: '',
        differentDeliveryAddress: false
    });
    const [deliveryData, setDeliveryData] = useState({
        firstName: '',
        lastName: '',
        country: 'DE',
        street: '',
        company: '',
        addressAdd: '',
        postalCode: '',
        city: ''
    });
    const [paymentMethod, setPaymentMethod] = useState<ClientPaymentMethod | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [nowTs, setNowTs] = useState(Date.now());

    // Field validation errors
    const [fieldErrors, setFieldErrors] = useState<{
        paymentMethod?: string;
        terms?: string;
        privacy?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        country?: string;
        street?: string;
        postalCode?: string;
        city?: string;
        billingAddress?: string;
    }>({});

    // Mobile-specific state (mirror SeatSelectionStep)
    const [isTablet, setIsTablet] = useState(false);
    const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

    const [isTabExpanded, setIsTabExpanded] = useState(false);
    const [preShowModalData, setPreShowModalData] = useState<{
        isOpen: boolean;
        ticketId: string | null;
        products: CrossSellingProductData[];
    }>({
        isOpen: false,
        ticketId: null,
        products: []
    });

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsTablet(window.innerWidth > 768 && window.innerWidth < 1280); // xl breakpoint
            setIsMobileOrTablet(window.innerWidth < 1280); // xl breakpoint
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Refresh current time periodically to reevaluate payment method availability windows
    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 60000);
        return () => clearInterval(id);
    }, []);

    // Auto-select voucher payment method when total amount is zero
    useEffect(() => {
        const totalAmount = state.basket.financial_breakdown?.total_amount || 0;
        if (totalAmount === 0) {
            const voucherMethod = state.initData?.paymentMethods?.find(m => m.payment_method_key === 'voucher-payment') || null;
            if (voucherMethod && (!paymentMethod || paymentMethod.id !== voucherMethod.id)) {
                setPaymentMethod(voucherMethod);
            }
        }
    }, [state.basket.financial_breakdown?.total_amount, state.initData?.paymentMethods]);

    // Compute payment methods that are currently available based on show start and available_from_relative (minutes before show)
    const availablePaymentMethods = React.useMemo(() => {
        const methods = (state.initData?.paymentMethods || []).filter(method => method.payment_method_key !== 'voucher-payment');

        // If no selected show (e.g., voucher flow), don't filter by relative availability
        if (!state.selectedShow) {
            const alwaysAvailableMethods = methods.filter(m => m.available_from_relative == null);
            return alwaysAvailableMethods;
        };

        try {
            const showDate = new Date(state.selectedShow.date);
            const [hoursStr, minutesStr] = (state.selectedShow.show_time || '').split(':');
            const hours = parseInt(hoursStr || '0', 10);
            const minutes = parseInt(minutesStr || '0', 10);
            showDate.setHours(hours, minutes, 0, 0);

            const minutesUntilShow = Math.ceil((showDate.getTime() - nowTs) / 60000);

            return methods.filter(m => m.available_from_relative == null || minutesUntilShow <= m.available_from_relative);
        } catch {
            return methods;
        }
    }, [state.initData?.paymentMethods, state.selectedShow, nowTs]);

    // If a previously selected method becomes unavailable, clear the selection
    useEffect(() => {
        if (paymentMethod && !availablePaymentMethods.some(m => m.id === paymentMethod.id)) {
            setPaymentMethod(null);
        }
    }, [availablePaymentMethods]);

    // Helper function to check if ticket has pre-show
    const hasTicketPreShow = (ticketId: string) => {
        const preShowAddOns = state.basket.line_items.filter(item =>
            item.type === 'crossselling' &&
            (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW &&
            (item as TicketAddOnLineItem).ticket_line_item_id === ticketId
        ) as TicketAddOnLineItem[];
        return preShowAddOns.length > 0;
    };

    // Remove an individual ticket by seat id
    const handleSeatDeselect = (seatId: string) => {
        const lineItem = state.basket.line_items.find(item =>
            item.type === 'ticket' &&
            (item as TicketLineItem).seat.seat_number === seatId
        );

        if (lineItem) {
            dispatch({ type: 'REMOVE_LINE_ITEM', payload: lineItem.id });
        }
    };

    // Remove all Bestplatz tickets for a given group and price category
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

    // Toggle pre-show add-on for a ticket
    const toggleTicketPreShow = (ticketId: string) => {
        if (hasTicketPreShow(ticketId)) {
            const preShowAddOn = state.basket.line_items.find(item =>
                item.type === 'crossselling' &&
                (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW &&
                (item as TicketAddOnLineItem).ticket_line_item_id === ticketId
            );
            if (preShowAddOn) {
                dispatch({ type: 'REMOVE_LINE_ITEM', payload: preShowAddOn.id });
            }
        } else {
            // Get all available pre-show products (filtered by link_key of current ticket price)
            const ticketItem = state.basket.line_items.find(item => item.type === 'ticket' && item.id === ticketId) as TicketLineItem | undefined;
            const ticketPriceLinkKey = ticketItem?.price_category?.link_key;

            const preShowProductsAll = state.selectedShow?.cross_selling_products?.filter(product =>
                product.type_name === FrontendCrossSellingProductType.PRE_SHOW
            ) || [];
            const preShowProducts = preShowProductsAll.filter(product => {
                const keys = product.link_keys || [];
                if (keys.length === 0) return true;
                if (!ticketPriceLinkKey) return false;
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
        }
    };

    // Handle pre-show variant selection from modal
    const handlePreShowSelection = (selectedProduct: CrossSellingProductData) => {
        if (!preShowModalData.ticketId) return;

        // Guard against incompatible selection based on link_keys
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
        const newName = (ticketItem as TicketLineItem).free_seat_selection
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

        // Remove incompatible ticket add-ons (pre-show) after price change
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

    // Group tickets for display (Bestplatz grouped; manual seats individual)
    const groupTicketsForDisplay = () => {
        const ticketItems = state.basket.line_items.filter(item => item.type === 'ticket') as TicketLineItem[];
        const grouped: { [key: string]: TicketLineItem[] } = {};
        const individual: TicketLineItem[] = [];

        ticketItems.forEach(ticket => {
            if (ticket.seat.seat_number === 'Bestplatz') {
                const groupKey = `${ticket.seat_group_id}-${ticket.price_category.id}`;
                if (!grouped[groupKey]) {
                    grouped[groupKey] = [];
                }
                grouped[groupKey].push(ticket);
            } else {
                individual.push(ticket);
            }
        });

        // Sort individual tickets: numeric rows first (by row then seat_row_number), then non-numeric (by seat_row_number)
        const isNumericRow = (row?: string) => !!row && /^\d+$/.test(row.trim());
        const numeric: TicketLineItem[] = [];
        const nonNumeric: TicketLineItem[] = [];
        individual.forEach(t => {
            const row = t.seat?.seat_row;
            if (isNumericRow(row)) numeric.push(t); else nonNumeric.push(t);
        });
        numeric.sort((a, b) => {
            const ra = parseInt((a.seat?.seat_row || '0').trim(), 10);
            const rb = parseInt((b.seat?.seat_row || '0').trim(), 10);
            if (ra !== rb) return ra - rb;
            const sna = typeof a.seat?.seat_row_number === 'number' ? (a.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
            const snb = typeof b.seat?.seat_row_number === 'number' ? (b.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
            return sna - snb;
        });
        nonNumeric.sort((a, b) => {
            const sna = typeof a.seat?.seat_row_number === 'number' ? (a.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
            const snb = typeof b.seat?.seat_row_number === 'number' ? (b.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
            return sna - snb;
        });
        const sortedIndividual = [...numeric, ...nonNumeric];
        return { grouped, individual: sortedIndividual };
    };

    // Pre-fill form when customer is authenticated
    useEffect(() => {
        if (isAuthenticated && authenticatedCustomer) {
            const defaultAddress = authenticatedCustomer.addresses.find(addr => addr.is_default) || authenticatedCustomer.addresses[0];
            if (defaultAddress) {
                setFormData(prev => ({
                    ...prev,
                    firstName: authenticatedCustomer.first_name,
                    lastName: authenticatedCustomer.last_name,
                    email: authenticatedCustomer.email,
                    country: defaultAddress.country_code,
                    street: defaultAddress.street,
                    company: defaultAddress.company || '',
                    addressAdd: defaultAddress.address_add || '',
                    postalCode: defaultAddress.postcode,
                    city: defaultAddress.city
                }));
            }
            if (!selectedBillingAddressName) {
                const defaultAddress = authenticatedCustomer.addresses.find(addr => addr.is_default) || authenticatedCustomer.addresses[0];
                if (defaultAddress) {
                    setSelectedBillingAddressName(defaultAddress.name);
                    // Initially use same address for delivery
                    if (!useDifferentDeliveryAddress) {
                        setSelectedDeliveryAddressName(defaultAddress.name);
                    }
                }
            }
        }
    }, [isAuthenticated, authenticatedCustomer]);


    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear field error when user starts typing
        if (fieldErrors[field as keyof typeof fieldErrors]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field as keyof typeof fieldErrors];
                return newErrors;
            });
        }
    };

    const handleDeliveryInputChange = (field: string, value: string) => {
        setDeliveryData(prev => ({
            ...prev,
            [field]: value
        }));
        // Note: Delivery address errors are not tracked separately for now
    };

    // Authentication functions using AuthContext
    const handleRequestOTP = async () => {
        if (!loginEmail) {
            return;
        }
        await requestOTP(loginEmail);
    };

    const handleVerifyOTP = async () => {
        if (!otpCode || !loginEmail) {
            return;
        }
        await verifyOTP(loginEmail, otpCode);
        // Clear the OTP code after successful verification
        setOtpCode('');
    };

    const handleBackToEmailInput = () => {
        clearOTPState();
        setOtpCode('');
    };


    const handleLogout = () => {
        logout();
        setFormData(prev => ({
            ...prev,
            firstName: '',
            lastName: '',
            email: '',
            country: 'DE',
            street: '',
            company: '',
            addressAdd: '',
            postalCode: '',
            city: ''
        }));
    };

    const buildLineItemsPayload = () => {
        // Backend accepts generic line_items array; send our basket items as-is
        // If needed later, map to a more compact schema
        return state.basket.line_items;
    };

    const evaluateTicketType = (deliveryOptionId?: string) => {
        const deliveryOption = state.initData?.deliveryOptions.find(opt => opt.id === deliveryOptionId);

        if (deliveryOption?.type === 'digital') {
            return 'e-ticket';
        }
        return 'printed-ticket';
    };

    const handlePayment = async () => {
        if (!state.initData) return;

        // Clear previous errors
        setOrderError(null);
        setOrderResult(null);
        setFieldErrors({});

        // Safety guard: Check for orphaned TicketAddOnLineItems and remove them
        const ticketLineItemIds = new Set(
            state.basket.line_items
                .filter(item => item.type === 'ticket')
                .map(item => item.id)
        );

        const orphanedAddOns = state.basket.line_items.filter(item => {
            if (item.type === 'crossselling' && 'ticket_line_item_id' in item) {
                const addOn = item as TicketAddOnLineItem;
                return !ticketLineItemIds.has(addOn.ticket_line_item_id);
            }
            return false;
        }) as TicketAddOnLineItem[];

        if (orphanedAddOns.length > 0) {
            // Remove all orphaned add-ons
            orphanedAddOns.forEach(addOn => {
                dispatch({ type: 'REMOVE_LINE_ITEM', payload: addOn.id });
            });

            // Show notification and prevent order placement
            const message = 'Der Warenkorb wurde aktualisiert. Bitte überprüfen Sie die Artikel und den Gesamtbetrag und versuchen Sie die Bestellung erneut.';
            setOrderError(message);
            showNotification(message, 'warning');
            return;
        }

        // Validate payment method
        if (!paymentMethod) {
            const errorMsg = 'Bitte wählen Sie eine Zahlungsmethode aus.';
            setOrderError(errorMsg);
            setFieldErrors(prev => ({ ...prev, paymentMethod: errorMsg }));
            return;
        }

        // Validate terms and conditions
        if (!acceptedTerms) {
            const errorMsg = 'Bitte akzeptieren Sie die Allgemeinen Geschäftsbedingungen.';
            setOrderError(errorMsg);
            setFieldErrors(prev => ({ ...prev, terms: errorMsg }));
            return;
        }

        // Validate privacy policy
        if (!acceptedPrivacy) {
            const errorMsg = 'Bitte akzeptieren Sie die Datenschutzerklärung.';
            setOrderError(errorMsg);
            setFieldErrors(prev => ({ ...prev, privacy: errorMsg }));
            return;
        }

        // Validate linked seats: ensure any seat with a linked seat has its counterpart in the basket
        const ticketItems = state.basket.line_items.filter(item => item.type === 'ticket') as TicketLineItem[];
        const seatsWithLinkedSeats = ticketItems.filter(ticket => ticket.seat && ticket.seat.linked_seat_number);
        if (seatsWithLinkedSeats.length > 0) {
            const seatIdsInBasket = new Set(ticketItems.map(ticket => ticket.seat.seat_number));
            const missingLinkedSeats = seatsWithLinkedSeats.filter(ticket => {
                const linked = ticket.seat.linked_seat_number as string;
                const linkedSeatNumberWithZeros = linked.padStart(4, '0');
                return !seatIdsInBasket.has(linkedSeatNumberWithZeros);
            });

            if (missingLinkedSeats.length > 0) {
                const linkedSeatNumber = (missingLinkedSeats[0].seat.linked_seat_number as string).padStart(4, '0');
                const linkedSeat = seatGroups.find(group => group.seats.some(seat => seat.seat_number === linkedSeatNumber))?.seats.find(seat => seat.seat_number === linkedSeatNumber);
                const linkedSeatDisplayName = linkedSeat ? getSeatDisplayName(linkedSeat, state.language) : `Platz ${linkedSeatNumber}`;
                setOrderError(`Die ausgewählten Plätze können nur gemeinsam gebucht werden. Bitte fügen Sie auch ${linkedSeatDisplayName} hinzu oder entfernen Sie den verknüpften Platz.`);
                return;
            }
        }

        setIsPlacingOrder(true);
        setOrderError(null);
        setOrderResult(null);

        try {
            const deliveryOptionId = state.shippingOption || undefined;
            const totalAmount = state.basket.financial_breakdown?.total_amount || 0;

            const ticketType = evaluateTicketType(deliveryOptionId);

            const series = state.initData?.availableSeries ?? [];
            const selectedSeries: EventSeriesData | undefined = series.find(s => s.id === state.selectedShow?.series_id);
            const seriesId = selectedSeries?.id || undefined;

            if (isAuthenticated && authenticatedCustomer) {
                if (!state.sessionId) {
                    throw new Error('Session information missing');
                }

                if (!selectedBillingAddressName) {
                    const errorMsg = 'Bitte wählen Sie eine Rechnungsadresse aus.';
                    setOrderError(errorMsg);
                    setFieldErrors(prev => ({ ...prev, billingAddress: errorMsg }));
                    setIsPlacingOrder(false);
                    return;
                }

                // Secure authenticated order using two-step process

                // Calculate financial breakdown
                const financialBreakdown = createOrderFinancialBreakdown(
                    state.basket.line_items,
                    state.initData.mainOrganizer,
                    state.initData.deliveryOptions.find(opt => opt.id === deliveryOptionId),
                    state.basket.financial_breakdown?.currency || 'EUR'
                );



                // Step 1: Create order intent
                // Only include showId/seriesId for ticket orders, not voucher-only orders
                const intentData: CreateOrderIntentRequest = {
                    sessionId: state.sessionId,
                    showId: state.flowMode === 'tickets' ? state.selectedShow?.id : undefined,
                    seriesId: state.flowMode === 'tickets' ? seriesId : undefined,
                    totalAmount: totalAmount,
                    currency: state.basket.financial_breakdown?.currency || 'EUR',
                    customerId: authenticatedCustomer.id
                };

                // Step 2: Prepare order data (without security fields)
                const orderData: Omit<CreateOrderRequest, 'intent_id' | 'nonce' | 'session_id'> = {
                    customer_id: authenticatedCustomer.id,
                    total_amount: totalAmount,
                    currency: state.basket.financial_breakdown?.currency || 'EUR',
                    ticket_type: ticketType,

                    // Required financial breakdown
                    financial_breakdown: financialBreakdown,

                    // Event identifiers (optional for voucher-only orders)
                    show_id: state.flowMode === 'tickets' ? state.selectedShow?.id : undefined,
                    series_id: state.flowMode === 'tickets' ? seriesId : undefined,

                    // Payment details
                    selected_payment_method_id: paymentMethod.id,
                    payment_status: 'pending' as const,

                    // Optional delivery
                    delivery_option_id: deliveryOptionId,

                    // Order items
                    line_items: buildLineItemsPayload(),

                    // Use selected billing address
                    billing_address: (() => {
                        const addr = authenticatedCustomer.addresses.find(a => a.name === selectedBillingAddressName);
                        if (!addr) return undefined;
                        return {
                            first_name: addr.first_name,
                            last_name: addr.last_name,
                            company: addr.company,
                            street: addr.street,
                            address_add: addr.address_add,
                            postcode: addr.postcode,
                            city: addr.city,
                            country_code: addr.country_code,
                        };
                    })(),

                    // Use selected delivery address or same as billing
                    delivery_address: (() => {
                        const deliveryAddressName = useDifferentDeliveryAddress ? selectedDeliveryAddressName : selectedBillingAddressName;
                        const addr = authenticatedCustomer.addresses.find(a => a.name === deliveryAddressName);
                        if (!addr) return undefined;
                        return {
                            first_name: addr.first_name,
                            last_name: addr.last_name,
                            company: addr.company,
                            street: addr.street,
                            address_add: addr.address_add,
                            postcode: addr.postcode,
                            city: addr.city,
                            country_code: addr.country_code,
                        };
                    })(),
                };


                // Execute secure order flow
                const response = await SecureOrderService.placeSecureOrder(intentData, orderData);
                if (!response.success) throw new Error(response.message || 'Order failed');

                const createdOrder = response.data?.order;
                const orderNumber: number | undefined = createdOrder?.order_number || createdOrder?.orderNumber;

                // Clear basket and move to confirmation
                dispatch({ type: 'CLEAR_BASKET' });
                dispatch({ type: 'RESET_RESERVATION_STATE' });
                dispatch({ type: 'SET_PLACED_ORDER', payload: { orderNumber: orderNumber ?? null, orderSnapshot: createdOrder ?? null } });
                goToStep('zahlung');
            } else {
                if (!state.sessionId) {
                    throw new Error('Session information missing');
                }
                // Secure guest order flow requires registration form fields
                const missingFields: string[] = [];
                const newFieldErrors: typeof fieldErrors = {};

                if (!formData.firstName) {
                    missingFields.push('Vorname');
                    newFieldErrors.firstName = 'Bitte geben Sie Ihren Vornamen ein.';
                }
                if (!formData.lastName) {
                    missingFields.push('Nachname');
                    newFieldErrors.lastName = 'Bitte geben Sie Ihren Nachnamen ein.';
                }
                if (!formData.email) {
                    missingFields.push('E-Mail');
                    newFieldErrors.email = 'Bitte geben Sie Ihre E-Mail-Adresse ein.';
                }
                if (!formData.country) {
                    missingFields.push('Land');
                    newFieldErrors.country = 'Bitte wählen Sie ein Land aus.';
                }
                if (!formData.street) {
                    missingFields.push('Straße');
                    newFieldErrors.street = 'Bitte geben Sie Ihre Straße und Hausnummer ein.';
                }
                if (!formData.postalCode) {
                    missingFields.push('Postleitzahl');
                    newFieldErrors.postalCode = 'Bitte geben Sie Ihre Postleitzahl ein.';
                }
                if (!formData.city) {
                    missingFields.push('Stadt');
                    newFieldErrors.city = 'Bitte geben Sie Ihre Stadt ein.';
                }

                if (missingFields.length > 0) {
                    setOrderError('Bitte füllen Sie alle Pflichtfelder aus.');
                    setFieldErrors(newFieldErrors);
                    setIsPlacingOrder(false);
                    return;
                }


                // Calculate financial breakdown
                const financialBreakdown = createOrderFinancialBreakdown(
                    state.basket.line_items,
                    state.initData.mainOrganizer,
                    state.initData.deliveryOptions.find(opt => opt.id === deliveryOptionId),
                    state.basket.financial_breakdown?.currency || 'EUR'
                );

                // Step 1: Create guest order intent (show/series optional for voucher-only orders)
                // Only include showId/seriesId for ticket orders, not voucher-only orders
                const intentData: CreateGuestOrderIntentRequest = {
                    sessionId: state.sessionId,
                    showId: state.flowMode === 'tickets' ? state.selectedShow?.id : undefined,
                    seriesId: state.flowMode === 'tickets' ? seriesId : undefined,
                    totalAmount: totalAmount,
                    currency: state.basket.financial_breakdown?.currency || 'EUR',
                    email: formData.email,
                    firstName: formData.firstName,
                    lastName: formData.lastName
                };

                // Step 2: Prepare guest order data (without security fields)
                const orderData: Omit<CreateGuestOrderRequest, 'intent_id' | 'nonce' | 'session_id'> = {
                    // Customer information
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,

                    // Address information
                    company: formData.company || undefined,
                    country_code: formData.country,
                    street: formData.street,
                    address_add: formData.addressAdd || undefined,
                    postcode: formData.postalCode,
                    city: formData.city,

                    // Order details
                    total_amount: totalAmount,
                    currency: state.basket.financial_breakdown?.currency || 'EUR',
                    ticket_type: ticketType,

                    // Required financial breakdown
                    financial_breakdown: financialBreakdown,

                    // Event identifiers (optional for voucher-only orders)
                    show_id: state.flowMode === 'tickets' ? state.selectedShow?.id : undefined,
                    series_id: state.flowMode === 'tickets' ? seriesId : undefined,

                    // Payment details
                    selected_payment_method_id: paymentMethod.id,
                    payment_status: 'pending' as const,

                    // Optional delivery
                    delivery_option_id: deliveryOptionId,

                    // Order items
                    line_items: buildLineItemsPayload()
                };

                // Execute secure guest order flow
                const response = await SecureOrderService.placeSecureGuestOrder(intentData, orderData);
                if (!response.success) throw new Error(response.message || 'Order failed');

                const createdOrder = response.data?.order;
                const orderNumber: number | undefined = createdOrder?.order_number || createdOrder?.orderNumber;

                // Clear basket and move to confirmation
                dispatch({ type: 'CLEAR_BASKET' });
                dispatch({ type: 'RESET_RESERVATION_STATE' });
                dispatch({ type: 'SET_PLACED_ORDER', payload: { orderNumber: orderNumber ?? null, orderSnapshot: createdOrder ?? null } });
                goToStep('zahlung');
            }
        } catch (error: any) {
            console.error('Order creation failed:', error);

            // Handle order error using the comprehensive error handler
            const result = await handleOrderError(error);
            setOrderResult(result);

            // Set a user-friendly error message
            if (result.error) {
                setOrderError(getOrderErrorMessage(result.error));

                // If seat conflict, consider redirecting to seat selection
                if (requiresSeatReselection(result.error)) {
                    // You could add logic here to redirect back to seat selection
                    // or highlight conflicted seats
                    console.warn('Seat conflict detected. User should reselect seats.');
                }
            } else {
                setOrderError('Bestellung konnte nicht abgeschlossen werden.');
            }
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const basketTotalAmount = state.basket.financial_breakdown?.total_amount || 0;

    return (
        <div className='relative'>
            <div className={`max-w-screen-2xl mx-auto ${componentContentPadding}`}>
                <h2 className="text-2xl font-medium text-black lg:mb-6">
                    Anmeldung
                </h2>

            </div>
            <div className={`flex ${isMobileOrTablet ? 'flex-col' : 'flex-col xl:flex-row'} gap-24 max-w-screen-2xl mx-auto ${componentContentPaddingX} mb-40 lg:-mt-12`}>
                <div className={`${isMobileOrTablet ? 'w-full' : 'w-1/2'}`}>
                    {/* Registration/Login Form */}
                    <div className="flex flex-col gap-6 lg:gap-12">

                        {/* Error Message */}
                        {otpError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                                {otpError}
                            </div>
                        )}

                        {/* Login Section - Email Input */}
                        {(otpState === 'idle' || otpState === 'requesting') && !isAuthenticated && (
                            <>
                                <div className="flex flex-col lg:flex-row gap-3">
                                    <MainTextInput
                                        type="email"
                                        placeholder="Schon einmal bestellt? Ihre E-Mail Adresse..."
                                        value={loginEmail}
                                        onChange={(value) => setLoginEmail(value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && loginEmail && otpState === 'idle') {
                                                handleRequestOTP();
                                            }
                                        }}
                                        className="flex-1"
                                        disabled={otpState === 'requesting'}
                                    />

                                    <MainButton
                                        handleClick={handleRequestOTP}
                                        label={otpState === 'requesting' ? 'Sende...' : 'Anmelden'}
                                        disabled={otpState === 'requesting' || !loginEmail}
                                        className="w-full lg:w-auto"
                                        size='large'
                                    />
                                </div>

                                <div className="text-center text-sm text-gray-500">
                                    oder
                                </div>
                            </>
                        )}

                        {/* OTP Verification Section */}
                        {(otpState === 'sent' || otpState === 'verifying') && !isAuthenticated && (
                            <div className="space-y-10">
                                <div className="bg-[#CED9E9] border-[1.5px] border-black text-black px-4 py-3 rounded-md">
                                    Code gesendet an <strong>{otpEmail}</strong>. - <strong>15</strong> Minuten gültig.
                                </div>

                                <div className="flex justify-center">
                                    <OTPInput
                                        value={otpCode}
                                        onChange={setOtpCode}
                                        disabled={otpState === 'verifying'}
                                        error={otpError || undefined}
                                        className="w-auto"
                                        containerClassName="justify-center gap-6"
                                    />
                                </div>

                                <div className="flex gap-3">

                                    <button
                                        onClick={handleBackToEmailInput}
                                        disabled={otpState === 'verifying'}
                                        className="px-6 py-4 border-[1.5px] border-gray-900 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Zurück
                                    </button>
                                    <button
                                        onClick={handleVerifyOTP}
                                        disabled={otpState === 'verifying' || !otpCode}
                                        className="flex-1 px-6 py-4 bg-darkBlue text-white rounded-md hover:bg-darkBlue/90 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {otpState === 'verifying' ? 'Überprüfe...' : 'Anmelden'}
                                    </button>
                                </div>

                                <div className="text-center text-gray-500 mb-6">
                                    oder
                                </div>
                            </div>
                        )}

                        {/* Authenticated Customer Info */}
                        {isAuthenticated && authenticatedCustomer && (
                            <div className="bg-[#E4EDD8] border-[1.5px] border-darkBlue px-6 py-4 rounded-md mb-6">
                                Erfolgreich angemeldet als <strong>{authenticatedCustomer.first_name} {authenticatedCustomer.last_name}</strong> ({authenticatedCustomer.email})
                            </div>
                        )}

                        {/* Registration Form - Hidden when authenticated */}
                        {!isAuthenticated && (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <MainTextInput
                                        type="text"
                                        placeholder="Vorname*"
                                        value={formData.firstName}
                                        onChange={(value) => handleInputChange('firstName', value)}
                                        error={fieldErrors.firstName}
                                    />
                                    <MainTextInput
                                        type="text"
                                        placeholder="Nachname*"
                                        value={formData.lastName}
                                        onChange={(value) => handleInputChange('lastName', value)}
                                        error={fieldErrors.lastName}
                                    />
                                </div>
                                <MainTextInput
                                    type="email"
                                    placeholder="E-Mail Adresse*"
                                    value={formData.email}
                                    onChange={(value) => handleInputChange('email', value)}
                                    error={fieldErrors.email}
                                />

                                <MainTextInput
                                    type="text"
                                    placeholder="Firma (optional)"
                                    value={formData.company}
                                    onChange={(value) => handleInputChange('company', value)}
                                />



                                <MainTextInput
                                    type="text"
                                    placeholder="Straße, Hausnummer*"
                                    value={formData.street}
                                    onChange={(value) => handleInputChange('street', value)}
                                    error={fieldErrors.street}
                                />

                                <MainTextInput
                                    type="text"
                                    placeholder="Adresszusatz (optional)"
                                    value={formData.addressAdd}
                                    onChange={(value) => handleInputChange('addressAdd', value)}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <MainTextInput
                                        type="text"
                                        placeholder="Postleitzahl*"
                                        value={formData.postalCode}
                                        onChange={(value) => handleInputChange('postalCode', value)}
                                        error={fieldErrors.postalCode}
                                    />
                                    <MainTextInput
                                        type="text"
                                        placeholder="Stadt*"
                                        value={formData.city}
                                        onChange={(value) => handleInputChange('city', value)}
                                        error={fieldErrors.city}
                                    />

                                </div>
                                <MainSelect
                                    value={formData.country || 'DE'}
                                    onChange={(value) => handleInputChange('country', value)}
                                    options={COUNTRY_OPTIONS}
                                    placeholder="Land / Region*"
                                    error={fieldErrors.country}
                                />

                                {
                                    state.shippingOption && state.initData?.deliveryOptions.find(option => option.id === state.shippingOption)?.type === 'post' && (
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.differentDeliveryAddress}
                                                onChange={(e) => handleInputChange('differentDeliveryAddress', e.target.checked)}
                                                className="mr-2"
                                            />
                                            <span className="text-sm text-gray-700">Abweichende Lieferadresse</span>
                                        </label>
                                    )
                                }

                                {/* Delivery Address Form */}
                                {formData.differentDeliveryAddress && (
                                    <div className="mt-2">
                                        <h3 className="text-lg font-medium text-black mb-6">
                                            Lieferadresse
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <MainTextInput
                                                    type="text"
                                                    placeholder="Vorname*"
                                                    value={deliveryData.firstName}
                                                    onChange={(value) => handleDeliveryInputChange('firstName', value)}
                                                />
                                                <MainTextInput
                                                    type="text"
                                                    placeholder="Nachname*"
                                                    value={deliveryData.lastName}
                                                    onChange={(value) => handleDeliveryInputChange('lastName', value)}
                                                />
                                            </div>

                                            <MainTextInput
                                                type="text"
                                                placeholder="Firma (optional)"
                                                value={deliveryData.company}
                                                onChange={(value) => handleDeliveryInputChange('company', value)}
                                            />



                                            <MainTextInput
                                                type="text"
                                                placeholder="Straße, Hausnummer*"
                                                value={deliveryData.street}
                                                onChange={(value) => handleDeliveryInputChange('street', value)}
                                            />

                                            <MainTextInput
                                                type="text"
                                                placeholder="Adresszusatz (optional)"
                                                value={deliveryData.addressAdd}
                                                onChange={(value) => handleDeliveryInputChange('addressAdd', value)}
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                <MainTextInput
                                                    type="text"
                                                    placeholder="Postleitzahl*"
                                                    value={deliveryData.postalCode}
                                                    onChange={(value) => handleDeliveryInputChange('postalCode', value)}
                                                />
                                                <MainTextInput
                                                    type="text"
                                                    placeholder="Stadt*"
                                                    value={deliveryData.city}
                                                    onChange={(value) => handleDeliveryInputChange('city', value)}
                                                />
                                            </div>
                                            <MainSelect
                                                value={deliveryData.country || 'DE'}
                                                onChange={(value) => handleDeliveryInputChange('country', value)}
                                                options={COUNTRY_OPTIONS}
                                                placeholder="Land / Region*"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Authenticated Customer Summary */}
                        {isAuthenticated && authenticatedCustomer && (
                            <div className="border border-darkBlue px-6 py-4 rounded-md">
                                <h3 className="font-medium mb-6">
                                    Persönliche Daten
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-b border-gray-200 pb-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs">Name</span>
                                            <span className="font-medium text-base">{authenticatedCustomer.first_name} {authenticatedCustomer.last_name}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs">E-Mail</span>
                                            <span className="font-medium text-base">{authenticatedCustomer.email}</span>
                                        </div>
                                    </div>

                                    {/* Selected Address Display */}
                                    <div className='flex flex-col border-b border-gray-200'>
                                        <div className='flex flex-col md:flex-row gap-6  pb-6'>
                                            {/* Billing Address */}
                                            <div className="w-full">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className={`font-medium ${fieldErrors.billingAddress ? 'text-red-600' : ''}`}>Rechnungsadresse</div>
                                                    <button
                                                        onClick={() => {
                                                            setShowBillingAddressModal(true);
                                                            // Clear billing address error when opening modal
                                                            if (fieldErrors.billingAddress) {
                                                                setFieldErrors(prev => {
                                                                    const newErrors = { ...prev };
                                                                    delete newErrors.billingAddress;
                                                                    return newErrors;
                                                                });
                                                            }
                                                        }}
                                                        className="bg-gray-100 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200 transition-colors"
                                                    >
                                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M7.67272 3.99105L1 10.6637V14L4.33636 14L11.0091 7.32736M7.67272 3.99105L10.0654 1.59837L10.0669 1.59695C10.3962 1.26759 10.5612 1.10261 10.7514 1.04082C10.9189 0.986392 11.0994 0.986392 11.2669 1.04082C11.4569 1.10257 11.6217 1.26736 11.9506 1.59625L13.4018 3.04738C13.7321 3.37769 13.8973 3.54292 13.9592 3.73336C14.0136 3.90088 14.0136 4.08133 13.9592 4.24885C13.8973 4.43916 13.7323 4.60414 13.4025 4.93398L13.4018 4.93468L11.0091 7.32736M7.67272 3.99105L11.0091 7.32736" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                {(() => {
                                                    const selectedAddress = authenticatedCustomer.addresses.find(addr => addr.name === selectedBillingAddressName);

                                                    return selectedAddress ? (
                                                        <div className="">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    {/* <div className="flex items-center gap-2 mb-2">
                                                                    <h5 className="font-medium0">{selectedAddress.name}</h5>
                                                                </div> */}
                                                                    <div className="text-sm space-y-1">
                                                                        <p>{selectedAddress.first_name} {selectedAddress.last_name}</p>
                                                                        {selectedAddress.company && <p>{selectedAddress.company}</p>}
                                                                        <p>{selectedAddress.street}</p>
                                                                        {selectedAddress.address_add && <p>{selectedAddress.address_add}</p>}
                                                                        <p>{selectedAddress.postcode} {selectedAddress.city}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="">
                                                            <p className="text-gray-500 text-sm mb-2">Keine Rechnungsadresse hinterlegt</p>
                                                            <button
                                                                onClick={() => setShowBillingAddressModal(true)}
                                                                className="px-3 py-1 text-sm text-darkBlue border border-darkBlue rounded-md hover:bg-darkBlue hover:text-white transition-colors"
                                                            >
                                                                Adresse hinzufügen
                                                            </button>
                                                        </div>
                                                    );
                                                })()
                                                }
                                                {fieldErrors.billingAddress && (
                                                    <p className="mt-2 text-sm text-red-600">{fieldErrors.billingAddress}</p>
                                                )}
                                            </div>

                                            {/* Delivery Address Option */}
                                            <div className="w-full">
                                                {useDifferentDeliveryAddress && (
                                                    <div>
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div className="font-medium">Lieferadresse</div>
                                                            <button
                                                                onClick={() => setShowDeliveryAddressModal(true)}
                                                                className="bg-gray-100 rounded-sm p-2 hover:cursor-pointer hover:bg-gray-200 transition-colors"
                                                            >
                                                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M7.67272 3.99105L1 10.6637V14L4.33636 14L11.0091 7.32736M7.67272 3.99105L10.0654 1.59837L10.0669 1.59695C10.3962 1.26759 10.5612 1.10261 10.7514 1.04082C10.9189 0.986392 11.0994 0.986392 11.2669 1.04082C11.4569 1.10257 11.6217 1.26736 11.9506 1.59625L13.4018 3.04738C13.7321 3.37769 13.8973 3.54292 13.9592 3.73336C14.0136 3.90088 14.0136 4.08133 13.9592 4.24885C13.8973 4.43916 13.7323 4.60414 13.4025 4.93398L13.4018 4.93468L11.0091 7.32736M7.67272 3.99105L11.0091 7.32736" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        {(() => {
                                                            const selectedAddress = authenticatedCustomer.addresses.find(addr => addr.name === selectedDeliveryAddressName);

                                                            return selectedAddress ? (
                                                                <div className="">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            {/* <div className="flex items-center gap-2 mb-2">
                                                                            <h5 className="font-medium">{selectedAddress.name}</h5>
                                                                        </div> */}
                                                                            <div className="text-sm space-y-1">
                                                                                <p>{selectedAddress.first_name} {selectedAddress.last_name}</p>
                                                                                {selectedAddress.company && <p>{selectedAddress.company}</p>}
                                                                                <p>{selectedAddress.street}</p>
                                                                                {selectedAddress.address_add && <p>{selectedAddress.address_add}</p>}
                                                                                <p>{selectedAddress.postcode} {selectedAddress.city}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="">
                                                                    <p className="text-gray-500 text-sm mb-2">Keine Lieferadresse hinterlegt</p>
                                                                    <button
                                                                        onClick={() => setShowDeliveryAddressModal(true)}
                                                                        className="px-3 py-1 text-sm text-darkBlue border border-darkBlue rounded-md hover:bg-darkBlue hover:text-white transition-colors"
                                                                    >
                                                                        Adresse hinzufügen
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-3 mb-4 col-span-2">
                                            <input
                                                type="checkbox"
                                                checked={useDifferentDeliveryAddress}
                                                onChange={(e) => {
                                                    setUseDifferentDeliveryAddress(e.target.checked);
                                                    if (!e.target.checked) {
                                                        // Use billing address for delivery
                                                        setSelectedDeliveryAddressName(selectedBillingAddressName);
                                                    }
                                                }}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-black font-medium">Andere Lieferadresse verwenden</span>
                                        </label>
                                    </div>
                                </div>

                                <button onClick={handleLogout} className='flex w-full hover:font-medium gap-4 items-center justify-center mt-6 mb-2'>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 10.8125L10.8125 8M10.8125 8L8 5.1875M10.8125 8H0.5M5.1875 3.54555V3.50018C5.1875 2.45008 5.1875 1.92464 5.39186 1.52356C5.57163 1.17076 5.85826 0.884125 6.21106 0.704363C6.61214 0.5 7.13758 0.5 8.18768 0.5H12.5002C13.5503 0.5 14.0746 0.5 14.4757 0.704363C14.8285 0.884125 15.1161 1.17076 15.2958 1.52356C15.5 1.92425 15.5 2.44906 15.5 3.4971V12.5034C15.5 13.5514 15.5 14.0754 15.2958 14.4761C15.1161 14.8289 14.8285 15.1161 14.4757 15.2958C14.075 15.5 13.5509 15.5 12.5029 15.5H8.1846C7.13656 15.5 6.61175 15.5 6.21106 15.2958C5.85826 15.1161 5.57163 14.8287 5.39186 14.4759C5.1875 14.0748 5.1875 13.5501 5.1875 12.5V12.4531" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                    <span>Abmelden</span>
                                </button>
                            </div>
                        )}

                        {/* Payment Methods */}
                        {basketTotalAmount > 0 && (
                            <div>
                                <h2 className="text-2xl font-medium text-black my-6">
                                    Zahlung
                                </h2>

                                <div className="space-y-3">
                                    {availablePaymentMethods.map((method) => (
                                        <button key={method.id} onClick={() => {
                                            setPaymentMethod(method);
                                            // Clear payment method error when selected
                                            if (fieldErrors.paymentMethod) {
                                                setFieldErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.paymentMethod;
                                                    return newErrors;
                                                });
                                            }
                                        }} className={`flex w-full gap-6 items-center border rounded-md p-4 hover:cursor-pointer transition-colors hover:bg-gray-50 ${fieldErrors.paymentMethod ? 'border-red-500' : 'border-gray-900'
                                            }`}>
                                            <div className={`w-5 h-5 border rounded-full ${fieldErrors.paymentMethod ? 'border-red-500' : 'border-gray-900'
                                                } ${paymentMethod?.id === method.id ? 'bg-darkBlue' : ''}`}></div>
                                            <span className='text-lg flex-grow text-left'>{method.label}</span>
                                        </button>
                                    ))}
                                </div>
                                {fieldErrors.paymentMethod && (
                                    <p className="mt-2 text-sm text-red-600">{fieldErrors.paymentMethod}</p>
                                )}
                                {orderError && (
                                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">Bestellfehler</p>
                                                <p className="mt-1 text-sm">{orderError}</p>
                                                {/* <p className="mt-1 text-sm">Sollte der Fehler weiterhin auftreten, aktualisieren Sie die Seite und versuchen Sie es erneut.</p> */}

                                                {/* Show additional info for seat conflicts */}
                                                {orderResult?.error?.type === 'seat_conflict' && (
                                                    <div className="mt-3 text-xs">
                                                        {orderResult.error.bookedSeats && orderResult.error.bookedSeats.length > 0 && (
                                                            <p>Bereits gebuchte Plätze: {orderResult.error.bookedSeats.join(', ')}</p>
                                                        )}
                                                        {orderResult.error.reservedSeats && orderResult.error.reservedSeats.length > 0 && (
                                                            <p>Reservierte Plätze: {orderResult.error.reservedSeats.join(', ')}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Retry button for retryable errors */}
                                            {orderResult?.error && isRetryableError(orderResult.error) && (
                                                <button
                                                    onClick={handlePayment}
                                                    disabled={isPlacingOrder}
                                                    className="ml-3 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
                                                >
                                                    Erneut versuchen
                                                </button>
                                            )}

                                            {/* Back to seat selection for seat conflicts */}
                                            {orderResult?.error && requiresSeatReselection(orderResult.error) && (
                                                <button
                                                    onClick={() => goToStep('sitzplatz')}
                                                    className="ml-3 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
                                                >
                                                    Plätze neu wählen
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Terms and Conditions */}
                        <div>
                            <div className="space-y-3">
                                <label className={`flex items-start ${fieldErrors.terms ? 'text-red-600' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={acceptedTerms}
                                        onChange={(e) => {
                                            setAcceptedTerms(e.target.checked);
                                            // Clear terms error when checked
                                            if (e.target.checked && fieldErrors.terms) {
                                                setFieldErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.terms;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className={`mt-1 mr-3 checkbox-darkBlue ${fieldErrors.terms ? 'error' : ''}`}
                                    />
                                    <span className={`text-sm pt-0.5 ${fieldErrors.terms ? 'text-red-600' : 'text-gray-600'}`}>
                                        Ich akzeptiere die <a href="/de/agb/" target="_blank" className="text-darkBlue underline">Allgemeinen Geschäftsbedingungen</a>
                                    </span>
                                </label>
                                {fieldErrors.terms && (
                                    <p className="text-sm text-red-600 ml-8">{fieldErrors.terms}</p>
                                )}
                                <label className={`flex items-start ${fieldErrors.privacy ? 'text-red-600' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={acceptedPrivacy}
                                        onChange={(e) => {
                                            setAcceptedPrivacy(e.target.checked);
                                            // Clear privacy error when checked
                                            if (e.target.checked && fieldErrors.privacy) {
                                                setFieldErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.privacy;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className={`mt-1 mr-3 checkbox-darkBlue ${fieldErrors.privacy ? 'error' : ''}`}
                                    />
                                    <span className={`text-sm pt-0.5 ${fieldErrors.privacy ? 'text-red-600' : 'text-gray-600'}`}>
                                        Ich habe die <a href="/de/datenschutz/" target="_blank" className="text-darkBlue underline">Datenschutzerklärung</a> gelesen und akzeptiert
                                    </span>
                                </label>
                                {fieldErrors.privacy && (
                                    <p className="text-sm text-red-600 ml-8">{fieldErrors.privacy}</p>
                                )}
                            </div>
                        </div>

                        <div className='space-y-4'>
                            {/* Order Button */}
                            <button
                                onClick={handlePayment}
                                disabled={isPlacingOrder}
                                className="w-full px-12 py-4 bg-darkBlue text-white rounded-md hover:bg-darkBlue/90 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isPlacingOrder ? 'Wird gesendet…' : 'Verbindlich bestellen'}
                            </button>

                            <button
                                onClick={() => {
                                    if (state.flowMode === 'vouchers') {
                                        dispatch({ type: 'SET_STEP', payload: 'gutscheine' });
                                    } else {
                                        goToPreviousStep();
                                    }
                                }}
                                className="flex h-14 items-center justify-center group hover:bg-darkBlue hover:text-white hover:cursor-pointer transition-colors duration-300 px-8 py-4 border-[1.5px] border-gray-900 rounded-md w-full">
                                <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path className='fill-[#19263D] group-hover:fill-white' d="M6.459 14.0256L0.671394 8.28344L6.459 8.28344C4.34875 8.28344 3.28794 10.8312 4.77463 12.3289L6.459 14.0256Z" />
                                    <path className='fill-[#19263D] group-hover:fill-white' d="M0.671394 8.28344L4.5298 4.45532L6.459 2.54126L4.77738 4.22181C3.27799 5.72023 4.33923 8.28344 6.459 8.28344L0.671394 8.28344Z" />
                                    <path className='stroke-[#19263D] group-hover:stroke-white' d="M17.5151 8.28344L6.459 8.28344M0.671395 8.28344L4.5298 4.45532L6.459 2.54126M0.671395 8.28344L6.459 14.0256M0.671395 8.28344L6.459 8.28344M8.3882 0.627197L6.459 2.54126M8.3882 15.9397L6.459 14.0256M6.459 2.54126L4.77738 4.22181C3.27799 5.72023 4.33923 8.28344 6.459 8.28344M6.459 14.0256L4.77463 12.3289C3.28794 10.8312 4.34875 8.28344 6.459 8.28344" stroke-width="1.22332" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>


                                <span className='flex-grow'>{state.flowMode === 'vouchers' ? 'Zurück zu Gutscheinen' : 'Zurück zum Warenkorb'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right summary column: hidden on mobile, becomes bottom panel */}
                <div className={`flex flex-col rounded-lg bg-white shadow-[0_0_20px_rgba(0,0,0,0.08)] ${isMobileOrTablet ? 'hidden' : 'w-1/2'} h-full p-16 sticky top-6`}>
                    {/* Order Summary */}
                    <h1 className="text-2xl font-medium text-black mb-12">
                        Bestellübersicht
                    </h1>

                    {/* Tickets Section (unified with SeatSelection layout) */}
                    {state.basket.line_items.filter(item => item.type === 'ticket').length > 0 && (
                        <>
                            <h2 className="text-xl font-medium">Tickets</h2>
                            <div className="space-y-2">
                                {(() => {
                                    const { grouped, individual } = groupTicketsForDisplay();

                                    return (
                                        <>
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
                                                                        Bestplatz
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveGroupedTickets(firstTicket.seat_group_id, firstTicket.price_category.id)}
                                                                className="w-10 h-10 flex items-center justify-center text-black/60 hover:text-black rounded"
                                                                title="Alle Tickets dieser Kategorie entfernen"
                                                            >
                                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                                            {individual.map((ticketItem) => {
                                                return (
                                                    <div className="flex flex-col gap-3 py-6 border-t border-black first:border-t-0">
                                                        <div key={ticketItem.id} className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-4 w-full">
                                                                <div className='flex flex-col gap-2 w-full'>
                                                                    <div className="text-base font-medium text-black">
                                                                        {(ticketItem as TicketLineItem).free_seat_selection ? `${ticketItem.seat_group_name} - Freie Platzwahl` : getSeatDisplayNameWithSeatGroupName(ticketItem.seat, ticketItem.seat_group_name, state.language)}
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
                                                                        label: `${typeof price.category_name === 'string' ? price.category_name : (price.category_name as { de?: { value?: string } })?.de?.value || 'Preiskategorie'} - ${formatPrice(price.price)}`
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
                                                        {(() => {
                                                            // Check if pre-show is available for this ticket (link_key-aware)
                                                            const ticketPriceLinkKeyA = ticketItem.price_category?.link_key;
                                                            const preShowProductsAAll = state.selectedShow?.cross_selling_products?.filter(product => product.type_name === FrontendCrossSellingProductType.PRE_SHOW) || [];
                                                            const preShowProductsA = preShowProductsAAll.filter(product => {
                                                                const keys = product.link_keys || [];
                                                                if (keys.length === 0) return true;
                                                                if (!ticketPriceLinkKeyA) return false;
                                                                return keys.includes(ticketPriceLinkKeyA);
                                                            });
                                                            const availablePreShowCount = preShowProductsA.length;
                                                            const ticketHasPreShow = hasTicketPreShow(ticketItem.id);
                                                            const defaultPreShowProduct = preShowProductsA[0];
                                                            const selectedPreShowProduct = ticketHasPreShow ? state.basket.line_items.find(item => item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW && (item as TicketAddOnLineItem).ticket_line_item_id === ticketItem.id) as TicketAddOnLineItem | null : null;

                                                            return (
                                                                <>
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
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </div>
                        </>
                    )}

                    {/* Cross-Selling Items Section (grouped summary, exclude add-ons) */}
                    {(() => {
                        const items = state.basket.line_items.filter(item => item.type === 'crossselling' && [FrontendCrossSellingProductType.PROGRAMM_BOOKLET, FrontendCrossSellingProductType.GASTRONOMY_VOUCHER].includes((item as CrossSellingLineItem).cross_selling_product_type) && !(item as any).ticket_line_item_id) as CrossSellingLineItem[];
                        if (items.length === 0) return null;
                        const groups = new Map<string, CrossSellingLineItem[]>();
                        for (const it of items) {
                            const key = it.product_id;
                            const arr = groups.get(key) || [];
                            arr.push(it);
                            groups.set(key, arr);
                        }
                        const rows: React.ReactNode[] = [];
                        let index = 0;
                        groups.forEach((arr) => {
                            const sample = arr[0];
                            if (!sample) return;
                            const count = arr.length;
                            const unitPrice = Number(sample.unit_price || 0);
                            rows.push(
                                <div key={`${sample.product_id}-row-${index}`} className={`flex justify-between py-6 ${index > 0 ? 'border-t border-gray-200' : ''}`}>
                                    <div className="text-xl">
                                        {count}x {sample.name}
                                    </div>
                                    <div className="text-xl">
                                        {formatPrice(unitPrice * count)}
                                    </div>
                                </div>
                            );
                            index += 1;
                        });
                        return (
                            <>
                                <h2 className="text-xl font-medium mt-12">Zusätzliche Produkte</h2>
                                {rows}
                            </>
                        );
                    })()}

                    {/* Vouchers Section */}
                    {state.basket.line_items.filter(item => item.type === 'voucher').length > 0 && (
                        <>
                            <h2 className="text-xl font-medium mt-12">Gutscheine</h2>
                            {state.basket.line_items
                                .filter(item => item.type === 'voucher')
                                .map((item, index) => (
                                    <div key={item.id} className={`flex justify-between py-6 ${index > 0 ? 'border-t border-gray-200' : ''}`}>
                                        <div className="text-xl">
                                            {item.quantity}x {item.name} ({item.voucher_product_type === 'digital' ? 'Digital' : 'Gedruckt'} )
                                        </div>
                                        <div className="text-xl">
                                            {formatPrice(item.total_price)}
                                        </div>
                                    </div>
                                ))}
                        </>
                    )}

                    {/* Shipping Option Display */}
                    <div className="border-t border-gray-200 pt-6 mb-6 mt-12">
                        <h3 className="text-xl font-medium">Versandoption </h3>
                        <div className="flex justify-between text-xl py-6">
                            <span>
                                {state.initData?.deliveryOptions.find(option => option.id === state.shippingOption)?.name}
                            </span>
                            <span>
                                {state.initData?.deliveryOptions.find(option => option.id === state.shippingOption)?.fee_amount && `${formatPrice(state.initData?.deliveryOptions.find(option => option.id === state.shippingOption)?.fee_amount || 0)}`}
                            </span>
                        </div>
                    </div>

                    <div className="mt-8">
                        <div className="flex flex-col gap-2">
                            {/* Subtotal */}
                            <div className="flex justify-between text-sm">
                                <span>Zwischensumme:</span>
                                <span>{formatPrice(state.basket.financial_breakdown?.subtotal || 0)}</span>
                            </div>

                            {/* System Fee */}
                            {state.basket.financial_breakdown?.total_system_fee && state.basket.financial_breakdown?.total_system_fee > 0 ? (
                                <div className="flex justify-between text-xs">
                                    <span>inkl. Systemgebühr:</span>
                                    <span>{formatPrice(state.basket.financial_breakdown?.total_system_fee || 0)}</span>
                                </div>
                            ) : null}

                            {/* Applied Coupons (non-voucher) */}
                            {state.basket.line_items && state.basket.line_items.filter(item => item.type === 'coupon' && !(item as CouponLineItem).is_voucher).length > 0 ? (
                                <div className="space-y-1">
                                    {state.basket.line_items
                                        .filter(item => item.type === 'coupon' && !(item as CouponLineItem).is_voucher)
                                        .map((item) => {
                                            const couponItem = item as CouponLineItem;
                                            const isRefunded = (couponItem as unknown as { refunded?: boolean }).refunded === true;
                                            return (
                                                <div key={couponItem.id} className={`flex justify-between text-xs text-gray-700 ${isRefunded ? 'line-through opacity-60' : ''}`}>
                                                    <span>→ Rabattcode: {couponItem.coupon_code}</span>
                                                    <span>-{formatPrice(Math.abs(couponItem.total_price))}</span>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : null}

                            {/* Delivery Fee */}
                            {state.basket.financial_breakdown?.delivery_fee && state.basket.financial_breakdown?.delivery_fee > 0 ? (
                                <div className="flex justify-between text-sm">
                                    <span>zzgl.Liefergebühr:</span>
                                    <span>{formatPrice(state.basket.financial_breakdown?.delivery_fee || 0)}</span>
                                </div>
                            ) : null}

                            {/* VAT Breakdown */}
                            {state.basket.financial_breakdown?.vat_breakdown && state.basket.financial_breakdown?.vat_breakdown.length > 0 ? (
                                <div className="space-y-1">
                                    {state.basket.financial_breakdown?.vat_breakdown.map((vatItem, index) => (
                                        <div key={index} className="flex justify-between text-[10px]">
                                            <span>inkl. MwSt. {vatItem.rate}%:</span>
                                            <span>{formatPrice(vatItem.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex justify-between text-[10px]">
                                    <span>inkl. MwSt.:</span>
                                    <span>{formatPrice(state.basket.financial_breakdown?.total_vat || 0)}</span>
                                </div>
                            )}

                            {/* Invoice Total */}
                            {typeof state.basket.financial_breakdown?.invoice_total === 'number' ? (
                                <div className="flex justify-between items-center pt-4">
                                    <span className="text-base font-medium">Rechnungsbetrag:</span>
                                    <span className="text-base font-medium">{formatPrice(state.basket.financial_breakdown?.invoice_total || 0)}</span>
                                </div>
                            ) : null}

                            {/* Applied Vouchers */}
                            {state.basket.line_items && state.basket.line_items.filter(item => item.type === 'coupon' && (item as CouponLineItem).is_voucher).length > 0 ? (
                                <div className="space-y-1">
                                    {state.basket.line_items
                                        .filter(item => item.type === 'coupon' && (item as CouponLineItem).is_voucher)
                                        .map((item) => {
                                            const couponItem = item as CouponLineItem;
                                            const isRefunded = (couponItem as unknown as { refunded?: boolean }).refunded === true;
                                            const remainingBalance = couponItem.voucher_remaining_balance ? formatPrice(couponItem.voucher_remaining_balance) : '0';
                                            return (
                                                <div key={couponItem.id} className={`flex justify-between text-xs text-gray-700 mr-2 ${isRefunded ? 'line-through opacity-60' : ''}`}>
                                                    <span>→ Gutschein: {couponItem.coupon_code} (Restguthaben: {remainingBalance})</span>
                                                    <span className='whitespace-nowrap'>-{formatPrice(Math.abs(couponItem.total_price))}</span>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : null}

                            {/* Total */}
                            <div className="flex justify-between items-center pt-6 border-t border-gray-700 mt-4">
                                <span className="text-lg font-semibold">Zu zahlender Betrag:</span>
                                <span className="text-xl font-semibold">{formatPrice(state.basket.financial_breakdown?.total_amount || 0)}</span>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Address Modals */}
            {isAuthenticated && authenticatedCustomer && (
                <>
                    <CustomerAddressModal
                        isOpen={showBillingAddressModal}
                        onClose={() => setShowBillingAddressModal(false)}
                        customer={authenticatedCustomer}
                        parentSelectedAddressName={selectedBillingAddressName}
                        onSelectedAddressChange={(name) => {
                            setSelectedBillingAddressName(name);
                            // Clear billing address error when address is selected
                            if (fieldErrors.billingAddress) {
                                setFieldErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.billingAddress;
                                    return newErrors;
                                });
                            }
                        }}
                    />
                    <CustomerAddressModal
                        isOpen={showDeliveryAddressModal}
                        onClose={() => setShowDeliveryAddressModal(false)}
                        customer={authenticatedCustomer}
                        parentSelectedAddressName={selectedDeliveryAddressName}
                        onSelectedAddressChange={setSelectedDeliveryAddressName}
                    />
                </>
            )}

            {/* Mobile Bottom Panel (basket summary) */}
            {isMobileOrTablet && (
                <div className={`sticky bottom-0 left-0 right-0 z-20 shadow-[0_0_50px_rgba(0,0,0,0.15)] rounded-t-3xl overflow-hidden ${isTablet ? 'mx-6' : ''}`} style={{ paddingBottom: isIOSSafari() ? 'env(safe-area-inset-bottom)' : undefined }}>
                    {/* Tab Header */}
                    <div
                        className={`bg-white border-t border-gray-200 px-6 py-4 lg:py-6 cursor-pointer transition-all duration-300 font-medium text-lg lg:text-xl`}
                        onClick={() => setIsTabExpanded(!isTabExpanded)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <svg
                                    className={`w-6 h-6 transition-transform duration-300 ${isTabExpanded ? '' : 'rotate-180'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                <span className="">
                                    {/* {state.basket.line_items.filter(item => item.type === 'ticket').length} Tickets */}
                                    Zu zahlender Betrag
                                </span>
                            </div>
                            <div className="">
                                {formatPrice(state.basket.financial_breakdown?.total_amount || 0)}
                            </div>
                        </div>
                    </div>

                    {/* Expanded Content */}
                    <div className={`bg-white transition-all duration-300 ease-in-out overflow-hidden ${isTabExpanded ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'}`}>
                        {/* Order Summary (same data as right column, simplified for mobile) */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
                            {state.basket.line_items.filter(item => item.type === 'ticket').length > 0 && (
                                <>
                                    <h3 className="text-lg font-medium mb-4">Tickets</h3>
                                    <div className="space-y-4">
                                        {(() => {
                                            const { grouped, individual } = groupTicketsForDisplay();

                                            return (
                                                <>
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
                                                                                Bestplatz
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

                                                    {individual.map((ticketItem) => {
                                                        return (
                                                            <div key={ticketItem.id} className="py-4 border-b border-gray-100">
                                                                <div className="flex items-start justify-between mb-3">
                                                                    <div className="flex items-start gap-3 flex-1">
                                                                        <div className='flex flex-col gap-2 w-full'>
                                                                            <div className="font-medium text-base text-black">
                                                                                {(ticketItem as TicketLineItem).free_seat_selection ? `${ticketItem.seat_group_name} - Freie Platzwahl` : getSeatDisplayNameWithSeatGroupName(ticketItem.seat, ticketItem.seat_group_name, state.language)}
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
                                                                                label: `${typeof price.category_name === 'string' ? price.category_name : (price.category_name as { de?: { value?: string } })?.de?.value || 'Preiskategorie'} - ${formatPrice(price.price)}`
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
                                                                {(() => {
                                                                    // Check if pre-show is available for this ticket (link_key-aware)
                                                                    const ticketPriceLinkKeyB = ticketItem.price_category?.link_key;
                                                                    const preShowProductsBAll = state.selectedShow?.cross_selling_products?.filter(product => product.type_name === FrontendCrossSellingProductType.PRE_SHOW) || [];
                                                                    const preShowProductsB = preShowProductsBAll.filter(product => {
                                                                        const keys = product.link_keys || [];
                                                                        if (keys.length === 0) return true;
                                                                        if (!ticketPriceLinkKeyB) return false;
                                                                        return keys.includes(ticketPriceLinkKeyB);
                                                                    });
                                                                    const availablePreShowCount = preShowProductsB.length;
                                                                    const ticketHasPreShow = hasTicketPreShow(ticketItem.id);
                                                                    const defaultPreShowProduct = preShowProductsB[0];
                                                                    const selectedPreShowProduct = ticketHasPreShow ? state.basket.line_items.find(item => item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW && (item as TicketAddOnLineItem).ticket_line_item_id === ticketItem.id) as TicketAddOnLineItem | null : null;

                                                                    return (
                                                                        <>
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
                                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <circle cx="12" cy="12" r="10" />
                                                                                                <path d="M12 8v8M8 12h8" />
                                                                                            </svg>
                                                                                            <span>{defaultPreShowProduct?.action_label ? defaultPreShowProduct?.action_label : 'Vorprogramm hinzufügen'}</span>
                                                                                            {
                                                                                                availablePreShowCount === 1 ? <span> ({formatPrice(defaultPreShowProduct?.price || 0)})</span> : null
                                                                                            }
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </>
                            )}

                            {(() => {
                                const items = state.basket.line_items.filter(item =>
                                    item.type === 'crossselling' &&
                                    [FrontendCrossSellingProductType.PROGRAMM_BOOKLET, FrontendCrossSellingProductType.GASTRONOMY_VOUCHER].includes((item as CrossSellingLineItem).cross_selling_product_type) &&
                                    !(item as any).ticket_line_item_id
                                ) as CrossSellingLineItem[];
                                if (items.length === 0) return null;

                                const groups = new Map<string, CrossSellingLineItem[]>();
                                for (const it of items) {
                                    const key = it.product_id;
                                    const arr = groups.get(key) || [];
                                    arr.push(it);
                                    groups.set(key, arr);
                                }

                                return (
                                    <>
                                        <h3 className="text-lg font-medium mt-6">Zusätzliche Produkte</h3>
                                        {[...groups.values()].map((arr, idx) => {
                                            const sample = arr[0];
                                            if (!sample) return null;
                                            const count = arr.length;
                                            const unitPrice = Number(sample.unit_price || 0);
                                            return (
                                                <div key={`${sample.product_id}-group-${idx}`} className="flex justify-between py-3 border-b border-gray-100">
                                                    <div className="text-base">{count}x {sample.name}</div>
                                                    <div className="text-base font-medium">{formatPrice(unitPrice * count)}</div>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}

                            {state.basket.line_items.filter(item => item.type === 'voucher').length > 0 && (
                                <>
                                    <h3 className="text-lg font-medium mt-6">Gutscheine</h3>
                                    {state.basket.line_items
                                        .filter(item => item.type === 'voucher')
                                        .map((item) => (
                                            <div key={item.id} className="flex justify-between py-3 border-b border-gray-100">
                                                <div className="text-base">{item.quantity}x {item.name}</div>
                                                <div className="text-base font-medium">{formatPrice(item.total_price)}</div>
                                            </div>
                                        ))}
                                </>
                            )}

                            <div className='mt-8'>
                                <div className="flex flex-col gap-2">
                                    {/* Subtotal */}
                                    <div className="flex justify-between text-sm">
                                        <span>Zwischensumme:</span>
                                        <span>{formatPrice(state.basket.financial_breakdown?.subtotal || 0)}</span>
                                    </div>

                                    {/* System Fee */}
                                    {state.basket.financial_breakdown?.total_system_fee && state.basket.financial_breakdown?.total_system_fee > 0 ? (
                                        <div className="flex justify-between text-xs">
                                            <span>inkl. Systemgebühr:</span>
                                            <span>{formatPrice(state.basket.financial_breakdown?.total_system_fee || 0)}</span>
                                        </div>
                                    ) : null}

                                    {/* Applied Coupons (non-voucher) */}
                                    {state.basket.line_items && state.basket.line_items.filter(item => item.type === 'coupon' && !(item as CouponLineItem).is_voucher).length > 0 ? (
                                        <div className="space-y-1">
                                            {state.basket.line_items
                                                .filter(item => item.type === 'coupon' && !(item as CouponLineItem).is_voucher)
                                                .map((item) => {
                                                    const couponItem = item as CouponLineItem;
                                                    const isRefunded = (couponItem as unknown as { refunded?: boolean }).refunded === true;
                                                    return (
                                                        <div key={couponItem.id} className={`flex justify-between text-xs text-gray-700 ${isRefunded ? 'line-through opacity-60' : ''}`}>
                                                            <span>→ Rabattcode: {couponItem.coupon_code}</span>
                                                            <span>-{formatPrice(Math.abs(couponItem.total_price))}</span>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    ) : null}

                                    {/* Delivery Fee */}
                                    {state.basket.financial_breakdown?.delivery_fee && state.basket.financial_breakdown?.delivery_fee > 0 ? (
                                        <div className="flex justify-between text-sm">
                                            <span>zzgl.Liefergebühr:</span>
                                            <span>{formatPrice(state.basket.financial_breakdown?.delivery_fee || 0)}</span>
                                        </div>
                                    ) : null}

                                    {/* VAT Breakdown */}
                                    {state.basket.financial_breakdown?.vat_breakdown && state.basket.financial_breakdown?.vat_breakdown.length > 0 ? (
                                        <div className="space-y-1">
                                            {state.basket.financial_breakdown?.vat_breakdown.map((vatItem, index) => (
                                                <div key={index} className="flex justify-between text-[10px]">
                                                    <span>inkl. MwSt. {vatItem.rate}%:</span>
                                                    <span>{formatPrice(vatItem.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex justify-between text-[10px]">
                                            <span>inkl. MwSt.:</span>
                                            <span>{formatPrice(state.basket.financial_breakdown?.total_vat || 0)}</span>
                                        </div>
                                    )}

                                    {/* Invoice Total */}
                                    {typeof state.basket.financial_breakdown?.invoice_total === 'number' ? (
                                        <div className="flex justify-between items-center pt-4">
                                            <span className="text-base font-medium">Rechnungsbetrag:</span>
                                            <span className="text-base font-medium">{formatPrice(state.basket.financial_breakdown?.invoice_total || 0)}</span>
                                        </div>
                                    ) : null}

                                    {/* Applied Vouchers */}
                                    {state.basket.line_items && state.basket.line_items.filter(item => item.type === 'coupon' && (item as CouponLineItem).is_voucher).length > 0 ? (
                                        <div className="space-y-1">
                                            {state.basket.line_items
                                                .filter(item => item.type === 'coupon' && (item as CouponLineItem).is_voucher)
                                                .map((item) => {
                                                    const couponItem = item as CouponLineItem;
                                                    const isRefunded = (couponItem as unknown as { refunded?: boolean }).refunded === true;
                                                    const remainingBalance = couponItem.voucher_remaining_balance ? formatPrice(couponItem.voucher_remaining_balance) : '0';
                                                    return (
                                                        <div key={couponItem.id} className={`flex justify-between text-xs text-gray-700 mr-2 ${isRefunded ? 'line-through opacity-60' : ''}`}>
                                                            <span>→ Gutschein: {couponItem.coupon_code} (Restguthaben: {remainingBalance})</span>
                                                            <span className='whitespace-nowrap'>-{formatPrice(Math.abs(couponItem.total_price))}</span>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    ) : null}

                                    {/* Total */}
                                    <div className="flex justify-between items-center pt-6 border-t border-gray-700 mt-4">
                                        <span className="text-lg font-semibold">Zu zahlender Betrag:</span>
                                        <span className="text-xl font-semibold">{formatPrice(state.basket.financial_breakdown?.total_amount || 0)}</span>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* iOS bottom safe-area background shim (all iOS browsers) */}
            {isIOSDevice() && (
                <div aria-hidden={true} className="fixed bottom-0 left-0 right-0 z-10 pointer-events-none bg-white" style={{ height: 'env(safe-area-inset-bottom)' }} />
            )}

            {/* Pre-show Price Selection Modal */}
            <PreShowPriceSelectionModal
                isOpen={preShowModalData.isOpen}
                onClose={handleClosePreShowModal}
                preShowProducts={preShowModalData.products}
                onSelectPriceCategory={handlePreShowSelection}
            />
        </div>
    );
}