/*
  # Rename LOT-002/LOT-003 to LOT-001 and Normalize Barcodes

  ## Summary
  All Odoo-imported inventory lots were split into LOT-001/LOT-002/LOT-003 by a previous
  migration to work around a global unique constraint on lot_number. Now that the business
  rule is clarified:

  - There is only ONE lot concept for initial Odoo stock: LOT-001
  - LOT-002 and LOT-003 are simply the same product stored at different warehouse locations
  - The lot_number for ALL initial Odoo-imported stock must be 'LOT-001' regardless of location
  - The barcode for LOT-001 rows must equal the product SKU (no suffix)
  - When a new PO is created in-system, the lot_number = PO ID and barcode = SKU + PO suffix

  ## Changes

  ### Constraint Update: inventory_lots
  - DROP: `inventory_lots_product_lot_unique` (product_id, lot_number)
    This constraint prevented multiple LOT-001 rows per product (one per location).
  - ADD: `inventory_lots_product_location_lot_unique` (product_id, location_id, lot_number)
    This correctly enforces uniqueness at the product + location + lot level, allowing
    the same product to have LOT-001 at multiple locations.

  ### Data Update: inventory_lots
  - All rows with lot_number IN ('LOT-002', 'LOT-003') are renamed to 'LOT-001'
  - Their barcodes are reset to the product SKU (removing the '-002'/'-003' suffix)
  - PO-based lots (LOT-2026-001-xx pattern) are completely untouched

  ## Scope
  - 67 LOT-002 rows renamed to LOT-001
  - 7 LOT-003 rows renamed to LOT-001
  - 74 barcode values normalized to product SKU
  - PO lots (LOT-2026-001-01, LOT-2026-001-02) unaffected
*/

ALTER TABLE inventory_lots
  DROP CONSTRAINT IF EXISTS inventory_lots_product_lot_unique;

ALTER TABLE inventory_lots
  ADD CONSTRAINT inventory_lots_product_location_lot_unique
  UNIQUE (product_id, location_id, lot_number);

UPDATE inventory_lots il
SET
  lot_number = 'LOT-001',
  barcode    = p.sku
FROM products p
WHERE il.product_id = p.id
  AND il.lot_number IN ('LOT-002', 'LOT-003');
