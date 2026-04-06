DO $$
BEGIN
  -- Add column if missing
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'expense_categories'
    AND column_name = 'default_expense_type'
  ) THEN
    ALTER TABLE expense_categories
      ADD COLUMN default_expense_type text;
  END IF;
END $$;