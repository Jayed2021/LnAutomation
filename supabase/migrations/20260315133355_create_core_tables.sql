/*
  # Core ERP Database Schema - Part 1: Users, Roles, and Core Settings

  ## Overview
  This migration creates the foundational tables for user management, role-based access control,
  and core application settings for the Bangladesh Eyewear ERP system.

  ## New Tables
  
  ### `users`
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email for login
  - `full_name` (text) - User's full name
  - `role` (text) - One of: admin, operations_manager, warehouse_manager, customer_service, accounts
  - `is_active` (boolean) - Whether user can log in
  - `last_login` (timestamptz) - Last login timestamp
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `user_permissions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `module_name` (text) - Module identifier (purchase, inventory, fulfillment, etc.)
  - `can_view` (boolean) - View permission
  - `can_create` (boolean) - Create permission
  - `can_edit` (boolean) - Edit permission
  - `can_delete` (boolean) - Delete permission

  ### `app_settings`
  - `id` (uuid, primary key)
  - `key` (text, unique) - Setting key
  - `value` (jsonb) - Setting value
  - `updated_at` (timestamptz) - Last update timestamp
  - `updated_by` (uuid, foreign key to users)

  ### `store_profile`
  - `id` (uuid, primary key)
  - `store_name` (text) - Business name
  - `tagline` (text) - Store tagline/slogan
  - `logo_url` (text) - Logo image URL in Supabase Storage
  - `address_line1` (text)
  - `address_line2` (text)
  - `city` (text)
  - `postal_code` (text)
  - `country` (text)
  - `phone_primary` (text)
  - `phone_secondary` (text)
  - `email` (text)
  - `website` (text)
  - `tax_number` (text) - TIN/BIN number
  - `invoice_footer` (text) - Custom footer message
  - `business_type` (text) - Preset: eyewear, fashion, general, beauty, custom
  - `enable_prescription_lens` (boolean) - Feature flag
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated access based on roles
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'operations_manager', 'warehouse_manager', 'customer_service', 'accounts')),
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- User permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_name)
);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all permissions"
  ON user_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify settings"
  ON app_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Store profile table
CREATE TABLE IF NOT EXISTS store_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL,
  tagline text,
  logo_url text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text DEFAULT 'Bangladesh',
  phone_primary text,
  phone_secondary text,
  email text,
  website text,
  tax_number text,
  invoice_footer text,
  business_type text DEFAULT 'eyewear',
  enable_prescription_lens boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE store_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view store profile"
  ON store_profile FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify store profile"
  ON store_profile FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert default store profile
INSERT INTO store_profile (store_name, country, business_type, enable_prescription_lens)
VALUES ('My ERP Store', 'Bangladesh', 'eyewear', true)
ON CONFLICT DO NOTHING;