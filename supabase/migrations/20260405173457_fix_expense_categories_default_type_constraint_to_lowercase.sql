/*
  # Fix expense_categories default_expense_type constraint to lowercase

  ## Summary
  The expense_categories table has a CHECK constraint requiring Title Case values
  for default_expense_type. This migration updates it to use lowercase values to
  match the frontend and the expenses table constraint.

  ## Changes
  - Drop old Title Case constraint
  - UPDATE existing Title Case values to lowercase
  - Add new lowercase constraint
*/

ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS expense_categories_default_expense_type_check;

UPDATE expense_categories SET default_expense_type = 'operating' WHERE default_expense_type = 'Operating';
UPDATE expense_categories SET default_expense_type = 'investing' WHERE default_expense_type = 'Investing';
UPDATE expense_categories SET default_expense_type = 'financing' WHERE default_expense_type = 'Financing';

ALTER TABLE expense_categories
  ADD CONSTRAINT expense_categories_default_expense_type_check
  CHECK (default_expense_type IN ('operating', 'investing', 'financing'));
