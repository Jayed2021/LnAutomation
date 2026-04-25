
/*
  # Add get_reorder_signals Function

  ## Purpose
  Returns reorder recommendation signals for all products belonging to a given supplier.
  Used by the Create Purchase Order page to show velocity-based "Recommended" badges.

  ## Logic
  - current_stock: sum of remaining_quantity from inventory_lots (non-damaged locations)
  - avg_daily_sales: units sold (stock_movements type='sale') over the last 60 days / 60
  - days_of_stock_left: current_stock / avg_daily_sales (NULL if no sales data)
  - is_recommended:
      * If velocity data exists: days_of_stock_left < 45 (hardcoded lead-time placeholder)
      * If no velocity data (fewer than 14 days of any sales): falls back to stock <= low_stock_threshold
  - recommendation_reason: human-readable explanation for tooltip display

  ## Notes
  - 45-day threshold is a placeholder to be replaced when supplier lead_time_days feature is built
  - Only considers active inventory lots (excludes damaged/quarantine locations)
  - Products with no sales history in last 60 days are treated as "sparse data" and use threshold fallback
*/

CREATE OR REPLACE FUNCTION get_reorder_signals(p_supplier_id uuid)
RETURNS TABLE (
  product_id        uuid,
  current_stock     integer,
  avg_daily_sales   numeric,
  days_of_stock_left numeric,
  is_recommended    boolean,
  recommendation_reason text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH

  -- All products linked to this supplier via supplier_catalog
  supplier_products AS (
    SELECT DISTINCT sc.product_id
    FROM supplier_catalogs sc
    WHERE sc.supplier_id = p_supplier_id
  ),

  -- Current stock per product (sum across all non-damaged lots)
  stock AS (
    SELECT
      il.product_id,
      COALESCE(SUM(il.remaining_quantity), 0)::integer AS current_stock
    FROM inventory_lots il
    WHERE il.product_id IN (SELECT sp.product_id FROM supplier_products sp)
      AND il.remaining_quantity > 0
    GROUP BY il.product_id
  ),

  -- Sales velocity: total units sold in last 60 days
  sales AS (
    SELECT
      sm.product_id,
      COUNT(*) FILTER (WHERE sm.created_at >= NOW() - INTERVAL '60 days') AS sale_movements_60d,
      COALESCE(SUM(sm.quantity) FILTER (WHERE sm.created_at >= NOW() - INTERVAL '60 days'), 0) AS units_sold_60d
    FROM stock_movements sm
    WHERE sm.movement_type = 'sale'
      AND sm.product_id IN (SELECT sp.product_id FROM supplier_products sp)
    GROUP BY sm.product_id
  ),

  -- Product base info for threshold fallback
  prod AS (
    SELECT p.id, p.low_stock_threshold
    FROM products p
    WHERE p.id IN (SELECT sp.product_id FROM supplier_products sp)
  )

  SELECT
    prod.id AS product_id,

    -- Current stock (0 if no lots)
    COALESCE(stock.current_stock, 0) AS current_stock,

    -- Avg daily sales (NULL if no sales data)
    CASE
      WHEN COALESCE(sales.units_sold_60d, 0) = 0 THEN NULL
      ELSE ROUND(sales.units_sold_60d::numeric / 60.0, 2)
    END AS avg_daily_sales,

    -- Days of stock left (NULL if no velocity data)
    CASE
      WHEN COALESCE(sales.units_sold_60d, 0) = 0 THEN NULL
      ELSE ROUND(
        COALESCE(stock.current_stock, 0)::numeric
        / (sales.units_sold_60d::numeric / 60.0),
        1
      )
    END AS days_of_stock_left,

    -- is_recommended
    CASE
      -- Has velocity data: recommend if days_of_stock_left < 45
      WHEN COALESCE(sales.units_sold_60d, 0) > 0
        AND ROUND(
          COALESCE(stock.current_stock, 0)::numeric
          / (sales.units_sold_60d::numeric / 60.0),
          1
        ) < 45
      THEN true
      -- No velocity data: fallback to threshold
      WHEN COALESCE(sales.units_sold_60d, 0) = 0
        AND COALESCE(stock.current_stock, 0) <= COALESCE(prod.low_stock_threshold, 20)
      THEN true
      ELSE false
    END AS is_recommended,

    -- Human-readable reason for tooltip
    CASE
      WHEN COALESCE(sales.units_sold_60d, 0) > 0 THEN
        '~' || ROUND(
          COALESCE(stock.current_stock, 0)::numeric
          / (sales.units_sold_60d::numeric / 60.0),
          0
        )::text || ' days of stock left at current sales pace ('
        || ROUND(sales.units_sold_60d::numeric / 60.0, 1)::text
        || ' units/day avg)'
      ELSE
        'Below minimum stock threshold (no recent sales data)'
    END AS recommendation_reason

  FROM prod
  LEFT JOIN stock ON stock.product_id = prod.id
  LEFT JOIN sales ON sales.product_id = prod.id;
END;
$$;
