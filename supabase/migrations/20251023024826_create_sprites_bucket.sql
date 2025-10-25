/*
  # Create Sprites Storage Bucket

  1. Storage Setup
    - Create public 'sprites' bucket for game sprite images
    - Enable public access for reading sprite files
  
  2. Security
    - Allow public SELECT access to sprites
    - Restrict INSERT/UPDATE/DELETE to authenticated users only
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sprites', 'sprites', true, 5242880)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view sprites"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sprites');

CREATE POLICY "Authenticated users can upload sprites"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sprites');

CREATE POLICY "Authenticated users can update sprites"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'sprites')
  WITH CHECK (bucket_id = 'sprites');

CREATE POLICY "Authenticated users can delete sprites"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'sprites');
