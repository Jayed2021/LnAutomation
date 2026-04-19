export interface ShipmentPerformanceRow {
  shipment_db_id: string;
  shipment_label: string;
  po_number: string;
  po_id: string;
  supplier_name: string;
  supplier_type: string;
  received_date: string;
  po_created_at: string;
  expected_delivery_date: string | null;
  age_days: number;
  lead_time_days: number | null;
  units_in: number;
  units_sold: number;
  units_remaining: number;
  sell_through_pct: number;
  total_landed_cost: number;
  cogs_sold: number;
  remaining_inventory_value: number;
  shipping_cost_bdt: number;
  units_damaged: number;
  units_adjusted: number;
  units_returned: number;
  po_status: string;
  is_payment_complete: boolean;
  total_paid_bdt: number;
  is_initial_inventory: boolean;
}

export interface ShipmentPerformanceDetailRow {
  sku: string;
  product_name: string;
  units_in: number;
  units_sold: number;
  units_remaining: number;
  sell_through_pct: number;
  cogs_sold: number;
  remaining_inventory_value: number;
  units_damaged: number;
  units_adjusted: number;
  units_returned: number;
  landed_cost_per_unit: number;
}
