export type PaymentDeadlineType = 'after_order_date' | 'before_show_date';

export interface ClientPaymentMethod {
  id: string;
  client_id: string;
  payment_method_id: string;
  payment_method_name: string; // From joined payment_methods table
  payment_method_key: string; // From joined payment_methods table
  label: string;
  payment_deadline_seconds: number | null;
  payment_deadline_type: PaymentDeadlineType;
  available_from_relative: number | null; // Time in minutes before show date when payment method becomes available
  frontend_available: boolean;
  admin_available: boolean;
  created_at: Date;
  updated_at: Date;
}