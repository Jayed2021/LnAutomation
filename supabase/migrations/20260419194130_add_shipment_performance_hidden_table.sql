/*
  # Create shipment_performance_hidden table

  ## Purpose
  Stores user preferences for hiding specific shipments from the Shipment Performance report.
  This is a lightweight UI preference table — it does not affect PO status or any other data.

  ## New Tables
  - `shipment_performance_hidden`
    - `id` (uuid, primary key)
    - `shipment_db_id` (text, unique) — the shipment_db_id from the performance view
    - `hidden_at` (timestamptz) — when it was hidden
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - anon role can read, insert, and delete (this app uses custom auth with anon role for all operations)
*/

CREATE TABLE IF NOT EXISTS shipment_performance_hidden (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_db_id text UNIQUE NOT NULL,
  hidden_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shipment_performance_hidden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read hidden shipments"
  ON shipment_performance_hidden
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon can hide shipments"
  ON shipment_performance_hidden
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can unhide shipments"
  ON shipment_performance_hidden
  FOR DELETE
  TO anon
  USING (true);
