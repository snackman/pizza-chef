import { Customer, PowerUp, CustomerVariant, PowerUpType, LevelPhase } from '../types/game';
import {
  GAME_CONFIG,
  POSITIONS,
  ENTITY_SPEEDS,
  POWERUPS,
  SCUMBAG_STEVE,
  HEALTH_INSPECTOR,
  LEVEL_SYSTEM,
  SPAWN_RATES,
  PROBABILITIES,
} from '../lib/constants';

export interface SpawnResult<T> {
  shouldSpawn: boolean;
  entity?: T;
}

// --- Level-aware helper functions ---

/**
 * Get the number of customers required for a given level
 */
export const getCustomersForLevel = (level: number): number => {
  if (level <= LEVEL_SYSTEM.CUSTOMERS_PER_LEVEL.length) {
    return LEVEL_SYSTEM.CUSTOMERS_PER_LEVEL[level - 1];
  }
  // Level 7+: 30 + 2 per level beyond 7
  const base = LEVEL_SYSTEM.CUSTOMERS_PER_LEVEL[LEVEL_SYSTEM.CUSTOMERS_PER_LEVEL.length - 1];
  return base + LEVEL_SYSTEM.CUSTOMERS_GROWTH_PER_LEVEL * (level - LEVEL_SYSTEM.CUSTOMERS_PER_LEVEL.length);
};

/**
 * Get unlocked customer variants for a given level
 */
export const getUnlockedCustomerTypes = (level: number): CustomerVariant[] => {
  const types: CustomerVariant[] = ['normal'];
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.CRITIC) types.push('critic');
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.BAD_LUCK_BRIAN) types.push('badLuckBrian');
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.SCUMBAG_STEVE) types.push('scumbagSteve');
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.HEALTH_INSPECTOR) types.push('healthInspector');
  return types;
};

/**
 * Get unlocked power-up types for a given level
 */
export const getUnlockedPowerUpTypes = (level: number): PowerUpType[] => {
  const types: PowerUpType[] = [];
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.HOT_HONEY) types.push('honey');
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.ICE_CREAM) types.push('ice-cream');
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.BEER) types.push('beer');
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.STAR) types.push('star');
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.DOGE) types.push('doge');
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.NYAN) types.push('nyan');
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.MOLTOBENNY) types.push('moltobenny');
  if (level >= LEVEL_SYSTEM.UNLOCK_SCHEDULE.PEPE) types.push('pepe');
  return types;
};

/**
 * Get customer speed multiplier for a given level
 */
export const getLevelSpeedMultiplier = (level: number): number => {
  if (level <= LEVEL_SYSTEM.SPEED_MULTIPLIERS.length) {
    return LEVEL_SYSTEM.SPEED_MULTIPLIERS[level - 1];
  }
  // After level 7: 1.3 + 0.05 per level beyond 7
  const base = LEVEL_SYSTEM.SPEED_MULTIPLIERS[LEVEL_SYSTEM.SPEED_MULTIPLIERS.length - 1];
  return base + LEVEL_SYSTEM.SPEED_GROWTH_PER_LEVEL * (level - LEVEL_SYSTEM.SPEED_MULTIPLIERS.length);
};

/**
 * Get spawn interval for a given level
 */
export const getLevelSpawnInterval = (level: number): number => {
  if (level <= LEVEL_SYSTEM.SPAWN_INTERVALS.length) {
    return LEVEL_SYSTEM.SPAWN_INTERVALS[level - 1];
  }
  return LEVEL_SYSTEM.SPAWN_INTERVAL_FLOOR;
};

/**
 * Get special customer spawn chances for a given level
 */
const getSpecialChances = (level: number) => {
  const idx = Math.min(level, LEVEL_SYSTEM.SPECIAL_CHANCES.CRITIC.length) - 1;
  return {
    critic: LEVEL_SYSTEM.SPECIAL_CHANCES.CRITIC[idx],
    brian: LEVEL_SYSTEM.SPECIAL_CHANCES.BRIAN[idx],
    steve: LEVEL_SYSTEM.SPECIAL_CHANCES.STEVE[idx],
    inspector: LEVEL_SYSTEM.SPECIAL_CHANCES.INSPECTOR[idx],
  };
};

/**
 * Calculate the spawn delay based on level (legacy compat)
 */
export const getCustomerSpawnDelay = (level: number): number => {
  return getLevelSpawnInterval(level);
};

/**
 * Calculate effective spawn rate based on level and boss status
 */
export const getEffectiveSpawnRate = (level: number, bossActive: boolean): number => {
  // With the new level system, we use a simpler spawn rate
  // that ensures customers spawn at a reasonable pace within the spawn interval
  const baseRate = 5.0; // Higher base rate since we gate by interval now
  return baseRate; // Customers keep spawning during boss battles
};

/**
 * Check if a customer should spawn and create one if so
 */
export const trySpawnCustomer = (
  lastSpawnTime: number,
  now: number,
  level: number,
  bossActive: boolean,
  levelPhase?: LevelPhase,
  customersServed?: number,
  customersRequired?: number,
  totalCustomersSpawned?: number,
): SpawnResult<Customer> => {
  // Don't spawn when level is complete or in store
  if (levelPhase === 'complete' || levelPhase === 'store') {
    return { shouldSpawn: false };
  }

  // Don't spawn if enough customers have been served — unless a boss is active,
  // in which case customers keep coming at the current level's rate
  if (customersServed !== undefined && customersRequired !== undefined && customersServed >= customersRequired) {
    if (levelPhase !== 'boss_incoming' && levelPhase !== 'boss') {
      return { shouldSpawn: false };
    }
  }

  const spawnDelay = getLevelSpawnInterval(level);

  // Check time gate
  if (now - lastSpawnTime < spawnDelay) {
    return { shouldSpawn: false };
  }

  // Random chance
  const effectiveSpawnRate = getEffectiveSpawnRate(level, bossActive);
  if (effectiveSpawnRate === 0 || Math.random() >= effectiveSpawnRate * 0.01) {
    return { shouldSpawn: false };
  }

  // Create the customer
  const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
  const disappointedEmojis = ['😢', '😭', '😠', '🤬'];

  // Determine customer variant based on level unlock schedule
  const unlockedTypes = getUnlockedCustomerTypes(level);
  const chances = getSpecialChances(level);

  let variant: CustomerVariant = 'normal';
  if (unlockedTypes.includes('critic') && Math.random() < chances.critic) {
    variant = 'critic';
  } else if (unlockedTypes.includes('badLuckBrian') && Math.random() < chances.brian) {
    variant = 'badLuckBrian';
  } else if (unlockedTypes.includes('scumbagSteve') && Math.random() < chances.steve) {
    variant = 'scumbagSteve';
  } else if (unlockedTypes.includes('healthInspector') && Math.random() < chances.inspector) {
    variant = 'healthInspector';
  }

  // Calculate speed with level speed multiplier
  const speedMultiplier = getLevelSpeedMultiplier(level);
  const baseSpeed = variant === 'scumbagSteve'
    ? ENTITY_SPEEDS.CUSTOMER_BASE * SCUMBAG_STEVE.SPEED_MULTIPLIER
    : variant === 'healthInspector'
    ? ENTITY_SPEEDS.CUSTOMER_BASE * HEALTH_INSPECTOR.SPEED_MULTIPLIER
    : ENTITY_SPEEDS.CUSTOMER_BASE;
  const speed = baseSpeed * speedMultiplier;

  // Create customer in 'approaching' state
  const customer: Customer = {
    id: `customer-${now}-${lane}`,
    lane,
    position: POSITIONS.SPAWN_X,
    speed,
    // Initial state: approaching (not served, leaving, or disappointed)
    served: false,
    hasPlate: false,
    leaving: false,
    disappointed: false,
    disappointedEmoji: disappointedEmojis[Math.floor(Math.random() * disappointedEmojis.length)],
    movingRight: false,
    // Customer variant
    critic: variant === 'critic',
    badLuckBrian: variant === 'badLuckBrian',
    scumbagSteve: variant === 'scumbagSteve',
    healthInspector: variant === 'healthInspector',
    slicesReceived: variant === 'scumbagSteve' ? 0 : undefined,
    lastLaneChangeTime: variant === 'scumbagSteve' ? now : undefined,
    flipped: variant === 'badLuckBrian', // Brian spawns flipped, Steve spawns normal
  };

  return { shouldSpawn: true, entity: customer };
};

/**
 * Check if a power-up should spawn and create one if so
 */
export const trySpawnPowerUp = (
  lastSpawnTime: number,
  now: number,
  level?: number,
): SpawnResult<PowerUp> => {
  // Check time gate
  if (now - lastSpawnTime < SPAWN_RATES.POWERUP_MIN_INTERVAL) {
    return { shouldSpawn: false };
  }

  // Check random chance
  if (Math.random() >= SPAWN_RATES.POWERUP_CHANCE) {
    return { shouldSpawn: false };
  }

  // Get unlocked power-up types for current level
  const unlockedTypes = level !== undefined ? getUnlockedPowerUpTypes(level) : POWERUPS.TYPES as unknown as PowerUpType[];

  if (unlockedTypes.length === 0) {
    return { shouldSpawn: false };
  }

  // Create the power-up
  const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
  const rand = Math.random();

  let randomType: PowerUpType;
  // Star has special probability if unlocked
  if (unlockedTypes.includes('star') && rand < PROBABILITIES.POWERUP_STAR_CHANCE) {
    randomType = 'star';
  } else {
    randomType = unlockedTypes[Math.floor(Math.random() * unlockedTypes.length)];
  }

  const powerUp: PowerUp = {
    id: `powerup-${now}-${lane}`,
    lane,
    position: POSITIONS.POWERUP_SPAWN_X,
    speed: ENTITY_SPEEDS.POWERUP,
    type: randomType,
  };

  return { shouldSpawn: true, entity: powerUp };
};

/**
 * Process all spawning for a tick
 * Returns new entities to add and whether spawn timers should be updated
 */
export const processSpawning = (
  lastCustomerSpawn: number,
  lastPowerUpSpawn: number,
  now: number,
  level: number,
  bossActive: boolean,
  levelPhase?: LevelPhase,
  customersServed?: number,
  customersRequired?: number,
  totalCustomersSpawned?: number,
): {
  newCustomer?: Customer;
  newPowerUp?: PowerUp;
  updateCustomerSpawnTime: boolean;
  updatePowerUpSpawnTime: boolean;
} => {
  const customerResult = trySpawnCustomer(
    lastCustomerSpawn, now, level, bossActive,
    levelPhase, customersServed, customersRequired, totalCustomersSpawned,
  );
  const powerUpResult = trySpawnPowerUp(lastPowerUpSpawn, now, level);

  return {
    newCustomer: customerResult.entity,
    newPowerUp: powerUpResult.entity,
    updateCustomerSpawnTime: customerResult.shouldSpawn,
    updatePowerUpSpawnTime: powerUpResult.shouldSpawn,
  };
};
