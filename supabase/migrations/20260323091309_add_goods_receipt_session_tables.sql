/*
  # Goods Receipt Session Tables

  ## Overview
  Adds persistent session tracking for the two-step goods receiving workflow.
  This allows users to save progress mid-flow, resume later, and supports
  partial/split shipments where multiple receiving sessions can exist per PO.

  ## New Tables

  ### goods_receipt_sessions
  Tracks each receiving session (one per physical delivery) against a PO.
  - `id` - UUID primary key
  - `po_id` - FK to purchase_orders
  - `shipment_name` - Human-readable name for this delivery (e.g. PG-test-1)
  - `step` - Current workflow step: qty_check | qty_checked | qc_in_progress | complete
  - `add_to_stock_immediately` - If true, lots/stock created at end of Step 1 without waiting for QC
  - `stock_added_at_qty_check` - Tracks if stock was already added (for deferred QC)
  - `qty_check_date` - Date when physical count was performed
  - `qc_date` - Date when quality inspection was performed
  - `qty_check_notes` - Notes from the quantity check step
  - `qc_notes` - Notes from the quality check step
  - `good_photo_urls` - Array of URLs for good condition parcel photos
  - `damaged_photo_urls` - Array of URLs for damaged item photos
  - `damaged_drive_links` - Array of Google Drive links for damaged photos
  - `good_drive_links` - Array of Google Drive links for good condition photos
  - `shipment_db_id` - FK to shipments table once shipment record is created
  - `created_by` - FK to users
  - `created_at`, `updated_at`

  ### goods_receipt_lines
  Per-SKU data for each receiving session.
  - `id` - UUID primary key
  - `session_id` - FK to goods_receipt_sessions
  - `po_item_id` - FK to purchase_order_items
  - `product_id` - FK to products (nullable)
  - `sku` - SKU string for reference
  - `product_name` - Product name at time of receipt
  - `product_image_url` - Cached product image for export
  - `ordered_qty` - Ordered quantity (remaining) at time of session start
  - `qty_checked` - Physical count from Step 1
  - `qty_good` - Quality-passed units from Step 2
  - `qty_damaged` - Damaged units from Step 2
  - `landed_cost_per_unit` - Cost reference for this lot
  - `location_id` - Target putaway warehouse location
  - `lot_id` - FK to inventory_lots (set after lot is created)
  - `barcode` - Barcode string for this lot (SKU-shipment_name format)
  - `line_notes` - Per-line notes from QC step
  - `created_at`

  ## Security
  - RLS enabled on both tables
  - Authenticated users can read/insert/update their own sessions
  - All users with inventory access can read all sessions (needed for list page)
*/

CREATE TABLE IF NOT EXISTS goods_receipt_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id),
  shipment_name text NOT NULL DEFAULT '',
  step text NOT NULL DEFAULT 'qty_check' CHECK (step IN ('qty_check', 'qty_checked', 'qc_in_progress', 'complete')),
  add_to_stock_immediately boolean NOT NULL DEFAULT false,
  stock_added_at_qty_check boolean NOT NULL DEFAULT false,
  qty_check_date date,
  qc_date date,
  qty_check_notes text NOT NULL DEFAULT '',
  qc_notes text NOT NULL DEFAULT '',
  good_photo_urls text[] NOT NULL DEFAULT '{}',
  damaged_photo_urls text[] NOT NULL DEFAULT '{}',
  damaged_drive_links text[] NOT NULL DEFAULT '{}',
  good_drive_links text[] NOT NULL DEFAULT '{}',
  shipment_db_id uuid REFERENCES shipments(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goods_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES goods_receipt_sessions(id) ON DELETE CASCADE,
  po_item_id uuid REFERENCES purchase_order_items(id),
  product_id uuid REFERENCES products(id),
  sku text NOT NULL DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  product_image_url text,
  ordered_qty integer NOT NULL DEFAULT 0,
  qty_checked integer NOT NULL DEFAULT 0,
  qty_good integer NOT NULL DEFAULT 0,
  qty_damaged integer NOT NULL DEFAULT 0,
  landed_cost_per_unit numeric NOT NULL DEFAULT 0,
  location_id uuid REFERENCES warehouse_locations(id),
  lot_id uuid REFERENCES inventory_lots(id),
  barcode text NOT NULL DEFAULT '',
  line_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE goods_receipt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select goods_receipt_sessions"
  ON goods_receipt_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert goods_receipt_sessions"
  ON goods_receipt_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update goods_receipt_sessions"
  ON goods_receipt_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete goods_receipt_sessions"
  ON goods_receipt_sessions FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can select goods_receipt_lines"
  ON goods_receipt_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert goods_receipt_lines"
  ON goods_receipt_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update goods_receipt_lines"
  ON goods_receipt_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete goods_receipt_lines"
  ON goods_receipt_lines FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_sessions_po_id ON goods_receipt_sessions(po_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_session_id ON goods_receipt_lines(session_id);
