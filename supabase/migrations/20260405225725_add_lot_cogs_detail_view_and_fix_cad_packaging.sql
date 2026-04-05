/*
  # Add lot-level COGS detail view + fix CAD packaging cost

  ## Summary

  Two changes in this migration:

  ### 1. Fix CAD packaging cost (order_profit_summary)

  The previous view used `COALESCE(NULLIF(pkg.total_packaging_cost, 0), 65)` which
  could not distinguish between:
    - A CAD order whose packaging was correctly zeroed out (should stay 0)
    - An order with no packaging rows at all (should fall back to 65)

  Both cases produced `total_packaging_cost = 0` before the NULLIF, so CAD orders
  incorrectly received a 65 BDT packaging cost instead of 0.

  Fix: the packaging_cost CTE now emits a second column `has_packaging_rows` (boolean).
  The outer SELECT uses it to decide: if there are actual rows, use the recorded total
  (even if zero); otherwise fall back to 65.

  ### 2. New view: order_item_lot_cogs_detail

  Returns one row per order_pick per order_item, showing:
    - lot_number, lot_quantity, landed_cost_per_unit, line_cost
    - is_fallback = false for actual picks

  For order_items with no picks, returns one synthetic row per item using
  the avg landed cost (is_fallback = true).

  The same status-based zero-out rules from order_item_cogs_detail apply:
  cancelled_cad / cancelled_cbd items → line_cost = 0.

  ## Modified Views
  - order_profit_summary: packaging NULLIF fix for CAD orders

  ## New Views
  - order_item_lot_cogs_detail: lot-level COGS traceability per order item
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Rebuild order_profit_summary with CAD packaging fix
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS order_item_cogs_detail;
DROP VIEW IF EXISTS order_profit_summary;

CREATE VIEW order_profit_summary AS
WITH

picked_cogs_per_item AS (
  SELECT
    op.order_item_id,
    oi.order_id,
    SUM(op.quantity * il.landed_cost_per_unit) AS item_picked_cogs
  FROM order_picks op
  JOIN order_items oi ON oi.id = op.order_item_id
  JOIN inventory_lots il ON il.id = op.lot_id
  GROUP BY op.order_item_id, oi.order_id
),

fallback_cogs_per_item AS (
  SELECT
    oi.id        AS order_item_id,
    oi.order_id,
    oi.quantity * COALESCE(palc.avg_landed_cost, 0) AS item_fallback_cogs
  FROM order_items oi
  JOIN product_avg_landed_cost palc ON palc.sku = oi.sku
),

returned_order_items AS (
  SELECT DISTINCT ri.order_item_id
  FROM return_items ri
  WHERE ri.order_item_id IS NOT NULL
),

item_raw_cogs AS (
  SELECT
    oi.id        AS order_item_id,
    oi.order_id,
    COALESCE(pc.item_picked_cogs, fc.item_fallback_cogs, 0) AS raw_cogs
  FROM order_items oi
  LEFT JOIN picked_cogs_per_item   pc ON pc.order_item_id = oi.id
  LEFT JOIN fallback_cogs_per_item fc ON fc.order_item_id = oi.id
),

item_adjusted_cogs AS (
  SELECT
    irc.order_id,
    irc.order_item_id,
    CASE
      WHEN o.cs_status IN ('cancelled_cad', 'cancelled_cbd') THEN 0
      WHEN o.cs_status IN ('exchange_returnable', 'partial_delivery', 'reverse_pick')
           AND roi.order_item_id IS NOT NULL THEN 0
      ELSE irc.raw_cogs
    END AS adjusted_item_cogs
  FROM item_raw_cogs irc
  JOIN orders o ON o.id = irc.order_id
  LEFT JOIN returned_order_items roi ON roi.order_item_id = irc.order_item_id
),

product_cogs AS (
  SELECT
    order_id,
    SUM(adjusted_item_cogs) AS total_product_cogs
  FROM item_adjusted_cogs
  GROUP BY order_id
),

packaging_cost AS (
  SELECT
    opi.order_id,
    true AS has_packaging_rows,
    SUM(
      CASE
        WHEN o.cs_status IN ('cancelled_cad', 'cancelled_cbd') THEN 0
        WHEN o.cs_status IN ('exchange_returnable', 'partial_delivery', 'reverse_pick')
             AND opi.source_order_item_id IS NOT NULL
             AND roi.order_item_id IS NOT NULL THEN 0
        ELSE opi.line_total
      END
    ) AS total_packaging_cost
  FROM order_packaging_items opi
  JOIN orders o ON o.id = opi.order_id
  LEFT JOIN returned_order_items roi ON roi.order_item_id = opi.source_order_item_id
  GROUP BY opi.order_id
)

SELECT
  o.id                                                                              AS order_id,
  o.order_number,
  o.woo_order_id,
  o.order_type,
  o.order_date,
  o.cs_status,
  o.payment_status,
  o.fulfillment_status,
  c.full_name                                                                       AS customer_name,
  c.phone_primary                                                                   AS customer_phone,

  COALESCE(oci.collected_amount, o.total_amount, 0)::numeric(12,2)                 AS revenue,
  COALESCE(oci.delivery_charge, 0)::numeric(12,2)                                  AS delivery_charge,

  COALESCE(pcogs.total_product_cogs, 0)::numeric(12,2)                             AS product_cogs,

  -- If actual packaging rows exist for this order, use the recorded total (may be 0 for CAD).
  -- Only fall back to 65 when there are NO packaging rows recorded at all.
  CASE
    WHEN pkg.has_packaging_rows IS TRUE THEN COALESCE(pkg.total_packaging_cost, 0)
    ELSE 65
  END::numeric(12,2)                                                                AS packaging_cost,

  (
    COALESCE(pcogs.total_product_cogs, 0)
    + CASE
        WHEN pkg.has_packaging_rows IS TRUE THEN COALESCE(pkg.total_packaging_cost, 0)
        ELSE 65
      END
    + COALESCE(oci.delivery_charge, 0)
  )::numeric(12,2)                                                                  AS total_cogs,

  (
    COALESCE(oci.collected_amount, o.total_amount, 0)
    - COALESCE(pcogs.total_product_cogs, 0)
    - CASE
        WHEN pkg.has_packaging_rows IS TRUE THEN COALESCE(pkg.total_packaging_cost, 0)
        ELSE 65
      END
    - COALESCE(oci.delivery_charge, 0)
  )::numeric(12,2)                                                                  AS gross_profit,

  CASE
    WHEN COALESCE(oci.collected_amount, o.total_amount, 0) > 0
    THEN ROUND(
      (
        COALESCE(oci.collected_amount, o.total_amount, 0)
        - COALESCE(pcogs.total_product_cogs, 0)
        - CASE
            WHEN pkg.has_packaging_rows IS TRUE THEN COALESCE(pkg.total_packaging_cost, 0)
            ELSE 65
          END
        - COALESCE(oci.delivery_charge, 0)
      ) / COALESCE(oci.collected_amount, o.total_amount, 0) * 100,
      2
    )
    ELSE 0
  END::numeric(12,2)                                                                AS gross_margin_pct

FROM orders o
LEFT JOIN customers          c     ON c.id         = o.customer_id
LEFT JOIN order_courier_info oci   ON oci.order_id = o.id
LEFT JOIN product_cogs       pcogs ON pcogs.order_id = o.id
LEFT JOIN packaging_cost     pkg   ON pkg.order_id  = o.id

WHERE o.payment_status = 'paid'
  AND o.cs_status <> 'cancelled_cbd';


-- ─────────────────────────────────────────────────────────────────────────────
-- Restore order_item_cogs_detail (unchanged)
-- ─────────────────────────────────────────────────────────────────────────────
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
-- 2. New view: order_item_lot_cogs_detail
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
