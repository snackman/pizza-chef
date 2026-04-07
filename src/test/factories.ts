import {
  GameState,
  Customer,
  PizzaSlice,
  PowerUp,
  PowerUpType,
  BossBattle,
  BossType,
  BossMinion,
  ActivePowerUp,
  OvenState,
  GameStats,
} from '../types/game';
import { INITIAL_GAME_STATE, GAME_CONFIG } from '../lib/constants';

// ---------- Atomic Factories ----------

let idCounter = 0;
const nextId = (prefix: string = 'test') => `${prefix}-${++idCounter}`;

/** Reset the auto-increment id counter (useful between tests) */
export const resetIdCounter = () => {
  idCounter = 0;
};

/**
 * Create a Customer with sensible defaults. All fields can be overridden.
 */
export const createCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: nextId('customer'),
  lane: 0,
  position: 80,
  speed: 0.5,
  served: false,
  hasPlate: false,
  disappointed: false,
  disappointedEmoji: undefined,
  woozy: false,
  woozyState: undefined,
  movingRight: false,
  vomit: false,
  frozen: false,
  unfrozenThisPeriod: false,
  hotHoneyAffected: false,
  shouldBeFrozenByIceCream: false,
  shouldBeHotHoneyAffected: false,
  critic: false,
  badLuckBrian: false,
  scumbagSteve: false,
  healthInspector: false,
  inspectorTipsy: false,
  slicesReceived: 0,
  leaving: false,
  brianNyaned: false,
  flipped: false,
  textMessage: undefined,
  textMessageTime: undefined,
  ...overrides,
});

/**
 * Create a PizzaSlice with sensible defaults.
 */
export const createPizzaSlice = (overrides: Partial<PizzaSlice> = {}): PizzaSlice => ({
  id: nextId('slice'),
  lane: 0,
  position: 15,
  speed: 3,
  ...overrides,
});

/**
 * Create a PowerUp with sensible defaults.
 */
export const createPowerUp = (overrides: Partial<PowerUp> = {}): PowerUp => ({
  id: nextId('powerup'),
  lane: 0,
  position: 50,
  speed: 0.69,
  type: 'honey' as PowerUpType,
  ...overrides,
});

/**
 * Create an ActivePowerUp.
 */
export const createActivePowerUp = (overrides: Partial<ActivePowerUp> = {}): ActivePowerUp => ({
  type: 'honey' as PowerUpType,
  endTime: Date.now() + 5000,
  ...overrides,
});

/**
 * Create a BossMinion with sensible defaults.
 */
export const createBossMinion = (overrides: Partial<BossMinion> = {}): BossMinion => ({
  id: nextId('minion'),
  lane: 1,
  position: 85,
  speed: 0.15,
  defeated: false,
  ...overrides,
});

/**
 * Create a BossBattle with sensible defaults.
 */
export const createBossBattle = (overrides: Partial<BossBattle> = {}): BossBattle => ({
  active: true,
  bossType: 'papaJohn' as BossType,
  bossHealth: 40,
  currentWave: 1,
  minions: [],
  bossVulnerable: false,
  bossDefeated: false,
  bossPosition: 85,
  bossLane: 1,
  bossLaneDirection: 1,
  bossXDirection: 1,
  ...overrides,
});

/**
 * Create an OvenState.
 */
export const createOvenState = (overrides: Partial<OvenState> = {}): OvenState => ({
  cooking: false,
  startTime: 0,
  burned: false,
  cleaningStartTime: 0,
  sliceCount: 0,
  ...overrides,
});

/**
 * Create default GameStats.
 */
export const createGameStats = (overrides: Partial<GameStats> = {}): GameStats => ({
  slicesBaked: 0,
  customersServed: 0,
  longestCustomerStreak: 0,
  currentCustomerStreak: 0,
  platesCaught: 0,
  largestPlateStreak: 0,
  currentPlateStreak: 0,
  powerUpsUsed: {
    honey: 0,
    'ice-cream': 0,
    beer: 0,
    star: 0,
    doge: 0,
    nyan: 0,
    moltobenny: 0,
    pepe: 0,
    speed: 0,
    slow: 0,
  },
  ovenUpgradesMade: 0,
  ...overrides,
});

/**
 * Create a full valid GameState. Uses INITIAL_GAME_STATE as baseline
 * and merges any overrides on top.
 */
export const createGameState = (overrides: Partial<GameState> = {}): GameState => ({
  ...INITIAL_GAME_STATE,
  ...overrides,
} as GameState);
