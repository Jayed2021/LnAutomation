/*
  # Fix lens_brands and lens_brand_types RLS for anon role

  This app uses custom authentication where users operate as the `anon` role.
  The INSERT/UPDATE policies on both lens tables must also allow `anon` access,
  matching the pattern used by every other writable table in this project.
*/

DROP POLICY IF EXISTS "Authenticated users can insert lens_brands" ON lens_brands;
DROP POLICY IF EXISTS "Authenticated users can update lens_brands" ON lens_brands;
DROP POLICY IF EXISTS "Authenticated users can insert lens_brand_types" ON lens_brand_types;
DROP POLICY IF EXISTS "Authenticated users can update lens_brand_types" ON lens_brand_types;

CREATE POLICY "Anon and authenticated can insert lens_brands"
  ON lens_brands FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anon and authenticated can update lens_brands"
  ON lens_brands FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon and authenticated can insert lens_brand_types"
  ON lens_brand_types FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anon and authenticated can update lens_brand_types"
  ON lens_brand_types FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
