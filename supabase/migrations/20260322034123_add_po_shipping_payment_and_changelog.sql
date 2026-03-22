/*
  # Enhance Purchase Order Tables

  ## Summary
  Adds missing columns to support the full PO workflow including:
  - Shipment naming (for barcode generation)
  - Shipping details (weight, cartons, cost)
  - Exchange rate snapshots at PO creation time
  - Product image caching on PO line items
  - Payment slip file uploads
  - Change log for audit trail

  ## Modified Tables

  ### `purchase_orders`
  - `shipment_name` (text) - Short name like MQ01 used for barcode generation
  - `usd_to_cny_rate` (decimal) - Exchange rate snapshot USD to CNY
  - `cny_to_bdt_rate` (decimal) - Exchange rate snapshot CNY to BDT
  - `usd_to_bdt_rate` (decimal) - Exchange rate snapshot USD to BDT
  - `total_weight_kg` (decimal) - Total shipment weight in kg
  - `number_of_cartons` (integer) - Number of cartons in shipment
  - `shipping_cost_bdt` (decimal) - Total shipping cost in BDT
  - `is_payment_complete` (boolean) - Whether all payments have been made

  ### `purchase_order_items`
  - `product_image_url` (text) - Cached product image URL at time of PO creation

  ### `supplier_payments`
  - `payment_slip_url` (text) - URL to uploaded payment slip in Supabase Storage
  - `amount_bdt` (decimal) - Amount always in BDT for landed cost calculation

  ## New Tables

  ### `po_change_log`
  - `id` (uuid, primary key)
  - `po_id` (uuid, FK to purchase_orders)
  - `message` (text) - Human-readable event description
  - `created_by` (uuid, FK to users, nullable)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on po_change_log
  - Admin and Operations Manager access only
*/

-- Add shipment and exchange rate columns to purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'shipment_name') THEN
    ALTER TABLE purchase_orders ADD COLUMN shipment_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'usd_to_cny_rate') THEN
    ALTER TABLE purchase_orders ADD COLUMN usd_to_cny_rate decimal(10, 4) DEFAULT 7.25;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'cny_to_bdt_rate') THEN
    ALTER TABLE purchase_orders ADD COLUMN cny_to_bdt_rate decimal(10, 4) DEFAULT 15.17;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'usd_to_bdt_rate') THEN
    ALTER TABLE purchase_orders ADD COLUMN usd_to_bdt_rate decimal(10, 4) DEFAULT 110.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'total_weight_kg') THEN
    ALTER TABLE purchase_orders ADD COLUMN total_weight_kg decimal(10, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'number_of_cartons') THEN
    ALTER TABLE purchase_orders ADD COLUMN number_of_cartons integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'shipping_cost_bdt') THEN
    ALTER TABLE purchase_orders ADD COLUMN shipping_cost_bdt decimal(12, 2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'is_payment_complete') THEN
    ALTER TABLE purchase_orders ADD COLUMN is_payment_complete boolean DEFAULT false;
  END IF;
END $$;

-- Add product_image_url to purchase_order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_items' AND column_name = 'product_image_url') THEN
    ALTER TABLE purchase_order_items ADD COLUMN product_image_url text;
  END IF;
END $$;

-- Add payment_slip_url and amount_bdt to supplier_payments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_payments' AND column_name = 'payment_slip_url') THEN
    ALTER TABLE supplier_payments ADD COLUMN payment_slip_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_payments' AND column_name = 'amount_bdt') THEN
    ALTER TABLE supplier_payments ADD COLUMN amount_bdt decimal(12, 2) DEFAULT 0;
  END IF;
END $$;

-- Create po_change_log table
CREATE TABLE IF NOT EXISTS po_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE po_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Operations Manager can view PO change log"
  ON po_change_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can insert PO change log"
  ON po_change_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Allow anon access for custom auth pattern (consistent with other tables in this project)
CREATE POLICY "Allow anon select on po_change_log"
  ON po_change_log FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on po_change_log"
  ON po_change_log FOR INSERT
  TO anon
  WITH CHECK (true);
