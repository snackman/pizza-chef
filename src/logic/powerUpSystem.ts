import { GameState, PowerUp, PowerUpType, Customer, ActivePowerUp } from '../types/game';
import { POWERUPS, GAME_CONFIG, SCORING } from '../lib/constants';

export type PowerUpEvent = 
  | { type: 'SOUND', effect: string }
  | { type: 'LIFE_LOST', reason: 'beer_vomit' | 'brian_hurled' }
  | { type: 'GAME_OVER' };

interface PowerUpResult {
  newState: Partial<GameState>;
  events: PowerUpEvent[];
}

/**
 * Handles logic when the chef collects a power-up
 */
export const processPowerUpCollection = (
  state: GameState,
  powerUp: PowerUp,
  now: number
): PowerUpResult => {
  const events: PowerUpEvent[] = [{ type: 'SOUND', effect: powerUp.type }];
  let livesLost = 0;
  let lastReason: any = null;
  
  const dogeMultiplier = state.activePowerUps.some(p => p.type === 'doge') ? 2 : 1;
  const newState: Partial<GameState> = {
    score: state.score + (SCORING.POWERUP_COLLECTED * dogeMultiplier),
    activePowerUps: [...state.activePowerUps],
    stats: {
      ...state.stats,
      powerUpsUsed: {
        ...state.stats.powerUpsUsed,
        [powerUp.type]: (state.stats.powerUpsUsed[powerUp.type] || 0) + 1
      }
    }
  };

  // Logic per Type
  switch (powerUp.type) {
    case 'star':
      newState.availableSlices = GAME_CONFIG.MAX_SLICES;
      newState.starPowerActive = true;
      newState.activePowerUps = [
        ...newState.activePowerUps!.filter(p => p.type !== 'star'),
        { type: 'star', endTime: now + POWERUPS.DURATION }
      ];
      break;

    case 'doge':
      newState.activePowerUps = [
        ...newState.activePowerUps!.filter(p => p.type !== 'doge'),
        { type: 'doge', endTime: now + POWERUPS.DURATION }
      ];
      newState.powerUpAlert = { 
        type: 'doge', 
        endTime: now + POWERUPS.ALERT_DURATION_DOGE, 
        chefLane: state.chefLane 
      };
      break;

    case 'nyan':
      if (!state.nyanSweep?.active) {
        newState.nyanSweep = {
          active: true,
          xPosition: GAME_CONFIG.CHEF_X_POSITION,
          laneDirection: 1,
          startTime: now,
          lastUpdateTime: now,
          startingLane: state.chefLane
        };
        if (!state.activePowerUps.some(p => p.type === 'doge')) {
          newState.powerUpAlert = { 
            type: 'nyan', 
            endTime: now + POWERUPS.ALERT_DURATION_NYAN, 
            chefLane: state.chefLane 
          };
        }
      }
      break;

    case 'moltobenny':
      newState.score = (newState.score || state.score) + (SCORING.MOLTOBENNY_POINTS * dogeMultiplier);
      newState.bank = state.bank + (SCORING.MOLTOBENNY_CASH * dogeMultiplier);
      break;

    case 'beer':
      newState.customers = state.customers.map(customer => {
        if (customer.critic) {
          if (customer.woozy || (!customer.served && !customer.leaving)) {
            return { ...customer, textMessage: "I prefer wine", textMessageTime: now, woozy: false };
          }
          return customer;
        }
        if (customer.woozy) {
          livesLost++;
          lastReason = 'beer_vomit';
          return { ...customer, woozy: false, vomit: true, disappointed: true, movingRight: true };
        }
        if (!customer.served && !customer.disappointed && !customer.leaving) {
          if (customer.badLuckBrian) {
            livesLost++;
            lastReason = 'brian_hurled';
            return { ...customer, vomit: true, disappointed: true, movingRight: true, flipped: false, textMessage: "Oh man I hurled", textMessageTime: now };
          }
          return { ...customer, woozy: true, woozyState: 'normal', movingRight: true };
        }
        return customer;
      });
      break;

    case 'honey':
    case 'ice-cream':
      newState.activePowerUps = [
        ...newState.activePowerUps!.filter(p => p.type !== powerUp.type),
        { type: powerUp.type, endTime: now + POWERUPS.DURATION }
      ];
      newState.customers = state.customers.map(c => {
        if (c.served || c.disappointed || c.leaving) return c;
        if (powerUp.type === 'honey') {
          if (c.badLuckBrian) return { ...c, textMessage: "I can't do spicy.", textMessageTime: now };
          return { ...c, shouldBeHotHoneyAffected: true, hotHoneyAffected: true, frozen: false, woozy: false };
        } else {
          if (c.badLuckBrian) return { ...c, textMessage: "I'm lactose intolerant", textMessageTime: now };
          return { ...c, shouldBeFrozenByIceCream: true, frozen: true, hotHoneyAffected: false, woozy: false };
        }
      });
      break;
  }

  if (livesLost > 0) {
    newState.lives = Math.max(0, state.lives - livesLost);
    newState.lastStarLostReason = lastReason;
    events.push({ type: 'LIFE_LOST', reason: lastReason });
    if (newState.lives === 0) events.push({ type: 'GAME_OVER' });
  }

  return { newState, events };
};

/**
 * Checks for expired power-ups and cleans up state
 */
export const processPowerUpExpirations = (
  activePowerUps: ActivePowerUp[],
  customers: Customer[],
  now: number
) => {
  const stillActive = activePowerUps.filter(p => now < p.endTime);
  const expiredTypes = activePowerUps.filter(p => now >= p.endTime).map(p => p.type);
  
  let nextCustomers = customers;
  if (expiredTypes.includes('honey')) {
    nextCustomers = customers.map(c => ({ ...c, hotHoneyAffected: false }));
  }

  return {
    stillActive,
    expiredTypes,
    nextCustomers
  };
};