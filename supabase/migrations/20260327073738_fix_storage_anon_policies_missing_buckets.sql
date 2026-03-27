/*
  # Fix Storage Anon Policies for Missing Buckets

  ## Overview
  The app uses custom auth (anon role). Several storage buckets are missing
  anon-role policies for INSERT/UPDATE/DELETE/SELECT, causing upload failures
  for store logos, prescription files, supplier assets, and payment slips.

  ## Buckets Fixed
  - store-assets (logo upload in Store Profile)
  - prescription-files (prescription uploads in order detail)
  - supplier-assets (supplier asset uploads)
  - payment-slips (payment slip uploads)
  - supplier-catalogs: missing UPDATE policy added

  ## Notes
  Only missing policies are added. Existing policies are untouched.
*/

-- store-assets
CREATE POLICY "Anon can upload store assets"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Anon can update store assets"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'store-assets')
  WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Anon can delete store assets"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'store-assets');

CREATE POLICY "Anon can read store assets"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'store-assets');

-- prescription-files
CREATE POLICY "Anon can upload prescription files"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'prescription-files');

CREATE POLICY "Anon can update prescription files"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'prescription-files')
  WITH CHECK (bucket_id = 'prescription-files');

CREATE POLICY "Anon can delete prescription files"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'prescription-files');

CREATE POLICY "Anon can read prescription files"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'prescription-files');

-- supplier-assets
CREATE POLICY "Anon can upload supplier assets"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'supplier-assets');

CREATE POLICY "Anon can update supplier assets"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'supplier-assets')
  WITH CHECK (bucket_id = 'supplier-assets');

CREATE POLICY "Anon can delete supplier assets"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'supplier-assets');

CREATE POLICY "Anon can read supplier assets"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'supplier-assets');

-- payment-slips
CREATE POLICY "Anon can upload payment slips"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'payment-slips');

CREATE POLICY "Anon can update payment slips"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'payment-slips')
  WITH CHECK (bucket_id = 'payment-slips');

CREATE POLICY "Anon can delete payment slips"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'payment-slips');

CREATE POLICY "Anon can read payment slips"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'payment-slips');

-- supplier-catalogs: missing UPDATE
CREATE POLICY "Anon can update supplier catalogs"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'supplier-catalogs')
  WITH CHECK (bucket_id = 'supplier-catalogs');
