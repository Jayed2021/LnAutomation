/*
  # Create pick_discrepancy_log table

  ## Purpose
  Logs every instance where a picker scanned a barcode from a different lot than
  the FIFO-recommended lot ("Just Pick" override during pick operations). This
  data is used in reports to track override frequency, reasons, and operator usage.

  ## New Table
  - `pick_discrepancy_log`
    - `id` — uuid primary key
    - `order_id` — references orders(id)
    - `order_item_id` — references order_items(id)
    - `sku` — product SKU for quick reporting queries
    - `product_name` — denormalized for reporting without joins
    - `recommended_lot_barcode` — the FIFO-recommended barcode that should have been scanned
    - `scanned_barcode` — the barcode that was actually scanned
    - `reason` — operator-entered reason for the override
    - `picked_by` — identifier of the user who performed the pick
    - `created_at` — timestamp of when the discrepancy was logged

  ## Security
  - RLS enabled
  - Anon role can insert (to match existing app auth pattern)
  - Anon role can select (for reports)
  - No update or delete policies (immutable audit log)
*/

CREATE TABLE IF NOT EXISTS pick_discrepancy_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  order_item_id uuid REFERENCES order_items(id),
  sku text NOT NULL DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  recommended_lot_barcode text NOT NULL DEFAULT '',
  scanned_barcode text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  picked_by text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pick_discrepancy_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert pick discrepancy logs"
  ON pick_discrepancy_log
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can select pick discrepancy logs"
  ON pick_discrepancy_log
  FOR SELECT
  TO anon
  USING (true);
