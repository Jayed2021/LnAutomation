/*
  # Fix Order Packaging Items RLS Policies — Add Anon Write Access

  ## Problem
  The order_packaging_items table has INSERT/UPDATE/DELETE policies only for the
  `authenticated` role, and those policies check `auth.uid()`. Since this application
  uses a custom session-based auth system (not Supabase Auth), all database calls run
  under the `anon` role — so `auth.uid()` is always NULL, the check always fails, and
  every insert is blocked with an RLS violation error.

  ## Changes
  1. order_packaging_items — add full anon access policy (matching all other tables in the system)

  ## Notes
  - The existing `authenticated` policies are left in place (harmless)
  - The existing `anon` SELECT policy is left in place (harmless, superseded by FOR ALL)
  - This matches the access pattern used by all other tables in the system
*/

CREATE POLICY "Anon full access order_packaging_items"
  ON order_packaging_items
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
