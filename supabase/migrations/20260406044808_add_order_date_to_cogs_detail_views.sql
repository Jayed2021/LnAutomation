/*
  # Add order_date to item COGS detail views for date-range filtering

  ## Problem
  The frontend queries order_item_cogs_detail and order_item_lot_cogs_detail
  using .in('order_id', [...]) with potentially hundreds of UUIDs, which
  exceeds PostgREST's URL length limit and silently returns no data.

  ## Fix
  Rebuild both views to include order_date so the frontend can filter
  by date range directly instead of passing all order IDs.

  ## Modified Views
  - order_item_cogs_detail: adds order_date column
  - order_item_lot_cogs_detail: adds order_date column
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Rebuild order_item_cogs_detail with order_date
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS order_item_cogs_detail;

CREATE VIEW order_item_cogs_detail AS
WITH

picked_cogs_per_item AS (
  SELECT
    op.order_item_id,
    SUM(op.quantity * il.landed_cost_per_unit) AS item_picked_cogs
  FROM order_picks op
  JOIN inventory_lots il ON il.id = op.lot_id
  GROUP BY op.order_item_id
),

fallback_cogs_per_item AS (
  SELECT
    oi.id AS order_item_id,
    oi.quantity * COALESCE(palc.avg_landed_cost, 0) AS item_fallback_cogs
  FROM order_items oi
  JOIN product_avg_landed_cost palc ON palc.sku = oi.sku
),

returned_order_items AS (
  SELECT DISTINCT ri.order_item_id
  FROM return_items ri
  WHERE ri.order_item_id IS NOT NULL
)

SELECT
  oi.order_id,
  o.order_date,
  oi.id         AS order_item_id,
  oi.sku,
  oi.product_name,
  oi.quantity,
  oi.unit_price,
  oi.line_total  AS item_revenue,
  CASE
    WHEN o.cs_status IN ('cancelled_cad', 'cancelled_cbd') THEN 0
    WHEN o.cs_status IN ('exchange_returnable', 'partial_delivery', 'reverse_pick')
         AND roi.order_item_id IS NOT NULL THEN 0
    ELSE COALESCE(pc.item_picked_cogs, fc.item_fallback_cogs, 0)
  END::numeric(12,2) AS adjusted_item_cogs
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN picked_cogs_per_item   pc  ON pc.order_item_id  = oi.id
LEFT JOIN fallback_cogs_per_item fc  ON fc.order_item_id  = oi.id
LEFT JOIN returned_order_items   roi ON roi.order_item_id = oi.id
WHERE o.payment_status = 'paid'
  AND o.cs_status <> 'cancelled_cbd';


-- ─────────────────────────────────────────────────────────────────────────────
-- Rebuild order_item_lot_cogs_detail with order_date
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS order_item_lot_cogs_detail;

CREATE VIEW order_item_lot_cogs_detail AS
WITH

returned_order_items AS (
  SELECT DISTINCT ri.order_item_id
  FROM return_items ri
  WHERE ri.order_item_id IS NOT NULL
),

zero_cogs_items AS (
  SELECT oi.id AS order_item_id
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN returned_order_items roi ON roi.order_item_id = oi.id
  WHERE o.cs_status IN ('cancelled_cad', 'cancelled_cbd')
     OR (
       o.cs_status IN ('exchange_returnable', 'partial_delivery', 'reverse_pick')
       AND roi.order_item_id IS NOT NULL
     )
),

picked_rows AS (
  SELECT
    oi.order_id,
    o.order_date,
    op.order_item_id,
    oi.sku,
    oi.product_name,
    il.lot_number,
    op.quantity                                         AS lot_quantity,
    il.landed_cost_per_unit,
    CASE
      WHEN zci.order_item_id IS NOT NULL THEN 0::numeric(12,2)
      ELSE (op.quantity * il.landed_cost_per_unit)::numeric(12,2)
    END                                                 AS line_cost,
    false                                               AS is_fallback
  FROM order_picks op
  JOIN order_items oi      ON oi.id  = op.order_item_id
  JOIN orders o            ON o.id   = oi.order_id
  JOIN inventory_lots il   ON il.id  = op.lot_id
  LEFT JOIN zero_cogs_items zci ON zci.order_item_id = op.order_item_id
  WHERE o.payment_status = 'paid'
    AND o.cs_status <> 'cancelled_cbd'
),

items_with_picks AS (
  SELECT DISTINCT order_item_id FROM picked_rows
),

fallback_rows AS (
  SELECT
    oi.order_id,
    o.order_date,
    oi.id                                               AS order_item_id,
    oi.sku,
    oi.product_name,
    NULL::text                                          AS lot_number,
    oi.quantity                                         AS lot_quantity,
    COALESCE(palc.avg_landed_cost, 0)                   AS landed_cost_per_unit,
    CASE
      WHEN zci.order_item_id IS NOT NULL THEN 0::numeric(12,2)
      ELSE (oi.quantity * COALESCE(palc.avg_landed_cost, 0))::numeric(12,2)
    END                                                 AS line_cost,
    true                                                AS is_fallback
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN product_avg_landed_cost palc ON palc.sku = oi.sku
  LEFT JOIN items_with_picks iwp ON iwp.order_item_id = oi.id
  LEFT JOIN zero_cogs_items  zci ON zci.order_item_id = oi.id
  WHERE o.payment_status = 'paid'
    AND o.cs_status <> 'cancelled_cbd'
    AND iwp.order_item_id IS NULL
)

SELECT * FROM picked_rows
UNION ALL
SELECT * FROM fallback_rows;
