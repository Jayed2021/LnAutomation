export interface Customer {
  id: string;
  woo_customer_id: number | null;
  full_name: string;
  email: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  district: string | null;
  postal_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  total_orders: number;
  successful_deliveries: number;
  failed_deliveries: number;
  cancelled_orders: number;
  total_spent: number;
  avg_order_value: number | null;
  delivery_success_rate: number | null;
  first_order_date: string | null;
  last_order_date: string | null;
  has_delivered_order: boolean;
}

export interface CustomerOrder {
  id: string;
  order_number: string;
  cs_status: string;
  order_date: string;
  total_amount: number;
}

export interface CustomerPrescription {
  id: string;
  customer_id: string;
  prescription_type: string | null;
  od_sph: string | null;
  od_cyl: string | null;
  od_axis: string | null;
  od_pd: string | null;
  os_sph: string | null;
  os_cyl: string | null;
  os_axis: string | null;
  os_pd: string | null;
  notes: string | null;
  source_order_id: string | null;
  recorded_date: string | null;
  created_at: string;
}

export interface CreateCustomerPayload {
  full_name: string;
  phone_primary: string;
  phone_secondary?: string;
  email?: string;
  address_line1?: string;
  city?: string;
  district?: string;
  notes?: string;
}

export interface UpdateCustomerPayload {
  full_name?: string;
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;
  address_line1?: string;
  city?: string;
  district?: string;
  notes?: string;
}
