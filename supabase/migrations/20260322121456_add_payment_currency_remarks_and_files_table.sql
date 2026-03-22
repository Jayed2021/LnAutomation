/*
  # Enhance supplier payments with multi-currency support and payment files

  1. Modified Tables
    - `supplier_payments`
      - `payment_currency` (text): the currency of the entered amount (USD, CNY, BDT)
      - `amount_original` (numeric): the raw amount in the chosen payment_currency
      - `cnY_to_usd_rate` (numeric): CNY→USD rate stored at payment time (for CNY payments)
      - `amount_usd_equivalent` (numeric): USD-equivalent of this payment (for balance tracking)
      - `remarks` (text, nullable): free-text notes per payment

  2. New Tables
    - `supplier_payment_files`
      - `id` (uuid, primary key)
      - `payment_id` (uuid, FK → supplier_payments.id)
      - `file_url` (text)
      - `file_name` (text)
      - `file_size` (bigint, nullable)
      - `uploaded_by` (uuid, FK → users.id, nullable)
      - `uploaded_at` (timestamptz, default now())

  3. Security
    - RLS enabled on `supplier_payment_files`
    - Policies for authenticated users matching custom JWT uid
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_payments' AND column_name = 'payment_currency'
  ) THEN
    ALTER TABLE supplier_payments ADD COLUMN payment_currency text DEFAULT 'BDT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_payments' AND column_name = 'amount_original'
  ) THEN
    ALTER TABLE supplier_payments ADD COLUMN amount_original numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_payments' AND column_name = 'cny_to_usd_rate'
  ) THEN
    ALTER TABLE supplier_payments ADD COLUMN cny_to_usd_rate numeric DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_payments' AND column_name = 'amount_usd_equivalent'
  ) THEN
    ALTER TABLE supplier_payments ADD COLUMN amount_usd_equivalent numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_payments' AND column_name = 'remarks'
  ) THEN
    ALTER TABLE supplier_payments ADD COLUMN remarks text DEFAULT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS supplier_payment_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT NULL,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_payment_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payment files"
  ON supplier_payment_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid
        AND users.is_active = true
    )
  );

CREATE POLICY "Authenticated users can insert payment files"
  ON supplier_payment_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid
        AND users.is_active = true
    )
  );

CREATE POLICY "Authenticated users can delete own payment files"
  ON supplier_payment_files FOR DELETE
  TO authenticated
  USING (
    uploaded_by = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid
        AND users.role IN ('admin', 'operations_manager')
    )
  );
