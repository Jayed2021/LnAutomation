/*
  # Fix LN_PKG_02 (Plastic Box) default cost and backfill packaging items

  ## Summary

  LN_PKG_02 (Plastic Box) had no default_landed_cost set, causing it to contribute
  zero cost to packaging calculations. The correct unit cost is BDT 17.

  ## Changes

  ### 1. Set default_landed_cost on LN_PKG_02 product
  - Sets default_landed_cost = 17 on the products record for SKU LN_PKG_02
  - This ensures product_avg_landed_cost view will use 17 as fallback going forward

  ### 2. Backfill existing order_packaging_items rows
  - Any existing rows for LN_PKG_02 with unit_cost = 0 are updated to unit_cost = 17
  - line_total is recalculated as quantity * 17
*/

UPDATE products
SET default_landed_cost = 17
WHERE sku = 'LN_PKG_02'
  AND (default_landed_cost IS NULL OR default_landed_cost = 0);

UPDATE order_packaging_items
SET
  unit_cost  = 17,
  line_total = quantity * 17
WHERE sku = 'LN_PKG_02'
  AND (unit_cost IS NULL OR unit_cost = 0);
