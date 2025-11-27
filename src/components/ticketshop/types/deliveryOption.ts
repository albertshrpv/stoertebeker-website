export type DeliveryOptionType = 'digital' | 'post' | 'pickup';

export interface DeliveryOptionData {
  id: string;
  client_id: string;
  name: string;
  type: DeliveryOptionType;
  fee_amount: number;
  currency: string;
  vat_rate: number;
}