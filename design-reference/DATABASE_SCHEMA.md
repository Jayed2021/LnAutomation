# ERP System Database Schema

## Overview
This document describes the PostgreSQL database schema for the Eyewear ERP system. The schema is designed to handle imports, warehousing, fulfillment, returns, and financial analysis.

## Core Tables

### 1. Users & Authentication

```sql
-- Users table (managed by Supabase Auth)
-- Extended with custom profile data
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operations_manager', 'warehouse_manager', 'customer_service', 'accounts')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Products & SKUs

```sql
CREATE TABLE skus (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  sku_name TEXT NOT NULL,
  product_id BIGINT, -- WooCommerce product ID
  variation_id BIGINT, -- WooCommerce variation ID (if applicable)
  category TEXT,
  brand TEXT,
  frame_type TEXT, -- e.g., 'full_rim', 'half_rim', 'rimless'
  gender TEXT, -- 'male', 'female', 'unisex'
  lens_type TEXT, -- 'plano', 'prescription', 'sunglasses'
  color TEXT,
  size TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sync_source TEXT DEFAULT 'woocommerce', -- 'woocommerce', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skus_sku ON skus(sku);
CREATE INDEX idx_skus_product_id ON skus(product_id);
```

### 3. Suppliers

```sql
CREATE TABLE suppliers (
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
```

### 4. Purchase Orders

```sql
CREATE TABLE purchase_orders (
  id SERIAL PRIMARY KEY,
  po_id TEXT NOT NULL UNIQUE,
  po_name TEXT,
  supplier_id INTEGER REFERENCES suppliers(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'ordered', 'in_transit', 'partially_received', 'received', 'cancelled')),
  currency TEXT DEFAULT 'CNY',
  total_amount DECIMAL(12, 2),
  total_amount_bdt DECIMAL(12, 2), -- Converted to BDT
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

CREATE TABLE po_items (
  id SERIAL PRIMARY KEY,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sku_id INTEGER REFERENCES skus(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  unit_cost_bdt DECIMAL(10, 2), -- Converted to BDT
  total_cost DECIMAL(12, 2),
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_items_po_id ON po_items(po_id);
CREATE INDEX idx_po_items_sku_id ON po_items(sku_id);
```

### 5. Warehouse Locations

```sql
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  location_code TEXT NOT NULL UNIQUE,
  location_name TEXT NOT NULL,
  warehouse TEXT, -- 'Warehouse A', 'Warehouse B'
  zone TEXT, -- 'Zone 1', 'Zone 2'
  aisle TEXT,
  shelf TEXT,
  bin TEXT,
  barcode TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_code ON locations(location_code);
CREATE INDEX idx_locations_barcode ON locations(barcode);
```

### 6. Inventory Lots

```sql
CREATE TABLE lots (
  id SERIAL PRIMARY KEY,
  lot_id TEXT NOT NULL UNIQUE,
  po_id INTEGER REFERENCES purchase_orders(id),
  sku_id INTEGER REFERENCES skus(id),
  location_id INTEGER REFERENCES locations(id),
  initial_quantity INTEGER NOT NULL,
  remaining_quantity INTEGER NOT NULL,
  cost_per_unit DECIMAL(10, 2) NOT NULL, -- In BDT
  received_date DATE NOT NULL,
  expiry_date DATE,
  barcode TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lots_lot_id ON lots(lot_id);
CREATE INDEX idx_lots_sku_id ON lots(sku_id);
CREATE INDEX idx_lots_location_id ON lots(location_id);
CREATE INDEX idx_lots_barcode ON lots(barcode);
```

### 7. PO Receiving Photos

```sql
CREATE TABLE po_receiving_photos (
  id SERIAL PRIMARY KEY,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sku_id INTEGER REFERENCES skus(id),
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8. Customers

```sql
CREATE TABLE customers (
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
  sync_source TEXT DEFAULT 'woocommerce',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_woo_id ON customers(woo_customer_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
```

### 9. Customer Prescriptions

```sql
CREATE TABLE prescriptions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  order_id INTEGER, -- Will reference orders table
  prescription_date DATE NOT NULL,
  
  -- Right Eye
  od_sph DECIMAL(4, 2),
  od_cyl DECIMAL(4, 2),
  od_axis INTEGER,
  od_add DECIMAL(3, 2),
  
  -- Left Eye
  os_sph DECIMAL(4, 2),
  os_cyl DECIMAL(4, 2),
  os_axis INTEGER,
  os_add DECIMAL(3, 2),
  
  -- Pupillary Distance
  pd DECIMAL(4, 1),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_customer_id ON prescriptions(customer_id);
```

### 10. Orders

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  woo_order_id BIGINT UNIQUE NOT NULL,
  order_number TEXT,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Order Details
  status TEXT NOT NULL, -- WooCommerce status
  cs_status TEXT NOT NULL CHECK (cs_status IN (
    'new_not_called', 'new_called', 'awaiting_payment', 
    'send_to_lab', 'in_lab', 'late_delivery', 'exchange',
    'not_printed', 'printed', 'packed', 'shipped', 'delivered', 'refund'
  )),
  
  -- Financial
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'BDT',
  
  -- Shipping
  shipping_address_1 TEXT,
  shipping_address_2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_postcode TEXT,
  shipping_country TEXT DEFAULT 'Bangladesh',
  
  -- Assignment & Tracking
  assigned_cs UUID REFERENCES user_profiles(id),
  source TEXT DEFAULT 'woocommerce', -- 'woocommerce', 'manual', 'phone'
  
  -- Flags
  is_prescription_order BOOLEAN DEFAULT false,
  needs_lab BOOLEAN DEFAULT false,
  is_priority BOOLEAN DEFAULT false,
  
  -- Dates
  created_date DATE NOT NULL,
  paid_date TIMESTAMPTZ,
  shipped_date TIMESTAMPTZ,
  delivered_date TIMESTAMPTZ,
  
  -- Sync
  sync_source TEXT DEFAULT 'woocommerce',
  last_synced_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_woo_id ON orders(woo_order_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_cs_status ON orders(cs_status);
CREATE INDEX idx_orders_assigned_cs ON orders(assigned_cs);
CREATE INDEX idx_orders_created_date ON orders(created_date);
```

### 11. Order Items

```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  sku_id INTEGER REFERENCES skus(id),
  sku TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  cost_per_unit DECIMAL(10, 2), -- For profit calculation
  lot_id INTEGER REFERENCES lots(id), -- Which lot fulfilled this item
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_sku_id ON order_items(sku_id);
```

### 12. Inventory Movements

```sql
CREATE TABLE inventory_movements (
  id SERIAL PRIMARY KEY,
  lot_id INTEGER REFERENCES lots(id),
  sku_id INTEGER REFERENCES skus(id),
  from_location_id INTEGER REFERENCES locations(id),
  to_location_id INTEGER REFERENCES locations(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'receive', 'sale', 'return', 'adjustment', 'transfer', 'damage'
  )),
  quantity INTEGER NOT NULL,
  reference_type TEXT, -- 'order', 'return', 'po', 'audit'
  reference_id INTEGER,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_lot_id ON inventory_movements(lot_id);
CREATE INDEX idx_movements_sku_id ON inventory_movements(sku_id);
CREATE INDEX idx_movements_created_at ON inventory_movements(created_at);
```

### 13. Returns

```sql
CREATE TABLE returns (
  id SERIAL PRIMARY KEY,
  return_id TEXT NOT NULL UNIQUE,
  order_id INTEGER REFERENCES orders(id),
  woo_order_id BIGINT,
  customer_id INTEGER REFERENCES customers(id),
  
  status TEXT NOT NULL CHECK (status IN ('expected', 'received', 'inspected', 'approved', 'rejected', 'refunded', 'exchanged')),
  reason TEXT,
  condition TEXT, -- 'unused', 'used', 'damaged', 'defective'
  
  -- Resolution
  resolution_type TEXT CHECK (resolution_type IN ('refund', 'exchange', 'store_credit')),
  refund_amount DECIMAL(10, 2),
  restocking_fee DECIMAL(10, 2) DEFAULT 0,
  
  -- Dates
  requested_date DATE NOT NULL,
  received_date DATE,
  processed_date DATE,
  
  -- Assignment
  assigned_to UUID REFERENCES user_profiles(id),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_returns_return_id ON returns(return_id);
CREATE INDEX idx_returns_order_id ON returns(order_id);
CREATE INDEX idx_returns_status ON returns(status);
```

### 14. Return Items

```sql
CREATE TABLE return_items (
  id SERIAL PRIMARY KEY,
  return_id INTEGER REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id INTEGER REFERENCES order_items(id),
  sku_id INTEGER REFERENCES skus(id),
  sku TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  return_to_stock BOOLEAN DEFAULT false,
  new_lot_id INTEGER REFERENCES lots(id), -- If restocked
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 15. Expenses

```sql
CREATE TABLE expenses (
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
  reference_type TEXT, -- 'po', 'order', 'general'
  reference_id INTEGER,
  receipt_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_type ON expenses(expense_type);
```

### 16. WooCommerce Integration Settings

```sql
CREATE TABLE woo_settings (
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
```

### 17. Store Profile Settings

```sql
CREATE TABLE store_profile (
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
```

### 18. Audit Logs

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

## Row Level Security (RLS) Policies

### Example RLS Policy for Orders
```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Admin can see everything
CREATE POLICY admin_all ON orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Warehouse Manager cannot see cost information
CREATE POLICY warehouse_no_costs ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'warehouse_manager'
    )
  );

-- CS can only see assigned orders
CREATE POLICY cs_assigned_orders ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'customer_service'
      AND (orders.assigned_cs = auth.uid() OR orders.assigned_cs IS NULL)
    )
  );
```

## Functions & Triggers

### Auto-update timestamp
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_skus_updated_at BEFORE UPDATE ON skus FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... apply to other tables
```

### Auto-calculate order totals
```sql
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET total = (
    SELECT COALESCE(SUM(total), 0)
    FROM order_items
    WHERE order_id = NEW.order_id
  ) + COALESCE(shipping_cost, 0) + COALESCE(tax, 0) - COALESCE(discount, 0)
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION calculate_order_total();
```

## Views for Reports

### Low Stock View
```sql
CREATE VIEW low_stock_view AS
SELECT 
  l.lot_id,
  s.sku,
  s.sku_name,
  loc.location_name,
  l.remaining_quantity,
  l.cost_per_unit
FROM lots l
JOIN skus s ON l.sku_id = s.id
JOIN locations loc ON l.location_id = loc.id
WHERE l.remaining_quantity < 20
ORDER BY l.remaining_quantity ASC;
```

### Profit Analysis View
```sql
CREATE VIEW profit_analysis_view AS
SELECT 
  o.id AS order_id,
  o.woo_order_id,
  o.created_date,
  o.total AS revenue,
  COALESCE(SUM(oi.quantity * oi.cost_per_unit), 0) AS cogs,
  o.total - COALESCE(SUM(oi.quantity * oi.cost_per_unit), 0) AS gross_profit,
  ((o.total - COALESCE(SUM(oi.quantity * oi.cost_per_unit), 0)) / NULLIF(o.total, 0)) * 100 AS profit_margin_pct
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;
```

## Indexes for Performance

All foreign keys should have indexes (already included above).
Additional composite indexes for common queries:

```sql
CREATE INDEX idx_lots_sku_location ON lots(sku_id, location_id);
CREATE INDEX idx_orders_status_date ON orders(cs_status, created_date DESC);
CREATE INDEX idx_movements_type_date ON inventory_movements(movement_type, created_at DESC);
```

## Notes

- All monetary values use DECIMAL to avoid floating-point precision issues
- Timestamps use TIMESTAMPTZ for proper timezone handling
- Foreign keys have ON DELETE CASCADE where appropriate
- Indexes are created on commonly queried columns
- RLS policies enforce role-based access control
- Audit logs track all important changes
