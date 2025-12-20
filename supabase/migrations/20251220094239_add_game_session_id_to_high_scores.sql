/*
  # Add game session link to high scores

  1. Changes
    - Add `game_session_id` column to `high_scores` table
    - Creates a foreign key relationship to `game_sessions` table
    - This enables linking each high score entry to its detailed game session data

  2. Notes
    - Column is nullable to support existing scores without sessions
    - Foreign key includes ON DELETE CASCADE to maintain referential integrity
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'high_scores' AND column_name = 'game_session_id'
  ) THEN
    ALTER TABLE high_scores 
    ADD COLUMN game_session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;
