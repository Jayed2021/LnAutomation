/*
  # CS Assignment Counter and RLS Fixes

  ## Purpose
  Adds a persistent counter to track the round-robin position for weighted CS order assignment.
  This counter is stored in app_settings and survives across sessions so that repeated
  distribution runs continue the sequence from where the last one left off.

  ## Changes

  ### 1. app_settings key: cs_assignment_counter
  - Inserts a default row with key = 'cs_assignment_counter' and value = '0'
  - This integer counter tracks how many orders have been assigned total (mod sequence length)

  ### 2. cs_assignments RLS for anon role
  - Adds anon full access policy to cs_assignments so the custom-auth (anon-role) frontend
    can read and write CS assignment configuration, matching the pattern used by other settings tables

  ## Notes
  - The counter is stored as text (matching app_settings schema) and parsed as integer in the frontend
  - The counter increments by the number of orders distributed in each batch
  - Anon access matches the existing pattern for app_settings, courier_configs, etc.
*/

INSERT INTO app_settings (key, value)
VALUES ('cs_assignment_counter', '0')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Anon full access cs_assignments" ON cs_assignments;

CREATE POLICY "Anon full access cs_assignments"
  ON cs_assignments FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
