import { GameState, HiredWorker, PepeHelper } from '../types/game';
import { WORKER_CONFIG } from '../lib/constants';
import { processHelperAction, PepeHelperEvent } from './pepeHelperSystem';
import { buildLaneBuckets } from './laneBuckets';

/**
 * Initialize a new hired worker.
 * Spreads out from the chef's current lane.
 */
export const initializeHiredWorker = (chefLane: number): HiredWorker => ({
  active: true,
  lane: chefLane <= 1 ? 3 : 0, // Spread out from chef
  availableSlices: WORKER_CONFIG.STARTING_SLICES,
  lastActionTime: 0,
});

export interface WorkerTickResult {
  updatedState: Partial<GameState>;
  events: PepeHelperEvent[];
}

/**
 * Process the hired worker's actions each tick.
 * Adapts HiredWorker to PepeHelper shape and reuses processHelperAction.
 */
export const processWorkerTick = (
  gameState: GameState,
  now: number
): WorkerTickResult => {
  const worker = gameState.hiredWorker;
  if (!worker || !worker.active) {
    return { updatedState: {}, events: [] };
  }

  // Adapt HiredWorker to PepeHelper shape for reuse
  const helperShape: PepeHelper = {
    id: 'worker',
    lane: worker.lane,
    availableSlices: worker.availableSlices,
    lastActionTime: worker.lastActionTime,
  };

  // Determine "other helper" lanes to avoid clustering
  // Consider chef lane and any active pepe helpers
  const otherHelperLane = gameState.pepeHelpers?.active
    ? gameState.pepeHelpers.franco.lane
    : gameState.chefLane;

  // Build lane buckets
  const customerBuckets = buildLaneBuckets(gameState.customers);
  const plateBuckets = buildLaneBuckets(gameState.emptyPlates);
  const sliceBuckets = buildLaneBuckets(gameState.pizzaSlices);

  // Override the action interval check by adjusting lastActionTime
  // processHelperAction uses PEPE_CONFIG.ACTION_INTERVAL, but we want WORKER_CONFIG.ACTION_INTERVAL
  // We adjust by shifting the lastActionTime to simulate the worker's slower interval
  const adjustedHelper: PepeHelper = {
    ...helperShape,
    lastActionTime: helperShape.lastActionTime === 0
      ? 0
      : helperShape.lastActionTime + (WORKER_CONFIG.ACTION_INTERVAL - 100), // 100 is PEPE_CONFIG.ACTION_INTERVAL
  };

  const result = processHelperAction(
    adjustedHelper,
    gameState,
    otherHelperLane,
    gameState.chefLane,
    now,
    customerBuckets,
    plateBuckets,
    sliceBuckets
  );

  // Map back the real lastActionTime (undo the adjustment if it was updated)
  const updatedWorker: HiredWorker = {
    active: true,
    lane: result.updatedHelper.lane,
    availableSlices: result.updatedHelper.availableSlices,
    lastActionTime: result.updatedHelper.lastActionTime === adjustedHelper.lastActionTime
      ? worker.lastActionTime // Wasn't updated
      : result.updatedHelper.lastActionTime, // Was updated by processHelperAction
  };

  const updatedState: Partial<GameState> = {
    ovens: result.updatedOvens,
    pizzaSlices: [...gameState.pizzaSlices, ...result.newSlices],
    emptyPlates: gameState.emptyPlates.filter(p => !result.caughtPlateIds.includes(p.id)),
    hiredWorker: updatedWorker,
    stats: { ...gameState.stats, ...result.statsUpdates },
    score: gameState.score + result.scoreGained,
  };

  return {
    updatedState,
    events: result.events,
  };
};
