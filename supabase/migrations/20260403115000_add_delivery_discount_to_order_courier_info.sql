/*
  # Add delivery_discount to order_courier_info

  ## Summary
  Adds a `delivery_discount` column to `order_courier_info` to support
  CS agents recording a discount applied at delivery time (post-shipped statuses).

  ## Changes
  - `order_courier_info`
    - New column: `delivery_discount` (numeric, default 0) — amount discounted
      from the courier's collected receivable at the point of delivery

  ## Notes
  - This is purely additive; no existing data is affected.
  - No RLS changes needed — the table's existing policies cover this column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_courier_info' AND column_name = 'delivery_discount'
  ) THEN
    ALTER TABLE order_courier_info ADD COLUMN delivery_discount numeric DEFAULT 0;
  END IF;
END $$;
