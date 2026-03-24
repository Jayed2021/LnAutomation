/*
  # Create prescription-files storage bucket policies

  ## Summary
  Sets up RLS policies for the prescription-files storage bucket so authenticated
  users can upload and read prescription documents (PDFs and images).

  The actual bucket must be created via the Supabase dashboard or storage API.
  These policies will apply once the bucket exists.
*/

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('prescription-files', 'prescription-files', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO storage.buckets (id, name, public)
  VALUES ('store-assets', 'store-assets', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated can upload prescription files'
  ) THEN
    CREATE POLICY "Authenticated can upload prescription files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'prescription-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public can read prescription files'
  ) THEN
    CREATE POLICY "Public can read prescription files"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'prescription-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated can delete prescription files'
  ) THEN
    CREATE POLICY "Authenticated can delete prescription files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'prescription-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated can upload store assets'
  ) THEN
    CREATE POLICY "Authenticated can upload store assets"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'store-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public can read store assets'
  ) THEN
    CREATE POLICY "Public can read store assets"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'store-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated can update store assets'
  ) THEN
    CREATE POLICY "Authenticated can update store assets"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'store-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated can delete store assets'
  ) THEN
    CREATE POLICY "Authenticated can delete store assets"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'store-assets');
  END IF;
END $$;
