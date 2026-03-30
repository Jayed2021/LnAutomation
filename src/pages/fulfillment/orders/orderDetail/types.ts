export interface CouponLine {
  code: string;
  discount: string;
  discount_tax: string;
}

export interface FeeLine {
  name: string;
  amount: string;
  total: string;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  woo_order_id: number | null;
  woo_order_number: string | null;
  order_date: string;
  created_at: string;
  cs_status: string;
  fulfillment_status: string | null;
  payment_method: string | null;
  payment_status: string;
  payment_reference: string | null;
  paid_amount: number | null;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  order_source: string | null;
  order_type: string;
  conversation_url: string | null;
  meta_screenshot_url: string | null;
  confirmation_type: string | null;
  courier_entry_method: string | null;
  late_delivery_reason: string | null;
  expected_delivery_date: string | null;
  exchange_return_id: string | null;
  cancellation_reason: string | null;
  partial_delivery_notes: string | null;
  notes: string | null;
  stock_shortage: boolean;
  coupon_lines: CouponLine[] | null;
  fee_lines: FeeLine[] | null;
  customer_note: string | null;
  customer: {
    id: string;
    full_name: string;
    phone_primary: string;
    phone_secondary: string | null;
    email: string | null;
    address_line1: string | null;
    city: string | null;
    district: string | null;
  };
  assigned_user: { id: string; full_name: string } | null;
  confirmed_user: { id: string; full_name: string } | null;
}

export interface WooMetaEntry {
  key: string;
  value: string;
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  sku: string;
  product_name: string;
  quantity: number;
  picked_quantity: number;
  unit_price: number;
  line_total: number;
  discount_amount: number;
  pick_location: string | null;
  meta_data: WooMetaEntry[] | null;
  woo_item_id: number | null;
  regular_price: number | null;
}

export interface OrderCourierInfo {
  id: string;
  courier_company: string | null;
  tracking_number: string | null;
  courier_area: string | null;
  total_receivable: number;
  collected_amount: number;
  delivery_charge: number;
  cod_charge: number;
  settlement_source: 'courier_api' | 'invoice_upload' | 'manual' | null;
  total_receivable_modified_after_ship: boolean;
  total_receivable_ship_note: string | null;
  consignment_id: string | null;
  courier_status: string | null;
  courier_status_updated_at: string | null;
  courier_api_response: Record<string, unknown> | null;
  courier_api_error: string | null;
}

export interface OrderPrescription {
  id: string;
  order_item_id: string | null;
  prescription_type: string | null;
  lens_type: string | null;
  custom_lens_type: string | null;
  customer_price: number;
  lens_price: number;
  fitting_charge: number;
  od_sph: string | null;
  od_cyl: string | null;
  od_axis: string | null;
  od_pd: string | null;
  os_sph: string | null;
  os_cyl: string | null;
  os_axis: string | null;
  os_pd: string | null;
  rx_file_url: string | null;
  lab_status: string;
  lab_sent_date: string | null;
  lab_return_date: string | null;
}

export interface OrderNote {
  id: string;
  note_text: string;
  created_at: string;
  created_by_user: { full_name: string } | null;
}

export interface CallLog {
  id: string;
  notes: string | null;
  created_at: string;
  called_by_user: { full_name: string } | null;
}

export interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  performed_by_user: { full_name: string } | null;
}

export interface PackagingItem {
  id: string;
  product_id: string | null;
  sku: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  source_order_item_id: string | null;
  source_item_name: string | null;
}
