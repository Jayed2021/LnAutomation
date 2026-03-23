/*
  # Add closed_as_partial flag and repair stuck partially_received POs

  1. Changes
    - Add `closed_as_partial` boolean column to `purchase_orders`
      - Tracks when an admin closes a PO that was only partially received
      - Defaults to false
    - Repair any POs in `partially_received` status where all items have been
      fully received (received_quantity >= ordered_quantity) and no incomplete
      receipt sessions exist — these should be `received_complete`

  2. Why
    - A bug in the receiving flow (call order: updatePOStatus ran before the
      session was marked complete in the DB) caused some POs to stay stuck in
      `partially_received` even after full receipt
    - This migration auto-corrects those stuck records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'closed_as_partial'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN closed_as_partial boolean NOT NULL DEFAULT false;
  END IF;
END $$;

UPDATE purchase_orders po
SET status = 'received_complete'
WHERE po.status = 'partially_received'
  AND NOT EXISTS (
    SELECT 1 FROM goods_receipt_sessions grs
    WHERE grs.po_id = po.id AND grs.step <> 'complete'
  )
  AND (
    SELECT COALESCE(SUM(poi.received_quantity), 0)
    FROM purchase_order_items poi
    WHERE poi.po_id = po.id
  ) >= (
    SELECT COALESCE(SUM(poi.ordered_quantity), 0)
    FROM purchase_order_items poi
    WHERE poi.po_id = po.id
  )
  AND (
    SELECT COALESCE(SUM(poi.ordered_quantity), 0)
    FROM purchase_order_items poi
    WHERE poi.po_id = po.id
  ) > 0;
