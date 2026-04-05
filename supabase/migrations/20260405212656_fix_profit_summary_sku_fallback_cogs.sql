/*
  # Fix order_profit_summary: SKU-based fallback COGS for non-picked orders

  ## Summary

  Fixes the COGS calculation for imported orders that were never put through the
  pick operation. These orders often have no product_id on their line items, so
  the previous join on products.id silently dropped them from COGS.

  ## Changes

  ### 1. fallback_cogs_per_item — match by SKU via product_avg_landed_cost
  - Old: JOIN products p ON p.id = oi.product_id  (fails when product_id IS NULL)
  - New: JOIN product_avg_landed_cost palc ON palc.sku = oi.sku
  - product_avg_landed_cost already computes weighted avg across all lots for that
    SKU and falls back to default_landed_cost, so it handles both imported and
    native orders correctly

  ### 2. item_raw_cogs — anchor on order_items, not fallback_cogs_per_item
  - Old: anchored on fallback_cogs_per_item LEFT JOIN picked → missed items with
    no product_id match
  - New: anchored on order_items LEFT JOIN both picked and fallback CTEs; any
    item that matches neither gets COGS of 0 rather than being invisible

  ### 3. CAD status string correction
  - Old: 'cancel_after_dispatch' (wrong, never matched)
  - New: 'cancelled_cad' (actual value in orders.cs_status)

  ## COGS priority after fix
  | Order type              | Source                                          |
  |-------------------------|-------------------------------------------------|
  | Picked orders           | order_picks → inventory_lots.landed_cost_per_unit |
  | Imported / non-picked   | order_items.sku → product_avg_landed_cost       |
*/

DROP VIEW IF EXISTS order_profit_summary;

CREATE VIEW order_profit_summary AS
WITH

-- Step 1a: Per-item COGS from order_picks (FIFO lot cost)
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

-- Step 1b: Per-item fallback COGS via SKU average (covers imported orders
--          where product_id may be NULL)
fallback_cogs_per_item AS (
  SELECT
    oi.id        AS order_item_id,
    oi.order_id,
    oi.quantity * COALESCE(palc.avg_landed_cost, 0) AS item_fallback_cogs
  FROM order_items oi
  JOIN product_avg_landed_cost palc ON palc.sku = oi.sku
),

-- Step 2: Identify which order_item_ids are being returned
returned_order_items AS (
  SELECT DISTINCT ri.order_item_id
  FROM return_items ri
  WHERE ri.order_item_id IS NOT NULL
),

-- Step 3: Compute per-item raw COGS anchored on order_items
--         Pick-based cost wins; SKU-avg fallback used when no picks recorded
item_raw_cogs AS (
  SELECT
    oi.id        AS order_item_id,
    oi.order_id,
    COALESCE(pc.item_picked_cogs, fc.item_fallback_cogs, 0) AS raw_cogs
  FROM order_items oi
  LEFT JOIN picked_cogs_per_item   pc ON pc.order_item_id = oi.id
  LEFT JOIN fallback_cogs_per_item fc ON fc.order_item_id = oi.id
),

-- Step 4: Apply zero-out rules per order status
-- cancelled_cad: all items zeroed (entire parcel returned to seller)
-- exchange_returnable / partial_delivery / reverse_pick: zero only returned items
-- All others: keep COGS as-is
item_adjusted_cogs AS (
  SELECT
    irc.order_id,
    irc.order_item_id,
    CASE
      WHEN o.cs_status = 'cancelled_cad' THEN 0

      WHEN o.cs_status IN ('exchange_returnable', 'partial_delivery', 'reverse_pick')
           AND roi.order_item_id IS NOT NULL THEN 0

      ELSE irc.raw_cogs
    END AS adjusted_item_cogs
  FROM item_raw_cogs irc
  JOIN orders o ON o.id = irc.order_id
  LEFT JOIN returned_order_items roi ON roi.order_item_id = irc.order_item_id
),

-- Step 5: Aggregate adjusted item COGS back to order level
product_cogs AS (
  SELECT
    order_id,
    SUM(adjusted_item_cogs) AS total_product_cogs
  FROM item_adjusted_cogs
  GROUP BY order_id
),

-- Step 6: Packaging cost (packaging consumed regardless of returns)
packaging_cost AS (
  SELECT
    opi.order_id,
    SUM(opi.line_total) AS total_packaging_cost
  FROM order_packaging_items opi
  GROUP BY opi.order_id
)

SELECT
  o.id                                                                              AS order_id,
  o.order_number,
  o.order_date,
  o.cs_status,
  o.payment_status,
  o.fulfillment_status,
  c.full_name                                                                       AS customer_name,

  COALESCE(oci.collected_amount, o.total_amount, 0)::numeric(12,2)                 AS revenue,
  COALESCE(oci.delivery_charge, 0)::numeric(12,2)                                  AS delivery_charge,

  COALESCE(pcogs.total_product_cogs, 0)::numeric(12,2)                             AS product_cogs,
  COALESCE(pkg.total_packaging_cost, 0)::numeric(12,2)                             AS packaging_cost,

  (
    COALESCE(pcogs.total_product_cogs, 0)
    + COALESCE(pkg.total_packaging_cost, 0)
    + COALESCE(oci.delivery_charge, 0)
  )::numeric(12,2)                                                                  AS total_cogs,

  (
    COALESCE(oci.collected_amount, o.total_amount, 0)
    - COALESCE(pcogs.total_product_cogs, 0)
    - COALESCE(pkg.total_packaging_cost, 0)
    - COALESCE(oci.delivery_charge, 0)
  )::numeric(12,2)                                                                  AS gross_profit,

  CASE
    WHEN COALESCE(oci.collected_amount, o.total_amount, 0) > 0
    THEN ROUND(
      (
        COALESCE(oci.collected_amount, o.total_amount, 0)
        - COALESCE(pcogs.total_product_cogs, 0)
        - COALESCE(pkg.total_packaging_cost, 0)
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

WHERE o.payment_status = 'paid';
