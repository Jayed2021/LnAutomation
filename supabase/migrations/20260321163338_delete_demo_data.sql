/*
  # Delete Demo Data

  Removes all seeded demo records that were created for testing purposes.
  Deletions are performed in dependency order to respect foreign key constraints.

  ## Records Deleted

  1. **stock_movements** - 4 demo movements (2 receipt + 2 sale) tied to demo lots
  2. **inventory_lots** - LOT-2026-001-01 and LOT-2026-001-02 from demo shipment SHP-2026-001
  3. **shipments** - SHP-2026-001 (demo receipt shipment)
  4. **purchase_order_items** - All 6 line items across 3 demo POs
  5. **purchase_orders** - PO-2026-001, PO-2026-002, PO-2026-003
  6. **products** - CV-RX-CLR (Clear Lens RX Frame), RB-SP-BLU (Sport Shield Blue)

  ## Notes on Suppliers

  Petragras Sunglasses and Linhai Shengqiu Glasses Factory are retained because they have
  313 rows in product_suppliers linking them to real products in the catalog.
  They were imported as legitimate supplier data alongside the product import.

  ## Not Affected

  - All real suppliers and their product_suppliers links
  - All real products imported from WooCommerce/Odoo
  - All real inventory lots from Odoo import
*/

DELETE FROM stock_movements
WHERE lot_id IN (
  SELECT id FROM inventory_lots
  WHERE shipment_id IN (
    SELECT id FROM shipments
    WHERE po_id IN (
      SELECT id FROM purchase_orders
      WHERE po_number IN ('PO-2026-001', 'PO-2026-002', 'PO-2026-003')
    )
  )
);

DELETE FROM inventory_lots
WHERE shipment_id IN (
  SELECT id FROM shipments
  WHERE po_id IN (
    SELECT id FROM purchase_orders
    WHERE po_number IN ('PO-2026-001', 'PO-2026-002', 'PO-2026-003')
  )
);

DELETE FROM shipments
WHERE po_id IN (
  SELECT id FROM purchase_orders
  WHERE po_number IN ('PO-2026-001', 'PO-2026-002', 'PO-2026-003')
);

DELETE FROM purchase_order_items
WHERE po_id IN (
  SELECT id FROM purchase_orders
  WHERE po_number IN ('PO-2026-001', 'PO-2026-002', 'PO-2026-003')
);

DELETE FROM purchase_orders
WHERE po_number IN ('PO-2026-001', 'PO-2026-002', 'PO-2026-003');

DELETE FROM product_suppliers
WHERE product_id IN (
  SELECT id FROM products WHERE sku IN ('CV-RX-CLR', 'RB-SP-BLU')
);

DELETE FROM products
WHERE sku IN ('CV-RX-CLR', 'RB-SP-BLU');
