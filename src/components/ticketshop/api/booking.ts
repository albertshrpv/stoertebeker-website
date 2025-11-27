import { api } from './base';
import type { ApiResponse } from './types';
import type { EventSeriesData } from '../types/eventSeries';
import type { MinimalEventShowData } from '../types/eventShow';
import type { ClientPaymentMethod } from '../types/paymentMethod';
import type { DeliveryOptionData } from '../types/deliveryOption';
import type { MainOrganizerData } from '../types/mainOrganizer';

// Raw shape from API can vary for shows, normalize in hooks
export interface BookingInitRawResponse {
  availableSeries: EventSeriesData[];
  allShows: MinimalEventShowData[];
  paymentMethods: ClientPaymentMethod[];
  deliveryOptions: DeliveryOptionData[];
  mainOrganizer: MainOrganizerData;
}

export const bookingApi = {
  init: (seasonId: string) => api.get<ApiResponse<BookingInitRawResponse>>(`/booking/init/${seasonId}`),
};


