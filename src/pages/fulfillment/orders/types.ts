export type CsStatus =
  | 'new_not_called'
  | 'new_called'
  | 'confirmed'
  | 'awaiting_payment'
  | 'late_delivery'
  | 'send_to_lab'
  | 'in_lab'
  | 'not_printed'
  | 'printed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refund'
  | 'exchange'
  | 'partial_delivery';

export interface OrderListItem {
  id: string;
  order_number: string;
  woo_order_id: number | null;
  woo_order_number: string | null;
  order_date: string;
  cs_status: CsStatus;
  total_amount: number;
  expected_delivery_date: string | null;
  has_prescription: boolean;
  customer: {
    full_name: string;
    phone_primary: string;
  };
  assigned_user: {
    id: string;
    full_name: string;
  } | null;
  confirmed_user: {
    id: string;
    full_name: string;
  } | null;
}

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  new_not_called: { label: 'New & Not Called', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  new_called:     { label: 'New & Called',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  confirmed:      { label: 'Confirmed',         color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  awaiting_payment: { label: 'Awaiting Payment', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  late_delivery:  { label: 'Late Delivery',     color: 'text-amber-800', bg: 'bg-amber-100', border: 'border-amber-300' },
  send_to_lab:    { label: 'Send to Lab',       color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  in_lab:         { label: 'In Lab',            color: 'text-teal-800', bg: 'bg-teal-100', border: 'border-teal-300' },
  not_printed:    { label: 'Not Printed',       color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  printed:        { label: 'Printed',           color: 'text-slate-700', bg: 'bg-slate-200', border: 'border-slate-300' },
  packed:         { label: 'Packed',            color: 'text-slate-800', bg: 'bg-slate-300', border: 'border-slate-400' },
  shipped:        { label: 'Shipped',           color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  delivered:      { label: 'Delivered',         color: 'text-green-800', bg: 'bg-green-100', border: 'border-green-300' },
  cancelled:      { label: 'Cancelled',         color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  refund:         { label: 'Refund',            color: 'text-red-800', bg: 'bg-red-100', border: 'border-red-300' },
  exchange:       { label: 'Exchange',          color: 'text-blue-800', bg: 'bg-blue-100', border: 'border-blue-300' },
  partial_delivery: { label: 'Partial Delivery', color: 'text-orange-800', bg: 'bg-orange-100', border: 'border-orange-300' },
};
