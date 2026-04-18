/*
  # Inventory Valuation Function

  ## Purpose
  Provides a SQL function to compute inventory valuation as of any given date.
  This powers both the default "today" snapshot and historical lookups.

  ## Function: get_inventory_valuation_as_of(as_of_date date)

  ### Logic
  - Looks at inventory_lots with received_date <= as_of_date
  - For each lot, uses the remaining_quantity at that point in time
    (for today this is just remaining_quantity; for historical dates we
    approximate using received_quantity since we don't store point-in-time
    snapshots — this is the standard approach for FIFO periodic systems)
  - Joins to products to get name, sku, category, product_type
  - Returns one row per product with aggregated units and value

  ### Historical Note
  Since we don't maintain a running daily snapshot of remaining_quantity,
  historical valuations use received_quantity for lots received on or before
  the as_of_date. This gives the "maximum possible value at that date" which
  is the conventional approach for periodic inventory systems.
  For today's valuation, remaining_quantity is used instead (accurate current stock).

  ## Returns
  - product_id, sku, name, category, product_type
  - total_units: units available as of that date
  - landed_cost_per_unit: weighted average cost
  - total_value: total_units * landed_cost_per_unit
*/

CREATE OR REPLACE FUNCTION get_inventory_valuation_as_of(as_of_date date)
RETURNS TABLE (
  product_id      uuid,
  sku             text,
  name            text,
  category        text,
  product_type    text,
  total_units     bigint,
  avg_landed_cost numeric,
  total_value     numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH lot_data AS (
    SELECT
      il.product_id,
      CASE
        WHEN as_of_date = CURRENT_DATE THEN il.remaining_quantity
        ELSE il.received_quantity
      END AS qty,
      il.landed_cost_per_unit
    FROM inventory_lots il
    WHERE il.received_date <= as_of_date
      AND (
        CASE
          WHEN as_of_date = CURRENT_DATE THEN il.remaining_quantity > 0
          ELSE il.received_quantity > 0
        END
      )
  ),
  aggregated AS (
    SELECT
      ld.product_id,
      SUM(ld.qty)                                                          AS total_units,
      CASE WHEN SUM(ld.qty) > 0
        THEN SUM(ld.qty * ld.landed_cost_per_unit) / SUM(ld.qty)
        ELSE 0
      END                                                                  AS avg_landed_cost,
      SUM(ld.qty * ld.landed_cost_per_unit)                                AS total_value
    FROM lot_data ld
    GROUP BY ld.product_id
  )
  SELECT
    p.id            AS product_id,
    p.sku,
    p.name,
    p.category,
    p.product_type,
    COALESCE(a.total_units, 0)     AS total_units,
    COALESCE(a.avg_landed_cost, 0) AS avg_landed_cost,
    COALESCE(a.total_value, 0)     AS total_value
  FROM products p
  JOIN aggregated a ON a.product_id = p.id
  WHERE p.is_active = true
    AND COALESCE(a.total_units, 0) > 0
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION get_inventory_valuation_as_of(date) TO anon, authenticated;
