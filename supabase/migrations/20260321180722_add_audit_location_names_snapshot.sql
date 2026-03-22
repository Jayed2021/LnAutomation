/*
  # Add location_names snapshot to inventory_audits

  ## Changes
  - Adds `location_names` (text) column to `inventory_audits` to store a
    comma-separated snapshot of location codes at the time the audit was
    created. This is denormalized intentionally so the audit record remains
    readable even if locations are later renamed or deleted.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_audits' AND column_name = 'location_names'
  ) THEN
    ALTER TABLE inventory_audits ADD COLUMN location_names text;
  END IF;
END $$;
