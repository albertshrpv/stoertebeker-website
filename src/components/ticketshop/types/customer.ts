export interface AddressData {
    id: string;
    customer_id: string;
    name: string;
    is_default: boolean;
    first_name: string;
    last_name: string;
    company?: string;
    street: string;
    address_add?: string;
    postcode: string;
    city: string;
    country_code: string;
    created_at: Date;
    updated_at: Date;
}

export interface UpdateCustomerData {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    date_of_birth?: string; // YYYY-MM-DD
    is_active?: boolean;
    addresses?: UpdateCustomerAddressData[];
}

export interface CreateCustomerAddressData {
    name: string;
    is_default?: boolean;
    first_name: string;
    last_name: string;
    company?: string;
    street: string;
    address_add?: string;
    postcode: string;
    city: string;
    country_code?: string;
}

export interface UpdateCustomerAddressData {
    id?: string; // If provided, update existing address; if not, create new
    name?: string;
    is_default?: boolean;
    first_name?: string;
    last_name?: string;
    company?: string;
    street?: string;
    address_add?: string;
    postcode?: string;
    city?: string;
    country_code?: string;
    _delete?: boolean; // If true, delete this address
}