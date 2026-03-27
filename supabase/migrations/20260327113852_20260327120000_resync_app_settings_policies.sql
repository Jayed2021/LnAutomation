/*
  # Resync app_settings RLS policies

  ## Purpose
  Drops all existing policies on app_settings and recreates them cleanly.
  This resolves any duplicate policy conflicts caused by prior migrations
  that did not use IF EXISTS guards, including the "Anon full access app_settings"
  policy that was added by the RLS overhaul migration.

  ## Changes
  - Drops all four known policies on app_settings
  - Recreates authenticated SELECT, INSERT (admin only), and UPDATE (admin only) policies
  - Recreates anon full-access policy for the app_settings table
*/

DROP POLICY IF EXISTS "All authenticated users can view settings" ON app_settings;
DROP POLICY IF EXISTS "Only admins can modify settings" ON app_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON app_settings;
DROP POLICY IF EXISTS "Anon full access app_settings" ON app_settings;

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

CREATE POLICY "Anon full access app_settings"
  ON app_settings FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
