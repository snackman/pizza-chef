// Customer state machine types
export type CustomerState =
  | 'approaching'  // Moving toward chef
  | 'served'       // Got pizza, leaving happy
  | 'disappointed' // Reached chef without pizza, leaving sad
  | 'leaving'      // Generic leaving (Brian complaining, etc.)
  | 'vomit';       // Beer+woozy = sick

export type CustomerVariant = 'normal' | 'critic' | 'badLuckBrian' | 'scumbagSteve' | 'healthInspector';

export type WoozyState = 'normal' | 'drooling' | 'satisfied';

// Helper functions for state checks
export const isCustomerLeaving = (c: Customer): boolean =>
  c.served || c.disappointed || c.leaving || c.vomit || false;

export const isCustomerApproaching = (c: Customer): boolean =>
  !isCustomerLeaving(c);

export const getCustomerVariant = (c: Customer): CustomerVariant => {
  if (c.healthInspector) return 'healthInspector';
  if (c.scumbagSteve) return 'scumbagSteve';
  if (c.badLuckBrian) return 'badLuckBrian';
  if (c.critic) return 'critic';
  return 'normal';
};

export const isCustomerAffectedByPowerUps = (c: Customer): boolean =>
  !c.badLuckBrian && !c.critic && !c.scumbagSteve && !c.healthInspector && !c.served && !c.leaving && !c.disappointed;

export interface Customer {
  id: string;
  lane: number;
  position: number;
  speed: number;
  served: boolean;
  hasPlate: boolean;
  disappointed?: boolean;
  disappointedEmoji?: string;
  woozy?: boolean;
  woozyState?: WoozyState;
  movingRight?: boolean;
  vomit?: boolean;
  frozen?: boolean;
  unfrozenThisPeriod?: boolean;
  hotHoneyAffected?: boolean;
  shouldBeFrozenByIceCream?: boolean;
  shouldBeHotHoneyAffected?: boolean;
  critic?: boolean;
  badLuckBrian?: boolean;
  scumbagSteve?: boolean;
  healthInspector?: boolean;
  inspectorTipsy?: boolean;
  slicesReceived?: number; // For Steve who needs 2 slices
  lastLaneChangeTime?: number; // For Steve's random lane changes
  leaving?: boolean;
  brianNyaned?: boolean; // Brian got hit by Nyan + is flying away
  flipped?: boolean;
  textMessage?: string;
  textMessageTime?: number;
}

export interface PizzaSlice {
  id: string;
  lane: number;
  position: number;
  speed: number;
  falling?: boolean;
  fallY?: number;
}

export interface EmptyPlate {
  id: string;
  lane: number;
  position: number;
  speed: number;
  createdAt: number;
  // For angled throws (Steve)
  startLane?: number;
  startPosition?: number;
  targetLane?: number;
}

export interface NyanSweep {
  active: boolean;
  xPosition: number;
  laneDirection: number;
  startTime: number;
  lastUpdateTime: number;
  startingLane: number;
}

export interface PepeHelper {
  id: 'franco' | 'frank' | 'worker';
  lane: number;
  availableSlices: number;
  lastActionTime: number;
}

export interface HiredWorker {
  active: boolean;
  lane: number;
  availableSlices: number;
  lastActionTime: number;
}

export interface PepeHelpers {
  active: boolean;
  startTime: number;
  endTime: number;
  franco: PepeHelper;
  frank: PepeHelper;
}

export type PowerUpType = 'honey' | 'ice-cream' | 'beer' | 'star' | 'doge' | 'nyan' | 'moltobenny' | 'pepe' | 'speed' | 'slow';

export interface PowerUp {
  id: string;
  lane: number;
  position: number;
  speed: number;
  type: PowerUpType;
}

export interface ActivePowerUp {
  type: PowerUpType;
  endTime: number;
}

export interface FloatingScore {
  id: string;
  points: number;
  lane: number;
  position: number;
  startTime: number;
}

export interface FloatingStar {
  id: string;
  isGain: boolean; // true = gained star (green +), false = lost star (red -)
  count: number; // number of stars (e.g., 2 for critic)
  lane: number;
  position: number;
  startTime: number;
}

export interface DroppedPlate {
  id: string;
  lane: number;
  position: number;
  startTime: number;
  hasSlice?: boolean;
}

export interface OvenState {
  cooking: boolean;
  startTime: number;
  burned: boolean;
  cleaningStartTime: number;
  pausedElapsed?: number;
  sliceCount: number;
  slimeDisabledUntil?: number;
  slimeCleaningStartTime?: number;
}

export interface BossMinion {
  id: string;
  lane: number;
  position: number;
  speed: number;
  defeated: boolean;
  sprite?: string;
  slime?: boolean;
}

export type BossType = 'dominos' | 'papaJohn' | 'chuckECheese' | 'pizzaTheHut';

// Level system types
export type LevelPhase = 'playing' | 'boss_incoming' | 'boss' | 'complete' | 'store';

export interface LevelProgress {
  customersServed: number;
  customersRequired: number;
  levelStartTime: number;
  starsLostThisLevel: number;
}

export interface LevelAnnouncement {
  level: number;
  endTime: number;
}

export interface BossIncomingAlert {
  endTime: number;
}

export interface LevelCompleteInfo {
  level: number;
  customersServed: number;
  starsLost: number;
  rewards: number;
  bossDefeated: boolean;
}

export interface BossBattle {
  active: boolean;
  bossType: BossType;
  bossHealth: number;
  currentWave: number;
  minions: BossMinion[];
  bossVulnerable: boolean;
  bossDefeated: boolean;
  bossPosition: number;
  bossLane: number;
  bossLaneDirection: number; // 1 = moving down, -1 = moving up
  bossXDirection: number; // 1 = moving right, -1 = moving left
  hitsReceived?: number; // Track hits for Papa John sprite changes
  // Pizza the Hut staggered slime spawning
  slimesRemainingInWave?: number; // How many slimes left to throw this wave
  nextSlimeSpawnTime?: number; // When the next slime should be thrown
  slimeWaveIndex?: number; // Counter for unique slime IDs within wave
}

export interface GameStats {
  slicesBaked: number;
  customersServed: number;
  longestCustomerStreak: number;
  currentCustomerStreak: number;
  platesCaught: number;
  largestPlateStreak: number;
  currentPlateStreak: number;
  powerUpsUsed: {
    honey: number;
    'ice-cream': number;
    beer: number;
    star: number;
    doge: number;
    nyan: number;
    moltobenny: number;
    pepe: number;
    speed: number;
    slow: number;
  };
  ovenUpgradesMade: number;
  bestOfAwardsEarned: number;
}

export type StarLostReason =
  | 'burned_pizza'
  | 'disappointed_customer'
  | 'disappointed_critic'
  | 'woozy_customer_reached'
  | 'beer_vomit'
  | 'brian_hurled'
  | 'health_inspector_bribed'
  | 'health_inspector_failed'
  | 'inspector_vomit'
  | 'beer_around_kids'
  | 'steve_disappointed'
  | 'papajohn_minion_reached'
  | 'dominos_minion_reached';

export interface GameState {
  customers: Customer[];
  pizzaSlices: PizzaSlice[];
  emptyPlates: EmptyPlate[];
  powerUps: PowerUp[];
  activePowerUps: ActivePowerUp[];
  floatingScores: FloatingScore[];
  floatingStars: FloatingStar[];
  droppedPlates: DroppedPlate[];
  chefLane: number;
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
  lastStarLostReason?: StarLostReason;
  paused: boolean;
  availableSlices: number;
  ovens: { [key: number]: OvenState };
  ovenUpgrades: { [key: number]: number };
  ovenSpeedUpgrades: { [key: number]: number };
  happyCustomers: number;
  bank: number;
  showStore: boolean;
  lastStoreLevelShown: number;
  pendingStoreShow: boolean;
  fallingPizza?: { lane: number; y: number };
  starPowerActive?: boolean;
  powerUpAlert?: { type: PowerUpType; endTime: number; chefLane: number };
  nyanSweep?: NyanSweep;
  pepeHelpers?: PepeHelpers;
  hiredWorker?: HiredWorker;
  stats: GameStats;
  bossBattle?: BossBattle;
  defeatedBossLevels: number[];
  pendingBossQueue?: { type: BossType; level: number }[];
  cleanKitchenStartTime?: number;
  lastCleanKitchenBonusTime?: number;
  cleanKitchenBonusAlert?: { endTime: number };
  lastPauseTime?: number; // Track when game was paused for timer adjustments
  chefSlowedUntil?: number;
  // Level system
  levelPhase: LevelPhase;
  levelProgress: LevelProgress;
  levelAnnouncement?: LevelAnnouncement;
  bossIncomingAlert?: BossIncomingAlert;
  levelCompleteInfo?: LevelCompleteInfo;
  // Best Of Award
  bestOfStreakCount: number;
  bestOfAwardCount: number;
  bestOfAwardAlert?: { endTime: number };
}