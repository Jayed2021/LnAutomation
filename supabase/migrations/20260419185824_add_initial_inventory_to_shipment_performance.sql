
/*
  # Add Initial Inventory to Shipment Performance

  ## Summary
  Extends the shipment performance report to surface the pre-existing
  "initial inventory" lots (those with no shipment_id and no po_id, i.e.
  the LOT-001 group imported before the ERP was set up) as a virtual
  first-class shipment row.

  ## New app_settings Keys
  Three new keys are seeded with sensible defaults:
  - `initial_inventory_date` (text, ISO date) — the date to display as the
    "received" date for the initial inventory row. Pre-populated to the
    earliest received_date found across all inventory_lots with no
    shipment_id / po_id. Admins can override this in Misc Settings.
  - `initial_inventory_shipment_name` (text) — the label shown in the
    "Shipment" column. Default: "Initial Inventory".
  - `initial_inventory_supplier_name` (text) — the label shown in the
    "Supplier" column. Default: "Pre-existing Stock".

  ## RPC Changes
  1. `get_shipment_performance_list()`:
     - Adds `is_initial_inventory boolean` column to the return type.
     - All existing rows get `is_initial_inventory = false`.
     - A new virtual row is appended for lots where shipment_id IS NULL
       AND po_id IS NULL (the LOT-001 group), using the three
       app_settings values for display fields.
     - The sentinel UUID '00000000-0000-0000-0000-000000000001' is used
       as shipment_db_id for the virtual row so the detail drill-through
       route has a stable identifier.
     - Sort order is by received_date (natural date ordering), so the
       initial inventory row appears in chronological position.

  2. `get_shipment_performance_detail(p_shipment_db_id uuid)`:
     - When called with the sentinel UUID, it queries lots WHERE
       shipment_id IS NULL AND po_id IS NULL instead of matching a
       real shipment row.
     - Existing shipment lookups are unchanged.

  ## Notes
  - Both functions are dropped and recreated to allow the return type
    to be extended with the new `is_initial_inventory` column.
  - GRANT statements are re-applied after recreation.
*/

-- ─── Seed default app_settings values ─────────────────────────────────────────
INSERT INTO app_settings (key, value)
SELECT
  'initial_inventory_date',
  to_jsonb(
    COALESCE(
      (SELECT MIN(received_date)::text
       FROM inventory_lots
       WHERE shipment_id IS NULL AND po_id IS NULL),
      CURRENT_DATE::text
    )
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value)
VALUES ('initial_inventory_shipment_name', '"Initial Inventory"')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value)
VALUES ('initial_inventory_supplier_name', '"Pre-existing Stock"')
ON CONFLICT (key) DO NOTHING;


-- ─── Drop existing functions (return type is changing) ─────────────────────────
DROP FUNCTION IF EXISTS get_shipment_performance_list();
DROP FUNCTION IF EXISTS get_shipment_performance_detail(uuid);


-- ─── Function 1: Shipment Performance List (with initial inventory row) ────────
CREATE FUNCTION get_shipment_performance_list()
RETURNS TABLE (
  shipment_db_id            uuid,
  shipment_label            text,
  po_number                 text,
  po_id                     uuid,
  supplier_name             text,
  supplier_type             text,
  received_date             date,
  po_created_at             timestamptz,
  expected_delivery_date    date,
  age_days                  int,
  lead_time_days            int,
  units_in                  bigint,
  units_sold                bigint,
  units_remaining           bigint,
  sell_through_pct          numeric,
  total_landed_cost         numeric,
  cogs_sold                 numeric,
  remaining_inventory_value numeric,
  shipping_cost_bdt         numeric,
  units_damaged             bigint,
  units_adjusted            bigint,
  units_returned            bigint,
  po_status                 text,
  is_payment_complete       boolean,
  total_paid_bdt            numeric,
  is_initial_inventory      boolean
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
  ),
  init_settings AS (
    SELECT
      COALESCE(
        (SELECT (value #>> '{}') FROM app_settings WHERE key = 'initial_inventory_date'),
        CURRENT_DATE::text
      )::date                                                        AS inv_date,
      COALESCE(
        (SELECT (value #>> '{}') FROM app_settings WHERE key = 'initial_inventory_shipment_name'),
        'Initial Inventory'
      )                                                              AS inv_label,
      COALESCE(
        (SELECT (value #>> '{}') FROM app_settings WHERE key = 'initial_inventory_supplier_name'),
        'Pre-existing Stock'
      )                                                              AS inv_supplier
  ),
  init_lots AS (
    SELECT
      SUM(il.received_quantity)::bigint                             AS units_in,
      SUM(il.remaining_quantity)::bigint                            AS units_remaining,
      SUM(il.received_quantity * il.landed_cost_per_unit)           AS total_landed_cost,
      SUM(il.remaining_quantity * il.landed_cost_per_unit)          AS remaining_inventory_value
    FROM inventory_lots il
    WHERE il.shipment_id IS NULL AND il.po_id IS NULL
  ),
  init_movements AS (
    SELECT
      SUM(CASE WHEN sm.movement_type = 'sale'      THEN ABS(sm.quantity) ELSE 0 END)::bigint AS units_sold,
      SUM(CASE WHEN sm.movement_type = 'damaged'   THEN ABS(sm.quantity) ELSE 0 END)::bigint AS units_damaged,
      SUM(CASE WHEN sm.movement_type = 'adjustment' AND sm.quantity < 0 THEN ABS(sm.quantity) ELSE 0 END)::bigint AS units_adjusted
    FROM stock_movements sm
    JOIN inventory_lots il ON il.id = sm.lot_id
    WHERE il.shipment_id IS NULL AND il.po_id IS NULL
      AND sm.movement_type IN ('sale', 'damaged', 'adjustment')
  ),
  init_returns AS (
    SELECT
      SUM(ABS(sm.quantity))::bigint AS units_returned
    FROM stock_movements sm
    JOIN inventory_lots il ON il.id = sm.lot_id
    WHERE il.shipment_id IS NULL AND il.po_id IS NULL
      AND sm.movement_type IN ('return_receive', 'return_restock')
  ),
  init_cogs AS (
    SELECT
      SUM(oilcd.line_cost) AS cogs_sold
    FROM order_item_lot_cogs_detail oilcd
    JOIN inventory_lots il ON il.lot_number = oilcd.lot_number
    WHERE il.shipment_id IS NULL AND il.po_id IS NULL
  )
  SELECT
    s.id                                                            AS shipment_db_id,
    COALESCE(NULLIF(s.shipment_id, ''), po.po_number)              AS shipment_label,
    po.po_number,
    po.id                                                           AS po_id,
    sup.name                                                        AS supplier_name,
    sup.supplier_type,
    s.received_date,
    po.created_at                                                   AS po_created_at,
    po.expected_delivery_date,
    (CURRENT_DATE - s.received_date)::int                          AS age_days,
    CASE WHEN po.expected_delivery_date IS NOT NULL
         THEN (s.received_date - po.created_at::date)::int
         ELSE NULL END                                              AS lead_time_days,
    COALESCE(la.units_in, 0)                                        AS units_in,
    COALESCE(ma.units_sold, 0)                                      AS units_sold,
    COALESCE(la.units_remaining, 0)                                 AS units_remaining,
    CASE WHEN COALESCE(la.units_in, 0) > 0
         THEN ROUND(COALESCE(ma.units_sold, 0)::numeric / la.units_in * 100, 1)
         ELSE 0 END                                                AS sell_through_pct,
    COALESCE(la.total_landed_cost, 0)                               AS total_landed_cost,
    COALESCE(cs.cogs_sold, 0)                                       AS cogs_sold,
    COALESCE(la.remaining_inventory_value, 0)                       AS remaining_inventory_value,
    COALESCE(po.shipping_cost_bdt, 0)                               AS shipping_cost_bdt,
    COALESCE(ma.units_damaged, 0)                                   AS units_damaged,
    COALESCE(ma.units_adjusted, 0)                                  AS units_adjusted,
    COALESCE(ra.units_returned, 0)                                  AS units_returned,
    po.status                                                       AS po_status,
    COALESCE(po.is_payment_complete, false)                         AS is_payment_complete,
    COALESCE(pa.total_paid_bdt, 0)                                  AS total_paid_bdt,
    false                                                           AS is_initial_inventory
  FROM shipments s
  LEFT JOIN purchase_orders po    ON po.id  = s.po_id
  LEFT JOIN suppliers sup         ON sup.id = po.supplier_id
  LEFT JOIN lot_aggregates la     ON la.shipment_id  = s.id
  LEFT JOIN movement_aggregates ma ON ma.shipment_id = s.id
  LEFT JOIN return_aggregates ra   ON ra.shipment_id = s.id
  LEFT JOIN cogs_sold_agg cs       ON cs.shipment_id = s.id
  LEFT JOIN payment_agg pa         ON pa.po_id = po.id
  WHERE COALESCE(po.is_archived, false) = false

  UNION ALL

  SELECT
    '00000000-0000-0000-0000-000000000001'::uuid                   AS shipment_db_id,
    is2.inv_label                                                   AS shipment_label,
    NULL                                                            AS po_number,
    NULL                                                            AS po_id,
    is2.inv_supplier                                                AS supplier_name,
    NULL                                                            AS supplier_type,
    is2.inv_date                                                    AS received_date,
    is2.inv_date::timestamptz                                       AS po_created_at,
    NULL                                                            AS expected_delivery_date,
    (CURRENT_DATE - is2.inv_date)::int                             AS age_days,
    NULL                                                            AS lead_time_days,
    COALESCE(il.units_in, 0)                                        AS units_in,
    COALESCE(im.units_sold, 0)                                      AS units_sold,
    COALESCE(il.units_remaining, 0)                                 AS units_remaining,
    CASE WHEN COALESCE(il.units_in, 0) > 0
         THEN ROUND(COALESCE(im.units_sold, 0)::numeric / il.units_in * 100, 1)
         ELSE 0 END                                                AS sell_through_pct,
    COALESCE(il.total_landed_cost, 0)                               AS total_landed_cost,
    COALESCE(ic.cogs_sold, 0)                                       AS cogs_sold,
    COALESCE(il.remaining_inventory_value, 0)                       AS remaining_inventory_value,
    0                                                               AS shipping_cost_bdt,
    COALESCE(im.units_damaged, 0)                                   AS units_damaged,
    COALESCE(im.units_adjusted, 0)                                  AS units_adjusted,
    COALESCE(ir.units_returned, 0)                                  AS units_returned,
    'initial'                                                       AS po_status,
    true                                                            AS is_payment_complete,
    0                                                               AS total_paid_bdt,
    true                                                            AS is_initial_inventory
  FROM init_settings is2
  CROSS JOIN init_lots il
  CROSS JOIN init_movements im
  CROSS JOIN init_returns ir
  CROSS JOIN init_cogs ic
  WHERE COALESCE(il.units_in, 0) > 0

  ORDER BY received_date DESC;
$$;

GRANT EXECUTE ON FUNCTION get_shipment_performance_list() TO anon;


-- ─── Function 2: Shipment Performance Detail (handles sentinel UUID) ──────────
CREATE FUNCTION get_shipment_performance_detail(p_shipment_db_id uuid)
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
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_is_initial boolean;
BEGIN
  v_is_initial := (p_shipment_db_id = '00000000-0000-0000-0000-000000000001'::uuid);

  IF v_is_initial THEN
    RETURN QUERY
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
        WHERE il.shipment_id IS NULL AND il.po_id IS NULL
      ),
      lot_agg AS (
        SELECT
          sl.sku,
          sl.product_name,
          SUM(sl.received_quantity)::bigint                         AS units_in,
          SUM(sl.remaining_quantity)::bigint                        AS units_remaining,
          SUM(sl.remaining_quantity * sl.landed_cost_per_unit)      AS remaining_inventory_value,
          AVG(sl.landed_cost_per_unit)                              AS landed_cost_per_unit
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
        WHERE il.shipment_id IS NULL AND il.po_id IS NULL
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
        WHERE il.shipment_id IS NULL AND il.po_id IS NULL
          AND sm.movement_type IN ('return_receive', 'return_restock')
        GROUP BY p.sku
      ),
      cogs_agg AS (
        SELECT
          oilcd.sku,
          SUM(oilcd.line_cost) AS cogs_sold
        FROM order_item_lot_cogs_detail oilcd
        JOIN inventory_lots il ON il.lot_number = oilcd.lot_number
        WHERE il.shipment_id IS NULL AND il.po_id IS NULL
        GROUP BY oilcd.sku
      )
      SELECT
        la.sku,
        la.product_name,
        la.units_in,
        COALESCE(ma.units_sold, 0)                                  AS units_sold,
        la.units_remaining,
        CASE WHEN la.units_in > 0
             THEN ROUND(COALESCE(ma.units_sold, 0)::numeric / la.units_in * 100, 1)
             ELSE 0 END                                            AS sell_through_pct,
        COALESCE(ca.cogs_sold, 0)                                   AS cogs_sold,
        la.remaining_inventory_value,
        COALESCE(ma.units_damaged, 0)                               AS units_damaged,
        COALESCE(ma.units_adjusted, 0)                              AS units_adjusted,
        COALESCE(ra.units_returned, 0)                              AS units_returned,
        la.landed_cost_per_unit
      FROM lot_agg la
      LEFT JOIN movement_agg ma  ON ma.sku = la.sku
      LEFT JOIN return_agg ra    ON ra.sku = la.sku
      LEFT JOIN cogs_agg ca      ON ca.sku = la.sku
      ORDER BY la.units_in DESC;

  ELSE
    RETURN QUERY
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
          SUM(sl.received_quantity)::bigint                         AS units_in,
          SUM(sl.remaining_quantity)::bigint                        AS units_remaining,
          SUM(sl.remaining_quantity * sl.landed_cost_per_unit)      AS remaining_inventory_value,
          AVG(sl.landed_cost_per_unit)                              AS landed_cost_per_unit
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
        COALESCE(ma.units_sold, 0)                                  AS units_sold,
        la.units_remaining,
        CASE WHEN la.units_in > 0
             THEN ROUND(COALESCE(ma.units_sold, 0)::numeric / la.units_in * 100, 1)
             ELSE 0 END                                            AS sell_through_pct,
        COALESCE(ca.cogs_sold, 0)                                   AS cogs_sold,
        la.remaining_inventory_value,
        COALESCE(ma.units_damaged, 0)                               AS units_damaged,
        COALESCE(ma.units_adjusted, 0)                              AS units_adjusted,
        COALESCE(ra.units_returned, 0)                              AS units_returned,
        la.landed_cost_per_unit
      FROM lot_agg la
      LEFT JOIN movement_agg ma  ON ma.sku = la.sku
      LEFT JOIN return_agg ra    ON ra.sku = la.sku
      LEFT JOIN cogs_agg ca      ON ca.sku = la.sku
      ORDER BY la.units_in DESC;

  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_shipment_performance_detail(uuid) TO anon;
