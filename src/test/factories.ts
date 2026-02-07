import {
  GameState,
  Customer,
  PizzaSlice,
  PowerUp,
  BossMinion,
  NyanSweep,
  EmptyPlate,
  ActivePowerUp,
} from '../types/game';
import { INITIAL_GAME_STATE } from '../lib/constants';

export const createGameState = (overrides: Partial<GameState> = {}): GameState => ({
  ...INITIAL_GAME_STATE,
  ...overrides,
} as GameState);

export const createCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'test-customer-1',
  lane: 0,
  position: 80,
  speed: 0.5,
  served: false,
  hasPlate: false,
  leaving: false,
  disappointed: false,
  disappointedEmoji: '😢',
  movingRight: false,
  critic: false,
  badLuckBrian: false,
  flipped: false,
  woozy: false,
  vomit: false,
  ...overrides,
});

export const createPizzaSlice = (overrides: Partial<PizzaSlice> = {}): PizzaSlice => ({
  id: 'test-slice-1',
  lane: 0,
  position: 50,
  speed: 3,
  ...overrides,
});

export const createPowerUp = (overrides: Partial<PowerUp> = {}): PowerUp => ({
  id: 'test-powerup-1',
  lane: 0,
  position: 50,
  speed: 1,
  type: 'honey',
  ...overrides,
});

export const createBossMinion = (overrides: Partial<BossMinion> = {}): BossMinion => ({
  id: 'test-minion-1',
  lane: 0,
  position: 50,
  speed: 0.15,
  defeated: false,
  ...overrides,
});

export const createNyanSweep = (overrides: Partial<NyanSweep> = {}): NyanSweep => ({
  active: true,
  xPosition: 10,
  laneDirection: 1,
  startTime: 1000,
  lastUpdateTime: 1000,
  startingLane: 1,
  ...overrides,
});

export const createEmptyPlate = (overrides: Partial<EmptyPlate> = {}): EmptyPlate => ({
  id: 'test-plate-1',
  lane: 0,
  position: 50,
  speed: 2,
  ...overrides,
});

export const createActivePowerUp = (overrides: Partial<ActivePowerUp> = {}): ActivePowerUp => ({
  type: 'honey',
  endTime: Date.now() + 5000,
  ...overrides,
});
