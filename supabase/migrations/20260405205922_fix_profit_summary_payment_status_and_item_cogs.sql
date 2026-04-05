/*
  # Fix order_profit_summary: Payment Status Revenue Gate + Per-Item COGS Zero-Out

  ## Summary

  Rebuilds the `order_profit_summary` view with two key logic changes:

  ### 1. Revenue Gate: Payment Status (was Order Status)
  - Previously only orders with specific cs_status values (delivered, cad, etc.) were included
  - Now the filter is: `o.payment_status = 'paid'`
  - Any order of any status is included IF it has been marked as paid
  - Revenue = collected_amount from order_courier_info (falls back to total_amount)

  ### 2. Product COGS: Per-Item Zero-Out Based on Order Status
  - COGS is now calculated at the order_item level, not order level
  - This allows specific line items to be zeroed out based on returns
  
  Zero-out rules by cs_status:
  - `cancel_after_dispatch` (CAD): ALL items zeroed — entire parcel returned to seller
  - `exchange_returnable` (EXR): Only items present in return_items are zeroed
  - `partial_delivery`: Only items present in return_items are zeroed
  - `reverse_pick`: Only items present in return_items are zeroed
  - All other statuses (delivered, exchange, refund, etc.): Full COGS applied

  ### 3. COGS Sources (unchanged)
  - Primary: FIFO-matched lot cost via order_picks (picked_cogs)
  - Fallback: product.default_landed_cost when no picks recorded (fallback_cogs)
  - Packaging: stored line_total on order_packaging_items (unchanged)

  ## Important Notes
  - CAD orders that are paid (collected amount > 0) will appear in P&L with revenue but zero product COGS
  - EXR/partial orders: returned items have zero COGS, kept items retain their COGS
  - delivery_charge is still included in total_cogs as a cost
  - packaging_cost is NOT zeroed for any return scenario (packaging was consumed)
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

-- Step 1b: Per-item fallback COGS (default_landed_cost, for items with no picks)
fallback_cogs_per_item AS (
  SELECT
    oi.id AS order_item_id,
    oi.order_id,
    oi.quantity * COALESCE(p.default_landed_cost, 0) AS item_fallback_cogs
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  WHERE p.product_type = 'saleable_goods'
),

-- Step 2: Identify which order_item_ids are being returned
-- (covers EXR, partial_delivery, reverse_pick — any return record)
returned_order_items AS (
  SELECT DISTINCT ri.order_item_id
  FROM return_items ri
  WHERE ri.order_item_id IS NOT NULL
),

-- Step 3: Compute per-item raw COGS (pick-based or fallback)
item_raw_cogs AS (
  SELECT
    COALESCE(pc.order_item_id, fc.order_item_id) AS order_item_id,
    COALESCE(pc.order_id, fc.order_id)           AS order_id,
    COALESCE(pc.item_picked_cogs, fc.item_fallback_cogs, 0) AS raw_cogs
  FROM fallback_cogs_per_item fc
  LEFT JOIN picked_cogs_per_item pc ON pc.order_item_id = fc.order_item_id
),

-- Step 4: Apply zero-out rules per order status
-- CAD: all items zeroed
-- EXR / partial_delivery / reverse_pick: zero only returned items
-- All others: keep COGS as-is
item_adjusted_cogs AS (
  SELECT
    irc.order_id,
    irc.order_item_id,
    CASE
      -- CAD: entire order returned, zero all product COGS
      WHEN o.cs_status = 'cancel_after_dispatch' THEN 0

      -- EXR / partial / reverse pick: zero only the returned items
      WHEN o.cs_status IN ('exchange_returnable', 'partial_delivery', 'reverse_pick')
           AND roi.order_item_id IS NOT NULL THEN 0

      -- Everything else: full COGS
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

-- Step 6: Packaging cost (unchanged — packaging consumed regardless of returns)
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

  -- Revenue: collected_amount if available, else total_amount
  COALESCE(oci.collected_amount, o.total_amount, 0)::numeric(12,2)                 AS revenue,
  COALESCE(oci.delivery_charge, 0)::numeric(12,2)                                  AS delivery_charge,

  -- Product COGS: per-item adjusted for return status
  COALESCE(pcogs.total_product_cogs, 0)::numeric(12,2)                             AS product_cogs,

  -- Packaging cost
  COALESCE(pkg.total_packaging_cost, 0)::numeric(12,2)                             AS packaging_cost,

  -- Total COGS = product + packaging + delivery
  (
    COALESCE(pcogs.total_product_cogs, 0)
    + COALESCE(pkg.total_packaging_cost, 0)
    + COALESCE(oci.delivery_charge, 0)
  )::numeric(12,2)                                                                  AS total_cogs,

  -- Gross profit
  (
    COALESCE(oci.collected_amount, o.total_amount, 0)
    - COALESCE(pcogs.total_product_cogs, 0)
    - COALESCE(pkg.total_packaging_cost, 0)
    - COALESCE(oci.delivery_charge, 0)
  )::numeric(12,2)                                                                  AS gross_profit,

  -- Gross margin %
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

-- Gate: only include orders where payment has been collected
WHERE o.payment_status = 'paid';
