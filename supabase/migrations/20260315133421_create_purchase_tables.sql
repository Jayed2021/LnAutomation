/*
  # Purchase Module Tables

  ## Overview
  Creates tables for managing suppliers, purchase orders, and the complete import purchasing lifecycle.

  ## New Tables

  ### `suppliers`
  - `id` (uuid, primary key)
  - `name` (text) - Supplier company name
  - `country` (text) - Supplier country (typically China)
  - `contact_name` (text) - Primary contact person
  - `email` (text)
  - `phone` (text)
  - `whatsapp` (text)
  - `notes` (text) - Internal notes
  - `is_active` (boolean) - Soft delete flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `purchase_orders`
  - `id` (uuid, primary key)
  - `po_number` (text, unique) - User-defined PO identifier
  - `supplier_id` (uuid, foreign key)
  - `status` (text) - draft, ordered, partially_received, closed
  - `currency` (text) - USD, CNY, BDT
  - `exchange_rate_to_bdt` (decimal) - Exchange rate snapshot
  - `expected_delivery_date` (date)
  - `notes` (text)
  - `created_by` (uuid, foreign key to users)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `purchase_order_items`
  - `id` (uuid, primary key)
  - `po_id` (uuid, foreign key to purchase_orders)
  - `sku` (text) - Product SKU
  - `product_name` (text)
  - `ordered_quantity` (integer)
  - `unit_price` (decimal) - In PO currency
  - `shipping_cost_per_unit` (decimal) - In PO currency
  - `import_duty_per_unit` (decimal) - In BDT
  - `landed_cost_per_unit` (decimal) - Calculated total cost in BDT
  - `received_quantity` (integer) - Running total
  - `created_at` (timestamptz)

  ### `supplier_payments`
  - `id` (uuid, primary key)
  - `supplier_id` (uuid, foreign key)
  - `po_id` (uuid, foreign key)
  - `payment_date` (date)
  - `amount` (decimal)
  - `currency` (text)
  - `payment_method` (text) - bank_transfer, wire, etc.
  - `reference_number` (text)
  - `notes` (text)
  - `created_by` (uuid, foreign key to users)
  - `created_at` (timestamptz)

  ### `po_attachments`
  - `id` (uuid, primary key)
  - `po_id` (uuid, foreign key)
  - `file_url` (text) - URL in Supabase Storage
  - `file_name` (text)
  - `file_type` (text)
  - `uploaded_by` (uuid, foreign key to users)
  - `uploaded_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Only Admin and Operations Manager can access Purchase module
*/

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text DEFAULT 'China',
  contact_name text,
  email text,
  phone text,
  whatsapp text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Operations Manager can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'partially_received', 'closed')),
  currency text DEFAULT 'USD' CHECK (currency IN ('USD', 'CNY', 'BDT')),
  exchange_rate_to_bdt decimal(10, 4) DEFAULT 1.0,
  expected_delivery_date date,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Operations Manager can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can manage purchase orders"
  ON purchase_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Purchase order items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sku text NOT NULL,
  product_name text NOT NULL,
  ordered_quantity integer NOT NULL CHECK (ordered_quantity > 0),
  unit_price decimal(10, 2) NOT NULL,
  shipping_cost_per_unit decimal(10, 2) DEFAULT 0,
  import_duty_per_unit decimal(10, 2) DEFAULT 0,
  landed_cost_per_unit decimal(10, 2) NOT NULL,
  received_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Operations Manager can view PO items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can manage PO items"
  ON purchase_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Supplier payments table
CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  po_id uuid REFERENCES purchase_orders(id),
  payment_date date NOT NULL,
  amount decimal(10, 2) NOT NULL,
  currency text DEFAULT 'USD' CHECK (currency IN ('USD', 'CNY', 'BDT')),
  payment_method text DEFAULT 'bank_transfer',
  reference_number text,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Operations Manager can view payments"
  ON supplier_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can manage payments"
  ON supplier_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- PO attachments table
CREATE TABLE IF NOT EXISTS po_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE po_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Operations Manager can view attachments"
  ON po_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can manage attachments"
  ON po_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );