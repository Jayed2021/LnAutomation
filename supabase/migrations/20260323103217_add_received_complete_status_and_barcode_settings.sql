/*
  # Add received_complete PO status and barcode label size settings

  ## Changes

  ### 1. purchase_orders status constraint update
  - Adds `received_complete` as a valid status between `partially_received` and `closed`
  - This allows the PO to be marked as fully received while still requiring a report to be
    generated before the user can manually close it

  ### 2. New table: barcode_label_settings
  - Stores the physical label dimensions for barcode printing
  - `label_width_in` - width in inches (default 1.5 for standard product label paper)
  - `label_height_in` - height in inches (default 1.0 for standard product label paper)
  - `barcode_format` - barcode format type (default CODE128)
  - `dpi` - print resolution (default 300 DPI for label printers)
  - Single-row table (only one settings record)

  ## Security
  - RLS enabled on barcode_label_settings
  - Authenticated users can read/insert/update settings
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'purchase_orders_status_check'
    AND table_name = 'purchase_orders'
  ) THEN
    ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_status_check;
  END IF;
END $$;

ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'ordered', 'confirmed', 'partially_received', 'received_complete', 'closed'));

CREATE TABLE IF NOT EXISTS barcode_label_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_width_in numeric NOT NULL DEFAULT 1.5,
  label_height_in numeric NOT NULL DEFAULT 1.0,
  barcode_format text NOT NULL DEFAULT 'CODE128',
  dpi integer NOT NULL DEFAULT 300,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE barcode_label_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read barcode_label_settings"
  ON barcode_label_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert barcode_label_settings"
  ON barcode_label_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update barcode_label_settings"
  ON barcode_label_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO barcode_label_settings (label_width_in, label_height_in, barcode_format, dpi)
VALUES (1.5, 1.0, 'CODE128', 300)
ON CONFLICT DO NOTHING;
