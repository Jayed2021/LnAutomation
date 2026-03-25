/*
  # Make return_items.product_id Nullable & Backfill Existing Returns

  ## Summary
  Some order_items do not have a product_id (e.g. RX prescription items imported
  from WooCommerce that haven't been matched to a product). To allow return_items
  to be created from these order items, product_id must be nullable.

  ## Changes
  1. Alter return_items.product_id to allow NULL values
  2. Backfill return_items rows for 4 existing returns that were created without
     linked items due to a bug in the original creation logic:
     - CAD return: inserts its order items
     - Partial Delivery return: inserts all order items
     - Reverse Pick return: inserts all order items
     - Exchange return: inserts all order items from the original order

  ## Notes
  - Safe to re-run (uses NOT EXISTS guard)
  - Sets qc_status to 'pending' for all new rows
*/

ALTER TABLE return_items ALTER COLUMN product_id DROP NOT NULL;

INSERT INTO return_items (return_id, order_item_id, product_id, sku, quantity, qc_status)
SELECT
  r.id AS return_id,
  oi.id AS order_item_id,
  oi.product_id,
  oi.sku,
  oi.quantity,
  'pending' AS qc_status
FROM returns r
JOIN order_items oi ON oi.order_id = r.order_id
WHERE r.return_number IN (
  'RET-1774430865895',
  'RET-1774428094427',
  'RET-1774427104115',
  'RET-1774377818297'
)
AND NOT EXISTS (
  SELECT 1 FROM return_items ri
  WHERE ri.return_id = r.id AND ri.order_item_id = oi.id
);
