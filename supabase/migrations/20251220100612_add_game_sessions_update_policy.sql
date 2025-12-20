/*
  # Add UPDATE policy for game_sessions table

  1. Changes
    - Add policy to allow anyone to update game sessions
    - This is needed so that scorecard images can be attached to game sessions after creation
  
  2. Security
    - Allow public UPDATE access since this is a public leaderboard game
    - Users can only update the scorecard_image_url field through the application logic
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'game_sessions' 
    AND policyname = 'Anyone can update game sessions'
  ) THEN
    CREATE POLICY "Anyone can update game sessions"
      ON game_sessions
      FOR UPDATE
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
