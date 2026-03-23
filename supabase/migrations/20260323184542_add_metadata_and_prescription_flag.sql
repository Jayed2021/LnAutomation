/*
  # Add metadata and prescription flag to orders/order_items

  ## Summary
  This migration adds two new fields to support WooCommerce order metadata:

  ## New Columns

  ### order_items table
  - `meta_data` (jsonb) - Stores raw WooCommerce line item metadata array (key/value pairs
    such as lens type, power option, prescription file links). Nullable.

  ### orders table
  - `has_prescription` (boolean, default false) - Quick flag indicating whether any line
    item in the order contains a prescription upload. Allows the orders list to show a
    visual indicator without joining through all items.

  ## Notes
  - Both columns are added only if they do not already exist to make migration safe to re-run.
  - No existing data is removed or modified.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'meta_data'
  ) THEN
    ALTER TABLE order_items ADD COLUMN meta_data jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'has_prescription'
  ) THEN
    ALTER TABLE orders ADD COLUMN has_prescription boolean NOT NULL DEFAULT false;
  END IF;
END $$;
