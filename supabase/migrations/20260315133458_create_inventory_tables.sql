/*
  # Inventory Module Tables

  ## Overview
  Creates comprehensive lot-based inventory system following Odoo's approach.
  Every unit of stock is tracked at the lot level for FIFO costing and full traceability.

  ## New Tables

  ### `products`
  - `id` (uuid, primary key)
  - `sku` (text, unique) - Stock Keeping Unit
  - `name` (text) - Product name
  - `barcode` (text) - Product barcode
  - `category` (text) - Product category
  - `selling_price` (decimal) - Retail price in BDT
  - `image_url` (text) - Primary product image
  - `woo_product_id` (integer) - WooCommerce product ID
  - `woo_variation_id` (integer) - WooCommerce variation ID
  - `low_stock_threshold` (integer) - Alert threshold
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `product_suppliers`
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key)
  - `supplier_id` (uuid, foreign key)
  - `supplier_sku` (text) - Supplier's product code
  - `unit_price` (decimal)
  - `currency` (text)
  - `is_preferred` (boolean) - Primary supplier flag
  - `created_at` (timestamptz)

  ### `warehouses`
  - `id` (uuid, primary key)
  - `name` (text) - Warehouse name
  - `code` (text, unique) - Short code
  - `address` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### `warehouse_locations`
  - `id` (uuid, primary key)
  - `warehouse_id` (uuid, foreign key)
  - `code` (text, unique) - e.g., A-01-03
  - `name` (text) - Location description
  - `location_type` (text) - storage, receiving, return_hold, damaged
  - `barcode` (text) - Scannable location barcode
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### `shipments`
  - `id` (uuid, primary key)
  - `shipment_id` (text, unique) - Same as PO number
  - `po_id` (uuid, foreign key)
  - `received_date` (date)
  - `received_by` (uuid, foreign key to users)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### `inventory_lots`
  - `id` (uuid, primary key)
  - `lot_number` (text, unique) - Auto-generated lot ID
  - `product_id` (uuid, foreign key to products)
  - `shipment_id` (uuid, foreign key to shipments)
  - `po_id` (uuid, foreign key to purchase_orders)
  - `location_id` (uuid, foreign key to warehouse_locations)
  - `received_date` (date)
  - `received_quantity` (integer) - Initial quantity
  - `remaining_quantity` (integer) - Current quantity
  - `landed_cost_per_unit` (decimal) - Cost in BDT
  - `barcode` (text) - Lot-specific barcode (SKU-ShipmentID)
  - `created_at` (timestamptz)

  ### `stock_movements`
  - `id` (uuid, primary key)
  - `movement_type` (text) - receipt, sale, return_restock, adjustment, transfer, damaged
  - `product_id` (uuid, foreign key)
  - `lot_id` (uuid, foreign key)
  - `from_location_id` (uuid, foreign key)
  - `to_location_id` (uuid, foreign key)
  - `quantity` (integer) - Positive or negative
  - `reference_type` (text) - po, order, return, audit
  - `reference_id` (uuid) - ID of the reference document
  - `notes` (text)
  - `performed_by` (uuid, foreign key to users)
  - `created_at` (timestamptz)

  ### `inventory_audits`
  - `id` (uuid, primary key)
  - `audit_date` (date)
  - `location_ids` (jsonb) - Array of location IDs audited
  - `conducted_by` (uuid, foreign key to users)
  - `status` (text) - in_progress, completed
  - `accuracy_percentage` (decimal)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `completed_at` (timestamptz)

  ### `inventory_audit_lines`
  - `id` (uuid, primary key)
  - `audit_id` (uuid, foreign key)
  - `product_id` (uuid, foreign key)
  - `lot_id` (uuid, foreign key)
  - `location_id` (uuid, foreign key)
  - `expected_quantity` (integer)
  - `counted_quantity` (integer)
  - `difference` (integer) - counted - expected
  - `notes` (text)

  ## Security
  - Enable RLS on all tables
  - Different policies for roles with/without cost visibility
*/

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  barcode text,
  category text,
  selling_price decimal(10, 2),
  image_url text,
  woo_product_id integer,
  woo_variation_id integer,
  low_stock_threshold integer DEFAULT 20,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Operations Manager can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Product suppliers table
CREATE TABLE IF NOT EXISTS product_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  supplier_sku text,
  unit_price decimal(10, 2),
  currency text DEFAULT 'USD',
  is_preferred boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, supplier_id)
);

ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Operations Manager can view product suppliers"
  ON product_suppliers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can manage product suppliers"
  ON product_suppliers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Operations Manager can manage warehouses"
  ON warehouses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Warehouse locations table
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  location_type text DEFAULT 'storage' CHECK (location_type IN ('storage', 'receiving', 'return_hold', 'damaged')),
  barcode text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view locations"
  ON warehouse_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Operations Manager can manage locations"
  ON warehouse_locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text UNIQUE NOT NULL,
  po_id uuid NOT NULL REFERENCES purchase_orders(id),
  received_date date NOT NULL,
  received_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Operations Manager can view shipments"
  ON shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can manage shipments"
  ON shipments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Inventory lots table
CREATE TABLE IF NOT EXISTS inventory_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number text UNIQUE NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  shipment_id uuid REFERENCES shipments(id),
  po_id uuid REFERENCES purchase_orders(id),
  location_id uuid NOT NULL REFERENCES warehouse_locations(id),
  received_date date NOT NULL,
  received_quantity integer NOT NULL CHECK (received_quantity > 0),
  remaining_quantity integer NOT NULL CHECK (remaining_quantity >= 0),
  landed_cost_per_unit decimal(10, 2) NOT NULL,
  barcode text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view lots"
  ON inventory_lots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin, Ops Manager, and Warehouse can manage lots"
  ON inventory_lots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'warehouse_manager')
      AND users.is_active = true
    )
  );

-- Stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type text NOT NULL CHECK (movement_type IN ('receipt', 'sale', 'return_restock', 'adjustment', 'transfer', 'damaged')),
  product_id uuid NOT NULL REFERENCES products(id),
  lot_id uuid REFERENCES inventory_lots(id),
  from_location_id uuid REFERENCES warehouse_locations(id),
  to_location_id uuid REFERENCES warehouse_locations(id),
  quantity integer NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  performed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin, Ops Manager, and Warehouse can create movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'warehouse_manager')
      AND users.is_active = true
    )
  );

-- Inventory audits table
CREATE TABLE IF NOT EXISTS inventory_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_date date NOT NULL,
  location_ids jsonb NOT NULL,
  conducted_by uuid REFERENCES users(id),
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  accuracy_percentage decimal(5, 2),
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view audits"
  ON inventory_audits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin, Ops Manager, and Warehouse can manage audits"
  ON inventory_audits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'warehouse_manager')
      AND users.is_active = true
    )
  );

-- Inventory audit lines table
CREATE TABLE IF NOT EXISTS inventory_audit_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES inventory_audits(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  lot_id uuid REFERENCES inventory_lots(id),
  location_id uuid NOT NULL REFERENCES warehouse_locations(id),
  expected_quantity integer NOT NULL,
  counted_quantity integer,
  difference integer,
  notes text
);

ALTER TABLE inventory_audit_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view audit lines"
  ON inventory_audit_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin, Ops Manager, and Warehouse can manage audit lines"
  ON inventory_audit_lines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'warehouse_manager')
      AND users.is_active = true
    )
  );

-- Insert default warehouse
INSERT INTO warehouses (name, code, address)
VALUES ('Main Warehouse', 'WH01', 'Dhaka, Bangladesh')
ON CONFLICT DO NOTHING;

-- Insert default locations
INSERT INTO warehouse_locations (warehouse_id, code, name, location_type)
SELECT 
  w.id,
  'RCV-01',
  'Receiving Area',
  'receiving'
FROM warehouses w
WHERE w.code = 'WH01'
ON CONFLICT DO NOTHING;

INSERT INTO warehouse_locations (warehouse_id, code, name, location_type)
SELECT 
  w.id,
  'DMG-01',
  'Damaged Goods',
  'damaged'
FROM warehouses w
WHERE w.code = 'WH01'
ON CONFLICT DO NOTHING;

INSERT INTO warehouse_locations (warehouse_id, code, name, location_type)
SELECT 
  w.id,
  'RTN-01',
  'Return Hold Area',
  'return_hold'
FROM warehouses w
WHERE w.code = 'WH01'
ON CONFLICT DO NOTHING;