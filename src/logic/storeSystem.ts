// src/logic/storeSystem.ts
import { GameState, PowerUp } from '../types/game';
import { COSTS, ENTITY_SPEEDS, POSITIONS, GAME_CONFIG, OVEN_CONFIG } from '../lib/constants';

export type StoreEvent = { type: 'LIFE_GAINED' };

export type StoreResult = {
  nextState: GameState;
  events: StoreEvent[];
};

// Calculate cumulative upgrade cost: $10 for 1st, $20 for 2nd, $30 for 3rd, etc.
export const getUpgradeCost = (currentLevel: number): number => {
  return COSTS.OVEN_UPGRADE * (currentLevel + 1);
};

export const getSpeedUpgradeCost = (currentLevel: number): number => {
  return COSTS.OVEN_SPEED_UPGRADE * (currentLevel + 1);
};

export const upgradeOven = (prev: GameState, lane: number): GameState => {
  const currentUpgrade = prev.ovenUpgrades[lane] || 0;
  const upgradeCost = getUpgradeCost(currentUpgrade);

  if (prev.bank >= upgradeCost && currentUpgrade < OVEN_CONFIG.MAX_UPGRADE_LEVEL) {
    return {
      ...prev,
      bank: prev.bank - upgradeCost,
      ovenUpgrades: { ...prev.ovenUpgrades, [lane]: currentUpgrade + 1 },
      stats: { ...prev.stats, ovenUpgradesMade: prev.stats.ovenUpgradesMade + 1, totalSpent: prev.stats.totalSpent + upgradeCost },
    };
  }
  return prev;
};

export const upgradeOvenSpeed = (prev: GameState, lane: number): GameState => {
  const currentSpeedUpgrade = prev.ovenSpeedUpgrades[lane] || 0;
  const speedUpgradeCost = getSpeedUpgradeCost(currentSpeedUpgrade);

  if (prev.bank >= speedUpgradeCost && currentSpeedUpgrade < OVEN_CONFIG.MAX_SPEED_LEVEL) {
    return {
      ...prev,
      bank: prev.bank - speedUpgradeCost,
      ovenSpeedUpgrades: { ...prev.ovenSpeedUpgrades, [lane]: currentSpeedUpgrade + 1 },
      stats: { ...prev.stats, ovenUpgradesMade: prev.stats.ovenUpgradesMade + 1, totalSpent: prev.stats.totalSpent + speedUpgradeCost },
    };
  }
  return prev;
};

export const closeStore = (prev: GameState): GameState => {
  return { ...prev, showStore: false };
};

export const bribeReviewer = (prev: GameState): StoreResult => {
  const bribeCost = COSTS.BRIBE_REVIEWER;

  if (prev.bank >= bribeCost && prev.lives < GAME_CONFIG.MAX_LIVES) {
    return {
      nextState: { ...prev, bank: prev.bank - bribeCost, lives: prev.lives + 1, stats: { ...prev.stats, totalSpent: prev.stats.totalSpent + bribeCost } },
      events: [{ type: 'LIFE_GAINED' }],
    };
  }

  return { nextState: prev, events: [] };
};

export const buyPowerUp = (
  prev: GameState,
  type: 'beer' | 'ice-cream' | 'honey',
  now: number
): GameState => {
  const powerUpCost = COSTS.BUY_POWERUP;
  if (prev.bank < powerUpCost) return prev;

  const lane = prev.chefLane;

  const newPowerUp: PowerUp = {
    id: `powerup-bought-${now}`,
    lane,
    position: POSITIONS.SPAWN_X,
    speed: ENTITY_SPEEDS.POWERUP,
    type: type === 'ice-cream' ? 'ice-cream' : type === 'beer' ? 'beer' : 'honey',
  };

  return {
    ...prev,
    bank: prev.bank - powerUpCost,
    powerUps: [...prev.powerUps, newPowerUp],
    stats: { ...prev.stats, totalSpent: prev.stats.totalSpent + powerUpCost },
  };
};