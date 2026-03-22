/*
  # Integration and Settings Tables

  ## Overview
  Creates tables for storing integration configurations (WooCommerce, Couriers, SMS)
  and CS assignment settings.

  ## New Tables

  ### `woocommerce_config`
  - `id` (uuid, primary key)
  - `store_url` (text)
  - `consumer_key` (text) - Encrypted
  - `consumer_secret` (text) - Encrypted
  - `is_connected` (boolean)
  - `last_product_sync` (timestamptz)
  - `last_order_sync` (timestamptz)
  - `updated_at` (timestamptz)

  ### `courier_configs`
  - `id` (uuid, primary key)
  - `courier_name` (text) - pathao, steadfast, redx, sundarban
  - `is_enabled` (boolean)
  - `environment` (text) - sandbox, production
  - `base_url` (text)
  - `credentials` (jsonb) - Encrypted credentials object
  - `updated_at` (timestamptz)

  ### `sms_config`
  - `id` (uuid, primary key)
  - `provider` (text) - greenweb
  - `is_enabled` (boolean)
  - `api_token` (text) - Encrypted
  - `base_url` (text)
  - `use_ssl` (boolean)
  - `use_json` (boolean)
  - `updated_at` (timestamptz)

  ### `cs_assignments`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `allocation_percentage` (integer) - 0-100
  - `is_active` (boolean)
  - `updated_at` (timestamptz)

  ### `sms_templates`
  - `id` (uuid, primary key)
  - `name` (text) - Template name
  - `template_text` (text) - Message template
  - `template_type` (text) - order_confirmation, shipping, delivery, payment_reminder
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Only Admin can access integration configs
*/

-- WooCommerce config table
CREATE TABLE IF NOT EXISTS woocommerce_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_url text,
  consumer_key text,
  consumer_secret text,
  is_connected boolean DEFAULT false,
  last_product_sync timestamptz,
  last_order_sync timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE woocommerce_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view WooCommerce config"
  ON woocommerce_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Only admin can manage WooCommerce config"
  ON woocommerce_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Courier configs table
CREATE TABLE IF NOT EXISTS courier_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_name text UNIQUE NOT NULL,
  is_enabled boolean DEFAULT false,
  environment text DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  base_url text,
  credentials jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE courier_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view courier configs"
  ON courier_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Only admin can manage courier configs"
  ON courier_configs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- SMS config table
CREATE TABLE IF NOT EXISTS sms_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text DEFAULT 'greenweb',
  is_enabled boolean DEFAULT false,
  api_token text,
  base_url text DEFAULT 'https://api.greenweb.com.bd/api.php',
  use_ssl boolean DEFAULT true,
  use_json boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sms_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view SMS config"
  ON sms_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Only admin can manage SMS config"
  ON sms_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- CS assignments table
CREATE TABLE IF NOT EXISTS cs_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allocation_percentage integer DEFAULT 0 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cs_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view CS assignments"
  ON cs_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admin can manage CS assignments"
  ON cs_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- SMS templates table
CREATE TABLE IF NOT EXISTS sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_text text NOT NULL,
  template_type text CHECK (template_type IN ('order_confirmation', 'shipping', 'delivery', 'payment_reminder')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view SMS templates"
  ON sms_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admin can manage SMS templates"
  ON sms_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Insert default SMS templates
INSERT INTO sms_templates (name, template_text, template_type) VALUES
  ('Order Confirmation', 'Thank you for your order! Order #{order_number} has been confirmed. We will contact you shortly for delivery.', 'order_confirmation'),
  ('Shipping Notification', 'Your order #{order_number} has been shipped via {courier}. Tracking: {tracking_number}', 'shipping'),
  ('Delivery Confirmation', 'Your order #{order_number} has been delivered. Thank you for shopping with us!', 'delivery'),
  ('Payment Reminder', 'Reminder: Payment pending for order #{order_number}. Total: ৳{amount}', 'payment_reminder')
ON CONFLICT DO NOTHING;

-- Insert default courier configs
INSERT INTO courier_configs (courier_name, is_enabled, environment, base_url) VALUES
  ('pathao', false, 'sandbox', 'https://courier-api-sandbox.pathao.com'),
  ('steadfast', false, 'sandbox', 'https://portal.packzy.com/api/v1'),
  ('redx', false, 'production', 'https://api.redx.com.bd/v1'),
  ('sundarban', false, 'production', 'https://api.sbcourier.com/api/v1')
ON CONFLICT DO NOTHING;

-- Insert default WooCommerce config row
INSERT INTO woocommerce_config (is_connected) VALUES (false)
ON CONFLICT DO NOTHING;

-- Insert default SMS config row
INSERT INTO sms_config (is_enabled) VALUES (false)
ON CONFLICT DO NOTHING;