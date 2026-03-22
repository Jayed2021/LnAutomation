/*
  # Add supplier short_name and product tags

  ## Changes

  ### Modified Tables

  1. `suppliers`
     - Added `short_name` (text, nullable) — stores supplier initials/abbreviation (e.g., "MQ", "ZH", "MO")
     - Added index on `short_name` for fast lookup during CSV imports

  2. `products`
     - Added `tags` (text[], nullable) — stores additional classification tags parsed from WooCommerce categories
     - Tags represent non-primary attributes like gender, style, feature indicators
     - Added GIN index for efficient array searches

  ## Purpose
  - `short_name` on suppliers enables CSV imports to match suppliers by their initials
  - `tags` on products enables richer classification beyond a single category field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'short_name'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN short_name text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS suppliers_short_name_idx ON suppliers (lower(short_name));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'tags'
  ) THEN
    ALTER TABLE products ADD COLUMN tags text[];
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_tags_idx ON products USING GIN (tags);
