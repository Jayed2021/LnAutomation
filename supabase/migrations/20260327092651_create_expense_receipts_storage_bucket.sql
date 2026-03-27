/*
  # Create expense-receipts Storage Bucket

  ## Summary
  Creates a private Supabase Storage bucket for expense receipt files
  (PNG, JPG, PDF) with a 10MB file size limit.

  ## Security
  - Only admin, operations_manager, and accounts roles can upload, read,
    and delete receipts
  - Uses the custom users table for role checks (consistent with other
    storage policies in this project)
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Finance roles can upload expense receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'accounts')
      AND users.is_active = true
    )
  );

CREATE POLICY "Finance roles can view expense receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'accounts')
      AND users.is_active = true
    )
  );

CREATE POLICY "Finance roles can delete expense receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operations_manager', 'accounts')
      AND users.is_active = true
    )
  );
