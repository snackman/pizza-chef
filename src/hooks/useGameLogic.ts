import { useState, useEffect, useCallback, useRef } from 'react'; 
import { GameState, Customer, PizzaSlice, EmptyPlate, PowerUp, PowerUpType, FloatingScore, DroppedPlate, StarLostReason, BossMinion } from '../types/game';
import { soundManager } from '../utils/sounds';
import { getStreakMultiplier } from '../components/StreakDisplay';
import {
  GAME_CONFIG,
  ENTITY_SPEEDS,
  SPAWN_RATES,
  PROBABILITIES,
  SCORING,
  COSTS,
  BOSS_CONFIG,
  POWERUPS,
  TIMINGS,
  POSITIONS,
  INITIAL_GAME_STATE,
  OVEN_CONFIG
} from '../lib/constants';

// --- Logic Imports ---
import { 
  processOvenTick, 
  tryInteractWithOven, 
  calculateOvenPauseState, 
  OvenSoundState 
} from '../logic/ovenSystem';

import { 
  updateCustomerPositions, 
  processCustomerHit 
} from '../logic/customerSystem';

export const useGameLogic = (gameStarted: boolean = true) => {
  const [gameState, setGameState] = useState<GameState>({ ...INITIAL_GAME_STATE });

  const [lastCustomerSpawn, setLastCustomerSpawn] = useState(0);
  const [lastPowerUpSpawn, setLastPowerUpSpawn] = useState(0);
  
  const [ovenSoundStates, setOvenSoundStates] = useState<{ [key: number]: OvenSoundState }>({
    0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle'
  });
  
  const prevShowStoreRef = useRef(false);

  // --- Helpers (Score, Spawning) ---

  const addFloatingScore = useCallback((points: number, lane: number, position: number, state: GameState): GameState => {
    const now = Date.now();
    return {
      ...state,
      floatingScores: [...state.floatingScores, {
        id: `score-${now}-${Math.random()}`,
        points, lane, position, startTime: now,
      }],
    };
  }, []);

  const spawnPowerUp = useCallback(() => {
    const now = Date.now();
    if (now - lastPowerUpSpawn < SPAWN_RATES.POWERUP_MIN_INTERVAL) return;

    const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
    const rand = Math.random();
    const randomType = rand < PROBABILITIES.POWERUP_STAR_CHANCE ? 'star' : POWERUPS.TYPES[Math.floor(Math.random() * POWERUPS.TYPES.length)];

    setGameState(prev => ({
      ...prev,
      powerUps: [...prev.powerUps, {
        id: `powerup-${now}-${lane}`,
        lane,
        position: POSITIONS.POWERUP_SPAWN_X,
        speed: ENTITY_SPEEDS.POWERUP,
        type: randomType,
      }],
    }));
    setLastPowerUpSpawn(now);
  }, [lastPowerUpSpawn]);

  const spawnCustomer = useCallback(() => {
    const now = Date.now();
    const spawnDelay = SPAWN_RATES.CUSTOMER_MIN_INTERVAL_BASE - (gameState.level * SPAWN_RATES.CUSTOMER_MIN_INTERVAL_DECREMENT);
    if (now - lastCustomerSpawn < spawnDelay) return;
    if (gameState.paused) return;

    const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
    const disappointedEmojis = ['😢', '😭', '😠', '🤬'];
    const isCritic = Math.random() < PROBABILITIES.CRITIC_CHANCE;
    const isBadLuckBrian = !isCritic && Math.random() < PROBABILITIES.BAD_LUCK_BRIAN_CHANCE;

    setGameState(prev => ({
      ...prev,
      customers: [...prev.customers, {
        id: `customer-${now}-${lane}`,
        lane,
        position: POSITIONS.SPAWN_X,
        speed: ENTITY_SPEEDS.CUSTOMER_BASE,
        served: false,
        hasPlate: false,
        leaving: false,
        disappointed: false,
        disappointedEmoji: disappointedEmojis[Math.floor(Math.random() * disappointedEmojis.length)],
        movingRight: false,
        critic: isCritic,
        badLuckBrian: isBadLuckBrian,
        flipped: isBadLuckBrian,
      }],
    }));
    setLastCustomerSpawn(now);
  }, [lastCustomerSpawn, gameState.level, gameState.paused]);

  const spawnBossWave = useCallback((waveNumber: number): BossMinion[] => {
    const minions: BossMinion[] = [];
    const now = Date.now();
    for (let i = 0; i < BOSS_CONFIG.MINIONS_PER_WAVE; i++) {
      const lane = i % 4;
      minions.push({
        id: `minion-${now}-${waveNumber}-${i}`,
        lane,
        position: POSITIONS.SPAWN_X + (Math.floor(i / 4) * 15),
        speed: ENTITY_SPEEDS.MINION,
        defeated: false,
      });
    }
    return minions;
  }, []);

  // --- Actions (Chef, Pizza, Oven) ---

  const servePizza = useCallback(() => {
    if (gameState.gameOver || gameState.paused || gameState.availableSlices <= 0 || gameState.nyanSweep?.active) return;
    soundManager.servePizza();
    setGameState(prev => ({
      ...prev,
      pizzaSlices: [...prev.pizzaSlices, {
        id: `pizza-${Date.now()}-${gameState.chefLane}`,
        lane: gameState.chefLane,
        position: GAME_CONFIG.CHEF_X_POSITION,
        speed: ENTITY_SPEEDS.PIZZA,
      }],
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
      const result = tryInteractWithOven(prev, prev.chefLane, Date.now());

      if (result.action === 'STARTED') {
        soundManager.ovenStart();
        setOvenSoundStates(s => ({ ...s, [prev.chefLane]: 'cooking' }));
      } else if (result.action === 'SERVED') {
        soundManager.servePizza();
        setOvenSoundStates(s => ({ ...s, [prev.chefLane]: 'idle' }));
      }

      if (result.newState) {
        return { ...prev, ...result.newState };
      }
      return prev;
    });
  }, [gameState.gameOver, gameState.paused, gameState.chefLane]);

  const cleanOven = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;
    setGameState(prev => {
      const currentOven = prev.ovens[prev.chefLane];
      if (currentOven.burned && currentOven.cleaningStartTime === 0) {
        soundManager.cleaningStart();
        return {
          ...prev,
          ovens: { ...prev.ovens, [prev.chefLane]: { ...currentOven, cleaningStartTime: Date.now() } }
        };
      }
      return prev;
    });
  }, [gameState.gameOver, gameState.paused, gameState.chefLane]);

  // --- Main Game Loop ---

  const updateGame = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver) {
        if (prev.fallingPizza) {
          const newY = prev.fallingPizza.y + ENTITY_SPEEDS.FALLING_PIZZA;
          return newY > 400 ? { ...prev, fallingPizza: undefined } : { ...prev, fallingPizza: { ...prev.fallingPizza, y: newY } };
        }
        return prev;
      }
      if (prev.paused) return prev;

      let newState = { ...prev, stats: { ...prev.stats, powerUpsUsed: { ...prev.stats.powerUpsUsed } } };
      const now = Date.now();
      
      const hasDoge = newState.activePowerUps.some(p => p.type === 'doge');
      const hasStar = newState.activePowerUps.some(p => p.type === 'star');
      const dogeMultiplier = hasDoge ? 2 : 1;

      // 1. PROCESS OVENS (Logic from ovenSystem)
      const ovenTickResult = processOvenTick(
        newState.ovens, 
        ovenSoundStates, 
        newState.ovenSpeedUpgrades, 
        now
      );
      newState.ovens = ovenTickResult.nextOvens;
      if (JSON.stringify(ovenTickResult.nextSoundStates) !== JSON.stringify(ovenSoundStates)) {
        setOvenSoundStates(ovenTickResult.nextSoundStates);
      }
      ovenTickResult.events.forEach(event => {
        switch(event.type) {
          case 'SOUND_READY': soundManager.ovenReady(); break;
          case 'SOUND_WARNING': soundManager.ovenWarning(); break;
          case 'SOUND_BURNING': soundManager.ovenBurning(); break;
          case 'CLEANING_COMPLETE': soundManager.cleaningComplete(); break;
          case 'BURNED_ALIVE': 
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
            break;
        }
      });

      // 2. PROCESS CUSTOMERS (Movement & AI from customerSystem)
      const customerUpdate = updateCustomerPositions(newState.customers, newState.activePowerUps, now);
      newState.customers = customerUpdate.nextCustomers;

      if (customerUpdate.statsUpdate.customerStreakReset) {
        newState.stats.currentCustomerStreak = 0;
      }

      customerUpdate.events.forEach(event => {
        if (event === 'LIFE_LOST') {
          soundManager.customerDisappointed(); 
          soundManager.lifeLost(); 
        }
        if (event === 'STAR_LOST_CRITIC') {
          newState.lives = Math.max(0, newState.lives - 2);
          newState.lastStarLostReason = 'disappointed_critic'; // or woozy variation
        }
        if (event === 'STAR_LOST_NORMAL') {
          newState.lives = Math.max(0, newState.lives - 1);
          newState.lastStarLostReason = 'disappointed_customer';
        }
        if (event === 'GAME_OVER' && newState.lives === 0) {
          newState.gameOver = true;
          soundManager.gameOver();
          if (newState.availableSlices > 0) {
            newState.fallingPizza = { lane: newState.chefLane, y: 0 };
            newState.availableSlices = 0;
          }
        }
      });

      // 3. COLLISION LOOP (Slices vs Customers)
      newState.pizzaSlices = newState.pizzaSlices.map(slice => ({ ...slice, position: slice.position + slice.speed }));
      
      const remainingSlices: PizzaSlice[] = [];
      const destroyedPowerUpIds = new Set<string>();
      const platesFromSlices = new Set<string>();
      const customerScores: Array<{ points: number; lane: number; position: number }> = [];
      let sliceWentOffScreen = false;

      newState.pizzaSlices.forEach(slice => {
        let consumed = false;

        newState.customers = newState.customers.map(customer => {
          // Skip if already consumed or departing
          if (consumed || customer.served || customer.disappointed || customer.vomit || customer.leaving) return customer;

          // Simple Collision Check
          const isHit = customer.lane === slice.lane && Math.abs(customer.position - slice.position) < 5;

          if (isHit) {
            consumed = true;
            
            // --- CALL THE NEW HIT LOGIC ---
            const hitResult = processCustomerHit(customer, now);
            
            // A. Add new entities
            if (hitResult.newEntities.droppedPlate) newState.droppedPlates = [...newState.droppedPlates, hitResult.newEntities.droppedPlate];
            if (hitResult.newEntities.emptyPlate) newState.emptyPlates = [...newState.emptyPlates, hitResult.newEntities.emptyPlate];
            
            // B. Process Side Effects (Scoring/Sound)
            hitResult.events.forEach(event => {
              if (event === 'BRIAN_DROPPED_PLATE') {
                soundManager.plateDropped();
                newState.stats.currentCustomerStreak = 0;
                newState.stats.currentPlateStreak = 0;
              } else if (event === 'UNFROZEN_AND_SERVED') {
                soundManager.customerUnfreeze();
                // Apply Scoring
                const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
                const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
                newState.score += pointsEarned;
                newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
                customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
                newState.happyCustomers += 1;
                newState.stats.customersServed += 1;
                newState.stats.currentCustomerStreak += 1;
                if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
                
                // Check Life Gain
                if (newState.happyCustomers % 8 === 0 && newState.lives < GAME_CONFIG.MAX_LIVES) {
                  const starsToAdd = Math.min(dogeMultiplier, GAME_CONFIG.MAX_LIVES - newState.lives);
                  newState.lives += starsToAdd;
                  if (starsToAdd > 0) soundManager.lifeGained();
                }
              } else if (event === 'WOOZY_STEP_1') {
                soundManager.woozyServed();
                const baseScore = SCORING.CUSTOMER_FIRST_SLICE;
                const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
                newState.score += pointsEarned;
                newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
                customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
              } else if (event === 'WOOZY_STEP_2' || event === 'SERVED_NORMAL' || event === 'SERVED_CRITIC') {
                soundManager.customerServed();
                const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
                const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
                newState.score += pointsEarned;
                newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
                customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
                newState.happyCustomers += 1;
                newState.stats.customersServed += 1;
                newState.stats.currentCustomerStreak += 1;
                if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
                
                // Critic Bonus Life or Happy Customer Life
                if (customer.critic && event === 'SERVED_CRITIC') {
                   if (customer.position >= 50 && newState.lives < GAME_CONFIG.MAX_LIVES) {
                     newState.lives += 1;
                     soundManager.lifeGained();
                   }
                } else {
                   if (newState.happyCustomers % 8 === 0 && newState.lives < GAME_CONFIG.MAX_LIVES) {
                     const starsToAdd = Math.min(dogeMultiplier, GAME_CONFIG.MAX_LIVES - newState.lives);
                     newState.lives += starsToAdd;
                     if (starsToAdd > 0) soundManager.lifeGained();
                   }
                }
              }
            });

            platesFromSlices.add(slice.id);
            return hitResult.updatedCustomer;
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

      // --- Cleanup Arrays after Loops ---
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

      // --- 4. CLEANUP EXPIRATIONS ---
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
      if (newState.powerUpAlert && now >= newState.powerUpAlert.endTime) {
        if (newState.powerUpAlert.type !== 'doge' || !hasDoge) newState.powerUpAlert = undefined;
      }

      // --- 5. STAR POWER AUTO-FEED ---
      const starPowerScores: Array<{ points: number; lane: number; position: number }> = [];
      if (hasStar && newState.availableSlices > 0) {
        newState.customers = newState.customers.map(customer => {
          if (customer.lane === newState.chefLane && !customer.served && !customer.disappointed && !customer.vomit && Math.abs(customer.position - GAME_CONFIG.CHEF_X_POSITION) < 8) {
            newState.availableSlices = Math.max(0, newState.availableSlices - 1);
            if (customer.badLuckBrian) {
              soundManager.plateDropped();
              newState.stats.currentCustomerStreak = 0;
              newState.stats.currentPlateStreak = 0;
              const droppedPlate = { id: `dropped-${Date.now()}-${customer.id}`, lane: customer.lane, position: customer.position, startTime: Date.now(), hasSlice: true, };
              newState.droppedPlates = [...newState.droppedPlates, droppedPlate];
              return { ...customer, flipped: false, leaving: true, movingRight: true, textMessage: "Ugh! I dropped my slice!", textMessageTime: Date.now() };
            }
            soundManager.customerServed();
            const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
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
              const starsToAdd = Math.min(dogeMultiplier, GAME_CONFIG.MAX_LIVES - newState.lives);
              newState.lives += starsToAdd;
              if (starsToAdd > 0) soundManager.lifeGained();
            }
            const newPlate: EmptyPlate = { id: `plate-star-${Date.now()}-${customer.id}`, lane: customer.lane, position: customer.position, speed: ENTITY_SPEEDS.PLATE, };
            newState.emptyPlates = [...newState.emptyPlates, newPlate];
            return { ...customer, served: true, hasPlate: false };
          }
          return customer;
        });
      }
      starPowerScores.forEach(({ points, lane, position }) => newState = addFloatingScore(points, lane, position, newState));

      // --- 6. CHEF POWERUP COLLISIONS ---
      const caughtPowerUpIds = new Set<string>();
      const powerUpScores: Array<{ points: number; lane: number; position: number }> = [];
      newState.powerUps.forEach(powerUp => {
        if (powerUp.position <= GAME_CONFIG.CHEF_X_POSITION && powerUp.lane === newState.chefLane && !newState.nyanSweep?.active) {
          soundManager.powerUpCollected(powerUp.type);
          const pointsEarned = SCORING.POWERUP_COLLECTED * dogeMultiplier;
          newState.score += pointsEarned;
          powerUpScores.push({ points: pointsEarned, lane: powerUp.lane, position: powerUp.position });
          caughtPowerUpIds.add(powerUp.id);
          newState.stats.powerUpsUsed[powerUp.type] += 1;

          if (powerUp.type === 'beer') {
            let livesLost = 0;
            let lastReason: StarLostReason | undefined;
            newState.customers = newState.customers.map(customer => {
              if (customer.critic) {
                if (customer.woozy) return { ...customer, woozy: false, woozyState: undefined, frozen: false, hotHoneyAffected: false, textMessage: "I prefer wine", textMessageTime: Date.now() };
                if (!customer.served && !customer.vomit && !customer.disappointed && !customer.leaving) return { ...customer, textMessage: "I prefer wine", textMessageTime: Date.now() };
                return customer;
              }
              if (customer.woozy) {
                livesLost += 1;
                lastReason = 'beer_vomit';
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
              newState.nyanSweep = { active: true, xPosition: GAME_CONFIG.CHEF_X_POSITION, laneDirection: 1, startTime: now, lastUpdateTime: now, startingLane: newState.chefLane };
              soundManager.nyanCatPowerUp();
              if (!hasDoge || newState.powerUpAlert?.type !== 'doge') {
                newState.powerUpAlert = { type: 'nyan', endTime: now + POWERUPS.ALERT_DURATION_NYAN, chefLane: newState.chefLane };
              }
            }
          } else if (powerUp.type === 'moltobenny') {
            const moltoScore = SCORING.MOLTOBENNY_POINTS * dogeMultiplier;
            const moltoMoney = SCORING.MOLTOBENNY_CASH * dogeMultiplier;
            newState.score += moltoScore;
            newState.bank += moltoMoney;
            powerUpScores.push({ points: moltoScore, lane: newState.chefLane, position: GAME_CONFIG.CHEF_X_POSITION });
          } else {
            newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== powerUp.type), { type: powerUp.type, endTime: now + POWERUPS.DURATION }];
            if (powerUp.type === 'honey') {
              newState.customers = newState.customers.map(c => {
                if (c.served || c.disappointed || c.vomit || c.leaving) return c;
                if (c.badLuckBrian) return { ...c, shouldBeHotHoneyAffected: false, hotHoneyAffected: false, frozen: false, woozy: false, woozyState: undefined, textMessage: "I can't do spicy.", textMessageTime: Date.now() };
                return { ...c, shouldBeHotHoneyAffected: true, hotHoneyAffected: true, frozen: false, woozy: false, woozyState: undefined };
              });
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
        .filter(powerUp => powerUp.position > 0);
      powerUpScores.forEach(({ points, lane, position }) => newState = addFloatingScore(points, lane, position, newState));

      // --- 7. PLATE CATCHING LOGIC ---
      const platesToAddScores: Array<{ points: number; lane: number; position: number }> = [];
      newState.emptyPlates = newState.emptyPlates.map(plate => ({ ...plate, position: plate.position - plate.speed })).filter(plate => {
        if (plate.position <= 10 && plate.lane === newState.chefLane && !newState.nyanSweep?.active) {
          soundManager.plateCaught();
          const baseScore = SCORING.PLATE_CAUGHT;
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

      // --- 8. NYAN CAT SWEEP LOGIC ---
      if (newState.nyanSweep?.active) {
        const MAX_X = 90;
        const dt = Math.min(now - newState.nyanSweep.lastUpdateTime, 100);
        const INITIAL_X = GAME_CONFIG.CHEF_X_POSITION;
        const totalDistance = MAX_X - INITIAL_X;
        const duration = 2600; 
        const moveIncrement = (totalDistance / duration) * dt;
        const oldX = newState.nyanSweep.xPosition;
        const newXPosition = oldX + moveIncrement;
        const laneChangeSpeed = 0.01; 
        let newLane = newState.chefLane + (newState.nyanSweep.laneDirection * laneChangeSpeed * dt);
        let newLaneDirection = newState.nyanSweep.laneDirection;

        if (newLane > GAME_CONFIG.LANE_BOTTOM) {
          newLane = GAME_CONFIG.LANE_BOTTOM;
          newLaneDirection = -1;
        } else if (newLane < GAME_CONFIG.LANE_TOP) {
          newLane = GAME_CONFIG.LANE_TOP;
          newLaneDirection = 1;
        }

        const nyanScores: Array<{ points: number; lane: number; position: number }> = [];
        newState.customers = newState.customers.map(customer => {
          if (customer.served || customer.disappointed || customer.vomit) return customer;
          const isLaneHit = Math.abs(customer.lane - newLane) < 0.8;
          const sweepStart = oldX - 10; 
          const sweepEnd = newXPosition + 10;
          const isPositionHit = customer.position >= sweepStart && customer.position <= sweepEnd;

          if (isLaneHit && isPositionHit) {
            if (customer.badLuckBrian) {
              soundManager.customerServed();
              return { ...customer, brianNyaned: true, leaving: true, hasPlate: false, flipped: false, movingRight: true, woozy: false, frozen: false, unfrozenThisPeriod: undefined };
            }
            soundManager.customerServed();
            const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
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
                const starsToAdd = Math.min(dogeMultiplier, GAME_CONFIG.MAX_LIVES - newState.lives);
                newState.lives += starsToAdd;
                if (starsToAdd > 0) soundManager.lifeGained();
              }
            }
            return { ...customer, served: true, hasPlate: false, woozy: false, frozen: false, unfrozenThisPeriod: undefined };
          }
          return customer;
        });

        if (newState.bossBattle?.active && !newState.bossBattle.bossDefeated) {
          newState.bossBattle.minions = newState.bossBattle.minions.map(minion => {
            if (minion.defeated) return minion;
            const isLaneHit = Math.abs(minion.lane - newLane) < 0.8;
            const sweepStart = oldX - 10; 
            const sweepEnd = newXPosition + 10;
            const isPositionHit = minion.position >= sweepStart && minion.position <= sweepEnd;

            if (isLaneHit && isPositionHit) {
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

        newState.chefLane = newLane;
        newState.nyanSweep = { ...newState.nyanSweep, xPosition: newXPosition, laneDirection: newLaneDirection, lastUpdateTime: now };

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

      // --- 9. LEVEL & BOSS LOGIC (PATCHED) ---
      const targetLevel = Math.floor(newState.score / GAME_CONFIG.LEVEL_THRESHOLD) + 1;
      
      if (targetLevel > newState.level) {
        const oldLevel = newState.level;
        newState.level = targetLevel;

        const highestStoreLevel = Math.floor(targetLevel / GAME_CONFIG.STORE_LEVEL_INTERVAL) * GAME_CONFIG.STORE_LEVEL_INTERVAL;
        if (highestStoreLevel >= 10 && highestStoreLevel > newState.lastStoreLevelShown) {
          newState.lastStoreLevelShown = highestStoreLevel;
          if (newState.nyanSweep?.active) newState.pendingStoreShow = true;
          else newState.showStore = true;
        }

        const crossedBossLevel = BOSS_CONFIG.TRIGGER_LEVELS.find(triggerLvl => 
          oldLevel < triggerLvl && targetLevel >= triggerLvl
        );

        if (crossedBossLevel !== undefined && 
            !newState.defeatedBossLevels.includes(crossedBossLevel) && 
            !newState.bossBattle?.active) {
            
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
            active: true, 
            bossHealth: BOSS_CONFIG.HEALTH, 
            currentWave: 1, 
            minions: initialMinions, 
            bossVulnerable: true, 
            bossDefeated: false, 
            bossPosition: BOSS_CONFIG.BOSS_POSITION,
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

                // --- BOSS DEFEAT TRACKING (PATCHED) ---
                const currentBossLevel = BOSS_CONFIG.TRIGGER_LEVELS
                  .slice()
                  .reverse()
                  .find(lvl => newState.level >= lvl);
                  
                if (currentBossLevel && !newState.defeatedBossLevels.includes(currentBossLevel)) {
                  newState.defeatedBossLevels = [...newState.defeatedBossLevels, currentBossLevel];
                }
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

      return newState;
    });
  }, [gameState.gameOver, gameState.paused, ovenSoundStates, addFloatingScore]);

  // --- Store / Upgrades / Debug ---

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
      
      const dogeMultiplier = prev.activePowerUps.some(p => p.type === 'doge') ? 2 : 1;

      if (type === 'beer') {
        let livesLost = 0;
        let lastReason: StarLostReason | undefined;
        newState.customers = newState.customers.map(customer => {
          if (customer.critic) {
            if (customer.woozy) return { ...customer, woozy: false, woozyState: undefined, frozen: false, hotHoneyAffected: false, textMessage: "I prefer wine", textMessageTime: Date.now() };
            if (!customer.served && !customer.vomit && !customer.disappointed && !customer.leaving) return { ...customer, textMessage: "I prefer wine", textMessageTime: Date.now() };
            return customer;
          }
          if (customer.woozy) {
            livesLost += 1;
            lastReason = 'beer_vomit';
            return { ...customer, woozy: false, vomit: true, disappointed: true, movingRight: true };
          }
          if (!customer.served && !customer.vomit && !customer.leaving) {
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
          newState.customers = newState.customers.map(c => {
            if (c.served || c.disappointed || c.vomit || c.leaving) return c;
            if (c.badLuckBrian) return { ...c, shouldBeHotHoneyAffected: false, hotHoneyAffected: false, frozen: false, woozy: false, woozyState: undefined, textMessage: "I can't do spicy.", textMessageTime: Date.now() };
            return { ...c, shouldBeHotHoneyAffected: true, hotHoneyAffected: true, frozen: false, woozy: false, woozyState: undefined };
          });
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
    setGameState({ ...INITIAL_GAME_STATE });
    setLastCustomerSpawn(0);
    setLastPowerUpSpawn(0);
    setOvenSoundStates({ 0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle' });
  }, []);

  const togglePause = useCallback(() => {
    setGameState(prev => {
      const newPaused = !prev.paused;
      const updatedOvens = calculateOvenPauseState(prev.ovens, newPaused, Date.now());
      return { ...prev, paused: newPaused, ovens: updatedOvens };
    });
  }, []);

  // --- Effects ---

  useEffect(() => {
    const prevShowStore = prevShowStoreRef.current;
    const currentShowStore = gameState.showStore;
    const now = Date.now();

    if (!prevShowStore && currentShowStore) {
      setGameState(prev => ({
        ...prev,
        paused: true,
        ovens: calculateOvenPauseState(prev.ovens, true, now)
      }));
    }
    if (prevShowStore && !currentShowStore) {
      setGameState(prev => ({
        ...prev,
        paused: false,
        ovens: calculateOvenPauseState(prev.ovens, false, now)
      }));
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