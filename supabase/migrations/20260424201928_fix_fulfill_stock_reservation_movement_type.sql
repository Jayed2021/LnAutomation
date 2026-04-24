/*
  # Fix fulfill_stock_reservation movement_type

  The function was inserting movement_type = 'fulfillment' which violates the
  stock_movements_movement_type_check constraint. The correct allowed value is 'sale'.
*/

CREATE OR REPLACE FUNCTION fulfill_stock_reservation(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  v_lot RECORD;
BEGIN
  FOR r IN
    SELECT olr.lot_id, olr.quantity, olr.product_id, olr.order_item_id,
           il.remaining_quantity, il.reserved_quantity
    FROM order_lot_reservations olr
    JOIN inventory_lots il ON il.id = olr.lot_id
    WHERE olr.order_id = p_order_id
  LOOP
    UPDATE inventory_lots
    SET
      remaining_quantity = GREATEST(0, remaining_quantity - r.quantity),
      reserved_quantity  = GREATEST(0, reserved_quantity  - r.quantity)
    WHERE id = r.lot_id;

    INSERT INTO stock_movements (
      product_id,
      lot_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      notes
    ) VALUES (
      r.product_id,
      r.lot_id,
      'sale',
      -r.quantity,
      'order',
      p_order_id,
      'Stock deducted on shipment'
    );
  END LOOP;

  DELETE FROM order_lot_reservations WHERE order_id = p_order_id;

  UPDATE orders SET stock_shortage = false WHERE id = p_order_id;
END;
$$;
