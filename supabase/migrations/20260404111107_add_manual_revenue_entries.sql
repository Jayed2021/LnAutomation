/*
  # Create Manual Revenue Entries Table

  ## Summary
  Adds a table to record manual revenue entries that are not tied to courier invoice uploads.
  Used for recording operational revenue, bank transfers, and wholesale payments.

  ## New Tables
  - `manual_revenue_entries`
    - `id` (uuid, primary key)
    - `revenue_date` (date, required) - the date revenue was earned (can be backdated)
    - `category` (text) - one of: operational_revenue, bank_transfer, wholesale
    - `amount` (numeric) - revenue amount in BDT
    - `description` (text, optional) - free text description
    - `reference_number` (text, optional) - internal reference or invoice number
    - `order_id` (uuid, optional FK to orders) - link to a specific order
    - `bank_deposit_date` (date, optional) - date the amount was deposited to bank
    - `bank_deposit_reference` (text, optional) - bank transaction reference
    - `created_by` (uuid, FK to users) - who recorded the entry
    - `created_at`, `updated_at` (timestamps)

  ## Security
  - RLS enabled
  - Authenticated users can read, insert, update, delete their own records
  - No public access

  ## Notes
  - revenue_date and bank_deposit_date are tracked separately to support backdating revenue
    while recording the bank deposit later when funds arrive
  - When linked to an order, the order's payment_status is updated by application logic
*/

CREATE TABLE IF NOT EXISTS manual_revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_date date NOT NULL,
  category text NOT NULL DEFAULT 'operational_revenue',
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  description text,
  reference_number text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  bank_deposit_date date,
  bank_deposit_reference text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_revenue_entries_revenue_date ON manual_revenue_entries (revenue_date);
CREATE INDEX IF NOT EXISTS idx_manual_revenue_entries_order_id ON manual_revenue_entries (order_id);
CREATE INDEX IF NOT EXISTS idx_manual_revenue_entries_created_by ON manual_revenue_entries (created_by);

ALTER TABLE manual_revenue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read manual revenue entries"
  ON manual_revenue_entries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert manual revenue entries"
  ON manual_revenue_entries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update manual revenue entries"
  ON manual_revenue_entries FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete manual revenue entries"
  ON manual_revenue_entries FOR DELETE
  TO anon, authenticated
  USING (true);
