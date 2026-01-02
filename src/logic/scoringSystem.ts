// src/logic/scoringSystem.ts
import { GameState, Customer, StarLostReason } from "../types/game";
import { getStreakMultiplier } from "../components/StreakDisplay";
import { GAME_CONFIG, SCORING } from "../lib/constants";

export type FloatingScoreInput = {
  points: number;
  lane: number;
  position: number;
};

export const getDogeMultiplier = (state: GameState): number =>
  state.activePowerUps.some((p) => p.type === "doge") ? 2 : 1;

/**
 * Adds a floating score entry (same behavior as your existing helper).
 * NOTE: caller passes `now` so we don't do Date.now() internally during simulation.
 */
export const addFloatingScore = (
  state: GameState,
  points: number,
  lane: number,
  position: number,
  now: number
): GameState => {
  return {
    ...state,
    floatingScores: [
      ...state.floatingScores,
      {
        id: `score-${now}-${Math.random()}`,
        points,
        lane,
        position,
        startTime: now,
      },
    ],
  };
};

export const addFloatingScores = (
  state: GameState,
  scores: FloatingScoreInput[],
  now: number
): GameState => {
  let s = state;
  for (const fs of scores) {
    s = addFloatingScore(s, fs.points, fs.lane, fs.position, now);
  }
  return s;
};

export const calcPoints = (base: number, dogeMultiplier: number, streak: number): number => {
  return Math.floor(base * dogeMultiplier * getStreakMultiplier(streak));
};

/**
 * Apply generic score + bank delta.
 */
export const awardScoreAndBank = (
  state: GameState,
  scoreDelta: number,
  bankDelta: number
): GameState => {
  return {
    ...state,
    score: state.score + scoreDelta,
    bank: state.bank + bankDelta,
  };
};

/**
 * Shared "happy customer" bookkeeping:
 * - score + bank
 * - happyCustomers++
 * - stats.customersServed++
 * - customer streak++ (and longest)
 * - optional life gain rule (every 8 happy customers)
 *
 * NOTE: This is used for normal serves, critic serves, woozy step2, unfrozen-serve, star auto-feed, nyan sweep.
 */
export const awardCustomerServed = (
  state: GameState,
  customer: Customer,
  baseScore: number,
  dogeMultiplier: number,
  now: number,
  opts?: {
    // For critic bonus life behavior (only for critic serves with position threshold)
    criticBonusLife?: boolean;
    criticBonusLifeMinPosition?: number;
    // For disabling the "every 8 happy customers gain life" rule (you don’t currently disable it, but kept for flexibility)
    enableHappyCustomerLifeRule?: boolean;
  }
): { newState: GameState; pointsEarned: number; floating: FloatingScoreInput } => {
  const enableHappyCustomerLifeRule = opts?.enableHappyCustomerLifeRule ?? true;

  const pointsEarned = calcPoints(baseScore, dogeMultiplier, state.stats.currentCustomerStreak);
  let newState = awardScoreAndBank(
    state,
    pointsEarned,
    SCORING.BASE_BANK_REWARD * dogeMultiplier
  );

  // happy customer + served stats + streaks
  newState = {
    ...newState,
    happyCustomers: newState.happyCustomers + 1,
    stats: {
      ...newState.stats,
      customersServed: newState.stats.customersServed + 1,
      currentCustomerStreak: newState.stats.currentCustomerStreak + 1,
      longestCustomerStreak: Math.max(
        newState.stats.longestCustomerStreak,
        newState.stats.currentCustomerStreak + 1
      ),
    },
  };

  // Critic bonus life (your rule: critic served AND position >= threshold => +1 life)
  if (opts?.criticBonusLife) {
    const minPos = opts.criticBonusLifeMinPosition ?? 50; // you used 50/55 depending on path; caller sets it
    if (customer.position >= minPos && newState.lives < GAME_CONFIG.MAX_LIVES) {
      newState = { ...newState, lives: newState.lives + 1 };
      // sound is handled by caller (same as today)
    }
  } else if (enableHappyCustomerLifeRule) {
    // Normal happy-customer life rule: every 8 happy customers
    if (newState.happyCustomers % 8 === 0 && newState.lives < GAME_CONFIG.MAX_LIVES) {
      const starsToAdd = Math.min(dogeMultiplier, GAME_CONFIG.MAX_LIVES - newState.lives);
      if (starsToAdd > 0) {
        newState = { ...newState, lives: newState.lives + starsToAdd };
        // sound is handled by caller (same as today)
      }
    }
  }

  return {
    newState,
    pointsEarned,
    floating: { points: pointsEarned, lane: customer.lane, position: customer.position },
  };
};

/**
 * Woozy step 1 scoring (your base: CUSTOMER_FIRST_SLICE) does NOT increment happyCustomers/streak today.
 * This function preserves that behavior.
 */
export const awardWoozyStep1 = (
  state: GameState,
  customer: Customer,
  dogeMultiplier: number
): { newState: GameState; pointsEarned: number; floating: FloatingScoreInput } => {
  const pointsEarned = calcPoints(
    SCORING.CUSTOMER_FIRST_SLICE,
    dogeMultiplier,
    state.stats.currentCustomerStreak
  );

  const newState = awardScoreAndBank(
    state,
    pointsEarned,
    SCORING.BASE_BANK_REWARD * dogeMultiplier
  );

  return {
    newState,
    pointsEarned,
    floating: { points: pointsEarned, lane: customer.lane, position: customer.position },
  };
};

/**
 * Plate caught scoring + plate streak bookkeeping.
 */
export const awardPlateCaught = (
  state: GameState,
  lane: number,
  position: number,
  dogeMultiplier: number
): { newState: GameState; pointsEarned: number; floating: FloatingScoreInput } => {
  const pointsEarned = calcPoints(
    SCORING.PLATE_CAUGHT,
    dogeMultiplier,
    state.stats.currentPlateStreak
  );

  let newState = awardScoreAndBank(state, pointsEarned, 0);

  newState = {
    ...newState,
    stats: {
      ...newState.stats,
      platesCaught: newState.stats.platesCaught + 1,
      currentPlateStreak: newState.stats.currentPlateStreak + 1,
      largestPlateStreak: Math.max(
        newState.stats.largestPlateStreak,
        newState.stats.currentPlateStreak + 1
      ),
    },
  };

  return {
    newState,
    pointsEarned,
    floating: { points: pointsEarned, lane, position },
  };
};

/**
 * Powerup collected base points (your rule: POWERUP_COLLECTED * dogeMultiplier)
 */
export const awardPowerUpCollected = (
  state: GameState,
  powerUpLane: number,
  powerUpPosition: number,
  dogeMultiplier: number
): { newState: GameState; pointsEarned: number; floating: FloatingScoreInput } => {
  const pointsEarned = SCORING.POWERUP_COLLECTED * dogeMultiplier;
  const newState = awardScoreAndBank(state, pointsEarned, 0);
  return {
    newState,
    pointsEarned,
    floating: { points: pointsEarned, lane: powerUpLane, position: powerUpPosition },
  };
};

/**
 * Simple point awards used in boss/minion paths.
 */
export const awardFlatPoints = (
  state: GameState,
  points: number
): GameState => {
  return { ...state, score: state.score + points };
};

/**
 * Life loss helper that also stamps lastStarLostReason (matches your current patterns).
 * Game-over triggering stays in the hook (so we don’t entangle scoringSystem with triggerGameOver()).
 */
export const loseLives = (
  state: GameState,
  count: number,
  reason?: StarLostReason
): GameState => {
  const nextLives = Math.max(0, state.lives - count);
  return {
    ...state,
    lives: nextLives,
    lastStarLostReason: reason ?? state.lastStarLostReason,
  };
};
