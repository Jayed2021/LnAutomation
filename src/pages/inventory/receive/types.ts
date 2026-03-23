export type ReceivingStep = 'qty_check' | 'qty_checked' | 'qc_in_progress' | 'complete';

export interface POForReceiving {
  id: string;
  po_number: string;
  supplier_name: string;
  expected_delivery_date: string | null;
  notes: string | null;
  created_at: string;
  items: POItemForReceiving[];
  activeSessions: ActiveSession[];
}

export interface POItemForReceiving {
  id: string;
  sku: string;
  product_name: string;
  product_image_url: string | null;
  ordered_quantity: number;
  received_quantity: number;
  landed_cost_per_unit: number;
  remaining: number;
}

export interface ActiveSession {
  id: string;
  shipment_name: string;
  step: ReceivingStep;
  created_at: string;
  updated_at: string;
}

export interface ReceiptLine {
  id?: string;
  po_item_id: string;
  product_id: string | null;
  sku: string;
  product_name: string;
  product_image_url: string | null;
  ordered_qty: number;
  qty_checked: number;
  qty_good: number;
  qty_damaged: number;
  landed_cost_per_unit: number;
  location_id: string;
  barcode: string;
  line_notes: string;
  lot_id?: string | null;
}

export interface ReceiptSession {
  id?: string;
  po_id: string;
  shipment_name: string;
  step: ReceivingStep;
  add_to_stock_immediately: boolean;
  stock_added_at_qty_check: boolean;
  qty_check_date: string;
  qc_date: string;
  qty_check_notes: string;
  qc_notes: string;
  good_photo_urls: string[];
  damaged_photo_urls: string[];
  damaged_drive_links: string[];
  good_drive_links: string[];
  shipment_db_id?: string | null;
  lines: ReceiptLine[];
}

export interface Location {
  id: string;
  code: string;
  name: string;
}
