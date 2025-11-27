import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '../api/booking';
import type { EventSeriesData } from '../types/eventSeries';
import type { MinimalEventShowData } from '../types/eventShow';
import type { ClientPaymentMethod } from '../types/paymentMethod';
import type { DeliveryOptionData } from '../types/deliveryOption';
import type { MainOrganizerData } from '../types/mainOrganizer';

export interface InitData {
  availableSeries: EventSeriesData[];
  allShows: MinimalEventShowData[];
  paymentMethods: ClientPaymentMethod[];
  deliveryOptions: DeliveryOptionData[];
  mainOrganizer: MainOrganizerData;
}

export function useInitData(seasonId: string) {
  return useQuery<InitData>({
    queryKey: ['bookingInit', seasonId],
    queryFn: async (): Promise<InitData> => {
      if (!seasonId) {
        throw new Error('Season ID is required');
      }

      const response = await bookingApi.init(seasonId);
      if (!response.data.success || !response.data.data) {
        throw new Error('Failed to initialize booking');
      }

      const raw = response.data.data;


      return {
        availableSeries: raw.availableSeries,
        allShows: raw.allShows,
        paymentMethods: raw.paymentMethods,
        deliveryOptions: raw.deliveryOptions,
        mainOrganizer: raw.mainOrganizer,
      };
    },
    enabled: !!seasonId,
    staleTime: 5 * 60 * 1000,
  });
}


