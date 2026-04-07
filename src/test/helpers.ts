import { GameState, Customer, ActivePowerUp, PowerUpType } from '../types/game';
import { createCustomer, createActivePowerUp, createGameState } from './factories';
import { updateCustomerPositions } from '../logic/customerSystem';

/**
 * Advance the game state through N simulated frames of customer movement.
 * Each frame calls updateCustomerPositions to simulate real movement ticks.
 * Returns the final updated state with the new customer positions applied.
 */
export const advanceGameFrames = (
  state: GameState,
  frames: number,
  activePowerUps: ActivePowerUp[] = [],
  startTime: number = Date.now()
): GameState => {
  let customers = [...state.customers];
  const frameInterval = 50; // matches GAME_CONFIG.GAME_LOOP_INTERVAL

  for (let i = 0; i < frames; i++) {
    const now = startTime + (i + 1) * frameInterval;
    const result = updateCustomerPositions(customers, activePowerUps, now);
    customers = result.nextCustomers;
  }

  return {
    ...state,
    customers,
  };
};

/**
 * Add a customer at the given lane to the game state.
 * The customer starts at the right side (position 98) and moves left.
 */
export const spawnCustomerAtLane = (
  state: GameState,
  lane: number,
  overrides: Partial<Customer> = {}
): GameState => {
  const customer = createCustomer({
    lane,
    position: 98,
    ...overrides,
  });

  return {
    ...state,
    customers: [...state.customers, customer],
  };
};

/**
 * Activate a power-up on the given game state.
 * Returns a new state with the power-up added to activePowerUps.
 */
export const activatePowerUp = (
  state: GameState,
  type: PowerUpType,
  durationMs: number = 5000
): GameState => {
  const powerUp = createActivePowerUp({
    type,
    endTime: Date.now() + durationMs,
  });

  return {
    ...state,
    activePowerUps: [...state.activePowerUps, powerUp],
  };
};
