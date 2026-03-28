/*
  # Add Preferred Courier to Store Profile

  ## Summary
  Adds a `preferred_courier` column to the `store_profile` table.
  This setting controls which courier company is automatically assigned
  to every new order imported from WooCommerce (via webhook or manual pull).

  ## New Columns
  - `store_profile.preferred_courier` (text, default 'pathao')
    Allowed values: 'pathao', 'steadfast', 'redx', 'sundarban', 'office'
    Default is 'pathao' as it is the primary courier in use.

  ## Behaviour
  When a new WooCommerce order is created, both the webhook function and
  the woo-proxy import function will:
  1. Read preferred_courier from store_profile
  2. Insert a row into order_courier_info with courier_company set to that value
  This ensures every order starts life pre-assigned to the preferred courier,
  removing the need to manually assign it in the Operations view.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_profile' AND column_name = 'preferred_courier'
  ) THEN
    ALTER TABLE store_profile ADD COLUMN preferred_courier text DEFAULT 'pathao';
  END IF;
END $$;

UPDATE store_profile SET preferred_courier = 'pathao' WHERE preferred_courier IS NULL;
