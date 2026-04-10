/*
  # P&L Packaging Cost Override Tables

  ## Purpose
  Allows users to manually set the total packaging material cost for a specific
  reporting period in the Profit & Loss report. This overrides the per-order
  aggregated estimate at the summary level only — individual order packaging costs
  are not affected.

  ## New Tables

  ### `pl_packaging_overrides`
  - One record per reporting period (period_from + period_to must be unique)
  - Stores the total manual cost and optional notes
  - Columns:
    - `id` (uuid, pk)
    - `period_from` (date) — start of the P&L reporting period
    - `period_to` (date) — end of the P&L reporting period
    - `total_cost` (numeric) — sum of all line item costs (denormalized for fast reads)
    - `notes` (text, nullable)
    - `created_by` (text) — username of whoever saved the override
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### `pl_packaging_override_items`
  - Child rows, one per packaging SKU in the override
  - Columns:
    - `id` (uuid, pk)
    - `override_id` (uuid, fk → pl_packaging_overrides ON DELETE CASCADE)
    - `product_id` (uuid, fk → products)
    - `sku` (text snapshot)
    - `product_name` (text snapshot)
    - `manual_quantity` (integer) — what the user entered
    - `avg_landed_cost_snapshot` (numeric) — landed cost at time of save
    - `line_cost` (numeric) — manual_quantity × avg_landed_cost_snapshot
    - `system_dispatch_qty` (integer) — audit snapshot of what system showed

  ## Security
  - RLS enabled on both tables
  - Anon role (used by the app's custom auth) can read and write both tables
*/

CREATE TABLE IF NOT EXISTS pl_packaging_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_from date NOT NULL,
  period_to date NOT NULL,
  total_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (period_from, period_to)
);

CREATE TABLE IF NOT EXISTS pl_packaging_override_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  override_id uuid NOT NULL REFERENCES pl_packaging_overrides(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  sku text NOT NULL DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  manual_quantity integer NOT NULL DEFAULT 0,
  avg_landed_cost_snapshot numeric NOT NULL DEFAULT 0,
  line_cost numeric NOT NULL DEFAULT 0,
  system_dispatch_qty integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pl_packaging_overrides_period
  ON pl_packaging_overrides(period_from, period_to);

CREATE INDEX IF NOT EXISTS idx_pl_packaging_override_items_override_id
  ON pl_packaging_override_items(override_id);

ALTER TABLE pl_packaging_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE pl_packaging_override_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select pl_packaging_overrides"
  ON pl_packaging_overrides FOR SELECT
  TO anon USING (true);

CREATE POLICY "Anon can insert pl_packaging_overrides"
  ON pl_packaging_overrides FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Anon can update pl_packaging_overrides"
  ON pl_packaging_overrides FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete pl_packaging_overrides"
  ON pl_packaging_overrides FOR DELETE
  TO anon USING (true);

CREATE POLICY "Anon can select pl_packaging_override_items"
  ON pl_packaging_override_items FOR SELECT
  TO anon USING (true);

CREATE POLICY "Anon can insert pl_packaging_override_items"
  ON pl_packaging_override_items FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Anon can update pl_packaging_override_items"
  ON pl_packaging_override_items FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete pl_packaging_override_items"
  ON pl_packaging_override_items FOR DELETE
  TO anon USING (true);
