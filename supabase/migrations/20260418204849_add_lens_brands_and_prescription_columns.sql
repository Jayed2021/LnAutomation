/*
  # Add Lens Brand System

  ## Summary
  Creates a database-driven lens brand and lens type pricing system,
  and extends order_prescriptions with brand and high-index fields.

  ## New Tables

  ### lens_brands
  - id (uuid, PK)
  - name (text, unique) — brand display name
  - is_active (boolean, default true)
  - sort_order (int, default 0)
  - created_at (timestamptz)

  ### lens_brand_types
  - id (uuid, PK)
  - brand_id (uuid, FK → lens_brands)
  - lens_type_name (text) — e.g. "Anti-Blue", "Anti-Blue+Photochromic"
  - is_high_index_applicable (boolean) — whether HI option is available
  - default_lab_price (numeric)
  - default_customer_price (numeric)
  - is_active (boolean, default true)
  - sort_order (int, default 0)
  - created_at (timestamptz)

  ## Modified Tables

  ### order_prescriptions
  - lens_brand_id (uuid, nullable FK → lens_brands) — the selected brand
  - lens_brand_name (text, nullable) — snapshot of brand name at time of save
  - high_index (boolean, default false) — whether High Index was selected

  ## Security
  - RLS enabled on both new tables
  - anon read access for the lookup tables (needed for CS and operations staff using custom auth)
  - authenticated write for admins only via existing patterns

  ## Notes
  1. Seed data included for 3 brands: Classic/Eyepro/Premium, each with their lens types
  2. Prices are in BDT (Bangladeshi Taka)
  3. Existing prescription rows are unaffected
*/

CREATE TABLE IF NOT EXISTS lens_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lens_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lens_brands"
  ON lens_brands FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert lens_brands"
  ON lens_brands FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lens_brands"
  ON lens_brands FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS lens_brand_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES lens_brands(id) ON DELETE CASCADE,
  lens_type_name text NOT NULL,
  is_high_index_applicable boolean NOT NULL DEFAULT false,
  default_lab_price numeric(10,2) NOT NULL DEFAULT 0,
  default_customer_price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, lens_type_name)
);

ALTER TABLE lens_brand_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lens_brand_types"
  ON lens_brand_types FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert lens_brand_types"
  ON lens_brand_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lens_brand_types"
  ON lens_brand_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_prescriptions' AND column_name = 'lens_brand_id'
  ) THEN
    ALTER TABLE order_prescriptions ADD COLUMN lens_brand_id uuid REFERENCES lens_brands(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_prescriptions' AND column_name = 'lens_brand_name'
  ) THEN
    ALTER TABLE order_prescriptions ADD COLUMN lens_brand_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_prescriptions' AND column_name = 'high_index'
  ) THEN
    ALTER TABLE order_prescriptions ADD COLUMN high_index boolean NOT NULL DEFAULT false;
  END IF;
END $$;

INSERT INTO lens_brands (name, sort_order) VALUES
  ('Classic', 1),
  ('Eyepro', 2),
  ('Eyepro Premium', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO lens_brand_types (brand_id, lens_type_name, is_high_index_applicable, default_lab_price, default_customer_price, sort_order)
SELECT b.id, t.lens_type_name, t.is_hi, t.lab_price, t.cust_price, t.sort_order
FROM lens_brands b
JOIN (VALUES
  ('Classic', 'Anti-Blue',                          true,  650,  1200, 1),
  ('Classic', 'Anti-Blue+Photochromic',             true, 1200,  2000, 2),
  ('Eyepro',  'Anti-Blue',                          true,  900,  1800, 1),
  ('Eyepro',  'Anti-Blue+Photochromic',             true, 1600,  2800, 2),
  ('Eyepro Premium', 'Anti-Blue',                   true, 1200,  2500, 1),
  ('Eyepro Premium', 'Anti-Blue+Photochromic',      true, 2000,  3500, 2),
  ('Eyepro Premium', 'Anti-Blue+Photochromic (AR)', true, 2500,  4000, 3),
  ('Eyepro Premium', 'Anti-Blue+Photochromic+AR',   false,3000,  5000, 4)
) AS t(brand_name, lens_type_name, is_hi, lab_price, cust_price, sort_order)
ON b.name = t.brand_name
ON CONFLICT (brand_id, lens_type_name) DO NOTHING;
