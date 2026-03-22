/*
  # Protect products.created_at as Immutable

  ## Purpose
  Ensures the created_at timestamp on the products table can never be overwritten after 
  the row is inserted, even via bulk operations, CSV imports, or direct SQL updates.

  ## Changes
  - Creates a trigger function `prevent_products_created_at_update` that raises an exception 
    if any UPDATE statement tries to change the created_at value
  - Attaches the trigger to the products table as a BEFORE UPDATE trigger

  ## Why This Matters
  created_at is used to sort products by newest-first in the UI. If it were overwritten 
  by a CSV bulk update or any other operation, the sort order would become incorrect and 
  the "newest product" guarantee would be lost.

  ## Notes
  - The trigger fires BEFORE the update, so the change is blocked before it reaches the table
  - Raises SQLSTATE '23514' (check_violation) with a descriptive message
  - Does not affect INSERT operations — only UPDATEs
*/

CREATE OR REPLACE FUNCTION prevent_products_created_at_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable and cannot be changed after product creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_created_at_immutable ON products;

CREATE TRIGGER trg_products_created_at_immutable
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION prevent_products_created_at_update();
