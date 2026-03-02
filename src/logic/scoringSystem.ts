import {
  Customer,
  GameStats,
  GameState
} from '../types/game';
import { SCORING, GAME_CONFIG } from '../lib/constants';
import { getCustomerVariant } from '../types/game';

/**
 * Options for applying customer scoring to game state
 */
export interface CustomerScoringOptions {
  includeBank: boolean;       // Whether to add bank reward
  countsAsServed: boolean;    // Whether to increment happyCustomers and stats
  isFirstSlice: boolean;      // Whether this is a first slice (drooling/partial)
  checkLifeGain: boolean;     // Whether to check for life gain bonus
}

/**
 * Result of applying customer scoring
 */
export interface CustomerScoringResult {
  scoreToAdd: number;
  bankToAdd: number;
  newHappyCustomers: number;
  newStats: GameStats;
  livesToAdd: number;
  shouldPlayLifeSound: boolean;
  floatingScore: { points: number; lane: number; position: number };
  starGain?: { lane: number; position: number };
}

/**
 * Applies customer scoring to game state - consolidates repeated scoring logic
 */
export const applyCustomerScoring = (
  customer: Customer,
  state: GameState,
  dogeMultiplier: number,
  streakMultiplier: number,
  options: CustomerScoringOptions
): CustomerScoringResult => {
  const { points, bank } = calculateCustomerScore(
    customer,
    dogeMultiplier,
    streakMultiplier,
    options.isFirstSlice
  );

  let newHappyCustomers = state.happyCustomers;
  let newStats = state.stats;
  let livesToAdd = 0;
  let shouldPlayLifeSound = false;
  let starGain: { lane: number; position: number } | undefined;

  if (options.countsAsServed) {
    newHappyCustomers += 1;
    newStats = {
      ...newStats,
      customersServed: newStats.customersServed + 1,
    };
    newStats = updateStatsForStreak(newStats, 'customer');

    if (options.checkLifeGain) {
      const lifeResult = checkLifeGain(
        state.lives,
        newHappyCustomers,
        dogeMultiplier,
        getCustomerVariant(customer) === 'critic',
        customer.position
      );

      if (lifeResult.livesToAdd > 0) {
        livesToAdd = lifeResult.livesToAdd;
        shouldPlayLifeSound = lifeResult.shouldPlaySound;
        starGain = { lane: customer.lane, position: customer.position };
      }
    }
  }

  return {
    scoreToAdd: points,
    bankToAdd: options.includeBank ? bank : 0,
    newHappyCustomers,
    newStats,
    livesToAdd,
    shouldPlayLifeSound,
    floatingScore: { points, lane: customer.lane, position: customer.position },
    starGain,
  };
};

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
 * Doge gives 420 pts, Nyan gives 777 pts, others give 100 pts.
 */
export const calculatePowerUpScore = (
  dogeMultiplier: number,
  powerUpType?: string
): number => {
  let baseScore = SCORING.POWERUP_COLLECTED;
  if (powerUpType === 'doge') baseScore = SCORING.DOGE_COLLECTED;
  else if (powerUpType === 'nyan') baseScore = SCORING.NYAN_COLLECTED;
  return baseScore * dogeMultiplier;
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
  if (happyCustomers > 0 && happyCustomers % 8 === 0) {
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
