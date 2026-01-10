import { GameState, BossBattle, BossMinion, PizzaSlice } from '../types/game';
import { BOSS_CONFIG, POSITIONS, ENTITY_SPEEDS, SCORING } from '../lib/constants';
import { checkSliceMinionCollision, checkMinionReachedChef } from './collisionSystem';

export type BossEvent =
  | { type: 'MINION_DEFEATED'; lane: number; position: number; points: number }
  | { type: 'BOSS_HIT'; lane: number; position: number; points: number }
  | { type: 'BOSS_DEFEATED'; lane: number; position: number; points: number }
  | { type: 'MINION_REACHED_CHEF' }
  | { type: 'WAVE_COMPLETE'; nextWave: number }
  | { type: 'BOSS_VULNERABLE' };

export interface BossTickResult {
  nextBossBattle: BossBattle;
  consumedSliceIds: Set<string>;
  livesLost: number;
  scoreGained: number;
  events: BossEvent[];
  defeatedBossLevel?: number;
}

/**
 * Check if a boss battle should trigger based on level progression
 */
export const checkBossTrigger = (
  oldLevel: number,
  newLevel: number,
  defeatedBossLevels: number[],
  currentBossBattle?: BossBattle
): number | null => {
  if (currentBossBattle?.active) return null;

  const crossedBossLevel = BOSS_CONFIG.TRIGGER_LEVELS.find(
    triggerLvl => oldLevel < triggerLvl && newLevel >= triggerLvl
  );

  if (crossedBossLevel !== undefined && !defeatedBossLevels.includes(crossedBossLevel)) {
    return crossedBossLevel;
  }

  return null;
};

/**
 * Create initial minions for a wave
 */
export const createWaveMinions = (waveNumber: number, now: number): BossMinion[] => {
  const minions: BossMinion[] = [];
  for (let i = 0; i < BOSS_CONFIG.MINIONS_PER_WAVE; i++) {
    minions.push({
      id: `minion-${now}-${waveNumber}-${i}`,
      lane: i % 4,
      position: POSITIONS.SPAWN_X + (Math.floor(i / 4) * 15),
      speed: ENTITY_SPEEDS.MINION,
      defeated: false,
    });
  }
  return minions;
};

/**
 * Initialize a new boss battle
 */
export const initializeBossBattle = (now: number): BossBattle => {
  return {
    active: true,
    bossHealth: BOSS_CONFIG.HEALTH,
    currentWave: 1,
    minions: createWaveMinions(1, now),
    bossVulnerable: false,
    bossDefeated: false,
    bossPosition: BOSS_CONFIG.BOSS_POSITION,
    bossLane: 1.5, // Start in the middle (between lanes 1 and 2)
    bossLaneDirection: 1, // Start moving down
  };
};

/**
 * Update boss vertical position (moves up and down between lanes)
 */
export const updateBossLane = (bossBattle: BossBattle): BossBattle => {
  if (!bossBattle.active || bossBattle.bossDefeated) return bossBattle;

  const BOSS_LANE_SPEED = 0.02; // How fast the boss moves vertically
  const MIN_LANE = 0.5;
  const MAX_LANE = 2.5;

  let newLane = bossBattle.bossLane + (BOSS_LANE_SPEED * bossBattle.bossLaneDirection);
  let newDirection = bossBattle.bossLaneDirection;

  // Bounce off top and bottom
  if (newLane >= MAX_LANE) {
    newLane = MAX_LANE;
    newDirection = -1;
  } else if (newLane <= MIN_LANE) {
    newLane = MIN_LANE;
    newDirection = 1;
  }

  return {
    ...bossBattle,
    bossLane: newLane,
    bossLaneDirection: newDirection,
  };
};

/**
 * Update minion positions (move left)
 */
export const updateMinionPositions = (minions: BossMinion[]): BossMinion[] => {
  return minions.map(minion => {
    if (minion.defeated) return minion;
    return { ...minion, position: minion.position - minion.speed };
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
    if (minion.defeated) return minion;
    if (checkMinionReachedChef(minion)) {
      livesLost++;
      return { ...minion, defeated: true };
    }
    return minion;
  });
  return { updatedMinions, livesLost };
};

/**
 * Process slice-minion collisions
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

  let updatedMinions = [...minions];

  slices.forEach(slice => {
    if (consumedSliceIds.has(slice.id)) return;

    updatedMinions = updatedMinions.map(minion => {
      if (minion.defeated || consumedSliceIds.has(slice.id)) return minion;

      if (checkSliceMinionCollision(slice, minion, 8)) {
        consumedSliceIds.add(slice.id);
        const points = SCORING.MINION_DEFEAT;
        scoreGained += points;
        events.push({
          type: 'MINION_DEFEATED',
          lane: minion.lane,
          position: minion.position,
          points,
        });
        return { ...minion, defeated: true };
      }
      return minion;
    });
  });

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
    const horizontalHit = Math.abs(updatedBossBattle.bossPosition - slice.position) < 10;
    const verticalHit = Math.abs(updatedBossBattle.bossLane - slice.lane) < 1.2; // Boss is roughly 1 lane tall

    if (horizontalHit && verticalHit) {
      consumedSliceIds.add(slice.id);
      updatedBossBattle.bossHealth -= 1;

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
        const currentBossLevel = BOSS_CONFIG.TRIGGER_LEVELS
          .slice()
          .reverse()
          .find(lvl => currentLevel >= lvl);

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

  if (activeMinions.length > 0) {
    return { updatedBossBattle: bossBattle, events };
  }

  let updatedBossBattle = { ...bossBattle };

  if (bossBattle.currentWave < BOSS_CONFIG.WAVES) {
    const nextWave = bossBattle.currentWave + 1;
    updatedBossBattle.currentWave = nextWave;
    updatedBossBattle.minions = createWaveMinions(nextWave, now);
    events.push({ type: 'WAVE_COMPLETE', nextWave });
  } else if (!bossBattle.bossVulnerable) {
    updatedBossBattle.bossVulnerable = true;
    updatedBossBattle.minions = [];
    events.push({ type: 'BOSS_VULNERABLE' });
  }

  return { updatedBossBattle, events };
};

/**
 * Process a full boss battle tick
 */
export const processBossTick = (
  bossBattle: BossBattle,
  slices: PizzaSlice[],
  currentLevel: number,
  defeatedBossLevels: number[],
  now: number
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

  // 1. Move minions
  let currentMinions = updateMinionPositions(bossBattle.minions);

  // 2. Check minions reaching chef
  const reachResult = checkMinionsReachedChef(currentMinions);
  currentMinions = reachResult.updatedMinions;
  totalLivesLost = reachResult.livesLost;
  if (reachResult.livesLost > 0) {
    for (let i = 0; i < reachResult.livesLost; i++) {
      allEvents.push({ type: 'MINION_REACHED_CHEF' });
    }
  }

  // 3. Process slice-minion collisions
  const minionCollisionResult = processSliceMinionCollisions(slices, currentMinions);
  currentMinions = minionCollisionResult.updatedMinions;
  minionCollisionResult.consumedSliceIds.forEach(id => allConsumedSliceIds.add(id));
  totalScore += minionCollisionResult.scoreGained;
  allEvents.push(...minionCollisionResult.events);

  let currentBossBattle: BossBattle = {
    ...bossBattle,
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
  };
};
