import { GameState, PepeHelpers, PepeHelper, PizzaSlice, Customer } from '../types/game';
import { POWERUPS, PEPE_CONFIG, GAME_CONFIG, ENTITY_SPEEDS, OVEN_CONFIG } from '../lib/constants';
import { getOvenDisplayStatus } from './ovenSystem';
import { buildLaneBuckets, getEntitiesInLane, LaneBuckets } from './laneBuckets';

/**
 * Initialize pepe helpers when power-up is collected
 * Famous chefs come prepared with pizza and spread out to cover all lanes
 */
export const initializePepeHelpers = (now: number, chefLane: number): PepeHelpers => ({
  active: true,
  startTime: now,
  endTime: now + POWERUPS.PEPE_DURATION,
  franco: {
    id: 'franco',
    lane: chefLane <= 1 ? 2 : 0, // Spread out from chef
    availableSlices: PEPE_CONFIG.STARTING_SLICES, // Famous chefs come prepared!
    lastActionTime: 0,
  },
  frank: {
    id: 'frank',
    lane: chefLane >= 2 ? 1 : 3, // Spread out from chef
    availableSlices: PEPE_CONFIG.STARTING_SLICES, // Famous chefs come prepared!
    lastActionTime: 0,
  },
});

/**
 * Check if pepe helpers have expired
 */
export const checkPepeHelpersExpired = (helpers: PepeHelpers, now: number): boolean => {
  return now >= helpers.endTime;
};

export interface PepeHelperTickResult {
  updatedState: Partial<GameState>;
  events: PepeHelperEvent[];
}

export type PepeHelperEvent =
  | { type: 'OVEN_STARTED'; lane: number; helper: 'franco' | 'frank' }
  | { type: 'PIZZA_PULLED'; lane: number; slices: number; helper: 'franco' | 'frank' }
  | { type: 'CUSTOMER_SERVED'; lane: number; helper: 'franco' | 'frank' }
  | { type: 'PLATE_CAUGHT'; lane: number; helper: 'franco' | 'frank' }
  | { type: 'HELPER_MOVED'; lane: number; helper: 'franco' | 'frank' };

/**
 * Evaluate what action a helper should take.
 * Accepts pre-built lane buckets to avoid re-filtering arrays per lane.
 */
const evaluateLanePriority = (
  lane: number,
  gameState: GameState,
  helper: PepeHelper,
  otherHelperLane: number,
  chefLane: number,
  customerBuckets: LaneBuckets<Customer>,
  plateBuckets: LaneBuckets<typeof gameState.emptyPlates[0]>
): number => {
  let priority = 0;
  const oven = gameState.ovens[lane];
  const speedUpgrade = gameState.ovenSpeedUpgrades[lane] || 0;
  const status = getOvenDisplayStatus(oven, speedUpgrade);

  // High priority: Ready oven that needs pulling (and helper can carry more)
  if (status === 'ready' && helper.availableSlices < GAME_CONFIG.MAX_SLICES) {
    priority += 100;
  }

  // Medium priority: Idle oven that can be started
  if (status === 'idle') {
    priority += 50;
  }

  // High priority: Approaching customers in this lane (if we have slices)
  const laneCustomers = getEntitiesInLane(customerBuckets, lane);
  const approachingInLane = laneCustomers.filter(
    c => !c.served && !c.disappointed && !c.vomit && !c.leaving && c.position < 80
  );
  if (approachingInLane.length > 0 && helper.availableSlices > 0) {
    // Closer customers = higher priority
    const closestCustomer = approachingInLane.reduce((a, b) => a.position < b.position ? a : b);
    priority += 80 + (100 - closestCustomer.position);
  }

  // Medium priority: Plates returning in this lane
  const lanePlates = getEntitiesInLane(plateBuckets, lane);
  const platesInLane = lanePlates.filter(p => p.position < 30);
  if (platesInLane.length > 0) {
    priority += 60;
  }

  // Avoid clustering - reduce priority if chef or other helper is here
  if (lane === chefLane) priority -= 20;
  if (lane === otherHelperLane) priority -= 30;

  return priority;
};

/**
 * Process a single helper's actions.
 * Accepts pre-built lane buckets to avoid redundant filtering.
 */
const processHelperAction = (
  helper: PepeHelper,
  gameState: GameState,
  otherHelperLane: number,
  chefLane: number,
  now: number,
  customerBuckets: LaneBuckets<Customer>,
  plateBuckets: LaneBuckets<typeof gameState.emptyPlates[0]>,
  sliceBuckets: LaneBuckets<PizzaSlice>
): {
  updatedHelper: PepeHelper;
  updatedOvens: typeof gameState.ovens;
  newSlices: PizzaSlice[];
  caughtPlateIds: string[];
  events: PepeHelperEvent[];
  statsUpdates: Partial<typeof gameState.stats>;
  scoreGained: number;
} => {
  const events: PepeHelperEvent[] = [];
  let updatedHelper = { ...helper };
  let updatedOvens = { ...gameState.ovens };
  const newSlices: PizzaSlice[] = [];
  const caughtPlateIds: string[] = [];
  let statsUpdates: Partial<typeof gameState.stats> = {};
  let scoreGained = 0;

  // Rate limit actions
  if (now - helper.lastActionTime < PEPE_CONFIG.ACTION_INTERVAL) {
    return { updatedHelper, updatedOvens, newSlices, caughtPlateIds, events, statsUpdates, scoreGained };
  }

  // Evaluate best lane using pre-built buckets
  const lanePriorities = [0, 1, 2, 3].map(lane => ({
    lane,
    priority: evaluateLanePriority(lane, gameState, helper, otherHelperLane, chefLane, customerBuckets, plateBuckets),
  }));
  lanePriorities.sort((a, b) => b.priority - a.priority);

  const bestLane = lanePriorities[0].lane;

  // Move one lane at a time toward the best lane
  if (helper.lane !== bestLane) {
    const direction = bestLane > helper.lane ? 1 : -1;
    updatedHelper.lane = helper.lane + direction;
    events.push({ type: 'HELPER_MOVED', lane: updatedHelper.lane, helper: helper.id });
    // Famous chefs can move AND act in the same tick!
  }

  // We're in the best lane - take action (use updatedHelper.lane since we might have moved)
  const currentLane = updatedHelper.lane;
  const oven = updatedOvens[currentLane];
  const speedUpgrade = gameState.ovenSpeedUpgrades[currentLane] || 0;
  const status = getOvenDisplayStatus(oven, speedUpgrade);

  // Priority 1: Catch plates (using lane buckets)
  const lanePlates = getEntitiesInLane(plateBuckets, currentLane);
  const platesInLane = lanePlates.filter(p => p.position < 20);
  if (platesInLane.length > 0) {
    const plate = platesInLane[0];
    caughtPlateIds.push(plate.id);
    scoreGained += 50;
    statsUpdates = {
      platesCaught: (gameState.stats.platesCaught || 0) + 1,
      currentPlateStreak: (gameState.stats.currentPlateStreak || 0) + 1,
      largestPlateStreak: Math.max(
        gameState.stats.largestPlateStreak || 0,
        (gameState.stats.currentPlateStreak || 0) + 1
      ),
    };
    updatedHelper.lastActionTime = now;
    events.push({ type: 'PLATE_CAUGHT', lane: currentLane, helper: helper.id });
    return { updatedHelper, updatedOvens, newSlices, caughtPlateIds, events, statsUpdates, scoreGained };
  }

  // Priority 2: Pull ready pizza
  if (status === 'ready' && updatedHelper.availableSlices < GAME_CONFIG.MAX_SLICES) {
    const slicesToAdd = Math.min(oven.sliceCount, GAME_CONFIG.MAX_SLICES - updatedHelper.availableSlices);
    updatedHelper.availableSlices += slicesToAdd;
    updatedOvens[currentLane] = {
      ...oven,
      cooking: false,
      startTime: 0,
      sliceCount: 0,
    };
    statsUpdates = {
      slicesBaked: (gameState.stats.slicesBaked || 0) + slicesToAdd,
    };
    updatedHelper.lastActionTime = now;
    events.push({ type: 'PIZZA_PULLED', lane: currentLane, slices: slicesToAdd, helper: helper.id });
    return { updatedHelper, updatedOvens, newSlices, caughtPlateIds, events, statsUpdates, scoreGained };
  }

  // Priority 3: Serve customers (only if needed) - using lane buckets
  const laneCustomers = getEntitiesInLane(customerBuckets, currentLane);
  const approachingCustomers = laneCustomers.filter(
    c => !c.served && !c.disappointed && !c.vomit && !c.leaving && c.position < 85
  );
  // Count slices already heading to this lane (using lane buckets)
  const slicesInLane = getEntitiesInLane(sliceBuckets, currentLane).length + newSlices.filter(s => s.lane === currentLane).length;
  // Only throw if there are more customers than slices already in flight
  if (approachingCustomers.length > slicesInLane && updatedHelper.availableSlices > 0) {
    const newSlice: PizzaSlice = {
      id: `${helper.id}-pizza-${now}-${currentLane}`,
      lane: currentLane,
      position: GAME_CONFIG.CHEF_X_POSITION,
      speed: ENTITY_SPEEDS.PIZZA,
    };
    newSlices.push(newSlice);
    updatedHelper.availableSlices -= 1;
    updatedHelper.lastActionTime = now;
    events.push({ type: 'CUSTOMER_SERVED', lane: currentLane, helper: helper.id });
    return { updatedHelper, updatedOvens, newSlices, caughtPlateIds, events, statsUpdates, scoreGained };
  }

  // Priority 4: Start cooking
  if (status === 'idle') {
    const upgradeLevel = gameState.ovenUpgrades[currentLane] || 0;
    const sliceCount = upgradeLevel + 1;
    updatedOvens[currentLane] = {
      ...oven,
      cooking: true,
      startTime: now,
      burned: false,
      sliceCount,
    };
    updatedHelper.lastActionTime = now;
    events.push({ type: 'OVEN_STARTED', lane: currentLane, helper: helper.id });
    return { updatedHelper, updatedOvens, newSlices, caughtPlateIds, events, statsUpdates, scoreGained };
  }

  return { updatedHelper, updatedOvens, newSlices, caughtPlateIds, events, statsUpdates, scoreGained };
};

/**
 * Process pepe helper actions each tick
 * Helpers operate independently like additional chefs
 */
export const processPepeHelperTick = (
  gameState: GameState,
  now: number
): PepeHelperTickResult => {
  const helpers = gameState.pepeHelpers;
  if (!helpers || !helpers.active) {
    return { updatedState: {}, events: [] };
  }

  const allEvents: PepeHelperEvent[] = [];
  let currentOvens = { ...gameState.ovens };
  let currentPlates = [...gameState.emptyPlates];
  let allNewSlices: PizzaSlice[] = [];
  let totalScore = 0;
  let statsUpdates: Partial<typeof gameState.stats> = {};

  // Build lane buckets once for both helpers
  const customerBuckets = buildLaneBuckets(gameState.customers);
  const sliceBuckets = buildLaneBuckets(gameState.pizzaSlices);
  let plateBuckets = buildLaneBuckets(currentPlates);

  // Process Franco
  const francoResult = processHelperAction(
    helpers.franco,
    { ...gameState, ovens: currentOvens, emptyPlates: currentPlates },
    helpers.frank.lane,
    gameState.chefLane,
    now,
    customerBuckets,
    plateBuckets,
    sliceBuckets
  );
  currentOvens = francoResult.updatedOvens;
  currentPlates = currentPlates.filter(p => !francoResult.caughtPlateIds.includes(p.id));
  allNewSlices = [...allNewSlices, ...francoResult.newSlices];
  allEvents.push(...francoResult.events);
  totalScore += francoResult.scoreGained;
  statsUpdates = { ...statsUpdates, ...francoResult.statsUpdates };

  // Rebuild plate buckets after Franco may have caught plates
  if (francoResult.caughtPlateIds.length > 0) {
    plateBuckets = buildLaneBuckets(currentPlates);
  }

  // Process Frank
  const frankResult = processHelperAction(
    helpers.frank,
    { ...gameState, ovens: currentOvens, emptyPlates: currentPlates },
    francoResult.updatedHelper.lane,
    gameState.chefLane,
    now,
    customerBuckets,
    plateBuckets,
    sliceBuckets
  );
  currentOvens = frankResult.updatedOvens;
  currentPlates = currentPlates.filter(p => !frankResult.caughtPlateIds.includes(p.id));
  allNewSlices = [...allNewSlices, ...frankResult.newSlices];
  allEvents.push(...frankResult.events);
  totalScore += frankResult.scoreGained;
  statsUpdates = { ...statsUpdates, ...frankResult.statsUpdates };

  return {
    updatedState: {
      ovens: currentOvens,
      pizzaSlices: [...gameState.pizzaSlices, ...allNewSlices],
      emptyPlates: currentPlates,
      pepeHelpers: {
        ...helpers,
        franco: francoResult.updatedHelper,
        frank: frankResult.updatedHelper,
      },
      stats: { ...gameState.stats, ...statsUpdates },
      score: gameState.score + totalScore,
    },
    events: allEvents,
  };
};
