/*
  # Fix reserve_stock_for_order — exclude damaged locations from automatic reservation

  ## Problem
  The FIFO lot cursor in reserve_stock_for_order had no filter on warehouse location type.
  This allowed the system to automatically reserve stock from `location_type = 'damaged'`
  locations when normal lots were exhausted. Damage locations must never be auto-reserved —
  they are last-resort, warehouse-staff-override only.

  ## Changes
  - Adds a JOIN to warehouse_locations inside the FIFO lot cursor
  - Adds AND wl.location_type != 'damaged' so damaged lots are skipped entirely
  - No other logic is changed
*/

CREATE OR REPLACE FUNCTION reserve_stock_for_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item         RECORD;
  v_lot          RECORD;
  v_product_id   uuid;
  v_needed       int;
  v_take         int;
  v_available    int;
  v_shortage     boolean := false;
BEGIN
  -- Idempotent: release any existing reservations first
  PERFORM release_stock_reservation(p_order_id);

  -- Process each non-fee, non-rx order item
  FOR v_item IN
    SELECT oi.id AS order_item_id,
           oi.quantity,
           oi.sku,
           oi.product_id,
           p.id AS resolved_product_id
    FROM order_items oi
    LEFT JOIN products p ON p.sku = oi.sku
    WHERE oi.order_id = p_order_id
      AND oi.sku NOT IN ('FEE', 'RX')
      AND oi.sku NOT LIKE 'FEE%'
  LOOP
    v_product_id := COALESCE(v_item.product_id, v_item.resolved_product_id);

    IF v_product_id IS NULL THEN
      v_shortage := true;
      CONTINUE;
    END IF;

    v_needed := v_item.quantity;

    -- Iterate FIFO lots, excluding damaged locations
    FOR v_lot IN
      SELECT il.id, il.remaining_quantity, il.reserved_quantity
      FROM inventory_lots il
      JOIN warehouse_locations wl ON wl.id = il.location_id
      WHERE il.product_id = v_product_id
        AND il.remaining_quantity > 0
        AND wl.location_type != 'damaged'
      ORDER BY il.received_date ASC NULLS LAST, il.created_at ASC
    LOOP
      EXIT WHEN v_needed <= 0;

      v_available := v_lot.remaining_quantity - COALESCE(v_lot.reserved_quantity, 0);

      IF v_available <= 0 THEN
        CONTINUE;
      END IF;

      v_take := LEAST(v_needed, v_available);

      INSERT INTO order_lot_reservations (
        order_id,
        order_item_id,
        lot_id,
        product_id,
        quantity
      ) VALUES (
        p_order_id,
        v_item.order_item_id,
        v_lot.id,
        v_product_id,
        v_take
      );

      UPDATE inventory_lots
      SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_take
      WHERE id = v_lot.id;

      v_needed := v_needed - v_take;
    END LOOP;

    IF v_needed > 0 THEN
      v_shortage := true;
    END IF;
  END LOOP;

  UPDATE orders SET stock_shortage = v_shortage WHERE id = p_order_id;
END;
$$;
