/*
  # Add WooCommerce parent fields and product locations junction table

  ## Overview
  Adds support for WooCommerce variation grouping and explicit product-to-location
  assignments separate from lot-level location tracking.

  ## Changes to `products` table
  - `woo_parent_product_id` (integer) — WooCommerce parent product ID for grouping variations
  - `woo_parent_name` (text) — Cached parent product name (e.g., "Blue Light Glasses")
  - `woo_attributes` (jsonb) — Variation attributes array (e.g., [{"color":"Black"},{"size":"Medium"}])

  ## New Tables
  - `product_locations` — Many-to-many junction linking products to warehouse locations
    - `id` (uuid, primary key)
    - `product_id` (uuid, FK to products)
    - `location_id` (uuid, FK to warehouse_locations)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled on `product_locations`
  - Same role-based policies as other inventory tables
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'woo_parent_product_id'
  ) THEN
    ALTER TABLE products ADD COLUMN woo_parent_product_id integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'woo_parent_name'
  ) THEN
    ALTER TABLE products ADD COLUMN woo_parent_name text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'woo_attributes'
  ) THEN
    ALTER TABLE products ADD COLUMN woo_attributes jsonb;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS product_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES warehouse_locations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, location_id)
);

ALTER TABLE product_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view product locations"
  ON product_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Operations Manager can insert product locations"
  ON product_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can update product locations"
  ON product_locations FOR UPDATE
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

CREATE POLICY "Admin and Operations Manager can delete product locations"
  ON product_locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );
