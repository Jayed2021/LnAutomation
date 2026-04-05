/*
  # Fix expense_type constraint to use lowercase values

  ## Summary
  The expenses table has a CHECK constraint requiring Title Case values
  ('Operating', 'Investing', 'Financing') but the frontend now sends lowercase
  values ('operating', 'investing', 'financing'). This migration drops the old
  constraint, backfills existing Title Case data to lowercase, and adds a new
  constraint accepting lowercase values.

  ## Changes
  - Drop old `expenses_expense_type_check` constraint (Title Case)
  - UPDATE all existing rows to lowercase equivalents
  - Add new CHECK constraint accepting lowercase values
*/

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check;

UPDATE expenses SET expense_type = 'operating' WHERE expense_type = 'Operating';
UPDATE expenses SET expense_type = 'investing' WHERE expense_type = 'Investing';
UPDATE expenses SET expense_type = 'financing' WHERE expense_type = 'Financing';

ALTER TABLE expenses
  ADD CONSTRAINT expenses_expense_type_check
  CHECK (expense_type IN ('operating', 'investing', 'financing'));
