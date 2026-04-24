/*
  # Reservation Engine — Table Extensions

  ## Summary
  Extends the existing reservation and discrepancy infrastructure to support
  the full reservation lifecycle: creation on order entry, override on pick,
  and release on cancellation/ship.

  ## Changes

  ### order_lot_reservations
  - Add `order_item_id` (uuid, FK to order_items) — links reservation to a specific line item
  - Add `product_id` (uuid, FK to products) — avoids joins when querying per-product totals

  ### pick_discrepancy_log
  - Add `override_reason` (text) — structured reason code: 'product_damaged' | 'physically_unavailable'
  - Add `recommended_location_code` (text) — location the system recommended
  - Add `override_lot_barcode` (text) — the lot barcode the operator actually picked
  - Add `override_location_code` (text) — the location the operator actually picked from
  - Add `order_item_id` (uuid) — links log entry to exact order item

  ## Security
  - Existing RLS policies on both tables remain unchanged (anon role has access per prior migrations)
*/

-- Extend order_lot_reservations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_lot_reservations' AND column_name = 'order_item_id'
  ) THEN
    ALTER TABLE order_lot_reservations ADD COLUMN order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_lot_reservations' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE order_lot_reservations ADD COLUMN product_id uuid REFERENCES products(id);
  END IF;
END $$;

-- Index for fast per-product reservation lookups
CREATE INDEX IF NOT EXISTS idx_order_lot_reservations_product_id
  ON order_lot_reservations(product_id);

CREATE INDEX IF NOT EXISTS idx_order_lot_reservations_order_id
  ON order_lot_reservations(order_id);

CREATE INDEX IF NOT EXISTS idx_order_lot_reservations_lot_id
  ON order_lot_reservations(lot_id);

-- Extend pick_discrepancy_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pick_discrepancy_log' AND column_name = 'override_reason'
  ) THEN
    ALTER TABLE pick_discrepancy_log ADD COLUMN override_reason text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pick_discrepancy_log' AND column_name = 'recommended_location_code'
  ) THEN
    ALTER TABLE pick_discrepancy_log ADD COLUMN recommended_location_code text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pick_discrepancy_log' AND column_name = 'override_lot_barcode'
  ) THEN
    ALTER TABLE pick_discrepancy_log ADD COLUMN override_lot_barcode text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pick_discrepancy_log' AND column_name = 'override_location_code'
  ) THEN
    ALTER TABLE pick_discrepancy_log ADD COLUMN override_location_code text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pick_discrepancy_log' AND column_name = 'order_item_id'
  ) THEN
    ALTER TABLE pick_discrepancy_log ADD COLUMN order_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for querying override log by time and lot
CREATE INDEX IF NOT EXISTS idx_pick_discrepancy_log_created_at
  ON pick_discrepancy_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pick_discrepancy_log_order_id
  ON pick_discrepancy_log(order_id);
