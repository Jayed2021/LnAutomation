/*
  # Fix fraud_alert_settings RLS for custom auth

  ## Purpose
  The app uses a custom authentication system (username/password via the users table),
  not Supabase's native auth. All requests arrive under the `anon` role, so the existing
  `authenticated`-only policies block every read/write.

  ## Changes
  - Drops the three authenticated-only policies
  - Adds a full-access policy for the `anon` role, matching the pattern used by
    app_settings and other settings tables in this project

  ## Security Notes
  - Access control for this table is enforced at the application layer
  - This matches the established pattern for all other settings tables in this codebase
*/

DROP POLICY IF EXISTS "Authenticated users can read fraud alert settings" ON fraud_alert_settings;
DROP POLICY IF EXISTS "Authenticated users can insert fraud alert settings" ON fraud_alert_settings;
DROP POLICY IF EXISTS "Authenticated users can update fraud alert settings" ON fraud_alert_settings;

CREATE POLICY "Anon full access fraud_alert_settings"
  ON fraud_alert_settings FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
