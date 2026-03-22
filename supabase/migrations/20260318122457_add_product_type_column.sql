/*
  # Add product_type column to products table

  ## Summary
  Adds a `product_type` column to distinguish between saleable goods and packaging materials.

  ## Changes
  - `products` table: new `product_type` column
    - Type: text with CHECK constraint
    - Allowed values: 'saleable_goods', 'packaging_material'
    - Default: 'saleable_goods' (all existing products auto-classified)

  ## Notes
  - No data backfill needed — the default handles all existing rows
  - The CHECK constraint enforces valid values at the database level
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products
      ADD COLUMN product_type text NOT NULL DEFAULT 'saleable_goods'
      CHECK (product_type IN ('saleable_goods', 'packaging_material'));
  END IF;
END $$;
