import type { EventShowData } from "../types/eventShow";
import { api } from "./base";
import type { ApiResponse, EventSeriesPaginationParams, EventShowPaginationParams } from "./types";
import { buildQueryString } from "./utils";

// Events endpoints - all under /events base path
export const eventsApi = {

    // Event Seasons endpoints
    seasons: {
        getBySlug: (slug: string) => api.get(`/events/seasons/slug/${slug}`),
    },

    // Event Series endpoints (Vorstellungsserien)
    series: {
        getAll: (params?: EventSeriesPaginationParams) => {
            const queryString = params ? buildQueryString(params) : '';
            const url = queryString ? `/events/series?${queryString}` : '/events/series';
            return api.get(url);
        },
        getBySlug: (slug: string) => api.get(`/events/series/slug/${slug}`),
        getBySeason: (seasonId: string) => api.get(`/events/series/season/${seasonId}`),
    },

    // Individual Event Shows endpoints (Vorstellungen)
    shows: {
        getAll: (params?: EventShowPaginationParams) => {
            const queryString = params ? buildQueryString(params) : '';
            const url = queryString ? `/events/shows?${queryString}` : '/events/shows';
            return api.get<ApiResponse<{ eventShows: EventShowData[] }>>(url);
        },
        getBySlug: (slug: string) => api.get(`/events/shows/slug/${slug}`),
        getById: (id: string) => api.get(`/events/shows/id/${id}`),
    },
}; 