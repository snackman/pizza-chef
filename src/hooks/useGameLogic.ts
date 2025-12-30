import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, PowerUp, PowerUpType, FloatingScore, StarLostReason, BossMinion, EmptyPlate, PizzaSlice } from '../types/game';
import { soundManager } from '../utils/sounds';
import { getStreakMultiplier } from '../components/StreakDisplay';
import { 
  GAME_CONFIG, 
  OVEN_CONFIG, 
  ENTITY_SPEEDS, 
  SPAWN_RATES, 
  SCORING, 
  COSTS, 
  BOSS_CONFIG, 
  POWERUPS, 
  TIMINGS, 
  POSITIONS 
} from '../lib/constants';
import * as Spawners from '../game/spawners';
import { processOvenTick } from '../game/ovenLogic';

export const useGameLogic = (gameStarted: boolean = true) => {
  const [gameState, setGameState] = useState<GameState>({
    customers: [],
    pizzaSlices: [],
    emptyPlates: [],
    powerUps: [],
    activePowerUps: [],
    floatingScores: [],
    droppedPlates: [],
    chefLane: 0,
    score: 0,
    lives: GAME_CONFIG.STARTING_LIVES,
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
      },
      ovenUpgradesMade: 0,
    },
  });

  const [lastCustomerSpawn, setLastCustomerSpawn] = useState(0);
  const [lastPowerUpSpawn, setLastPowerUpSpawn] = useState(0);
  // We keep this for now to prevent sound overlapping, though logic is moved to helper
  const [ovenSoundStates, setOvenSoundStates] = useState<{[key: number]: 'idle' | 'cooking' | 'ready' | 'warning' | 'burning'}>({
    0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle'
  });
  const prevShowStoreRef = useRef(false);

  const addFloatingScore = useCallback((points: number, lane: number, position: number, state: GameState): GameState => {
    const now = Date.now();
    const newFloatingScore: FloatingScore = {
      id: `score-${now}-${Math.random()}`,
      points, lane, position, startTime: now,
    };
    return { ...state, floatingScores: [...state.floatingScores, newFloatingScore] };
  }, []);

  // --- SPAWNERS ---
  const spawnPowerUp = useCallback(() => {
    const now = Date.now();
    if (now - lastPowerUpSpawn < SPAWN_RATES.POWERUP_MIN_INTERVAL) return;
    setGameState(prev => ({ ...prev, powerUps: [...prev.powerUps, Spawners.createPowerUp(now)] }));
    setLastPowerUpSpawn(now);
  }, [lastPowerUpSpawn]);

  const spawnCustomer = useCallback(() => {
    const now = Date.now();
    const spawnDelay = SPAWN_RATES.CUSTOMER_MIN_INTERVAL_BASE - (gameState.level * SPAWN_RATES.CUSTOMER_MIN_INTERVAL_DECREMENT);
    if (now - lastCustomerSpawn < spawnDelay || gameState.paused) return;
    setGameState(prev => ({ ...prev, customers: [...prev.customers, Spawners.createCustomer(now, gameState.level)] }));
    setLastCustomerSpawn(now);
  }, [lastCustomerSpawn, gameState.level, gameState.paused]);

  const spawnBossWave = useCallback((waveNumber: number): BossMinion[] => {
    return Spawners.createBossWave(Date.now(), waveNumber);
  }, []);

  const startBossBattle = useCallback(() => {
    setGameState(prev => {
      if (prev.bossBattle?.active) return prev;
      return {
        ...prev,
        customers: [],
        bossBattle: {
          active: true, bossHealth: BOSS_CONFIG.HEALTH, currentWave: 1, 
          minions: Spawners.createBossWave(Date.now(), 1), 
          bossVulnerable: true, bossDefeated: false, bossPosition: BOSS_CONFIG.BOSS_POSITION,
        },
      };
    });
  }, []);

  // --- ACTIONS ---
  const servePizza = useCallback(() => {
    if (gameState.gameOver || gameState.paused || gameState.availableSlices <= 0 || gameState.nyanSweep?.active) return;
    soundManager.servePizza();
    setGameState(prev => ({
      ...prev,
      pizzaSlices: [...prev.pizzaSlices, Spawners.createPizza(Date.now(), prev.chefLane)],
      availableSlices: prev.availableSlices - 1,
    }));
  }, [gameState.gameOver, gameState.paused, gameState.chefLane, gameState.availableSlices, gameState.nyanSweep?.active]);

  const moveChef = useCallback((direction: 'up' | 'down') => {
    if (gameState.gameOver || gameState.paused || gameState.nyanSweep?.active) return;
    setGameState(prev => {
      let newLane = prev.chefLane;
      if (direction === 'up' && newLane > GAME_CONFIG.LANE_TOP) newLane -= 1;
      else if (direction === 'down' && newLane < GAME_CONFIG.LANE_BOTTOM) newLane += 1;
      return { ...prev, chefLane: newLane };
    });
  }, [gameState.gameOver, gameState.paused, gameState.nyanSweep?.active]);

  const useOven = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;
    setGameState(prev => {
      const currentOven = prev.ovens[prev.chefLane];
      const now = Date.now();

      if (currentOven.burned) return prev;

      if (!currentOven.cooking) {
        soundManager.ovenStart();
        setOvenSoundStates(prevStates => ({ ...prevStates, [prev.chefLane]: 'cooking' }));
        const slicesProduced = 1 + (prev.ovenUpgrades[prev.chefLane] || 0);
        return {
          ...prev,
          ovens: { ...prev.ovens, [prev.chefLane]: { cooking: true, startTime: now, burned: false, cleaningStartTime: 0, sliceCount: slicesProduced } }
        };
      } else {
        const speedUpgrade = prev.ovenSpeedUpgrades[prev.chefLane] || 0;
        const cookTime = OVEN_CONFIG.COOK_TIMES[speedUpgrade];
        if (now - currentOven.startTime >= cookTime && now - currentOven.startTime < OVEN_CONFIG.BURN_TIME) {
          const slicesProduced = currentOven.sliceCount;
          const newTotal = prev.availableSlices + slicesProduced;
          if (newTotal <= GAME_CONFIG.MAX_SLICES) {
            soundManager.servePizza();
            setOvenSoundStates(prevStates => ({ ...prevStates, [prev.chefLane]: 'idle' }));
            return {
              ...prev,
              availableSlices: newTotal,
              ovens: { ...prev.ovens, [prev.chefLane]: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 } },
              stats: { ...prev.stats, slicesBaked: prev.stats.slicesBaked + slicesProduced }
            };
          }
        }
      }
      return prev;
    });
  }, [gameState.gameOver, gameState.paused, gameState.chefLane]);

  // --- GAME LOOP ---
  const updateGame = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver) {
        if (prev.fallingPizza) {
          const newY = prev.fallingPizza.y + ENTITY_SPEEDS.FALLING_PIZZA;
          if (newY > 400) return { ...prev, fallingPizza: undefined };
          return { ...prev, fallingPizza: { ...prev.fallingPizza, y: newY } };
        }
        return prev;
      }

      if (prev.paused) return prev;

      let newState = { ...prev, stats: { ...prev.stats, powerUpsUsed: { ...prev.stats.powerUpsUsed } } };
      const now = Date.now();

      // 1. Process Ovens (Extracted Logic)
      const { updatedOvens, soundEvents, lifeLost } = processOvenTick(
        prev.ovens, prev.ovenSpeedUpgrades, now, prev.paused
      );
      newState.ovens = updatedOvens;

      // Handle Sounds from pure function events
      // We still update ovenSoundStates to keep the UI in sync if needed, 
      // but primarily we trigger sounds here.
      soundEvents.forEach(evt => {
        if (evt === 'ready') soundManager.ovenReady();
        if (evt === 'warning') soundManager.ovenWarning();
        if (evt === 'burning') soundManager.ovenBurning();
        if (evt === 'burned') {
          soundManager.ovenBurned();
          soundManager.lifeLost();
        }
      });
      
      // Update sound states based on current oven status for next tick comparisons
      const nextSoundStates = { ...ovenSoundStates };
      Object.keys(updatedOvens).forEach(key => {
         const lane = parseInt(key);
         const oven = updatedOvens[lane];
         if(oven.burned) nextSoundStates[lane] = 'idle';
         else if(!oven.cooking) nextSoundStates[lane] = 'idle';
         // We rely on the pure function events for transitions, so this state is mostly for 'idle' reset
      });
      if (JSON.stringify(nextSoundStates) !== JSON.stringify(ovenSoundStates)) {
         setOvenSoundStates(nextSoundStates);
      }

      if (lifeLost) {
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
      }

      // Check for cleaning completion
      Object.keys(newState.ovens).forEach(key => {
         const lane = parseInt(key);
         const oven = newState.ovens[lane];
         if (oven.burned && oven.cleaningStartTime > 0 && now - oven.cleaningStartTime >= OVEN_CONFIG.CLEANING_TIME) {
           soundManager.cleaningComplete();
           newState.ovens[lane] = { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 };
         }
      });

      // Clean up expirations
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

      // Update Customers (Effects & Movement)
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

      // Star Power Auto-Feed
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

      // Chef Powerup Collisions
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

      // Nyan Cat Sweep
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
          newState.bossBattle = {
            active: true, bossHealth: BOSS_CONFIG.HEALTH, currentWave: 1, 
            minions: Spawners.createBossWave(Date.now(), 1), 
            bossVulnerable: true, bossDefeated: false, bossPosition: BOSS_CONFIG.BOSS_POSITION,
          };
        }
      }

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
            newState.bossBattle.currentWave = nextWave;
            newState.bossBattle.minions = Spawners.createBossWave(Date.now(), nextWave);
          } else if (!newState.bossBattle.bossVulnerable) {
            newState.bossBattle.bossVulnerable = true;
            newState.bossBattle.minions = [];
          }
        }
      }

      return newState;
    });
  }, [gameState.gameOver, gameState.paused, ovenSoundStates, addFloatingScore]);

  const cleanOven = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;

    setGameState(prev => {
      const currentOven = prev.ovens[prev.chefLane];
      const now = Date.now();

      if (currentOven.burned && currentOven.cleaningStartTime === 0) {
        soundManager.cleaningStart();
        return {
          ...prev,
          ovens: {
            ...prev.ovens,
            [prev.chefLane]: { ...currentOven, cleaningStartTime: now }
          }
        };
      }
      return prev;
    });
  }, [gameState.gameOver, gameState.paused, gameState.chefLane]);

  const upgradeOven = useCallback((lane: number) => {
    setGameState(prev => {
      const upgradeCost = COSTS.OVEN_UPGRADE;
      const currentUpgrade = prev.ovenUpgrades[lane] || 0;
      if (prev.bank >= upgradeCost && currentUpgrade < OVEN_CONFIG.MAX_UPGRADE_LEVEL) {
        return {
          ...prev,
          bank: prev.bank - upgradeCost,
          ovenUpgrades: { ...prev.ovenUpgrades, [lane]: currentUpgrade + 1 },
          stats: { ...prev.stats, ovenUpgradesMade: prev.stats.ovenUpgradesMade + 1, }
        };
      }
      return prev;
    });
  }, []);

  const upgradeOvenSpeed = useCallback((lane: number) => {
    setGameState(prev => {
      const speedUpgradeCost = COSTS.OVEN_SPEED_UPGRADE;
      const currentSpeedUpgrade = prev.ovenSpeedUpgrades[lane] || 0;
      if (prev.bank >= speedUpgradeCost && currentSpeedUpgrade < OVEN_CONFIG.MAX_SPEED_LEVEL) {
        return {
          ...prev,
          bank: prev.bank - speedUpgradeCost,
          ovenSpeedUpgrades: { ...prev.ovenSpeedUpgrades, [lane]: currentSpeedUpgrade + 1 },
          stats: { ...prev.stats, ovenUpgradesMade: prev.stats.ovenUpgradesMade + 1, }
        };
      }
      return prev;
    });
  }, []);

  const closeStore = useCallback(() => {
    setGameState(prev => ({ ...prev, showStore: false }));
  }, []);

  const bribeReviewer = useCallback(() => {
    setGameState(prev => {
      const bribeCost = COSTS.BRIBE_REVIEWER;
      if (prev.bank >= bribeCost && prev.lives < GAME_CONFIG.MAX_LIVES) {
        soundManager.lifeGained();
        return { ...prev, bank: prev.bank - bribeCost, lives: prev.lives + 1 };
      }
      return prev;
    });
  }, []);

  const buyPowerUp = useCallback((type: 'beer' | 'ice-cream' | 'honey') => {
    setGameState(prev => {
      const powerUpCost = COSTS.BUY_POWERUP;
      if (prev.bank >= powerUpCost) {
        const lane = prev.chefLane;
        const now = Date.now();
        const newPowerUp: PowerUp = {
          id: `powerup-bought-${now}`,
          lane,
          position: POSITIONS.SPAWN_X,
          speed: ENTITY_SPEEDS.POWERUP,
          type: type === 'ice-cream' ? 'ice-cream' : type === 'beer' ? 'beer' : 'honey',
        };
        return { ...prev, bank: prev.bank - powerUpCost, powerUps: [...prev.powerUps, newPowerUp], };
      }
      return prev;
    });
  }, []);

  const debugActivatePowerUp = useCallback((type: PowerUpType) => {
    setGameState(prev => {
      if (prev.gameOver) return prev;
      const now = Date.now();
      let newState = { ...prev, stats: { ...prev.stats, powerUpsUsed: { ...prev.stats.powerUpsUsed, [type]: prev.stats.powerUpsUsed[type] + 1, } } };

      if (type === 'beer') {
        let livesLost = 0;
        let lastReason: StarLostReason | undefined;
        newState.customers = newState.customers.map(customer => {
          if (customer.woozy) {
            livesLost += customer.critic ? 2 : 1;
            lastReason = customer.critic ? 'beer_critic_vomit' : 'beer_vomit';
            return { ...customer, woozy: false, vomit: true, disappointed: true, movingRight: true, };
          }
          if (!customer.served && !customer.vomit && !customer.leaving) {
            if (customer.badLuckBrian) {
              livesLost += 1;
              lastReason = 'brian_hurled';
              return { ...customer, vomit: true, disappointed: true, movingRight: true, flipped: false, textMessage: "Oh man I hurled", textMessageTime: Date.now(), hotHoneyAffected: false, frozen: false, };
            }
            return { ...customer, woozy: true, woozyState: 'normal', movingRight: true, hotHoneyAffected: false, frozen: false, };
          }
          return customer;
        });
        newState.lives = Math.max(0, newState.lives - livesLost);
        if (livesLost > 0) {
          newState.stats.currentCustomerStreak = 0;
          if (lastReason) newState.lastStarLostReason = lastReason;
        }
        if (newState.lives === 0) newState.gameOver = true;
      } else if (type === 'star') {
        newState.availableSlices = GAME_CONFIG.MAX_SLICES;
        newState.starPowerActive = true;
        newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== 'star'), { type: 'star', endTime: now + POWERUPS.DURATION }];
      } else if (type === 'doge') {
        newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== 'doge'), { type: 'doge', endTime: now + POWERUPS.DURATION }];
        newState.powerUpAlert = { type: 'doge', endTime: now + POWERUPS.ALERT_DURATION_DOGE, chefLane: newState.chefLane };
      } else if (type === 'nyan') {
        if (!newState.nyanSweep?.active) {
          newState.nyanSweep = { active: true, xPosition: GAME_CONFIG.CHEF_X_POSITION, laneDirection: 1, startTime: now, lastUpdateTime: now, startingLane: newState.chefLane };
          soundManager.nyanCatPowerUp();
          if (!newState.activePowerUps.some(p => p.type === 'doge') || newState.powerUpAlert?.type !== 'doge') {
            newState.powerUpAlert = { type: 'nyan', endTime: now + POWERUPS.ALERT_DURATION_NYAN, chefLane: newState.chefLane };
          }
        }
      } else {
        newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== type), { type: type, endTime: now + POWERUPS.DURATION }];
        if (type === 'honey') {
          newState.customers = newState.customers.map(c => (!c.served && !c.disappointed && !c.vomit) ? { ...c, shouldBeHotHoneyAffected: true, hotHoneyAffected: true, frozen: false, woozy: false, woozyState: undefined } : c);
        }
        if (type === 'ice-cream') {
          newState.customers = newState.customers.map(c => {
            if (!c.served && !c.disappointed && !c.vomit) {
              if (c.badLuckBrian) return { ...c, textMessage: "I'm lactose intolerant", textMessageTime: Date.now() };
              return { ...c, shouldBeFrozenByIceCream: true, frozen: true, hotHoneyAffected: false, woozy: false, woozyState: undefined };
            }
            return c;
          });
        }
      }
      return newState;
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState({
      customers: [], pizzaSlices: [], emptyPlates: [], droppedPlates: [], powerUps: [], activePowerUps: [], floatingScores: [],
      chefLane: 0, score: 0, lives: GAME_CONFIG.STARTING_LIVES, level: 1, gameOver: false, lastStarLostReason: undefined, paused: false, availableSlices: 0,
      ovens: {
        0: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
        1: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
        2: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
        3: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 }
      },
      ovenUpgrades: { 0: 0, 1: 0, 2: 0, 3: 0 },
      ovenSpeedUpgrades: { 0: 0, 1: 0, 2: 0, 3: 0 },
      happyCustomers: 0, bank: 0, showStore: false, lastStoreLevelShown: 0, pendingStoreShow: false, fallingPizza: undefined, starPowerActive: false, powerUpAlert: undefined,
      stats: {
        slicesBaked: 0, customersServed: 0, longestCustomerStreak: 0, currentCustomerStreak: 0, platesCaught: 0, largestPlateStreak: 0, currentPlateStreak: 0,
        powerUpsUsed: { honey: 0, 'ice-cream': 0, beer: 0, star: 0, doge: 0, nyan: 0, moltobenny: 0, }, ovenUpgradesMade: 0,
      },
      bossBattle: undefined,
    });
    setLastCustomerSpawn(0);
    setLastPowerUpSpawn(0);
    setOvenSoundStates({ 0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle' });
  }, []);

  const togglePause = useCallback(() => {
    setGameState(prev => {
      const newPaused = !prev.paused;
      const now = Date.now();
      const updatedOvens = { ...prev.ovens };

      if (newPaused) {
        Object.keys(updatedOvens).forEach(laneKey => {
          const lane = parseInt(laneKey);
          const oven = updatedOvens[lane];
          if (oven.cooking && !oven.burned) updatedOvens[lane] = { ...oven, pausedElapsed: now - oven.startTime };
        });
      } else {
        Object.keys(updatedOvens).forEach(laneKey => {
          const lane = parseInt(laneKey);
          const oven = updatedOvens[lane];
          if (oven.cooking && !oven.burned && oven.pausedElapsed !== undefined) {
            updatedOvens[lane] = { ...oven, startTime: now - oven.pausedElapsed, pausedElapsed: undefined };
          }
        });
      }
      return { ...prev, paused: newPaused, ovens: updatedOvens };
    });
  }, []);

  useEffect(() => {
    const prevShowStore = prevShowStoreRef.current;
    const currentShowStore = gameState.showStore;
    if (!prevShowStore && currentShowStore) {
      setGameState(prev => {
        const now = Date.now();
        const updatedOvens = { ...prev.ovens };
        Object.keys(updatedOvens).forEach(laneKey => {
          const lane = parseInt(laneKey);
          const oven = updatedOvens[lane];
          if (oven.cooking && !oven.burned) updatedOvens[lane] = { ...oven, pausedElapsed: now - oven.startTime };
        });
        return { ...prev, paused: true, ovens: updatedOvens };
      });
    }
    if (prevShowStore && !currentShowStore) {
      setGameState(prev => {
        const now = Date.now();
        const updatedOvens = { ...prev.ovens };
        Object.keys(updatedOvens).forEach(laneKey => {
          const lane = parseInt(laneKey);
          const oven = updatedOvens[lane];
          if (oven.cooking && !oven.burned && oven.pausedElapsed !== undefined) {
            updatedOvens[lane] = { ...oven, startTime: now - oven.pausedElapsed, pausedElapsed: undefined };
          }
        });
        return { ...prev, paused: false, ovens: updatedOvens };
      });
    }
    prevShowStoreRef.current = currentShowStore;
  }, [gameState.showStore]);

  useEffect(() => {
    if (!gameStarted) return;
    const gameLoop = setInterval(() => {
      updateGame();
      setGameState(current => {
        if (!current.paused && !current.gameOver) {
          const levelSpawnRate = SPAWN_RATES.CUSTOMER_BASE_RATE + (current.level - 1) * SPAWN_RATES.CUSTOMER_LEVEL_INCREMENT;
          const effectiveSpawnRate = current.bossBattle?.active ? levelSpawnRate * 0.5 : levelSpawnRate;
          if (Math.random() < effectiveSpawnRate * 0.01) spawnCustomer();
          if (Math.random() < SPAWN_RATES.POWERUP_CHANCE) spawnPowerUp();
        }
        return current;
      });
    }, GAME_CONFIG.GAME_LOOP_INTERVAL);
    return () => clearInterval(gameLoop);
  }, [gameStarted, updateGame, spawnCustomer, spawnPowerUp]);

  return {
    gameState, servePizza, moveChef, useOven, cleanOven, resetGame, togglePause, upgradeOven, upgradeOvenSpeed,
    closeStore, bribeReviewer, buyPowerUp, debugActivatePowerUp,
  };
};