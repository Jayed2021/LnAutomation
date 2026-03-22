/*
  # Supplier Type, Local Payment Accounts, and Supplier Notes

  ## Summary
  Extends the suppliers system to support both Chinese and local suppliers, with
  appropriate payment detail storage for each type, plus an append-only notes log.

  ## Changes

  ### Modified Tables

  #### `suppliers`
  - `supplier_type` (text, default 'chinese') — Distinguishes between 'chinese' and 'local' suppliers.
    Existing suppliers default to 'chinese' to preserve all existing data and behaviour.
  - `local_payment_accounts` (text, nullable) — Freeform multiline text for local suppliers to store
    payment account details (bank info, bKash, Nagad, etc.). Only relevant when supplier_type = 'local'.

  ### New Tables

  #### `supplier_notes`
  - `id` (uuid, PK)
  - `supplier_id` (uuid, FK → suppliers.id, CASCADE DELETE)
  - `note` (text, NOT NULL) — The note content
  - `created_by` (uuid, FK → users.id, nullable) — Who wrote the note
  - `created_at` (timestamptz, default now())

  ## Security
  - RLS enabled on `supplier_notes`
  - Same role-based access pattern as supplier_catalogs:
    admin and operations_manager roles can read, insert, delete

  ## Notes
  - `supplier_type` defaults to 'chinese' so all existing data is unaffected
  - `local_payment_accounts` is NULL for Chinese suppliers
  - Notes are append-only by design; no UPDATE policy is added
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'supplier_type'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN supplier_type text NOT NULL DEFAULT 'chinese';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'local_payment_accounts'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN local_payment_accounts text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS supplier_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_supplier_notes_supplier_id ON supplier_notes(supplier_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'supplier_notes' AND policyname = 'Admin and Operations Manager can read supplier notes'
  ) THEN
    CREATE POLICY "Admin and Operations Manager can read supplier notes"
      ON supplier_notes FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'operations_manager')
          AND users.is_active = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'supplier_notes' AND policyname = 'Admin and Operations Manager can insert supplier notes'
  ) THEN
    CREATE POLICY "Admin and Operations Manager can insert supplier notes"
      ON supplier_notes FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'operations_manager')
          AND users.is_active = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'supplier_notes' AND policyname = 'Admin and Operations Manager can delete supplier notes'
  ) THEN
    CREATE POLICY "Admin and Operations Manager can delete supplier notes"
      ON supplier_notes FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'operations_manager')
          AND users.is_active = true
        )
      );
  END IF;
END $$;
