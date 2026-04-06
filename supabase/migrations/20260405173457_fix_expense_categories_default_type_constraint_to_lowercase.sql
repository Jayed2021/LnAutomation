/*
  # Fix expense_categories default_expense_type constraint to lowercase (SAFE VERSION)
*/

DO $$
BEGIN
  -- Step 1: Ensure column exists (critical fix)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'expense_categories'
    AND column_name = 'default_expense_type'
  ) THEN
    ALTER TABLE expense_categories
      ADD COLUMN default_expense_type text;
  END IF;

  -- Step 2: Drop old constraint safely
  ALTER TABLE expense_categories 
  DROP CONSTRAINT IF EXISTS expense_categories_default_expense_type_check;

  -- Step 3: Normalize data safely
  UPDATE expense_categories 
  SET default_expense_type = LOWER(default_expense_type)
  WHERE default_expense_type IS NOT NULL;

  -- Step 4: Add new constraint
  ALTER TABLE expense_categories
    ADD CONSTRAINT expense_categories_default_expense_type_check
    CHECK (default_expense_type IN ('operating', 'investing', 'financing'));

END $$;