/*
  # Add prepaid_amount to order_courier_info and not_paid_reason to collection_line_items

  ## Summary
  Separates gateway-confirmed prepaid payments from courier-collected COD amounts,
  enabling the collection resolver to correctly evaluate payment completion across
  mixed payment methods (partial paid, prepaid).

  ## Changes

  ### Modified Tables

  1. `order_courier_info`
     - `prepaid_amount` (numeric, DEFAULT 0): Stores the portion of payment confirmed
       via a payment gateway (e.g. Bkash, SSL Commerz). Kept separate from
       `collected_amount` which tracks courier-side COD receipts only.

  2. `collection_line_items`
     - `not_paid_reason` (text, nullable): When the resolver decides NOT to mark an
       order as paid, the specific reason is stored here for auditability and
       re-apply debugging without needing to scan activity logs.

  ## Notes
  - Both columns are additive (no data is removed or altered)
  - `prepaid_amount` defaults to 0 so existing rows are unaffected
  - `not_paid_reason` is nullable — only populated when payment is NOT confirmed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_courier_info' AND column_name = 'prepaid_amount'
  ) THEN
    ALTER TABLE order_courier_info ADD COLUMN prepaid_amount numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_line_items' AND column_name = 'not_paid_reason'
  ) THEN
    ALTER TABLE collection_line_items ADD COLUMN not_paid_reason text;
  END IF;
END $$;
