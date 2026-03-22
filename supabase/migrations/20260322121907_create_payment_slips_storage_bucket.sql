/*
  # Create payment-slips storage bucket

  Creates a storage bucket for payment slip files uploaded during PO creation.
  Files are stored under payment-slips/{po_id}/{payment_id}/{file_id}.ext
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-slips',
  'payment-slips',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read payment slips"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-slips');

CREATE POLICY "Allow authenticated upload payment slips"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-slips');

CREATE POLICY "Allow authenticated delete payment slips"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'payment-slips');
