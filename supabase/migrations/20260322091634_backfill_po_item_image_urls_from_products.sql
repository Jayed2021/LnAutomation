/*
  # Backfill PO Item Image Snapshots

  ## Purpose
  After the product image migration moves all external image URLs into Supabase storage,
  existing purchase_order_items rows still hold the old external URLs in their
  product_image_url snapshot column. This migration updates those rows so they point
  to the current (Supabase-hosted) image URL from the products table.

  ## Changes
  - Updates `purchase_order_items.product_image_url` for any row whose current value
    is a non-Supabase URL, by joining on `sku` to the `products` table and copying
    the product's current `image_url` if that value IS a Supabase URL.

  ## Notes
  - Only updates rows where the snapshot still has an external URL (not containing 'supabase')
  - Only copies the product's image_url if it has already been migrated to Supabase storage
  - Safe to run multiple times (idempotent)
  - Does not touch rows that already have Supabase URLs or NULL values
*/

UPDATE purchase_order_items poi
SET product_image_url = p.image_url
FROM products p
WHERE poi.sku = p.sku
  AND poi.product_image_url IS NOT NULL
  AND poi.product_image_url NOT LIKE '%supabase%'
  AND p.image_url IS NOT NULL
  AND p.image_url LIKE '%supabase%';
