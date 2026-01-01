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
  woozyState?: 'normal' | 'drooling' | 'satisfied';
  movingRight?: boolean;
  vomit?: boolean;
  frozen?: boolean;
  unfrozenThisPeriod?: boolean;
  hotHoneyAffected?: boolean;
  shouldBeFrozenByIceCream?: boolean;
  shouldBeHotHoneyAffected?: boolean;
  critic?: boolean;
  badLuckBrian?: boolean;
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
}

export type PowerUpType = 'honey' | 'ice-cream' | 'beer' | 'star' | 'doge' | 'nyan' | 'moltobenny';

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

export interface DroppedPlate {
  id: string;
  lane: number;
  position: number;
  startTime: number;
  hasSlice?: boolean;
}

export interface BossMinion {
  id: string;
  lane: number;
  position: number;
  speed: number;
  defeated: boolean;
}

export interface BossBattle {
  active: boolean;
  bossHealth: number;
  currentWave: number;
  minions: BossMinion[];
  bossVulnerable: boolean;
  bossDefeated: boolean;
  bossPosition: number;
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
  };
  ovenUpgradesMade: number;
}

export type StarLostReason =
  | 'burned_pizza'
  | 'disappointed_customer'
  | 'disappointed_critic'
  | 'woozy_customer_reached'
  | 'woozy_critic_reached'
  | 'beer_vomit'
  | 'beer_critic_vomit'
  | 'brian_hurled';

export interface GameState {
  customers: Customer[];
  pizzaSlices: PizzaSlice[];
  emptyPlates: EmptyPlate[];
  powerUps: PowerUp[];
  activePowerUps: ActivePowerUp[];
  floatingScores: FloatingScore[];
  droppedPlates: DroppedPlate[];
  chefLane: number;
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
  lastStarLostReason?: StarLostReason;
  paused: boolean;
  availableSlices: number;
  ovens: { [key: number]: { cooking: boolean; startTime: number; burned: boolean; cleaningStartTime: number; pausedElapsed?: number; sliceCount: number } };
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
  nyanSweep?: { active: boolean; xPosition: number; laneDirection: 1 | -1; startTime: number; lastUpdateTime: number; startingLane: number };
  stats: GameStats;
  bossBattle?: BossBattle;
  defeatedBossLevels: number[];
}