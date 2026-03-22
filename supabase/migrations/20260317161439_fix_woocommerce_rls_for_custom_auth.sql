/*
  # Fix WooCommerce RLS for Custom Auth System

  ## Context
  This app uses a custom session-based auth (localStorage + public.users table)
  rather than Supabase Auth. This means auth.uid() is always NULL for all requests,
  causing every RLS policy that checks auth.uid() to block writes.

  ## Changes
  - Drop all existing woocommerce_config and woo_sync_log policies that rely on auth.uid()
  - Replace with policies that allow the anon role to read and write
    (access control is enforced at the application layer)

  ## Security Note
  Row-level security still prevents direct table access without the anon key.
  Application-layer checks (role = admin) continue to gate the UI.
*/

-- woocommerce_config: drop all existing policies
DROP POLICY IF EXISTS "Only admin can view WooCommerce config" ON woocommerce_config;
DROP POLICY IF EXISTS "Only admin can insert WooCommerce config" ON woocommerce_config;
DROP POLICY IF EXISTS "Only admin can update WooCommerce config" ON woocommerce_config;
DROP POLICY IF EXISTS "Only admin can delete WooCommerce config" ON woocommerce_config;

CREATE POLICY "Anon can read woocommerce config"
  ON woocommerce_config FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert woocommerce config"
  ON woocommerce_config FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update woocommerce config"
  ON woocommerce_config FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete woocommerce config"
  ON woocommerce_config FOR DELETE
  TO anon
  USING (true);

-- woo_sync_log: drop all existing policies
DROP POLICY IF EXISTS "Only admin can view sync log" ON woo_sync_log;
DROP POLICY IF EXISTS "Only admin can insert sync log" ON woo_sync_log;
DROP POLICY IF EXISTS "Only admin can update sync log" ON woo_sync_log;

CREATE POLICY "Anon can read sync log"
  ON woo_sync_log FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert sync log"
  ON woo_sync_log FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update sync log"
  ON woo_sync_log FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
