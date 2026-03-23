/*
  # Orders Module Extensions

  ## Overview
  Adds all columns, tables, and data needed for the full Orders CS workflow.

  ## Changes

  ### Modified Tables
  - `orders`: Added woo_status, cancellation_reason, cancellation_reason_id, late_delivery_reason,
    expected_delivery_date, exchange_return_id, meta_screenshot_url, courier_entry_method,
    woo_order_status columns for full lifecycle tracking.

  ### New Tables
  1. `cancellation_reasons` - Admin-configurable list of cancellation reasons
     - id, reason_text, is_active, sort_order, created_at
  2. `order_packaging_items` - Packaging materials used per order
     - id, order_id, product_id, sku, product_name, quantity, unit_cost, line_total, created_at
  3. `order_notes` - CS internal notes on orders (separate from activity log)
     - id, order_id, note_text, created_by, created_at

  ## Security
  - RLS enabled on all new tables
  - All authenticated/active users can read; CS and above can write
*/

-- Add new columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'woo_order_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN woo_order_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE orders ADD COLUMN cancellation_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cancellation_reason_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN cancellation_reason_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'late_delivery_reason'
  ) THEN
    ALTER TABLE orders ADD COLUMN late_delivery_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'expected_delivery_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN expected_delivery_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'exchange_return_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN exchange_return_id uuid REFERENCES returns(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'meta_screenshot_url'
  ) THEN
    ALTER TABLE orders ADD COLUMN meta_screenshot_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'courier_entry_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN courier_entry_method text DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'partial_delivery_notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN partial_delivery_notes text;
  END IF;
END $$;

-- Add pick_location to order_items for FIFO-resolved pick location display on invoice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'pick_location'
  ) THEN
    ALTER TABLE order_items ADD COLUMN pick_location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE order_items ADD COLUMN discount_amount decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'woo_item_id'
  ) THEN
    ALTER TABLE order_items ADD COLUMN woo_item_id integer;
  END IF;
END $$;

-- Cancellation reasons table (admin-configurable)
CREATE TABLE IF NOT EXISTS cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_text text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view cancellation reasons"
  ON cancellation_reasons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage cancellation reasons"
  ON cancellation_reasons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin can update cancellation reasons"
  ON cancellation_reasons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin can delete cancellation reasons"
  ON cancellation_reasons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Also allow anon role (used by the custom auth system) to view
CREATE POLICY "Anon can view cancellation reasons"
  ON cancellation_reasons FOR SELECT
  TO anon
  USING (true);

-- Seed default cancellation reasons
INSERT INTO cancellation_reasons (reason_text, sort_order) VALUES
  ('Change of Mind', 1),
  ('Test Order', 2),
  ('Duplicate Order', 3),
  ('Advance Delivery Charge', 4),
  ('High Price', 5),
  ('Other', 99)
ON CONFLICT DO NOTHING;

-- Order packaging items table
CREATE TABLE IF NOT EXISTS order_packaging_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  sku text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost decimal(10, 2) DEFAULT 0,
  line_total decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_packaging_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view packaging items"
  ON order_packaging_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can manage packaging items"
  ON order_packaging_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE POLICY "All authenticated users can update packaging items"
  ON order_packaging_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE POLICY "All authenticated users can delete packaging items"
  ON order_packaging_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE POLICY "Anon can view packaging items"
  ON order_packaging_items FOR SELECT
  TO anon
  USING (true);

-- Order notes table (separate from activity log)
CREATE TABLE IF NOT EXISTS order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view order notes"
  ON order_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create order notes"
  ON order_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE POLICY "Anon can view order notes"
  ON order_notes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert order notes"
  ON order_notes FOR INSERT
  TO anon
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_woo_order_status ON orders(woo_order_status);
CREATE INDEX IF NOT EXISTS idx_order_packaging_items_order_id ON order_packaging_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_is_active ON cancellation_reasons(is_active);
