/*
  # Add UNIQUE constraint on warehouse_locations.barcode

  ## Overview
  Adds a unique constraint to the barcode column on warehouse_locations so that
  each barcode can only belong to one location. This enables safe upsert-on-barcode
  during CSV imports and prevents duplicate scan conflicts.

  ## Changes
  - `warehouse_locations.barcode` — adds a UNIQUE constraint (NULLs are still allowed;
    only non-NULL values must be unique)

  ## Notes
  - Existing rows with NULL barcodes are unaffected
  - If any duplicate non-NULL barcodes already exist this migration will fail; 
    in that case deduplicate first
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'warehouse_locations_barcode_key'
      AND conrelid = 'warehouse_locations'::regclass
  ) THEN
    ALTER TABLE warehouse_locations ADD CONSTRAINT warehouse_locations_barcode_key UNIQUE (barcode);
  END IF;
END $$;
