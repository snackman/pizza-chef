import { GameState, BossBattle, BossMinion, PizzaSlice, BossType, ActivePowerUp } from '../types/game';
import { BOSS_CONFIG, PAPA_JOHN_CONFIG, DOMINOS_CONFIG, CHUCK_E_CHEESE_CONFIG, PIZZA_THE_HUT_CONFIG, POSITIONS, ENTITY_SPEEDS, SCORING, GAME_CONFIG, LEVEL_SYSTEM } from '../lib/constants';
import { sprite } from '../lib/assets';
import { checkSliceMinionCollision, checkMinionReachedChef } from './collisionSystem';
import { getPapaJohnMask, checkMaskCollision } from './bossCollisionMasks';
import { buildLaneBuckets, getEntitiesInLane, LaneBuckets } from './laneBuckets';

export type BossEvent =
  | { type: 'MINION_DEFEATED'; lane: number; position: number; points: number }
  | { type: 'BOSS_HIT'; lane: number; position: number; points: number }
  | { type: 'BOSS_DEFEATED'; lane: number; position: number; points: number }
  | { type: 'MINION_REACHED_CHEF' }
  | { type: 'WAVE_COMPLETE'; nextWave: number }
  | { type: 'BOSS_VULNERABLE' }
  | { type: 'SLIME_HIT_OVEN'; lane: number }
  | { type: 'SLIME_HIT_CHEF'; lane: number };

export interface BossTickResult {
  nextBossBattle: BossBattle;
  consumedSliceIds: Set<string>;
  livesLost: number;
  scoreGained: number;
  events: BossEvent[];
  defeatedBossLevel?: number;
  ovenDisables?: { lane: number; until: number }[];
  chefSlowUntil?: number;
}

export interface BossTriggerResult {
  type: BossType;
  level: number;
}

/**
 * Get the boss type for a given level, or null if no boss at this level.
 * Uses the new level system: bosses at levels 3, 5, 7, 9, and recurring from 10+.
 */
export const getBossForLevel = (level: number): BossType | null => {
  // Check fixed boss levels
  const fixedBoss = LEVEL_SYSTEM.BOSS_LEVELS[level as keyof typeof LEVEL_SYSTEM.BOSS_LEVELS];
  if (fixedBoss) return fixedBoss;

  // Check recurring bosses (level 10+, every 2 levels)
  if (level >= LEVEL_SYSTEM.BOSS_RECURRENCE_START && (level - LEVEL_SYSTEM.BOSS_RECURRENCE_START) % LEVEL_SYSTEM.BOSS_RECURRENCE_INTERVAL === 0) {
    // Cycle through the 4 bosses
    const bossTypes: BossType[] = ['papaJohn', 'chuckECheese', 'pizzaTheHut', 'dominos'];
    const cycleIndex = ((level - LEVEL_SYSTEM.BOSS_RECURRENCE_START) / LEVEL_SYSTEM.BOSS_RECURRENCE_INTERVAL) % bossTypes.length;
    return bossTypes[cycleIndex];
  }

  return null;
};

/**
 * Get boss difficulty scaling for recurring bosses (level 10+).
 * Returns a multiplier for health and minion speed.
 */
export const getBossScaling = (level: number): { healthMultiplier: number; speedMultiplier: number } => {
  if (level < LEVEL_SYSTEM.BOSS_RECURRENCE_START) {
    return { healthMultiplier: 1, speedMultiplier: 1 };
  }
  const recurrence = Math.floor((level - LEVEL_SYSTEM.BOSS_RECURRENCE_START) / LEVEL_SYSTEM.BOSS_RECURRENCE_INTERVAL);
  return {
    healthMultiplier: 1 + recurrence * LEVEL_SYSTEM.BOSS_HEALTH_SCALE,
    speedMultiplier: 1 + recurrence * LEVEL_SYSTEM.BOSS_MINION_SPEED_SCALE,
  };
};

/**
 * Check if any boss battles should trigger based on current level.
 * Returns ALL bosses whose level threshold has been reached but not yet defeated,
 * sorted by level ascending so lowest-level boss fights first.
 * This ensures bosses can never be skipped regardless of how fast the player levels up.
 */
export const checkBossTrigger = (
  _oldLevel: number,
  newLevel: number,
  defeatedBossLevels: number[],
): BossTriggerResult[] => {
  const triggered: BossTriggerResult[] = [];

  // All boss definitions sorted by level ascending
  const allBosses: { type: BossType; level: number }[] = [
    { type: 'papaJohn', level: BOSS_CONFIG.PAPA_JOHN_LEVEL },
    { type: 'chuckECheese', level: BOSS_CONFIG.CHUCK_E_CHEESE_LEVEL },
    { type: 'pizzaTheHut', level: BOSS_CONFIG.PIZZA_THE_HUT_LEVEL },
    { type: 'dominos', level: BOSS_CONFIG.DOMINOS_LEVEL },
  ].sort((a, b) => a.level - b.level);

  for (const boss of allBosses) {
    if (newLevel >= boss.level && !defeatedBossLevels.includes(boss.level)) {
      triggered.push({ type: boss.type, level: boss.level });
    }
  }

  return triggered;
};

/**
 * Create initial minions for a wave
 */
export const createWaveMinions = (waveNumber: number, now: number, minionsPerWave: number, bossType?: BossType): BossMinion[] => {
  const minions: BossMinion[] = [];
  const isChuckECheese = bossType === 'chuckECheese';

  for (let i = 0; i < minionsPerWave; i++) {
    let speed = ENTITY_SPEEDS.MINION;
    let minionSprite: string | undefined;

    if (isChuckECheese) {
      const baseSpeed = CHUCK_E_CHEESE_CONFIG.KID_WAVE_SPEEDS[Math.min(waveNumber - 1, CHUCK_E_CHEESE_CONFIG.KID_WAVE_SPEEDS.length - 1)];
      speed = baseSpeed * (0.9 + Math.random() * 0.6);
      minionSprite = sprite(`kid-${Math.floor(Math.random() * CHUCK_E_CHEESE_CONFIG.KID_SPRITE_COUNT) + 1}.png`);
    }

    minions.push({
      id: `minion-${now}-${waveNumber}-${i}`,
      lane: i % 4,
      position: POSITIONS.SPAWN_X + (Math.floor(i / 4) * 15),
      speed,
      defeated: false,
      ...(minionSprite ? { sprite: minionSprite } : {}),
    });
  }
  return minions;
};

/**
 * Get the total number of slimes for a Pizza the Hut wave
 */
export const getSlimeWaveCount = (waveNumber: number): number => {
  const baseCount = PIZZA_THE_HUT_CONFIG.MINIONS_PER_WAVE + (waveNumber - 1) * 2;
  return Math.round(baseCount * 0.75);
};

/**
 * Create a single cheese slime thrown from Pizza the Hut's position
 */
export const createSingleSlime = (
  waveNumber: number,
  slimeIndex: number,
  now: number,
  bossPosition: number,
  bossLane: number
): BossMinion => {
  // Pick a random lane to throw the slime down
  const targetLane = Math.floor(Math.random() * 4);
  return {
    id: `slime-${now}-${waveNumber}-${slimeIndex}`,
    lane: targetLane,
    position: bossPosition, // Spawn at boss sprite position
    speed: PIZZA_THE_HUT_CONFIG.SLIME_SPEED,
    defeated: false,
    slime: true,
  };
};

/**
 * Get boss config based on boss type
 */
const getBossConfig = (bossType: BossType) => {
  if (bossType === 'papaJohn') return PAPA_JOHN_CONFIG;
  if (bossType === 'chuckECheese') return CHUCK_E_CHEESE_CONFIG;
  if (bossType === 'pizzaTheHut') return PIZZA_THE_HUT_CONFIG;
  return DOMINOS_CONFIG;
};

/**
 * Initialize a new boss battle
 */
export const initializeBossBattle = (
  now: number,
  bossType: BossType
): BossBattle => {
  const config = getBossConfig(bossType);
  // Papa John has no minions - immediately vulnerable
  // Chuck E. Cheese spawns kid waves but is also immediately vulnerable
  const isPapaJohn = bossType === 'papaJohn';
  const isChuckECheese = bossType === 'chuckECheese';
  const isPizzaTheHut = bossType === 'pizzaTheHut';
  const alwaysVulnerable = isPapaJohn || isChuckECheese || isPizzaTheHut;

  const result: BossBattle = {
    active: true,
    bossType,
    bossHealth: config.HEALTH,
    currentWave: isPapaJohn ? config.WAVES : 1,
    minions: isPapaJohn || isPizzaTheHut ? [] : createWaveMinions(1, now, config.MINIONS_PER_WAVE, bossType),
    bossVulnerable: alwaysVulnerable,
    bossDefeated: false,
    bossPosition: isPapaJohn ? 50 : BOSS_CONFIG.BOSS_POSITION,
    bossLane: 1.5,
    bossLaneDirection: 1,
    bossXDirection: -1,
    hitsReceived: 0,
  };

  // Pizza the Hut: set up continuous slime spawning
  if (isPizzaTheHut) {
    result.nextSlimeSpawnTime = now;
    result.slimeWaveIndex = 0;
  }

  return result;
};

/**
 * Update boss position (moves around the board)
 * Papa John runs all over, Dominos stays on the right
 */
export const updateBossLane = (bossBattle: BossBattle): BossBattle => {
  if (!bossBattle.active || bossBattle.bossDefeated) return bossBattle;

  const isPapaJohn = bossBattle.bossType === 'papaJohn';

  // Vertical movement (both bosses)
  const BOSS_LANE_SPEED = isPapaJohn ? 0.04 : 0.02; // Papa John moves faster
  const MIN_LANE = 0.5;
  const MAX_LANE = 2.5;

  let newLane = bossBattle.bossLane + (BOSS_LANE_SPEED * bossBattle.bossLaneDirection);
  let newLaneDirection = bossBattle.bossLaneDirection;

  // Bounce off top and bottom
  if (newLane >= MAX_LANE) {
    newLane = MAX_LANE;
    newLaneDirection = -1;
  } else if (newLane <= MIN_LANE) {
    newLane = MIN_LANE;
    newLaneDirection = 1;
  }

  // Horizontal movement (Papa John only - runs all over!)
  let newPosition = bossBattle.bossPosition;
  let newXDirection = bossBattle.bossXDirection;

  if (isPapaJohn) {
    const BOSS_X_SPEED = 0.3; // How fast Papa John runs horizontally
    const MIN_X = 20; // Don't go too close to chef
    const MAX_X = 85; // Right edge

    newPosition = bossBattle.bossPosition + (BOSS_X_SPEED * bossBattle.bossXDirection);

    // Bounce off left and right
    if (newPosition >= MAX_X) {
      newPosition = MAX_X;
      newXDirection = -1;
    } else if (newPosition <= MIN_X) {
      newPosition = MIN_X;
      newXDirection = 1;
    }
  }

  return {
    ...bossBattle,
    bossLane: newLane,
    bossLaneDirection: newLaneDirection,
    bossPosition: newPosition,
    bossXDirection: newXDirection,
  };
};

/**
 * Update minion positions (move left)
 */
export const updateMinionPositions = (minions: BossMinion[], iceCreamActive?: boolean): BossMinion[] => {
  return minions.map(minion => {
    if (minion.defeated) return minion;
    // Kids run faster when ice cream is out
    const speedMultiplier = iceCreamActive && minion.sprite ? (minion.speed + CHUCK_E_CHEESE_CONFIG.KID_ICE_CREAM_SPEED_BONUS) / minion.speed : 1;
    return { ...minion, position: minion.position - minion.speed * speedMultiplier };
  });
};

/**
 * Check for minions reaching the chef (causes life loss)
 */
export const checkMinionsReachedChef = (
  minions: BossMinion[]
): { updatedMinions: BossMinion[]; livesLost: number } => {
  let livesLost = 0;
  const updatedMinions = minions.map(minion => {
    if (minion.defeated || minion.slime) return minion; // slime handled separately
    if (checkMinionReachedChef(minion)) {
      livesLost++;
      return { ...minion, defeated: true };
    }
    return minion;
  });
  return { updatedMinions, livesLost };
};

/**
 * Process slice-minion collisions.
 * Uses lane-bucketed lookups so each slice only checks minions in its lane.
 */
export const processSliceMinionCollisions = (
  slices: PizzaSlice[],
  minions: BossMinion[]
): {
  updatedMinions: BossMinion[];
  consumedSliceIds: Set<string>;
  events: BossEvent[];
  scoreGained: number;
} => {
  const consumedSliceIds = new Set<string>();
  const events: BossEvent[] = [];
  let scoreGained = 0;

  // Track defeated minions by ID for sequential ordering
  const defeatedMinionIds = new Set<string>();

  slices.forEach(slice => {
    if (consumedSliceIds.has(slice.id)) return;

    // Only check minions in the same lane as this slice
    for (const minion of minions) {
      if (minion.lane !== slice.lane) continue;
      if (minion.defeated || defeatedMinionIds.has(minion.id)) continue;
      if (consumedSliceIds.has(slice.id)) break;

      if (checkSliceMinionCollision(slice, minion, 8)) {
        consumedSliceIds.add(slice.id);
        defeatedMinionIds.add(minion.id);
        const points = minion.slime ? Math.floor(SCORING.MINION_DEFEAT / 2) : SCORING.MINION_DEFEAT;
        scoreGained += points;
        events.push({
          type: 'MINION_DEFEATED',
          lane: minion.lane,
          position: minion.position,
          points,
        });
      }
    }
  });

  // Build final updated minions array
  const updatedMinions = minions.map(minion =>
    defeatedMinionIds.has(minion.id) ? { ...minion, defeated: true } : minion
  );

  return { updatedMinions, consumedSliceIds, events, scoreGained };
};

/**
 * Process slice-boss collisions (when boss is vulnerable)
 */
export const processSliceBossCollisions = (
  slices: PizzaSlice[],
  bossBattle: BossBattle,
  alreadyConsumedIds: Set<string>,
  currentLevel: number,
  defeatedBossLevels: number[]
): {
  updatedBossBattle: BossBattle;
  consumedSliceIds: Set<string>;
  events: BossEvent[];
  scoreGained: number;
  defeatedBossLevel?: number;
} => {
  if (!bossBattle.bossVulnerable) {
    return {
      updatedBossBattle: bossBattle,
      consumedSliceIds: new Set(),
      events: [],
      scoreGained: 0,
    };
  }

  const consumedSliceIds = new Set<string>();
  const events: BossEvent[] = [];
  let scoreGained = 0;
  let updatedBossBattle = { ...bossBattle };
  let defeatedBossLevel: number | undefined;

  slices.forEach(slice => {
    if (alreadyConsumedIds.has(slice.id) || consumedSliceIds.has(slice.id)) return;

    // Check both horizontal position AND vertical lane proximity
    // bossPosition is left edge, boss is 24% wide, so center is at bossPosition + 12
    const bossCenterX = updatedBossBattle.bossPosition + 12;
    const horizontalHit = Math.abs(bossCenterX - slice.position) < 14; // 14 = half width (12) + some margin
    const verticalHit = Math.abs(updatedBossBattle.bossLane - slice.lane) < 1.2; // Boss is roughly 1 lane tall

    if (horizontalHit && verticalHit) {
      // For Papa John, do pixel-perfect collision check
      if (updatedBossBattle.bossType === 'papaJohn') {
        const mask = getPapaJohnMask(updatedBossBattle.hitsReceived || 0);
        if (mask) {
          // Map game coords to sprite coords (0-1 range)
          // Boss left edge is at bossPosition, width is 24%
          const normalizedX = (slice.position - updatedBossBattle.bossPosition) / 24;
          // Boss top edge is at bossLane (in lane units), height is 1 lane
          // Slice is at center of its lane, so add 0.5 to align
          const normalizedY = (slice.lane - updatedBossBattle.bossLane) + 0.5;

          if (!checkMaskCollision(mask, normalizedX, normalizedY)) {
            return; // Hit transparent area - skip this slice
          }
        }
      }

      consumedSliceIds.add(slice.id);
      updatedBossBattle.bossHealth -= 1;
      updatedBossBattle.hitsReceived = (updatedBossBattle.hitsReceived || 0) + 1;

      const points = SCORING.BOSS_HIT;
      scoreGained += points;
      events.push({
        type: 'BOSS_HIT',
        lane: slice.lane,
        position: slice.position,
        points,
      });

      if (updatedBossBattle.bossHealth <= 0) {
        updatedBossBattle.bossDefeated = true;
        updatedBossBattle.active = false;
        updatedBossBattle.minions = [];

        scoreGained += SCORING.BOSS_DEFEAT;
        events.push({
          type: 'BOSS_DEFEATED',
          lane: 1,
          position: updatedBossBattle.bossPosition,
          points: SCORING.BOSS_DEFEAT,
        });

        // Find current boss level to mark as defeated
        let currentBossLevel: number | undefined;
        if (updatedBossBattle.bossType === 'papaJohn') {
          currentBossLevel = currentLevel >= BOSS_CONFIG.PAPA_JOHN_LEVEL ? BOSS_CONFIG.PAPA_JOHN_LEVEL : undefined;
        } else if (updatedBossBattle.bossType === 'chuckECheese') {
          currentBossLevel = currentLevel >= BOSS_CONFIG.CHUCK_E_CHEESE_LEVEL ? BOSS_CONFIG.CHUCK_E_CHEESE_LEVEL : undefined;
        } else if (updatedBossBattle.bossType === 'pizzaTheHut') {
          currentBossLevel = currentLevel >= BOSS_CONFIG.PIZZA_THE_HUT_LEVEL ? BOSS_CONFIG.PIZZA_THE_HUT_LEVEL : undefined;
        } else {
          currentBossLevel = currentLevel >= BOSS_CONFIG.DOMINOS_LEVEL ? BOSS_CONFIG.DOMINOS_LEVEL : undefined;
        }

        if (currentBossLevel && !defeatedBossLevels.includes(currentBossLevel)) {
          defeatedBossLevel = currentBossLevel;
        }
      }
    }
  });

  return { updatedBossBattle, consumedSliceIds, events, scoreGained, defeatedBossLevel };
};

/**
 * Check wave completion and spawn next wave or make boss vulnerable
 */
export const checkWaveCompletion = (
  bossBattle: BossBattle,
  now: number
): { updatedBossBattle: BossBattle; events: BossEvent[] } => {
  const activeMinions = bossBattle.minions.filter(m => !m.defeated);
  const events: BossEvent[] = [];

  // Pizza the Hut has continuous slime - no wave completion needed
  if (bossBattle.bossType === 'pizzaTheHut') {
    return { updatedBossBattle: bossBattle, events };
  }

  if (activeMinions.length > 0) {
    return { updatedBossBattle: bossBattle, events };
  }

  let updatedBossBattle = { ...bossBattle };
  const config = getBossConfig(bossBattle.bossType);

  if (bossBattle.currentWave < config.WAVES) {
    const nextWave = bossBattle.currentWave + 1;
    updatedBossBattle.currentWave = nextWave;

    if (bossBattle.bossType === 'pizzaTheHut') {
      // Set up staggered spawning for next wave
      updatedBossBattle.minions = [];
      updatedBossBattle.slimesRemainingInWave = getSlimeWaveCount(nextWave);
      updatedBossBattle.nextSlimeSpawnTime = now;
      updatedBossBattle.slimeWaveIndex = 0;
    } else {
      updatedBossBattle.minions = createWaveMinions(nextWave, now, config.MINIONS_PER_WAVE, bossBattle.bossType);
    }
    events.push({ type: 'WAVE_COMPLETE', nextWave });
  } else if (!bossBattle.bossVulnerable) {
    updatedBossBattle.bossVulnerable = true;
    updatedBossBattle.minions = [];
    events.push({ type: 'BOSS_VULNERABLE' });
  }

  return { updatedBossBattle, events };
};

/**
 * Process cheese slime effects for Pizza the Hut
 */
export const processSlimeEffects = (
  minions: BossMinion[],
  chefLane: number,
  now: number
): {
  updatedMinions: BossMinion[];
  ovenDisables: { lane: number; until: number }[];
  chefSlowUntil?: number;
  events: BossEvent[];
} => {
  const OVEN_X = 10;
  const CHEF_X = GAME_CONFIG.CHEF_X_POSITION;
  const ovenDisables: { lane: number; until: number }[] = [];
  let chefSlowUntil: number | undefined;
  const events: BossEvent[] = [];

  const updatedMinions = minions.map(minion => {
    if (!minion.slime || minion.defeated) return minion;

    // Check oven collision (slime reaches oven area)
    if (minion.position <= OVEN_X && minion.position > OVEN_X - 3) {
      ovenDisables.push({
        lane: minion.lane,
        until: now + PIZZA_THE_HUT_CONFIG.OVEN_DISABLE_DURATION,
      });
      events.push({ type: 'SLIME_HIT_OVEN', lane: minion.lane });
      return { ...minion, defeated: true }; // Consumed by oven
    }

    // Check chef collision (slime reaches chef and matches lane)
    if (minion.position <= CHEF_X && minion.lane === chefLane) {
      chefSlowUntil = now + PIZZA_THE_HUT_CONFIG.CHEF_SLOW_DURATION;
      events.push({ type: 'SLIME_HIT_CHEF', lane: minion.lane });
      return { ...minion, defeated: true };
    }

    // Off-screen
    if (minion.position <= POSITIONS.OFF_SCREEN_LEFT) {
      return { ...minion, defeated: true };
    }

    return minion;
  });

  return { updatedMinions, ovenDisables, chefSlowUntil, events };
};

/**
 * Process a full boss battle tick
 */
export const processBossTick = (
  bossBattle: BossBattle,
  slices: PizzaSlice[],
  currentLevel: number,
  defeatedBossLevels: number[],
  now: number,
  chefLane?: number,
  activePowerUps?: ActivePowerUp[]
): BossTickResult => {
  if (!bossBattle.active || bossBattle.bossDefeated) {
    return {
      nextBossBattle: bossBattle,
      consumedSliceIds: new Set(),
      livesLost: 0,
      scoreGained: 0,
      events: [],
    };
  }

  const allEvents: BossEvent[] = [];
  let totalScore = 0;
  let totalLivesLost = 0;
  const allConsumedSliceIds = new Set<string>();

  // 0. Spawn continuous slimes for Pizza the Hut (until defeated)
  let updatedBoss = { ...bossBattle };
  if (bossBattle.bossType === 'pizzaTheHut' &&
      !bossBattle.bossDefeated &&
      bossBattle.nextSlimeSpawnTime !== undefined &&
      now >= bossBattle.nextSlimeSpawnTime) {
    const slimeIndex = bossBattle.slimeWaveIndex ?? 0;
    const newSlime = createSingleSlime(
      1,
      slimeIndex,
      now,
      bossBattle.bossPosition,
      bossBattle.bossLane
    );
    updatedBoss = {
      ...bossBattle,
      minions: [...bossBattle.minions, newSlime],
      nextSlimeSpawnTime: now + PIZZA_THE_HUT_CONFIG.SLIME_THROW_INTERVAL,
      slimeWaveIndex: slimeIndex + 1,
    };
  }

  // 1. Move minions
  const iceCreamActive = activePowerUps?.some(p => p.type === 'ice-cream') ?? false;
  let currentMinions = updateMinionPositions(updatedBoss.minions, iceCreamActive);

  // 2. Check minions reaching chef
  const reachResult = checkMinionsReachedChef(currentMinions);
  currentMinions = reachResult.updatedMinions;
  totalLivesLost = reachResult.livesLost;
  if (reachResult.livesLost > 0) {
    for (let i = 0; i < reachResult.livesLost; i++) {
      allEvents.push({ type: 'MINION_REACHED_CHEF' });
    }
  }

  // 2.5. Process slime effects (Pizza the Hut only)
  let ovenDisables: { lane: number; until: number }[] | undefined;
  let chefSlowUntil: number | undefined;
  if (updatedBoss.bossType === 'pizzaTheHut' && chefLane !== undefined) {
    const slimeResult = processSlimeEffects(currentMinions, chefLane, now);
    currentMinions = slimeResult.updatedMinions;
    ovenDisables = slimeResult.ovenDisables.length > 0 ? slimeResult.ovenDisables : undefined;
    chefSlowUntil = slimeResult.chefSlowUntil;
    allEvents.push(...slimeResult.events);
  }

  // 3. Process slice-minion collisions
  const minionCollisionResult = processSliceMinionCollisions(slices, currentMinions);
  currentMinions = minionCollisionResult.updatedMinions;
  minionCollisionResult.consumedSliceIds.forEach(id => allConsumedSliceIds.add(id));
  totalScore += minionCollisionResult.scoreGained;
  allEvents.push(...minionCollisionResult.events);

  let currentBossBattle: BossBattle = {
    ...updatedBoss,
    minions: currentMinions,
  };

  // 3.5. Update boss vertical movement
  currentBossBattle = updateBossLane(currentBossBattle);

  // 4. Process slice-boss collisions (if vulnerable)
  const bossCollisionResult = processSliceBossCollisions(
    slices,
    currentBossBattle,
    allConsumedSliceIds,
    currentLevel,
    defeatedBossLevels
  );
  currentBossBattle = bossCollisionResult.updatedBossBattle;
  bossCollisionResult.consumedSliceIds.forEach(id => allConsumedSliceIds.add(id));
  totalScore += bossCollisionResult.scoreGained;
  allEvents.push(...bossCollisionResult.events);

  // 5. Check wave completion
  if (!currentBossBattle.bossDefeated) {
    const waveResult = checkWaveCompletion(currentBossBattle, now);
    currentBossBattle = waveResult.updatedBossBattle;
    allEvents.push(...waveResult.events);
  }

  return {
    nextBossBattle: currentBossBattle,
    consumedSliceIds: allConsumedSliceIds,
    livesLost: totalLivesLost,
    scoreGained: totalScore,
    events: allEvents,
    defeatedBossLevel: bossCollisionResult.defeatedBossLevel,
    ovenDisables,
    chefSlowUntil,
  };
};
