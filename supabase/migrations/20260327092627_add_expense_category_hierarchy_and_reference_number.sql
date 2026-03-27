/*
  # Expense Category Hierarchy & Reference Number

  ## Summary
  Extends the expense_categories table to support a two-tier parent/subcategory
  hierarchy and a configurable per-subcategory "affects profit" default. Also adds
  a reference_number column to the expenses table for invoice/receipt references.

  ## Changes

  ### Modified Tables

  #### `expense_categories`
  - `parent_id` (uuid, nullable FK to self) — null = top-level parent category
  - `affects_profit_default` (boolean, default true) — configurable per subcategory;
    admin can toggle in the Category Manager panel
  - `sort_order` (integer, default 0) — controls display ordering within a parent

  #### `expenses`
  - `reference_number` (text, nullable) — for invoice numbers, receipt references, etc.

  ## Data Migration
  - Clears the existing flat seeded categories (no expense data exists yet)
  - Re-seeds a full two-tier hierarchy matching the business P&L structure from
    the provided screenshots

  ## Category Structure Seeded
  - Stock: Stock Purchase, Import Charge, Additional Lens Exp, 3D Printing Product Exp
  - Packaging: Cover Purchase, Chain Cover Purchase, Bag Purchase, Cloth Purchase,
      Box Purchase, Label Purchase, Poly Purchase, Thank You Card
  - Marketing: Facebook Marketing, Others Marketing, Printing, Photography, Google Storage
  - Refund: Customer Refund, Loan Refund, Short-term Loan Refund (affects_profit_default = false)
  - Operating > Fixed Operating: Operation Fee, Salary, Eid Bonus, Office/Rent,
      Technology, VAT & Tax, Misc
  - Operating > Others Operating: Electricity Bill, Conveyance Bill, Internet Bill,
      Bua Bill, Alpha Bill, SMS Bill, Labour Bill, Mobile Bill, Accessories/Equipment,
      Product Customize, Stationary, Booking/Return, Entertainment, Water, Ifter,
      Accommodation Expenses, Delivery Charge, Cleaning Exp
  - Director Salary: Salary
  - Employee Bonus: Sales/Performance
  - Loan Interest: Interest Paid
  - Misc: Bank Charge

  ## Security
  - No RLS changes required; existing policies cover new columns
*/

-- Add parent_id for hierarchy support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE expense_categories ADD COLUMN parent_id uuid REFERENCES expense_categories(id);
  END IF;
END $$;

-- Add affects_profit_default for per-subcategory profit toggle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_categories' AND column_name = 'affects_profit_default'
  ) THEN
    ALTER TABLE expense_categories ADD COLUMN affects_profit_default boolean DEFAULT true;
  END IF;
END $$;

-- Add sort_order for display ordering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_categories' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE expense_categories ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Add reference_number to expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'reference_number'
  ) THEN
    ALTER TABLE expenses ADD COLUMN reference_number text;
  END IF;
END $$;

-- Remove old flat categories (safe: no expense data yet)
DELETE FROM expense_categories;

-- Seed parent categories
INSERT INTO expense_categories (id, name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Stock',          NULL, true,  1, true),
  ('10000000-0000-0000-0000-000000000002', 'Packaging',      NULL, true,  2, true),
  ('10000000-0000-0000-0000-000000000003', 'Marketing',      NULL, true,  3, true),
  ('10000000-0000-0000-0000-000000000004', 'Refund',         NULL, false, 4, true),
  ('10000000-0000-0000-0000-000000000005', 'Operating',      NULL, true,  5, true),
  ('10000000-0000-0000-0000-000000000006', 'Director Salary',NULL, true,  6, true),
  ('10000000-0000-0000-0000-000000000007', 'Employee Bonus', NULL, true,  7, true),
  ('10000000-0000-0000-0000-000000000008', 'Loan Interest',  NULL, false, 8, true),
  ('10000000-0000-0000-0000-000000000009', 'Misc',           NULL, true,  9, true)
ON CONFLICT (name) DO NOTHING;

-- Operating sub-groups (children of Operating, parents of leaf nodes)
INSERT INTO expense_categories (id, name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('10000000-0000-0000-0000-000000000010', 'Fixed Operating',  '10000000-0000-0000-0000-000000000005', true, 1, true),
  ('10000000-0000-0000-0000-000000000011', 'Others Operating', '10000000-0000-0000-0000-000000000005', true, 2, true)
ON CONFLICT (name) DO NOTHING;

-- Stock subcategories
INSERT INTO expense_categories (name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('Stock Purchase',          '10000000-0000-0000-0000-000000000001', true, 1, true),
  ('Import Charge',           '10000000-0000-0000-0000-000000000001', true, 2, true),
  ('Additional Lens Exp',     '10000000-0000-0000-0000-000000000001', true, 3, true),
  ('3D Printing Product Exp', '10000000-0000-0000-0000-000000000001', true, 4, true)
ON CONFLICT (name) DO NOTHING;

-- Packaging subcategories
INSERT INTO expense_categories (name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('Cover Purchase',        '10000000-0000-0000-0000-000000000002', true, 1, true),
  ('Chain Cover Purchase',  '10000000-0000-0000-0000-000000000002', true, 2, true),
  ('Bag Purchase',          '10000000-0000-0000-0000-000000000002', true, 3, true),
  ('Cloth Purchase',        '10000000-0000-0000-0000-000000000002', true, 4, true),
  ('Box Purchase',          '10000000-0000-0000-0000-000000000002', true, 5, true),
  ('Label Purchase',        '10000000-0000-0000-0000-000000000002', true, 6, true),
  ('Poly Purchase',         '10000000-0000-0000-0000-000000000002', true, 7, true),
  ('Thank You Card',        '10000000-0000-0000-0000-000000000002', true, 8, true)
ON CONFLICT (name) DO NOTHING;

-- Marketing subcategories
INSERT INTO expense_categories (name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('Facebook Marketing', '10000000-0000-0000-0000-000000000003', true, 1, true),
  ('Others Marketing',   '10000000-0000-0000-0000-000000000003', true, 2, true),
  ('Printing',           '10000000-0000-0000-0000-000000000003', true, 3, true),
  ('Photography',        '10000000-0000-0000-0000-000000000003', true, 4, true),
  ('Google Storage',     '10000000-0000-0000-0000-000000000003', true, 5, true)
ON CONFLICT (name) DO NOTHING;

-- Refund subcategories (affects_profit_default = false)
INSERT INTO expense_categories (name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('Customer Refund',         '10000000-0000-0000-0000-000000000004', false, 1, true),
  ('Loan Refund',             '10000000-0000-0000-0000-000000000004', false, 2, true),
  ('Short-term Loan Refund',  '10000000-0000-0000-0000-000000000004', false, 3, true)
ON CONFLICT (name) DO NOTHING;

-- Fixed Operating subcategories (children of Fixed Operating sub-group)
INSERT INTO expense_categories (name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('Operation Fee', '10000000-0000-0000-0000-000000000010', true, 1, true),
  ('Salary',        '10000000-0000-0000-0000-000000000010', true, 2, true),
  ('Eid Bonus',     '10000000-0000-0000-0000-000000000010', true, 3, true),
  ('Office/Rent',   '10000000-0000-0000-0000-000000000010', true, 4, true),
  ('Technology',    '10000000-0000-0000-0000-000000000010', true, 5, true),
  ('VAT & Tax',     '10000000-0000-0000-0000-000000000010', true, 6, true),
  ('Misc',          '10000000-0000-0000-0000-000000000010', true, 7, true)
ON CONFLICT (name) DO NOTHING;

-- Others Operating subcategories (children of Others Operating sub-group)
INSERT INTO expense_categories (name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('Electricity Bill',       '10000000-0000-0000-0000-000000000011', true,  1, true),
  ('Conveyance Bill',        '10000000-0000-0000-0000-000000000011', true,  2, true),
  ('Internet Bill',          '10000000-0000-0000-0000-000000000011', true,  3, true),
  ('Bua Bill',               '10000000-0000-0000-0000-000000000011', true,  4, true),
  ('Alpha Bill',             '10000000-0000-0000-0000-000000000011', true,  5, true),
  ('SMS Bill',               '10000000-0000-0000-0000-000000000011', true,  6, true),
  ('Labour Bill',            '10000000-0000-0000-0000-000000000011', true,  7, true),
  ('Mobile Bill',            '10000000-0000-0000-0000-000000000011', true,  8, true),
  ('Accessories/Equipment',  '10000000-0000-0000-0000-000000000011', true,  9, true),
  ('Product Customize',      '10000000-0000-0000-0000-000000000011', true, 10, true),
  ('Stationary',             '10000000-0000-0000-0000-000000000011', true, 11, true),
  ('Booking/Return',         '10000000-0000-0000-0000-000000000011', true, 12, true),
  ('Entertainment',          '10000000-0000-0000-0000-000000000011', true, 13, true),
  ('Water',                  '10000000-0000-0000-0000-000000000011', true, 14, true),
  ('Ifter',                  '10000000-0000-0000-0000-000000000011', true, 15, true),
  ('Accommodation Expenses', '10000000-0000-0000-0000-000000000011', true, 16, true),
  ('Delivery Charge',        '10000000-0000-0000-0000-000000000011', true, 17, true),
  ('Cleaning Exp',           '10000000-0000-0000-0000-000000000011', true, 18, true)
ON CONFLICT (name) DO NOTHING;

-- Director Salary subcategories
INSERT INTO expense_categories (name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('Director Salary - Salary', '10000000-0000-0000-0000-000000000006', true, 1, true)
ON CONFLICT (name) DO NOTHING;

-- Employee Bonus subcategories
INSERT INTO expense_categories (name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('Sales/Performance', '10000000-0000-0000-0000-000000000007', true, 1, true)
ON CONFLICT (name) DO NOTHING;

-- Loan Interest subcategories (affects_profit_default = false)
INSERT INTO expense_categories (name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('Interest Paid', '10000000-0000-0000-0000-000000000008', false, 1, true)
ON CONFLICT (name) DO NOTHING;

-- Misc subcategories
INSERT INTO expense_categories (name, parent_id, affects_profit_default, sort_order, is_active) VALUES
  ('Bank Charge', '10000000-0000-0000-0000-000000000009', true, 1, true)
ON CONFLICT (name) DO NOTHING;

-- Add index for hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_expense_categories_parent_id ON expense_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
