/*
  # Replace order_profit_summary view

  ## Summary

  Complete replacement of the order_profit_summary view to fix three issues:

  ## Changes

  ### 1. Exclude CBD orders entirely
  - CBD orders (cs_status = 'cancelled_cbd') are sometimes incorrectly marked as
    paid due to a system bug or user error.
  - These orders must be fully excluded from ALL profit calculations.
  - Added: WHERE ... AND o.cs_status <> 'cancelled_cbd'

  ### 2. Fix packaging cost for CAD and partial-return orders
  - cancelled_cad orders: packaging cost zeroed (goods returned to seller)
  - exchange_returnable / partial_delivery / reverse_pick: zero packaging cost
    only for items whose source_order_item_id is in the returned set; packaging
    rows with NULL source_order_item_id (order-level packaging) keep their cost
  - All other statuses: full packaging cost as before

  ### 3. Add fallback packaging cost of BDT 65 for orders with no packaging records
  - If an order has no rows in order_packaging_items, COALESCE returns 0 today.
  - New logic: treat NULL total as 65 (default box cost) for paid non-CBD orders.
  - Uses NULLIF trick: if SUM is 0 or NULL, fall back to 65.

  ### 4. Expose additional fields for UI
  - Added: o.woo_order_id
  - Added: c.phone_primary AS customer_phone
  - Added: o.order_type

  ### 5. Expose item-level COGS as a separate view: order_item_cogs_detail
  - New view exposes per-item adjusted COGS alongside SKU/name/quantity
  - Used by the frontend accordion COGS breakdown

  ## New Tables/Views
  - order_item_cogs_detail (view): per-item COGS data for the P&L breakdown table

  ## Modified Views
  - order_profit_summary: all fixes above
*/

-- Drop dependent views first
DROP VIEW IF EXISTS order_item_cogs_detail;
DROP VIEW IF EXISTS order_profit_summary;

-- ─────────────────────────────────────────────────────────────────────────────
-- Main P&L summary view
-- ─────────────────────────────────────────────────────────────────────────────
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

-- Packaging cost with status-based zero-out rules
packaging_cost AS (
  SELECT
    opi.order_id,
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

  -- Packaging: use recorded cost, fall back to 65 if no packaging items recorded
  COALESCE(NULLIF(pkg.total_packaging_cost, 0), 65)::numeric(12,2)                 AS packaging_cost,

  (
    COALESCE(pcogs.total_product_cogs, 0)
    + COALESCE(NULLIF(pkg.total_packaging_cost, 0), 65)
    + COALESCE(oci.delivery_charge, 0)
  )::numeric(12,2)                                                                  AS total_cogs,

  (
    COALESCE(oci.collected_amount, o.total_amount, 0)
    - COALESCE(pcogs.total_product_cogs, 0)
    - COALESCE(NULLIF(pkg.total_packaging_cost, 0), 65)
    - COALESCE(oci.delivery_charge, 0)
  )::numeric(12,2)                                                                  AS gross_profit,

  CASE
    WHEN COALESCE(oci.collected_amount, o.total_amount, 0) > 0
    THEN ROUND(
      (
        COALESCE(oci.collected_amount, o.total_amount, 0)
        - COALESCE(pcogs.total_product_cogs, 0)
        - COALESCE(NULLIF(pkg.total_packaging_cost, 0), 65)
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
-- Item-level COGS detail view (for accordion breakdown in P&L table)
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
