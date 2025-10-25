import { supabase } from '../lib/supabase';

export interface HighScore {
  id: string;
  player_name: string;
  score: number;
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
    .insert([{ player_name: playerName, score }]);

  if (error) {
    console.error('Error submitting score:', error);
    return false;
  }

  return true;
}
