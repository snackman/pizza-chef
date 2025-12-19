import { supabase } from '../lib/supabase';
import { GameStats } from '../types/game';

export interface HighScore {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
}

export interface GameSession {
  id: string;
  player_name: string;
  score: number;
  level: number;
  slices_baked: number;
  customers_served: number;
  longest_streak: number;
  plates_caught: number;
  largest_plate_streak: number;
  oven_upgrades: number;
  power_ups_used: Record<string, number>;
  created_at: string;
}

export async function getTopScores(limit: number = 10): Promise<HighScore[]> {
  const { data, error } = await supabase
    .from('high_scores')
    .select('*')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching high scores:', error);
    return [];
  }

  return data || [];
}

export async function submitScore(playerName: string, score: number): Promise<boolean> {
  const { error } = await supabase
    .from('high_scores')
    .insert([{ player_name: playerName.toLowerCase(), score }]);

  if (error) {
    console.error('Error submitting score:', error);
    return false;
  }

  return true;
}

export async function createGameSession(
  playerName: string,
  score: number,
  level: number,
  stats: GameStats
): Promise<GameSession | null> {
  const { data, error } = await supabase
    .from('game_sessions')
    .insert([{
      player_name: playerName.toLowerCase(),
      score,
      level,
      slices_baked: stats.slicesBaked,
      customers_served: stats.customersServed,
      longest_streak: stats.longestCustomerStreak,
      plates_caught: stats.platesCaught,
      largest_plate_streak: stats.largestPlateStreak,
      oven_upgrades: stats.ovenUpgradesMade,
      power_ups_used: stats.powerUpsUsed,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating game session:', error);
    return null;
  }

  return data;
}

export async function getGameSession(id: string): Promise<GameSession | null> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching game session:', error);
    return null;
  }

  return data;
}
