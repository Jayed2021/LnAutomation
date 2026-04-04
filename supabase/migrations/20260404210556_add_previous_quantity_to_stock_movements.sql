/*
  # Add previous_quantity to stock_movements

  ## Summary
  Adds a `previous_quantity` column to the `stock_movements` table to record
  the lot's stock level before the movement occurred, enabling before/after
  audit trails for every stock change — particularly useful for return restocks.

  ## Changes
  ### Modified Tables
  - `stock_movements`
    - `previous_quantity` (integer, nullable): The lot's remaining_quantity
      before this movement was applied. NULL for historical records created
      before this migration.

  ## Notes
  - Column is nullable so existing historical records are unaffected.
  - New code in RestockModal will populate this for all future return_restock movements.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements' AND column_name = 'previous_quantity'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN previous_quantity integer;
  END IF;
END $$;
