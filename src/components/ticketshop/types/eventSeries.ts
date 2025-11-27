export interface EventSeriesData {
    id: string;
    season_id: string;
    slug: string;
    name: string;
    subtitle: string;
    content?: string;
    image?: string; // image name 
    start_date: Date;
    end_date: Date;
}