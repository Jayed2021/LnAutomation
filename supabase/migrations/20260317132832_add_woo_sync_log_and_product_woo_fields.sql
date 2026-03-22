/*
  # WooCommerce Sync Log and Product WooCommerce Fields

  ## Overview
  Adds the sync audit log table and WooCommerce-specific product fields
  needed for the import flow, plus auto-sync configuration columns.

  ## Changes to `woocommerce_config`
  - `auto_sync_enabled` (boolean, default false) — whether auto-sync is on
  - `sync_interval_minutes` (integer, default 60) — how often to sync
  - `woo_product_id` tracking happens per-product, not in config

  ## Changes to `products`
  - `woo_product_id` (integer) — WooCommerce product ID (for simple products)
  - `woo_variation_id` (integer) — WooCommerce variation ID (for variable products)

  ## New Tables
  - `woo_sync_log` — audit trail of every sync run
    - `id` (uuid, PK)
    - `sync_type` (text) — 'products' or 'orders'
    - `started_at` (timestamptz)
    - `completed_at` (timestamptz)
    - `records_synced` (integer)
    - `status` (text) — 'running', 'success', 'failed'
    - `error_message` (text)

  ## Security
  - RLS enabled on woo_sync_log
  - Admin-only access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'woocommerce_config' AND column_name = 'auto_sync_enabled'
  ) THEN
    ALTER TABLE woocommerce_config ADD COLUMN auto_sync_enabled boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'woocommerce_config' AND column_name = 'sync_interval_minutes'
  ) THEN
    ALTER TABLE woocommerce_config ADD COLUMN sync_interval_minutes integer DEFAULT 60;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'woo_product_id'
  ) THEN
    ALTER TABLE products ADD COLUMN woo_product_id integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'woo_variation_id'
  ) THEN
    ALTER TABLE products ADD COLUMN woo_variation_id integer;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS woo_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL CHECK (sync_type IN ('products', 'orders')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  records_synced integer DEFAULT 0,
  status text DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  error_message text
);

ALTER TABLE woo_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view sync log"
  ON woo_sync_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Only admin can insert sync log"
  ON woo_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Only admin can update sync log"
  ON woo_sync_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );
