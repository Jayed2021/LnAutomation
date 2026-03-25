/*
  # Add Foreign Key Constraints to return_items

  ## Summary
  The return_items table was created without foreign key constraints, which prevents
  PostgREST (Supabase's API layer) from performing nested joins. This caused the Returns
  page query to silently fail and return no data.

  ## Changes
  1. Add FK: return_items.return_id → returns.id (ON DELETE CASCADE)
  2. Add FK: return_items.order_item_id → order_items.id (ON DELETE SET NULL)
  3. Add FK: return_items.product_id → products.id (ON DELETE RESTRICT)

  ## Notes
  - Uses IF NOT EXISTS pattern to be safe on re-run
  - No data is modified
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'return_items_return_id_fkey'
      AND table_name = 'return_items'
  ) THEN
    ALTER TABLE return_items
      ADD CONSTRAINT return_items_return_id_fkey
      FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'return_items_order_item_id_fkey'
      AND table_name = 'return_items'
  ) THEN
    ALTER TABLE return_items
      ADD CONSTRAINT return_items_order_item_id_fkey
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'return_items_product_id_fkey'
      AND table_name = 'return_items'
  ) THEN
    ALTER TABLE return_items
      ADD CONSTRAINT return_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
  END IF;
END $$;
