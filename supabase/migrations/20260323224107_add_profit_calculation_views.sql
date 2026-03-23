/*
  # Add Profit Calculation Views

  ## Summary
  Creates two database views to support order profit analysis:

  1. **product_avg_landed_cost** view
     - Computes weighted average landed cost per product across all inventory lots
     - Weighted by (remaining_quantity + historically consumed quantity via order_picks)
     - Falls back to `products.default_landed_cost` when no lots exist
     - Covers all product types (saleable_goods and packaging_material)

  2. **order_profit_summary** view
     - Joins orders, order_items, order_picks, inventory_lots, and order_packaging_items
     - Per-order output: revenue, product_cogs, packaging_cost, total_cogs, gross_profit, gross_margin_pct
     - Product COGS: uses FIFO-matched lot landed_cost_per_unit via order_picks;
       falls back to products.default_landed_cost for orders with no picks yet
     - Packaging COGS: uses stored line_total on order_packaging_items (captured at order creation)
     - Excludes orders with cs_status = 'cancelled'
     - Joins customers table for customer_name display

  ## Notes
  - Views inherit RLS from underlying tables
  - Access controlled at application layer (admin-only route)
  - No destructive changes to existing tables
*/

-- ============================================================
-- View 1: product_avg_landed_cost
-- Weighted average landed cost per product across all lots.
-- Includes both remaining and consumed (picked) quantities
-- to reflect true average cost across the product's history.
-- Falls back to default_landed_cost on the products table.
-- ============================================================
CREATE OR REPLACE VIEW product_avg_landed_cost AS
SELECT
  p.id AS product_id,
  p.sku,
  p.name,
  p.product_type,
  COALESCE(
    CASE
      WHEN SUM(il.remaining_quantity + COALESCE(consumed.consumed_qty, 0)) > 0
      THEN SUM(il.landed_cost_per_unit * (il.remaining_quantity + COALESCE(consumed.consumed_qty, 0)))
           / SUM(il.remaining_quantity + COALESCE(consumed.consumed_qty, 0))
      ELSE NULL
    END,
    p.default_landed_cost,
    0
  )::numeric(12, 4) AS avg_landed_cost
FROM products p
LEFT JOIN inventory_lots il ON il.product_id = p.id
LEFT JOIN LATERAL (
  SELECT op.lot_id, SUM(op.quantity) AS consumed_qty
  FROM order_picks op
  WHERE op.lot_id = il.id
  GROUP BY op.lot_id
) consumed ON true
GROUP BY p.id, p.sku, p.name, p.product_type, p.default_landed_cost;

-- ============================================================
-- View 2: order_profit_summary
-- Per-order profit calculation with FIFO lot COGS for products
-- and stored line_total for packaging materials.
-- ============================================================
CREATE OR REPLACE VIEW order_profit_summary AS
WITH

-- Step 1: COGS from order_picks (FIFO-matched lot costs for saleable goods)
picked_cogs AS (
  SELECT
    oi.order_id,
    SUM(op.quantity * il.landed_cost_per_unit) AS total_picked_cogs
  FROM order_picks op
  JOIN order_items oi ON oi.id = op.order_item_id
  JOIN inventory_lots il ON il.id = op.lot_id
  GROUP BY oi.order_id
),

-- Step 2: Fallback COGS for orders with no picks (use default_landed_cost on product)
fallback_cogs AS (
  SELECT
    oi.order_id,
    SUM(oi.quantity * COALESCE(p.default_landed_cost, 0)) AS total_fallback_cogs
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  WHERE p.product_type = 'saleable_goods'
  GROUP BY oi.order_id
),

-- Step 3: Packaging cost from order_packaging_items
-- Uses stored line_total (unit_cost * qty as recorded at order creation)
packaging_cost AS (
  SELECT
    opi.order_id,
    SUM(opi.line_total) AS total_packaging_cost
  FROM order_packaging_items opi
  GROUP BY opi.order_id
)

SELECT
  o.id                                                          AS order_id,
  o.order_number,
  o.order_date,
  o.cs_status,
  o.fulfillment_status,
  c.full_name                                                   AS customer_name,
  o.total_amount                                                AS revenue,

  -- Product COGS: prefer FIFO-picked lot cost, fallback to default_landed_cost
  COALESCE(pc.total_picked_cogs, fc.total_fallback_cogs, 0)   AS product_cogs,

  -- Packaging cost
  COALESCE(pkg.total_packaging_cost, 0)                        AS packaging_cost,

  -- Total COGS
  COALESCE(pc.total_picked_cogs, fc.total_fallback_cogs, 0)
    + COALESCE(pkg.total_packaging_cost, 0)                    AS total_cogs,

  -- Gross profit
  o.total_amount
    - COALESCE(pc.total_picked_cogs, fc.total_fallback_cogs, 0)
    - COALESCE(pkg.total_packaging_cost, 0)                    AS gross_profit,

  -- Gross margin percentage (null-safe)
  CASE
    WHEN o.total_amount > 0
    THEN ROUND(
      (
        o.total_amount
          - COALESCE(pc.total_picked_cogs, fc.total_fallback_cogs, 0)
          - COALESCE(pkg.total_packaging_cost, 0)
      ) / o.total_amount * 100,
      2
    )
    ELSE 0
  END                                                           AS gross_margin_pct

FROM orders o
LEFT JOIN customers      c   ON c.id          = o.customer_id
LEFT JOIN picked_cogs    pc  ON pc.order_id   = o.id
LEFT JOIN fallback_cogs  fc  ON fc.order_id   = o.id
LEFT JOIN packaging_cost pkg ON pkg.order_id  = o.id
WHERE o.cs_status != 'cancelled';
