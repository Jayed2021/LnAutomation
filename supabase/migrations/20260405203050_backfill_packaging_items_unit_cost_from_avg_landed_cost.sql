/*
  # Backfill order_packaging_items unit_cost and line_total

  ## Summary
  Fixes all existing order_packaging_items rows where unit_cost is zero by
  populating them with the product's weighted average landed cost from the
  product_avg_landed_cost view.

  ## Problem
  When packaging items were auto-inserted (via WooCommerce sync or manual add),
  unit_cost was pulled from selling_price, which is NULL for packaging material
  products. This caused all line_totals to be 0, making packaging cost invisible
  in the P&L report.

  ## Changes
  1. UPDATE order_packaging_items
     - Sets unit_cost = avg_landed_cost from product_avg_landed_cost view
     - Sets line_total = quantity * avg_landed_cost
     - Only for rows where product_id IS NOT NULL and avg_landed_cost > 0

  ## Safety
  - Non-destructive: only updates rows with product_id and non-zero avg cost
  - Rows with NULL product_id are left untouched (cannot be resolved)
  - Rows already having a non-zero unit_cost are left untouched
*/

UPDATE order_packaging_items opi
SET
  unit_cost = calc.avg_landed_cost,
  line_total = opi.quantity * calc.avg_landed_cost
FROM product_avg_landed_cost calc
WHERE opi.product_id = calc.product_id
  AND calc.avg_landed_cost > 0
  AND opi.unit_cost = 0;
