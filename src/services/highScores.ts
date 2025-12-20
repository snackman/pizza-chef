import { supabase } from '../lib/supabase';
import { GameStats } from '../types/game';

export interface HighScore {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
  game_session_id?: string;
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
  scorecard_image_url?: string;
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

export async function submitScore(playerName: string, score: number, gameSessionId?: string): Promise<boolean> {
  const { error } = await supabase
    .from('high_scores')
    .insert([{ player_name: playerName.toLowerCase(), score, game_session_id: gameSessionId }]);

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

export async function uploadScorecardImage(gameSessionId: string, blob: Blob): Promise<string | null> {
  const fileName = `${gameSessionId}.png`;
  const { error } = await supabase.storage
    .from('scorecards')
    .upload(fileName, blob, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) {
    console.error('Error uploading scorecard image:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('scorecards')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

export async function updateGameSessionImage(gameSessionId: string, imageUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('game_sessions')
    .update({ scorecard_image_url: imageUrl })
    .eq('id', gameSessionId);

  if (error) {
    console.error('Error updating game session image:', error);
    return false;
  }

  return true;
}
