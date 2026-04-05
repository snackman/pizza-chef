export const GAME_CONFIG = {
  // Global Settings
  MAX_LIVES: 5,
  STARTING_LIVES: 3,
  LEVEL_THRESHOLD: 500, // Score needed to level up
  GAME_LOOP_INTERVAL: 50, // ms
  MAX_FRAME_TIME: 200, // Cap delta to prevent spiral of death

  // Store Settings
  STORE_LEVEL_INTERVAL: 10,

  // Chef & Player
  MAX_SLICES: 8,
  CHEF_X_POSITION: 15, // The "catch/serve" zone (approx 15%)

  // Lanes
  LANE_COUNT: 4,
  LANE_TOP: 0,
  LANE_BOTTOM: 3,
};

export const OVEN_CONFIG = {
  BASE_COOKING_TIME: 3000,
  WARNING_TIME: 7000, // Pizza starts warning
  BURN_TIME: 8000,    // Pizza burns (total time)
  CLEANING_TIME: 3000,

  // Upgrade Timings (based on speedUpgrade level 0-3)
  COOK_TIMES: [3000, 2500, 2000, 1500],
  MAX_UPGRADE_LEVEL: 7,
  MAX_SPEED_LEVEL: 3,
};

export const ENTITY_SPEEDS = {
  PIZZA: 3,
  PLATE: 2,
  POWERUP: 0.69,
  CUSTOMER_BASE: 0.4,
  MINION: 0.15,
  FALLING_PIZZA: 5,
};

export const SPAWN_RATES = {
  CUSTOMER_BASE_RATE: 2.5,
  CUSTOMER_LEVEL_INCREMENT: 0.05,
  POWERUP_CHANCE: 0.02, // 2% chance per tick
  POWERUP_MIN_INTERVAL: 8000, // ms
  CUSTOMER_MIN_INTERVAL_BASE: 200,
  CUSTOMER_MIN_INTERVAL_DECREMENT: 20, // reduced per level
};

export const PROBABILITIES = {
  CRITIC_CHANCE: 0.15,
  BAD_LUCK_BRIAN_CHANCE: 0.1, // If not critic
  SCUMBAG_STEVE_CHANCE: 0.08, // If not critic or brian
  POWERUP_STAR_CHANCE: 0.1,
};

export const SCUMBAG_STEVE = {
  SPEED_MULTIPLIER: 1.4, // 40% faster than normal
  SLICES_REQUIRED: 2,
  LANE_CHANGE_INTERVAL: 1500, // ms between possible lane changes
  LANE_CHANGE_CHANCE: 0.3, // 30% chance to change lane each interval
};

export const HEALTH_INSPECTOR = {
  CHANCE: 0.08, // 8% chance (if not other variant)
  MIN_LEVEL: 5,
  SPEED_MULTIPLIER: 0.7, // 30% slower than normal
};

export const SCORING = {
  // Customer Service
  CUSTOMER_NORMAL: 150,
  CUSTOMER_CRITIC: 300,
  CUSTOMER_FIRST_SLICE: 50, // "Drooling" state

  // Actions
  PLATE_CAUGHT: 50,
  POWERUP_COLLECTED: 100,
  DOGE_COLLECTED: 420,
  NYAN_COLLECTED: 777,

  // Boss
  MINION_DEFEAT: 100,
  BOSS_HIT: 100,
  BOSS_DEFEAT: 5000,

  // Special
  MOLTOBENNY_POINTS: 10000,
  MOLTOBENNY_CASH: 69,

  // Bank
  BASE_BANK_REWARD: 1,

  // Clean Kitchen Bonus
  CLEAN_KITCHEN_BONUS: 1000,
  CLEAN_KITCHEN_TIME: 30000, // 30 seconds
};

export const COSTS = {
  OVEN_UPGRADE: 10,
  OVEN_SPEED_UPGRADE: 10,
  BRIBE_REVIEWER: 25,
  BUY_POWERUP: 5,
  HIRE_WORKER: 50,
  WORKER_RETENTION: 25,
};

export const WORKER_CONFIG = {
  ACTION_INTERVAL: 150,
  STARTING_SLICES: 2,
};

export const BOSS_CONFIG = {
  DOMINOS_LEVEL: 30,
  PAPA_JOHN_LEVEL: 10, // Single appearance at level 10
  PIZZA_THE_HUT_LEVEL: 40,
  BOSS_POSITION: 85,
};

export const PAPA_JOHN_CONFIG = {
  HEALTH: 40, // 40 slices to defeat, changes image every 8 hits
  WAVES: 3,
  MINIONS_PER_WAVE: 4,
  HITS_PER_IMAGE: 8, // Change sprite every 8 hits
};

export const PIZZA_THE_HUT_CONFIG = {
  HEALTH: 30,
  WAVES: 3,
  MINIONS_PER_WAVE: 6,
  SLIME_SPEED: 0.25,
  OVEN_DISABLE_DURATION: 5000,
  CHEF_SLOW_DURATION: 3000,
};

export const DOMINOS_CONFIG = {
  HEALTH: 24,
  WAVES: 3,
  MINIONS_PER_WAVE: 4,
};

export const POWERUPS = {
  DURATION: 5000, // ms
  DOGE_DURATION: 8750, // 75% longer than base duration
  PEPE_DURATION: 8000, // 8 seconds
  ALERT_DURATION_DOGE: 8750,
  ALERT_DURATION_NYAN: 3000,
  TYPES: ['honey', 'ice-cream', 'beer', 'doge', 'nyan', 'moltobenny', 'pepe'] as const,
};

export const NYAN_CONFIG = {
  MAX_X: 90,              // End position of sweep
  DURATION: 2600,         // Total sweep duration in ms
  LANE_CHANGE_SPEED: 0.01, // Vertical movement speed
  DT_MAX: 100,            // Max delta time per frame
};

export const PEPE_CONFIG = {
  ACTION_INTERVAL: 100,   // ms between helper actions (famous chefs are fast!)
  STARTING_SLICES: 4,     // Famous chefs come prepared
};

export const TIMINGS = {
  FLOATING_SCORE_LIFETIME: 1000,
  DROPPED_PLATE_LIFETIME: 1000,
  TEXT_MESSAGE_LIFETIME: 3000,
  WARNING_BLINK_INTERVAL: 250, // ms between warning blinks
};

export const POSITIONS = {
  SPAWN_X: 98,
  POWERUP_SPAWN_X: 98,
  OFF_SCREEN_RIGHT: 98,
  OFF_SCREEN_LEFT: -10,
  TURN_AROUND_POINT: 90, // For woozy customers
};

// Lane positioning (percentage-based layout)
export const LAYOUT = {
  LANE_HEIGHT_PERCENT: 25,  // Each lane is 25% of board height
  LANE_Y_OFFSET: 6,         // Vertical offset within lane (%)
};

export const INITIAL_GAME_STATE = {
  customers: [],
  pizzaSlices: [],
  emptyPlates: [],
  powerUps: [],
  activePowerUps: [],
  floatingScores: [],
  floatingStars: [],
  droppedPlates: [],
  chefLane: 0,
  score: 0,
  lives: GAME_CONFIG.STARTING_LIVES, // References the config defined at the top
  level: 1,
  gameOver: false,
  paused: false,
  availableSlices: 0,
  ovens: {
    0: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
    1: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
    2: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
    3: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 }
  },
  ovenUpgrades: { 0: 0, 1: 0, 2: 0, 3: 0 },
  ovenSpeedUpgrades: { 0: 0, 1: 0, 2: 0, 3: 0 },
  happyCustomers: 0,
  bank: 0,
  showStore: false,
  lastStoreLevelShown: 0,
  pendingStoreShow: false,
  fallingPizza: undefined,
  starPowerActive: false,
  powerUpAlert: undefined,
  nyanSweep: undefined,
  lastStarLostReason: undefined,
  hiredWorker: undefined,
  stats: {
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
  },
  bossBattle: undefined,
  defeatedBossLevels: [],
  cleanKitchenStartTime: undefined,
  lastCleanKitchenBonusTime: undefined,
  cleanKitchenBonusAlert: undefined,
};