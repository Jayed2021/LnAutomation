/*
  # Fix lot_number Unique Constraint and Bulk Update Odoo Lots

  ## Summary
  Two changes in one migration:

  1. **Constraint Fix**: Replaces the global unique constraint on lot_number with a
     composite unique constraint on (product_id, lot_number), which correctly allows
     LOT-001 to exist across different products while enforcing uniqueness within a product.

  2. **Bulk Data Update**: All 471 Odoo-imported inventory lots get clean identifiers.
     Lots are numbered sequentially per product (ordered by received_date, then original lot_number):
     - First lot: lot_number = 'LOT-001', barcode = product SKU (e.g. 'LN_1003')
     - Second lot: lot_number = 'LOT-002', barcode = SKU + '-002' (e.g. 'LN_1807-002')
     - Third lot: lot_number = 'LOT-003', barcode = SKU + '-003'

  ## Modified Table: inventory_lots
  - DROP CONSTRAINT: inventory_lots_lot_number_key (global unique on lot_number)
  - ADD CONSTRAINT: inventory_lots_product_lot_unique (unique on product_id + lot_number)
  - UPDATE: barcode and lot_number for all Odoo-imported lots

  ## Scope
  Only lots matching 'LOT-%ODO%' pattern are updated (471 rows).
  Manually-created PO lots (LOT-2026-001-xx) are untouched.
*/

ALTER TABLE inventory_lots DROP CONSTRAINT IF EXISTS inventory_lots_lot_number_key;

ALTER TABLE inventory_lots
  ADD CONSTRAINT inventory_lots_product_lot_unique UNIQUE (product_id, lot_number);

UPDATE inventory_lots il
SET
  lot_number = ranked.new_lot_number,
  barcode    = ranked.new_barcode
FROM (
  SELECT
    il2.id,
    CASE
      WHEN ROW_NUMBER() OVER (PARTITION BY il2.product_id ORDER BY il2.received_date, il2.lot_number) = 1
        THEN 'LOT-001'
      ELSE 'LOT-0' || LPAD(
        ROW_NUMBER() OVER (PARTITION BY il2.product_id ORDER BY il2.received_date, il2.lot_number)::text,
        2, '0'
      )
    END AS new_lot_number,
    CASE
      WHEN ROW_NUMBER() OVER (PARTITION BY il2.product_id ORDER BY il2.received_date, il2.lot_number) = 1
        THEN p.sku
      ELSE p.sku || '-0' || LPAD(
        ROW_NUMBER() OVER (PARTITION BY il2.product_id ORDER BY il2.received_date, il2.lot_number)::text,
        2, '0'
      )
    END AS new_barcode
  FROM inventory_lots il2
  JOIN products p ON p.id = il2.product_id
  WHERE il2.lot_number LIKE 'LOT-%ODO%'
) ranked
WHERE il.id = ranked.id;
