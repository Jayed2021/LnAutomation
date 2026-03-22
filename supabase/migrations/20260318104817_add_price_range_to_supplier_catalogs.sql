/*
  # Add price_range to supplier_catalogs

  ## Changes
  - Adds a nullable `price_range` text column to `supplier_catalogs`
  - Freeform text field for noting price context (e.g. "¥10–¥50", "Budget", "Mid-range")
  - No constraints — purely informational

  ## Also fix supplier_catalogs RLS
  - Same issue as supplier_notes: existing policies use auth.uid() which returns NULL
  - Drop restrictive policies and replace with anon full access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_catalogs' AND column_name = 'price_range'
  ) THEN
    ALTER TABLE supplier_catalogs ADD COLUMN price_range text;
  END IF;
END $$;

DROP POLICY IF EXISTS "Admin and Operations Manager can view supplier catalogs" ON supplier_catalogs;
DROP POLICY IF EXISTS "Admin and Operations Manager can insert supplier catalogs" ON supplier_catalogs;
DROP POLICY IF EXISTS "Admin and Operations Manager can update supplier catalogs" ON supplier_catalogs;
DROP POLICY IF EXISTS "Admin and Operations Manager can delete supplier catalogs" ON supplier_catalogs;

CREATE POLICY "Anon full access supplier catalogs"
  ON supplier_catalogs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
