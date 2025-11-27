import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../api/events';
import type { EventShowData } from '../types/eventShow';


export function useEventShow(slug: string) {
    return useQuery<EventShowData>({
        queryKey: ['eventShow', slug],
        queryFn: async (): Promise<EventShowData> => {
            if (!slug) {
                throw new Error('Show slug is required');
            }

            const response = await eventsApi.shows.getBySlug(slug);

            if (!response.data.success || !response.data.data) {
                throw new Error('Failed to fetch event show');
            }

            return response.data.data as EventShowData;
        },
        enabled: !!slug,
        staleTime: 5 * 60 * 1000, // 5 minutes - same as QueryProvider default
    });
} 