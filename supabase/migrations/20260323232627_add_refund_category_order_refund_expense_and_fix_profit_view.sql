/*
  # Add Refund Expense Category, Order Refund Expense Link, and Fix Profit Summary View

  ## Summary

  ### 1. New Expense Category: Refund
  - Inserts a "Refund" category into `expense_categories`.

  ### 2. New Column on Orders: order_refund_expense_id
  - Adds `order_refund_expense_id` (uuid, nullable, FK to expenses) to the `orders` table.

  ### 3. Rebuild order_profit_summary View
  - Drops and recreates with: collected_amount as revenue, final-status filter only,
    delivery_charge added as a cost deduction.

  ## Notes
  - Must DROP the view first to allow column type changes.
*/

-- 1. Add "Refund" expense category
INSERT INTO expense_categories (name, is_active)
SELECT 'Refund', true
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Refund');

-- 2. Add order_refund_expense_id to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_refund_expense_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_refund_expense_id uuid REFERENCES expenses(id);
  END IF;
END $$;

-- 3. Drop and recreate order_profit_summary view
DROP VIEW IF EXISTS order_profit_summary;

CREATE VIEW order_profit_summary AS
WITH

picked_cogs AS (
  SELECT
    oi.order_id,
    SUM(op.quantity * il.landed_cost_per_unit) AS total_picked_cogs
  FROM order_picks op
  JOIN order_items oi ON oi.id = op.order_item_id
  JOIN inventory_lots il ON il.id = op.lot_id
  GROUP BY oi.order_id
),

fallback_cogs AS (
  SELECT
    oi.order_id,
    SUM(oi.quantity * COALESCE(p.default_landed_cost, 0)) AS total_fallback_cogs
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  WHERE p.product_type = 'saleable_goods'
  GROUP BY oi.order_id
),

packaging_cost AS (
  SELECT
    opi.order_id,
    SUM(opi.line_total) AS total_packaging_cost
  FROM order_packaging_items opi
  GROUP BY opi.order_id
)

SELECT
  o.id                                                                        AS order_id,
  o.order_number,
  o.order_date,
  o.cs_status,
  o.fulfillment_status,
  c.full_name                                                                 AS customer_name,

  COALESCE(oci.collected_amount, o.total_amount, 0)::numeric(12,2)           AS revenue,
  COALESCE(oci.delivery_charge, 0)::numeric(12,2)                            AS delivery_charge,
  COALESCE(pc.total_picked_cogs, fc.total_fallback_cogs, 0)::numeric(12,2)   AS product_cogs,
  COALESCE(pkg.total_packaging_cost, 0)::numeric(12,2)                       AS packaging_cost,

  (
    COALESCE(pc.total_picked_cogs, fc.total_fallback_cogs, 0)
    + COALESCE(pkg.total_packaging_cost, 0)
    + COALESCE(oci.delivery_charge, 0)
  )::numeric(12,2)                                                            AS total_cogs,

  (
    COALESCE(oci.collected_amount, o.total_amount, 0)
    - COALESCE(pc.total_picked_cogs, fc.total_fallback_cogs, 0)
    - COALESCE(pkg.total_packaging_cost, 0)
    - COALESCE(oci.delivery_charge, 0)
  )::numeric(12,2)                                                            AS gross_profit,

  CASE
    WHEN COALESCE(oci.collected_amount, o.total_amount, 0) > 0
    THEN ROUND(
      (
        COALESCE(oci.collected_amount, o.total_amount, 0)
        - COALESCE(pc.total_picked_cogs, fc.total_fallback_cogs, 0)
        - COALESCE(pkg.total_packaging_cost, 0)
        - COALESCE(oci.delivery_charge, 0)
      ) / COALESCE(oci.collected_amount, o.total_amount, 0) * 100,
      2
    )
    ELSE 0
  END::numeric(12,2)                                                          AS gross_margin_pct

FROM orders o
LEFT JOIN customers           c   ON c.id          = o.customer_id
LEFT JOIN order_courier_info  oci ON oci.order_id  = o.id
LEFT JOIN picked_cogs         pc  ON pc.order_id   = o.id
LEFT JOIN fallback_cogs       fc  ON fc.order_id   = o.id
LEFT JOIN packaging_cost      pkg ON pkg.order_id  = o.id
WHERE o.cs_status IN (
  'delivered',
  'exchange',
  'partial_delivery',
  'cancel_after_dispatch',
  'refund',
  'exchange_returnable'
);
