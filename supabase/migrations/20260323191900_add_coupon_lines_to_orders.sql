/*
  # Add coupon_lines to orders table

  ## Summary
  Adds a JSONB column to store WooCommerce coupon data on each order.

  ## Changes
  - **orders**: New `coupon_lines` JSONB column (nullable)
    - Stores an array of coupon objects: [{ code, discount, discount_tax }]
    - NULL for orders with no coupons or orders imported before this migration
    - Can be populated retroactively via the "resync-order" action in woo-proxy

  ## Notes
  - Non-destructive: existing rows will have NULL in this column
  - No RLS changes needed (existing order policies cover this column)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'coupon_lines'
  ) THEN
    ALTER TABLE orders ADD COLUMN coupon_lines jsonb DEFAULT NULL;
  END IF;
END $$;
