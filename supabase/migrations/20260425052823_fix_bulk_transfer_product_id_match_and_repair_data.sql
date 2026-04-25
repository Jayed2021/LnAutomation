/*
  # Fix bulk_transfer_location — match by lot_number + product_id, repair bad transfer data

  ## Problem
  The bulk_transfer_location RPC matched destination lots by lot_number only, not
  lot_number + product_id. During the BOX-1 → LN PKG Material Loc transfer on
  2026-04-24, all 4 source lots shared lot_number 'LOT-001'. The RPC merged each
  subsequent lot into the first product's lot, zeroing the source lots incorrectly.

  ## Affected lots (pre-transfer balances from stock_movements history)
  - LN_PKG_03 (6d6ac0bd): was 668  → became 0   (zeroed — merged into LN_PKG_08's lot)
  - LN_PKG_05 (e0039b35): was 58   → became 0   (zeroed — merged into LN_PKG_06's lot)
  - LN_PKG_06 (3a8c2f48): was 132  → became 726 (inflated by 58+668 ghost units)
  - LN_PKG_08 (3af40b98): was 2067 → became 2199 (inflated by 132 ghost units)

  ## Changes
  1. Fix 1: Correct remaining_quantity on all 4 lots to their true post-transfer values.
  2. Fix 2: Replace bulk_transfer_location RPC with corrected version that matches
     on (lot_number, product_id) together.
*/

-- Fix 1: Restore correct remaining_quantity on the 4 corrupted lots
UPDATE inventory_lots SET remaining_quantity = 668 WHERE id = '6d6ac0bd-4d1d-4cb2-9c8e-48859474a5c7';
UPDATE inventory_lots SET remaining_quantity = 58  WHERE id = 'e0039b35-82a2-4afc-8179-94f16140325e';
UPDATE inventory_lots SET remaining_quantity = 132 WHERE id = '3a8c2f48-01fe-4dcb-9b37-37cd415ddb79';
UPDATE inventory_lots SET remaining_quantity = 2067 WHERE id = '3af40b98-e2d4-46af-a3ec-33e2661bc1b6';

-- Fix 2: Replace the RPC — add product_id to the merge-detection WHERE clause
CREATE OR REPLACE FUNCTION bulk_transfer_location(
  p_source_id uuid,
  p_dest_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_lot           RECORD;
  v_dest_lot_id   uuid;
  v_moved_lots    integer := 0;
  v_moved_units   integer := 0;
  v_reserved      integer := 0;
  v_summary       jsonb   := '[]'::jsonb;
  v_entry         jsonb;
BEGIN
  IF p_source_id = p_dest_id THEN
    RAISE EXCEPTION 'Source and destination locations must be different';
  END IF;

  FOR v_lot IN
    SELECT * FROM inventory_lots
    WHERE location_id = p_source_id
      AND remaining_quantity > 0
    ORDER BY received_date ASC
  LOOP
    -- Match on BOTH lot_number AND product_id to avoid cross-product merges
    SELECT id INTO v_dest_lot_id
    FROM inventory_lots
    WHERE location_id = p_dest_id
      AND lot_number  = v_lot.lot_number
      AND product_id  = v_lot.product_id
    LIMIT 1;

    IF v_dest_lot_id IS NOT NULL THEN
      -- Merge: add quantities into the existing destination lot
      UPDATE inventory_lots
      SET
        remaining_quantity = remaining_quantity + v_lot.remaining_quantity,
        reserved_quantity  = reserved_quantity  + v_lot.reserved_quantity,
        received_quantity  = received_quantity  + v_lot.received_quantity
      WHERE id = v_dest_lot_id;

      -- Migrate active reservations to the destination lot
      UPDATE order_lot_reservations
      SET lot_id = v_dest_lot_id
      WHERE lot_id = v_lot.id;

      -- Zero out source lot and move it to destination location.
      -- Never deleted — other tables hold FK references to it.
      UPDATE inventory_lots
      SET
        remaining_quantity = 0,
        reserved_quantity  = 0,
        location_id        = p_dest_id
      WHERE id = v_lot.id;

      v_entry := jsonb_build_object(
        'lot_id',      v_dest_lot_id,
        'lot_number',  v_lot.lot_number,
        'units',       v_lot.remaining_quantity,
        'reserved',    v_lot.reserved_quantity,
        'action',      'merged'
      );
    ELSE
      -- Simple move: just update location_id
      UPDATE inventory_lots
      SET location_id = p_dest_id
      WHERE id = v_lot.id;

      v_dest_lot_id := v_lot.id;

      v_entry := jsonb_build_object(
        'lot_id',     v_lot.id,
        'lot_number', v_lot.lot_number,
        'units',      v_lot.remaining_quantity,
        'reserved',   v_lot.reserved_quantity,
        'action',     'moved'
      );
    END IF;

    -- Record a stock movement for traceability
    INSERT INTO stock_movements (
      product_id, lot_id,
      movement_type, quantity,
      from_location_id, to_location_id,
      reference_type, notes, created_at
    ) VALUES (
      v_lot.product_id,
      v_dest_lot_id,
      'transfer',
      v_lot.remaining_quantity,
      p_source_id, p_dest_id,
      'bulk_transfer',
      'Bulk location transfer',
      now()
    );

    v_summary     := v_summary || jsonb_build_array(v_entry);
    v_moved_lots  := v_moved_lots  + 1;
    v_moved_units := v_moved_units + v_lot.remaining_quantity;
    v_reserved    := v_reserved    + v_lot.reserved_quantity;
  END LOOP;

  INSERT INTO bulk_location_transfers (
    source_location_id, dest_location_id,
    lots_moved, units_moved, reserved_units,
    transfer_summary
  ) VALUES (
    p_source_id, p_dest_id,
    v_moved_lots, v_moved_units, v_reserved,
    v_summary
  );

  RETURN jsonb_build_object(
    'lots_moved',  v_moved_lots,
    'units_moved', v_moved_units,
    'reserved',    v_reserved,
    'summary',     v_summary
  );
END;
$$;
