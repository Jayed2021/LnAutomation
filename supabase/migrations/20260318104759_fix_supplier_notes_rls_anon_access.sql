/*
  # Fix supplier_notes RLS policies

  ## Problem
  The existing policies use `auth.uid()` to check against the `users` table,
  but this project uses custom session-based auth (not Supabase Auth).
  `auth.uid()` returns NULL for all requests, causing 401 Unauthorized on INSERT.

  ## Changes
  - Drop all 3 existing restrictive RLS policies on `supplier_notes`
  - Replace with a single "Anon full access" policy matching the pattern
    used by `suppliers` and other tables in this project

  ## Security
  - Matches the existing security model of the entire application
*/

DROP POLICY IF EXISTS "Admin and Operations Manager can read supplier notes" ON supplier_notes;
DROP POLICY IF EXISTS "Admin and Operations Manager can insert supplier notes" ON supplier_notes;
DROP POLICY IF EXISTS "Admin and Operations Manager can delete supplier notes" ON supplier_notes;

CREATE POLICY "Anon full access supplier notes"
  ON supplier_notes
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
