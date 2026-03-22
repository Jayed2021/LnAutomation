/*
  # Extend Suppliers Table & Add Supplier Catalogs

  ## Summary
  Extends the existing `suppliers` table with new fields for supplier identification,
  contact details, Alibaba store link, and payment method details (Alipay & WeChat Pay).
  Also creates a new `supplier_catalogs` table for tracking uploaded catalog files per supplier.

  ## Modified Tables

  ### `suppliers` — New Columns Added
  - `code` (text) - Short initial code the user assigns (e.g., "MQ", "QC")
  - `alibaba_url` (text) - Supplier's Alibaba store URL
  - `alipay_name` (text) - Alipay Chinese name (支付宝名称)
  - `alipay_email` (text) - Alipay email address
  - `alipay_qr_url` (text) - URL of uploaded Alipay QR code image
  - `wechat_name` (text) - WeChat Chinese name (微信名称)
  - `wechat_number` (text) - WeChat number/ID
  - `wechat_qr_url` (text) - URL of uploaded WeChat Pay QR code image

  ## New Tables

  ### `supplier_catalogs`
  - `id` (uuid, primary key)
  - `supplier_id` (uuid, FK to suppliers) - Which supplier this catalog belongs to
  - `file_name` (text) - Display name of the catalog file
  - `file_url` (text) - URL of the uploaded file in Supabase Storage
  - `uploaded_by` (uuid, FK to users) - Who uploaded the catalog
  - `uploaded_at` (timestamptz) - When it was uploaded (for date display)
  - `notes` (text, nullable) - Optional notes about this catalog version

  ## Security
  - RLS enabled on `supplier_catalogs`
  - Policies mirror the existing suppliers access pattern (admin and operations_manager only)
*/

-- Add new columns to suppliers table (all nullable, no required fields)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'code') THEN
    ALTER TABLE suppliers ADD COLUMN code text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'alibaba_url') THEN
    ALTER TABLE suppliers ADD COLUMN alibaba_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'alipay_name') THEN
    ALTER TABLE suppliers ADD COLUMN alipay_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'alipay_email') THEN
    ALTER TABLE suppliers ADD COLUMN alipay_email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'alipay_qr_url') THEN
    ALTER TABLE suppliers ADD COLUMN alipay_qr_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'wechat_name') THEN
    ALTER TABLE suppliers ADD COLUMN wechat_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'wechat_number') THEN
    ALTER TABLE suppliers ADD COLUMN wechat_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'wechat_qr_url') THEN
    ALTER TABLE suppliers ADD COLUMN wechat_qr_url text;
  END IF;
END $$;

-- Create supplier_catalogs table
CREATE TABLE IF NOT EXISTS supplier_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  notes text,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Operations Manager can view supplier catalogs"
  ON supplier_catalogs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can insert supplier catalogs"
  ON supplier_catalogs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can update supplier catalogs"
  ON supplier_catalogs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin and Operations Manager can delete supplier catalogs"
  ON supplier_catalogs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager')
      AND users.is_active = true
    )
  );

-- Index for fast lookups by supplier
CREATE INDEX IF NOT EXISTS idx_supplier_catalogs_supplier_id ON supplier_catalogs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_catalogs_uploaded_at ON supplier_catalogs(uploaded_at DESC);
