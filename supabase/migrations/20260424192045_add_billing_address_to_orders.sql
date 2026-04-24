/*
  # Add per-order billing address columns

  ## Problem
  The orders table had no address columns of its own. Address was read entirely
  from the customers table via a JOIN. For returning customers placing new orders
  at a different address, the old stored address was shown because the WooCommerce
  address was never saved on the order itself.

  ## Changes
  - `orders` table: add `billing_address_line1`, `billing_city`, `billing_district`
    - These store the exact address from WooCommerce at the time the order was placed
    - NULL for orders imported before this migration (they fall back to customer record)

  ## Notes
  - No destructive changes
  - Existing orders keep working via the customer JOIN fallback in the app layer
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'billing_address_line1'
  ) THEN
    ALTER TABLE orders ADD COLUMN billing_address_line1 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'billing_city'
  ) THEN
    ALTER TABLE orders ADD COLUMN billing_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'billing_district'
  ) THEN
    ALTER TABLE orders ADD COLUMN billing_district text;
  END IF;
END $$;
