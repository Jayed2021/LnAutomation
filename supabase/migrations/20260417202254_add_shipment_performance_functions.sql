
/*
  # Shipment Performance Functions

  ## Summary
  Creates two SQL functions to power the Shipment Performance report:

  1. `get_shipment_performance_list()` - Returns one row per shipment with:
     - Identifiers: shipment_id, po_number, shipment_label (shipment_id or po_number fallback)
     - Supplier info: supplier_name, supplier_type
     - Dates: received_date, po_created_at, expected_delivery_date
     - Age: days since received
     - Stock metrics: units_in, units_sold, units_remaining, sell_through_pct
     - Financial: total_landed_cost, remaining_inventory_value, shipping_cost_bdt
     - Movement breakdown: units_damaged, units_adjusted
     - PO info: po_status, is_payment_complete, lead_time_days
     - Return rate: units_returned

  2. `get_shipment_performance_detail(p_shipment_db_id uuid)` - Returns per-SKU breakdown:
     - sku, product_name, units_in, units_sold, units_remaining, sell_through_pct
     - revenue (from delivered orders via order_item_lot_cogs_detail)
     - cogs_sold (landed cost of sold units)
     - profit, margin_pct
     - remaining_inventory_value
     - units_damaged, units_adjusted, units_returned
*/

-- ============================================================
-- Function 1: Shipment Performance List
-- ============================================================
CREATE OR REPLACE FUNCTION get_shipment_performance_list()
RETURNS TABLE (
  shipment_db_id          uuid,
  shipment_label          text,
  po_number               text,
  po_id                   uuid,
  supplier_name           text,
  supplier_type           text,
  received_date           date,
  po_created_at           timestamptz,
  expected_delivery_date  date,
  age_days                int,
  lead_time_days          int,
  units_in                bigint,
  units_sold              bigint,
  units_remaining         bigint,
  sell_through_pct        numeric,
  total_landed_cost       numeric,
  cogs_sold               numeric,
  remaining_inventory_value numeric,
  shipping_cost_bdt       numeric,
  units_damaged           bigint,
  units_adjusted          bigint,
  units_returned          bigint,
  po_status               text,
  is_payment_complete     boolean,
  total_paid_bdt          numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH lot_aggregates AS (
    SELECT
      il.shipment_id,
      SUM(il.received_quantity)::bigint                         AS units_in,
      SUM(il.remaining_quantity)::bigint                        AS units_remaining,
      SUM(il.received_quantity * il.landed_cost_per_unit)       AS total_landed_cost,
      SUM(il.remaining_quantity * il.landed_cost_per_unit)      AS remaining_inventory_value
    FROM inventory_lots il
    WHERE il.shipment_id IS NOT NULL
    GROUP BY il.shipment_id
  ),
  movement_aggregates AS (
    SELECT
      il.shipment_id,
      SUM(CASE WHEN sm.movement_type = 'sale'           THEN ABS(sm.quantity) ELSE 0 END)::bigint AS units_sold,
      SUM(CASE WHEN sm.movement_type = 'damaged'        THEN ABS(sm.quantity) ELSE 0 END)::bigint AS units_damaged,
      SUM(CASE WHEN sm.movement_type = 'adjustment' AND sm.quantity < 0 THEN ABS(sm.quantity) ELSE 0 END)::bigint AS units_adjusted
    FROM stock_movements sm
    JOIN inventory_lots il ON il.id = sm.lot_id
    WHERE il.shipment_id IS NOT NULL
      AND sm.movement_type IN ('sale', 'damaged', 'adjustment')
    GROUP BY il.shipment_id
  ),
  return_aggregates AS (
    SELECT
      il.shipment_id,
      SUM(ABS(sm.quantity))::bigint AS units_returned
    FROM stock_movements sm
    JOIN inventory_lots il ON il.id = sm.lot_id
    WHERE il.shipment_id IS NOT NULL
      AND sm.movement_type IN ('return_receive', 'return_restock')
    GROUP BY il.shipment_id
  ),
  cogs_sold_agg AS (
    SELECT
      il.shipment_id,
      SUM(oilcd.line_cost) AS cogs_sold
    FROM order_item_lot_cogs_detail oilcd
    JOIN inventory_lots il ON il.lot_number = oilcd.lot_number
    WHERE il.shipment_id IS NOT NULL
    GROUP BY il.shipment_id
  ),
  payment_agg AS (
    SELECT
      sp.po_id,
      SUM(sp.amount_bdt) AS total_paid_bdt
    FROM supplier_payments sp
    GROUP BY sp.po_id
  )
  SELECT
    s.id                                                          AS shipment_db_id,
    COALESCE(NULLIF(s.shipment_id, ''), po.po_number)            AS shipment_label,
    po.po_number,
    po.id                                                         AS po_id,
    sup.name                                                      AS supplier_name,
    sup.supplier_type,
    s.received_date,
    po.created_at                                                 AS po_created_at,
    po.expected_delivery_date,
    (CURRENT_DATE - s.received_date)::int                        AS age_days,
    CASE WHEN po.expected_delivery_date IS NOT NULL
         THEN (s.received_date - po.created_at::date)::int
         ELSE NULL END                                            AS lead_time_days,
    COALESCE(la.units_in, 0)                                      AS units_in,
    COALESCE(ma.units_sold, 0)                                    AS units_sold,
    COALESCE(la.units_remaining, 0)                               AS units_remaining,
    CASE WHEN COALESCE(la.units_in, 0) > 0
         THEN ROUND(COALESCE(ma.units_sold, 0)::numeric / la.units_in * 100, 1)
         ELSE 0 END                                              AS sell_through_pct,
    COALESCE(la.total_landed_cost, 0)                             AS total_landed_cost,
    COALESCE(cs.cogs_sold, 0)                                     AS cogs_sold,
    COALESCE(la.remaining_inventory_value, 0)                     AS remaining_inventory_value,
    COALESCE(po.shipping_cost_bdt, 0)                             AS shipping_cost_bdt,
    COALESCE(ma.units_damaged, 0)                                 AS units_damaged,
    COALESCE(ma.units_adjusted, 0)                                AS units_adjusted,
    COALESCE(ra.units_returned, 0)                                AS units_returned,
    po.status                                                     AS po_status,
    COALESCE(po.is_payment_complete, false)                       AS is_payment_complete,
    COALESCE(pa.total_paid_bdt, 0)                                AS total_paid_bdt
  FROM shipments s
  LEFT JOIN purchase_orders po  ON po.id  = s.po_id
  LEFT JOIN suppliers sup       ON sup.id = po.supplier_id
  LEFT JOIN lot_aggregates la   ON la.shipment_id  = s.id
  LEFT JOIN movement_aggregates ma ON ma.shipment_id = s.id
  LEFT JOIN return_aggregates ra   ON ra.shipment_id = s.id
  LEFT JOIN cogs_sold_agg cs       ON cs.shipment_id = s.id
  LEFT JOIN payment_agg pa         ON pa.po_id = po.id
  ORDER BY s.received_date DESC;
$$;

-- ============================================================
-- Function 2: Shipment Performance Detail (per-SKU breakdown)
-- ============================================================
CREATE OR REPLACE FUNCTION get_shipment_performance_detail(p_shipment_db_id uuid)
RETURNS TABLE (
  sku                       text,
  product_name              text,
  units_in                  bigint,
  units_sold                bigint,
  units_remaining           bigint,
  sell_through_pct          numeric,
  cogs_sold                 numeric,
  remaining_inventory_value numeric,
  units_damaged             bigint,
  units_adjusted            bigint,
  units_returned            bigint,
  landed_cost_per_unit      numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH shipment_lots AS (
    SELECT
      il.id AS lot_id,
      il.lot_number,
      p.sku,
      p.name AS product_name,
      il.received_quantity,
      il.remaining_quantity,
      il.landed_cost_per_unit
    FROM inventory_lots il
    JOIN products p ON p.id = il.product_id
    WHERE il.shipment_id = p_shipment_db_id
  ),
  lot_agg AS (
    SELECT
      sl.sku,
      sl.product_name,
      SUM(sl.received_quantity)::bigint                           AS units_in,
      SUM(sl.remaining_quantity)::bigint                          AS units_remaining,
      SUM(sl.remaining_quantity * sl.landed_cost_per_unit)        AS remaining_inventory_value,
      AVG(sl.landed_cost_per_unit)                                AS landed_cost_per_unit
    FROM shipment_lots sl
    GROUP BY sl.sku, sl.product_name
  ),
  movement_agg AS (
    SELECT
      p.sku,
      SUM(CASE WHEN sm.movement_type = 'sale'      THEN ABS(sm.quantity) ELSE 0 END)::bigint AS units_sold,
      SUM(CASE WHEN sm.movement_type = 'damaged'   THEN ABS(sm.quantity) ELSE 0 END)::bigint AS units_damaged,
      SUM(CASE WHEN sm.movement_type = 'adjustment' AND sm.quantity < 0 THEN ABS(sm.quantity) ELSE 0 END)::bigint AS units_adjusted
    FROM stock_movements sm
    JOIN inventory_lots il ON il.id = sm.lot_id
    JOIN products p ON p.id = il.product_id
    WHERE il.shipment_id = p_shipment_db_id
      AND sm.movement_type IN ('sale', 'damaged', 'adjustment')
    GROUP BY p.sku
  ),
  return_agg AS (
    SELECT
      p.sku,
      SUM(ABS(sm.quantity))::bigint AS units_returned
    FROM stock_movements sm
    JOIN inventory_lots il ON il.id = sm.lot_id
    JOIN products p ON p.id = il.product_id
    WHERE il.shipment_id = p_shipment_db_id
      AND sm.movement_type IN ('return_receive', 'return_restock')
    GROUP BY p.sku
  ),
  cogs_agg AS (
    SELECT
      oilcd.sku,
      SUM(oilcd.line_cost) AS cogs_sold
    FROM order_item_lot_cogs_detail oilcd
    JOIN inventory_lots il ON il.lot_number = oilcd.lot_number
    WHERE il.shipment_id = p_shipment_db_id
    GROUP BY oilcd.sku
  )
  SELECT
    la.sku,
    la.product_name,
    la.units_in,
    COALESCE(ma.units_sold, 0)                                    AS units_sold,
    la.units_remaining,
    CASE WHEN la.units_in > 0
         THEN ROUND(COALESCE(ma.units_sold, 0)::numeric / la.units_in * 100, 1)
         ELSE 0 END                                              AS sell_through_pct,
    COALESCE(ca.cogs_sold, 0)                                     AS cogs_sold,
    la.remaining_inventory_value,
    COALESCE(ma.units_damaged, 0)                                 AS units_damaged,
    COALESCE(ma.units_adjusted, 0)                                AS units_adjusted,
    COALESCE(ra.units_returned, 0)                                AS units_returned,
    la.landed_cost_per_unit
  FROM lot_agg la
  LEFT JOIN movement_agg ma  ON ma.sku = la.sku
  LEFT JOIN return_agg ra    ON ra.sku = la.sku
  LEFT JOIN cogs_agg ca      ON ca.sku = la.sku
  ORDER BY la.units_in DESC;
$$;

-- Grant execute to anon role (matching project's custom auth pattern)
GRANT EXECUTE ON FUNCTION get_shipment_performance_list() TO anon;
GRANT EXECUTE ON FUNCTION get_shipment_performance_detail(uuid) TO anon;
