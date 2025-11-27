import type { CompleteSeat, CompletePrice } from "./pricing";
import type { CrossSellingProductData, FrontendCrossSellingProductType   } from "./crossSellingProduct";
import type { VatBreakdownItem } from "./order";
import type { VoucherProduct } from "./voucherProduct";

export type LineItemType = 'ticket' | 'crossselling' | 'coupon' | 'voucher';
export type VoucherProductType = 'digital' | 'physical';

// Enums and types from the implementation guide
export type DiscountType = 'percentage' | 'fixed_amount';
export type AppliesTo = 'all' | 'tickets_only' | 'cross_selling_only';
export type CouponRuleType = 'show' | 'series' | 'season' | 'pricing_group' | 'seat_group';

interface VoucherLineItemCoupon {
    id: string;
    client_id: string;
    code: string;
    name: string;
    description?: string | null;

    // Discount configuration
    discount_type: DiscountType;
    discount_value: number;
    currency: string;
    max_discount_amount?: number | null;

    // Usage limits
    max_uses?: number | null;
    max_uses_per_customer?: number | null;
    current_uses: number;

    // Validity period
    valid_from: string; // ISO date
    valid_until: string; // ISO date
    // Weekday validity: array of abbreviations like "Mon","Tue"; null/undefined = all days
    valid_weekdays?: string[] | null;

    // Minimum purchase requirements
    min_order_amount?: number | null;
    min_quantity?: number | null;

    // Applicability rules
    applies_to: AppliesTo;
    auto_apply: boolean;
    stackable: boolean;

    // Admin settings
    admin_only: boolean;
    is_active: boolean;
    internal_notes?: string | null;

    // Voucher-specific fields (null for regular coupons)
    voucher_product_id?: string | null;
    voucher_purchased_amount?: number | null;
    voucher_remaining_balance?: number | null;
    voucher_purchased_by_customer_id?: string | null;
    voucher_purchase_order_id?: string | null;

    // Email log for voucher code sends
    voucher_code_recipient_emails?: string | null;

    created_at: string;
    updated_at: string;
}




export interface BaseLineItem {
    id: string;
    type: LineItemType;
    quantity: number;
    unit_price: number;
    total_price: number;
    currency: string;
    vat_rate: number;
    name: string;
}

export interface TicketLineItem extends BaseLineItem {
    type: 'ticket';
    show_id: string;
    show_date: Date;
    show_time: string;
    seat: CompleteSeat;
    seat_group_id: string;
    seat_group_name: string;
    price_category: CompletePrice;
    custom_fields?: Record<string, string | boolean>;
    refunded?: boolean;
    // When a ticket is exchanged to a different price category
    // the previous ticket line is marked as exchanged and linked via an exchange id
    exchanged?: boolean;
    // Shared id to correlate the old and replacement ticket in an exchange
    exchange_id?: string | null;
    // Indicates that the ticket's system fee was refunded (typically when refunded while order was pending)
    system_fee_refunded?: boolean;
    // Generated tickets linkage
    ticket_id?: string;
    ticket_hash?: string;
    // Free seat selection flag
    free_seat_selection?: boolean;
    // Origin tracking for Bestplatz/group tickets to convert back on step back
    best_seat_origin?: boolean;
}

export interface CrossSellingLineItem extends BaseLineItem {
    type: 'crossselling';
    cross_selling_product_type: FrontendCrossSellingProductType;
    product_id: string;
    product: CrossSellingProductData;
    system_fee: number;
    system_fee_vat_rate: number;
    generate_qr_code: boolean;
    is_refundable: boolean;
    refunded?: boolean;
    // Indicates that the system fee for the refunded portion was refunded (e.g., refund while pending)
    system_fee_refunded?: boolean;
    // Generated tickets linkage when generate_qr_code is true
    ticket_id?: string;
    ticket_hash?: string;
}

export interface TicketAddOnLineItem extends CrossSellingLineItem {
    ticket_line_item_id: string;
}

export interface VoucherLineItem extends Omit<BaseLineItem, 'vat_rate'> {
    type: 'voucher';
    voucher_product_id: string;
    voucher_product: VoucherProduct;
    voucher_product_type: VoucherProductType;
    // VAT is always 0% for Multi-Purpose Vouchers per EU regulation
    // No vat_rate field needed since it's always 0
    generated_coupons?: VoucherLineItemCoupon[];
    refunded?: boolean;
}

export interface CouponSnapshot {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    currency: string;
    max_discount_amount?: number | null;
    applies_to: 'all' | 'tickets_only' | 'cross_selling_only';
    auto_apply: boolean;
    stackable: boolean;
    valid_from: Date;
    valid_until: Date;
    min_order_amount?: number | null;
    min_quantity?: number | null;
    is_voucher: boolean;
    snapshot_created_at: Date | string;
}

export interface CouponLineItem extends BaseLineItem {
    type: 'coupon';
    coupon_id: string;
    coupon_code: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;

    // Voucher support
    is_voucher?: boolean;
    voucher_applied_amount?: number;
    voucher_remaining_balance?: number;

    // Historical data
    coupon_snapshot?: CouponSnapshot;

    // Mark coupon as refunded when it becomes invalid due to basket changes
    refunded?: boolean;
    // Note: total_price should be negative for discounts
}

export type LineItem = TicketLineItem | CrossSellingLineItem | CouponLineItem | TicketAddOnLineItem | VoucherLineItem;

export interface BasketData {
    line_items: LineItem[];
    financial_breakdown?: import('./order').OrderFinancialBreakdown | null;
}