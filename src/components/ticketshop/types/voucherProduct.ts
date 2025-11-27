export interface VoucherProduct {
    id: string;
    client_id: string;
    name: string;
    description?: string | null;
    voucher_amount: number;
    currency: string;
    validity_months: number;
    image?: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}


export const MAX_QUANTITY_PER_ORDER = 10;