/*
  # Create audit_flags table

  ## Purpose
  Automatically surface locations that need a spot-check based on two triggers:
  1. large_variance — an audit counted a quantity that differs from expected by 20% or more
  2. fulfillment_overcount — a pick was created for a lot that would bring remaining quantity to zero or below

  ## New Tables
  - `audit_flags`
    - `id` — UUID primary key
    - `location_id` — which warehouse location is flagged
    - `product_id` — which product
    - `lot_id` — the specific lot that triggered the flag
    - `trigger_type` — 'large_variance' or 'fulfillment_overcount'
    - `variance_percentage` — numeric gap at the time of trigger (e.g. 25.0 means 25%)
    - `expected_quantity` — system quantity at the time of trigger
    - `counted_quantity` — counted quantity at time of trigger (null for fulfillment_overcount)
    - `status` — 'open' or 'resolved'
    - `created_at` — when the flag was raised
    - `resolved_at` — when the flag was cleared
    - `resolved_by` — user who resolved it
    - `resolved_by_audit_id` — the audit that auto-resolved the flag

  ## Security
  - RLS enabled
  - Authenticated users can read, insert, and update flags
*/

CREATE TABLE IF NOT EXISTS audit_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES warehouse_locations(id),
  product_id uuid NOT NULL REFERENCES products(id),
  lot_id uuid REFERENCES inventory_lots(id),
  trigger_type text NOT NULL CHECK (trigger_type IN ('large_variance', 'fulfillment_overcount')),
  variance_percentage numeric(6,2),
  expected_quantity integer,
  counted_quantity integer,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  resolved_by_audit_id uuid REFERENCES inventory_audits(id)
);

ALTER TABLE audit_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit flags"
  ON audit_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit flags"
  ON audit_flags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update audit flags"
  ON audit_flags FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS audit_flags_status_idx ON audit_flags(status);
CREATE INDEX IF NOT EXISTS audit_flags_location_id_idx ON audit_flags(location_id);
CREATE INDEX IF NOT EXISTS audit_flags_lot_id_idx ON audit_flags(lot_id);
