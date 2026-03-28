/*
  # Add Packaging Material Reservation to reserve_stock_for_order

  ## Summary
  Extends the stock reservation system to include packaging materials.
  When an order is confirmed (moved to not_printed), packaging items are now
  reserved using the same FIFO lot logic as saleable goods.

  ## Key Behaviour: Silent Removal on Shortage
  If a packaging material has insufficient stock to cover the required quantity:
  - Reserve whatever stock IS available (partial or zero)
  - Automatically DELETE the order_packaging_items row(s) for that material
  - This keeps profit tracking clean — no phantom packaging costs on the order
  - Packaging shortages do NOT affect the orders.stock_shortage flag
    (that flag is reserved for saleable goods only)

  ## Flow
  1. reserve_stock_for_order() — now reserves packaging lots in addition to product lots
  2. fulfill_stock_reservation() — unchanged; already deducts all lot reservations
     (including packaging) and writes stock_movements for each
  3. release_stock_reservation() — unchanged; already releases all lot reservations

  ## Profit View Impact
  - order_profit_summary uses order_packaging_items.line_total for packaging COGS
  - Rows that are removed on shortage disappear from the view, so no phantom cost
  - No changes to views required

  ## Notes
  1. Packaging product_ids must exist in inventory_lots to be reservable
  2. If a packaging product has no lots at all, the row is silently removed (same shortage path)
  3. The existing trigger (trg_orders_auto_fulfill_stock) already calls reserve+fulfill
     on shipped_at, so packaging flows through automatically going forward
*/

CREATE OR REPLACE FUNCTION reserve_stock_for_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_item record;
  v_pkg  record;
  v_lot  record;
  v_product_id uuid;
  v_remaining_to_reserve integer;
  v_reserve_qty integer;
  v_fully_satisfied boolean := true;
  v_pkg_available integer;
BEGIN
  -- Remove any stale reservations for this order first (idempotent)
  PERFORM release_stock_reservation(p_order_id);

  -- ----------------------------------------------------------------
  -- Part 1: Reserve saleable goods from order_items (existing logic)
  -- ----------------------------------------------------------------
  FOR v_item IN
    SELECT oi.id, oi.product_id, oi.sku, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
      AND oi.sku NOT IN ('RX', 'FEE')
  LOOP
    v_product_id := v_item.product_id;

    IF v_product_id IS NULL THEN
      SELECT id INTO v_product_id FROM products WHERE sku = v_item.sku LIMIT 1;
    END IF;

    IF v_product_id IS NULL THEN
      v_fully_satisfied := false;
      CONTINUE;
    END IF;

    v_remaining_to_reserve := v_item.quantity;

    FOR v_lot IN
      SELECT id, remaining_quantity, reserved_quantity,
             (remaining_quantity - reserved_quantity) AS available_qty
      FROM inventory_lots
      WHERE product_id = v_product_id
        AND (remaining_quantity - reserved_quantity) > 0
      ORDER BY received_date ASC, created_at ASC
    LOOP
      IF v_remaining_to_reserve <= 0 THEN EXIT; END IF;

      v_reserve_qty := LEAST(v_remaining_to_reserve, v_lot.available_qty);

      INSERT INTO order_lot_reservations (order_id, lot_id, quantity)
      VALUES (p_order_id, v_lot.id, v_reserve_qty)
      ON CONFLICT (order_id, lot_id) DO UPDATE
        SET quantity = order_lot_reservations.quantity + EXCLUDED.quantity;

      UPDATE inventory_lots
        SET reserved_quantity = reserved_quantity + v_reserve_qty
      WHERE id = v_lot.id;

      v_remaining_to_reserve := v_remaining_to_reserve - v_reserve_qty;
    END LOOP;

    IF v_remaining_to_reserve > 0 THEN
      v_fully_satisfied := false;
    END IF;
  END LOOP;

  -- Set shortage flag based on saleable goods only
  UPDATE orders SET stock_shortage = NOT v_fully_satisfied WHERE id = p_order_id;

  -- ----------------------------------------------------------------
  -- Part 2: Reserve packaging materials from order_packaging_items
  -- Shortage = silent removal of that packaging item row
  -- ----------------------------------------------------------------
  FOR v_pkg IN
    SELECT opi.id AS opi_id, opi.product_id, SUM(opi.quantity) AS total_qty
    FROM order_packaging_items opi
    WHERE opi.order_id = p_order_id
      AND opi.product_id IS NOT NULL
    GROUP BY opi.id, opi.product_id
  LOOP
    v_remaining_to_reserve := v_pkg.total_qty;
    v_pkg_available := 0;

    -- Check total available stock for this packaging product
    SELECT COALESCE(SUM(remaining_quantity - reserved_quantity), 0)
    INTO v_pkg_available
    FROM inventory_lots
    WHERE product_id = v_pkg.product_id
      AND (remaining_quantity - reserved_quantity) > 0;

    -- If no stock available at all, remove the packaging row and skip
    IF v_pkg_available <= 0 THEN
      DELETE FROM order_packaging_items WHERE id = v_pkg.opi_id;
      CONTINUE;
    END IF;

    -- FIFO reservation for packaging
    FOR v_lot IN
      SELECT id, remaining_quantity, reserved_quantity,
             (remaining_quantity - reserved_quantity) AS available_qty
      FROM inventory_lots
      WHERE product_id = v_pkg.product_id
        AND (remaining_quantity - reserved_quantity) > 0
      ORDER BY received_date ASC, created_at ASC
    LOOP
      IF v_remaining_to_reserve <= 0 THEN EXIT; END IF;

      v_reserve_qty := LEAST(v_remaining_to_reserve, v_lot.available_qty);

      INSERT INTO order_lot_reservations (order_id, lot_id, quantity)
      VALUES (p_order_id, v_lot.id, v_reserve_qty)
      ON CONFLICT (order_id, lot_id) DO UPDATE
        SET quantity = order_lot_reservations.quantity + EXCLUDED.quantity;

      UPDATE inventory_lots
        SET reserved_quantity = reserved_quantity + v_reserve_qty
      WHERE id = v_lot.id;

      v_remaining_to_reserve := v_remaining_to_reserve - v_reserve_qty;
    END LOOP;

    -- If we couldn't reserve the full quantity, remove the packaging row
    -- (partial shortage: what we reserved will be released by release_stock_reservation)
    IF v_remaining_to_reserve > 0 THEN
      DELETE FROM order_packaging_items WHERE id = v_pkg.opi_id;
    END IF;
  END LOOP;
END;
$$;
