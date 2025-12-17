/*
  # Create game sessions table for shareable score cards

  1. New Tables
    - `game_sessions`
      - `id` (uuid, primary key) - Unique identifier for sharing score cards
      - `player_name` (text) - Name of the player
      - `score` (integer) - Final score achieved
      - `level` (integer) - Level reached
      - `slices_baked` (integer) - Total pizza slices baked
      - `customers_served` (integer) - Total customers served
      - `longest_streak` (integer) - Longest customer service streak
      - `plates_caught` (integer) - Total plates caught
      - `largest_plate_streak` (integer) - Largest plate catch streak
      - `oven_upgrades` (integer) - Number of oven upgrades purchased
      - `power_ups_used` (jsonb) - Breakdown of power-ups used
      - `created_at` (timestamptz) - When the game was played

  2. Security
    - Enable RLS on `game_sessions` table
    - Add policy for anyone to read game sessions (public viewing)
    - Add policy for anyone to insert their own game session

  3. Indexes
    - Add index on score column for leaderboard queries
    - Add index on created_at for recent games
*/

CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL CHECK (char_length(player_name) >= 1 AND char_length(player_name) <= 50),
  score integer NOT NULL CHECK (score >= 0),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  slices_baked integer NOT NULL DEFAULT 0 CHECK (slices_baked >= 0),
  customers_served integer NOT NULL DEFAULT 0 CHECK (customers_served >= 0),
  longest_streak integer NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  plates_caught integer NOT NULL DEFAULT 0 CHECK (plates_caught >= 0),
  largest_plate_streak integer NOT NULL DEFAULT 0 CHECK (largest_plate_streak >= 0),
  oven_upgrades integer NOT NULL DEFAULT 0 CHECK (oven_upgrades >= 0),
  power_ups_used jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game sessions"
  ON game_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create a game session"
  ON game_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_game_sessions_score_desc ON game_sessions (score DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions (created_at DESC);
