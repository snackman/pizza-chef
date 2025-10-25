/*
  # Temporarily allow anonymous sprite uploads

  This allows the upload script to work with the anon key.
  In production, you'd want to remove this and only allow authenticated uploads.
*/

DROP POLICY IF EXISTS "Authenticated users can upload sprites" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update sprites" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete sprites" ON storage.objects;

CREATE POLICY "Anyone can upload sprites"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'sprites');

CREATE POLICY "Anyone can update sprites"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'sprites')
  WITH CHECK (bucket_id = 'sprites');

CREATE POLICY "Anyone can delete sprites"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'sprites');
