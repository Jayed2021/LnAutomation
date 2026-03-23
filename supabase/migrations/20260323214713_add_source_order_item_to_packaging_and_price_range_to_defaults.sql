/*
  # Add source_order_item_id to order_packaging_items and support price-range rules

  ## Summary
  This migration extends the packaging system to support per-item packaging rules with
  optional price-range filtering.

  ## Changes

  ### Modified Tables

  **order_packaging_items**
  - Add `source_order_item_id` (uuid, nullable, FK → order_items.id ON DELETE SET NULL)
    Records which order line item triggered this packaging row when it was auto-added.
    NULL means it was added manually or was added before this feature existed.

  ## Notes
  1. The `default_packaging_materials` app_setting JSON now supports two new optional fields
     per rule: `min_price` (number | null) and `max_price` (number | null).
     These are purely stored in the JSONB value and require no schema change.
  2. No data is deleted or modified — this is an additive migration only.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_packaging_items'
      AND column_name = 'source_order_item_id'
  ) THEN
    ALTER TABLE order_packaging_items
      ADD COLUMN source_order_item_id uuid
        REFERENCES order_items(id) ON DELETE SET NULL;
  END IF;
END $$;
