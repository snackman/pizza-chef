/*
  # Add scorecard image URL to game sessions

  1. Changes
    - Add `scorecard_image_url` column to `game_sessions` table
    - This stores the URL to the uploaded scorecard image for each game session

  2. Notes
    - Column is nullable to support existing sessions without images
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'scorecard_image_url'
  ) THEN
    ALTER TABLE game_sessions 
    ADD COLUMN scorecard_image_url text;
  END IF;
END $$;
