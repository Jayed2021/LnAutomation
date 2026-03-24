/*
  # Add packed_at and shipped_at timestamps to orders

  ## Summary
  Adds two timestamp columns to the orders table to capture the exact time
  when an order was packed and when it was shipped. These are used for:
  - packed_at: captured when "Pack" button is clicked, used in the Packed export
    as "Shipped Date" (the date the parcel was handed to the courier)
  - shipped_at: captured when "Mark as Shipped" is clicked in the Packed list,
    used to filter orders in the Shipped tab by date range

  ## Changes
  - orders.packed_at (timestamptz, nullable) - set when fulfillment_status → packed
  - orders.shipped_at (timestamptz, nullable) - set when fulfillment_status → shipped
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'packed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN packed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipped_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipped_at timestamptz;
  END IF;
END $$;
