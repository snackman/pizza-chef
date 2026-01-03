import {
  Customer,
  GameStats
} from '../types/game';
import { SCORING, GAME_CONFIG } from '../lib/constants';

/**
 * Calculates the score and bank reward for serving a customer.
 */
export const calculateCustomerScore = (
  customer: Customer,
  dogeMultiplier: number,
  streakMultiplier: number,
  isFirstSlice: boolean = false
): { points: number; bank: number } => {
  let baseScore = 0;

  if (isFirstSlice) {
    baseScore = SCORING.CUSTOMER_FIRST_SLICE;
  } else {
    baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
  }

  const points = Math.floor(baseScore * dogeMultiplier * streakMultiplier);
  const bank = SCORING.BASE_BANK_REWARD * dogeMultiplier;

  return { points, bank };
};

/**
 * Calculates the score for catching a dropped plate.
 */
export const calculatePlateScore = (
  dogeMultiplier: number,
  streakMultiplier: number
): number => {
  const baseScore = SCORING.PLATE_CAUGHT;
  return Math.floor(baseScore * dogeMultiplier * streakMultiplier);
};

/**
 * Calculates the score for defeating a boss minion.
 */
export const calculateMinionScore = (): number => {
  return SCORING.MINION_DEFEAT;
};

/**
 * Calculates the score for collecting a power-up.
 */
export const calculatePowerUpScore = (
  dogeMultiplier: number
): number => {
  return SCORING.POWERUP_COLLECTED * dogeMultiplier;
};

/**
 * Processes life gain logic based on happy customers count.
 * Returns the number of lives to add (0 or more).
 */
export const checkLifeGain = (
  currentLives: number,
  happyCustomers: number,
  dogeMultiplier: number,
  isCritic: boolean = false,
  criticPosition: number = 0
): { livesToAdd: number; shouldPlaySound: boolean } => {
  if (currentLives >= GAME_CONFIG.MAX_LIVES) {
    return { livesToAdd: 0, shouldPlaySound: false };
  }

  let livesToAdd = 0;

  // Critic bonus: served efficiently
  if (isCritic && criticPosition >= 50) {
    livesToAdd += 1;
  }

  // Normal bonus: every 8 happy customers
  // Note: We check if the *current* happyCustomers count triggers it.
  // The caller should increment happyCustomers *before* calling this if the current action made them happy.
  // HOWEVER, looking at legacy code:
  // "if (newState.happyCustomers % 8 === 0 ...)"
  // This implies we check the *accumulated* value.
  if (!isCritic && happyCustomers > 0 && happyCustomers % 8 === 0) {
    const stars = Math.min(dogeMultiplier, GAME_CONFIG.MAX_LIVES - currentLives);
    livesToAdd += stars;
  }

  // Cap at max lives
  const newTotal = Math.min(GAME_CONFIG.MAX_LIVES, currentLives + livesToAdd);
  const actualAdded = newTotal - currentLives;

  return {
    livesToAdd: actualAdded,
    shouldPlaySound: actualAdded > 0
  };
};

/**
 * Updates streak stats based on a successful action.
 */
export const updateStatsForStreak = (
  stats: GameStats,
  type: 'customer' | 'plate'
): GameStats => {
  const newStats = { ...stats };

  if (type === 'customer') {
    newStats.currentCustomerStreak += 1;
    if (newStats.currentCustomerStreak > newStats.longestCustomerStreak) {
      newStats.longestCustomerStreak = newStats.currentCustomerStreak;
    }
  } else if (type === 'plate') {
    newStats.currentPlateStreak += 1;
    if (newStats.currentPlateStreak > newStats.largestPlateStreak) {
      newStats.largestPlateStreak = newStats.currentPlateStreak;
    }
  }

  return newStats;
};
