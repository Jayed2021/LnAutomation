/*
  # Fix fulfill_stock_reservation + Backfill Shipped Orders

  ## Summary
  The `fulfill_stock_reservation` function had incorrect column references:
  - `inventory_lots.warehouse_location_id` → correct column is `location_id`
  - `stock_movements.location_id` → correct columns are `from_location_id` / `to_location_id`

  This migration:
  1. Recreates the function with correct column names
  2. Backfills stock movements for 92 orders shipped after 7:00pm BD on 2026-03-28
     that have no existing 'sale' stock movement
*/

CREATE OR REPLACE FUNCTION fulfill_stock_reservation(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_res record;
  v_lot record;
BEGIN
  FOR v_res IN
    SELECT lot_id, quantity FROM order_lot_reservations WHERE order_id = p_order_id
  LOOP
    UPDATE inventory_lots
      SET remaining_quantity = GREATEST(0, remaining_quantity - v_res.quantity),
          reserved_quantity  = GREATEST(0, reserved_quantity  - v_res.quantity)
    WHERE id = v_res.lot_id;

    SELECT product_id, location_id INTO v_lot FROM inventory_lots WHERE id = v_res.lot_id;

    INSERT INTO stock_movements (
      product_id, lot_id, from_location_id,
      movement_type, quantity, reference_type, reference_id, notes
    ) VALUES (
      v_lot.product_id, v_res.lot_id, v_lot.location_id,
      'sale', -v_res.quantity, 'order', p_order_id, 'Fulfilled via order shipment'
    );
  END LOOP;

  DELETE FROM order_lot_reservations WHERE order_id = p_order_id;

  UPDATE orders SET stock_shortage = false WHERE id = p_order_id;
END;
$$;

-- One-time backfill: reserve + fulfill for orders shipped after 7pm BD today with no sale movements
DO $$
DECLARE
  v_order record;
  v_count integer := 0;
BEGIN
  FOR v_order IN
    SELECT id
    FROM orders
    WHERE shipped_at >= '2026-03-28 13:00:00+00'
      AND NOT EXISTS (
        SELECT 1 FROM stock_movements
        WHERE reference_id = orders.id
          AND movement_type = 'sale'
      )
    ORDER BY shipped_at ASC
  LOOP
    PERFORM reserve_stock_for_order(v_order.id);
    PERFORM fulfill_stock_reservation(v_order.id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled stock movements for % orders', v_count;
END $$;
