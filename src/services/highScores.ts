import { supabase } from '../lib/supabase';
import { GameStats } from '../types/game';

const LOCAL_SCORES_KEY = 'pizza_chef_high_scores';
const LOCAL_SESSIONS_KEY = 'pizza_chef_game_sessions';

export interface HighScore {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
  game_session_id?: string;
}

// Local storage helpers
function getLocalScores(): HighScore[] {
  try {
    const data = localStorage.getItem(LOCAL_SCORES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalScores(scores: HighScore[]): void {
  try {
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(scores));
  } catch {
    console.warn('Failed to save scores to local storage');
  }
}

function getLocalSessions(): GameSession[] {
  try {
    const data = localStorage.getItem(LOCAL_SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: GameSession[]): void {
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    console.warn('Failed to save sessions to local storage');
  }
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
  // Try Supabase first
  if (supabase) {
    const { data, error } = await supabase
      .from('high_scores')
      .select('*')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (!error && data) {
      return data;
    }
    console.warn('Supabase fetch failed, falling back to local storage:', error);
  }

  // Fall back to local storage
  const localScores = getLocalScores();
  return localScores
    .sort((a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, limit);
}

export async function checkIfTopScore(score: number, limit: number = 10): Promise<boolean> {
  const topScores = await getTopScores(limit);

  if (topScores.length < limit) {
    return true; // Less than 10 scores, any score qualifies
  }

  const lowestTopScore = topScores[topScores.length - 1]?.score ?? 0;
  return score > lowestTopScore;
}

export async function checkIfNumberOneScore(score: number): Promise<boolean> {
  const topScores = await getTopScores(1);

  if (topScores.length === 0) {
    return true; // No scores yet, this is #1
  }

  return score >= topScores[0].score;
}

export async function submitScore(playerName: string, score: number, gameSessionId?: string): Promise<boolean> {
  // Try Supabase first
  if (supabase) {
    const { error } = await supabase
      .from('high_scores')
      .insert([{ player_name: playerName.toLowerCase(), score, game_session_id: gameSessionId }]);

    if (!error) {
      return true;
    }
    console.warn('Supabase submit failed, falling back to local storage:', error);
  }

  // Fall back to local storage
  const localScores = getLocalScores();
  const newScore: HighScore = {
    id: crypto.randomUUID(),
    player_name: playerName.toLowerCase(),
    score,
    created_at: new Date().toISOString(),
    game_session_id: gameSessionId
  };
  localScores.push(newScore);
  saveLocalScores(localScores);
  return true;
}

export async function createGameSession(
  playerName: string,
  score: number,
  level: number,
  stats: GameStats
): Promise<GameSession | null> {
  // Try Supabase first
  if (supabase) {
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

    if (!error && data) {
      return data;
    }
    console.warn('Supabase session create failed, falling back to local storage:', error);
  }

  // Fall back to local storage
  const localSessions = getLocalSessions();
  const newSession: GameSession = {
    id: crypto.randomUUID(),
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
    created_at: new Date().toISOString()
  };
  localSessions.push(newSession);
  saveLocalSessions(localSessions);
  return newSession;
}

export async function getGameSession(id: string): Promise<GameSession | null> {
  // Try Supabase first
  if (supabase) {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
    console.warn('Supabase session fetch failed, falling back to local storage:', error);
  }

  // Fall back to local storage
  const localSessions = getLocalSessions();
  return localSessions.find(s => s.id === id) || null;
}

export async function uploadScorecardImage(gameSessionId: string, blob: Blob): Promise<string | null> {
  if (!supabase) {
    console.warn('Supabase not configured - cannot upload scorecard');
    return null;
  }

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
  if (!supabase) {
    console.warn('Supabase not configured - cannot update game session');
    return false;
  }

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
