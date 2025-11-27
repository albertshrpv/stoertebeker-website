import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { voucherProductsApi } from '../api/voucherProducts';
import { MAX_QUANTITY_PER_ORDER, type VoucherProduct } from '../types/voucherProduct';
import { useBooking } from '../contexts/BookingContext';
import { componentContentPadding } from '../../../lib/utils';
import { formatPrice } from '../utils/priceFormatting';
import { generateUUID } from '../utils/uuid';
import type { VoucherLineItem } from '../types/lineItem';
import { useInitData } from '../hooks/useInitData';
import { useEffect } from 'react';
import { MainButton } from '../components/MainButton';




export function VoucherShopPage() {
    const { dispatch, state, showNotification } = useBooking();
    const { data: initData, isLoading: isInitLoading, error: initError } = useInitData(state.seasonId);

    // Ensure flow mode is set to vouchers when entering voucher shop
    // This will trigger basket clearing if switching from ticket flow
    useEffect(() => {
        if (state.flowMode !== 'vouchers') {
            dispatch({ type: 'SET_FLOW_MODE', payload: 'vouchers' });
        }
    }, [state.flowMode, dispatch]);

    useEffect(() => {
        if (initData) {
            dispatch({ type: 'SET_INIT_DATA', payload: initData });
        }
    }, [initData, dispatch]);
    const { data, isLoading, error } = useQuery({
        queryKey: ['voucherProducts', 'active'],
        queryFn: async (): Promise<VoucherProduct[]> => {
            const res = await voucherProductsApi.getActive();
            if (!res.data.success || !res.data.data) throw new Error('Failed to load vouchers');
            return res.data.data;
        },
        staleTime: 5 * 60 * 1000
    });

    // Single selection UI state
    const [selectedType, setSelectedType] = React.useState<'digital' | 'physical'>('digital');
    const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
    const [quantity, setQuantity] = React.useState<number>(1);

    const sortedProducts = React.useMemo(() => (data || []).slice().sort((a, b) => Number(a.voucher_amount) - Number(b.voucher_amount)), [data]);
    const amounts = React.useMemo(() => sortedProducts.map(p => Number(p.voucher_amount)), [sortedProducts]);
    const maxAmount = React.useMemo(() => (amounts.length ? Math.max(...amounts) : 0), [amounts]);
    const selectedProduct: VoucherProduct | undefined = sortedProducts[selectedIndex];
    const sliderMax = React.useMemo(() => Math.max(0, amounts.length - 1), [amounts.length]);

    // Custom slider state
    const sliderRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragPosition, setDragPosition] = React.useState<number | null>(null);
    const rafRef = React.useRef<number | null>(null);
    const basketRef = React.useRef<HTMLElement>(null);

    const getTickLeftPercent = React.useCallback((index: number) => {
        if (sliderMax === 0) return 0;
        // Spread evenly from 0% to 100%
        return (index / sliderMax) * 100;
    }, [sliderMax]);

    // Calculate current thumb position (either from drag or selected index)
    // Always use the exact tick position when not dragging to ensure perfect alignment
    const thumbPosition = React.useMemo(() => {
        if (isDragging && dragPosition !== null) {
            return dragPosition;
        }
        return getTickLeftPercent(selectedIndex);
    }, [isDragging, dragPosition, selectedIndex, getTickLeftPercent]);

    // Calculate current effective index (for determining which indicators to fill)
    const currentEffectiveIndex = React.useMemo(() => {
        if (isDragging && dragPosition !== null && sliderMax > 0) {
            // During dragging, only fill indicators that have been fully passed
            // Use floor instead of round so it only fills when fully past the indicator
            const stepPercent = 100 / sliderMax;
            const passedIndex = Math.floor(dragPosition / stepPercent);
            return Math.max(0, Math.min(sliderMax, passedIndex));
        }
        return selectedIndex;
    }, [isDragging, dragPosition, selectedIndex, sliderMax]);

    // Handle mouse/touch events for dragging with requestAnimationFrame for smoothness
    const updatePosition = React.useCallback((clientX: number) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        setDragPosition(percent);
    }, []);

    const handleStart = React.useCallback((clientX: number) => {
        if (!sliderRef.current) return;
        setIsDragging(true);
        updatePosition(clientX);
    }, [updatePosition]);

    const handleMove = React.useCallback((clientX: number) => {
        if (!isDragging) return;
        // Cancel any pending animation frame
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
        }
        // Use requestAnimationFrame for smooth updates
        rafRef.current = requestAnimationFrame(() => {
            updatePosition(clientX);
        });
    }, [isDragging, updatePosition]);

    const handleEnd = React.useCallback(() => {
        // Cancel any pending animation frame
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        if (!isDragging || dragPosition === null || sliderMax === 0) {
            setIsDragging(false);
            setDragPosition(null);
            return;
        }

        // Snap to nearest position using exact tick position
        const stepPercent = 100 / sliderMax;
        const snappedIndex = Math.round(dragPosition / stepPercent);
        const clampedIndex = Math.max(0, Math.min(sliderMax, snappedIndex));

        // Use the exact tick position for perfect alignment
        setSelectedIndex(clampedIndex);
        setIsDragging(false);
        setDragPosition(null);
    }, [isDragging, dragPosition, sliderMax]);

    // Mouse events
    React.useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            handleMove(e.clientX);
        };

        const handleMouseUp = () => {
            handleEnd();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            // Clean up any pending animation frame
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isDragging, handleMove, handleEnd]);

    // Touch events
    React.useEffect(() => {
        if (!isDragging) return;

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches[0]) {
                handleMove(e.touches[0].clientX);
            }
        };

        const handleTouchEnd = () => {
            handleEnd();
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            // Clean up any pending animation frame
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isDragging, handleMove, handleEnd]);


    React.useEffect(() => {
        if (sortedProducts.length === 0) return;
        if (selectedIndex > sortedProducts.length - 1) {
            setSelectedIndex(0);
        }
        // Ensure quantity stays within bounds of the newly selected product
        setQuantity(q => Math.min(Math.max(1, q), MAX_QUANTITY_PER_ORDER));
    }, [sortedProducts.length, selectedIndex]);

    // If there is any physical voucher in the basket, hide digital delivery options
    const hasPhysicalVoucherInBasket = state.basket.line_items.some(
        (li) => li.type === 'voucher' && (li as VoucherLineItem).voucher_product_type === 'physical'
    );

    // If there is any digital voucher in the basket, prefer digital delivery options only (unless physical exists)
    const hasDigitalVoucherInBasket = state.basket.line_items.some(
        (li) => li.type === 'voucher' && (li as VoucherLineItem).voucher_product_type === 'digital'
    );

    const filteredDeliveryOptions = state.initData
        ? hasPhysicalVoucherInBasket
            ? state.initData.deliveryOptions.filter((opt) => opt.type !== 'digital')
            : hasDigitalVoucherInBasket
                ? state.initData.deliveryOptions.filter((opt) => opt.type === 'digital')
                : state.initData.deliveryOptions
        : [];

    // Require at least one voucher item in basket before proceeding
    const hasVouchersInBasket = state.basket.line_items.some(li => li.type === 'voucher');

    // If a now-hidden (digital) option is selected while physical voucher exists, clear it
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

    // If only digital vouchers are in basket, restrict to digital options and clear non-digital selection
    useEffect(() => {
        if (!state.initData) return;
        if (!hasDigitalVoucherInBasket || hasPhysicalVoucherInBasket) return;
        const selected = state.initData.deliveryOptions.find((opt) => opt.id === state.shippingOption);
        if (selected && selected.type !== 'digital') {
            dispatch({ type: 'SET_SHIPPING_OPTION', payload: null });
            showNotification(
                'Nur digitale Versandoptionen sind verfügbar. Bitte wählen Sie eine digitale Option.',
                'warning',
                4000
            );
        }
    }, [hasDigitalVoucherInBasket, hasPhysicalVoucherInBasket, state.initData, state.shippingOption, dispatch, showNotification]);

    const addSelectedVoucherToBasket = () => {
        if (!selectedProduct) return;
        const unitPrice = Number(selectedProduct.voucher_amount);
        const existing = state.basket.line_items.find(li =>
            li.type === 'voucher' &&
            (li as VoucherLineItem).voucher_product_id === selectedProduct.id &&
            (li as VoucherLineItem).voucher_product_type === selectedType
        ) as VoucherLineItem | undefined;

        if (existing) {
            const newQty = Math.min(existing.quantity + quantity, MAX_QUANTITY_PER_ORDER);
            dispatch({
                type: 'UPDATE_LINE_ITEM',
                payload: { id: existing.id, item: { quantity: newQty, total_price: newQty * unitPrice } }
            });
            const added = newQty - existing.quantity;
            const qtyText = added > 0 ? ` (+${added})` : '';
            showNotification(`${selectedProduct.name}${qtyText} aktualisiert`, 'success', 3000);

            // Scroll to basket after a short delay to allow DOM update
            setTimeout(() => {
                if (basketRef.current) {
                    basketRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            return;
        }

        const item: VoucherLineItem = {
            id: generateUUID(),
            type: 'voucher',
            name: selectedProduct.name,
            quantity: quantity,
            unit_price: unitPrice,
            total_price: unitPrice * quantity,
            currency: selectedProduct.currency || 'EUR',
            voucher_product_id: selectedProduct.id,
            voucher_product: selectedProduct,
            voucher_product_type: selectedType
        };

        dispatch({ type: 'ADD_LINE_ITEM', payload: item });
        const qtyText = quantity > 1 ? ` (${quantity}x)` : '';
        showNotification(`${selectedProduct.name}${qtyText} wurde zum Warenkorb hinzugefügt`, 'success', 3000);

        // Scroll to basket after a short delay to allow DOM update
        setTimeout(() => {
            if (basketRef.current) {
                basketRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    // Remove voucher or other line items from basket
    const removeItem = (itemId: string) => {
        dispatch({ type: 'REMOVE_LINE_ITEM', payload: itemId });
    };

    // Update voucher quantity in basket
    const updateVoucherQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeItem(itemId);
            return;
        }
        const item = state.basket.line_items.find(li => li.id === itemId);
        if (!item || item.type !== 'voucher') return;
        const voucherItem = item as VoucherLineItem;
        const maxQ = MAX_QUANTITY_PER_ORDER;
        const q = Math.min(newQuantity, maxQ);
        dispatch({
            type: 'UPDATE_LINE_ITEM',
            payload: { id: itemId, item: { quantity: q, total_price: q * item.unit_price } }
        });
    };

    // No per-product cards anymore; selection is unified above


    const getSubtitle = () => {
        if (isLoading || isInitLoading || initError || error) return '';

        const sampleVoucher = data?.[0];
        if (!sampleVoucher) return '';
        return `Gültig ${sampleVoucher.validity_months} Monate • max. ${MAX_QUANTITY_PER_ORDER} pro Bestellung`;

    }


    return (
        <div className={`flex flex-col max-w-screen-2xl mx-auto mb-10 md:mb-20 lg:mb-28 xl:mb-40`}>
            <section className='w-full flex flex-col lg:flex-row'>
                <img src={"https://media.stoertebeker.de/images/vouchers.jpg/1000/70/webp"} alt="Gutscheine" className='w-full lg:w-1/2 aspect-square object-cover' />
                <div className={`w-full lg:w-1/2 rounded-t-[2rem] overflow-hidden bg-white -mt-8 lg:mt-0`}>
                    <div className={`pt-12 md:pt-16 xl:pt-20 px-6 md:px-16 xl:px-20`}>
                        <div>
                            <div className='md:text-lg lg:text-xl 2xl:text-2xl mb-2 lg:mb-8'>{getSubtitle()}</div>
                        </div>
                        <div className='markup'>
                            <h1><span className='font-semibold'>Störtebeker Festspiele 2026</span> <br /><span className='font-normal'>Gutscheine</span></h1>
                        </div>
                        {/* Voucher selector placed next to image */}
                        {(isLoading || isInitLoading) && (
                            <div className='py-16 text-center'>Wird geladen…</div>
                        )}
                        {(error || initError) && (
                            <div className='py-16 text-center text-red-600'>Fehler beim Laden der Gutscheine</div>
                        )}
                    </div>


                    {!isLoading && !error && sortedProducts.length > 0 && (
                        <div className='mt-12 w-full h-full'>
                            {/* Type toggle */}
                            <div className='px-6 md:px-16 xl:px-20'>
                                <div className='flex w-full min-h-10 lg:h-14 items-center gap-0 text-[13px] md:text-sm lg:text-base border-[1.5px] border-black rounded-md overflow-hidden'>
                                    <button
                                        onClick={() => setSelectedType('digital')}
                                        className={`h-10 lg:h-14 flex-1 px-2 py-1 flex items-center justify-center font-normal transition-colors ${selectedType === 'digital' ? 'bg-darkBlue text-white' : 'hover:bg-gray-100'}`}
                                    >
                                        Digitaler Gutschein
                                    </button>
                                    <button
                                        onClick={() => setSelectedType('physical')}
                                        className={`h-10 lg:h-14 flex-1 px-2 py-1 flex items-center justify-center transition-colors ${selectedType === 'physical' ? 'bg-darkBlue text-white' : 'hover:bg-gray-100'}`}
                                    >
                                        Gutscheinkarte
                                    </button>
                                </div>
                            </div>

                            {/* Custom Amount slider */}
                            {amounts.length > 0 && (
                                <div className='px-6 md:px-16 xl:px-20 pb-4 lg:pb-12'>
                                    <div className='hidden lg:block mt-20 px-3'>
                                        <div
                                            ref={sliderRef}
                                            className='relative w-full h-4 cursor-pointer select-none pb-12'
                                            onMouseDown={(e) => handleStart(e.clientX)}
                                            onTouchStart={(e) => {
                                                e.preventDefault();
                                                if (e.touches[0]) {
                                                    handleStart(e.touches[0].clientX);
                                                }
                                            }}
                                        >
                                            {/* Track background */}
                                            <div className='absolute top-1/2 left-0 w-full h-0.5 bg-darkBlue -translate-y-1/2' />

                                            {/* Tick marks (circles) */}
                                            {amounts.map((amt, i) => {
                                                const tickPercent = getTickLeftPercent(i);

                                                return (
                                                    <React.Fragment key={i}>
                                                        {/* Circle indicator - smaller and static */}
                                                        <div
                                                            className='absolute top-1/2 left-0 flex items-center justify-center -translate-y-1/2'
                                                            style={{
                                                                left: `${tickPercent}%`,
                                                                transform: 'translate(-50%, -50%)'
                                                            }}
                                                        >
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedIndex(i);
                                                                }}
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedIndex(i);
                                                                }}
                                                                onTouchStart={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedIndex(i);
                                                                }}
                                                                className='w-4 h-4 rounded-full cursor-pointer bg-white border-2 border-darkBlue'
                                                            />
                                                        </div>
                                                        {/* Price label below circle */}
                                                        <div
                                                            className='absolute top-1/2 left-0 flex items-center justify-center pointer-events-none mt-5'
                                                            style={{
                                                                left: `${tickPercent}%`,
                                                                transform: 'translate(-50%, 0)'
                                                            }}
                                                        >
                                                            <div className='text-base font-medium whitespace-nowrap'>
                                                                {formatPrice(amt)}
                                                            </div>
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })}

                                            {/* Draggable thumb - bigger and always darkBlue */}
                                            <div
                                                className={`absolute top-1/2 left-0 w-7 h-7 rounded-full bg-darkBlue border-2 border-darkBlue cursor-grab active:cursor-grabbing ${!isDragging ? 'transition-all duration-300 ease-out hover:scale-110' : ''}`}
                                                style={{
                                                    left: `${thumbPosition}%`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Amount selection for mobile */}
                            <div className='mt-8 lg:hidden'>
                                <div className='flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x py-1 px-6'>
                                    {amounts.map((amt, i) => {
                                        const isSelected = i === selectedIndex;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedIndex(i)}
                                                className={`flex-shrink-0 rounded-full px-4 py-2 text-sm border transition-colors ${isSelected ? 'bg-darkBlue text-white border-darkBlue' : 'border-darkBlue text-black'}`}
                                            >
                                                {formatPrice(amt)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>


                            {/* Quantity and Add */}
                            <div className='mt-12 lg:mt-16 flex items-center justify-between gap-2 lg:gap-6 lg:hidden px-6 md:px-16 xl:px-20'>
                                <div className="flex w-full h-10 items-center gap-2 border-[1.5px] border-black rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        className="h-10 w-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                        </svg>
                                    </button>
                                    <span className="w-full text-center font-medium">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(Math.min(MAX_QUANTITY_PER_ORDER, quantity + 1))}
                                        disabled={quantity >= MAX_QUANTITY_PER_ORDER}
                                        className="h-10 w-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </button>
                                </div>
                                <MainButton
                                    handleClick={addSelectedVoucherToBasket}
                                    label="Auswählen"
                                    size='small'
                                    style='primary'
                                    className='w-full'
                                />
                            </div>
                            <div className='hidden mt-16 lg:flex items-center justify-between gap-2 lg:gap-6 px-6 md:px-16 xl:px-20'>
                                <div className="flex w-fit min-w-36 lg:min-w-48 h-14 items-center gap-2 border-[1.5px] border-black rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        className="h-14 w-12 lg:w-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                        </svg>
                                    </button>
                                    <span className="w-8 lg:w-16 text-center font-medium">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(Math.min(MAX_QUANTITY_PER_ORDER, quantity + 1))}
                                        disabled={quantity >= MAX_QUANTITY_PER_ORDER}
                                        className="h-14 w-12 lg:w-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </button>
                                </div>
                                <MainButton
                                    handleClick={addSelectedVoucherToBasket}
                                    label="Auswählen"
                                    size='large'
                                    style='primary'
                                    className='w-full'
                                />
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className={`w-full ${componentContentPadding}`}>
                {/* Basket section for voucher items */}
                {state.basket.line_items.filter(li => li.type === 'voucher').length > 0 && (
                    <section ref={basketRef} className={`w-full`}>
                        <div className='mt-8'>
                            {/* Desktop table */}
                            <div className='hidden lg:block overflow-x-auto'>
                                <table className='w-full'>
                                    <thead className=''>
                                        <tr className='border-b-[1.5px] text-xl border-black'>
                                            <th className='text-left py-6 font-semibold'>Gutscheine</th>
                                            <th className='text-left py-6 w-40 font-semibold'>Typ</th>
                                            <th className='text-center py-6 w-40 font-semibold'>Anzahl</th>
                                            <th className='text-right py-6 w-40 font-semibold'>Preis</th>
                                            <th className='text-left py-6 w-24 font-semibold'><span className="sr-only">Aktionen</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className='text-xl'>
                                        {state.basket.line_items
                                            .filter(li => li.type === 'voucher')
                                            .map((item, index) => {
                                                const vItem = item as VoucherLineItem;
                                                return (
                                                    <tr key={item.id} className={`${index > 0 ? 'border-t-[1.5px] border-black' : ''}`}>
                                                        <td className='py-4'>
                                                            <div className='font-medium'>{vItem.name}</div>
                                                        </td>
                                                        <td className='py-4 w-40'>
                                                            {vItem.voucher_product_type === 'digital' ? 'Digital' : 'Gedruckt'}
                                                        </td>
                                                        <td className='py-4 w-40'>
                                                            <div className='flex justify-center'>
                                                                <div className='flex w-fit h-10 items-center gap-2 border-[1.5px] border-black rounded-md overflow-hidden'>
                                                                    <button onClick={() => updateVoucherQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className='h-10 w-12 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                                                                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 12H4' />
                                                                        </svg>
                                                                    </button>
                                                                    <span className='w-8 text-center font-medium'>{item.quantity}</span>
                                                                    <button onClick={() => updateVoucherQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= MAX_QUANTITY_PER_ORDER} className='h-10 w-12 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
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
                                                                    onClick={() => removeItem(item.id)}
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
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className='lg:hidden space-y-4'>
                                <h3 className="font-medium text-lg pb-2">Ausgewählte Gutscheine</h3>
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
                        </div>
                    </section>
                )}

                <section className='flex flex-col lg:flex-row justify-between lg:gap-12 mt-16'>
                    {/* Delivery options selection (required before checkout) */}
                    {state.initData && filteredDeliveryOptions.length > 0 && (
                        <div className={`w-full flex flex-col lg:w-2/5 pb-8 lg:pb-0`}>
                            <div className='text-lg lg:text-xl font-medium'>Versandoption *</div>
                            <div className='flex flex-col lg:flex-row w-full justify-between gap-12'>
                                <div className='flex flex-col w-full gap-4 mt-6'>
                                    {filteredDeliveryOptions.map(option => (
                                        <button
                                            key={option.id}
                                            onClick={() => dispatch({ type: 'SET_SHIPPING_OPTION', payload: option.id })}
                                            className={`flex w-full gap-6 items-center border-[1.5px] p-4 hover:cursor-pointer transition-colors hover:bg-gray-50 border-gray-900 rounded-md`}
                                        >
                                            <div className={`w-5 h-5 border-[1.5px] border-gray-900 rounded-full ${state.shippingOption === option.id ? 'bg-darkBlue' : ''}`}></div>
                                            <div className='flex-grow text-left'>
                                                <span className='lg:text-lg'>{option.type === 'digital' ? "Versand per E-Mail" : option.name}</span>
                                                {option.fee_amount > 0 && (
                                                    <span className='ml-2 text-sm text-gray-600'>
                                                        (+{formatPrice(option.fee_amount)})
                                                    </span>
                                                )}
                                            </div>
                                        </button>

                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                    }
                    <div className='flex flex-col justify-end w-full lg:w-2/5 lg:mt-6'>
                        <div className="my-8">
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
                                    <div className="flex justify-between text-xs">
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

                                {/* Total */}
                                <div className="flex justify-between items-center pt-6 border-t border-gray-700 mt-4">
                                    <span className="text-lg font-semibold">Zu zahlender Betrag:</span>
                                    <span className="text-xl font-semibold">{formatPrice(state.basket.financial_breakdown?.total_amount || 0)}</span>
                                </div>

                            </div>
                        </div>


                        <button
                            onClick={() => {
                                if (!state.shippingOption) {
                                    showNotification('Bitte wählen Sie eine Versandoption.', 'warning', 3000);
                                    return;
                                }
                                if (!state.basket.line_items.some(li => li.type === 'voucher')) {
                                    showNotification('Ihr Warenkorb ist leer. Bitte fügen Sie einen Gutschein hinzu.', 'warning', 3000);
                                    return;
                                }
                                dispatch({ type: 'SET_FLOW_MODE', payload: 'vouchers' });
                                dispatch({ type: 'SET_STEP', payload: 'checkout' });
                            }}
                            className='bg-darkBlue text-white px-16 py-4 flex items-center justify-center rounded-md hover:bg-darkBlue/90 transition-colors hover:cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed'
                            disabled={!state.shippingOption || !state.basket.line_items.some(li => li.type === 'voucher')}
                        >
                            Weiter zur Kasse
                        </button>
                    </div>
                </section>
            </section>
        </div >
    );
}


