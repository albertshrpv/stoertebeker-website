export interface CompletePricingStructure {
    name: string;
    slug: string;
    description?: string;
    is_template?: boolean;
    seat_groups: CompleteSeatGroup[];
    link_key?: string;
}

export interface CompleteSeatGroup {
    reserved: any;
    id: string;
    name: string;
    description?: string;
    color?: string;
    sort_order: number;
    reserved_seats: string[];
    reservation_active: boolean;
    seats: CompleteSeat[];
    prices: CompletePrice[];
    link_key?: string;
}

export interface CompleteSeat {
    id: string;
    seat_number: string;
    seat_row: string;
    seat_row_number: number;
    linked_seat_number?: string;
    type: "normal" | "wheelchair" | "wheelchair_side" | "wheelchair_accompaniment" | "bestplatz";
}

export interface CompletePrice {
    id: string;
    category_name: string;
    price: string;
    currency: string;
    vat_rate: number;
    sort_order: number;
    exclude_system_fee: boolean;
    custom_fields?: CustomField[];
    link_key?: string;
}

export interface CustomField {
    id: string;
    field_name: string;
    field_type: 'boolean' | 'string';
    default_value?: string | null;
    is_required: boolean;
    sort_order: number;
} 