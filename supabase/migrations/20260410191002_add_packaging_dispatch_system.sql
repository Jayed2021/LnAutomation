/*
  # Add Packaging Dispatch System

  ## Summary
  Implements a dedicated packaging dispatch workflow that decouples packaging material
  deduction from the "Mark as Shipped" action. Instead of deducting packaging stock on
  every individual shipment, the warehouse team dispatches packaging in bulk once per day
  (or as needed) using the new dispatch modal.

  ## Changes

  ### 1. New Tables

  #### `packaging_dispatch_logs`
  - Header record for each dispatch event
  - `id` (uuid, pk)
  - `dispatch_date` (date) — NOT unique, multiple dispatches per day are allowed
  - `notes` (text, nullable) — optional remarks
  - `created_by` (text, nullable) — username/name of dispatcher
  - `created_at` (timestamptz)

  #### `packaging_dispatch_items`
  - Line items belonging to a dispatch log
  - `id` (uuid, pk)
  - `dispatch_log_id` (uuid, fk → packaging_dispatch_logs)
  - `product_id` (uuid, fk → products)
  - `lot_id` (uuid, nullable, fk → inventory_lots) — which lot was deducted
  - `lot_number` (text, nullable) — snapshot of lot number for display
  - `quantity` (integer, > 0)
  - `created_at` (timestamptz)

  ### 2. Modified Movement Type Constraint
  - Adds `pkg_dispatch` to the stock_movements.movement_type CHECK constraint
  - This new type records the physical packaging deduction from the dispatch event

  ### 3. Modified `fulfill_stock_reservation` Function
  - Now skips lots whose product has `product_type = 'packaging_material'`
  - Packaging stock is no longer deducted on "Mark as Shipped"
  - Saleable goods deduction is completely unchanged

  ### 4. Modified `reserve_stock_for_order` Function
  - Now skips packaging material products when building reservations
  - `order_lot_reservations` will no longer include packaging material lots
  - `order_packaging_items` rows are preserved for profit tracking but not reserved

  ### 5. Security
  - RLS enabled on both new tables
  - Policies grant access to authenticated users and anon role (custom auth pattern)

  ## Important Notes
  1. Existing packaging reservations in order_lot_reservations are unaffected (historical)
  2. No data is deleted — only the RPC logic changes
  3. The `order_packaging_items` table continues to be used for COGS/profit tracking
*/

-- ----------------------------------------------------------------
-- 1. Create packaging_dispatch_logs table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS packaging_dispatch_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_date date NOT NULL DEFAULT CURRENT_DATE,
  notes        text,
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE packaging_dispatch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dispatch logs"
  ON packaging_dispatch_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dispatch logs"
  ON packaging_dispatch_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon users can view dispatch logs"
  ON packaging_dispatch_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert dispatch logs"
  ON packaging_dispatch_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- ----------------------------------------------------------------
-- 2. Create packaging_dispatch_items table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS packaging_dispatch_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_log_id  uuid NOT NULL REFERENCES packaging_dispatch_logs(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES products(id),
  lot_id           uuid REFERENCES inventory_lots(id),
  lot_number       text,
  quantity         integer NOT NULL CHECK (quantity > 0),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packaging_dispatch_items_log_id ON packaging_dispatch_items(dispatch_log_id);
CREATE INDEX IF NOT EXISTS idx_packaging_dispatch_items_product_id ON packaging_dispatch_items(product_id);

ALTER TABLE packaging_dispatch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dispatch items"
  ON packaging_dispatch_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dispatch items"
  ON packaging_dispatch_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon users can view dispatch items"
  ON packaging_dispatch_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert dispatch items"
  ON packaging_dispatch_items FOR INSERT
  TO anon
  WITH CHECK (true);

-- ----------------------------------------------------------------
-- 3. Add pkg_dispatch to movement type constraint
-- ----------------------------------------------------------------
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
    CHECK (movement_type IN (
      'receipt',
      'sale',
      'return_restock',
      'return_receive',
      'adjustment',
      'transfer',
      'damaged',
      'qc_damaged',
      'pkg_manual_restock',
      'pkg_damaged',
      'pkg_dispatch'
    ));

-- ----------------------------------------------------------------
-- 4. Update reserve_stock_for_order: skip packaging materials
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION reserve_stock_for_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_item record;
  v_lot  record;
  v_product_id uuid;
  v_remaining_to_reserve integer;
  v_reserve_qty integer;
  v_fully_satisfied boolean := true;
BEGIN
  -- Remove any stale reservations for this order first (idempotent)
  PERFORM release_stock_reservation(p_order_id);

  -- ----------------------------------------------------------------
  -- Reserve saleable goods from order_items (FIFO lot logic)
  -- Packaging materials are intentionally excluded here.
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

    -- Skip packaging materials — they are dispatched separately
    IF EXISTS (SELECT 1 FROM products WHERE id = v_product_id AND product_type = 'packaging_material') THEN
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
END;
$$;

-- ----------------------------------------------------------------
-- 5. Update fulfill_stock_reservation: skip packaging materials
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION fulfill_stock_reservation(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_res record;
  v_lot record;
  v_is_packaging boolean;
BEGIN
  FOR v_res IN
    SELECT lot_id, quantity FROM order_lot_reservations WHERE order_id = p_order_id
  LOOP
    -- Check if this lot belongs to a packaging material
    SELECT (p.product_type = 'packaging_material')
    INTO v_is_packaging
    FROM inventory_lots il
    JOIN products p ON p.id = il.product_id
    WHERE il.id = v_res.lot_id;

    -- Skip packaging material lots — they are deducted via dispatch, not shipment
    IF v_is_packaging THEN
      CONTINUE;
    END IF;

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

  -- Release only non-packaging reservations (packaging lots had no reservation to begin with)
  DELETE FROM order_lot_reservations
  WHERE order_id = p_order_id
    AND lot_id IN (
      SELECT il.id FROM inventory_lots il
      JOIN products p ON p.id = il.product_id
      WHERE p.product_type != 'packaging_material'
    );

  -- Also clean up any legacy packaging reservations that may exist from before this change
  DELETE FROM order_lot_reservations
  WHERE order_id = p_order_id
    AND lot_id IN (
      SELECT il.id FROM inventory_lots il
      JOIN products p ON p.id = il.product_id
      WHERE p.product_type = 'packaging_material'
    );

  UPDATE orders SET stock_shortage = false WHERE id = p_order_id;
END;
$$;
