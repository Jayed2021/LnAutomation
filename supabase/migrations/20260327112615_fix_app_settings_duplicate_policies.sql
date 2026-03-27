/*
  # Fix duplicate RLS policies on app_settings

  ## Problem
  The original create_core_tables migration used CREATE POLICY without idempotency guards.
  When re-applied to a database that already has these policies, it throws error 42710.

  ## Changes
  - Drops existing policies on app_settings before recreating them
  - Ensures the three policies are correctly in place after migration
*/

DROP POLICY IF EXISTS "All authenticated users can view settings" ON app_settings;
DROP POLICY IF EXISTS "Only admins can modify settings" ON app_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON app_settings;

CREATE POLICY "All authenticated users can view settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify settings"
  ON app_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
