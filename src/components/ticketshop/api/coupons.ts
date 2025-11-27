import { api } from './base';
import type { CouponLineItem, LineItem } from '../types/lineItem';

// Coupon application context
export interface CouponApplicationContext {
    currency: string;
    lineItems: LineItem[]; // Full line items for granular discount calculation
    deliveryFee: number;
    showId?: string;
    seriesId?: string;
    seasonId?: string; // always null here
    pricingGroupId?: string;
    seatGroupIds: string[];
    customerId?: string;
}


// Coupon validation request
export interface CouponValidationRequest {
    codes: string[];
    context: CouponApplicationContext;
    stackingStrategy?: 'default';
}

// Individual coupon validation result
export interface ValidCouponResult {
    code: string;
    coupon: any; // CouponData from backend
    discountAmount: number;
    lineItem: CouponLineItem;
    appliedOrder: number;
}

export interface RejectedCouponResult {
    code: string;
    errors: string[];
    warnings: string[];
}

// Coupon validation response
export interface CouponValidationResponse {
    success: boolean;
    data: {
        validCoupons: ValidCouponResult[];
        rejectedCoupons: RejectedCouponResult[];
        totalDiscount: number;
        finalOrderAmount: number;
        stackingStrategy: string;
    };
}

// Auto-apply coupon result
export interface AutoApplyCouponResult {
    coupon: any; // CouponData from backend
    discountAmount: number;
    lineItem: CouponLineItem;
}

// Auto-apply response
export interface AutoApplyResponse {
    success: boolean;
    data: AutoApplyCouponResult[];
}

export const couponsApi = {
    // Validate one or more coupon codes
    validate: (request: CouponValidationRequest) =>
        api.post<CouponValidationResponse>('/coupons/validate', request),

    // Get auto-applicable coupons based on order context
    autoApply: (context: CouponApplicationContext) => {
        const requestBody = {
            currency: context.currency,
            lineItems: context.lineItems,
            seatGroupIds: context.seatGroupIds,
            ...(context.customerId && { customerId: context.customerId }),
            ...(context.showId && { showId: context.showId }),
            ...(context.seriesId && { seriesId: context.seriesId }),
            ...(context.seasonId && { seasonId: context.seasonId }),
            ...(context.pricingGroupId && { pricingGroupId: context.pricingGroupId }),
        };

        return api.post<AutoApplyResponse>('/coupons/auto-apply', requestBody);
    }
};
