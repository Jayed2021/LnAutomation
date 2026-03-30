/*
  # Add order_type column to orders table

  ## Summary
  Adds an order_type field to categorize orders beyond the standard fulfillment flow.

  ## Changes
  - `orders` table:
    - New column `order_type` (text, default 'standard')
    - Check constraint restricts values to known types: standard, gift, influencer, home_try_on, creative_work
    - All existing orders automatically receive 'standard' as their type

  ## Notes
  - Non-breaking: existing orders are unaffected
  - Default is 'standard' so no manual backfill needed
  - Additional types can be added to the constraint in a future migration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_type text NOT NULL DEFAULT 'standard';
    ALTER TABLE orders ADD CONSTRAINT orders_order_type_check
      CHECK (order_type IN ('standard', 'gift', 'influencer', 'home_try_on', 'creative_work'));
  END IF;
END $$;
