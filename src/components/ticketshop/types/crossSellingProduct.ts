// Frontend types
export enum FrontendCrossSellingProductType {
    PROGRAMM_BOOKLET = 'programm_booklet',
    GASTRONOMY_VOUCHER = 'gastronomy_voucher',
    PRE_SHOW = 'pre_show',
    VIP_CARD = 'vip_card',
}


export interface CrossSellingProductData {
    id: string;
    client_id: string;
    type: string; // UUID reference to cross_selling_product_types.id
    type_name?: string; // The actual type name from the types table (when joined)
    name: string;
    action_label?: string;
    price_label?: string;
    link_keys?: string[] | null;
    max_quantity?: number;
    price: number;
    image?: string; // image name 
    system_fee: number;
    system_fee_vat_rate: number;
    vat_rate: number;
    currency: string;
    only_valid_on_show_date: boolean;
    generate_qr_code: boolean;
    is_refundable: boolean;
    is_ticket_add_on: boolean;
    is_active: boolean;
    shopify_adjust_inventory: boolean;
    shopify_inventory_id?: string;
    shopify_client_id?: string;
    shopify_client_secret?: string;
    created_at: Date;
    updated_at: Date;
}