# Manual Database Setup Guide

If the automated `/setup` endpoint fails, you can set up the database manually through the Supabase dashboard.

## Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with your account
3. Select your project (ID: `sptjgtzgpgsgrccgcrpv`)

## Step 2: Open SQL Editor

1. Click **"SQL Editor"** in the left sidebar
2. Click **"New query"**

## Step 3: Run the Setup SQL

Copy the SQL from `/supabase/functions/server/setup.tsx` and paste it into the SQL editor, then click **"Run"**.

**OR** copy and paste this complete SQL:

```sql
-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- User Profiles (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operations_manager', 'warehouse_manager', 'customer_service', 'accounts')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SKUs (Products)
CREATE TABLE IF NOT EXISTS skus (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  sku_name TEXT NOT NULL,
  product_id BIGINT,
  variation_id BIGINT,
  category TEXT,
  brand TEXT,
  frame_type TEXT,
  gender TEXT,
  lens_type TEXT,
  color TEXT,
  size TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sync_source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skus_sku ON skus(sku);
CREATE INDEX IF NOT EXISTS idx_skus_product_id ON skus(product_id);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  country TEXT DEFAULT 'China',
  currency TEXT DEFAULT 'CNY',
  payment_terms TEXT,
  lead_time_days INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_id TEXT NOT NULL UNIQUE,
  po_name TEXT,
  supplier_id INTEGER REFERENCES suppliers(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'ordered', 'in_transit', 'partially_received', 'received', 'cancelled')),
  currency TEXT DEFAULT 'CNY',
  total_amount DECIMAL(12, 2),
  total_amount_bdt DECIMAL(12, 2),
  exchange_rate DECIMAL(10, 4),
  order_date DATE,
  estimated_arrival DATE,
  actual_arrival DATE,
  shipping_method TEXT,
  tracking_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_items (
  id SERIAL PRIMARY KEY,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sku_id INTEGER REFERENCES skus(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  unit_cost_bdt DECIMAL(10, 2),
  total_cost DECIMAL(12, 2),
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON po_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_sku_id ON po_items(sku_id);

-- Warehouse Locations
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  location_code TEXT NOT NULL UNIQUE,
  location_name TEXT NOT NULL,
  warehouse TEXT,
  zone TEXT,
  aisle TEXT,
  shelf TEXT,
  bin TEXT,
  barcode TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(location_code);
CREATE INDEX IF NOT EXISTS idx_locations_barcode ON locations(barcode);

-- Inventory Lots
CREATE TABLE IF NOT EXISTS lots (
  id SERIAL PRIMARY KEY,
  lot_id TEXT NOT NULL UNIQUE,
  po_id INTEGER REFERENCES purchase_orders(id),
  sku_id INTEGER REFERENCES skus(id),
  location_id INTEGER REFERENCES locations(id),
  initial_quantity INTEGER NOT NULL,
  remaining_quantity INTEGER NOT NULL,
  cost_per_unit DECIMAL(10, 2) NOT NULL,
  received_date DATE NOT NULL,
  expiry_date DATE,
  barcode TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lots_lot_id ON lots(lot_id);
CREATE INDEX IF NOT EXISTS idx_lots_sku_id ON lots(sku_id);
CREATE INDEX IF NOT EXISTS idx_lots_location_id ON lots(location_id);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  woo_customer_id BIGINT UNIQUE,
  email TEXT,
  phone TEXT,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Bangladesh',
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  sync_source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_woo_id ON customers(woo_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  woo_order_id BIGINT UNIQUE,
  order_number TEXT,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT NOT NULL,
  cs_status TEXT NOT NULL CHECK (cs_status IN (
    'new_not_called', 'new_called', 'awaiting_payment', 
    'send_to_lab', 'in_lab', 'late_delivery', 'exchange',
    'not_printed', 'printed', 'packed', 'shipped', 'delivered', 'refund'
  )),
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'BDT',
  shipping_address_1 TEXT,
  shipping_address_2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_postcode TEXT,
  shipping_country TEXT DEFAULT 'Bangladesh',
  assigned_cs UUID REFERENCES user_profiles(id),
  source TEXT DEFAULT 'manual',
  is_prescription_order BOOLEAN DEFAULT false,
  needs_lab BOOLEAN DEFAULT false,
  is_priority BOOLEAN DEFAULT false,
  created_date DATE NOT NULL,
  paid_date TIMESTAMPTZ,
  shipped_date TIMESTAMPTZ,
  delivered_date TIMESTAMPTZ,
  sync_source TEXT DEFAULT 'manual',
  last_synced_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_woo_id ON orders(woo_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_cs_status ON orders(cs_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_date ON orders(created_date);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  sku_id INTEGER REFERENCES skus(id),
  sku TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  cost_per_unit DECIMAL(10, 2),
  lot_id INTEGER REFERENCES lots(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_sku_id ON order_items(sku_id);

-- Returns
CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,
  return_id TEXT NOT NULL UNIQUE,
  order_id INTEGER REFERENCES orders(id),
  woo_order_id BIGINT,
  customer_id INTEGER REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('expected', 'received', 'inspected', 'approved', 'rejected', 'refunded', 'exchanged')),
  reason TEXT,
  condition TEXT,
  resolution_type TEXT CHECK (resolution_type IN ('refund', 'exchange', 'store_credit')),
  refund_amount DECIMAL(10, 2),
  restocking_fee DECIMAL(10, 2) DEFAULT 0,
  requested_date DATE NOT NULL,
  received_date DATE,
  processed_date DATE,
  assigned_to UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_return_id ON returns(return_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);

-- Return Items
CREATE TABLE IF NOT EXISTS return_items (
  id SERIAL PRIMARY KEY,
  return_id INTEGER REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id INTEGER REFERENCES order_items(id),
  sku_id INTEGER REFERENCES skus(id),
  sku TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  return_to_stock BOOLEAN DEFAULT false,
  new_lot_id INTEGER REFERENCES lots(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  expense_type TEXT NOT NULL CHECK (expense_type IN (
    'shipping', 'packaging', 'marketing', 'salary', 
    'rent', 'utilities', 'miscellaneous'
  )),
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'BDT',
  description TEXT NOT NULL,
  category TEXT,
  expense_date DATE NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  receipt_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);

-- WooCommerce Settings
CREATE TABLE IF NOT EXISTS woo_settings (
  id SERIAL PRIMARY KEY,
  store_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  last_sync_products TIMESTAMPTZ,
  last_sync_orders TIMESTAMPTZ,
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_interval_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store Profile
CREATE TABLE IF NOT EXISTS store_profile (
  id SERIAL PRIMARY KEY,
  store_name TEXT NOT NULL,
  store_logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  currency TEXT DEFAULT 'BDT',
  additional_lens_enabled BOOLEAN DEFAULT true,
  prescription_lens_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  lot_id INTEGER REFERENCES lots(id),
  sku_id INTEGER REFERENCES skus(id),
  from_location_id INTEGER REFERENCES locations(id),
  to_location_id INTEGER REFERENCES locations(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'receive', 'sale', 'return', 'adjustment', 'transfer', 'damage'
  )),
  quantity INTEGER NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_lot_id ON inventory_movements(lot_id);
CREATE INDEX IF NOT EXISTS idx_movements_sku_id ON inventory_movements(sku_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON inventory_movements(created_at);

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE woo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. CREATE RLS POLICIES (Allow all for authenticated users for now)
-- ============================================================================

-- User Profiles - Users can read all, only admins can modify
CREATE POLICY "Users can read all profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify profiles" ON user_profiles FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- All other tables - Allow authenticated users (we'll refine later)
CREATE POLICY "Authenticated users can access skus" ON skus FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access suppliers" ON suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access purchase_orders" ON purchase_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access po_items" ON po_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access locations" ON locations FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access lots" ON lots FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access customers" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access orders" ON orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access order_items" ON order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access returns" ON returns FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access return_items" ON return_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access expenses" ON expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access woo_settings" ON woo_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access store_profile" ON store_profile FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can access inventory_movements" ON inventory_movements FOR ALL TO authenticated USING (true);

-- ============================================================================
-- 4. CREATE FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_skus_updated_at BEFORE UPDATE ON skus FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_po_items_updated_at BEFORE UPDATE ON po_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON lots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_woo_settings_updated_at BEFORE UPDATE ON woo_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_store_profile_updated_at BEFORE UPDATE ON store_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## Step 4: Create Admin User

After the tables are created, you can use the `/setup/create-admin` endpoint OR run this in the Supabase dashboard:

### Option A: Via API (Recommended)

Use the setup wizard at `/setup` - it will work now that tables exist.

### Option B: Via Supabase Dashboard

1. Go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter email and password
4. Click **"Create user"**
5. Copy the User ID
6. Go back to **SQL Editor** and run:

```sql
INSERT INTO user_profiles (id, email, full_name, role, is_active)
VALUES (
  'PASTE_USER_ID_HERE',
  'admin@yourstore.com',
  'Admin User',
  'admin',
  true
);
```

## Step 5: Test

1. Go to your app at `/login`
2. Sign in with the credentials you created
3. You should now have full access!

## Troubleshooting

- **"relation already exists"** - This is fine! It means some tables were already created
- **Permission denied** - Make sure you're connected to the correct Supabase project
- **Can't create admin** - Use the Supabase Authentication UI to create the user first

---

**After Setup:**
- Navigate to Settings → WooCommerce Integration
- Enter your store credentials
- Start syncing products and orders!
