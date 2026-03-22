/*
  # Create supplier-catalogs storage bucket

  ## Changes
  - Creates a public storage bucket named "supplier-catalogs" for catalog file uploads
  - Sets a 20MB file size limit suitable for PDF catalogs and images
  - Allows anon read and write access (matching the app's auth model)

  ## Notes
  - Files are stored here only when users explicitly upload them
  - External links (Google Drive, etc.) are stored as URLs and do not use this bucket
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplier-catalogs',
  'supplier-catalogs',
  true,
  20971520,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anon can upload supplier catalogs"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'supplier-catalogs');

CREATE POLICY "Anon can read supplier catalogs"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'supplier-catalogs');

CREATE POLICY "Anon can delete supplier catalogs"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'supplier-catalogs');
