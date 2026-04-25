/*
  # Fix category_slot_rules RLS for anon role

  The app uses custom username/password auth where all requests come in under
  the anon role (no Supabase JWT). Drop the authenticated-only policies and
  add an anon full-access policy to match the pattern used by warehouse_locations,
  warehouses, and other tables in this project.
*/

DROP POLICY IF EXISTS "Authenticated users can read category slot rules" ON category_slot_rules;
DROP POLICY IF EXISTS "Authenticated users can insert category slot rules" ON category_slot_rules;
DROP POLICY IF EXISTS "Authenticated users can update category slot rules" ON category_slot_rules;
DROP POLICY IF EXISTS "Authenticated users can delete category slot rules" ON category_slot_rules;

CREATE POLICY "Anon full access category_slot_rules"
  ON category_slot_rules
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
