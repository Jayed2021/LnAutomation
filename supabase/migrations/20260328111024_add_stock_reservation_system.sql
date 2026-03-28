/*
  # Stock Reservation System

  ## Summary
  Adds a stock reservation layer that tracks committed (reserved) inventory for confirmed
  orders separately from actual physical stock. This prevents the same lot from being
  allocated to multiple orders simultaneously.

  ## New Tables
  - `order_lot_reservations`
    - `id` (uuid, pk)
    - `order_id` (uuid, fk → orders)
    - `lot_id` (uuid, fk → inventory_lots)
    - `quantity` (integer) — how many units reserved from this lot for this order
    - `created_at` (timestamptz)
    - Unique constraint on (order_id, lot_id) — one reservation row per lot per order

  ## Modified Tables
  - `inventory_lots`
    - `reserved_quantity` (integer, default 0) — sum of active reservations against this lot
    - Available quantity = remaining_quantity - reserved_quantity

  ## Modified Tables (orders)
  - `orders`
    - `stock_shortage` (boolean, default false) — set true when reservation cannot be fully satisfied

  ## Security
  - RLS enabled on `order_lot_reservations`
  - Anon role (custom auth pattern) has full CRUD access consistent with existing tables

  ## Notes
  1. `reserved_quantity` on inventory_lots is a denormalized counter for fast queries.
     It is always equal to SUM of quantity in order_lot_reservations for that lot.
  2. The three reservation functions (reserve / release / fulfill) are the only intended
     mutation paths for this table.
  3. `fulfill_stock_reservation` reduces remaining_quantity and clears the reservation
     atomically — this is the path taken when an order is marked as Shipped.
  4. `release_stock_reservation` only clears the reservation without touching remaining_quantity
     — used for mark_processing (revert) and cancel_before_dispatch.
*/

-- 1. Add reserved_quantity to inventory_lots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_lots' AND column_name = 'reserved_quantity'
  ) THEN
    ALTER TABLE inventory_lots ADD COLUMN reserved_quantity integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. Add stock_shortage to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'stock_shortage'
  ) THEN
    ALTER TABLE orders ADD COLUMN stock_shortage boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. Create order_lot_reservations table
CREATE TABLE IF NOT EXISTS order_lot_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  lot_id uuid NOT NULL REFERENCES inventory_lots(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, lot_id)
);

ALTER TABLE order_lot_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select order_lot_reservations"
  ON order_lot_reservations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert order_lot_reservations"
  ON order_lot_reservations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update order_lot_reservations"
  ON order_lot_reservations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete order_lot_reservations"
  ON order_lot_reservations FOR DELETE
  TO anon
  USING (true);

-- Index for fast lookups by order_id
CREATE INDEX IF NOT EXISTS idx_order_lot_reservations_order_id ON order_lot_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_lot_reservations_lot_id ON order_lot_reservations(lot_id);

-- 4. reserve_stock_for_order: creates reservations using FIFO, sets stock_shortage flag
CREATE OR REPLACE FUNCTION reserve_stock_for_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_item record;
  v_lot record;
  v_product_id uuid;
  v_remaining_to_reserve integer;
  v_reserve_qty integer;
  v_fully_satisfied boolean := true;
BEGIN
  -- Remove any stale reservations for this order first (idempotent)
  PERFORM release_stock_reservation(p_order_id);

  -- Iterate over order items excluding RX and FEE
  FOR v_item IN
    SELECT oi.id, oi.product_id, oi.sku, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
      AND oi.sku NOT IN ('RX', 'FEE')
  LOOP
    v_product_id := v_item.product_id;

    -- Resolve product_id from sku if not set
    IF v_product_id IS NULL THEN
      SELECT id INTO v_product_id FROM products WHERE sku = v_item.sku LIMIT 1;
    END IF;

    IF v_product_id IS NULL THEN
      v_fully_satisfied := false;
      CONTINUE;
    END IF;

    v_remaining_to_reserve := v_item.quantity;

    -- FIFO: oldest received_date first, only lots with available stock
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

  -- Set shortage flag on the order
  UPDATE orders SET stock_shortage = NOT v_fully_satisfied WHERE id = p_order_id;
END;
$$;

-- 5. release_stock_reservation: removes reservations without touching remaining_quantity
--    Used for: mark_processing (revert), cancel_before_dispatch
CREATE OR REPLACE FUNCTION release_stock_reservation(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_res record;
BEGIN
  FOR v_res IN
    SELECT lot_id, quantity FROM order_lot_reservations WHERE order_id = p_order_id
  LOOP
    UPDATE inventory_lots
      SET reserved_quantity = GREATEST(0, reserved_quantity - v_res.quantity)
    WHERE id = v_res.lot_id;
  END LOOP;

  DELETE FROM order_lot_reservations WHERE order_id = p_order_id;

  -- Clear shortage flag since reservation is gone
  UPDATE orders SET stock_shortage = false WHERE id = p_order_id;
END;
$$;

-- 6. fulfill_stock_reservation: deducts physical stock AND clears reservation atomically
--    Used exclusively when an order is marked as Shipped
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
    -- Deduct remaining_quantity and clear reserved_quantity for this reservation
    UPDATE inventory_lots
      SET remaining_quantity = GREATEST(0, remaining_quantity - v_res.quantity),
          reserved_quantity  = GREATEST(0, reserved_quantity  - v_res.quantity)
    WHERE id = v_res.lot_id;

    -- Record a stock movement for audit trail
    SELECT product_id, location_id INTO v_lot FROM inventory_lots WHERE id = v_res.lot_id;

    INSERT INTO stock_movements (
      product_id, lot_id, location_id,
      movement_type, quantity, reference_id, notes
    ) VALUES (
      v_lot.product_id, v_res.lot_id, v_lot.location_id,
      'sale', -v_res.quantity, p_order_id, 'Fulfilled via order shipment'
    );
  END LOOP;

  DELETE FROM order_lot_reservations WHERE order_id = p_order_id;

  -- Clear shortage flag — order is now fully shipped
  UPDATE orders SET stock_shortage = false WHERE id = p_order_id;
END;
$$;
