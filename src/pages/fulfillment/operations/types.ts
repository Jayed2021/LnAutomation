export interface OperationsOrderItem {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  picked_quantity: number;
  unit_price: number;
}

export interface OperationsOrder {
  id: string;
  order_number: string;
  woo_order_number: string | null;
  woo_order_id: number | null;
  order_date: string;
  fulfillment_status: string;
  cs_status: string;
  total_amount: number;
  packed_at: string | null;
  shipped_at: string | null;
  stock_shortage: boolean;
  has_prescription: boolean;
  customer: {
    full_name: string;
    phone_primary: string;
    address_line1?: string | null;
    city?: string | null;
    district?: string | null;
  };
  items: OperationsOrderItem[];
  courier_info: {
    courier_company: string | null;
    tracking_number: string | null;
  } | null;
}

export type TabKey = 'not_printed' | 'printed' | 'packed' | 'send_to_lab' | 'shipped';
