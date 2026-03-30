/*
  # Add paid_amount column to orders table

  ## Summary
  Adds a nullable `paid_amount` column to support structured payment methods where a
  customer has paid partially or fully in advance (Prepaid or Partial Paid orders).

  ## New Columns
  - `orders.paid_amount` (numeric, nullable) — The amount already paid by the customer
    via a digital method (Bkash, Nagad, SSL Commerz, Bank Transfer, etc.).
    - NULL = not applicable (COD orders)
    - > 0 for Prepaid orders (full payment received upfront)
    - > 0 and < total_amount for Partial Paid orders (remaining balance collected by courier)

  ## Notes
  - No data migration is performed. Existing orders retain NULL, which is handled
    gracefully in the UI as "not specified".
  - Legacy payment_method strings (bKash+COD, SSL+COD, etc.) are handled in the UI
    display layer without touching stored data.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paid_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN paid_amount numeric DEFAULT NULL;
  END IF;
END $$;
