/*
  # Add swap_lot_reservation RPC function

  ## Purpose
  When a picker overrides the FIFO-recommended lot and picks from a different
  lot/location, the order_lot_reservations row must be updated to reflect the
  actual lot picked. Without this, fulfill_stock_reservation (called at ship
  time) deducts inventory from the wrong lot.

  ## What this function does
  Given an order, the old (originally reserved) lot, and the new (actually
  picked) lot:
  1. Updates order_lot_reservations to point to the new lot_id
  2. Decrements reserved_quantity on the old inventory_lot
  3. Increments reserved_quantity on the new inventory_lot

  All three steps happen in a single atomic transaction.

  ## Parameters
  - p_order_id        uuid  — the order being processed
  - p_order_item_id   uuid  — the specific order item (handles multi-item orders)
  - p_old_lot_id      uuid  — the lot that was originally reserved
  - p_new_lot_id      uuid  — the lot that was actually picked
*/

CREATE OR REPLACE FUNCTION swap_lot_reservation(
  p_order_id      uuid,
  p_order_item_id uuid,
  p_old_lot_id    uuid,
  p_new_lot_id    uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_qty integer;
BEGIN
  -- Get the reserved quantity for this specific reservation
  SELECT quantity INTO v_qty
  FROM order_lot_reservations
  WHERE order_id = p_order_id
    AND order_item_id = p_order_item_id
    AND lot_id = p_old_lot_id
  LIMIT 1;

  -- If no reservation found, nothing to do
  IF v_qty IS NULL THEN
    RETURN;
  END IF;

  -- Point the reservation at the new lot
  UPDATE order_lot_reservations
  SET lot_id = p_new_lot_id
  WHERE order_id = p_order_id
    AND order_item_id = p_order_item_id
    AND lot_id = p_old_lot_id;

  -- Release reserved_quantity from the old lot
  UPDATE inventory_lots
  SET reserved_quantity = GREATEST(0, reserved_quantity - v_qty)
  WHERE id = p_old_lot_id;

  -- Claim reserved_quantity on the new lot
  UPDATE inventory_lots
  SET reserved_quantity = reserved_quantity + v_qty
  WHERE id = p_new_lot_id;
END;
$$;
