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
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_categories' AND column_name = 'default_expense_type'
  ) THEN
    ALTER TABLE expense_categories
      ADD COLUMN default_expense_type text
      CHECK (default_expense_type IN ('Operating', 'Investing', 'Financing'));
  END IF;
END $$;
