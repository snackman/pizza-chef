import { GameState, FloatingScore, StarLostReason, BossMinion, PizzaSlice, EmptyPlate } from '../types/game';
import { soundManager } from '../utils/sounds';
import { getStreakMultiplier } from '../components/StreakDisplay';
import { 
  GAME_CONFIG, 
  OVEN_CONFIG, 
  ENTITY_SPEEDS, 
  SCORING, 
  POWERUPS, 
  TIMINGS, 
  POSITIONS, 
  BOSS_CONFIG 
} from '../lib/constants';

// Helper function local to the engine
const addFloatingScore = (points: number, lane: number, position: number, state: GameState): GameState => {
  const now = Date.now();
  const newFloatingScore: FloatingScore = {
    id: `score-${now}-${Math.random()}`,
    points,
    lane,
    position,
    startTime: now,
  };

  return {
    ...state,
    floatingScores: [...state.floatingScores, newFloatingScore],
  };
};

export const calculateNextGameState = (
  prevState: GameState, 
  currentOvenSounds: {[key: number]: 'idle' | 'cooking' | 'ready' | 'warning' | 'burning'}
): { nextState: GameState, nextOvenSounds: {[key: number]: 'idle' | 'cooking' | 'ready' | 'warning' | 'burning'} } => {
  
  // 1. Handle Game Over / Paused immediately
  if (prevState.gameOver) {
    if (prevState.fallingPizza) {
      const newY = prevState.fallingPizza.y + ENTITY_SPEEDS.FALLING_PIZZA;
      if (newY > 400) {
        return { nextState: { ...prevState, fallingPizza: undefined }, nextOvenSounds: currentOvenSounds };
      }
      return { nextState: { ...prevState, fallingPizza: { ...prevState.fallingPizza, y: newY } }, nextOvenSounds: currentOvenSounds };
    }
    return { nextState: prevState, nextOvenSounds: currentOvenSounds };
  }

  if (prevState.paused) return { nextState: prevState, nextOvenSounds: currentOvenSounds };

  // 2. Initialize new state for this frame
  let newState = { ...prevState, stats: { ...prevState.stats, powerUpsUsed: { ...prevState.stats.powerUpsUsed } } };
  const now = Date.now();
  const updatedOvens = { ...newState.ovens };
  const newOvenSoundStates = { ...currentOvenSounds };

  // 3. Oven Logic
  Object.keys(updatedOvens).forEach(laneKey => {
    const lane = parseInt(laneKey);
    const oven = updatedOvens[lane];

    if (oven.cooking && !oven.burned) {
      const elapsed = oven.pausedElapsed !== undefined ? oven.pausedElapsed : now - oven.startTime;
      const speedUpgrade = newState.ovenSpeedUpgrades[lane] || 0;
      const cookTime = OVEN_CONFIG.COOK_TIMES[speedUpgrade];

      let currentState: 'idle' | 'cooking' | 'ready' | 'warning' | 'burning' = 'cooking';
      if (elapsed >= OVEN_CONFIG.BURN_TIME) currentState = 'burning';
      else if (elapsed >= OVEN_CONFIG.WARNING_TIME) currentState = 'warning';
      else if (elapsed >= cookTime) currentState = 'ready';

      const previousState = newOvenSoundStates[lane];
      if (currentState !== previousState) {
        if (currentState === 'ready' && previousState === 'cooking') soundManager.ovenReady();
        else if (currentState === 'warning' && previousState === 'ready') soundManager.ovenWarning();
        else if (currentState === 'burning' && previousState === 'warning') soundManager.ovenBurning();
        newOvenSoundStates[lane] = currentState;
      }

      if (elapsed >= OVEN_CONFIG.BURN_TIME) {
        soundManager.ovenBurned();
        soundManager.lifeLost();
        newState.lives = Math.max(0, newState.lives - 1);
        newState.lastStarLostReason = 'burned_pizza';
        if (newState.lives === 0) {
          newState.gameOver = true;
          soundManager.gameOver();
          if (newState.availableSlices > 0) {
            newState.fallingPizza = { lane: newState.chefLane, y: 0 };
            newState.availableSlices = 0;
          }
        }
        updatedOvens[lane] = { cooking: false, startTime: 0, burned: true, cleaningStartTime: 0, sliceCount: 0 };
        newOvenSoundStates[lane] = 'idle';
      }
    } else if (!oven.cooking && newOvenSoundStates[lane] !== 'idle') {
      newOvenSoundStates[lane] = 'idle';
    }

    if (oven.burned && oven.cleaningStartTime > 0 && now - oven.cleaningStartTime >= OVEN_CONFIG.CLEANING_TIME) {
      soundManager.cleaningComplete();
      updatedOvens[lane] = { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 };
    }
  });
  newState.ovens = updatedOvens;

  // 4. Cleanup Expirations
  newState.floatingScores = newState.floatingScores.filter(fs => now - fs.startTime < TIMINGS.FLOATING_SCORE_LIFETIME);
  newState.droppedPlates = newState.droppedPlates.filter(dp => now - dp.startTime < TIMINGS.DROPPED_PLATE_LIFETIME);
  newState.customers = newState.customers.map(customer => {
    if (customer.textMessage && customer.textMessageTime && now - customer.textMessageTime >= TIMINGS.TEXT_MESSAGE_LIFETIME) {
      return { ...customer, textMessage: undefined, textMessageTime: undefined };
    }
    return customer;
  });

  const expiredStarPower = newState.activePowerUps.some(p => p.type === 'star' && now >= p.endTime);
  const expiredHoney = newState.activePowerUps.some(p => p.type === 'honey' && now >= p.endTime);
  newState.activePowerUps = newState.activePowerUps.filter(powerUp => now < powerUp.endTime);

  if (expiredStarPower) newState.starPowerActive = false;
  if (expiredHoney) newState.customers = newState.customers.map(c => ({ ...c, hotHoneyAffected: false }));

  const hasHoney = newState.activePowerUps.some(p => p.type === 'honey');
  const hasIceCream = newState.activePowerUps.some(p => p.type === 'ice-cream');
  const hasStar = newState.activePowerUps.some(p => p.type === 'star');
  const hasDoge = newState.activePowerUps.some(p => p.type === 'doge');
  
  if (newState.powerUpAlert && now >= newState.powerUpAlert.endTime) {
    if (newState.powerUpAlert.type !== 'doge' || !hasDoge) {
      newState.powerUpAlert = undefined;
    }
  }

  const honeyPowerUp = newState.activePowerUps.find(p => p.type === 'honey');
  const iceCreamPowerUp = newState.activePowerUps.find(p => p.type === 'ice-cream');
  const honeyEndTime = honeyPowerUp?.endTime || 0;
  const iceCreamEndTime = iceCreamPowerUp?.endTime || 0;

  // 5. Update Customers
  newState.customers = newState.customers.map(customer => {
    const isDeparting = customer.served || customer.disappointed || customer.vomit || customer.leaving;
    if (isDeparting) return customer;

    if (customer.woozy) return { ...customer, frozen: false, hotHoneyAffected: false };

    if (hasHoney && hasIceCream) {
      if (honeyEndTime > iceCreamEndTime) {
        if (customer.shouldBeHotHoneyAffected) return { ...customer, hotHoneyAffected: true, frozen: false };
      } else {
        if (customer.shouldBeFrozenByIceCream && !customer.unfrozenThisPeriod) return { ...customer, frozen: true, hotHoneyAffected: false };
      }
    } else if (hasHoney && customer.shouldBeHotHoneyAffected) {
      return { ...customer, hotHoneyAffected: true, frozen: false };
    } else if (hasIceCream && customer.shouldBeFrozenByIceCream && !customer.unfrozenThisPeriod) {
      return { ...customer, frozen: true, hotHoneyAffected: false };
    }

    if (!hasIceCream && (customer.frozen || customer.unfrozenThisPeriod || customer.shouldBeFrozenByIceCream)) {
      return { ...customer, frozen: undefined, unfrozenThisPeriod: undefined, shouldBeFrozenByIceCream: undefined };
    }
    if (!hasHoney && customer.hotHoneyAffected) {
      return { ...customer, hotHoneyAffected: false, shouldBeHotHoneyAffected: undefined };
    }
    return customer;
  });

  newState.customers = newState.customers.map(customer => {
    if (customer.brianNyaned) {
      return {
        ...customer,
        position: customer.position + (customer.speed * 3),
        lane: customer.lane - 0.06,
        flipped: false, hotHoneyAffected: false, frozen: false, woozy: false,
      };
    }

    if (customer.frozen && !customer.hotHoneyAffected) return { ...customer, hotHoneyAffected: false };

    if (customer.served && !customer.woozy) {
      return { ...customer, position: customer.position + (customer.speed * 2), hotHoneyAffected: false };
    }

    if (customer.woozy) {
      if (customer.movingRight) {
        const newPosition = customer.position + (customer.speed * 0.75);
        if (newPosition >= POSITIONS.TURN_AROUND_POINT) return { ...customer, position: newPosition, movingRight: false };
        return { ...customer, position: newPosition };
      } else {
        const speedModifier = 0.75;
        const newPosition = customer.position - (customer.speed * speedModifier);
        if (newPosition <= GAME_CONFIG.CHEF_X_POSITION) {
          soundManager.customerDisappointed();
          soundManager.lifeLost();
          newState.stats.currentCustomerStreak = 0;
          const starsLost = customer.critic ? 2 : 1;
          newState.lives = Math.max(0, newState.lives - starsLost);
          newState.lastStarLostReason = customer.critic ? 'woozy_critic_reached' : 'woozy_customer_reached';
          if (newState.lives === 0) {
            newState.gameOver = true;
            soundManager.gameOver();
            if (newState.availableSlices > 0) {
              newState.fallingPizza = { lane: newState.chefLane, y: 0 };
              newState.availableSlices = 0;
            }
          }
          return { ...customer, position: newPosition, disappointed: true, movingRight: true, woozy: false, hotHoneyAffected: false };
        }
        return { ...customer, position: newPosition };
      }
    }

    if (customer.disappointed || customer.vomit || customer.brianDropped) {
      return { ...customer, position: customer.position + (customer.speed * 2), hotHoneyAffected: false };
    }

    if (customer.badLuckBrian && customer.movingRight) {
      return { ...customer, position: customer.position + customer.speed, hotHoneyAffected: false };
    }

    if (customer.badLuckBrian && !customer.movingRight && !customer.served && !customer.disappointed) {
      const speedModifier = customer.hotHoneyAffected ? 0.5 : 1;
      const newPosition = customer.position - (customer.speed * speedModifier);

      if (newPosition <= GAME_CONFIG.CHEF_X_POSITION) {
        return {
          ...customer,
          position: newPosition,
          textMessage: "You don't have gluten free?",
          textMessageTime: Date.now(),
          flipped: false,
          leaving: true,
          movingRight: true,
          hotHoneyAffected: false
        };
      }
      return { ...customer, position: newPosition };
    }

    const speedModifier = customer.hotHoneyAffected ? 0.5 : 1;
    const newPosition = customer.position - (customer.speed * speedModifier);
    
    if (newPosition <= GAME_CONFIG.CHEF_X_POSITION) {
      soundManager.customerDisappointed();
      soundManager.lifeLost();
      newState.stats.currentCustomerStreak = 0;
      const starsLost = customer.critic ? 2 : 1;
      newState.lives = Math.max(0, newState.lives - starsLost);
      newState.lastStarLostReason = customer.critic ? 'disappointed_critic' : 'disappointed_customer';
      if (newState.lives === 0) {
        newState.gameOver = true;
        soundManager.gameOver();
        if (newState.availableSlices > 0) {
          newState.fallingPizza = { lane: newState.chefLane, y: 0 };
          newState.availableSlices = 0;
        }
      }
      return { ...customer, position: newPosition, disappointed: true, movingRight: true, hotHoneyAffected: false };
    }
    return { ...customer, position: newPosition };
  }).filter(customer => customer.position > POSITIONS.OFF_SCREEN_LEFT && customer.position <= 100);

  // 6. Star Power Auto-Feed
  const starPowerScores: Array<{ points: number; lane: number; position: number }> = [];
  if (hasStar && newState.availableSlices > 0) {
    newState.customers = newState.customers.map(customer => {
      if (customer.lane === newState.chefLane && !customer.served && !customer.disappointed && !customer.vomit && Math.abs(customer.position - GAME_CONFIG.CHEF_X_POSITION) < 8) {
        newState.availableSlices = Math.max(0, newState.availableSlices - 1);

        if (customer.badLuckBrian) {
          soundManager.plateDropped();
          newState.stats.currentCustomerStreak = 0;
          newState.stats.currentPlateStreak = 0;
          const droppedPlate = {
            id: `dropped-${Date.now()}-${customer.id}`,
            lane: customer.lane, position: customer.position, startTime: Date.now(), hasSlice: true,
          };
          newState.droppedPlates = [...newState.droppedPlates, droppedPlate];
          return { ...customer, flipped: false, leaving: true, movingRight: true, textMessage: "Ugh! I dropped my slice!", textMessageTime: Date.now() };
        }

        soundManager.customerServed();
        const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
        const dogeMultiplier = hasDoge ? 2 : 1;
        const customerStreakMultiplier = getStreakMultiplier(newState.stats.currentCustomerStreak);
        const pointsEarned = Math.floor(baseScore * dogeMultiplier * customerStreakMultiplier);
        
        newState.score += pointsEarned;
        newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
        newState.happyCustomers += 1;
        starPowerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
        newState.stats.customersServed += 1;
        newState.stats.currentCustomerStreak += 1;
        if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;

        if (!customer.critic && newState.happyCustomers % 8 === 0 && newState.lives < GAME_CONFIG.MAX_LIVES) {
          const starsToAdd = Math.min(hasDoge ? 2 : 1, GAME_CONFIG.MAX_LIVES - newState.lives);
          newState.lives += starsToAdd;
          if (starsToAdd > 0) soundManager.lifeGained();
        }

        const newPlate: EmptyPlate = {
          id: `plate-star-${Date.now()}-${customer.id}`,
          lane: customer.lane, position: customer.position, speed: ENTITY_SPEEDS.PLATE,
        };
        newState.emptyPlates = [...newState.emptyPlates, newPlate];
        return { ...customer, served: true, hasPlate: false };
      }
      return customer;
    });
  }
  starPowerScores.forEach(({ points, lane, position }) => newState = addFloatingScore(points, lane, position, newState));

  // 7. Chef Powerup Collisions
  const caughtPowerUpIds = new Set<string>();
  const powerUpScores: Array<{ points: number; lane: number; position: number }> = [];
  newState.powerUps.forEach(powerUp => {
    if (powerUp.position <= GAME_CONFIG.CHEF_X_POSITION && powerUp.lane === newState.chefLane && !newState.nyanSweep?.active) {
      soundManager.powerUpCollected(powerUp.type);
      const scoreMultiplier = hasDoge ? 2 : 1;
      const pointsEarned = SCORING.POWERUP_COLLECTED * scoreMultiplier;
      newState.score += pointsEarned;
      powerUpScores.push({ points: pointsEarned, lane: powerUp.lane, position: powerUp.position });
      caughtPowerUpIds.add(powerUp.id);
      newState.stats.powerUpsUsed[powerUp.type] += 1;

      if (powerUp.type === 'beer') {
        let livesLost = 0;
        let lastReason: StarLostReason | undefined;
        newState.customers = newState.customers.map(customer => {
          if (customer.critic && !customer.served && !customer.vomit && !customer.disappointed) {
            return {
              ...customer,
              textMessage: "I prefer wine",
              textMessageTime: Date.now(),
            };
          }

          if (customer.woozy) {
            livesLost += customer.critic ? 2 : 1;
            lastReason = customer.critic ? 'beer_critic_vomit' : 'beer_vomit';
            return { ...customer, woozy: false, vomit: true, disappointed: true, movingRight: true };
          }
          if (!customer.served && !customer.vomit && !customer.disappointed) {
            if (customer.badLuckBrian) {
              livesLost += 1;
              lastReason = 'brian_hurled';
              return { ...customer, vomit: true, disappointed: true, movingRight: true, flipped: false, textMessage: "Oh man I hurled", textMessageTime: Date.now(), hotHoneyAffected: false, frozen: false };
            }
            return { ...customer, woozy: true, woozyState: 'normal', movingRight: true, hotHoneyAffected: false, frozen: false };
          }
          return customer;
        });
        newState.lives = Math.max(0, newState.lives - livesLost);
        if (livesLost > 0) {
          soundManager.lifeLost();
          newState.stats.currentCustomerStreak = 0;
          if (lastReason) newState.lastStarLostReason = lastReason;
        }
        if (newState.lives === 0) {
          newState.gameOver = true;
          soundManager.gameOver();
          if (newState.availableSlices > 0) {
            newState.fallingPizza = { lane: newState.chefLane, y: 0 };
            newState.availableSlices = 0;
          }
        }
      } else if (powerUp.type === 'star') {
        newState.availableSlices = GAME_CONFIG.MAX_SLICES;
        newState.starPowerActive = true;
        newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== 'star'), { type: 'star', endTime: now + POWERUPS.DURATION }];
      } else if (powerUp.type === 'doge') {
        newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== 'doge'), { type: 'doge', endTime: now + POWERUPS.DURATION }];
        newState.powerUpAlert = { type: 'doge', endTime: now + POWERUPS.ALERT_DURATION_DOGE, chefLane: newState.chefLane };
      } else if (powerUp.type === 'nyan') {
        if (!newState.nyanSweep?.active) {
          newState.nyanSweep = {
            active: true, xPosition: GAME_CONFIG.CHEF_X_POSITION, laneDirection: 1, startTime: now, lastUpdateTime: now, startingLane: newState.chefLane
          };
          soundManager.nyanCatPowerUp();
          if (!hasDoge || newState.powerUpAlert?.type !== 'doge') {
            newState.powerUpAlert = { type: 'nyan', endTime: now + POWERUPS.ALERT_DURATION_NYAN, chefLane: newState.chefLane };
          }
        }
      } else if (powerUp.type === 'moltobenny') {
        const moltoScore = SCORING.MOLTOBENNY_POINTS * scoreMultiplier;
        const moltoMoney = SCORING.MOLTOBENNY_CASH * scoreMultiplier;
        newState.score += moltoScore;
        newState.bank += moltoMoney;
        powerUpScores.push({ points: moltoScore, lane: newState.chefLane, position: GAME_CONFIG.CHEF_X_POSITION });
      } else {
        newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== powerUp.type), { type: powerUp.type, endTime: now + POWERUPS.DURATION }];
        if (powerUp.type === 'honey') {
          newState.customers = newState.customers.map(c => (!c.served && !c.disappointed && !c.vomit) ? { ...c, shouldBeHotHoneyAffected: true, hotHoneyAffected: true, frozen: false, woozy: false, woozyState: undefined } : c);
        }
        if (powerUp.type === 'ice-cream') {
          newState.customers = newState.customers.map(c => {
            if (!c.served && !c.disappointed && !c.vomit) {
              if (c.badLuckBrian) return { ...c, textMessage: "I'm lactose intolerant", textMessageTime: Date.now() };
              return { ...c, shouldBeFrozenByIceCream: true, frozen: true, hotHoneyAffected: false, woozy: false, woozyState: undefined };
            }
            return c;
          });
        }
      }
    }
  });

  newState.powerUps = newState.powerUps.filter(powerUp => !caughtPowerUpIds.has(powerUp.id))
    .map(powerUp => ({ ...powerUp, position: powerUp.position - powerUp.speed }))
    .filter(powerUp => powerUp.position > 10);
  powerUpScores.forEach(({ points, lane, position }) => newState = addFloatingScore(points, lane, position, newState));

  newState.pizzaSlices = newState.pizzaSlices.map(slice => ({ ...slice, position: slice.position + slice.speed }));

  // 8. Collision Logic (Pizza Slices)
  const remainingSlices: PizzaSlice[] = [];
  const destroyedPowerUpIds = new Set<string>();
  const platesFromSlices = new Set<string>();
  const customerScores: Array<{ points: number; lane: number; position: number }> = [];
  let sliceWentOffScreen = false;

  newState.pizzaSlices.forEach(slice => {
    let consumed = false;
    newState.customers = newState.customers.map(customer => {
      if (customer.disappointed || customer.vomit || customer.leaving) return customer;

      if (!consumed && customer.frozen && customer.lane === slice.lane && Math.abs(customer.position - slice.position) < 5) {
        consumed = true;
        if (customer.badLuckBrian) {
          soundManager.plateDropped();
          newState.stats.currentCustomerStreak = 0;
          newState.stats.currentPlateStreak = 0;
          platesFromSlices.add(slice.id);
          const droppedPlate = { id: `dropped-${Date.now()}-${customer.id}`, lane: customer.lane, position: customer.position, startTime: Date.now(), hasSlice: true };
          newState.droppedPlates = [...newState.droppedPlates, droppedPlate];
          return { ...customer, frozen: false, leaving: true, flipped: false, movingRight: true, textMessage: "Ugh! I dropped my slice!", textMessageTime: Date.now() };
        }
        soundManager.customerUnfreeze();
        const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
        const dogeMultiplier = hasDoge ? 2 : 1;
        const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
        newState.score += pointsEarned;
        newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
        customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
        newState.happyCustomers += 1;
        newState.stats.customersServed += 1;
        newState.stats.currentCustomerStreak += 1;
        if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;

        if (newState.happyCustomers % 8 === 0 && newState.lives < GAME_CONFIG.MAX_LIVES) {
          const starsToAdd = Math.min(hasDoge ? 2 : 1, GAME_CONFIG.MAX_LIVES - newState.lives);
          newState.lives += starsToAdd;
          if (starsToAdd > 0) soundManager.lifeGained();
        }

        const newPlate: EmptyPlate = { id: `plate-${Date.now()}-${customer.id}-unfreeze`, lane: customer.lane, position: customer.position, speed: ENTITY_SPEEDS.PLATE };
        newState.emptyPlates = [...newState.emptyPlates, newPlate];
        platesFromSlices.add(slice.id);
        return { ...customer, frozen: false, unfrozenThisPeriod: true, served: true, hasPlate: false };
      }

      if (customer.position <= 0) return customer;

      if (!consumed && customer.woozy && !customer.frozen && customer.lane === slice.lane && Math.abs(customer.position - slice.position) < 5) {
        consumed = true;
        if (customer.badLuckBrian) {
          soundManager.plateDropped();
          newState.stats.currentCustomerStreak = 0;
          newState.stats.currentPlateStreak = 0;
          platesFromSlices.add(slice.id);
          const droppedPlate = { id: `dropped-${Date.now()}-${customer.id}`, lane: customer.lane, position: customer.position, startTime: Date.now(), hasSlice: true };
          newState.droppedPlates = [...newState.droppedPlates, droppedPlate];
          return { ...customer, woozy: false, leaving: true, flipped: false, movingRight: true, textMessage: "Ugh! I dropped my slice!", textMessageTime: Date.now() };
        }

        const currentState = customer.woozyState || 'normal';
        if (hasHoney && customer.hotHoneyAffected) {
          soundManager.customerServed();
          const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
          const dogeMultiplier = hasDoge ? 2 : 1;
          const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
          newState.score += pointsEarned;
          newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
          customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
          newState.happyCustomers += 1;
          newState.stats.customersServed += 1;
          newState.stats.currentCustomerStreak += 1;
          if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
          if (newState.happyCustomers % 8 === 0 && newState.lives < GAME_CONFIG.MAX_LIVES) {
            const starsToAdd = Math.min(hasDoge ? 2 : 1, GAME_CONFIG.MAX_LIVES - newState.lives);
            newState.lives += starsToAdd;
            if (starsToAdd > 0) soundManager.lifeGained();
          }
          const newPlate: EmptyPlate = { id: `plate-${Date.now()}-${customer.id}`, lane: customer.lane, position: customer.position, speed: ENTITY_SPEEDS.PLATE };
          newState.emptyPlates = [...newState.emptyPlates, newPlate];
          platesFromSlices.add(slice.id);
          return { ...customer, woozy: false, woozyState: 'satisfied', served: true, hasPlate: false, hotHoneyAffected: false };
        }

        if (currentState === 'normal') {
          soundManager.woozyServed();
          const baseScore = SCORING.CUSTOMER_FIRST_SLICE;
          const dogeMultiplier = hasDoge ? 2 : 1;
          const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
          newState.score += pointsEarned;
          newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
          customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
          const newPlate: EmptyPlate = { id: `plate-${Date.now()}-${customer.id}-first`, lane: customer.lane, position: customer.position, speed: ENTITY_SPEEDS.PLATE };
          newState.emptyPlates = [...newState.emptyPlates, newPlate];
          platesFromSlices.add(slice.id);
          return { ...customer, woozy: false, woozyState: 'drooling' };
        } else if (currentState === 'drooling') {
          soundManager.customerServed();
          const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
          const dogeMultiplier = hasDoge ? 2 : 1;
          const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
          newState.score += pointsEarned;
          newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
          customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
          newState.happyCustomers += 1;
          newState.stats.customersServed += 1;
          newState.stats.currentCustomerStreak += 1;
          if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
          if (newState.happyCustomers % 8 === 0 && newState.lives < GAME_CONFIG.MAX_LIVES) {
            const starsToAdd = Math.min(hasDoge ? 2 : 1, GAME_CONFIG.MAX_LIVES - newState.lives);
            newState.lives += starsToAdd;
            if (starsToAdd > 0) soundManager.lifeGained();
          }
          const newPlate: EmptyPlate = { id: `plate-${Date.now()}-${customer.id}`, lane: customer.lane, position: customer.position, speed: ENTITY_SPEEDS.PLATE };
          newState.emptyPlates = [...newState.emptyPlates, newPlate];
          platesFromSlices.add(slice.id);
          return { ...customer, woozy: false, woozyState: 'satisfied', served: true, hasPlate: false };
        }
      }

      if (!consumed && !customer.served && !customer.woozy && !customer.frozen && customer.lane === slice.lane && Math.abs(customer.position - slice.position) < 5) {
        consumed = true;
        if (customer.badLuckBrian) {
          soundManager.plateDropped();
          newState.stats.currentCustomerStreak = 0;
          newState.stats.currentPlateStreak = 0;
          platesFromSlices.add(slice.id);
          const droppedPlate = { id: `dropped-${Date.now()}-${customer.id}`, lane: customer.lane, position: customer.position, startTime: Date.now(), hasSlice: true };
          newState.droppedPlates = [...newState.droppedPlates, droppedPlate];
          return { ...customer, flipped: false, leaving: true, movingRight: true, textMessage: "Ugh! I dropped my slice!", textMessageTime: Date.now() };
        }

        soundManager.customerServed();
        const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
        const dogeMultiplier = hasDoge ? 2 : 1;
        const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
        newState.score += pointsEarned;
        newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
        customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
        newState.happyCustomers += 1;
        newState.stats.customersServed += 1;
        newState.stats.currentCustomerStreak += 1;
        if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;

        if (customer.critic) {
          if (customer.position >= 50 && newState.lives < GAME_CONFIG.MAX_LIVES) {
            newState.lives += 1;
            soundManager.lifeGained();
          }
        } else {
          if (newState.happyCustomers % 8 === 0 && newState.lives < GAME_CONFIG.MAX_LIVES) {
            soundManager.lifeGained();
            newState.lives += 1;
          }
        }
        const newPlate: EmptyPlate = { id: `plate-${Date.now()}-${customer.id}`, lane: customer.lane, position: customer.position, speed: ENTITY_SPEEDS.PLATE };
        newState.emptyPlates = [...newState.emptyPlates, newPlate];
        platesFromSlices.add(slice.id);
        return { ...customer, served: true, hasPlate: false };
      }
      return customer;
    });

    if (!consumed && slice.position < POSITIONS.OFF_SCREEN_RIGHT) {
      remainingSlices.push(slice);
      newState.powerUps.forEach(powerUp => {
        if (powerUp.lane === slice.lane && Math.abs(powerUp.position - slice.position) < 5) {
          soundManager.pizzaDestroyed();
          destroyedPowerUpIds.add(powerUp.id);
        }
      });
    } else if (!consumed && slice.position >= POSITIONS.OFF_SCREEN_RIGHT) {
      sliceWentOffScreen = true;
    }
  });

  const finalSlices = remainingSlices.filter(slice => {
    if (platesFromSlices.has(slice.id)) return true;
    const hitPowerUp = Array.from(destroyedPowerUpIds).some(powerUpId => {
      const powerUp = newState.powerUps.find(p => p.id === powerUpId);
      return powerUp && powerUp.lane === slice.lane && Math.abs(powerUp.position - slice.position) < 5;
    });
    if (hitPowerUp) sliceWentOffScreen = true;
    return !hitPowerUp;
  });

  newState.pizzaSlices = finalSlices;
  newState.powerUps = newState.powerUps.filter(p => !destroyedPowerUpIds.has(p.id));

  if (sliceWentOffScreen) newState.stats.currentPlateStreak = 0;
  customerScores.forEach(({ points, lane, position }) => newState = addFloatingScore(points, lane, position, newState));

  // 9. Plate Movement & Catching
  const platesToAddScores: Array<{ points: number; lane: number; position: number }> = [];
  newState.emptyPlates = newState.emptyPlates.map(plate => ({ ...plate, position: plate.position - plate.speed })).filter(plate => {
    if (plate.position <= 10 && plate.lane === newState.chefLane && !newState.nyanSweep?.active) {
      soundManager.plateCaught();
      const baseScore = SCORING.PLATE_CAUGHT;
      const dogeMultiplier = hasDoge ? 2 : 1;
      const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentPlateStreak));
      newState.score += pointsEarned;
      platesToAddScores.push({ points: pointsEarned, lane: plate.lane, position: plate.position });
      newState.stats.platesCaught += 1;
      newState.stats.currentPlateStreak += 1;
      if (newState.stats.currentPlateStreak > newState.stats.largestPlateStreak) newState.stats.largestPlateStreak = newState.stats.currentPlateStreak;
      return false;
    } else if (plate.position <= 0) {
      soundManager.plateDropped();
      newState.stats.currentPlateStreak = 0;
      return false;
    }
    return true;
  });
  platesToAddScores.forEach(({ points, lane, position }) => newState = addFloatingScore(points, lane, position, newState));

  // 10. Nyan Cat Sweep
  if (newState.nyanSweep?.active) {
    const MAX_X = 90;
    const UPDATE_INTERVAL = 50;
    if (now - newState.nyanSweep.lastUpdateTime >= UPDATE_INTERVAL) {
      const INITIAL_X = GAME_CONFIG.CHEF_X_POSITION;
      const increment = ((MAX_X - INITIAL_X) / 80) * 1.5;
      const newXPosition = newState.nyanSweep.xPosition + increment;
      let newLane = newState.chefLane + newState.nyanSweep.laneDirection * 0.5;
      let newLaneDirection = newState.nyanSweep.laneDirection;
      if (newLane > GAME_CONFIG.LANE_BOTTOM) {
        newLane = 2.5;
        newLaneDirection = -1;
      } else if (newLane < GAME_CONFIG.LANE_TOP) {
        newLane = 0.5;
        newLaneDirection = 1;
      }
      newState.chefLane = newLane;
      newState.nyanSweep = { ...newState.nyanSweep, xPosition: newXPosition, laneDirection: newLaneDirection, lastUpdateTime: now };
    }

    const nyanScores: Array<{ points: number; lane: number; position: number }> = [];
    newState.customers = newState.customers.map(customer => {
      if (customer.served || customer.disappointed || customer.vomit) return customer;

      if (customer.lane === newState.chefLane && Math.abs(customer.position - newState.nyanSweep!.xPosition) < 10) {
        if (customer.badLuckBrian) {
          soundManager.customerServed();
          return { ...customer, brianNyaned: true, leaving: true, hasPlate: false, flipped: false, movingRight: true, woozy: false, frozen: false, unfrozenThisPeriod: undefined };
        }

        soundManager.customerServed();
        const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
        const dogeMultiplier = hasDoge ? 2 : 1;
        const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
        newState.score += pointsEarned;
        newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
        nyanScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
        newState.happyCustomers += 1;
        newState.stats.customersServed += 1;
        newState.stats.currentCustomerStreak += 1;
        if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;

        if (customer.critic) {
          if (customer.position >= 55 && newState.lives < GAME_CONFIG.MAX_LIVES) {
            newState.lives += 1;
            soundManager.lifeGained();
          }
        } else {
          if (newState.happyCustomers % 8 === 0 && newState.lives < GAME_CONFIG.MAX_LIVES) {
            const starsToAdd = Math.min(hasDoge ? 2 : 1, GAME_CONFIG.MAX_LIVES - newState.lives);
            newState.lives += starsToAdd;
            if (starsToAdd > 0) soundManager.lifeGained();
          }
        }
        return { ...customer, served: true, hasPlate: false, woozy: false, frozen: false, unfrozenThisPeriod: undefined };
      }
      return customer;
    });

    if (newState.bossBattle?.active && !newState.bossBattle.bossDefeated) {
      const nyanX = newState.nyanSweep.xPosition;
      const chefLaneFloat = newState.chefLane;
      newState.bossBattle.minions = newState.bossBattle.minions.map(minion => {
        if (minion.defeated) return minion;
        if (Math.abs(minion.lane - chefLaneFloat) < 0.6 && Math.abs(minion.position - nyanX) < 10) {
          soundManager.customerServed();
          const pointsEarned = SCORING.MINION_DEFEAT;
          newState.score += pointsEarned;
          newState = addFloatingScore(pointsEarned, minion.lane, minion.position, newState);
          return { ...minion, defeated: true };
        }
        return minion;
      });
    }
    nyanScores.forEach(({ points, lane, position }) => newState = addFloatingScore(points, lane, position, newState));

    if (newState.nyanSweep.xPosition >= MAX_X) {
      newState.chefLane = Math.round(newState.chefLane);
      newState.chefLane = Math.max(GAME_CONFIG.LANE_TOP, Math.min(GAME_CONFIG.LANE_BOTTOM, newState.chefLane));
      newState.nyanSweep = undefined;
      if (newState.pendingStoreShow) {
        newState.showStore = true;
        newState.pendingStoreShow = false;
      }
    }
  }

  // 11. Leveling & Store Triggers
  const targetLevel = Math.floor(newState.score / GAME_CONFIG.LEVEL_THRESHOLD) + 1;
  if (targetLevel > newState.level) {
    newState.level = targetLevel;
    const highestStoreLevel = Math.floor(targetLevel / GAME_CONFIG.STORE_LEVEL_INTERVAL) * GAME_CONFIG.STORE_LEVEL_INTERVAL;
    if (highestStoreLevel >= 10 && highestStoreLevel > newState.lastStoreLevelShown) {
      newState.lastStoreLevelShown = highestStoreLevel;
      if (newState.nyanSweep?.active) newState.pendingStoreShow = true;
      else newState.showStore = true;
    }

    if (targetLevel === BOSS_CONFIG.TRIGGER_LEVEL && !newState.bossBattle?.active && !newState.bossBattle?.bossDefeated) {
      const initialMinions: BossMinion[] = [];
      for (let i = 0; i < BOSS_CONFIG.MINIONS_PER_WAVE; i++) {
        initialMinions.push({
          id: `minion-${now}-1-${i}`,
          lane: i % 4,
          position: POSITIONS.SPAWN_X + (Math.floor(i / 4) * 15),
          speed: ENTITY_SPEEDS.MINION,
          defeated: false,
        });
      }
      newState.bossBattle = {
        active: true, bossHealth: BOSS_CONFIG.HEALTH, currentWave: 1, minions: initialMinions, bossVulnerable: true, bossDefeated: false, bossPosition: BOSS_CONFIG.BOSS_POSITION,
      };
    }
  }

  // 12. Boss Battle Logic
  if (newState.bossBattle?.active && !newState.bossBattle.bossDefeated) {
    const bossScores: Array<{ points: number; lane: number; position: number }> = [];
    newState.bossBattle.minions = newState.bossBattle.minions.map(minion => {
      if (minion.defeated) return minion;
      return { ...minion, position: minion.position - minion.speed };
    });

    newState.bossBattle.minions = newState.bossBattle.minions.map(minion => {
      if (minion.defeated) return minion;
      if (minion.position <= GAME_CONFIG.CHEF_X_POSITION) {
        soundManager.lifeLost();
        newState.lives = Math.max(0, newState.lives - 1);
        if (newState.lives === 0) {
          newState.gameOver = true;
          soundManager.gameOver();
          if (newState.availableSlices > 0) {
            newState.fallingPizza = { lane: newState.chefLane, y: 0 };
            newState.availableSlices = 0;
          }
        }
        return { ...minion, defeated: true };
      }
      return minion;
    });

    const consumedSliceIds = new Set<string>();
    newState.pizzaSlices.forEach(slice => {
      if (consumedSliceIds.has(slice.id)) return;
      newState.bossBattle!.minions = newState.bossBattle!.minions.map(minion => {
        if (minion.defeated || consumedSliceIds.has(slice.id)) return minion;
        if (minion.lane === slice.lane && Math.abs(minion.position - slice.position) < 8) {
          consumedSliceIds.add(slice.id);
          soundManager.customerServed();
          const pointsEarned = SCORING.MINION_DEFEAT;
          newState.score += pointsEarned;
          bossScores.push({ points: pointsEarned, lane: minion.lane, position: minion.position });
          return { ...minion, defeated: true };
        }
        return minion;
      });
    });

    if (newState.bossBattle.bossVulnerable) {
      newState.pizzaSlices.forEach(slice => {
        if (consumedSliceIds.has(slice.id)) return;
        if (Math.abs(newState.bossBattle!.bossPosition - slice.position) < 10) {
          consumedSliceIds.add(slice.id);
          soundManager.customerServed();
          newState.bossBattle!.bossHealth -= 1;
          const pointsEarned = SCORING.BOSS_HIT;
          newState.score += pointsEarned;
          bossScores.push({ points: pointsEarned, lane: slice.lane, position: slice.position });
          if (newState.bossBattle!.bossHealth <= 0) {
            newState.bossBattle!.bossDefeated = true;
            newState.bossBattle!.active = false;
            newState.bossBattle!.minions = [];
            newState.score += SCORING.BOSS_DEFEAT;
            bossScores.push({ points: SCORING.BOSS_DEFEAT, lane: 1, position: newState.bossBattle!.bossPosition });
          }
        }
      });
    }
    newState.pizzaSlices = newState.pizzaSlices.filter(slice => !consumedSliceIds.has(slice.id));
    bossScores.forEach(({ points, lane, position }) => newState = addFloatingScore(points, lane, position, newState));

    const activeMinions = newState.bossBattle.minions.filter(m => !m.defeated);
    if (activeMinions.length === 0) {
      if (newState.bossBattle.currentWave < BOSS_CONFIG.WAVES) {
        const nextWave = newState.bossBattle.currentWave + 1;
        const newMinions: BossMinion[] = [];
        for (let i = 0; i < BOSS_CONFIG.MINIONS_PER_WAVE; i++) {
          newMinions.push({
            id: `minion-${now}-${nextWave}-${i}`,
            lane: i % 4,
            position: POSITIONS.SPAWN_X + (Math.floor(i / 4) * 15),
            speed: ENTITY_SPEEDS.MINION,
            defeated: false,
          });
        }
        newState.bossBattle.currentWave = nextWave;
        newState.bossBattle.minions = newMinions;
      } else if (!newState.bossBattle.bossVulnerable) {
        newState.bossBattle.bossVulnerable = true;
        newState.bossBattle.minions = [];
      }
    }
  }

  return { nextState: newState, nextOvenSounds: newOvenSoundStates };
};