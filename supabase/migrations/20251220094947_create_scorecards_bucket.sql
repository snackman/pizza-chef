/*
  # Create scorecards storage bucket

  1. New Storage Bucket
    - `scorecards` - Stores scorecard images from game sessions

  2. Security
    - Public access for reading scorecards
    - Anyone can upload (anonymous users can submit scores)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('scorecards', 'scorecards', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read access to scorecards"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'scorecards');

CREATE POLICY "Allow anyone to upload scorecards"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'scorecards');
