import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBooking } from '../contexts/BookingContext';
import { useAuth } from '../contexts/AuthContext';
import { componentContentPadding } from '../../../lib/utils';
import { releaseReservation, releaseReservationsBySession } from '../api/reservations';
import type { TicketLineItem, CrossSellingLineItem, TicketAddOnLineItem, CouponLineItem } from '../types/lineItem';
import { FrontendCrossSellingProductType, type CrossSellingProductData } from '../types/crossSellingProduct';
import { formatPrice, formatPriceValue } from '../utils/priceFormatting';
import { generateUUID } from '../utils/uuid';
import { getMediaUrl } from '../utils/media';
import { couponsApi } from '../api/coupons';
import { checkForDuplicateCoupons, buildCouponApplicationContext } from '../utils/couponHelpers';
import { MainSelect } from '../components/MainSelect';
import { getSeatDisplayName, getTicketRowAndSeat } from '../utils/seatInfo';
import { MainButton } from '../components/MainButton';
import { Markup } from "react-render-markup";
import PreShowPriceSelectionModal from '../components/PreShowPriceSelectionModal';
import { VoucherProductCard } from '../components/VoucherProductCard';
import { VoucherProductsModal } from '../components/VoucherProductsModal';
import { voucherProductsApi } from '../api/voucherProducts';
import { MAX_QUANTITY_PER_ORDER, type VoucherProduct } from '../types/voucherProduct';
import type { VoucherLineItem } from '../types/lineItem';
import type { EventSeriesData } from '../types/eventSeries';



export function BasketStep() {
    const { state, dispatch, goToNextStep, goToPreviousStep, canGoToNextStep, canGoToPreviousStep, releaseReservationsKeepSelections, showNotification, revalidateExistingCoupons } = useBooking();
    const { customer } = useAuth();
    const [hasAttemptedNext, setHasAttemptedNext] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [preShowModalData, setPreShowModalData] = useState<{
        isOpen: boolean;
        ticketId: string | null;
        products: CrossSellingProductData[];
    }>({
        isOpen: false,
        ticketId: null,
        products: []
    });

    // Voucher selection modal + state
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [voucherSelection, setVoucherSelection] = useState<Record<string, { type: 'digital' | 'physical'; quantity: number }>>({});
    const getVoucherSelection = useCallback((product: VoucherProduct) => (
        voucherSelection[product.id] || { type: 'digital', quantity: 1 }
    ), [voucherSelection]);
    const setVoucherType = useCallback((product: VoucherProduct, type: 'digital' | 'physical') => {
        setVoucherSelection(prev => {
            const existing = prev[product.id];
            const next = { ...(existing || { quantity: 1 }), type } as { type: 'digital' | 'physical'; quantity: number };
            if (existing && existing.type === next.type && existing.quantity === next.quantity) {
                return prev; // no-op to avoid unnecessary re-renders
            }
            return { ...prev, [product.id]: next };
        });
    }, [setVoucherSelection]);
    const setVoucherQuantity = useCallback((product: VoucherProduct, quantity: number) => {
        const q = Math.min(Math.max(1, quantity), MAX_QUANTITY_PER_ORDER);
        setVoucherSelection(prev => {
            const existing = prev[product.id];
            const next = { ...(existing || { type: 'digital' as const }), quantity: q };
            if (existing && existing.type === next.type && existing.quantity === next.quantity) {
                return prev; // no-op to avoid unnecessary re-renders
            }
            return { ...prev, [product.id]: next };
        });
    }, [setVoucherSelection]);

    // Load active voucher products
    const { data: voucherProductsData } = useQuery({
        queryKey: ['voucherProducts', 'active'],
        queryFn: async (): Promise<VoucherProduct[]> => {
            const res = await voucherProductsApi.getActive();
            if (!res.data.success || !res.data.data) throw new Error('Failed to load vouchers');
            return res.data.data;
        },
        staleTime: 5 * 60 * 1000
    });

    const series = state.initData?.availableSeries ?? [];
    const selectedSeries: EventSeriesData | undefined = series.find(s => s.id === state.selectedShow?.series_id);

    // Compute which voucher products are already in basket (hide from list/banner)
    const vouchersInBasketIds = new Set(
        state.basket.line_items
            .filter(item => item.type === 'voucher')
            .map(item => (item as VoucherLineItem).voucher_product_id)
    );
    const availableVoucherProducts = (voucherProductsData || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .filter(p => !vouchersInBasketIds.has(p.id));

    // Full list for modal (do not hide products already in basket)
    const allVoucherProductsSorted = (voucherProductsData || [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order);

    const handleAddVoucherToBasket = (product: VoucherProduct) => {
        const sel = getVoucherSelection(product);
        const unitPrice = Number(product.voucher_amount);

        const existing = state.basket.line_items.find(li =>
            li.type === 'voucher' &&
            (li as VoucherLineItem).voucher_product_id === product.id &&
            (li as VoucherLineItem).voucher_product_type === sel.type
        ) as VoucherLineItem | undefined;

        if (existing) {
            const newQty = Math.min(existing.quantity + sel.quantity, MAX_QUANTITY_PER_ORDER);
            dispatch({
                type: 'UPDATE_LINE_ITEM',
                payload: { id: existing.id, item: { quantity: newQty, total_price: newQty * unitPrice } }
            });
            const added = newQty - existing.quantity;
            const qtyText = added > 0 ? ` (+${added})` : '';
            showNotification(`${product.name}${qtyText} aktualisiert`, 'success', 3000);
            setIsVoucherModalOpen(false);
            return;
        }

        const item: VoucherLineItem = {
            id: generateUUID(),
            type: 'voucher',
            name: product.name,
            quantity: sel.quantity,
            unit_price: unitPrice,
            total_price: unitPrice * sel.quantity,
            currency: product.currency || 'EUR',
            voucher_product_id: product.id,
            voucher_product: product,
            voucher_product_type: sel.type
        };
        dispatch({ type: 'ADD_LINE_ITEM', payload: item });
        const qtyText = sel.quantity > 1 ? ` (${sel.quantity}x)` : '';
        showNotification(`${product.name}${qtyText} wurde zum Warenkorb hinzugefügt`, 'success', 3000);
        setIsVoucherModalOpen(false);
    };

    const isFreeSeatSelection = state.selectedShow?.free_seat_selection;

    // Delivery option filtering: if any physical voucher exists, disallow digital delivery options
    const hasPhysicalVoucherInBasket = state.basket.line_items.some(
        (li) => li.type === 'voucher' && (li as VoucherLineItem).voucher_product_type === 'physical'
    );

    const filteredDeliveryOptions = state.initData
        ? state.initData.deliveryOptions.filter((opt) => !(hasPhysicalVoucherInBasket && opt.type === 'digital'))
        : [];

    // Clear selected shipping option if it becomes invalid (digital while physical voucher exists)
    useEffect(() => {
        if (!state.initData) return;
        if (!hasPhysicalVoucherInBasket) return;
        const selected = state.initData.deliveryOptions.find((opt) => opt.id === state.shippingOption);
        if (selected && selected.type === 'digital') {
            dispatch({ type: 'SET_SHIPPING_OPTION', payload: null });
            showNotification(
                'Digitale Versandoptionen sind für physische Gutscheine nicht verfügbar. Bitte wählen Sie eine andere Option.',
                'warning',
                4000
            );
        }
    }, [hasPhysicalVoucherInBasket, state.initData, state.shippingOption, dispatch, showNotification]);

    // Revalidate coupons when shipping option changes (delivery fee may affect coupon validity)
    useEffect(() => {
        if (!state.initData) return;
        if (state.appliedCoupons.length === 0) return;
        // Schedule revalidation when shipping option changes
        revalidateExistingCoupons?.();
    }, [state.shippingOption]);

    // Get seat groups from the selected show's pricing structure
    const seatGroups = state.selectedShow?.pricing_structure?.seat_groups || [];


    const removeItem = async (itemId: string) => {
        // console.log(`🗑️ removeItem called with itemId: ${itemId}`);

        // Find the item being removed
        const itemToRemove = state.basket.line_items.find(item => item.id === itemId);
        // console.log(`📦 Item to remove:`, itemToRemove);

        // If it's a ticket (seat) item, release the reservation
        if (itemToRemove && itemToRemove.type === 'ticket') {
            // console.log(`🎫 Item is a ticket, checking for reservation...`);
            const ticketItem = itemToRemove as TicketLineItem;
            const seatNumber = ticketItem.seat.seat_number;
            // console.log(`🎫 Seat ID: ${seatNumber}`);

            // console.log(`📋 Current reservation data:`, state.reservationData);
            // console.log(`📋 Available reservations:`, state.reservationData?.reservations);

            // Find the corresponding reservation
            const reservation = state.reservationData?.reservations.find(
                res => res.seat_id === seatNumber
            );

            const sessionSeatId = `${state.sessionId}_${seatNumber}`;


            // console.log(`🔍 Found reservation:`, reservation);

            if (reservation) {
                try {
                    // console.log(`🌐 Calling releaseReservation API...`);
                    const result = await releaseReservation(sessionSeatId);
                    // console.log(`✅ Successfully released reservation for seat ${seatNumber}, result:`, result);
                } catch (error) {
                    console.error(`❌ Failed to release reservation for seat ${seatNumber}:`, error);
                    // Show user notification about the error
                    showNotification(
                        'Sitzplatz-Reservierung konnte nicht freigegeben werden. Bitte versuchen Sie es erneut.',
                        'warning',
                        5000
                    );
                }
            } else {
                // console.log(`⚠️ No reservation found for seat ${seatNumber}`);
                // console.log(`🔍 Available seat IDs in reservations:`, state.reservationData?.reservations.map(r => r.seat_id));
            }
        } else {
            // console.log(`📦 Item is not a ticket (type: ${itemToRemove?.type}), skipping reservation release`);
        }

        // Always remove the item from the basket, even if reservation release failed
        // console.log(`🗑️ Dispatching REMOVE_LINE_ITEM for itemId: ${itemId}`);
        dispatch({ type: 'REMOVE_LINE_ITEM', payload: itemId });
    };

    const hasTicketPreShow = (ticketId: string) => {
        const preShowAddOns = state.basket.line_items.filter(item => item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW && (item as TicketAddOnLineItem).ticket_line_item_id === ticketId) as TicketAddOnLineItem[];
        return preShowAddOns.length > 0;
    };

    const toggleTicketPreShow = (ticketId: string) => {
        // console.log(`🔄 toggleTicketPreShow called with ticketId: ${ticketId}`);

        if (hasTicketPreShow(ticketId)) {
            // Remove pre-show add-on
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

    const updateCrossSellingQuantity = (itemId: string, newQuantity: number) => {
        const original = state.basket.line_items;
        const refItem = original.find(li => li.id === itemId && li.type === 'crossselling') as CrossSellingLineItem | undefined;
        if (!refItem) return;
        // Ignore ticket add-ons here
        if ((refItem as any).ticket_line_item_id) return;

        const productId = refItem.product_id;
        const isSameGroup = (li: any) => li.type === 'crossselling' && !(li as any).ticket_line_item_id && (li as CrossSellingLineItem).product_id === productId;
        const currentGroupItems = original.filter(isSameGroup) as CrossSellingLineItem[];
        const currentCount = currentGroupItems.length;
        const targetCount = Math.max(0, Math.floor(newQuantity));

        // Determine original insertion index for this group (first occurrence)
        const originalIndexed = original.map((li, idx) => ({ li, idx }));
        const groupIndices = originalIndexed.filter(({ li }) => isSameGroup(li)).map(({ idx }) => idx);
        const insertIndex = groupIndices.length > 0 ? Math.min(...groupIndices) : original.length;

        // Build others split by original index to preserve ordering
        const othersBefore = originalIndexed.filter(({ li, idx }) => !isSameGroup(li) && idx < insertIndex).map(({ li }) => li);
        const othersAfter = originalIndexed.filter(({ li, idx }) => !isSameGroup(li) && idx >= insertIndex).map(({ li }) => li);

        if (targetCount <= 0) {
            const nextItems = [...othersBefore, ...othersAfter];
            dispatch({ type: 'SET_LINE_ITEMS', payload: nextItems });
            return;
        }

        // Keep as many existing units as possible
        const keep = currentGroupItems.slice(0, Math.min(currentCount, targetCount));
        const toAdd = targetCount - keep.length;

        const makeUnit = (base: CrossSellingLineItem): CrossSellingLineItem => ({
            id: generateUUID(),
            type: 'crossselling',
            quantity: 1,
            unit_price: Number(base.unit_price),
            total_price: Number(base.unit_price),
            currency: base.currency,
            vat_rate: base.vat_rate,
            name: base.name,
            product_id: base.product_id,
            cross_selling_product_type: base.cross_selling_product_type,
            product: base.product,
            system_fee: base.system_fee,
            system_fee_vat_rate: base.system_fee_vat_rate,
            generate_qr_code: base.generate_qr_code,
            is_refundable: base.is_refundable,
        });

        const newUnits: CrossSellingLineItem[] = Array.from({ length: Math.max(0, toAdd) }).map(() => makeUnit(refItem));
        const newGroupItems = [...keep, ...newUnits];
        const nextItems = [...othersBefore, ...newGroupItems, ...othersAfter];
        dispatch({ type: 'SET_LINE_ITEMS', payload: nextItems });
    };

    const updateVoucherQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeItem(itemId);
            return;
        }

        const item = state.basket.line_items.find(item => item.id === itemId);
        if (!item || item.type !== 'voucher') return;

        const voucherItem = item as VoucherLineItem;
        const q = Math.min(newQuantity, MAX_QUANTITY_PER_ORDER);

        dispatch({
            type: 'UPDATE_LINE_ITEM',
            payload: {
                id: itemId,
                item: { quantity: q, total_price: q * item.unit_price }
            }
        });
    };


    const handleAddCrossSellingProductToBasket = (product: CrossSellingProductData, quantity: number) => {
        const qty = Math.max(1, Math.floor(quantity || 1));
        const makeUnit = (): CrossSellingLineItem => ({
            id: generateUUID(),
            type: 'crossselling',
            quantity: 1,
            unit_price: Number(product.price),
            total_price: Number(product.price),
            currency: product.currency,
            vat_rate: product.vat_rate,
            name: product.name,
            product_id: product.id,
            cross_selling_product_type: product.type_name as FrontendCrossSellingProductType,
            product: product,
            system_fee: product.system_fee,
            system_fee_vat_rate: product.system_fee_vat_rate,
            generate_qr_code: product.generate_qr_code,
            is_refundable: product.is_refundable,
        });

        const units = Array.from({ length: qty }).map(() => makeUnit());
        const next = [...state.basket.line_items, ...units];
        dispatch({ type: 'SET_LINE_ITEMS', payload: next });

        // Show notification for non-ticket-addon cross-selling products
        const isTicketAddOn = product.type_name === FrontendCrossSellingProductType.PRE_SHOW;
        if (!isTicketAddOn) {
            const quantityText = qty > 1 ? ` (${qty}x)` : '';
            showNotification(
                `${product.name}${quantityText} wurde zum Warenkorb hinzugefügt`,
                'success',
                3000
            );
        }
    }

    const handleCouponValidation = async () => {
        if (!couponInput.trim()) {
            dispatch({ type: 'SET_COUPON_ERROR', payload: 'Bitte geben Sie einen Gutscheincode ein' });
            return;
        }

        const newCouponCode = couponInput.trim().toUpperCase();

        // Check if coupon is already applied
        if (state.appliedCoupons.includes(newCouponCode)) {
            dispatch({ type: 'SET_COUPON_ERROR', payload: 'Dieser Gutschein wurde bereits angewendet' });
            return;
        }

        dispatch({ type: 'SET_COUPON_VALIDATION_IN_PROGRESS', payload: true });
        dispatch({ type: 'SET_COUPON_ERROR', payload: null });

        try {
            // Send ALL existing coupons plus the new one for validation
            // This ensures the API can properly validate stacking and conflicts
            const allCouponCodes = [...state.appliedCoupons, newCouponCode];

            const orderContext = buildCouponApplicationContext(state, customer?.id);
            const response = await couponsApi.validate({
                codes: allCouponCodes,
                context: orderContext
            });

            if (!response.data.success) {
                dispatch({ type: 'SET_COUPON_ERROR', payload: 'Fehler bei der Gutscheinvalidierung. Bitte versuchen Sie es erneut.' });
                return;
            }

            const { validCoupons, rejectedCoupons } = response.data.data;
            // Process rejected coupons - show errors for all rejected coupons
            let hasNewCouponError = false;
            if (rejectedCoupons.length > 0) {
                // Check if the newly added coupon was rejected
                const rejectedNewCoupon = rejectedCoupons.find(rc => rc.code === newCouponCode);
                if (rejectedNewCoupon) {
                    hasNewCouponError = true;
                }

                // Show all rejection errors, prioritizing the new coupon's errors
                const allErrors = rejectedCoupons.flatMap(rc =>
                    rc.errors.map(error => `${rc.code}: ${error}`)
                );
                dispatch({ type: 'SET_COUPON_ERROR', payload: allErrors.join('; ') });
            }

            // Remove any existing coupon line items before adding the new validated set
            // This handles cases where existing coupons may have been invalidated by the new coupon
            const existingCouponItems = state.basket.line_items.filter(item => item.type === 'coupon');
            existingCouponItems.forEach(item => {
                dispatch({ type: 'REMOVE_LINE_ITEM', payload: item.id });
            });

            // Clear existing applied coupons list
            dispatch({ type: 'SET_APPLIED_COUPONS', payload: [] });

            // Add all valid coupons (both existing and new ones that passed validation)
            if (validCoupons.length > 0) {
                validCoupons.forEach(validCoupon => {
                    dispatch({ type: 'ADD_LINE_ITEM', payload: validCoupon.lineItem });
                    dispatch({ type: 'ADD_APPLIED_COUPON', payload: validCoupon.code });
                });

                // Show success notification only if the new coupon was accepted
                const newCouponWasAccepted = validCoupons.some(vc => vc.code === newCouponCode);
                if (newCouponWasAccepted) {
                    // Clear input and show success
                    setCouponInput('');
                    const newCouponDiscount = validCoupons.find(vc => vc.code === newCouponCode)?.discountAmount || 0;
                    showNotification(
                        `Gutschein erfolgreich angewendet! Ersparnis: ${formatPrice(newCouponDiscount)}`,
                        'success',
                        4000
                    );
                } else if (!hasNewCouponError) {
                    // If new coupon wasn't accepted but no specific error was shown, clear the input
                    setCouponInput('');
                }
            } else if (!hasNewCouponError) {
                // No valid coupons and no specific error for new coupon
                setCouponInput('');
            }

        } catch (error) {
            console.error('Coupon validation error:', error);
            dispatch({ type: 'SET_COUPON_ERROR', payload: 'Fehler bei der Gutscheinvalidierung. Bitte versuchen Sie es erneut.' });
        } finally {
            dispatch({ type: 'SET_COUPON_VALIDATION_IN_PROGRESS', payload: false });
        }
    };

    const removeCoupon = (couponCode: string) => {
        // Find and remove the coupon line item
        const couponLineItem = state.basket.line_items.find(
            item => item.type === 'coupon' && (item as CouponLineItem).coupon_code === couponCode
        );

        if (couponLineItem) {
            // Safety check: prevent removal of auto-apply coupons
            const couponItem = couponLineItem as CouponLineItem;

            // Debug logging to see the actual structure
            // console.log('🔍 Attempting to remove coupon:', couponCode);
            // console.log('🔍 Coupon item structure:', couponItem);
            // console.log('🔍 Coupon snapshot:', couponItem.coupon_snapshot);
            // console.log('🔍 Auto apply check:', couponItem.coupon_snapshot?.auto_apply);

            // Check multiple possible locations for auto_apply flag
            const isAutoApply = couponItem.coupon_snapshot?.auto_apply ||
                (couponItem.coupon_snapshot as any)?.coupon?.auto_apply ||
                (couponItem as any).auto_apply;

            // console.log('🔍 All possible auto_apply checks:', {
            //     'coupon_snapshot.auto_apply': couponItem.coupon_snapshot?.auto_apply,
            //     'coupon_snapshot.coupon.auto_apply': (couponItem.coupon_snapshot as any)?.coupon?.auto_apply,
            //     'item.auto_apply': (couponItem as any).auto_apply,
            //     'final_result': isAutoApply
            // });

            if (isAutoApply) {
                // console.log('🚫 Blocked removal of auto-apply coupon:', couponCode);
                showNotification('Automatische Gutscheine können nicht entfernt werden', 'warning', 3000);
                return;
            }

            // console.log('✅ Allowing removal of manual coupon:', couponCode);
            dispatch({ type: 'REMOVE_LINE_ITEM', payload: couponLineItem.id });
            dispatch({ type: 'REMOVE_APPLIED_COUPON', payload: couponCode });
            showNotification('Gutschein entfernt', 'info', 3000);

            // If there are other coupons remaining, revalidate them on next frame
            const remainingCoupons = state.appliedCoupons.filter(code => code !== couponCode);
            if (remainingCoupons.length > 0) {
                requestAnimationFrame(() => {
                    revalidateExistingCoupons?.(remainingCoupons);
                });
            }
        }
    };


    return (
        <div className='mb-20'>
            <section className={`flex flex-col gap-8 max-w-screen-2xl mx-auto w-full ${componentContentPadding} -mt-6 lg:-mt-0`}>


                {state.selectedShow && (
                    <>
                        <div className="w-full hidden lg:flex gap-16 overflow-hidden mb-12">
                            {state.selectedShow.image && (
                                <div className="w-1/4 h-56 overflow-hidden rounded-md">
                                    <img src={getMediaUrl({ imageName: state.selectedShow.image })} alt={state.selectedShow.name} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="w-3/4 flex flex-col justify-between gap-2 py-2 overflow-hidden">
                                <div>
                                    {
                                        selectedSeries ? (
                                            <div className='text-base lg:text-lg xl:text-xl mb-2'>
                                                {selectedSeries.subtitle}
                                            </div>
                                        ) : null
                                    }
                                    <div className='markup max-w-2xl'>
                                        {
                                            isFreeSeatSelection ? (
                                                <Markup markup={`<h1>${state.selectedShow.name}</h1>`} />
                                            ) : (
                                                <Markup markup={`<h1>${state.selectedShow.name.split("-")[0].split("»")[0]} <span class="!font-normal">${state.selectedShow.name.split("-")[0].split("2026 ")[1]}</span></h1>`} />
                                            )
                                        }
                                    </div>
                                </div>
                                <div className='flex gap-6 text-base xl:text-xl'>
                                    <div className='flex items-center gap-4'>
                                        <svg width="17" height="20" viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4.75 3H4.00018C2.95008 3 2.42464 3 2.02356 3.21799C1.67076 3.40973 1.38413 3.71547 1.20436 4.0918C1 4.51962 1 5.08009 1 6.2002V7M4.75 3H12.25M4.75 3V1M12.25 3H13.0002C14.0503 3 14.5746 3 14.9757 3.21799C15.3285 3.40973 15.6161 3.71547 15.7958 4.0918C16 4.5192 16 5.07899 16 6.19691V7M12.25 3V1M1 7V15.8002C1 16.9203 1 17.4801 1.20436 17.9079C1.38413 18.2842 1.67076 18.5905 2.02356 18.7822C2.42425 19 2.94906 19 3.9971 19H13.0029C14.0509 19 14.575 19 14.9757 18.7822C15.3285 18.5905 15.6161 18.2842 15.7958 17.9079C16 17.4805 16 16.9215 16 15.8036V7M1 7H16M12.25 15H12.2519L12.2518 15.002L12.25 15.002V15ZM8.5 15H8.50187L8.50183 15.002L8.5 15.002V15ZM4.75 15H4.75187L4.75183 15.002L4.75 15.002V15ZM12.2518 11V11.002L12.25 11.002V11H12.2518ZM8.5 11H8.50187L8.50183 11.002L8.5 11.002V11ZM4.75 11H4.75187L4.75183 11.002L4.75 11.002V11Z" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            {new Date(state.selectedShow.date).toLocaleDateString('de-DE', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10 5V10H15M10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19Z" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            {state.selectedShow.show_time.split(':')[0]}:{state.selectedShow.show_time.split(':')[1]} Uhr
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 7.92285C1 12.7747 5.24448 16.7869 7.12319 18.3252C7.39206 18.5454 7.52811 18.6568 7.72871 18.7132C7.88491 18.7572 8.1148 18.7572 8.271 18.7132C8.47197 18.6567 8.60707 18.5463 8.87695 18.3254C10.7557 16.7871 14.9999 12.7751 14.9999 7.9233C14.9999 6.08718 14.2625 4.32605 12.9497 3.02772C11.637 1.72939 9.8566 1 8.00008 1C6.14357 1 4.36301 1.7295 3.05025 3.02783C1.7375 4.32616 1 6.08674 1 7.92285Z" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M6 7C6 8.10457 6.89543 9 8 9C9.10457 9 10 8.10457 10 7C10 5.89543 9.10457 5 8 5C6.89543 5 6 5.89543 6 7Z" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            Ralswiek/Rügen
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="w-full flex flex-col lg:hidden gap-6 overflow-hidden">
                            <div className="w-full flex flex-col justify-between gap-8 overflow-hidden">
                                <div>
                                    {
                                        selectedSeries ? (
                                            <div className='text-base lg:text-lg xl:text-xl mt-4'>
                                                {selectedSeries.subtitle}
                                            </div>
                                        ) : null
                                    }
                                    <div className='markup'>
                                        <Markup markup={`<h1>${state.selectedShow.name}</h1>`} />
                                    </div>
                                </div>
                                <div className='grid grid-cols-2 gap-x-4 gap-y-4 text-sm'>
                                    <div className='flex items-center gap-4'>
                                        <svg width="17" height="20" viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4.75 3H4.00018C2.95008 3 2.42464 3 2.02356 3.21799C1.67076 3.40973 1.38413 3.71547 1.20436 4.0918C1 4.51962 1 5.08009 1 6.2002V7M4.75 3H12.25M4.75 3V1M12.25 3H13.0002C14.0503 3 14.5746 3 14.9757 3.21799C15.3285 3.40973 15.6161 3.71547 15.7958 4.0918C16 4.5192 16 5.07899 16 6.19691V7M12.25 3V1M1 7V15.8002C1 16.9203 1 17.4801 1.20436 17.9079C1.38413 18.2842 1.67076 18.5905 2.02356 18.7822C2.42425 19 2.94906 19 3.9971 19H13.0029C14.0509 19 14.575 19 14.9757 18.7822C15.3285 18.5905 15.6161 18.2842 15.7958 17.9079C16 17.4805 16 16.9215 16 15.8036V7M1 7H16M12.25 15H12.2519L12.2518 15.002L12.25 15.002V15ZM8.5 15H8.50187L8.50183 15.002L8.5 15.002V15ZM4.75 15H4.75187L4.75183 15.002L4.75 15.002V15ZM12.2518 11V11.002L12.25 11.002V11H12.2518ZM8.5 11H8.50187L8.50183 11.002L8.5 11.002V11ZM4.75 11H4.75187L4.75183 11.002L4.75 11.002V11Z" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            {new Date(state.selectedShow.date).toLocaleDateString('de-DE', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10 5V10H15M10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19Z" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            {state.selectedShow.show_time.split(':')[0]}:{state.selectedShow.show_time.split(':')[1]} Uhr
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 7.92285C1 12.7747 5.24448 16.7869 7.12319 18.3252C7.39206 18.5454 7.52811 18.6568 7.72871 18.7132C7.88491 18.7572 8.1148 18.7572 8.271 18.7132C8.47197 18.6567 8.60707 18.5463 8.87695 18.3254C10.7557 16.7871 14.9999 12.7751 14.9999 7.9233C14.9999 6.08718 14.2625 4.32605 12.9497 3.02772C11.637 1.72939 9.8566 1 8.00008 1C6.14357 1 4.36301 1.7295 3.05025 3.02783C1.7375 4.32616 1 6.08674 1 7.92285Z" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M6 7C6 8.10457 6.89543 9 8 9C9.10457 9 10 8.10457 10 7C10 5.89543 9.10457 5 8 5C6.89543 5 6 5.89543 6 7Z" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            Ralswiek/Rügen
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {state.selectedShow.image && (
                                <div className="w-full h-full overflow-hidden rounded-md">
                                    <img src={getMediaUrl({ imageName: state.selectedShow.image })} alt={state.selectedShow.name} className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    </>
                )}


                {/* Basket Items */}
                <div className="">
                    {!state.reservationData ? (
                        <div className="p-6 text-center text-gray-500">
                            Keine aktive Reservierung gefunden
                        </div>
                    ) : state.basket.line_items.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            Ihr Warenkorb ist leer
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table Layout */}
                            <div className="hidden lg:block overflow-x-auto">
                                {/* Tickets Section */}
                                {state.basket.line_items.filter(item => item.type === 'ticket').length > 0 && (
                                    <>
                                        <table className="w-full mb-8">
                                            <thead className=''>
                                                <tr className="border-b-[1.5px] text-lg xl:text-xl border-black">
                                                    <th className="text-left py-6 font-semibold">Tickettyp</th>
                                                    <th className="text-left py-6 font-semibold">Platzgruppe</th>
                                                    <th className="text-left py-6 font-semibold">Reihe</th>
                                                    <th className="text-left py-6 font-semibold">Sitz</th>
                                                    <th className="text-right py-6 font-semibold">Preis</th>
                                                    <th className="text-left py-6 w-24 font-semibold"><span className="sr-only">Aktionen</span></th>
                                                </tr>
                                            </thead>
                                            <tbody className='text-lg xl:text-xl'>
                                                {(() => {
                                                    const tickets = (state.basket.line_items || []).filter(li => li.type === 'ticket') as TicketLineItem[];
                                                    const isNumericRow = (row?: string) => !!row && /^\d+$/.test(row.trim());
                                                    const numeric: TicketLineItem[] = [];
                                                    const nonNumeric: TicketLineItem[] = [];
                                                    tickets.forEach(t => {
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
                                                    const sortedTickets = [...numeric, ...nonNumeric];
                                                    return sortedTickets.map((ticketItem, index) => {
                                                        // Extract seat information for ticket items
                                                        const seatGroup = ticketItem.seat_group_name;
                                                        const name = ticketItem.price_category.category_name;

                                                        // Extract row and seat information from seat ID
                                                        const [row, seat] = getTicketRowAndSeat(ticketItem.seat);


                                                        // Check if pre-show is available for this ticket (link_key-aware)
                                                        const ticketPriceLinkKeyDesk = ticketItem.price_category?.link_key;
                                                        const preShowProductsDeskAll = state.selectedShow?.cross_selling_products?.filter(product => product.type_name === FrontendCrossSellingProductType.PRE_SHOW) || [];
                                                        const preShowProductsDesk = preShowProductsDeskAll.filter(product => {
                                                            const keys = product.link_keys || [];
                                                            if (keys.length === 0) return true;
                                                            if (!ticketPriceLinkKeyDesk) return false;
                                                            return keys.includes(ticketPriceLinkKeyDesk);
                                                        });
                                                        const availablePreShowCount = preShowProductsDesk.length;
                                                        const ticketHasPreShow = hasTicketPreShow(ticketItem.id);
                                                        const defaultPreShowProduct = preShowProductsDesk[0];
                                                        const selectedPreShowProduct = ticketHasPreShow ? state.basket.line_items.find(item => item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW && (item as TicketAddOnLineItem).ticket_line_item_id === ticketItem.id) as TicketAddOnLineItem | null : null;


                                                        return (
                                                            <React.Fragment key={ticketItem.id}>
                                                                <tr className={`${index > 0 ? 'border-t-[1.5px] border-black' : ''}`}>
                                                                    <td className="py-4">
                                                                        <div className="font-medium">
                                                                            {(() => {
                                                                                const seatGroupData = seatGroups.find(g => g.id === ticketItem.seat_group_id);
                                                                                if (!seatGroupData) return name;

                                                                                const priceOptions = seatGroupData.prices
                                                                                    .sort((a, b) => a.sort_order - b.sort_order)
                                                                                    .map(price => ({
                                                                                        value: price.id,
                                                                                        label: typeof price.category_name === 'string'
                                                                                            ? price.category_name
                                                                                            : (price.category_name as { de?: { value?: string } })?.de?.value || 'Preiskategorie'
                                                                                    }));

                                                                                return (
                                                                                    <div className='w-full max-w-[400px] pr-12'>
                                                                                        <MainSelect
                                                                                            value={ticketItem.price_category.id}
                                                                                            onChange={(value) => handlePriceCategoryChange(ticketItem.id, value)}
                                                                                            options={priceOptions}
                                                                                            className="w-full"
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4">
                                                                        {seatGroup || 'Freie Platzwahl'}
                                                                    </td>
                                                                    <td className="py-4">
                                                                        {ticketItem.free_seat_selection ? 'Freie Platzwahl' : (row || '-')}
                                                                    </td>
                                                                    <td className="py-4">
                                                                        {ticketItem.free_seat_selection ? '-' : (seat || '-')}
                                                                    </td>
                                                                    <td className="py-4 flex justify-end items-center">
                                                                        <div className="h-12 flex items-center">
                                                                            {formatPrice(ticketItem.total_price)}
                                                                        </div>
                                                                    </td>
                                                                    <td className="w-24">
                                                                        <div className="flex justify-end">
                                                                            <button
                                                                                onClick={async () => await removeItem(ticketItem.id)}
                                                                                className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100"
                                                                                aria-label="Artikel entfernen"
                                                                            >
                                                                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                    <path d="M13.7544 0.542725L0.543117 13.754" stroke="black" stroke-linecap="round" />
                                                                                    <path d="M14.0002 13.9986L0.788967 0.787319" stroke="black" stroke-linecap="round" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                {/* Pre-show add button */}
                                                                {availablePreShowCount > 0 && !ticketHasPreShow && (
                                                                    <button
                                                                        onClick={() => toggleTicketPreShow(ticketItem.id)}
                                                                        className="mt-2 mb-6 flex gap-2 items-center text-base hover:text-black/80 font-medium"
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
                                                                {/* Pre-show row */}
                                                                {ticketHasPreShow && selectedPreShowProduct && (
                                                                    <tr key={selectedPreShowProduct.id} className="bg-gray-50 border-t border-dashed border-gray-300">
                                                                        <td className="py-3">
                                                                            <div className="text-base flex items-center gap-2">
                                                                                <span className="text-xs">↳</span>
                                                                                <span>1x {selectedPreShowProduct.product.name}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-3 text-base">
                                                                            Freie Platzwahl
                                                                        </td>
                                                                        <td className="py-3 text-sm">
                                                                            -
                                                                        </td>
                                                                        <td className="py-3 text-sm">
                                                                            -
                                                                        </td>
                                                                        <td className="py-4 flex justify-end items-center">
                                                                            {formatPrice(selectedPreShowProduct.product.price)}
                                                                        </td>
                                                                        <td className="w-24">
                                                                            <div className="flex justify-end">
                                                                                <button
                                                                                    onClick={() => toggleTicketPreShow(ticketItem.id)}
                                                                                    className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100"
                                                                                    aria-label="Vorprogramm entfernen"
                                                                                >
                                                                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                        <path d="M13.7544 0.542725L0.543117 13.754" stroke="black" stroke-linecap="round" />
                                                                                        <path d="M14.0002 13.9986L0.788967 0.787319" stroke="black" stroke-linecap="round" />
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </>
                                )}

                                {/* Cross-Selling Items Section (desktop, grouped by product_id, exclude add-ons) */}
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
                                            <tr key={`${sample.product_id}-row-${index}`} className={`${index > 0 ? 'border-t-[1.5px] border-black' : ''}`}>
                                                <td className="py-4">
                                                    <div className="">
                                                        {sample.name}
                                                        <span className="ml-2 text-base text-gray-600">{sample.product?.price_label ? `${sample.product.price_label}` : ''}</span>
                                                    </div>
                                                </td>
                                                {/* Placeholder cell for 'Typ' alignment */}
                                                <td className="py-4 w-40"></td>
                                                <td className="w-40">
                                                    <div className='flex justify-center'>
                                                        <div className="flex w-fit h-10 items-center gap-2 border border-black dark:border-white dark:text-white rounded-md overflow-hidden">
                                                            <button
                                                                onClick={() => updateCrossSellingQuantity(sample.id, count - 1)}
                                                                disabled={count <= 1}
                                                                className="h-10 w-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-darkBlue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                aria-label="Anzahl verringern"
                                                                title="Anzahl verringern"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                                </svg>
                                                            </button>
                                                            <span className="w-8 text-center">{count}</span>
                                                            <button
                                                                onClick={() => updateCrossSellingQuantity(sample.id, count + 1)}
                                                                disabled={count >= (sample.product?.max_quantity || 1000)}
                                                                className="h-10 w-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-darkBlue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                aria-label="Anzahl erhöhen"
                                                                title="Anzahl erhöhen"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 w-40 text-right">{formatPrice(unitPrice * count)}</td>
                                                <td className="w-24">
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={() => updateCrossSellingQuantity(sample.id, 0)}
                                                            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100"
                                                            aria-label="Artikel entfernen"
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M13.7544 0.542725L0.543117 13.754" stroke="black" stroke-linecap="round" />
                                                                <path d="M14.0002 13.9986L0.788967 0.787319" stroke="black" stroke-linecap="round" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                        index += 1;
                                    });
                                    return (
                                        <>
                                            <table className="w-full">
                                                <thead className=''>
                                                    <tr className="border-b-[1.5px] text-lg xl:text-xl border-black">
                                                        <th className="text-left py-6 font-semibold">Zusätzliche Produkte</th>
                                                        {/* Placeholder column to align with voucher 'Typ' column */}
                                                        <th className="text-left py-6 w-40 font-semibold"><span className="sr-only">Typ</span></th>
                                                        <th className="text-center py-6 w-40 font-semibold">Anzahl</th>
                                                        <th className="text-right py-6 w-40 font-semibold">Preis</th>
                                                        <th className="text-left py-6 w-24 font-semibold"><span className="sr-only">Aktionen</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className='text-lg xl:text-xl'>
                                                    {rows}
                                                </tbody>
                                            </table>
                                        </>
                                    );
                                })()}

                                {/* Voucher Items Section (desktop) */}
                                {state.basket.line_items.filter(li => li.type === 'voucher').length > 0 && (
                                    <div className='hidden lg:block overflow-x-auto mt-8'>
                                        <table className='w-full'>
                                            <thead className=''>
                                                <tr className='border-b-[1.5px] text-lg xl:text-xl border-black'>
                                                    <th className='text-left py-6 font-semibold'>Gutscheine</th>
                                                    <th className='text-left py-6 w-40 font-semibold'>Typ</th>
                                                    <th className='text-center py-6 w-40 font-semibold'>Anzahl</th>
                                                    <th className='text-right py-6 w-40 font-semibold'>Preis</th>
                                                    <th className='text-left py-6 w-24 font-semibold'><span className="sr-only">Aktionen</span></th>
                                                </tr>
                                            </thead>
                                            <tbody className='text-lg xl:text-xl'>
                                                {state.basket.line_items
                                                    .filter(li => li.type === 'voucher')
                                                    .map((item, index) => {
                                                        const vItem = item as VoucherLineItem;
                                                        return (
                                                            <tr key={item.id} className={`${index > 0 ? 'border-t-[1.5px] border-black' : ''}`}>
                                                                <td className='py-4'>
                                                                    <div className=''>{vItem.name}</div>
                                                                </td>
                                                                <td className='py-4 w-40'>
                                                                    {vItem.voucher_product_type === 'digital' ? 'Digital' : 'Gedruckt'}
                                                                </td>
                                                                <td className='py-4 w-40'>
                                                                    <div className='flex justify-center'>
                                                                        <div className='flex w-fit h-10 items-center gap-2 border border-black rounded-md overflow-hidden'>
                                                                            <button onClick={() => updateVoucherQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className='h-10 w-12 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors' aria-label="Anzahl verringern" title="Anzahl verringern">
                                                                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                                                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 12H4' />
                                                                                </svg>
                                                                            </button>
                                                                            <span className='w-8 text-center'>{item.quantity}</span>
                                                                            <button onClick={() => updateVoucherQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= MAX_QUANTITY_PER_ORDER} className='h-10 w-12 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors' aria-label="Anzahl erhöhen" title="Anzahl erhöhen">
                                                                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                                                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 w-40 text-right">{formatPrice(item.total_price)}</td>
                                                                <td className="w-24">
                                                                    <div className="flex justify-end">
                                                                        <button
                                                                            onClick={async () => await removeItem(item.id)}
                                                                            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100"
                                                                            aria-label="Artikel entfernen"
                                                                        >
                                                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                <path d="M13.7544 0.542725L0.543117 13.754" stroke="black" stroke-linecap="round" />
                                                                                <path d="M14.0002 13.9986L0.788967 0.787319" stroke="black" stroke-linecap="round" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Card Layout */}
                            <div className="lg:hidden space-y-4">
                                {/* Tickets Section */}
                                {state.basket.line_items.filter(item => item.type === 'ticket').length > 0 && (
                                    <div className="flex flex-col gap-6">
                                        <h3 className="font-medium text-lg">
                                            Tickets
                                        </h3>
                                        {(() => {
                                            const tickets = (state.basket.line_items || []).filter(li => li.type === 'ticket') as TicketLineItem[];
                                            const isNumericRow = (row?: string) => !!row && /^\d+$/.test(row.trim());
                                            const numeric: TicketLineItem[] = [];
                                            const nonNumeric: TicketLineItem[] = [];
                                            tickets.forEach(t => {
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
                                            const sortedTickets = [...numeric, ...nonNumeric];
                                            return sortedTickets.map((ticketItem) => {
                                                const seatGroup = ticketItem.seat_group_name;
                                                const name = ticketItem.price_category.category_name;
                                                const [row, seat] = getTicketRowAndSeat(ticketItem.seat);

                                                // Check if pre-show is available for this ticket (link_key-aware)
                                                const ticketPriceLinkKeyMob = ticketItem.price_category?.link_key;
                                                const preShowProductsMobAll = state.selectedShow?.cross_selling_products?.filter(product => product.type_name === FrontendCrossSellingProductType.PRE_SHOW) || [];
                                                const preShowProductsMob = preShowProductsMobAll.filter(product => {
                                                    const keys = product.link_keys || [];
                                                    if (keys.length === 0) return true;
                                                    if (!ticketPriceLinkKeyMob) return false;
                                                    return keys.includes(ticketPriceLinkKeyMob);
                                                });
                                                const availablePreShowCount = preShowProductsMob.length;
                                                const ticketHasPreShow = hasTicketPreShow(ticketItem.id);
                                                const defaultPreShowProduct = preShowProductsMob[0];
                                                const selectedPreShowProduct = ticketHasPreShow ? state.basket.line_items.find(item => item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PRE_SHOW && (item as TicketAddOnLineItem).ticket_line_item_id === ticketItem.id) as TicketAddOnLineItem | null : null;


                                                return (
                                                    <div key={ticketItem.id} className="flex flex-col gap-3 border-b border-black last:border-b-0 pb-6">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex-1">
                                                                {/* <div className="font-medium mb-2">
                                                                    {ticketItem.free_seat_selection ? `${ticketItem.seat_group_name} - Freie Platzwahl` : getSeatDisplayName(ticketItem.seat, state.language)}
                                                                </div> */}
                                                                <div className="text-sm">
                                                                    {seatGroup || 'Freie Platzwahl'} / {ticketItem.free_seat_selection ? 'Freie Platzwahl' : getSeatDisplayName(ticketItem.seat, state.language)}
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={async () => await removeItem(ticketItem.id)}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded"
                                                                aria-label="Ticket entfernen"
                                                            >
                                                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M14.2114 1L1.00015 14.2113" stroke="black" stroke-linecap="round" />
                                                                    <path d="M14.4575 14.4559L1.24624 1.24459" stroke="black" stroke-linecap="round" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Price Category Selection */}
                                                        <div className="mb-3">
                                                            {(() => {
                                                                const seatGroupData = seatGroups.find(g => g.id === ticketItem.seat_group_id);
                                                                if (!seatGroupData) return <div className="text-sm text-gray-600">{name}</div>;

                                                                const priceOptions = seatGroupData.prices
                                                                    .sort((a, b) => a.sort_order - b.sort_order)
                                                                    .map(price => ({
                                                                        value: price.id,
                                                                        label: typeof price.category_name === 'string'
                                                                            ? price.category_name + ' - ' + formatPrice(price.price)
                                                                            : (price.category_name as { de?: { value?: string } })?.de?.value || 'Preiskategorie' + ' - ' + formatPrice(price.price)
                                                                    }));

                                                                return (
                                                                    <MainSelect
                                                                        value={ticketItem.price_category.id}
                                                                        onChange={(value) => handlePriceCategoryChange(ticketItem.id, value)}
                                                                        options={priceOptions}
                                                                        className="w-full"
                                                                    />
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Pre-show Section */}
                                                        {availablePreShowCount > 0 && (
                                                            <div className="border-t border-dashed border-gray-300 pt-4">
                                                                {ticketHasPreShow && selectedPreShowProduct ? (
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="text-sm">
                                                                            {selectedPreShowProduct.product.name} {formatPrice(selectedPreShowProduct.product.price)}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => toggleTicketPreShow(ticketItem.id)}
                                                                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded"
                                                                            aria-label="Vorprogramm entfernen"
                                                                        >
                                                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                <path d="M14.2114 1L1.00015 14.2113" stroke="black" stroke-linecap="round" />
                                                                                <path d="M14.4575 14.4559L1.24624 1.24459" stroke="black" stroke-linecap="round" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => toggleTicketPreShow(ticketItem.id)}
                                                                        className="flex gap-2 items-center text-sm font-medium"
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
                                            });
                                        })()}
                                    </div>
                                )}

                                {/* Cross-Selling Items Section (grouped by product_id, exclude add-ons) */}
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
                                    const groupRows: React.ReactNode[] = [];
                                    let idx = 0;
                                    groups.forEach((arr) => {
                                        const sample = arr[0];
                                        if (!sample) return;
                                        const count = arr.length;
                                        const unitPrice = Number(sample.unit_price || 0);
                                        groupRows.push(
                                            <div key={`${sample.product_id}-group-${idx}`} className="flex flex-col gap-3 border-b border-black last:border-b-0 pb-6">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1">
                                                        <div className="text-sm">
                                                            {count > 1 ? `${count}x ` : ''} {sample.name} - {formatPrice(unitPrice * count)}
                                                            <span className="ml-2 text-sm text-gray-600">{sample.product?.price_label ? `${sample.product.price_label}` : ''}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => updateCrossSellingQuantity(sample.id, 0)}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded"
                                                        aria-label="Artikel entfernen"
                                                    >
                                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M14.2114 1L1.00015 14.2113" stroke="black" stroke-linecap="round" />
                                                            <path d="M14.4575 14.4559L1.24624 1.24459" stroke="black" stroke-linecap="round" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {/* Grouped Quantity Controls */}
                                                <div className="flex justify-start w-full">
                                                    <div className="flex w-full h-12 items-center gap-2 border border-black rounded-md overflow-hidden">
                                                        <button
                                                            onClick={() => updateCrossSellingQuantity(sample.id, count - 1)}
                                                            disabled={count <= 1}
                                                            className="h-12 w-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                            </svg>
                                                        </button>
                                                        <span className="w-full text-center font-medium">{count}</span>
                                                        <button
                                                            onClick={() => updateCrossSellingQuantity(sample.id, count + 1)}
                                                            disabled={count >= (sample.product?.max_quantity || 1000)}
                                                            className="h-12 w-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                        idx += 1;
                                    });
                                    return (
                                        <div className="flex flex-col gap-6 mt-6">
                                            <h3 className="font-medium text-lg pb-2 mt-12">Zusätzliche Produkte</h3>
                                            {groupRows}
                                        </div>
                                    );
                                })()}

                                {/* Voucher Items Section (mobile) */}
                                {state.basket.line_items.filter(li => li.type === 'voucher').length > 0 && (
                                    <div className="flex flex-col gap-6 mt-6">
                                        <h3 className="font-medium text-lg mt-12 pb-2">Gutscheine</h3>
                                        {state.basket.line_items.filter(li => li.type === 'voucher').map((item) => {
                                            const vItem = item as VoucherLineItem;
                                            return (
                                                <div key={item.id} className="flex flex-col gap-3 border-b border-black last:border-b-0 pb-6">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex-1">
                                                            <div className="text-sm"> {item.quantity > 1 ? `${item.quantity}x ` : ''} {vItem.name} - {formatPrice(item.total_price)}</div>
                                                            <div className="text-sm text-gray-600">{vItem.voucher_product_type === 'digital' ? 'Digital' : 'Gedruckt'}</div>
                                                        </div>
                                                        <button onClick={async () => await removeItem(item.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded" aria-label="Artikel entfernen">
                                                            <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                                                <path d='M14.2114 1L1.00015 14.2113' stroke='black' stroke-linecap='round' />
                                                                <path d='M14.4575 14.4559L1.24624 1.24459' stroke='black' stroke-linecap='round' />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div className='flex mt-1'>
                                                        <div className='flex w-full h-12 items-center gap-2 border border-black rounded-md overflow-hidden'>
                                                            <button onClick={() => updateVoucherQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className='h-12 w-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                                                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 12H4' />
                                                                </svg>
                                                            </button>
                                                            <span className='w-full text-center font-medium'>{item.quantity}</span>
                                                            <button onClick={() => updateVoucherQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= MAX_QUANTITY_PER_ORDER} className='h-12 w-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                                                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className='w-full h-4'></div>

                {
                    !state.basket.line_items.some(item => item.type === 'crossselling' && (item as CrossSellingLineItem).cross_selling_product_type === FrontendCrossSellingProductType.PROGRAMM_BOOKLET) && state.selectedShow?.cross_selling_products?.some(product => product.type_name === FrontendCrossSellingProductType.PROGRAMM_BOOKLET) && (
                        <ProgrammBookletCrossSellingProduct product={state.selectedShow?.cross_selling_products?.find(product => product.type_name === FrontendCrossSellingProductType.PROGRAMM_BOOKLET)!} onAddToBasket={handleAddCrossSellingProductToBasket} />
                    )
                }

                {/* Voucher selection banner (desktop) */}
                {availableVoucherProducts.length > 0 && (
                    <>
                        <div className="w-full hidden lg:flex items-center justify-between px-16 py-12 rounded-lg bg-white shadow-[0_0_20px_rgba(0,0,0,0.08)] z-10 my-4">
                            <span className='text-2xl font-medium'>Gutscheine hinzufügen</span>
                            <div className='flex-grow'></div>
                            <MainButton
                                handleClick={() => setIsVoucherModalOpen(true)}
                                label="Gutschein auswählen"
                                size='large'
                                style='primary'
                                className='w-[340px] xl:w-[460px]'
                            />
                        </div>
                        <div className="flex lg:hidden flex-col gap-4 p-6 rounded-md bg-white shadow-[0_0_20px_rgba(0,0,0,0.08)] z-10">
                            <span className='text-lg font-medium'>Gutscheine hinzufügen</span>
                            <MainButton
                                handleClick={() => setIsVoucherModalOpen(true)}
                                label="Gutschein auswählen"
                                size='large'
                                style='primary'
                            />
                        </div>
                    </>
                )}
            </section>
            {
                state.selectedShow?.cross_selling_products?.some(product => product.type_name === FrontendCrossSellingProductType.GASTRONOMY_VOUCHER) && (
                    <GastronomyVoucherCrossSellingProduct crossSellingProducts={state.selectedShow?.cross_selling_products || []} onAddToBasket={handleAddCrossSellingProductToBasket} />
                )
            }


            <section className={`flex flex-col max-w-screen-2xl mx-auto w-full ${componentContentPadding}`}>

                <div className='flex flex-col lg:flex-row justify-between gap-12'>
                    <div className='w-full flex flex-col lg:w-1/2 xl:w-2/5 pb-8 lg:pb-0'>
                        <div className='text-lg lg:text-lg xl:text-xl font-semibold'>Versandoption *</div>
                        <div className='flex flex-col gap-4 mt-8'>
                            {(filteredDeliveryOptions || []).map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        dispatch({ type: 'SET_SHIPPING_OPTION', payload: option.id });
                                        setHasAttemptedNext(false); // Reset validation state when option is selected
                                    }}
                                    className={`flex w-full gap-6 items-center border-[1.5px] p-4 hover:cursor-pointer transition-colors hover:bg-gray-50 ${(state.shippingOption === null && hasAttemptedNext) ? 'border-red-500 rounded-md' : 'border-gray-900 rounded-md'
                                        }`}
                                >
                                    <div className={`w-5 h-5 border-[1.5px] border-gray-900 rounded-full ${state.shippingOption === option.id ? 'bg-darkBlue' : ''
                                        }`}></div>
                                    <div className='flex-grow text-left'>
                                        <span className='lg:text-lg'>{option.name}</span>
                                        {option.fee_amount > 0 && (
                                            <span className='ml-2 text-sm text-gray-600'>
                                                (+{formatPrice(option.fee_amount)})
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))
                            }
                            {
                                state.shippingOption === null && hasAttemptedNext && (
                                    <div className="text-red-500 text-sm">
                                        Bitte wählen Sie eine Versandoption
                                    </div>
                                )
                            }
                        </div>
                    </div>
                    <div className='w-full lg:w-1/2 xl:w-2/5 mt-6 lg:mt-0'>
                        <div className='text-lg lg:text-lg xl:text-xl font-semibold'>Weiter zur Kasse</div>

                        {/* Coupon Input */}
                        <div className="flex flex-col gap-4 mt-8">
                            <div className={`flex border-[1.5px] rounded-md overflow-hidden h-16 ${state.couponError ? 'border-red-500' : 'border-gray-900'}`}>
                                <input
                                    type="text"
                                    placeholder="Rabattcode oder Gutschein"
                                    value={couponInput}
                                    onChange={(e) => setCouponInput(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCouponValidation();
                                        }
                                    }}
                                    className="flex-grow px-6 py-4 border-none appearance-none focus:outline-none"
                                    disabled={state.couponValidationInProgress}
                                />
                                <button
                                    onClick={handleCouponValidation}
                                    disabled={state.couponValidationInProgress || !couponInput.trim()}
                                    className="flex items-center justify-center hover:cursor-pointer p-5 border-l-[1.5px] border-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Rabattcode anwenden"
                                    title="Rabattcode anwenden"
                                >
                                    {state.couponValidationInProgress ? (
                                        <div className="animate-spin rounded-full h-5 w-5"></div>
                                    ) : (
                                        <svg width="25" height="18" viewBox="0 0 25 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 9.00003L8.66721 17L24 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {/* Coupon Error */}
                            {state.couponError && (
                                <div className="text-red-500 text-sm">
                                    {state.couponError}
                                </div>
                            )}

                            {/* Applied Coupons Display */}
                            {state.basket.line_items.filter(item => item.type === 'coupon').length > 0 && (
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="text-sm">Angewendete Rabatte / Gutscheine:</div>
                                    <div className="flex flex-wrap gap-2 text-sm font-medium ">
                                        {state.basket.line_items
                                            .filter(item => item.type === 'coupon')
                                            .map((item) => {
                                                const couponItem = item as CouponLineItem;

                                                // Check multiple possible locations for auto_apply flag
                                                const isAutoApply = couponItem.coupon_snapshot?.auto_apply

                                                return (
                                                    <div key={item.id} className="flex w-fit px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-green-600">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">{couponItem.coupon_code} - {formatPrice(Math.abs(couponItem.total_price))}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

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
                                                    <div key={couponItem.id} className={`flex justify-between text-xs text-[#3F8054] ${isRefunded ? 'line-through opacity-60' : ''}`}>
                                                        <span>Rabattcode: {couponItem.coupon_code}</span>
                                                        <span>-{formatPrice(Math.abs(couponItem.total_price))}</span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                ) : null}

                                <div className='h-4'></div>

                                {/* Delivery Fee */}
                                {state.basket.financial_breakdown?.delivery_fee && state.basket.financial_breakdown?.delivery_fee > 0 ? (
                                    <div className="flex justify-between text-sm">
                                        <span>Liefergebühr:</span>
                                        <span>{formatPrice(state.basket.financial_breakdown?.delivery_fee || 0)}</span>
                                    </div>
                                ) : null}

                                {/* VAT Breakdown */}
                                {state.basket.financial_breakdown?.vat_breakdown && state.basket.financial_breakdown?.vat_breakdown.length > 0 ? (
                                    <div className="space-y-1 text-xs">
                                        {state.basket.financial_breakdown?.vat_breakdown.map((vatItem, index) => (
                                            <div key={index} className="flex justify-between">
                                                <span>inkl. MwSt. {vatItem.rate}%:</span>
                                                <span>{formatPrice(vatItem.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex justify-between">
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
                                                    <div key={couponItem.id} className={`flex justify-between text-[#3F8054] text-xs ${isRefunded ? 'line-through opacity-60' : ''}`}>
                                                        <span>Gutschein: {couponItem.coupon_code} (Restguthaben: {remainingBalance})</span>
                                                        <span className='whitespace-nowrap'>-{formatPrice(Math.abs(couponItem.total_price))}</span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                ) : null}

                                {/* Total */}
                                <div className="flex justify-between items-center pt-6 border-t border-gray-700 mt-4">
                                    <span className="text-lg font-semibold">Zu zahlender Betrag:</span>
                                    <span className="text-lg xl:text-xl font-semibold">{formatPrice(state.basket.financial_breakdown?.total_amount || 0)}</span>
                                </div>

                            </div>
                        </div>

                        <div className='flex flex-col gap-4 mt-8'>
                            <MainButton
                                handleClick={() => {
                                    // Validate linked seats: if a ticket seat has a linked seat, ensure it's also present in basket
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
                                            showNotification(
                                                `Die ausgewählten Plätze können nur gemeinsam gebucht werden. Bitte fügen Sie auch ${linkedSeatDisplayName} hinzu oder entfernen Sie den verknüpften Platz.`,
                                                'warning'
                                            );
                                            setHasAttemptedNext(true);
                                            return;
                                        }
                                    }

                                    if (canGoToNextStep()) {
                                        goToNextStep();
                                    } else {
                                        setHasAttemptedNext(true);
                                    }
                                }}
                                label="Weiter zur Kasse"
                                size="large"
                            />
                            <button
                                onClick={() => releaseReservationsKeepSelections()}
                                className="flex h-14 items-center justify-center group hover:bg-darkBlue hover:text-white hover:cursor-pointer transition-colors duration-300 px-8 py-4 border-[1.5px] border-gray-900 rounded-md w-full">
                                <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path className='fill-[#19263D] group-hover:fill-white' d="M6.459 14.0256L0.671394 8.28344L6.459 8.28344C4.34875 8.28344 3.28794 10.8312 4.77463 12.3289L6.459 14.0256Z" />
                                    <path className='fill-[#19263D] group-hover:fill-white' d="M0.671394 8.28344L4.5298 4.45532L6.459 2.54126L4.77738 4.22181C3.27799 5.72023 4.33923 8.28344 6.459 8.28344L0.671394 8.28344Z" />
                                    <path className='stroke-[#19263D] group-hover:stroke-white' d="M17.5151 8.28344L6.459 8.28344M0.671395 8.28344L4.5298 4.45532L6.459 2.54126M0.671395 8.28344L6.459 14.0256M0.671395 8.28344L6.459 8.28344M8.3882 0.627197L6.459 2.54126M8.3882 15.9397L6.459 14.0256M6.459 2.54126L4.77738 4.22181C3.27799 5.72023 4.33923 8.28344 6.459 8.28344M6.459 14.0256L4.77463 12.3289C3.28794 10.8312 4.34875 8.28344 6.459 8.28344" stroke-width="1.22332" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>


                                <span className='flex-grow'>Sitzplätze ändern</span>
                            </button>

                        </div>


                    </div>
                </div>

            </section >

            {/* Pre-show Price Selection Modal */}
            < PreShowPriceSelectionModal
                isOpen={preShowModalData.isOpen}
                onClose={handleClosePreShowModal}
                preShowProducts={preShowModalData.products}
                onSelectPriceCategory={handlePreShowSelection}
            />

            {/* Voucher Products Modal */}
            < VoucherProductsModal
                isOpen={isVoucherModalOpen}
                onClose={() => setIsVoucherModalOpen(false)
                }
                products={allVoucherProductsSorted}
                getSelection={getVoucherSelection}
                setType={setVoucherType}
                setQuantity={setVoucherQuantity}
                onAdd={handleAddVoucherToBasket}
            />
        </div >
    );
}



const GastronomyVoucherCrossSellingProduct = ({ crossSellingProducts, onAddToBasket }: { crossSellingProducts: CrossSellingProductData[], onAddToBasket: (product: CrossSellingProductData, quantity: number) => void }) => {
    const vouchers = crossSellingProducts.filter(product => product.type_name === FrontendCrossSellingProductType.GASTRONOMY_VOUCHER)!;


    return (
        <section className={`bg-stone w-full`}>
            <div className={`flex flex-col gap-16 max-w-screen-2xl mx-auto w-full ${componentContentPadding}`}>
                <div className={`flex flex-col lg:flex-row gap-12 max-w-screen-2xl mx-auto w-full py-12`}>
                    <div className='w-full lg:w-1/2 pb-8 lg:pb-0'>
                        <div className='markup'>
                            <h2>Gastronomie-Gutscheine hinzufügen</h2>
                        </div>
                    </div>
                    <div className='w-full lg:w-1/2 mt-2'>
                        <div>
                            <div className='markup'>
                                <p>Machen Sie Ihren Besuch noch unvergesslicher – fügen Sie einen Gutschein für unsere Gastronomie hinzu und genießen Sie kulinarische Spezialitäten während der Festspiele.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12'>
                    {vouchers.map((voucher) => (
                        <div className="p-6 flex flex-col coupon" key={voucher.id}>
                            <div className='text-center font-semibold text-4xl flex-grow p-20'>
                                {voucher.name}
                            </div>
                            <button
                                onClick={() => onAddToBasket(voucher, 1)}
                                className='bg-darkBlue text-white px-16 py-5 flex rounded-md hover:bg-darkBlue/90 transition-colors hover:cursor-pointer'>
                                <span className='flex-grow text-lg xl:text-xl'>
                                    {voucher.action_label}
                                </span>
                                <div className=''>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.9307 11.7023L1.45784 11.7023" stroke="white" strokeWidth="1.53687" strokeLinecap="round" />
                                        <path d="M12.1957 22.8375V1.3647" stroke="white" strokeWidth="1.53687" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </button>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    )
}


const ProgrammBookletCrossSellingProduct = ({ product, onAddToBasket }: { product: CrossSellingProductData, onAddToBasket: (product: CrossSellingProductData, quantity: number) => void }) => {
    const [quantity, setQuantity] = useState(1);

    const updateQuantity = (change: number) => {
        setQuantity(quantity + change);
    }

    const handleAddToBasket = (quantity: number) => {
        onAddToBasket(product, quantity);
    }




    return (
        <>
            <div className="hidden lg:flex lg:gap-6 items-center justify-between px-16 py-12 rounded-lg bg-white shadow-[0_0_20px_rgba(0,0,0,0.08)] z-10 my-4">
                <span className='text-2xl font-medium'>{product.action_label || product.name}</span>
                <div className='flex-grow'></div>
                {/* Quantity Controls */}


                <div className='flex items-center gap-6 w-[340px] xl:w-[460px]'>
                    <div className="flex w-full h-14 items-center gap-2 border-[1.5px] border-black dark:border-white dark:text-white rounded-md overflow-hidden">
                        <button
                            onClick={() => updateQuantity(-1)}
                            disabled={quantity === 0}
                            className="h-14 w-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-darkBlue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Anzahl verringern"
                            title="Anzahl verringern"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <span className="w-full text-center text-lg xl:text-xl">{quantity}</span>
                        <button
                            onClick={() => updateQuantity(1)}
                            disabled={quantity >= (product.max_quantity || 1000)}
                            className="h-14 w-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-darkBlue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Anzahl erhöhen"
                            title="Anzahl erhöhen"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    </div>

                    {/* Add to Basket Button */}
                    <MainButton
                        handleClick={() => handleAddToBasket(quantity)}
                        disabled={quantity === 0}
                        label="Hinzufügen"
                        size='large'
                        style={quantity > 0 ? 'primary' : 'secondary'}
                        className='w-fit xl:w-full'
                    />
                </div>
            </div>
            <div className="flex flex-col gap-4 lg:hidden p-6 rounded-md bg-white shadow-[0_0_20px_rgba(0,0,0,0.08)] z-10">

                <span className='text-lg font-medium'>{product.action_label || product.name}</span>
                <div className='flex w-full justify-between gap-2 items-center'>
                    {/* Quantity Controls */}
                    <div className="flex w-fit h-10 items-center gap-2 border-[1.5px] border-black dark:border-white dark:text-white rounded-md overflow-hidden">
                        <button
                            onClick={() => updateQuantity(-1)}
                            disabled={quantity === 0}
                            className="h-10 w-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-darkBlue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Anzahl verringern"
                            title="Anzahl verringern"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <span className="w-8 text-center font-medium">{quantity}</span>
                        <button
                            onClick={() => updateQuantity(1)}
                            disabled={quantity >= (product.max_quantity || 1000)}
                            className="h-10 w-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-darkBlue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Anzahl erhöhen"
                            title="Anzahl erhöhen"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    </div>

                    {/* Add to Basket Button */}
                    <MainButton
                        handleClick={() => handleAddToBasket(quantity)}
                        disabled={quantity === 0}
                        label="Hinzufügen"
                        size='small'
                        style={quantity > 0 ? 'primary' : 'secondary'}
                    />
                </div>
            </div>
        </>
    )
}
