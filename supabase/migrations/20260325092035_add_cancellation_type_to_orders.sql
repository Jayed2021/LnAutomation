/*
  # Add cancellation_type to orders

  ## Summary
  Previously, both "Cancel Before Dispatch" (CBD) and "Cancel After Dispatch" (CAD)
  wrote the same value ('cancelled') to cs_status, making them indistinguishable.

  ## Changes
  1. Add `cancellation_type` column to orders table with values 'cbd' or 'cad'
  2. Add two new cs_status values: 'cancelled_cbd' and 'cancelled_cad'
     - New CBD cancellations will use cs_status = 'cancelled_cbd'
     - New CAD cancellations will use cs_status = 'cancelled_cad'
     - Existing 'cancelled' orders remain unchanged (plain Cancelled label)

  ## Notes
  - No existing data is modified
  - cancellation_type column is nullable for backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cancellation_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN cancellation_type text CHECK (cancellation_type IN ('cbd', 'cad'));
  END IF;
END $$;
