
/*
  # Bulk Create Returns for cancelled_cad Orders (March 2026)

  ## Summary
  Creates return records and return item rows for all cancelled_cad orders
  placed in March 2026 that do not already have a return record.

  ## Changes

  ### New Rows in `returns`
  - One return per qualifying order (cs_status = 'cancelled_cad', March 1–31 2026)
  - Orders that already have a return are skipped (no duplicates)
  - return_reason = 'Customer issue'
  - status = 'expected'

  ### New Rows in `return_items`
  - One row per order_item belonging to each newly created return
  - qc_status = 'pending', receive_status = 'pending'
  - Ready for staff to complete the receive workflow immediately

  ## Notes
  1. The entire operation is atomic — both inserts succeed or neither does
  2. Duplicate prevention: NOT EXISTS check on returns.order_id
  3. return_number generated as RET- prefix + epoch ms + row offset for uniqueness
*/

WITH new_returns AS (
  INSERT INTO returns (
    id,
    return_number,
    order_id,
    customer_id,
    return_reason,
    status,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    'RET-' || (
      EXTRACT(EPOCH FROM NOW())::bigint * 1000
      + ROW_NUMBER() OVER (ORDER BY o.created_at, o.id)
    )::text,
    o.id,
    o.customer_id,
    'Customer issue',
    'expected',
    NOW(),
    NOW()
  FROM orders o
  WHERE o.cs_status = 'cancelled_cad'
    AND o.created_at >= '2026-03-01 00:00:00+00'
    AND o.created_at <  '2026-04-01 00:00:00+00'
    AND NOT EXISTS (
      SELECT 1 FROM returns r WHERE r.order_id = o.id
    )
  RETURNING id, order_id
)
INSERT INTO return_items (
  id,
  return_id,
  order_item_id,
  product_id,
  sku,
  quantity,
  qc_status,
  receive_status,
  created_at
)
SELECT
  gen_random_uuid(),
  nr.id,
  oi.id,
  oi.product_id,
  oi.sku,
  oi.quantity,
  'pending',
  'pending',
  NOW()
FROM new_returns nr
JOIN order_items oi ON oi.order_id = nr.order_id;
