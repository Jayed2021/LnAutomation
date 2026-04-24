/*
  # Fix trg_auto_fulfill_stock_on_ship trigger function

  ## Problem
  The trigger was calling reserve_stock_for_order() before fulfill_stock_reservation().
  reserve_stock_for_order() is idempotent — it releases all existing reservations and
  re-runs FIFO allocation from scratch. This overwrites any lot swaps made during the
  pick/override flow, causing stock to be deducted from the wrong lot.

  ## Fix
  Remove the reserve_stock_for_order() call. Reservations are created and managed
  during the pick flow. The trigger only needs to fulfill (deduct) whatever reservations
  already exist. The existing guard (skip if sale movements already exist) is retained.
*/

CREATE OR REPLACE FUNCTION trg_auto_fulfill_stock_on_ship()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only fire when shipped_at transitions from NULL to a value
  IF OLD.shipped_at IS NULL AND NEW.shipped_at IS NOT NULL THEN
    -- Skip if stock movements already exist (Operations panel already handled it)
    IF NOT EXISTS (
      SELECT 1 FROM stock_movements
      WHERE reference_id = NEW.id AND movement_type = 'sale'
    ) THEN
      PERFORM fulfill_stock_reservation(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
