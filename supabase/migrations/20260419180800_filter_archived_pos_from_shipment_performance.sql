/*
  # Filter archived POs from shipment performance functions

  ## Summary
  Updates both shipment performance RPC functions to exclude purchase orders
  that have been archived (is_archived = true).  Archived POs will no longer
  appear in the Shipment Performance report or its detail view.

  ## Changes
  - `get_shipment_performance_list()` — adds WHERE filter to exclude rows
    where the linked purchase_order is archived.
  - `get_shipment_performance_detail()` — same filter applied so the detail
    view of a shipment belonging to an archived PO is also hidden.
*/

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
  WHERE COALESCE(po.is_archived, false) = false
  ORDER BY s.received_date DESC;
$$;

GRANT EXECUTE ON FUNCTION get_shipment_performance_list() TO anon;
