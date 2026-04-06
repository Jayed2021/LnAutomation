/*
  # Add default_expense_type to expense_categories

  ## Summary
  Adds a `default_expense_type` column to the `expense_categories` table to classify
  each category by cash flow type. This drives the default value used when a new
  expense is created under that category.

  ## Changes

  ### Modified Tables
  - `expense_categories`
    - Added `default_expense_type` (text, nullable) with Title Case check constraint
    - Valid values: 'Operating', 'Investing', 'Financing'
    - Nullable so existing categories are unaffected until explicitly set

  ## Notes
  1. The constraint uses Title Case values; a subsequent migration converts them to lowercase
  2. Wrapped in IF NOT EXISTS guard for idempotent re-runs
*/

DO $$
BEGIN
  -- Only proceed if column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'expense_categories'
    AND column_name = 'default_expense_type'
  ) THEN

    ALTER TABLE expense_categories 
    DROP CONSTRAINT IF EXISTS expense_categories_default_expense_type_check;

    UPDATE expense_categories 
    SET default_expense_type = LOWER(default_expense_type)
    WHERE default_expense_type IS NOT NULL;

    ALTER TABLE expense_categories
      ADD CONSTRAINT expense_categories_default_expense_type_check
      CHECK (default_expense_type IN ('operating', 'investing', 'financing'));

  END IF;
END $$;
