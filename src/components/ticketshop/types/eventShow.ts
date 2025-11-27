import type { CrossSellingProductData } from "./crossSellingProduct";
import type { CompletePricingStructure } from "./pricing";

export interface EventShowData {
    id: string;
    season_id: string; // Always required - direct or inherited from series
    series_id?: string; // Optional - NULL for standalone shows
    name: string; // Show name - for series shows can default to series name + date
    slug: string; // Unique slug for the show
    date: Date;
    bookable_by: ('main-organizer' | 'main-organizer-on-site' | 'main-organizer-phone' | 'box-office')[]; // Self-contained booking permissions
    show_time: string; // TIME type from database
    show_duration: number; // Duration in minutes
    image?: string; // image name 
    notes?: string;
    presale_start: Date; // Self-contained presale start
    presale_end_relative: number; // Self-contained presale end relative time
    free_seat_selection: boolean;
    created_at: Date;
    updated_at: Date;
    series_name: string;
    series_slug: string;
    season_name: string;
    season_slug: string;
    pricing_structure?: CompletePricingStructure;
    cross_selling_products?: CrossSellingProductData[];
}


export interface MinimalEventShowData {
    id: string;
    slug: string;
    date: Date;
}