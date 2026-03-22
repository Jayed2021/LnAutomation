/*
  # Finance Module Tables

  ## Overview
  Creates tables for expense tracking, profit analysis, and courier collection reconciliation.

  ## New Tables

  ### `expense_categories`
  - `id` (uuid, primary key)
  - `name` (text) - Category name
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### `expenses`
  - `id` (uuid, primary key)
  - `expense_date` (date)
  - `category_id` (uuid, foreign key)
  - `description` (text)
  - `amount` (decimal) - In BDT
  - `affects_profit` (boolean) - Include in profit calculation
  - `receipt_url` (text) - Receipt image in storage
  - `created_by` (uuid, foreign key to users)
  - `created_at` (timestamptz)

  ### `collection_records`
  - `id` (uuid, primary key)
  - `courier_company` (text)
  - `invoice_number` (text)
  - `invoice_date` (date)
  - `invoice_file_url` (text) - PDF in storage
  - `total_disbursed` (decimal)
  - `bank_reference` (text)
  - `bank_transfer_date` (date)
  - `bank_transfer_amount` (decimal)
  - `status` (text) - pending, processing, verified, discrepancy
  - `discrepancy_amount` (decimal)
  - `orders_matched` (integer)
  - `orders_total` (integer)
  - `created_by` (uuid, foreign key to users)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `collection_line_items`
  - `id` (uuid, primary key)
  - `collection_record_id` (uuid, foreign key)
  - `order_id` (uuid, foreign key)
  - `tracking_number` (text)
  - `collected_amount` (decimal)
  - `delivery_charge` (decimal)
  - `cod_charge` (decimal)
  - `net_disbursed` (decimal)
  - `match_status` (text) - matched, not_found, already_updated
  - `match_confidence` (text) - high, medium, low
  - `applied` (boolean) - Whether amounts updated to order
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Admin and Accounts can access Expenses and Collection
  - Only Admin can access Profit Analysis (computed from orders + expenses)
*/

-- Expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL,
  category_id uuid NOT NULL REFERENCES expense_categories(id),
  description text NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount >= 0),
  affects_profit boolean DEFAULT true,
  receipt_url text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin, Ops Manager, and Accounts can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'accounts')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin, Ops Manager, and Accounts can manage expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'accounts')
      AND users.is_active = true
    )
  );

-- Collection records table
CREATE TABLE IF NOT EXISTS collection_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_company text NOT NULL,
  invoice_number text,
  invoice_date date NOT NULL,
  invoice_file_url text,
  total_disbursed decimal(10, 2) NOT NULL,
  bank_reference text,
  bank_transfer_date date,
  bank_transfer_amount decimal(10, 2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'verified', 'discrepancy')),
  discrepancy_amount decimal(10, 2) DEFAULT 0,
  orders_matched integer DEFAULT 0,
  orders_total integer DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE collection_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin, Ops Manager, and Accounts can view collection records"
  ON collection_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'accounts')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin, Ops Manager, and Accounts can manage collection records"
  ON collection_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'accounts')
      AND users.is_active = true
    )
  );

-- Collection line items table
CREATE TABLE IF NOT EXISTS collection_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_record_id uuid NOT NULL REFERENCES collection_records(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id),
  tracking_number text NOT NULL,
  collected_amount decimal(10, 2) DEFAULT 0,
  delivery_charge decimal(10, 2) DEFAULT 0,
  cod_charge decimal(10, 2) DEFAULT 0,
  net_disbursed decimal(10, 2) DEFAULT 0,
  match_status text DEFAULT 'not_found' CHECK (match_status IN ('matched', 'not_found', 'already_updated')),
  match_confidence text CHECK (match_confidence IN ('high', 'medium', 'low')),
  applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE collection_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin, Ops Manager, and Accounts can view collection line items"
  ON collection_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'accounts')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin, Ops Manager, and Accounts can manage collection line items"
  ON collection_line_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'accounts')
      AND users.is_active = true
    )
  );

-- Insert default expense categories
INSERT INTO expense_categories (name) VALUES
  ('Rent & Utilities'),
  ('Salaries & Benefits'),
  ('Marketing & Advertising'),
  ('Software & Subscriptions'),
  ('Packaging Materials'),
  ('Import Duties & Taxes'),
  ('Courier Charges'),
  ('Stock Purchase'),
  ('Miscellaneous')
ON CONFLICT DO NOTHING;