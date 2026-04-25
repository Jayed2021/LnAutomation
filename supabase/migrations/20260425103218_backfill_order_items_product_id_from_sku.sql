/*
  # Backfill order_items.product_id from products table via SKU

  ## Problem
  The WooCommerce webhook inserts order items with product_id = null when the SKU
  lookup fails or the product does not yet exist at webhook time. This causes:
  - The reservation display in OrderItemsCard to be hidden (it was gated on product_id)
  - The pick modal to skip the reservation lookup path and show "No stock available"

  ## Changes
  - Sets product_id on all order_items rows where product_id IS NULL but a matching
    product exists in the products table by SKU
  - Skips FEE and RX pseudo-SKUs that have no product record
  - Safe to run multiple times (only touches null rows)
*/

UPDATE order_items oi
SET product_id = p.id
FROM products p
WHERE p.sku = oi.sku
  AND oi.product_id IS NULL
  AND oi.sku NOT IN ('FEE', 'RX')
  AND oi.sku NOT LIKE 'FEE%';
