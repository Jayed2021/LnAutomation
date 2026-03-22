/*
  # Fulfillment Module Tables

  ## Overview
  Creates tables for managing orders, order fulfillment operations, and returns.
  Supports complete CS workflow from order confirmation through delivery and returns processing.

  ## New Tables

  ### `customers`
  - `id` (uuid, primary key)
  - `woo_customer_id` (integer) - WooCommerce customer ID
  - `full_name` (text)
  - `email` (text)
  - `phone_primary` (text)
  - `phone_secondary` (text)
  - `address_line1` (text)
  - `address_line2` (text)
  - `city` (text)
  - `district` (text)
  - `postal_code` (text)
  - `notes` (text) - Internal CS notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `customer_prescriptions`
  - `id` (uuid, primary key)
  - `customer_id` (uuid, foreign key)
  - `prescription_type` (text) - Single Vision, Progressive, etc.
  - `od_sph` (text) - Right eye sphere
  - `od_cyl` (text) - Right eye cylinder
  - `od_axis` (text) - Right eye axis
  - `od_pd` (text) - Right eye PD
  - `os_sph` (text) - Left eye sphere
  - `os_cyl` (text) - Left eye cylinder
  - `os_axis` (text) - Left eye axis
  - `os_pd` (text) - Left eye PD
  - `notes` (text)
  - `source_order_id` (uuid) - Order this Rx was taken from
  - `recorded_date` (date)
  - `created_at` (timestamptz)

  ### `orders`
  - `id` (uuid, primary key)
  - `order_number` (text, unique) - Internal order number
  - `woo_order_id` (integer) - WooCommerce order ID
  - `woo_order_number` (text) - WooCommerce order number
  - `customer_id` (uuid, foreign key)
  - `order_date` (timestamptz)
  - `cs_status` (text) - Detailed CS status
  - `payment_method` (text)
  - `payment_status` (text) - paid, unpaid
  - `payment_reference` (text)
  - `subtotal` (decimal)
  - `discount_amount` (decimal)
  - `shipping_fee` (decimal)
  - `total_amount` (decimal)
  - `order_source` (text) - website, facebook, instagram, whatsapp, phone
  - `conversation_url` (text) - Social media message link
  - `assigned_to` (uuid, foreign key to users) - CS agent
  - `confirmed_by` (uuid, foreign key to users)
  - `confirmation_type` (text) - phone_call, whatsapp, prepaid, assumption
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `order_items`
  - `id` (uuid, primary key)
  - `order_id` (uuid, foreign key)
  - `product_id` (uuid, foreign key)
  - `sku` (text)
  - `product_name` (text)
  - `quantity` (integer)
  - `unit_price` (decimal)
  - `line_total` (decimal)
  - `picked_quantity` (integer) - Quantity picked from warehouse
  - `created_at` (timestamptz)

  ### `order_prescriptions`
  - `id` (uuid, primary key)
  - `order_id` (uuid, foreign key)
  - `prescription_type` (text)
  - `lens_type` (text)
  - `custom_lens_type` (text)
  - `lens_price` (decimal)
  - `fitting_charge` (decimal)
  - `od_sph`, `od_cyl`, `od_axis`, `od_pd` (text)
  - `os_sph`, `os_cyl`, `os_axis`, `os_pd` (text)
  - `rx_file_url` (text) - Prescription file in storage
  - `lab_payment_status` (text) - paid, unpaid
  - `created_at` (timestamptz)

  ### `order_courier_info`
  - `id` (uuid, primary key)
  - `order_id` (uuid, foreign key)
  - `courier_company` (text) - pathao, steadfast, redx, sundarban, office
  - `tracking_number` (text)
  - `courier_area` (text)
  - `total_receivable` (decimal) - Amount courier should collect
  - `collected_amount` (decimal) - Actually collected
  - `delivery_charge` (decimal)
  - `cod_charge` (decimal)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `order_picks`
  - `id` (uuid, primary key)
  - `order_id` (uuid, foreign key)
  - `order_item_id` (uuid, foreign key)
  - `lot_id` (uuid, foreign key)
  - `quantity` (integer)
  - `picked_by` (uuid, foreign key to users)
  - `picked_at` (timestamptz)

  ### `returns`
  - `id` (uuid, primary key)
  - `return_number` (text, unique)
  - `order_id` (uuid, foreign key)
  - `customer_id` (uuid, foreign key)
  - `return_reason` (text)
  - `status` (text) - expected, received, qc_passed, qc_failed, restocked, damaged
  - `refund_amount` (decimal)
  - `refund_method` (text)
  - `refund_reference` (text)
  - `refund_date` (date)
  - `created_by` (uuid, foreign key to users)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `return_items`
  - `id` (uuid, primary key)
  - `return_id` (uuid, foreign key)
  - `order_item_id` (uuid, foreign key)
  - `product_id` (uuid, foreign key)
  - `sku` (text)
  - `quantity` (integer)
  - `qc_status` (text) - pending, passed, failed
  - `qc_notes` (text)
  - `condition_photo_url` (text)
  - `created_at` (timestamptz)

  ### `order_activity_log`
  - `id` (uuid, primary key)
  - `order_id` (uuid, foreign key)
  - `action` (text) - Description of action
  - `performed_by` (uuid, foreign key to users)
  - `created_at` (timestamptz)

  ### `order_call_log`
  - `id` (uuid, primary key)
  - `order_id` (uuid, foreign key)
  - `notes` (text)
  - `called_by` (uuid, foreign key to users)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Different access levels for different roles
*/

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_customer_id integer,
  full_name text NOT NULL,
  email text,
  phone_primary text,
  phone_secondary text,
  address_line1 text,
  address_line2 text,
  city text,
  district text,
  postal_code text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin, Ops Manager, and CS can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'customer_service')
      AND users.is_active = true
    )
  );

-- Customer prescriptions table
CREATE TABLE IF NOT EXISTS customer_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  prescription_type text,
  od_sph text,
  od_cyl text,
  od_axis text,
  od_pd text,
  os_sph text,
  os_cyl text,
  os_axis text,
  os_pd text,
  notes text,
  source_order_id uuid,
  recorded_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view prescriptions"
  ON customer_prescriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin, Ops Manager, and CS can manage prescriptions"
  ON customer_prescriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'customer_service')
      AND users.is_active = true
    )
  );

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  woo_order_id integer,
  woo_order_number text,
  customer_id uuid NOT NULL REFERENCES customers(id),
  order_date timestamptz DEFAULT now(),
  cs_status text DEFAULT 'new_not_called',
  payment_method text,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
  payment_reference text,
  subtotal decimal(10, 2) DEFAULT 0,
  discount_amount decimal(10, 2) DEFAULT 0,
  shipping_fee decimal(10, 2) DEFAULT 0,
  total_amount decimal(10, 2) NOT NULL,
  order_source text DEFAULT 'website',
  conversation_url text,
  assigned_to uuid REFERENCES users(id),
  confirmed_by uuid REFERENCES users(id),
  confirmation_type text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can manage orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  sku text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10, 2) NOT NULL,
  line_total decimal(10, 2) NOT NULL,
  picked_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can manage order items"
  ON order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

-- Order prescriptions table
CREATE TABLE IF NOT EXISTS order_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  prescription_type text,
  lens_type text,
  custom_lens_type text,
  lens_price decimal(10, 2) DEFAULT 0,
  fitting_charge decimal(10, 2) DEFAULT 0,
  od_sph text,
  od_cyl text,
  od_axis text,
  od_pd text,
  os_sph text,
  os_cyl text,
  os_axis text,
  os_pd text,
  rx_file_url text,
  lab_payment_status text DEFAULT 'unpaid' CHECK (lab_payment_status IN ('paid', 'unpaid')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view order prescriptions"
  ON order_prescriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can manage order prescriptions"
  ON order_prescriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

-- Order courier info table
CREATE TABLE IF NOT EXISTS order_courier_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_company text,
  tracking_number text,
  courier_area text,
  total_receivable decimal(10, 2) DEFAULT 0,
  collected_amount decimal(10, 2) DEFAULT 0,
  delivery_charge decimal(10, 2) DEFAULT 0,
  cod_charge decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE order_courier_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view courier info"
  ON order_courier_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can manage courier info"
  ON order_courier_info FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

-- Order picks table
CREATE TABLE IF NOT EXISTS order_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  order_item_id uuid NOT NULL REFERENCES order_items(id),
  lot_id uuid NOT NULL REFERENCES inventory_lots(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  picked_by uuid REFERENCES users(id),
  picked_at timestamptz DEFAULT now()
);

ALTER TABLE order_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view picks"
  ON order_picks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Warehouse staff can manage picks"
  ON order_picks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'warehouse_manager')
      AND users.is_active = true
    )
  );

-- Returns table
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text UNIQUE NOT NULL,
  order_id uuid NOT NULL REFERENCES orders(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  return_reason text,
  status text DEFAULT 'expected' CHECK (status IN ('expected', 'received', 'qc_passed', 'qc_failed', 'restocked', 'damaged')),
  refund_amount decimal(10, 2),
  refund_method text,
  refund_reference text,
  refund_date date,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view returns"
  ON returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can manage returns"
  ON returns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

-- Return items table
CREATE TABLE IF NOT EXISTS return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id),
  product_id uuid NOT NULL REFERENCES products(id),
  sku text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  qc_status text DEFAULT 'pending' CHECK (qc_status IN ('pending', 'passed', 'failed')),
  qc_notes text,
  condition_photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view return items"
  ON return_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can manage return items"
  ON return_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

-- Order activity log table
CREATE TABLE IF NOT EXISTS order_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view activity log"
  ON order_activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create activity log"
  ON order_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

-- Order call log table
CREATE TABLE IF NOT EXISTS order_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  notes text,
  called_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view call log"
  ON order_call_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "CS and above can create call log"
  ON order_call_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );