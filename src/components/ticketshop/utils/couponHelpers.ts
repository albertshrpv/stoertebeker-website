import type { CouponApplicationContext } from '../api/coupons';
import type { BookingState } from '../contexts/BookingContext';
import type { TicketLineItem, CouponLineItem } from '../types/lineItem';

/**
 * Builds the order context needed for coupon validation
 */
export function buildCouponApplicationContext(state: BookingState, customerId?: string): CouponApplicationContext {
    const { basket, selectedShow, seasonId, initData } = state;

    const series = state.initData?.availableSeries;
    const seriesId = series?.find(series => series.id === selectedShow?.series_id)?.id;

    
    // Get seat group IDs from ticket items
    const seatGroupIds = basket.line_items
        .filter(item => item.type === 'ticket')
        .map(item => (item as TicketLineItem).seat_group_id)
        .filter((id, index, array) => array.indexOf(id) === index); // Remove duplicates
    
    return {
        currency: basket.financial_breakdown?.currency || 'EUR',
        lineItems: basket.line_items,
        deliveryFee: basket.financial_breakdown?.delivery_fee || 0,
        seatGroupIds,
        showId: selectedShow?.id,
        seriesId,
        seasonId,
        pricingGroupId: undefined, // Not used in this context
        customerId: customerId || undefined
    };
}

/**
 * Checks for duplicate coupon codes in the basket
 * Returns an array of duplicate coupon codes found
 */
export function checkForDuplicateCoupons(state: BookingState): string[] {
    const couponCodes = state.basket.line_items
        .filter(item => item.type === 'coupon')
        .map(item => (item as CouponLineItem).coupon_code);
    
    // Find duplicates
    const duplicates: string[] = [];
    const seen = new Set<string>();
    
    for (const code of couponCodes) {
        if (seen.has(code)) {
            if (!duplicates.includes(code)) {
                duplicates.push(code);
            }
        } else {
            seen.add(code);
        }
    }
    
    return duplicates;
}

