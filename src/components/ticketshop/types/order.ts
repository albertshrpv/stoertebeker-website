import type { LineItem } from "./lineItem";

export type PaymentStatus = 'pending' | 'failed' | 'expired' | 'paid' | 'partly_refunded' | 'refunded';
export type DeliveryStatus = 'pending' | 'shipped' | 'cancelled';
// TODO: refine TicketType
export type TicketType = 'e-ticket' | 'printed-ticket';
export type DeliveryType = 'digital' | 'post' | 'pickup';

export type PaymentDeadlineType = 'after_order_date' | 'before_show_date' | 'none';

export interface PaymentMethodSnapshot {
    id: string; // id of client_payment_methods
    label: string;
    label_dict_key?: string | null;
    payment_deadline_seconds?: number | null;
    payment_deadline_type?: PaymentDeadlineType;
    payment_method: {
        id: string; // id of payment_methods
        name: string;
        key: string;
    };
}

export interface DeliveryOptionSnapshot {
    id: string;
    name: string;
    type: string; // e.g. 'digital' | 'immediate' | 'immediate-with-customer-data'
    fee_amount?: number;
    currency?: string;
    vat_rate?: number;
    // Optional/extended fields
    description?: string;
    lead_time_days?: number | null;
    tracking_supported?: boolean;
    metadata?: any;
}


export interface OrderAddressData {
    first_name: string;
    last_name: string;
    company?: string;
    street: string;
    address_add?: string;
    postcode: string;
    city: string;
    country_code: string; // ISO-2
    phone?: string;
    email?: string;
}

// VAT breakdown for different rates
export interface VatBreakdownItem {
    rate: number;              // VAT rate as percentage (e.g., 7, 19)
    amount: number;            // VAT amount for this rate
}

// Financial breakdown structure as required by the new API
export interface OrderFinancialBreakdown {
    subtotal: number;           // Base cost of items before discounts/fees
    total_amount: number;       // Total amount of the order (total_amount with voucher payments subtracted) - total amount for the customer to pay
    invoice_total: number;       // Total amount to be invoiced (total_amount without voucher payments)
    total_discount: number;     // Total discount amount (positive number)
    voucher_payments: number;   // Total voucher payments (treated as payment method)
    total_vat: number;         // Total VAT/tax amount
    vat_breakdown: VatBreakdownItem[]; // Breakdown by VAT rates
    total_system_fee: number;  // Platform/system fees
    delivery_fee: number;      // Shipping/delivery fee (now required)
    currency: string;          // 3-letter currency code (e.g., "EUR", "USD")
}

export interface OrderFinancialBreakdownSnapshot extends OrderFinancialBreakdown {
    timestamp: Date;
}


export interface OrderData {
    id: string;
    client_id: string;
    sales_group_id: string;
    order_number: number;
    customer_id: string | null;
    customer_first_name: string;
    customer_last_name: string;
    original_total_amount?: number;
    total_amount: number;
    currency: string;
    ticket_type: TicketType;

    // Financial breakdown information
    financial_breakdown?: OrderFinancialBreakdown | null;
    original_financial_breakdown?: OrderFinancialBreakdown | null;
    // chronological history of past financial breakdowns (e.g., after prior partial refunds)
    financial_breakdown_history?: OrderFinancialBreakdownSnapshot[] | null;
    total_refunded_amount?: number;

    payment_method_snapshot?: PaymentMethodSnapshot | null;
    payment_status: PaymentStatus;
    payment_transaction_id?: string | null;
    payment_transaction_data?: any | null;
    payment_status_history?: any | null;

    delivery_option_snapshot?: DeliveryOptionSnapshot | null;
    delivery_status: DeliveryStatus;
    delivery_status_history?: any | null;

    line_items?: LineItem[] | null;

    show_snapshot?: any | null;
    series_snapshot?: any | null;

    delivery_address?: OrderAddressData | null;
    billing_address?: OrderAddressData | null;

    // User who created the order
    created_by_user_id?: string | null;

    // Show and series IDs
    show_id?: string | null;
    series_id?: string | null;

    created_at: Date;
    updated_at: Date;
}