/*
  # Reservation Engine — Core RPC Functions

  ## Summary
  Creates the three database functions that power the stock reservation lifecycle.
  These are called by the frontend application at key order lifecycle events.

  ## Functions

  ### reserve_stock_for_order(p_order_id uuid)
  Called when an order is confirmed (moved to 'not_printed' / fulfillment_status='not_printed').
  - Loads all active order items (excludes SKUs 'FEE' and 'RX')
  - For each item, resolves FIFO lots (ordered by received_date ASC)
  - Available qty = remaining_quantity - reserved_quantity
  - Inserts order_lot_reservations records spanning multiple lots if needed
  - Increments inventory_lots.reserved_quantity for each lot used
  - Sets orders.stock_shortage = true if any item could not be fully reserved
  - Idempotent: clears existing reservations for the order before re-creating them

  ### release_stock_reservation(p_order_id uuid)
  Called when an order is cancelled (CBD/CAD) or returned to processing.
  - Loads all order_lot_reservations for the order
  - Decrements inventory_lots.reserved_quantity for each lot
  - Deletes the reservation records
  - Clears orders.stock_shortage

  ### fulfill_stock_reservation(p_order_id uuid)
  Called when an order is marked Shipped — converts reservations to actual stock deductions.
  - Loads all order_lot_reservations for the order
  - Deducts inventory_lots.remaining_quantity for each lot (the stock is now physically gone)
  - Also decrements reserved_quantity (reservation is consumed)
  - Inserts stock_movements records with movement_type='fulfillment'
  - Deletes the reservation records
  - Clears orders.stock_shortage

  ## Notes
  - All three functions use SECURITY DEFINER so they can be called from the frontend
    via supabase.rpc() with the anon key while still having write access.
  - Lots with remaining_quantity = 0 after deduction are left as-is (historical record).
  - The stock_shortage flag is recalculated on every reserve call.
*/

-- ─── 1. RELEASE function (simplest, no dependencies) ───────────────────────

CREATE OR REPLACE FUNCTION release_stock_reservation(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Decrement reserved_quantity for each reserved lot
  FOR r IN
    SELECT lot_id, quantity
    FROM order_lot_reservations
    WHERE order_id = p_order_id
  LOOP
    UPDATE inventory_lots
    SET reserved_quantity = GREATEST(0, reserved_quantity - r.quantity)
    WHERE id = r.lot_id;
  END LOOP;

  -- Remove all reservations for this order
  DELETE FROM order_lot_reservations WHERE order_id = p_order_id;

  -- Clear the shortage flag
  UPDATE orders SET stock_shortage = false WHERE id = p_order_id;
END;
$$;

-- ─── 2. FULFILL function (deduct physical stock + release reservation) ────

CREATE OR REPLACE FUNCTION fulfill_stock_reservation(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_lot RECORD;
BEGIN
  -- For each reservation, deduct physical stock and record movement
  FOR r IN
    SELECT olr.lot_id, olr.quantity, olr.product_id, olr.order_item_id,
           il.remaining_quantity, il.reserved_quantity
    FROM order_lot_reservations olr
    JOIN inventory_lots il ON il.id = olr.lot_id
    WHERE olr.order_id = p_order_id
  LOOP
    -- Deduct physical stock
    UPDATE inventory_lots
    SET
      remaining_quantity = GREATEST(0, remaining_quantity - r.quantity),
      reserved_quantity  = GREATEST(0, reserved_quantity  - r.quantity)
    WHERE id = r.lot_id;

    -- Record stock movement
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
      'fulfillment',
      -r.quantity,
      'order',
      p_order_id,
      'Stock deducted on shipment'
    );
  END LOOP;

  -- Remove all reservations for this order
  DELETE FROM order_lot_reservations WHERE order_id = p_order_id;

  -- Clear the shortage flag
  UPDATE orders SET stock_shortage = false WHERE id = p_order_id;
END;
$$;

-- ─── 3. RESERVE function (main logic) ─────────────────────────────────────

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
    -- Resolve product_id (may come directly or via SKU lookup)
    v_product_id := COALESCE(v_item.product_id, v_item.resolved_product_id);

    IF v_product_id IS NULL THEN
      v_shortage := true;
      CONTINUE;
    END IF;

    v_needed := v_item.quantity;

    -- Iterate FIFO lots (oldest received_date first)
    FOR v_lot IN
      SELECT id, remaining_quantity, reserved_quantity
      FROM inventory_lots
      WHERE product_id = v_product_id
        AND remaining_quantity > 0
      ORDER BY received_date ASC NULLS LAST, created_at ASC
    LOOP
      EXIT WHEN v_needed <= 0;

      v_available := v_lot.remaining_quantity - COALESCE(v_lot.reserved_quantity, 0);

      IF v_available <= 0 THEN
        CONTINUE;
      END IF;

      v_take := LEAST(v_needed, v_available);

      -- Create reservation record
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

      -- Increment reserved_quantity on the lot
      UPDATE inventory_lots
      SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_take
      WHERE id = v_lot.id;

      v_needed := v_needed - v_take;
    END LOOP;

    -- If we couldn't fully reserve, flag shortage
    IF v_needed > 0 THEN
      v_shortage := true;
    END IF;
  END LOOP;

  -- Update shortage flag on the order
  UPDATE orders SET stock_shortage = v_shortage WHERE id = p_order_id;
END;
$$;
