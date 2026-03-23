/*
  # Add order_item_id and customer_price to order_prescriptions

  ## Summary
  Extends the order_prescriptions table to support a 1-to-many prescription model
  where each prescription is linked to a specific order item.

  ## Changes

  ### Modified Table: order_prescriptions
  - `order_item_id` (uuid, nullable) — FK to order_items(id), links each prescription
    to the specific eyeglass frame it belongs to. SET NULL on delete so prescriptions
    are not lost if an order item is removed.
  - `customer_price` (numeric, default 0) — The price charged to the customer for this
    prescription lens. This is added to the order total as a separate line item.
    Separate from `lens_price` and `fitting_charge` which are internal lab costs.

  ## Notes
  - Both columns are nullable/defaulted to preserve existing rows without disruption
  - No destructive changes — existing prescriptions remain intact
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_prescriptions' AND column_name = 'order_item_id'
  ) THEN
    ALTER TABLE order_prescriptions
      ADD COLUMN order_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_prescriptions' AND column_name = 'customer_price'
  ) THEN
    ALTER TABLE order_prescriptions
      ADD COLUMN customer_price numeric DEFAULT 0;
  END IF;
END $$;
