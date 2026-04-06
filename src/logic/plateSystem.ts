import { EmptyPlate, GameStats } from '../types/game';
import { checkChefPlateCollision } from './collisionSystem';
import { calculatePlateScore, updateStatsForStreak } from './scoringSystem';
import { TIMINGS } from '../lib/constants';

export type PlateEvent = 'CAUGHT' | 'DROPPED';

export interface PlateTickResult {
  remainingPlates: EmptyPlate[];
  scores: Array<{ points: number; lane: number; position: number }>;
  events: PlateEvent[];
  updatedStats: GameStats;
  totalScore: number;
}

/**
 * Update plate positions (move left) and fix angled plate lane bucketing
 */
export const updatePlatePositions = (plates: EmptyPlate[]): EmptyPlate[] => {
  const OVEN_POSITION = 10;
  return plates.map(plate => {
    const updatedPlate = {
      ...plate,
      position: plate.position - plate.speed
    };

    // Fix angled plate lane bucketing: once an angled plate has completed
    // its trajectory, update plate.lane to match targetLane so collision
    // detection (chef and Pepe helpers) can find it in the correct bucket
    if (updatedPlate.targetLane !== undefined && updatedPlate.startPosition !== undefined) {
      const totalDistance = updatedPlate.startPosition - OVEN_POSITION;
      const traveled = updatedPlate.startPosition - updatedPlate.position;
      const progress = Math.min(1, Math.max(0, traveled / totalDistance));
      if (progress >= 1) {
        updatedPlate.lane = updatedPlate.targetLane;
      }
    }

    return updatedPlate;
  });
};

/**
 * Process plate catching and cleanup
 */
export const processPlates = (
  plates: EmptyPlate[],
  chefLane: number,
  stats: GameStats,
  dogeMultiplier: number,
  streakMultiplier: number,
  nyanSweepActive: boolean,
  now: number
): PlateTickResult => {
  const remainingPlates: EmptyPlate[] = [];
  const scores: Array<{ points: number; lane: number; position: number }> = [];
  const events: PlateEvent[] = [];
  let totalScore = 0;
  let updatedStats = { ...stats };

  // First update positions
  const movedPlates = updatePlatePositions(plates);

  movedPlates.forEach(plate => {
    // TTL safety net: remove plates that have existed longer than max lifetime
    if (now - plate.createdAt > TIMINGS.PLATE_MAX_LIFETIME) {
      updatedStats.currentPlateStreak = 0;
      events.push('DROPPED');
      return;
    }

    // Check chef collision (only if not in nyan sweep)
    if (checkChefPlateCollision(chefLane, plate) && !nyanSweepActive) {
      const pointsEarned = calculatePlateScore(dogeMultiplier, streakMultiplier);

      totalScore += pointsEarned;
      scores.push({ points: pointsEarned, lane: plate.lane, position: plate.position });

      updatedStats.platesCaught += 1;
      updatedStats = updateStatsForStreak(updatedStats, 'plate');
      events.push('CAUGHT');

      // Don't add to remaining plates (caught)
      return;
    }

    // Check if plate went off screen (with safety buffer)
    if (plate.position <= -5) {
      updatedStats.currentPlateStreak = 0;
      events.push('DROPPED');
      // Don't add to remaining plates (dropped)
      return;
    }

    // Keep the plate
    remainingPlates.push(plate);
  });

  return {
    remainingPlates,
    scores,
    events,
    updatedStats,
    totalScore
  };
};
