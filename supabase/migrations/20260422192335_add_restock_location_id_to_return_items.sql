/*
  # Add restock_location_id to return_items

  ## Summary
  Adds a nullable restock_location_id column to return_items so users can pre-assign
  a destination warehouse bin for each return item before physically restocking.
  This enables the "assign location inline, export sheet, walk the warehouse" workflow.

  ## Changes
  - return_items: add restock_location_id (uuid, nullable, FK to warehouse_locations)

  ## Notes
  - No RLS changes needed; inherits existing return_items policies
  - Cleared (set to null) after restock completes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'return_items' AND column_name = 'restock_location_id'
  ) THEN
    ALTER TABLE return_items
      ADD COLUMN restock_location_id uuid REFERENCES warehouse_locations(id) ON DELETE SET NULL;
  END IF;
END $$;
