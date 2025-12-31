import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Customer, PizzaSlice, EmptyPlate, PowerUp, PowerUpType, FloatingScore, DroppedPlate, StarLostReason, BossMinion } from '../types/game';
import { soundManager } from '../utils/sounds';
import { getStreakMultiplier } from '../components/StreakDisplay';
import {
  GAME_CONFIG, OVEN_CONFIG, ENTITY_SPEEDS, SPAWN_RATES, PROBABILITIES,
  SCORING, COSTS, BOSS_CONFIG, POWERUPS, TIMINGS, POSITIONS
} from '../lib/constants';

// --- 1. Static Initial State (Removed clutter from hook) ---
const INITIAL_STATE: GameState = {
  customers: [], pizzaSlices: [], emptyPlates: [], powerUps: [], activePowerUps: [],
  floatingScores: [], droppedPlates: [], chefLane: 0, score: 0,
  lives: GAME_CONFIG.STARTING_LIVES, level: 1, gameOver: false, paused: false,
  availableSlices: 0,
  ovens: {
    0: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
    1: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
    2: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
    3: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 }
  },
  ovenUpgrades: { 0: 0, 1: 0, 2: 0, 3: 0 },
  ovenSpeedUpgrades: { 0: 0, 1: 0, 2: 0, 3: 0 },
  happyCustomers: 0, bank: 0, showStore: false, lastStoreLevelShown: 0, pendingStoreShow: false,
  fallingPizza: undefined, starPowerActive: false, powerUpAlert: undefined,
  stats: {
    slicesBaked: 0, customersServed: 0, longestCustomerStreak: 0, currentCustomerStreak: 0,
    platesCaught: 0, largestPlateStreak: 0, currentPlateStreak: 0,
    powerUpsUsed: { honey: 0, 'ice-cream': 0, beer: 0, star: 0, doge: 0, nyan: 0, moltobenny: 0 },
    ovenUpgradesMade: 0,
  },
};

// --- 2. pure Helper Functions (Logic Extraction) ---

const isColliding = (pos1: number, lane1: number, pos2: number, lane2: number, threshold = 5) => {
  return lane1 === lane2 && Math.abs(pos1 - pos2) < threshold;
};

// Centralizes the 15 lines of code repeated 6 times in the original file
const handleScoring = (
  state: GameState, 
  basePoints: number, 
  lane: number, 
  position: number, 
  isCustomerServe: boolean = false
) => {
  const dogeMultiplier = state.activePowerUps.some(p => p.type === 'doge') ? 2 : 1;
  const streakMultiplier = isCustomerServe ? getStreakMultiplier(state.stats.currentCustomerStreak) : 1;
  
  // Calculate
  const points = Math.floor(basePoints * dogeMultiplier * streakMultiplier);
  const money = SCORING.BASE_BANK_REWARD * dogeMultiplier;

  // Apply to State
  state.score += points;
  state.bank += money; // Note: Original added bank on every serve
  state.floatingScores.push({
    id: `score-${Date.now()}-${Math.random()}`,
    points, lane, position, startTime: Date.now()
  });

  if (isCustomerServe) {
    state.happyCustomers += 1;
    state.stats.customersServed += 1;
    state.stats.currentCustomerStreak += 1;
    if (state.stats.currentCustomerStreak > state.stats.longestCustomerStreak) {
      state.stats.longestCustomerStreak = state.stats.currentCustomerStreak;
    }
  }
};

const attemptLifeGain = (state: GameState, isCritic: boolean, position: number) => {
  if (state.lives >= GAME_CONFIG.MAX_LIVES) return;
  
  const hasDoge = state.activePowerUps.some(p => p.type === 'doge');
  let shouldGain = false;

  if (isCritic) {
    if (position >= 50) shouldGain = true;
  } else {
    if (state.happyCustomers % 8 === 0) shouldGain = true;
  }

  if (shouldGain) {
    const amount = hasDoge ? 2 : 1;
    state.lives = Math.min(GAME_CONFIG.MAX_LIVES, state.lives + amount);
    soundManager.lifeGained();
  }
};

// --- 3. The Hook ---

export const useGameLogic = (gameStarted: boolean = true) => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [lastCustomerSpawn, setLastCustomerSpawn] = useState(0);
  const [lastPowerUpSpawn, setLastPowerUpSpawn] = useState(0);
  const [ovenSoundStates, setOvenSoundStates] = useState<{ [key: number]: string }>({ 0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle' });
  const prevShowStoreRef = useRef(false);

  // --- Spawners ---

  const spawnCustomer = useCallback(() => {
    const now = Date.now();
    const spawnDelay = SPAWN_RATES.CUSTOMER_MIN_INTERVAL_BASE - (gameState.level * SPAWN_RATES.CUSTOMER_MIN_INTERVAL_DECREMENT);
    if (now - lastCustomerSpawn < spawnDelay || gameState.paused) return;

    const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
    const isCritic = Math.random() < PROBABILITIES.CRITIC_CHANCE;
    const isBrian = !isCritic && Math.random() < PROBABILITIES.BAD_LUCK_BRIAN_CHANCE;
    const emojis = ['😢', '😭', '😠', '🤬'];

    setGameState(prev => ({
      ...prev,
      customers: [...prev.customers, {
        id: `customer-${now}-${lane}`, lane, position: POSITIONS.SPAWN_X, speed: ENTITY_SPEEDS.CUSTOMER_BASE,
        served: false, hasPlate: false, leaving: false, disappointed: false, movingRight: false,
        critic: isCritic, badLuckBrian: isBrian, flipped: isBrian,
        disappointedEmoji: emojis[Math.floor(Math.random() * emojis.length)]
      }]
    }));
    setLastCustomerSpawn(now);
  }, [lastCustomerSpawn, gameState.level, gameState.paused]);

  const spawnPowerUp = useCallback(() => {
    const now = Date.now();
    if (now - lastPowerUpSpawn < SPAWN_RATES.POWERUP_MIN_INTERVAL) return;

    const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
    const type = Math.random() < PROBABILITIES.POWERUP_STAR_CHANCE ? 'star' : POWERUPS.TYPES[Math.floor(Math.random() * POWERUPS.TYPES.length)];

    setGameState(prev => ({
      ...prev,
      powerUps: [...prev.powerUps, { id: `pup-${now}-${lane}`, lane, position: POSITIONS.POWERUP_SPAWN_X, speed: ENTITY_SPEEDS.POWERUP, type }]
    }));
    setLastPowerUpSpawn(now);
  }, [lastPowerUpSpawn]);

  const spawnBossWave = useCallback((waveNum: number): BossMinion[] => {
    return Array.from({ length: BOSS_CONFIG.MINIONS_PER_WAVE }).map((_, i) => ({
      id: `minion-${Date.now()}-${waveNum}-${i}`,
      lane: i % 4,
      position: POSITIONS.SPAWN_X + (Math.floor(i / 4) * 15),
      speed: ENTITY_SPEEDS.MINION,
      defeated: false
    }));
  }, []);

  // --- Game Loop Helpers (State Mutators) ---
  // These modify a 'draft' state object directly to avoid nested spreads

  const updateOvens = (state: GameState, now: number) => {
    const newSoundStates = { ...ovenSoundStates };
    let soundsChanged = false;

    Object.keys(state.ovens).forEach(key => {
      const lane = parseInt(key);
      const oven = state.ovens[lane];

      // Cleaning Logic
      if (oven.burned && oven.cleaningStartTime > 0 && now - oven.cleaningStartTime >= OVEN_CONFIG.CLEANING_TIME) {
        soundManager.cleaningComplete();
        state.ovens[lane] = { ...oven, burned: false, cleaningStartTime: 0 };
      }

      // Cooking Logic
      if (oven.cooking && !oven.burned) {
        const elapsed = oven.pausedElapsed !== undefined ? oven.pausedElapsed : now - oven.startTime;
        const speedLvl = state.ovenSpeedUpgrades[lane] || 0;
        
        let status = 'cooking';
        if (elapsed >= OVEN_CONFIG.BURN_TIME) status = 'burning';
        else if (elapsed >= OVEN_CONFIG.WARNING_TIME) status = 'warning';
        else if (elapsed >= OVEN_CONFIG.COOK_TIMES[speedLvl]) status = 'ready';

        // Sound Logic
        if (status !== newSoundStates[lane]) {
          if (status === 'ready' && newSoundStates[lane] === 'cooking') soundManager.ovenReady();
          if (status === 'warning' && newSoundStates[lane] === 'ready') soundManager.ovenWarning();
          if (status === 'burning' && newSoundStates[lane] === 'warning') soundManager.ovenBurning();
          newSoundStates[lane] = status;
          soundsChanged = true;
        }

        // Burn Logic
        if (status === 'burning') {
          soundManager.ovenBurned();
          loseLife(state, 'burned_pizza');
          state.ovens[lane] = { cooking: false, startTime: 0, burned: true, cleaningStartTime: 0, sliceCount: 0 };
          newSoundStates[lane] = 'idle';
          soundsChanged = true;
        }
      } else if (!oven.cooking && newSoundStates[lane] !== 'idle') {
        newSoundStates[lane] = 'idle';
        soundsChanged = true;
      }
    });

    if (soundsChanged) setOvenSoundStates(newSoundStates);
  };

  const loseLife = (state: GameState, reason: string, count = 1) => {
    soundManager.lifeLost();
    state.lives = Math.max(0, state.lives - count);
    state.lastStarLostReason = reason as StarLostReason;
    state.stats.currentCustomerStreak = 0;
    if (state.lives === 0) {
      state.gameOver = true;
      soundManager.gameOver();
      if (state.availableSlices > 0) state.fallingPizza = { lane: state.chefLane, y: 0 };
      state.availableSlices = 0;
    }
  };

  const updateCustomers = (state: GameState, now: number) => {
    const hasHoney = state.activePowerUps.some(p => p.type === 'honey');
    const hasIceCream = state.activePowerUps.some(p => p.type === 'ice-cream');
    const honeyEnd = state.activePowerUps.find(p => p.type === 'honey')?.endTime || 0;
    const iceCreamEnd = state.activePowerUps.find(p => p.type === 'ice-cream')?.endTime || 0;

    state.customers = state.customers.map(c => {
      // 1. Resolve Status Effects (Honey/IceCream)
      if (!c.served && !c.leaving && !c.badLuckBrian) {
        // Reset flags if powerup expired
        if (!hasHoney && c.hotHoneyAffected) c.hotHoneyAffected = false;
        if (!hasIceCream && c.frozen) {
           // Keep frozen if explicitly set, but clear if it was purely from powerup logic
           // (Simplified logic: if powerup gone, frozen/honey gone)
           if (c.shouldBeFrozenByIceCream) c.frozen = false; 
        }

        // Apply new flags
        if (hasHoney && honeyEnd > now) c.hotHoneyAffected = true;
        if (hasIceCream && iceCreamEnd > now && !c.unfrozenThisPeriod) c.frozen = true;
        
        // Conflict Resolution
        if (c.hotHoneyAffected && c.frozen) {
           if (honeyEnd > iceCreamEnd) c.frozen = false;
           else c.hotHoneyAffected = false;
        }
      }

      // 2. Movement Logic
      if (c.frozen && !c.hotHoneyAffected) return c; // Frozen don't move

      let moveSpeed = c.speed;
      if (c.hotHoneyAffected) moveSpeed *= 0.5;
      if (c.served || c.leaving || c.brianNyaned) moveSpeed *= 2;
      if (c.brianNyaned) moveSpeed *= 1.5; // Even faster

      // Woozy Logic
      if (c.woozy) {
        if (c.movingRight) {
          const nextPos = c.position + (c.speed * 0.75);
          return nextPos >= POSITIONS.TURN_AROUND_POINT 
            ? { ...c, position: nextPos, movingRight: false } 
            : { ...c, position: nextPos };
        } else {
          // Woozy moving left
          const nextPos = c.position - (c.speed * 0.75);
          if (nextPos <= GAME_CONFIG.CHEF_X_POSITION) {
             // Woozy failure
             soundManager.customerDisappointed();
             loseLife(state, c.critic ? 'woozy_critic_reached' : 'woozy_customer_reached', c.critic ? 2 : 1);
             return { ...c, position: nextPos, disappointed: true, movingRight: true, woozy: false };
          }
          return { ...c, position: nextPos };
        }
      }

      // Normal Logic
      let nextPos = c.position;
      if (c.movingRight || c.served || c.leaving) nextPos += moveSpeed;
      else nextPos -= moveSpeed;

      // Check Reached Chef (Left Side)
      if (!c.movingRight && !c.served && nextPos <= GAME_CONFIG.CHEF_X_POSITION) {
         if (c.badLuckBrian) {
            return { ...c, position: nextPos, textMessage: "You don't have gluten free?", textMessageTime: now, leaving: true, movingRight: true, flipped: false };
         }
         
         // Standard failure
         soundManager.customerDisappointed();
         loseLife(state, c.critic ? 'disappointed_critic' : 'disappointed_customer', c.critic ? 2 : 1);
         return { ...c, position: nextPos, disappointed: true, movingRight: true };
      }

      return { ...c, position: nextPos };
    }).filter(c => c.position > POSITIONS.OFF_SCREEN_LEFT && c.position <= 100);
  };

  const handleCollisions = (state: GameState, now: number) => {
    const consumedPizzaIds = new Set<string>();
    const destroyedPowerUps = new Set<string>();

    state.pizzaSlices.forEach(slice => {
      let consumed = false;

      // Customer Collisions
      state.customers = state.customers.map(c => {
        if (consumed || c.disappointed || c.vomit || c.leaving) return c;
        if (!isColliding(c.position, c.lane, slice.position, slice.lane)) return c;

        consumed = true;
        consumedPizzaIds.add(slice.id);

        // A. Bad Luck Brian Drop
        if (c.badLuckBrian) {
           soundManager.plateDropped();
           state.stats.currentCustomerStreak = 0;
           state.stats.currentPlateStreak = 0;
           state.droppedPlates.push({ id: `drop-${now}-${c.id}`, lane: c.lane, position: c.position, startTime: now, hasSlice: true });
           return { ...c, leaving: true, movingRight: true, flipped: false, textMessage: "Ugh! I dropped my slice!", textMessageTime: now };
        }

        // B. Woozy First Slice
        if (c.woozy && (c.woozyState || 'normal') === 'normal' && !c.hotHoneyAffected && !c.frozen) {
           soundManager.woozyServed();
           handleScoring(state, SCORING.CUSTOMER_FIRST_SLICE, c.lane, c.position, false); // No streak/life on first slice?
           state.emptyPlates.push({ id: `plate-${now}-${c.id}-1`, lane: c.lane, position: c.position, speed: ENTITY_SPEEDS.PLATE });
           return { ...c, woozyState: 'drooling' }; // Needs one more
        }

        // C. Successful Serve
        soundManager.customerServed();
        if (c.frozen) soundManager.customerUnfreeze();
        
        const basePoints = c.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
        handleScoring(state, basePoints, c.lane, c.position, true); // true = counts for streak/life
        attemptLifeGain(state, !!c.critic, c.position);

        state.emptyPlates.push({ id: `plate-${now}-${c.id}`, lane: c.lane, position: c.position, speed: ENTITY_SPEEDS.PLATE });
        return { ...c, served: true, hasPlate: false, frozen: false, woozy: false, hotHoneyAffected: false, unfrozenThisPeriod: true };
      });

      // Boss Collision
      if (!consumed && state.bossBattle?.active && state.bossBattle.bossVulnerable) {
         if (isColliding(state.bossBattle.bossPosition, 1, slice.position, slice.lane, 10)) {
            consumed = true;
            consumedPizzaIds.add(slice.id);
            state.bossBattle.bossHealth -= 1;
            soundManager.customerServed();
            handleScoring(state, SCORING.BOSS_HIT, slice.lane, slice.position, false);
            if (state.bossBattle.bossHealth <= 0) {
               state.bossBattle.bossDefeated = true;
               state.bossBattle.active = false;
               state.bossBattle.minions = [];
               handleScoring(state, SCORING.BOSS_DEFEAT, 1, state.bossBattle.bossPosition, false);
            }
         }
      }

      // PowerUp Destruction
      if (!consumed) {
         state.powerUps.forEach(p => {
            if (isColliding(p.position, p.lane, slice.position, slice.lane)) {
               soundManager.pizzaDestroyed();
               destroyedPowerUps.add(p.id);
               consumed = true;
               consumedPizzaIds.add(slice.id);
            }
         });
      }
    });

    state.pizzaSlices = state.pizzaSlices.filter(s => !consumedPizzaIds.has(s.id));
    state.powerUps = state.powerUps.filter(p => !destroyedPowerUps.has(p.id));

    // Handle Offscreen Pizza (breaks plate streak)
    if (state.pizzaSlices.some(s => s.position >= POSITIONS.OFF_SCREEN_RIGHT)) {
       state.stats.currentPlateStreak = 0;
    }
  };

  const handleChefCollisions = (state: GameState, now: number) => {
    if (state.nyanSweep?.active) return;
    const caughtIds = new Set<string>();

    state.powerUps.forEach(p => {
       if (p.lane === state.chefLane && p.position <= GAME_CONFIG.CHEF_X_POSITION) {
          caughtIds.add(p.id);
          soundManager.powerUpCollected(p.type);
          state.stats.powerUpsUsed[p.type]++;
          handleScoring(state, SCORING.POWERUP_COLLECTED, p.lane, p.position, false);

          // Apply Effects
          if (p.type === 'star') {
             state.availableSlices = GAME_CONFIG.MAX_SLICES;
             state.starPowerActive = true;
             state.activePowerUps.push({ type: 'star', endTime: now + POWERUPS.DURATION });
          } else if (p.type === 'beer') {
             // Beer: Make woozy/Brian vomit
             let sickCount = 0;
             state.customers = state.customers.map(c => {
                if (c.critic) return { ...c, textMessage: "I prefer wine", textMessageTime: now };
                if (c.woozy || c.badLuckBrian) {
                   sickCount++;
                   return { ...c, vomit: true, disappointed: true, movingRight: true, woozy: false, textMessage: c.badLuckBrian ? "Oh man I hurled" : undefined, textMessageTime: now };
                }
                if (!c.served && !c.leaving) return { ...c, woozy: true, woozyState: 'normal', movingRight: true };
                return c;
             });
             if (sickCount > 0) loseLife(state, 'beer_vomit', sickCount);
             state.activePowerUps.push({ type: 'beer', endTime: now + POWERUPS.DURATION });
          } else if (p.type === 'nyan') {
             state.nyanSweep = { active: true, xPosition: GAME_CONFIG.CHEF_X_POSITION, laneDirection: 1, startTime: now, lastUpdateTime: now, startingLane: state.chefLane };
             soundManager.nyanCatPowerUp();
             state.powerUpAlert = { type: 'nyan', endTime: now + POWERUPS.ALERT_DURATION_NYAN, chefLane: state.chefLane };
          } else if (p.type === 'moltobenny') {
             const doge = state.activePowerUps.some(x => x.type === 'doge') ? 2 : 1;
             state.score += SCORING.MOLTOBENNY_POINTS * doge;
             state.bank += SCORING.MOLTOBENNY_CASH * doge;
          } else {
             // Honey, Ice Cream, Doge
             state.activePowerUps.push({ type: p.type, endTime: now + POWERUPS.DURATION });
             if (p.type === 'doge') state.powerUpAlert = { type: 'doge', endTime: now + POWERUPS.ALERT_DURATION_DOGE, chefLane: state.chefLane };
          }
       }
    });

    state.powerUps = state.powerUps.filter(p => !caughtIds.has(p.id));
  };

  // --- 4. The Giant Loop (Refactored to be linear) ---

  const updateGame = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver) {
         if (prev.fallingPizza && prev.fallingPizza.y < 400) {
            return { ...prev, fallingPizza: { ...prev.fallingPizza, y: prev.fallingPizza.y + ENTITY_SPEEDS.FALLING_PIZZA } };
         }
         return prev;
      }
      if (prev.paused) return prev;

      const now = Date.now();
      const newState = { ...prev }; // Clone state

      // A. Ovens
      updateOvens(newState, now);

      // B. Cleanups (Timers)
      newState.floatingScores = newState.floatingScores.filter(fs => now - fs.startTime < TIMINGS.FLOATING_SCORE_LIFETIME);
      newState.droppedPlates = newState.droppedPlates.filter(dp => now - dp.startTime < TIMINGS.DROPPED_PLATE_LIFETIME);
      newState.customers = newState.customers.map(c => (c.textMessage && now - (c.textMessageTime||0) > TIMINGS.TEXT_MESSAGE_LIFETIME) ? {...c, textMessage: undefined} : c);
      newState.activePowerUps = newState.activePowerUps.filter(p => now < p.endTime);
      if (!newState.activePowerUps.some(p => p.type === 'star')) newState.starPowerActive = false;
      if (newState.powerUpAlert && now >= newState.powerUpAlert.endTime) newState.powerUpAlert = undefined;

      // C. Move Entities
      updateCustomers(newState, now);
      newState.pizzaSlices = newState.pizzaSlices.map(s => ({ ...s, position: s.position + s.speed })).filter(s => s.position < POSITIONS.OFF_SCREEN_RIGHT); // Note: Collision logic handles break streak
      newState.powerUps = newState.powerUps.map(p => ({ ...p, position: p.position - p.speed })).filter(p => p.position > 10);
      
      // D. Empty Plates (Catching Logic)
      newState.emptyPlates = newState.emptyPlates.map(p => ({ ...p, position: p.position - p.speed })).filter(p => {
         if (p.position <= 0) {
            soundManager.plateDropped();
            newState.stats.currentPlateStreak = 0;
            return false;
         }
         if (p.position <= 10 && p.lane === newState.chefLane && !newState.nyanSweep?.active) {
            soundManager.plateCaught();
            newState.stats.platesCaught++;
            newState.stats.currentPlateStreak++;
            if (newState.stats.currentPlateStreak > newState.stats.largestPlateStreak) newState.stats.largestPlateStreak = newState.stats.currentPlateStreak;
            handleScoring(newState, SCORING.PLATE_CAUGHT, p.lane, p.position, false);
            return false; // Caught
         }
         return true;
      });

      // E. Collisions
      handleCollisions(newState, now);
      handleChefCollisions(newState, now);

      // F. Star Power Auto-Feed
      if (newState.starPowerActive && newState.availableSlices > 0) {
         newState.customers = newState.customers.map(c => {
            if (c.lane === newState.chefLane && !c.served && !c.disappointed && Math.abs(c.position - GAME_CONFIG.CHEF_X_POSITION) < 8) {
               newState.availableSlices = Math.max(0, newState.availableSlices - 1);
               if (c.badLuckBrian) {
                  soundManager.plateDropped();
                  newState.droppedPlates.push({ id: `drop-${now}-${c.id}`, lane: c.lane, position: c.position, startTime: now, hasSlice: true });
                  return { ...c, leaving: true, movingRight: true, textMessage: "Dropped it!" };
               }
               soundManager.customerServed();
               handleScoring(newState, SCORING.CUSTOMER_NORMAL, c.lane, c.position, true);
               attemptLifeGain(newState, !!c.critic, c.position);
               newState.emptyPlates.push({ id: `plate-star-${now}-${c.id}`, lane: c.lane, position: c.position, speed: ENTITY_SPEEDS.PLATE });
               return { ...c, served: true, hasPlate: false };
            }
            return c;
         });
      }

      // G. Nyan Sweep
      if (newState.nyanSweep?.active) {
         const sweep = newState.nyanSweep;
         if (now - sweep.lastUpdateTime >= 50) {
            sweep.xPosition += ((90 - GAME_CONFIG.CHEF_X_POSITION) / 80) * 1.5;
            sweep.lastUpdateTime = now;
            newState.chefLane += sweep.laneDirection * 0.5;
            if (newState.chefLane > GAME_CONFIG.LANE_BOTTOM || newState.chefLane < GAME_CONFIG.LANE_TOP) sweep.laneDirection *= -1;
            
            // Sweep Collisions
            newState.customers = newState.customers.map(c => {
               if (!c.served && Math.abs(c.lane - newState.chefLane) < 1 && Math.abs(c.position - sweep.xPosition) < 10) {
                  soundManager.customerServed();
                  handleScoring(newState, SCORING.CUSTOMER_NORMAL, c.lane, c.position, true);
                  attemptLifeGain(newState, !!c.critic, c.position);
                  return { ...c, served: true, brianNyaned: true };
               }
               return c;
            });

            // Boss Minion Sweep
            if (newState.bossBattle?.active) {
               newState.bossBattle.minions = newState.bossBattle.minions.map(m => {
                  if (!m.defeated && Math.abs(m.lane - newState.chefLane) < 0.6 && Math.abs(m.position - sweep.xPosition) < 10) {
                     soundManager.customerServed();
                     handleScoring(newState, SCORING.MINION_DEFEAT, m.lane, m.position, false);
                     return { ...m, defeated: true };
                  }
                  return m;
               });
            }

            if (sweep.xPosition >= 90) {
               newState.nyanSweep = undefined;
               newState.chefLane = Math.round(newState.chefLane);
               newState.chefLane = Math.max(GAME_CONFIG.LANE_TOP, Math.min(GAME_CONFIG.LANE_BOTTOM, newState.chefLane));
               if (newState.pendingStoreShow) newState.showStore = true;
            }
         }
      }

      // H. Level & Boss Logic
      const targetLevel = Math.floor(newState.score / GAME_CONFIG.LEVEL_THRESHOLD) + 1;
      if (targetLevel > newState.level) {
         newState.level = targetLevel;
         const storeLvl = Math.floor(targetLevel / GAME_CONFIG.STORE_LEVEL_INTERVAL) * GAME_CONFIG.STORE_LEVEL_INTERVAL;
         if (storeLvl >= 10 && storeLvl > newState.lastStoreLevelShown) {
            newState.lastStoreLevelShown = storeLvl;
            if (newState.nyanSweep?.active) newState.pendingStoreShow = true;
            else newState.showStore = true;
         }
         // Start Boss
         if (targetLevel === BOSS_CONFIG.TRIGGER_LEVEL && !newState.bossBattle?.active && !newState.bossBattle?.bossDefeated) {
            newState.bossBattle = {
               active: true, bossHealth: BOSS_CONFIG.HEALTH, currentWave: 1, bossVulnerable: true, bossDefeated: false, bossPosition: BOSS_CONFIG.BOSS_POSITION,
               minions: spawnBossWave(1)
            };
         }
      }

      if (newState.bossBattle?.active) {
         newState.bossBattle.minions = newState.bossBattle.minions.map(m => {
            if (m.defeated) return m;
            const nextPos = m.position - m.speed;
            if (nextPos <= GAME_CONFIG.CHEF_X_POSITION) {
               loseLife(newState, 'minion_reached');
               return { ...m, defeated: true };
            }
            return { ...m, position: nextPos };
         });
         
         // Boss Waves
         const active = newState.bossBattle.minions.filter(m => !m.defeated);
         if (active.length === 0) {
            if (newState.bossBattle.currentWave < BOSS_CONFIG.WAVES) {
               newState.bossBattle.currentWave++;
               newState.bossBattle.minions = spawnBossWave(newState.bossBattle.currentWave);
            } else {
               newState.bossBattle.bossVulnerable = true;
            }
         }
      }

      return newState;
    });
  }, [gameState.gameOver, gameState.paused, ovenSoundStates, spawnBossWave]);

  // --- 5. Actions ---

  const servePizza = useCallback(() => {
    if (gameState.gameOver || gameState.paused || gameState.availableSlices <= 0 || gameState.nyanSweep?.active) return;
    soundManager.servePizza();
    setGameState(prev => ({
      ...prev,
      pizzaSlices: [...prev.pizzaSlices, { id: `pizza-${Date.now()}-${prev.chefLane}`, lane: prev.chefLane, position: GAME_CONFIG.CHEF_X_POSITION, speed: ENTITY_SPEEDS.PIZZA }],
      availableSlices: prev.availableSlices - 1,
    }));
  }, [gameState.gameOver, gameState.paused, gameState.availableSlices, gameState.nyanSweep]);

  const moveChef = useCallback((direction: 'up' | 'down') => {
    if (gameState.gameOver || gameState.paused || gameState.nyanSweep?.active) return;
    setGameState(prev => {
       const change = direction === 'up' ? -1 : 1;
       const newLane = Math.max(GAME_CONFIG.LANE_TOP, Math.min(GAME_CONFIG.LANE_BOTTOM, prev.chefLane + change));
       return { ...prev, chefLane: newLane };
    });
  }, [gameState.gameOver, gameState.paused, gameState.nyanSweep]);

  const useOven = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;
    setGameState(prev => {
      const oven = prev.ovens[prev.chefLane];
      const now = Date.now();
      if (oven.burned) return prev;

      // Start
      if (!oven.cooking) {
        soundManager.ovenStart();
        setOvenSoundStates(s => ({ ...s, [prev.chefLane]: 'cooking' }));
        return { ...prev, ovens: { ...prev.ovens, [prev.chefLane]: { cooking: true, startTime: now, burned: false, cleaningStartTime: 0, sliceCount: 1 + (prev.ovenUpgrades[prev.chefLane]||0) } } };
      }
      
      // Collect
      const speedLvl = prev.ovenSpeedUpgrades[prev.chefLane] || 0;
      if (now - oven.startTime >= OVEN_CONFIG.COOK_TIMES[speedLvl] && now - oven.startTime < OVEN_CONFIG.BURN_TIME) {
         if (prev.availableSlices + oven.sliceCount <= GAME_CONFIG.MAX_SLICES) {
            soundManager.servePizza();
            setOvenSoundStates(s => ({ ...s, [prev.chefLane]: 'idle' }));
            return {
               ...prev,
               availableSlices: prev.availableSlices + oven.sliceCount,
               ovens: { ...prev.ovens, [prev.chefLane]: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 } },
               stats: { ...prev.stats, slicesBaked: prev.stats.slicesBaked + oven.sliceCount }
            };
         }
      }
      return prev;
    });
  }, [gameState.gameOver, gameState.paused, gameState.chefLane]);

  const cleanOven = useCallback(() => {
     if (gameState.gameOver || gameState.paused) return;
     setGameState(prev => {
        const oven = prev.ovens[prev.chefLane];
        if (oven.burned && oven.cleaningStartTime === 0) {
           soundManager.cleaningStart();
           return { ...prev, ovens: { ...prev.ovens, [prev.chefLane]: { ...oven, cleaningStartTime: Date.now() } } };
        }
        return prev;
     });
  }, [gameState.gameOver, gameState.paused, gameState.chefLane]);

  // --- Meta Actions ---
  const resetGame = useCallback(() => {
     setGameState(INITIAL_STATE);
     setLastCustomerSpawn(0); setLastPowerUpSpawn(0);
     setOvenSoundStates({ 0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle' });
  }, []);

  const togglePause = useCallback(() => {
     setGameState(prev => {
        const newPaused = !prev.paused;
        const now = Date.now();
        const newOvens = { ...prev.ovens };
        Object.keys(newOvens).forEach(k => {
           const lane = parseInt(k);
           const oven = newOvens[lane];
           if (oven.cooking && !oven.burned) {
              if (newPaused) newOvens[lane] = { ...oven, pausedElapsed: now - oven.startTime };
              else newOvens[lane] = { ...oven, startTime: now - (oven.pausedElapsed || 0), pausedElapsed: undefined };
           }
        });
        return { ...prev, paused: newPaused, ovens: newOvens };
     });
  }, []);

  const closeStore = useCallback(() => setGameState(prev => ({ ...prev, showStore: false })), []);
  
  const upgradeOven = useCallback((lane: number) => {
     setGameState(prev => {
        const cost = COSTS.OVEN_UPGRADE;
        if (prev.bank >= cost && prev.ovenUpgrades[lane] < OVEN_CONFIG.MAX_UPGRADE_LEVEL) {
           return { ...prev, bank: prev.bank - cost, ovenUpgrades: { ...prev.ovenUpgrades, [lane]: prev.ovenUpgrades[lane] + 1 }, stats: { ...prev.stats, ovenUpgradesMade: prev.stats.ovenUpgradesMade + 1 } };
        }
        return prev;
     });
  }, []);

  const upgradeOvenSpeed = useCallback((lane: number) => {
     setGameState(prev => {
        const cost = COSTS.OVEN_SPEED_UPGRADE;
        if (prev.bank >= cost && prev.ovenSpeedUpgrades[lane] < OVEN_CONFIG.MAX_SPEED_LEVEL) {
           return { ...prev, bank: prev.bank - cost, ovenSpeedUpgrades: { ...prev.ovenSpeedUpgrades, [lane]: prev.ovenSpeedUpgrades[lane] + 1 }, stats: { ...prev.stats, ovenUpgradesMade: prev.stats.ovenUpgradesMade + 1 } };
        }
        return prev;
     });
  }, []);

  const bribeReviewer = useCallback(() => {
     setGameState(prev => {
        if (prev.bank >= COSTS.BRIBE_REVIEWER && prev.lives < GAME_CONFIG.MAX_LIVES) {
           soundManager.lifeGained();
           return { ...prev, bank: prev.bank - COSTS.BRIBE_REVIEWER, lives: prev.lives + 1 };
        }
        return prev;
     });
  }, []);

  const buyPowerUp = useCallback((type: 'beer' | 'ice-cream' | 'honey') => {
     setGameState(prev => {
        if (prev.bank >= COSTS.BUY_POWERUP) {
           const pup: PowerUp = { id: `buy-${Date.now()}`, lane: prev.chefLane, position: POSITIONS.SPAWN_X, speed: ENTITY_SPEEDS.POWERUP, type };
           return { ...prev, bank: prev.bank - COSTS.BUY_POWERUP, powerUps: [...prev.powerUps, pup] };
        }
        return prev;
     });
  }, []);

  // For Debug
  const debugActivatePowerUp = useCallback((type: PowerUpType) => {
     if (gameState.gameOver) return;
     const now = Date.now();
     // Manually injecting a dummy powerup at chef location to trigger collision logic naturally in loop?
     // Or just forcing state. Let's force state to match original logic.
     setGameState(prev => {
        const newState = { ...prev, stats: { ...prev.stats, powerUpsUsed: { ...prev.stats.powerUpsUsed, [type]: prev.stats.powerUpsUsed[type] + 1 } } };
        // We reuse the logic by temporarily mocking a powerup collection or just duplicating the 'effect' logic.
        // For safety/brevity, let's just push to active list, except for Beer/Nyan which need complex triggers.
        // Actually, cleaner to spawn it right on top of the chef:
        const dummy: PowerUp = { id: `debug-${now}`, lane: prev.chefLane, position: GAME_CONFIG.CHEF_X_POSITION, speed: 0, type };
        return { ...newState, powerUps: [...prev.powerUps, dummy] };
     });
  }, [gameState.gameOver]);

  // --- Effects ---

  useEffect(() => {
     if (!gameStarted) return;
     const loop = setInterval(() => {
        updateGame();
        setGameState(curr => {
           if (!curr.paused && !curr.gameOver) {
              // Spawning
              const spawnRate = SPAWN_RATES.CUSTOMER_BASE_RATE + (curr.level - 1) * SPAWN_RATES.CUSTOMER_LEVEL_INCREMENT;
              const effectiveRate = curr.bossBattle?.active ? spawnRate * 0.5 : spawnRate;
              if (Math.random() < effectiveRate * 0.01) spawnCustomer();
              if (Math.random() < SPAWN_RATES.POWERUP_CHANCE) spawnPowerUp();
           }
           return curr;
        });
     }, GAME_CONFIG.GAME_LOOP_INTERVAL);
     return () => clearInterval(loop);
  }, [gameStarted, updateGame, spawnCustomer, spawnPowerUp]);

  useEffect(() => {
     const currentShow = gameState.showStore;
     if (!prevShowStoreRef.current && currentShow) togglePause();
     if (prevShowStoreRef.current && !currentShow) togglePause();
     prevShowStoreRef.current = currentShow;
  }, [gameState.showStore, togglePause]);

  return {
    gameState, servePizza, moveChef, useOven, cleanOven, resetGame, togglePause,
    upgradeOven, upgradeOvenSpeed, closeStore, bribeReviewer, buyPowerUp, debugActivatePowerUp,
  };
};