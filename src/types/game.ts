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
  hotHoneyAffected?: boolean;
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

export type PowerUpType = 'honey' | 'ice-cream' | 'beer' | 'star' | 'doge' | 'nyan';

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

export interface GameState {
  customers: Customer[];
  pizzaSlices: PizzaSlice[];
  emptyPlates: EmptyPlate[];
  powerUps: PowerUp[];
  activePowerUps: ActivePowerUp[];
  chefLane: number;
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
  paused: boolean;
  availableSlices: number;
  ovens: { [key: number]: { cooking: boolean; startTime: number; burned: boolean; cleaningStartTime: number; pausedElapsed?: number; sliceCount: number } };
  ovenUpgrades: { [key: number]: number };
  ovenSpeedUpgrades: { [key: number]: number };
  happyCustomers: number;
  bank: number;
  showStore: boolean;
  lastStoreLevelShown: number;
  fallingPizza?: { lane: number; y: number };
  starPowerActive?: boolean;
  powerUpAlert?: { type: PowerUpType; endTime: number };
}