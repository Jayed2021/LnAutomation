/*
  # Add default_landed_cost to products table

  ## Summary
  Adds a `default_landed_cost` column to the `products` table to serve as a
  fallback cost value when no purchase-order-derived landed cost is available
  on an inventory lot.

  ## Changes

  ### Modified Tables
  - `products`
    - New column: `default_landed_cost` (numeric, nullable)
      - Stores the standard landed cost per unit for the product
      - Used as a fallback when `inventory_lots.landed_cost_per_unit` is NULL or 0
      - Populated from historical CSV cost data

  ## Notes
  - Column is nullable — products without a known cost will remain NULL
  - Does not affect RLS policies (no security changes)
  - This column is read-only for profit calculation purposes; cost of record
    for fulfilled orders comes from the picked lot's landed_cost_per_unit
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'default_landed_cost'
  ) THEN
    ALTER TABLE products ADD COLUMN default_landed_cost numeric;
  END IF;
END $$;
