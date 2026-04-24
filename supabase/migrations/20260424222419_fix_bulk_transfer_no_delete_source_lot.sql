/*
  Fix: bulk_transfer_location — never DELETE source lots

  The original version tried to DELETE the source lot in the merge case,
  which violated FK constraints from stock_movements, inventory_audit_lines,
  order_picks, audit_flags, goods_receipt_lines, and packaging_dispatch_items.

  New approach for the merge case:
    - Add the source lot's quantities into the destination lot (same as before)
    - Migrate active order_lot_reservations to the destination lot (same as before)
    - Zero out the source lot (remaining_quantity=0, reserved_quantity=0) and
      move its location_id to the destination so it is co-located and invisible
      to all active stock queries — historical FK references remain valid.
*/

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
    SELECT id INTO v_dest_lot_id
    FROM inventory_lots
    WHERE location_id = p_dest_id
      AND lot_number = v_lot.lot_number
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

      -- Zero out the source lot and move it to the destination location.
      -- We NEVER delete it — other tables (stock_movements, audit_lines,
      -- order_picks, audit_flags, goods_receipt_lines, packaging_dispatch_items)
      -- hold FK references to it. Zeroing makes it invisible to all
      -- remaining_quantity > 0 filters while keeping history intact.
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
      -- Simple move: just update location_id — all FK references follow
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
