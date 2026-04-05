/*
  # Add expense_type to expenses table

  ## Summary
  Adds a new `expense_type` column to the `expenses` table to classify expenses
  by cash flow category for future cash flow summary reporting.

  ## Changes

  ### Modified Tables
  - `expenses`
    - Added `expense_type` text column with check constraint
    - Valid values: 'operating', 'investing', 'financing'
    - Defaults to 'operating' for new records

  ## Backfill Logic
  Existing records are assigned types based on their top-level category:
  - "Stock Purchase" (category under Stock) -> investing
  - "Owner Withdrawal" (if present) -> financing
  - "Loan Repayment" / "Loan Interest" / "Director Salary" root categories -> financing
  - Everything else -> operating

  ## Notes
  1. The check constraint ensures only valid types can be stored
  2. All existing NULL values are backfilled immediately
  3. The default ensures future inserts without this field default to 'operating'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'expense_type'
  ) THEN
    ALTER TABLE expenses
      ADD COLUMN expense_type text NOT NULL DEFAULT 'operating'
      CHECK (expense_type IN ('operating', 'investing', 'financing'));
  END IF;
END $$;

UPDATE expenses e
SET expense_type = 'investing'
WHERE expense_type = 'operating'
  AND EXISTS (
    SELECT 1 FROM expense_categories ec
    WHERE ec.id = e.category_id
      AND (
        ec.name ILIKE '%stock purchase%'
        OR ec.parent_id IN (
          SELECT id FROM expense_categories WHERE name ILIKE '%stock%' AND parent_id IS NULL
        )
        OR ec.id IN (
          SELECT id FROM expense_categories WHERE name ILIKE '%stock purchase%'
        )
      )
  );

UPDATE expenses e
SET expense_type = 'financing'
WHERE expense_type = 'operating'
  AND EXISTS (
    SELECT 1 FROM expense_categories ec
    WHERE ec.id = e.category_id
      AND (
        ec.name ILIKE '%owner withdraw%'
        OR ec.name ILIKE '%loan repayment%'
        OR ec.name ILIKE '%loan refund%'
        OR ec.name ILIKE '%short-term loan%'
        OR ec.parent_id IN (
          SELECT id FROM expense_categories
          WHERE (name ILIKE '%loan%' OR name ILIKE '%director salary%')
            AND parent_id IS NULL
        )
        OR e.category_id IN (
          SELECT id FROM expense_categories
          WHERE parent_id IN (
            SELECT id FROM expense_categories
            WHERE (name ILIKE '%loan%' OR name ILIKE '%director salary%')
              AND parent_id IS NULL
          )
        )
      )
  );
