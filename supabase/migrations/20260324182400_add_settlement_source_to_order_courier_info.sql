/*
  # Add settlement_source to order_courier_info

  ## Summary
  Adds a `settlement_source` column to the `order_courier_info` table to track
  how settlement amounts (collected_amount, delivery_charge) were recorded.

  ## New Columns
  - `order_courier_info.settlement_source` (text, nullable)
    - Possible values: 'courier_api', 'invoice_upload', 'manual'
    - NULL means not yet set (legacy rows or pre-settlement)

  ## Notes
  - Non-destructive: only adds a new nullable column
  - No default value so legacy rows remain NULL (distinguishable from manually set)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_courier_info' AND column_name = 'settlement_source'
  ) THEN
    ALTER TABLE order_courier_info ADD COLUMN settlement_source text;
  END IF;
END $$;
