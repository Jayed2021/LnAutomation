/*
  # Seed mock inventory data for development

  ## Overview
  Inserts representative sample data so all inventory pages have content to display
  during development and testing. This includes products, storage locations, a sample
  supplier, purchase orders in various statuses, shipments, inventory lots, and stock movements.

  ## Data Seeded
  - 6 eyewear products across 3 categories
  - 4 storage locations in the default warehouse
  - 2 suppliers
  - 3 purchase orders (1 confirmed/ready to receive, 1 partially_received, 1 closed)
  - 2 shipments with lot records
  - Stock movement records

  ## Note
  This is development seed data. Remove or update when WooCommerce sync goes live.
*/

-- Add storage locations to main warehouse
INSERT INTO warehouse_locations (warehouse_id, code, name, location_type)
SELECT w.id, 'A-01', 'Shelf A Row 1', 'storage'
FROM warehouses w WHERE w.code = 'WH01'
ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouse_locations (warehouse_id, code, name, location_type)
SELECT w.id, 'A-02', 'Shelf A Row 2', 'storage'
FROM warehouses w WHERE w.code = 'WH01'
ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouse_locations (warehouse_id, code, name, location_type)
SELECT w.id, 'B-01', 'Shelf B Row 1', 'storage'
FROM warehouses w WHERE w.code = 'WH01'
ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouse_locations (warehouse_id, code, name, location_type)
SELECT w.id, 'B-02', 'Shelf B Row 2', 'storage'
FROM warehouses w WHERE w.code = 'WH01'
ON CONFLICT (code) DO NOTHING;

-- Seed suppliers
INSERT INTO suppliers (name, country, contact_name, email, phone)
VALUES
  ('Vision Optics Co. Ltd', 'China', 'Li Wei', 'liwei@visionoptics.cn', '+86-755-1234567'),
  ('Frame Masters International', 'China', 'Zhang Min', 'zmin@framemasters.cn', '+86-20-9876543')
ON CONFLICT DO NOTHING;

-- Seed products
INSERT INTO products (sku, name, barcode, category, selling_price, low_stock_threshold)
VALUES
  ('RB-AV-BLK', 'Aviator Classic Black', '8901234567890', 'Sunglasses', 3500.00, 20),
  ('RB-RB-GLD', 'Round Gold Frame', '8901234567891', 'Sunglasses', 4200.00, 15),
  ('OKL-HB-GRY', 'Holbrook Grey Smoke', '8901234567892', 'Sunglasses', 6800.00, 10),
  ('PR-TF-TOR', 'Tortoise Frame Classic', '8901234567893', 'Eyeglasses', 8500.00, 8),
  ('CV-RX-CLR', 'Clear Lens RX Frame', '8901234567894', 'Eyeglasses', 2800.00, 25),
  ('RB-SP-BLU', 'Sport Shield Blue', '8901234567895', 'Sports', 5200.00, 12)
ON CONFLICT (sku) DO NOTHING;

-- Seed POs: one confirmed (ready to receive), one partially_received, one closed
INSERT INTO purchase_orders (po_number, supplier_id, status, currency, exchange_rate_to_bdt, expected_delivery_date, notes)
SELECT
  'PO-2026-001',
  s.id,
  'confirmed',
  'USD',
  110.50,
  '2026-03-20',
  'Spring collection - fully paid, awaiting receipt'
FROM suppliers s WHERE s.name = 'Vision Optics Co. Ltd'
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO purchase_orders (po_number, supplier_id, status, currency, exchange_rate_to_bdt, expected_delivery_date, notes)
SELECT
  'PO-2026-002',
  s.id,
  'confirmed',
  'USD',
  110.50,
  '2026-03-22',
  'New frames batch - confirmed and paid'
FROM suppliers s WHERE s.name = 'Frame Masters International'
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO purchase_orders (po_number, supplier_id, status, currency, exchange_rate_to_bdt, expected_delivery_date, notes)
SELECT
  'PO-2026-003',
  s.id,
  'closed',
  'USD',
  109.80,
  '2026-03-10',
  'Previous batch - fully received and closed'
FROM suppliers s WHERE s.name = 'Vision Optics Co. Ltd'
ON CONFLICT (po_number) DO NOTHING;

-- Seed PO items for PO-2026-001 (confirmed)
INSERT INTO purchase_order_items (po_id, sku, product_name, ordered_quantity, unit_price, shipping_cost_per_unit, import_duty_per_unit, landed_cost_per_unit, received_quantity)
SELECT
  po.id,
  'RB-AV-BLK',
  'Aviator Classic Black',
  50,
  18.00,
  2.50,
  150.00,
  2295.50,
  0
FROM purchase_orders po WHERE po.po_number = 'PO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO purchase_order_items (po_id, sku, product_name, ordered_quantity, unit_price, shipping_cost_per_unit, import_duty_per_unit, landed_cost_per_unit, received_quantity)
SELECT
  po.id,
  'RB-RB-GLD',
  'Round Gold Frame',
  30,
  22.00,
  2.50,
  180.00,
  2614.00,
  0
FROM purchase_orders po WHERE po.po_number = 'PO-2026-001'
ON CONFLICT DO NOTHING;

-- Seed PO items for PO-2026-002 (confirmed)
INSERT INTO purchase_order_items (po_id, sku, product_name, ordered_quantity, unit_price, shipping_cost_per_unit, import_duty_per_unit, landed_cost_per_unit, received_quantity)
SELECT
  po.id,
  'OKL-HB-GRY',
  'Holbrook Grey Smoke',
  40,
  38.00,
  3.00,
  250.00,
  4498.00,
  0
FROM purchase_orders po WHERE po.po_number = 'PO-2026-002'
ON CONFLICT DO NOTHING;

INSERT INTO purchase_order_items (po_id, sku, product_name, ordered_quantity, unit_price, shipping_cost_per_unit, import_duty_per_unit, landed_cost_per_unit, received_quantity)
SELECT
  po.id,
  'PR-TF-TOR',
  'Tortoise Frame Classic',
  20,
  45.00,
  3.50,
  300.00,
  5267.50,
  0
FROM purchase_orders po WHERE po.po_number = 'PO-2026-002'
ON CONFLICT DO NOTHING;

-- Seed PO items for PO-2026-003 (closed)
INSERT INTO purchase_order_items (po_id, sku, product_name, ordered_quantity, unit_price, shipping_cost_per_unit, import_duty_per_unit, landed_cost_per_unit, received_quantity)
SELECT
  po.id,
  'CV-RX-CLR',
  'Clear Lens RX Frame',
  60,
  12.00,
  1.80,
  100.00,
  1426.40,
  60
FROM purchase_orders po WHERE po.po_number = 'PO-2026-003'
ON CONFLICT DO NOTHING;

INSERT INTO purchase_order_items (po_id, sku, product_name, ordered_quantity, unit_price, shipping_cost_per_unit, import_duty_per_unit, landed_cost_per_unit, received_quantity)
SELECT
  po.id,
  'RB-SP-BLU',
  'Sport Shield Blue',
  35,
  28.00,
  2.80,
  200.00,
  3292.40,
  35
FROM purchase_orders po WHERE po.po_number = 'PO-2026-003'
ON CONFLICT DO NOTHING;

-- Seed a completed shipment from PO-2026-003
INSERT INTO shipments (shipment_id, po_id, received_date, notes)
SELECT
  'SHP-2026-001',
  po.id,
  '2026-03-10',
  'Full receipt, all items in good condition'
FROM purchase_orders po WHERE po.po_number = 'PO-2026-003'
ON CONFLICT (shipment_id) DO NOTHING;

-- Seed inventory lots for the completed shipment
INSERT INTO inventory_lots (lot_number, product_id, shipment_id, po_id, location_id, received_date, received_quantity, remaining_quantity, landed_cost_per_unit, barcode)
SELECT
  'LOT-2026-001-01',
  p.id,
  s.id,
  po.id,
  wl.id,
  '2026-03-10',
  60,
  45,
  1426.40,
  'CV-RX-CLR-SHP001'
FROM products p, shipments s, purchase_orders po, warehouse_locations wl
WHERE p.sku = 'CV-RX-CLR'
  AND s.shipment_id = 'SHP-2026-001'
  AND po.po_number = 'PO-2026-003'
  AND wl.code = 'A-01'
ON CONFLICT (lot_number) DO NOTHING;

INSERT INTO inventory_lots (lot_number, product_id, shipment_id, po_id, location_id, received_date, received_quantity, remaining_quantity, landed_cost_per_unit, barcode)
SELECT
  'LOT-2026-001-02',
  p.id,
  s.id,
  po.id,
  wl.id,
  '2026-03-10',
  35,
  28,
  3292.40,
  'RB-SP-BLU-SHP001'
FROM products p, shipments s, purchase_orders po, warehouse_locations wl
WHERE p.sku = 'RB-SP-BLU'
  AND s.shipment_id = 'SHP-2026-001'
  AND po.po_number = 'PO-2026-003'
  AND wl.code = 'A-02'
ON CONFLICT (lot_number) DO NOTHING;

-- Seed stock movements for the completed shipment
INSERT INTO stock_movements (movement_type, product_id, lot_id, to_location_id, quantity, reference_type, notes)
SELECT
  'receipt',
  il.product_id,
  il.id,
  il.location_id,
  il.received_quantity,
  'po',
  'Initial receipt from PO-2026-003'
FROM inventory_lots il
WHERE il.lot_number IN ('LOT-2026-001-01', 'LOT-2026-001-02')
ON CONFLICT DO NOTHING;

-- Seed some sale movements
INSERT INTO stock_movements (movement_type, product_id, lot_id, from_location_id, quantity, reference_type, notes)
SELECT
  'sale',
  il.product_id,
  il.id,
  il.location_id,
  -15,
  'order',
  'Sales deduction'
FROM inventory_lots il
WHERE il.lot_number = 'LOT-2026-001-01'
ON CONFLICT DO NOTHING;

INSERT INTO stock_movements (movement_type, product_id, lot_id, from_location_id, quantity, reference_type, notes)
SELECT
  'sale',
  il.product_id,
  il.id,
  il.location_id,
  -7,
  'order',
  'Sales deduction'
FROM inventory_lots il
WHERE il.lot_number = 'LOT-2026-001-02'
ON CONFLICT DO NOTHING;
