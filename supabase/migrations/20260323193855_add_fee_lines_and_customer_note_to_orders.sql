/*
  # Add fee_lines and customer_note to orders table

  ## Summary
  Adds two new columns to the `orders` table to capture additional WooCommerce order data:

  ## New Columns
  - `fee_lines` (jsonb, nullable): Stores WooCommerce fee line items as a JSON array.
    Each fee line contains: name (text), amount (text), total (text).
    Used to display additional charges like lens fees, handling fees, etc.
    Also used to improve prescription detection when fee names reference lens/power options.

  - `customer_note` (text, nullable): Stores the customer-provided note entered at
    WooCommerce checkout. This is the top-level `customer_note` field from the WooCommerce
    order object — distinct from internal CS notes. Read-only in the UI since it comes
    directly from the customer.

  ## Changes
  - `orders` table: adds `fee_lines` jsonb column defaulting to NULL
  - `orders` table: adds `customer_note` text column defaulting to NULL

  ## Notes
  - Both columns are nullable and non-destructive; existing rows are unaffected
  - No RLS changes required (inherits existing orders table policies)
  - fee_lines will be backfilled on next WooCommerce resync per order
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'fee_lines'
  ) THEN
    ALTER TABLE orders ADD COLUMN fee_lines jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_note'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_note text;
  END IF;
END $$;
