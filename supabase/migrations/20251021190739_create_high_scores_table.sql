/*
  # Create high scores table

  1. New Tables
    - `high_scores`
      - `id` (uuid, primary key) - Unique identifier for each score entry
      - `player_name` (text) - Name of the player who achieved the score
      - `score` (integer) - The score value achieved
      - `created_at` (timestamptz) - When the score was recorded
  
  2. Security
    - Enable RLS on `high_scores` table
    - Add policy for anyone to read high scores (public leaderboard)
    - Add policy for anyone to insert their own score (anonymous submission allowed)
  
  3. Indexes
    - Add index on score column for efficient sorting and retrieval of top scores
*/

-- Create high scores table
CREATE TABLE IF NOT EXISTS high_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL CHECK (char_length(player_name) >= 1 AND char_length(player_name) <= 50),
  score integer NOT NULL CHECK (score >= 0),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE high_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read high scores (public leaderboard)
CREATE POLICY "Anyone can view high scores"
  ON high_scores
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert their own score
CREATE POLICY "Anyone can submit a score"
  ON high_scores
  FOR INSERT
  WITH CHECK (true);

-- Create index for efficient retrieval of top scores
CREATE INDEX IF NOT EXISTS idx_high_scores_score_desc ON high_scores (score DESC, created_at DESC);