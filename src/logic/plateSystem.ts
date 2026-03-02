import { EmptyPlate, GameStats } from '../types/game';
import { checkChefPlateCollision } from './collisionSystem';
import { calculatePlateScore, updateStatsForStreak } from './scoringSystem';

export type PlateEvent = 'CAUGHT' | 'DROPPED';

export interface PlateTickResult {
  remainingPlates: EmptyPlate[];
  scores: Array<{ points: number; lane: number; position: number }>;
  events: PlateEvent[];
  updatedStats: GameStats;
  totalScore: number;
}

/**
 * Update plate positions (move left)
 */
export const updatePlatePositions = (plates: EmptyPlate[]): EmptyPlate[] => {
  return plates.map(plate => ({
    ...plate,
    position: plate.position - plate.speed
  }));
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
  nyanSweepActive: boolean
): PlateTickResult => {
  const remainingPlates: EmptyPlate[] = [];
  const scores: Array<{ points: number; lane: number; position: number }> = [];
  const events: PlateEvent[] = [];
  let totalScore = 0;
  let updatedStats = { ...stats };

  // First update positions
  const movedPlates = updatePlatePositions(plates);

  movedPlates.forEach(plate => {
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

    // Check if plate went off screen
    if (plate.position <= 0) {
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
