import React, { useEffect, useRef, useState } from 'react';
import type { CompleteSeatGroup, CompletePrice } from '../types/pricing';
import { formatPrice } from '../utils/priceFormatting';
import { getSeatPreviewImage } from '../utils/media';
import { MainButton } from './MainButton';

interface SeatGroupAccordionProps {
    seatGroups: CompleteSeatGroup[];
    onAddToBasket: (seatGroup: CompleteSeatGroup, priceCategory: CompletePrice, quantity: number) => void;
    blockedSeats?: string[];
}

interface PriceQuantity {
    [priceId: string]: number;
}

export default function SeatGroupAccordion({ seatGroups, onAddToBasket, blockedSeats = [] }: SeatGroupAccordionProps) {
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [quantities, setQuantities] = useState<Record<string, PriceQuantity>>({});
    const hasAutoExpandedRef = useRef(false);

    // Expand the single group by default (only once) if there is exactly one
    useEffect(() => {
        if (!hasAutoExpandedRef.current && seatGroups.length === 1) {
            setExpandedGroup(seatGroups[0].id);
            hasAutoExpandedRef.current = true;
        }
    }, [seatGroups]);

    // Helper function to calculate available seats per group
    const getAvailableSeatCount = (seatGroup: CompleteSeatGroup): number => {
        const lowerName = seatGroup.name.toLocaleLowerCase();
        const isWheelchairGroup = lowerName.includes('rollstuhl');

        // Combine globally blocked with group-level reserved seats
        const groupReserved = (seatGroup.reservation_active && Array.isArray(seatGroup.reserved_seats)) ? new Set(seatGroup.reserved_seats) : new Set<string>();

        if (isWheelchairGroup) {
            // Only wheelchair-type seats are eligible in wheelchair group
            const allowedTypes = new Set(["wheelchair", "wheelchair_side", "wheelchair_accompaniment"]);

            const totalOfType = seatGroup.seats.filter(s => allowedTypes.has(s.type)).length;
            const alreadyUnavailable = seatGroup.seats
                .filter(s => allowedTypes.has(s.type))
                .filter(s => blockedSeats.includes(s.seat_number) || groupReserved.has(s.seat_number)).length;

            // Capacity is exactly 25 total including blocked; remaining = 25 - alreadyUnavailable
            const remainingByCap = Math.max(0, 25 - alreadyUnavailable);
            // Also cannot exceed physically available seats after removing unavailable
            const physicallyAvailable = Math.max(0, totalOfType - alreadyUnavailable);
            return Math.min(remainingByCap, physicallyAvailable);
        }

        // Normal groups: count normal seats excluding blocked/reserved
        const allowedTypes = new Set(["normal"]);
        return seatGroup.seats.filter(seat => {
            if (!allowedTypes.has(seat.type)) return false;
            if (blockedSeats.includes(seat.seat_number)) return false;
            if (groupReserved.has(seat.seat_number)) return false;
            return true;
        }).length;
    };

    // Helper function to check if group has any available seats
    const hasAvailableSeats = (seatGroup: CompleteSeatGroup): boolean => {
        return getAvailableSeatCount(seatGroup) > 0;
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroup(expandedGroup === groupId ? null : groupId);
    };

    const updateQuantity = (groupId: string, priceId: string, change: number) => {
        setQuantities(prev => {
            const groupQuantities = prev[groupId] || {};
            const currentQuantity = groupQuantities[priceId] || 0;
            const newQuantity = Math.max(0, currentQuantity + change);

            return {
                ...prev,
                [groupId]: {
                    ...groupQuantities,
                    [priceId]: newQuantity
                }
            };
        });
    };

    const handleQuantityInputChange = (groupId: string, priceId: string, maxQuantity: number, value: string) => {
        // Parse the input value
        const numValue = parseInt(value, 10);
        
        // If empty string, set to 0
        if (value === '' || isNaN(numValue)) {
            setQuantities(prev => ({
                ...prev,
                [groupId]: {
                    ...prev[groupId] || {},
                    [priceId]: 0
                }
            }));
            return;
        }

        // Clamp value between 0 and maxQuantity
        const clampedValue = Math.max(0, Math.min(maxQuantity, numValue));
        
        setQuantities(prev => ({
            ...prev,
            [groupId]: {
                ...prev[groupId] || {},
                [priceId]: clampedValue
            }
        }));
    };

    const getQuantity = (groupId: string, priceId: string): number => {
        return quantities[groupId]?.[priceId] || 0;
    };

    const handleAddToBasket = (seatGroup: CompleteSeatGroup, priceCategory: CompletePrice) => {
        const quantity = getQuantity(seatGroup.id, priceCategory.id);
        if (quantity > 0) {
            onAddToBasket(seatGroup, priceCategory, quantity);
            // Reset quantity after adding to basket
            setQuantities(prev => ({
                ...prev,
                [seatGroup.id]: {
                    ...prev[seatGroup.id],
                    [priceCategory.id]: 0
                }
            }));
        }
    };

    // Sort seat groups by sort_order
    const sortedSeatGroups = [...seatGroups].sort((a, b) => a.sort_order - b.sort_order);

    return (
        <div className="p-4 md:p-16">
            {/* <div className="text-xl mb-12 text-start">
                Bitte wählen Sie Ihre Platzgruppe:
            </div> */}

            <div className="bg-white shadow-[0_0_20px_rgba(0,0,0,0.08)] z-10 rounded-2xl">
                {sortedSeatGroups.map((group, idx) => {
                    const isExpanded = expandedGroup === group.id;
                    const availableCount = getAvailableSeatCount(group);
                    const groupHasAvailableSeats = hasAvailableSeats(group);
                    // Sort prices by sort_order
                    const sortedPrices = [...group.prices].sort((a, b) => a.sort_order - b.sort_order);

                    return (
                        <div key={group.id} className="overflow-hidden">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(group.id)}
                                className="w-full py-4 md:py-12 flex items-center justify-between px-4 md:px-16"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-lg md:text-xl font-medium text-black text-left">
                                        <div className="flex items-center gap-3">
                                            <span>{group.name}</span>
                                            <span className={`text-xs md:text-sm font-normal px-2 py-1 rounded-full ${groupHasAvailableSeats
                                                    ? availableCount <= 10
                                                        ? 'bg-orange-100 text-orange-800'
                                                        : 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {groupHasAvailableSeats
                                                    ? `${availableCount} verfügbar`
                                                    : 'Ausverkauft'
                                                }
                                            </span>
                                        </div>
                                        {group.description && (
                                            <div className="text-sm text-gray-600 font-normal">
                                                {group.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Expandable Content */}
                            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                                <div className="px-4 md:px-16">
                                {groupHasAvailableSeats ? (
                                    // Show prices when seats are available
                                    <>
                                        {sortedPrices.map((price) => {
                                            const quantity = getQuantity(group.id, price.id);
                                            const maxQuantity = availableCount;

                                            return (
                                                <div key={price.id} className="py-6 md:py-8 border-t-4 border-gray-100" style={{ borderTopStyle: 'dashed', borderTopWidth: '2px', borderTopColor: '#f3f4f6', borderImage: 'repeating-linear-gradient(to right, #f3f4f6 0, #f3f4f6 8px, transparent 8px, transparent 16px) 1' }}>
                                                    {/* Mobile Layout */}
                                                    <div className="block md:hidden">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div className="text-base font-medium text-black">
                                                                {price.category_name}
                                                            </div>
                                                            <div className="text-base font-semibold text-black">
                                                                {formatPrice(price.price)}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between gap-2">
                                                            {/* Quantity Controls */}
                                                            <div className="flex w-fit h-10 items-center gap-2 border border-black dark:border-white dark:text-white rounded-md overflow-hidden">
                                                                <button
                                                                    onClick={() => updateQuantity(group.id, price.id, -1)}
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
                                                                    onClick={() => updateQuantity(group.id, price.id, 1)}
                                                                    disabled={quantity >= maxQuantity}
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
                                                                handleClick={() => handleAddToBasket(group, price)}
                                                                disabled={quantity === 0}
                                                                label="Auswählen"
                                                                size="small"
                                                                style={quantity > 0 ? 'primary' : 'secondary'}
                                                             />
                                                        </div>
                                                    </div>

                                                    {/* Desktop Layout */}
                                                    <div className="hidden md:flex items-center justify-between">
                                                        <div className="text-xl text-black">
                                                            {price.category_name}
                                                        </div>

                                                        <div className="flex items-center gap-12">
                                                            <div className="text-lg text-black font-semibold">
                                                                {formatPrice(price.price)}
                                                            </div>
                                                            {/* Quantity Controls */}
                                                            <div className="flex w-fit h-10 items-center gap-2 border border-black dark:border-white dark:text-white rounded-md overflow-hidden">
                                                                <button
                                                                    onClick={() => updateQuantity(group.id, price.id, -1)}
                                                                    disabled={quantity === 0}
                                                                    className="h-10 w-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-darkBlue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                    aria-label="Anzahl verringern"
                                                                    title="Anzahl verringern"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                                    </svg>
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    id={`quantity-${group.id}-${price.id}`}
                                                                    name={`quantity-${group.id}-${price.id}`}
                                                                    min="0"
                                                                    max={maxQuantity}
                                                                    value={quantity}
                                                                    onChange={(e) => handleQuantityInputChange(group.id, price.id, maxQuantity, e.target.value)}
                                                                    className="w-8 text-center font-medium bg-transparent border-0 focus:outline-none focus:ring-0 px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    aria-label={`Anzahl für ${price.category_name}`}
                                                                    tabIndex={0}
                                                                />
                                                                <button
                                                                    onClick={() => updateQuantity(group.id, price.id, 1)}
                                                                    disabled={quantity >= maxQuantity}
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
                                                                handleClick={() => handleAddToBasket(group, price)}
                                                                disabled={quantity === 0}
                                                                label="Auswählen"
                                                                size="small"
                                                                style={quantity > 0 ? 'primary' : 'secondary'}
                                                            />
                                                            
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                ) : (
                                    // Show sold out message when no seats are available
                                    <div className="py-16 text-center">
                                        <div className="text-xl text-gray-500 mb-4">
                                            Diese Kategorie ist ausverkauft
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            Alle Plätze in dieser Kategorie sind bereits reserviert oder gebucht.
                                        </div>
                                    </div>
                                )}
                                </div>
                                <img
                                    src={getSeatPreviewImage(group.seats[0].seat_row)}
                                    alt="Seat view"
                                    className={`w-full h-auto object-cover rounded-sm ${idx !== sortedSeatGroups.length - 1 ? 'mb-0' : ''}`}
                                />
                            </div>
                            {idx !== sortedSeatGroups.length - 1 && <div className="border-b-2 lg:border-b-4 border-gray-100 mx-4 md:mx-16"></div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}