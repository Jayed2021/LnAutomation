/*
  # Create Product Images Storage Bucket

  ## Summary
  Creates a public storage bucket for product images with appropriate access policies.

  ## Changes
  1. Creates a `product-images` storage bucket
     - Public bucket (images served without auth)
     - 5MB max file size
     - Accepts JPEG, PNG, WebP image types

  2. Storage policies
     - Anon read: anyone can view images
     - Anon write: authenticated sessions (anon role) can upload
     - Anon update: can replace existing images
     - Anon delete: can remove images
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anon can read product images"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'product-images');

CREATE POLICY "Anon can upload product images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Anon can update product images"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Anon can delete product images"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'product-images');
