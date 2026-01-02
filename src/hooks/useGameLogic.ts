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

  // --- Helpers (Score, Spawning, Leveling) ---

  const checkLevelAndBossTriggers = useCallback((state: GameState): GameState => {
    const now = Date.now();
    const targetLevel = Math.floor(state.score / GAME_CONFIG.LEVEL_THRESHOLD) + 1;
    let newState = { ...state };

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
    return newState;
  }, []);

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

      // 1. PROCESS OVENS
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

      // 2. PROCESS CUSTOMERS
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
          newState.lastStarLostReason = 'disappointed_critic';
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
      let scoreChanged = false;

      newState.pizzaSlices.forEach(slice => {
        let consumed = false;

        newState.customers = newState.customers.map(customer => {
          if (consumed || customer.served || customer.disappointed || customer.vomit || customer.leaving) return customer;

          const isHit = customer.lane === slice.lane && Math.abs(customer.position - slice.position) < 5;

          if (isHit) {
            consumed = true;
            const hitResult = processCustomerHit(customer, now);
            
            if (hitResult.newEntities.droppedPlate) newState.droppedPlates = [...newState.droppedPlates, hitResult.newEntities.droppedPlate];
            if (hitResult.newEntities.emptyPlate) newState.emptyPlates = [...newState.emptyPlates, hitResult.newEntities.emptyPlate];
            
            hitResult.events.forEach(event => {
              if (event === 'BRIAN_DROPPED_PLATE') {
                soundManager.plateDropped();
                newState.stats.currentCustomerStreak = 0;
                newState.stats.currentPlateStreak = 0;
              } else if (['UNFROZEN_AND_SERVED', 'WOOZY_STEP_1', 'WOOZY_STEP_2', 'SERVED_NORMAL', 'SERVED_CRITIC'].includes(event)) {
                scoreChanged = true;
                if (event === 'UNFROZEN_AND_SERVED') soundManager.customerUnfreeze();
                else if (event === 'WOOZY_STEP_1') soundManager.woozyServed();
                else soundManager.customerServed();

                const baseScore = event === 'WOOZY_STEP_1' ? SCORING.CUSTOMER_FIRST_SLICE : (customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL);
                const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
                newState.score += pointsEarned;
                newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
                customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });

                if (event !== 'WOOZY_STEP_1') {
                   newState.happyCustomers += 1;
                   newState.stats.customersServed += 1;
                   newState.stats.currentCustomerStreak += 1;
                   if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
                   
                   if (customer.critic && event === 'SERVED_CRITIC' && customer.position >= 50 && newState.lives < GAME_CONFIG.MAX_LIVES) {
                     newState.lives += 1;
                     soundManager.lifeGained();
                   } else if (newState.happyCustomers % 8 === 0 && newState.lives < GAME_CONFIG.MAX_LIVES) {
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

      // Cleanup Arrays
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
      customerScores.forEach(({ points, lane, position }) => {
        newState = addFloatingScore(points, lane, position, newState);
      });

      // 4. CLEANUP EXPIRATIONS
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

      // 5. STAR POWER AUTO-FEED
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
            scoreChanged = true;
            soundManager.customerServed();
            const baseScore = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
            const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
            newState.score += pointsEarned;
            newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
            newState.happyCustomers += 1;
            newState = addFloatingScore(pointsEarned, customer.lane, customer.position, newState);
            newState.stats.customersServed += 1;
            newState.stats.currentCustomerStreak += 1;
            if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
            
            const newPlate: EmptyPlate = { id: `plate-star-${Date.now()}-${customer.id}`, lane: customer.lane, position: customer.position, speed: ENTITY_SPEEDS.PLATE, };
            newState.emptyPlates = [...newState.emptyPlates, newPlate];
            return { ...customer, served: true, hasPlate: false };
          }
          return customer;
        });
      }

      // 6. CHEF POWERUP COLLISIONS
      const caughtPowerUpIds = new Set<string>();
      newState.powerUps.forEach(powerUp => {
        if (powerUp.position <= GAME_CONFIG.CHEF_X_POSITION && powerUp.lane === newState.chefLane && !newState.nyanSweep?.active) {
          scoreChanged = true;
          soundManager.powerUpCollected(powerUp.type);
          const pointsEarned = SCORING.POWERUP_COLLECTED * dogeMultiplier;
          newState.score += pointsEarned;
          newState = addFloatingScore(pointsEarned, powerUp.lane, powerUp.position, newState);
          caughtPowerUpIds.add(powerUp.id);
          newState.stats.powerUpsUsed[powerUp.type] += 1;

          if (powerUp.type === 'beer') {
            // ... (Beer logic remains same)
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
            newState.bank += SCORING.MOLTOBENNY_CASH * dogeMultiplier;
          } else {
            newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== powerUp.type), { type: powerUp.type, endTime: now + POWERUPS.DURATION }];
            // ... (Ice cream/Honey logic remains same)
          }
        }
      });
      newState.powerUps = newState.powerUps.filter(powerUp => !caughtPowerUpIds.has(powerUp.id))
        .map(powerUp => ({ ...powerUp, position: powerUp.position - powerUp.speed }))
        .filter(powerUp => powerUp.position > 0);

      // 7. PLATE CATCHING LOGIC
      newState.emptyPlates = newState.emptyPlates.map(plate => ({ ...plate, position: plate.position - plate.speed })).filter(plate => {
        if (plate.position <= 10 && plate.lane === newState.chefLane && !newState.nyanSweep?.active) {
          scoreChanged = true;
          soundManager.plateCaught();
          const baseScore = SCORING.PLATE_CAUGHT;
          const pointsEarned = Math.floor(baseScore * dogeMultiplier * getStreakMultiplier(newState.stats.currentPlateStreak));
          newState.score += pointsEarned;
          newState = addFloatingScore(pointsEarned, plate.lane, plate.position, newState);
          newState.stats.platesCaught += 1;
          newState.stats.currentPlateStreak += 1;
          return false;
        } else if (plate.position <= 0) {
          soundManager.plateDropped();
          newState.stats.currentPlateStreak = 0;
          return false;
        }
        return true;
      });

      // 8. NYAN CAT SWEEP LOGIC (Removed detailed block for brevity, ensure scoreChanged = true when serving)
      if (newState.nyanSweep?.active) {
          // ... (existing nyan logic)
          // set scoreChanged = true inside customer serving block
      }

      // --- 9. LEVEL & BOSS LOGIC (TRIGGERED ON SCORE CHANGE) ---
      if (scoreChanged) {
        newState = checkLevelAndBossTriggers(newState);
      }

      // 10. ACTIVE BOSS BATTLE (Non-Trigger Logic)
      if (newState.bossBattle?.active && !newState.bossBattle.bossDefeated) {
        let bossScoreThisTick = false;
        // ... (existing minion movement logic)

        const consumedSliceIds = new Set<string>();
        // ... (existing boss collision logic)
        // Inside Boss hit or minion hit: consumedSliceIds.add(slice.id); bossScoreThisTick = true;
        
        if (bossScoreThisTick) {
            newState = checkLevelAndBossTriggers(newState);
        }
        
        // ... (existing boss vulnerability/wave logic)
      }

      return newState;
    });
  }, [gameState.gameOver, gameState.paused, ovenSoundStates, addFloatingScore, checkLevelAndBossTriggers]);

  // ... (rest of the store/upgrade functions)

  return {
    gameState, servePizza, moveChef, useOven, cleanOven, resetGame, togglePause, upgradeOven, upgradeOvenSpeed,
    closeStore, bribeReviewer, buyPowerUp, debugActivatePowerUp,
  };
};