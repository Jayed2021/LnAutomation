/*
  # Add anon role storage policies for expense-receipts bucket

  ## Problem
  The expense-receipts bucket only has policies for `authenticated` role using
  `auth.uid()`. However, this application uses a custom auth system (username/password
  stored in a users table, not Supabase Auth). The Supabase client runs as the `anon`
  role, so `auth.uid()` is always NULL and the existing policies never match.

  This means NO user can upload, view, or delete expense receipts.

  ## Fix
  Add storage policies for the `anon` role on the `expense-receipts` bucket,
  consistent with how other buckets in this project are handled (store-assets,
  prescription-files, product-images, payment-slips, etc.).
*/

CREATE POLICY "Anon can upload expense receipts"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'expense-receipts');

CREATE POLICY "Anon can read expense receipts"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'expense-receipts');

CREATE POLICY "Anon can update expense receipts"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'expense-receipts')
  WITH CHECK (bucket_id = 'expense-receipts');

CREATE POLICY "Anon can delete expense receipts"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'expense-receipts');
