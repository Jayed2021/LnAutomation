/*
  # Create fraud_alert_settings table

  ## Purpose
  Stores the FraudBD API integration configuration for the application.

  ## New Tables
  - `fraud_alert_settings`
    - `id` (uuid, primary key) - Single row table using a fixed UUID
    - `api_key` (text) - The FraudBD API key (nullable when not yet configured)
    - `is_enabled` (boolean) - Whether fraud alerting is active
    - `use_sandbox` (boolean) - Whether to use the FraudBD sandbox environment
    - `created_at` (timestamptz) - Record creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - RLS enabled
  - Only authenticated users can read or update settings
  - No delete policy (settings row should persist)

  ## Notes
  1. Designed as a singleton table — only one row should exist
  2. Sandbox key is publicly known (from FraudBD docs) and used for testing
*/

CREATE TABLE IF NOT EXISTS fraud_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text,
  is_enabled boolean NOT NULL DEFAULT false,
  use_sandbox boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fraud_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fraud alert settings"
  ON fraud_alert_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert fraud alert settings"
  ON fraud_alert_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fraud alert settings"
  ON fraud_alert_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
