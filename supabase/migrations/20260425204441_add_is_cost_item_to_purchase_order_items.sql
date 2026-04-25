/*
  # Add is_cost_item flag to purchase_order_items

  ## Summary
  Adds a boolean `is_cost_item` column to `purchase_order_items` to distinguish between
  physical goods (items that arrive and need to be received) and cost line items (fees,
  charges, or expenses that the supplier bills but which have no physical goods to receive,
  e.g. logo printing, supplier-side shipping, accessory packing costs).

  ## Changes
  - `purchase_order_items.is_cost_item` (boolean, default false)
    - false = physical good, participates in receiving flow as normal
    - true  = cost line item, excluded from the receiving queue; its cost is
              distributed equally across all physical SKUs in the same PO to
              produce an accurate landed_cost_per_unit

  ## Notes
  - All existing rows default to false — no change to existing behaviour.
  - RLS is unchanged; no new tables.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_order_items' AND column_name = 'is_cost_item'
  ) THEN
    ALTER TABLE purchase_order_items ADD COLUMN is_cost_item boolean NOT NULL DEFAULT false;
  END IF;
END $$;
