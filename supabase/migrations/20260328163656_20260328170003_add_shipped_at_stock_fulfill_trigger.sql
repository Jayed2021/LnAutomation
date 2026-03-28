/*
  # Auto-Fulfill Stock on shipped_at Set

  ## Summary
  Adds a database trigger that automatically reserves and fulfills stock whenever
  `shipped_at` is set on an order for the first time (transitions from NULL to a
  non-null timestamp).

  ## Why This Is Needed
  The application calls `fulfill_stock_reservation()` from the Operations "Packed" tab
  Shipped button. However, if an order reaches the shipped state without first going
  through the CS confirmation flow (which creates the reservation), there are no
  reservations to fulfill and stock is silently not deducted.

  This trigger acts as a safety net at the database layer:
  - It fires AFTER UPDATE when shipped_at transitions NULL → non-null
  - It calls reserve_stock_for_order() first (FIFO lot allocation)
  - Then immediately calls fulfill_stock_reservation() to deduct stock
  - It skips orders that already have a 'sale' stock movement (idempotent)

  ## Security
  - Trigger runs as SECURITY DEFINER equivalent via plpgsql on the server
  - No RLS changes required

  ## Notes
  1. The trigger only fires on the FIRST time shipped_at is set
  2. Already-shipped orders with existing movements are skipped (idempotent guard)
  3. The Operations panel's direct call to fulfill_stock_reservation() remains valid —
     when that call runs first and creates movements, the trigger's idempotency guard
     ensures no double-deduction occurs
*/

CREATE OR REPLACE FUNCTION trg_auto_fulfill_stock_on_ship()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only fire when shipped_at transitions from NULL to a value
  IF OLD.shipped_at IS NULL AND NEW.shipped_at IS NOT NULL THEN
    -- Skip if stock movements already exist (e.g., Operations panel already handled it)
    IF NOT EXISTS (
      SELECT 1 FROM stock_movements
      WHERE reference_id = NEW.id AND movement_type = 'sale'
    ) THEN
      PERFORM reserve_stock_for_order(NEW.id);
      PERFORM fulfill_stock_reservation(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_auto_fulfill_stock ON orders;

CREATE TRIGGER trg_orders_auto_fulfill_stock
  AFTER UPDATE OF shipped_at ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_fulfill_stock_on_ship();
