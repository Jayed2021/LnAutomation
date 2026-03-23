/*
  # Fix Goods Receipt RLS Policies — Add Anon Access

  ## Problem
  The goods_receipt_sessions and goods_receipt_lines tables were created with
  `authenticated` role policies only. However, this application uses a custom
  auth system (not Supabase Auth), so all database access runs under the `anon`
  role. This caused 401 errors when any user tried to save or complete a
  goods receipt session.

  ## Changes
  1. goods_receipt_sessions — add full anon access policy (matching all other tables in the system)
  2. goods_receipt_lines — add full anon access policy (matching all other tables in the system)

  ## Notes
  - The existing `authenticated` policies are left in place (harmless)
  - This matches the access pattern used by all other tables in the system
*/

CREATE POLICY "Anon full access goods_receipt_sessions"
  ON goods_receipt_sessions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon full access goods_receipt_lines"
  ON goods_receipt_lines
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
