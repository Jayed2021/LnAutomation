/*
  # Backfill Packaging Stock Movements for Today's Shipped Orders

  ## Summary
  Today's orders (shipped 2026-03-28) had product stock deducted correctly but
  packaging materials were not yet tracked. This migration deducts packaging
  stock and writes stock_movements rows for each packaging item used.

  ## What This Does
  For each order shipped today that has order_packaging_items but no packaging
  sale stock_movements yet:
  1. Iterates over order_packaging_items grouped by product
  2. Deducts from inventory_lots using FIFO (oldest received_date first)
  3. Inserts stock_movements rows (movement_type = 'sale', reference_type = 'order')

  ## Guard
  - Skips any order that already has packaging-related sale movements
  - Checks product_type = 'packaging_material' as an additional guard
  - Idempotent: safe to run multiple times

  ## Today's Numbers (pre-run estimate)
  - ~316 Sunglasses Leather Cover (LN_PKG_01)
  - ~93 Tissue Bag (LN_PKG_04)
  - ~93 Plastic Box (LN_PKG_02)
  - ~93 Standard Cleaning Cloth (LN_PKG_03)
  - ~2 Premium Triangular Leather Cover (LN_PKG_05)
  All within current stock levels — no shortfalls expected.
*/

DO $$
DECLARE
  v_order record;
  v_pkg   record;
  v_lot   record;
  v_remaining integer;
  v_deduct    integer;
  v_lot_info  record;
  v_order_count integer := 0;
  v_movement_count integer := 0;
BEGIN
  FOR v_order IN
    SELECT DISTINCT o.id
    FROM orders o
    JOIN order_packaging_items opi ON opi.order_id = o.id
    WHERE o.shipped_at >= '2026-03-28 00:00:00+06'
      AND o.fulfillment_status = 'shipped'
      -- Skip if this order already has packaging sale movements
      AND NOT EXISTS (
        SELECT 1
        FROM stock_movements sm
        JOIN products p ON p.id = sm.product_id
        WHERE sm.reference_id = o.id
          AND sm.movement_type = 'sale'
          AND p.product_type = 'packaging_material'
      )
    ORDER BY o.id
  LOOP
    v_order_count := v_order_count + 1;

    FOR v_pkg IN
      SELECT opi.product_id, SUM(opi.quantity) AS total_qty
      FROM order_packaging_items opi
      JOIN products p ON p.id = opi.product_id
      WHERE opi.order_id = v_order.id
        AND p.product_type = 'packaging_material'
      GROUP BY opi.product_id
    LOOP
      v_remaining := v_pkg.total_qty;

      FOR v_lot IN
        SELECT id, remaining_quantity, location_id
        FROM inventory_lots
        WHERE product_id = v_pkg.product_id
          AND remaining_quantity > 0
        ORDER BY received_date ASC, created_at ASC
      LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;

        v_deduct := LEAST(v_remaining, v_lot.remaining_quantity);

        UPDATE inventory_lots
          SET remaining_quantity = remaining_quantity - v_deduct
        WHERE id = v_lot.id;

        INSERT INTO stock_movements (
          product_id, lot_id, from_location_id,
          movement_type, quantity, reference_type, reference_id, notes
        ) VALUES (
          v_pkg.product_id,
          v_lot.id,
          v_lot.location_id,
          'sale',
          -v_deduct,
          'order',
          v_order.id,
          'Packaging material used — backfill 2026-03-28'
        );

        v_movement_count := v_movement_count + 1;
        v_remaining := v_remaining - v_deduct;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Backfilled packaging movements: % orders, % stock_movement rows', v_order_count, v_movement_count;
END $$;
