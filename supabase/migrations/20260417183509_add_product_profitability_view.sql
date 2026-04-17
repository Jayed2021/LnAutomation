/*
  # Add Product Profitability View

  ## Summary
  Creates a view `product_profitability_items` that aggregates delivered order item
  data for the Product Profitability Report. Only counts items from orders that
  were actually delivered to the customer.

  ## Included Delivery Statuses
  - `delivered` — Full delivery, all items count
  - `partial_delivery` — Items NOT in return_items count (returned items get COGS = 0)
  - `exchange` — The delivered/kept item counts
  - `exchange_returnable` — Only non-returned items count

  ## Columns Returned
  - `order_date` — Date of the order (for date-range filtering)
  - `sku` — Product SKU
  - `product_name` — Product display name
  - `quantity` — Units sold (delivered)
  - `item_revenue` — Revenue from this item (line_total)
  - `adjusted_item_cogs` — COGS using avg landed cost or picked lot cost (0 for returned items)
  - `cs_status` — Order delivery status

  ## Notes
  - Builds on the existing `order_item_cogs_detail` view which already handles COGS
    zeroing for returned/partial items
  - The frontend aggregates by (sku, product_name) for the report table
  - Average landed cost is used as the COGS basis (with fallback to pick-based FIFO)
  - This view intentionally excludes cancelled_cbd (already excluded by the base view)
    and additionally filters to only the four delivered statuses
*/

CREATE OR REPLACE VIEW product_profitability_items AS
SELECT
  oicd.order_date,
  oicd.sku,
  oicd.product_name,
  oicd.quantity,
  oicd.item_revenue,
  oicd.adjusted_item_cogs,
  o.cs_status
FROM order_item_cogs_detail oicd
JOIN orders o ON o.id = oicd.order_id
WHERE o.cs_status IN ('delivered', 'partial_delivery', 'exchange', 'exchange_returnable');
