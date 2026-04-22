/*
  # Add per-action timestamps to returns

  ## Summary
  Adds three dedicated timestamp columns to the returns table so each view
  can group and display by the exact moment that specific action occurred,
  rather than relying on the shared updated_at field.

  ## New Columns
  - returns.received_at    — set when status transitions to 'received'
  - returns.qc_completed_at — set when status transitions to 'qc_passed' or 'qc_failed'
  - returns.restocked_at   — set when status transitions to 'restocked'

  ## Notes
  - All columns are nullable; older records without these values fall back to updated_at
  - No RLS changes needed; inherits existing returns policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'received_at'
  ) THEN
    ALTER TABLE returns ADD COLUMN received_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'qc_completed_at'
  ) THEN
    ALTER TABLE returns ADD COLUMN qc_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'restocked_at'
  ) THEN
    ALTER TABLE returns ADD COLUMN restocked_at timestamptz;
  END IF;
END $$;
