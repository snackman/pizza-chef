// src/hooks/useGameLogic.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  PizzaSlice,
  GameStats,
  PowerUpType,
  StarLostReason,
  EmptyPlate,
  isCustomerLeaving,
  getCustomerVariant
} from '../types/game';
import { soundManager } from '../utils/sounds';
import { getStreakMultiplier } from '../components/StreakDisplay';
import {
  GAME_CONFIG,
  ENTITY_SPEEDS,
  SPAWN_RATES,
  PROBABILITIES,
  SCORING,
  POSITIONS,
  INITIAL_GAME_STATE,
  POWERUPS,
  TIMINGS
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

import {
  calculateCustomerScore,
  calculateMinionScore,
  checkLifeGain,
  updateStatsForStreak,
  applyCustomerScoring
} from '../logic/scoringSystem';

import {
  checkSlicePowerUpCollision,
  checkSliceCustomerCollision
} from '../logic/collisionSystem';

import {
  buildLaneBuckets,
  getEntitiesInLane
} from '../logic/laneBuckets';

import {
  processChefPowerUpCollisions,
  processPowerUpCollection,
  processPowerUpExpirations
} from '../logic/powerUpSystem';

import {
  processNyanSweepMovement,
  checkNyanSweepCollisions
} from '../logic/nyanSystem';

import {
  checkBossTrigger,
  initializeBossBattle,
  processBossTick
} from '../logic/bossSystem';

import { initializeBossMasks } from '../logic/bossCollisionMasks';

import {
  processSpawning
} from '../logic/spawnSystem';

import {
  processPlates
} from '../logic/plateSystem';

import {
  processPepeHelperTick,
  checkPepeHelpersExpired
} from '../logic/pepeHelperSystem';

import {
  processWorkerTick
} from '../logic/workerSystem';

// --- Store System (actions only) ---
import {
  upgradeOven as upgradeOvenStore,
  upgradeOvenSpeed as upgradeOvenSpeedStore,
  closeStore as closeStoreStore,
  bribeReviewer as bribeReviewerStore,
  buyPowerUp as buyPowerUpStore,
  hireWorker as hireWorkerStore,
  processWorkerRetention
} from '../logic/storeSystem';

const DEFAULT_OVEN_SOUND_STATES: { [key: number]: OvenSoundState } = {
  0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle'
};

export const useGameLogic = (gameStarted: boolean = true) => {
  const [gameState, setGameState] = useState<GameState>({ ...INITIAL_GAME_STATE });

  /**
   * ✅ PERFORMANCE: spawn timers are refs (no re-render + no stale closure)
   */
  const lastCustomerSpawnRef = useRef(0);
  const lastPowerUpSpawnRef = useRef(0);

  /**
   * ✅ PERFORMANCE: ovenSoundStates is no longer React state.
   * - avoids re-renders when sound-state changes
   * - avoids JSON.stringify compare
   * - avoids setState calls inside the tick
   */
  const ovenSoundStatesRef = useRef<{ [key: number]: OvenSoundState }>({ ...DEFAULT_OVEN_SOUND_STATES });

  const prevShowStoreRef = useRef(false);

  // Initialize boss collision masks (fire and forget)
  useEffect(() => {
    initializeBossMasks();
  }, []);

  // --- 1. THE STABLE TICK REF ---
  const latestTickRef = useRef<() => void>(() => { });

  // --- Helpers (Score, Spawning) ---

  const addFloatingScore = useCallback((points: number, lane: number, position: number, state: GameState): GameState => {
    const now = Date.now();
    return {
      ...state,
      floatingScores: [...state.floatingScores, {
        id: `score - ${now} -${Math.random()} `,
        points, lane, position, startTime: now,
      }],
    };
  }, []);

  const addFloatingStar = useCallback((isGain: boolean, lane: number, position: number, state: GameState, count: number = 1): GameState => {
    const now = Date.now();
    return {
      ...state,
      floatingStars: [...state.floatingStars, {
        id: `star-${now}-${Math.random()}`,
        isGain, count, lane, position, startTime: now,
      }],
    };
  }, []);

  /**
   * Consolidated "game over" cleanup:
   * - triggers game over sound once
   * - pauses ovens (and sets paused=true)
   * - resets oven sound states
   * - drops remaining pizza slices as falling pizza + clears available slices
   */
  const triggerGameOver = useCallback((state: GameState, now: number): GameState => {
    if (state.gameOver) return state;

    // ✅ reset oven sound state ref (no render)
    ovenSoundStatesRef.current = { ...DEFAULT_OVEN_SOUND_STATES };

    // Stop oven loop + freeze oven timers
    const pausedOvens = calculateOvenPauseState(state.ovens, true, now);

    // Stop Nyan cat song
    soundManager.stopNyan();
    soundManager.gameOver();

    const shouldDropPizza = state.availableSlices > 0;

    return {
      ...state,
      gameOver: true,
      paused: true,
      ovens: pausedOvens,
      fallingPizza: shouldDropPizza ? { lane: state.chefLane, y: 0 } : state.fallingPizza,
      availableSlices: 0,
    };
  }, []);

  // --- Actions (Chef, Pizza, Oven) ---

  const servePizza = useCallback(() => {
    if (gameState.gameOver || gameState.paused || gameState.availableSlices <= 0 || gameState.nyanSweep?.active) return;
    soundManager.servePizza();
    setGameState(prev => ({
      ...prev,
      pizzaSlices: [...prev.pizzaSlices, {
        id: `pizza - ${Date.now()} -${gameState.chefLane} `,
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
      const starPowerActive = prev.activePowerUps.some(p => p.type === 'star');
      const result = tryInteractWithOven(prev, prev.chefLane, Date.now(), starPowerActive);

      if (result.action === 'STARTED') {
        soundManager.ovenStart();
        // ✅ update ref (no re-render)
        ovenSoundStatesRef.current = { ...ovenSoundStatesRef.current, [prev.chefLane]: 'cooking' };
      } else if (result.action === 'SERVED') {
        soundManager.servePizza();
        // ✅ update ref (no re-render)
        ovenSoundStatesRef.current = { ...ovenSoundStatesRef.current, [prev.chefLane]: 'idle' };
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

  // --- Main Game Loop (Physics & Logic) ---

  const updateGame = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver) {
        if (prev.fallingPizza) {
          const newY = prev.fallingPizza.y + ENTITY_SPEEDS.FALLING_PIZZA;
          return newY > 400
            ? { ...prev, fallingPizza: undefined }
            : { ...prev, fallingPizza: { ...prev.fallingPizza, y: newY } };
        }
        return prev;
      }
      if (prev.paused) return prev;

      let newState = { ...prev, stats: { ...prev.stats, powerUpsUsed: { ...prev.stats.powerUpsUsed } } };
      const now = Date.now();

      const hasDoge = newState.activePowerUps.some(p => p.type === 'doge');
      const hasStar = newState.activePowerUps.some(p => p.type === 'star');
      const dogeMultiplier = hasDoge ? 2 : 1;

      // Initialize clean kitchen timer if not set
      if (newState.cleanKitchenStartTime === undefined) {
        newState.cleanKitchenStartTime = now;
      }

      // 1. PROCESS OVENS (Logic from ovenSystem)
      const ovenTickResult = processOvenTick(
        newState.ovens,
        ovenSoundStatesRef.current, // ✅ ref read
        newState.ovenSpeedUpgrades,
        now
      );
      newState.ovens = ovenTickResult.nextOvens;

      // ✅ update ref directly; no JSON.stringify; no setState in tick
      ovenSoundStatesRef.current = ovenTickResult.nextSoundStates;

      ovenTickResult.events.forEach(event => {
        switch (event.type) {
          case 'SOUND_READY': soundManager.ovenReady(); break;
          case 'SOUND_WARNING': soundManager.ovenWarning(); break;
          case 'SOUND_BURNING': soundManager.ovenBurning(); break;
          case 'CLEANING_COMPLETE': soundManager.cleaningComplete(); break;
          case 'BURNED_ALIVE':
            soundManager.ovenBurned();
            soundManager.lifeLost();
            newState.lives = Math.max(0, newState.lives - 1);
            newState.lastStarLostReason = 'burned_pizza';
            // Use the oven's lane for the floating star
            newState = addFloatingStar(false, event.lane, 5, newState);
            // Reset clean kitchen timer
            newState.cleanKitchenStartTime = now;
            if (newState.lives === 0) {
              newState = triggerGameOver(newState, now);
            }
            break;
        }
      });

      // 2. PROCESS CUSTOMERS (Movement & AI from customerSystem)
      const customerUpdate = updateCustomerPositions(newState.customers, newState.activePowerUps, now, newState.ovens);
      newState.customers = customerUpdate.nextCustomers;

      if (customerUpdate.statsUpdate.customerStreakReset) {
        newState.stats.currentCustomerStreak = 0;
      }

      customerUpdate.events.forEach(event => {
        if (event.type === 'LIFE_LOST') {
          soundManager.customerDisappointed();
          soundManager.lifeLost();
        }
        if (event.type === 'STAR_LOST_CRITIC') {
          newState.lives = Math.max(0, newState.lives - 2);
          newState.lastStarLostReason = 'disappointed_critic';
          // Critic loses 2 stars - show one indicator with 2 stars
          newState = addFloatingStar(false, event.lane, event.position, newState, 2);
        }
        if (event.type === 'STAR_LOST_NORMAL') {
          newState.lives = Math.max(0, newState.lives - 1);
          newState.lastStarLostReason = 'disappointed_customer';
          newState = addFloatingStar(false, event.lane, event.position, newState);
        }
        if (event.type === 'STAR_LOST_WOOZY_NORMAL') {
          newState.lives = Math.max(0, newState.lives - 1);
          newState.lastStarLostReason = 'woozy_customer_reached';
          newState = addFloatingStar(false, event.lane, event.position, newState);
        }
        if (event.type === 'STAR_LOST_STEVE') {
          newState.lives = Math.max(0, newState.lives - 1);
          newState.lastStarLostReason = 'steve_disappointed';
          newState = addFloatingStar(false, event.lane, event.position, newState);
        }
        if (event.type === 'GAME_OVER' && newState.lives === 0) {
          newState = triggerGameOver(newState, now);
        }
        if (event.type === 'HEALTH_INSPECTOR_PASSED') {
          // Inspector found clean kitchen - show text on the inspector (already set as leaving)
          newState.customers = newState.customers.map(c =>
            c.healthInspector && c.leaving && c.lane === event.lane
              ? { ...c, textMessage: "Seems okay.", textMessageTime: now }
              : c
          );
        }
        if (event.type === 'HEALTH_INSPECTOR_FAILED') {
          // Inspector found burnt oven - lose a star
          soundManager.lifeLost();
          newState.lives = Math.max(0, newState.lives - 1);
          newState.lastStarLostReason = 'health_inspector_failed';
          newState = addFloatingStar(false, event.lane, event.position, newState);
          newState.customers = newState.customers.map(c =>
            c.healthInspector && c.leaving && c.lane === event.lane
              ? { ...c, textMessage: "Smells like smoke!", textMessageTime: now }
              : c
          );
          if (newState.lives === 0) {
            newState = triggerGameOver(newState, now);
          }
        }
      });

      // 3. COLLISION LOOP (Slices vs Customers) — lane-bucketed for perf
      newState.pizzaSlices = newState.pizzaSlices.map(slice => ({ ...slice, position: slice.position + slice.speed }));

      const remainingSlices: PizzaSlice[] = [];
      const destroyedPowerUpIds = new Set<string>();
      const platesFromSlices = new Set<string>();
      const customerScores: Array<{ points: number; lane: number; position: number }> = [];
      const starGainsToAdd: Array<{ lane: number; position: number }> = [];
      let sliceWentOffScreen = false;

      // Build a customer lookup Map for O(1) updates that preserve sequential ordering.
      // When slice N serves a customer, slice N+1 sees the updated customer state.
      const customerMap = new Map<string, typeof newState.customers[0]>();
      for (const c of newState.customers) customerMap.set(c.id, c);

      // Track which customer IDs have been "consumed" (served/hit) so later slices skip them
      const consumedCustomerIds = new Set<string>();

      // Build power-up lane buckets (read-only during slice loop)
      const powerUpBuckets = buildLaneBuckets(newState.powerUps);

      newState.pizzaSlices.forEach(slice => {
        let consumed = false;

        // Only check customers in the same lane as this slice
        // We iterate the full customer list to preserve ordering, but skip non-matching lanes early
        for (const customer of newState.customers) {
          if (consumed) break;
          // Fast lane check — skip customers not in this slice's lane
          if (customer.lane !== slice.lane) continue;

          // Get the latest version of this customer (may have been updated by a prior slice)
          const currentCustomer = customerMap.get(customer.id)!;
          if (isCustomerLeaving(currentCustomer)) continue;

          const isHit = checkSliceCustomerCollision(slice, currentCustomer);

          if (isHit) {
            consumed = true;

            const hitResult = processCustomerHit(currentCustomer, now, hasDoge);

            if (hitResult.newEntities.droppedPlate) newState.droppedPlates = [...newState.droppedPlates, hitResult.newEntities.droppedPlate];
            if (hitResult.newEntities.emptyPlate) newState.emptyPlates = [...newState.emptyPlates, hitResult.newEntities.emptyPlate];

            hitResult.events.forEach(event => {
              if (event === 'HEALTH_INSPECTOR_BRIBED') {
                // Lose a star for trying to bribe the inspector
                soundManager.lifeLost();
                newState.lives = Math.max(0, newState.lives - 1);
                newState.lastStarLostReason = 'health_inspector_bribed';
                newState = addFloatingStar(false, currentCustomer.lane, currentCustomer.position, newState);
                if (newState.lives === 0) {
                  newState = triggerGameOver(newState, now);
                }
              } else if (event === 'BRIAN_DROPPED_PLATE') {
                soundManager.plateDropped();
                newState.stats.currentCustomerStreak = 0;
                newState.stats.currentPlateStreak = 0;
                // Reset clean kitchen timer
                newState.cleanKitchenStartTime = now;
                // Brian still pays $1 even when he drops the slice
                newState.bank += SCORING.BASE_BANK_REWARD;
              } else if (event === 'UNFROZEN_AND_SERVED') {
                soundManager.customerUnfreeze();

                const result = applyCustomerScoring(currentCustomer, newState, dogeMultiplier,
                  getStreakMultiplier(newState.stats.currentCustomerStreak),
                  { includeBank: true, countsAsServed: true, isFirstSlice: false, checkLifeGain: true });

                newState.score += result.scoreToAdd;
                newState.bank += result.bankToAdd;
                newState.happyCustomers = result.newHappyCustomers;
                newState.stats = result.newStats;
                customerScores.push(result.floatingScore);

                if (result.livesToAdd > 0) {
                  newState.lives += result.livesToAdd;
                  if (result.shouldPlayLifeSound) soundManager.lifeGained();
                  if (result.starGain) starGainsToAdd.push(result.starGain);
                }

              } else if (event === 'WOOZY_STEP_1') {
                soundManager.woozyServed();

                const result = applyCustomerScoring(currentCustomer, newState, dogeMultiplier,
                  getStreakMultiplier(newState.stats.currentCustomerStreak),
                  { includeBank: true, countsAsServed: false, isFirstSlice: true, checkLifeGain: false });

                newState.score += result.scoreToAdd;
                newState.bank += result.bankToAdd;
                customerScores.push(result.floatingScore);

              } else if (event === 'STEVE_FIRST_SLICE') {
                // Steve got his first slice but wants more - NO PAYMENT
                soundManager.woozyServed();

                const result = applyCustomerScoring(currentCustomer, newState, dogeMultiplier,
                  getStreakMultiplier(newState.stats.currentCustomerStreak),
                  { includeBank: false, countsAsServed: false, isFirstSlice: true, checkLifeGain: false });

                newState.score += result.scoreToAdd;
                customerScores.push(result.floatingScore);

              } else if (event === 'STEVE_SERVED') {
                // Steve is satisfied - NO PAYMENT but counts as served
                soundManager.customerServed();

                const result = applyCustomerScoring(currentCustomer, newState, dogeMultiplier,
                  getStreakMultiplier(newState.stats.currentCustomerStreak),
                  { includeBank: false, countsAsServed: true, isFirstSlice: false, checkLifeGain: true });

                newState.score += result.scoreToAdd;
                newState.happyCustomers = result.newHappyCustomers;
                newState.stats = result.newStats;
                customerScores.push(result.floatingScore);

                if (result.livesToAdd > 0) {
                  newState.lives += result.livesToAdd;
                  if (result.shouldPlayLifeSound) soundManager.lifeGained();
                  if (result.starGain) starGainsToAdd.push(result.starGain);
                }

              } else if (event === 'WOOZY_STEP_2' || event === 'SERVED_NORMAL' || event === 'SERVED_CRITIC' || event === 'SERVED_BRIAN_DOGE') {
                soundManager.customerServed();

                const result = applyCustomerScoring(currentCustomer, newState, dogeMultiplier,
                  getStreakMultiplier(newState.stats.currentCustomerStreak),
                  { includeBank: true, countsAsServed: true, isFirstSlice: false, checkLifeGain: true });

                newState.score += result.scoreToAdd;
                newState.bank += result.bankToAdd;
                newState.happyCustomers = result.newHappyCustomers;
                newState.stats = result.newStats;
                customerScores.push(result.floatingScore);

                if (result.livesToAdd > 0) {
                  newState.lives += result.livesToAdd;
                  if (result.shouldPlayLifeSound) soundManager.lifeGained();
                  if (result.starGain) starGainsToAdd.push(result.starGain);
                }
              }
            });

            platesFromSlices.add(slice.id);
            // Update the customer map so subsequent slices see this customer as served/updated
            customerMap.set(currentCustomer.id, hitResult.updatedCustomer);
            // Health inspector is NOT consumed (stays on screen) — only the pizza disappears
            if (!currentCustomer.healthInspector) {
              consumedCustomerIds.add(currentCustomer.id);
            }
          }
        }

        if (!consumed && slice.position < POSITIONS.OFF_SCREEN_RIGHT) {
          remainingSlices.push(slice);
          // Only check power-ups in the same lane as this slice
          const lanePowerUps = getEntitiesInLane(powerUpBuckets, slice.lane);
          lanePowerUps.forEach(powerUp => {
            if (checkSlicePowerUpCollision(slice, powerUp)) {
              soundManager.pizzaDestroyed();
              destroyedPowerUpIds.add(powerUp.id);
            }
          });
        } else if (!consumed && slice.position >= POSITIONS.OFF_SCREEN_RIGHT) {
          sliceWentOffScreen = true;
        }
      });

      // Reconstruct the customers array from the map (preserving original order)
      newState.customers = newState.customers.map(c => customerMap.get(c.id) || c);

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

      if (sliceWentOffScreen) {
        newState.stats.currentPlateStreak = 0;
        newState.cleanKitchenStartTime = now;
      }
      customerScores.forEach(({ points, lane, position }) => { newState = addFloatingScore(points, lane, position, newState); });
      starGainsToAdd.forEach(({ lane, position }) => { newState = addFloatingStar(true, lane, position, newState); });

      // --- 4. CLEANUP EXPIRATIONS ---
      newState.floatingScores = newState.floatingScores.filter(fs => now - fs.startTime < TIMINGS.FLOATING_SCORE_LIFETIME);
      newState.floatingStars = newState.floatingStars.filter(fs => now - fs.startTime < TIMINGS.FLOATING_SCORE_LIFETIME);
      newState.droppedPlates = newState.droppedPlates.filter(dp => now - dp.startTime < TIMINGS.DROPPED_PLATE_LIFETIME);
      newState.customers = newState.customers.map(customer => {
        if (customer.textMessage && customer.textMessageTime && now - customer.textMessageTime >= TIMINGS.TEXT_MESSAGE_LIFETIME) {
          return { ...customer, textMessage: undefined, textMessageTime: undefined };
        }
        return customer;
      });

      // --- 4. POWER-UP EXPIRATIONS ---
      const expResult = processPowerUpExpirations(newState.activePowerUps, now);
      newState.activePowerUps = expResult.activePowerUps;
      newState.starPowerActive = expResult.starPowerActive;

      // Handle specific expiration effects
      if (expResult.expiredTypes.includes('honey')) {
        newState.customers = newState.customers.map(c => ({ ...c, hotHoneyAffected: false }));
      }

      if (newState.powerUpAlert && now >= newState.powerUpAlert.endTime) {
        if (newState.powerUpAlert.type !== 'doge' || !hasDoge) newState.powerUpAlert = undefined;
      }

      // --- 4b. PEPE HELPERS PROCESSING ---
      if (newState.pepeHelpers?.active) {
        // Check expiration first
        if (checkPepeHelpersExpired(newState.pepeHelpers, now)) {
          newState.pepeHelpers = undefined;
        } else {
          // Process helper actions
          const pepeResult = processPepeHelperTick(newState, now);

          // Apply state updates
          if (pepeResult.updatedState.ovens) newState.ovens = pepeResult.updatedState.ovens;
          if (pepeResult.updatedState.pizzaSlices) newState.pizzaSlices = pepeResult.updatedState.pizzaSlices;
          if (pepeResult.updatedState.emptyPlates) newState.emptyPlates = pepeResult.updatedState.emptyPlates;
          if (pepeResult.updatedState.pepeHelpers) newState.pepeHelpers = pepeResult.updatedState.pepeHelpers;
          if (pepeResult.updatedState.stats) newState.stats = pepeResult.updatedState.stats;
          if (pepeResult.updatedState.score !== undefined) newState.score = pepeResult.updatedState.score;

          // Handle events (sounds)
          pepeResult.events.forEach(event => {
            if (event.type === 'OVEN_STARTED') soundManager.ovenStart();
            if (event.type === 'PIZZA_PULLED') soundManager.servePizza();
            if (event.type === 'CUSTOMER_SERVED') soundManager.servePizza();
            if (event.type === 'PLATE_CAUGHT') soundManager.plateCaught();
          });

          // Add floating scores for plates caught by helpers
          pepeResult.events.forEach(event => {
            if (event.type === 'PLATE_CAUGHT') {
              newState = addFloatingScore(50, event.lane, GAME_CONFIG.CHEF_X_POSITION, newState);
            }
          });
        }
      }

      // --- 4c. HIRED WORKER PROCESSING ---
      if (newState.hiredWorker?.active) {
        const workerResult = processWorkerTick(newState, now);

        if (workerResult.updatedState.ovens) newState.ovens = workerResult.updatedState.ovens;
        if (workerResult.updatedState.pizzaSlices) newState.pizzaSlices = workerResult.updatedState.pizzaSlices;
        if (workerResult.updatedState.emptyPlates) newState.emptyPlates = workerResult.updatedState.emptyPlates;
        if (workerResult.updatedState.hiredWorker !== undefined) newState.hiredWorker = workerResult.updatedState.hiredWorker;
        if (workerResult.updatedState.stats) newState.stats = workerResult.updatedState.stats;
        if (workerResult.updatedState.score !== undefined) newState.score = workerResult.updatedState.score;

        // Handle events (sounds)
        workerResult.events.forEach(event => {
          if (event.type === 'OVEN_STARTED') soundManager.ovenStart();
          if (event.type === 'PIZZA_PULLED') soundManager.servePizza();
          if (event.type === 'CUSTOMER_SERVED') soundManager.servePizza();
          if (event.type === 'PLATE_CAUGHT') soundManager.plateCaught();
        });

        // Add floating scores for plates caught by worker
        workerResult.events.forEach(event => {
          if (event.type === 'PLATE_CAUGHT') {
            newState = addFloatingScore(50, event.lane, GAME_CONFIG.CHEF_X_POSITION, newState);
          }
        });
      }

      // --- 5. STAR POWER AUTO-REFILL SLICES ---
      if (hasStar) {
        // Keep chef's pizza slices maxed out
        newState.availableSlices = GAME_CONFIG.MAX_SLICES;
      }

      // --- 6. CHEF POWERUP COLLISIONS ---
      const powerUpResult = processChefPowerUpCollisions(
        newState,
        newState.chefLane,
        GAME_CONFIG.CHEF_X_POSITION,
        dogeMultiplier,
        now
      );
      newState = powerUpResult.newState;

      // Play sounds for caught power-ups
      powerUpResult.caughtPowerUpIds.forEach(id => {
        const powerUp = newState.powerUps.find(p => p.id === id);
        if (powerUp) soundManager.powerUpCollected(powerUp.type);
      });

      // Handle life loss sounds
      if (powerUpResult.livesLost > 0) {
        soundManager.lifeLost();
        if (powerUpResult.shouldTriggerGameOver) {
          newState = triggerGameOver(newState, now);
        }
      }

      // Handle Nyan sweep sound
      if (powerUpResult.nyanSweepStarted) {
        soundManager.nyanCatPowerUp();
      }

      // Update power-ups: remove caught, move remaining, remove off-screen
      newState.powerUps = newState.powerUps
        .filter(powerUp => !powerUpResult.caughtPowerUpIds.has(powerUp.id))
        .map(powerUp => ({ ...powerUp, position: powerUp.position - powerUp.speed }))
        .filter(powerUp => powerUp.position > 0);

      // Add floating scores
      powerUpResult.scores.forEach(({ points, lane, position }) => {
        newState = addFloatingScore(points, lane, position, newState);
      });

      // --- 7. PLATE CATCHING LOGIC ---
      const plateResult = processPlates(
        newState.emptyPlates,
        newState.chefLane,
        newState.stats,
        dogeMultiplier,
        getStreakMultiplier(newState.stats.currentPlateStreak),
        newState.nyanSweep?.active ?? false,
        now
      );

      newState.emptyPlates = plateResult.remainingPlates;
      newState.stats = plateResult.updatedStats;
      newState.score += plateResult.totalScore;

      plateResult.events.forEach(event => {
        if (event === 'CAUGHT') soundManager.plateCaught();
        else if (event === 'DROPPED') {
          soundManager.plateDropped();
          newState.cleanKitchenStartTime = now;
        }
      });

      plateResult.scores.forEach(({ points, lane, position }) => {
        newState = addFloatingScore(points, lane, position, newState);
      });

      // --- 8. NYAN CAT SWEEP LOGIC ---
      if (newState.nyanSweep?.active) {
        // 1. Move Sweep
        const sweepResult = processNyanSweepMovement(newState.nyanSweep, newState.chefLane, now);

        const newLane = sweepResult.nextChefLane;

        // 2. Check Collisions (with lane-bucketed lookups)
        const nyanScores: Array<{ points: number; lane: number; position: number }> = [];

        // Build lane buckets for nyan sweep collision checks
        const nyanCustomerBuckets = buildLaneBuckets(newState.customers);
        const nyanMinionBuckets = newState.bossBattle?.active && !newState.bossBattle.bossDefeated
          ? buildLaneBuckets(newState.bossBattle.minions)
          : undefined;

        const collisionResult = checkNyanSweepCollisions(
          newState.nyanSweep,
          sweepResult.newXPosition,
          newLane,
          newState.customers,
          newState.bossBattle?.active && !newState.bossBattle.bossDefeated ? newState.bossBattle.minions : undefined,
          nyanCustomerBuckets,
          nyanMinionBuckets
        );

        // 3. Process Customer Hits
        const hitCustomerSet = new Set(collisionResult.hitCustomerIds);

        if (hitCustomerSet.size > 0) {
          newState.customers = newState.customers.map(customer => {
            if (hitCustomerSet.has(customer.id)) {
              if (getCustomerVariant(customer) === 'badLuckBrian') {
                soundManager.customerServed();
                return { ...customer, brianNyaned: true, leaving: true, hasPlate: false, flipped: false, movingRight: true, woozy: false, frozen: false, unfrozenThisPeriod: undefined };
              }

              soundManager.customerServed();

              const result = applyCustomerScoring(customer, newState, dogeMultiplier,
                getStreakMultiplier(newState.stats.currentCustomerStreak),
                { includeBank: true, countsAsServed: true, isFirstSlice: false, checkLifeGain: true });

              newState.score += result.scoreToAdd;
              newState.bank += result.bankToAdd;
              newState.happyCustomers = result.newHappyCustomers;
              newState.stats = result.newStats;
              nyanScores.push(result.floatingScore);

              if (result.livesToAdd > 0) {
                newState.lives += result.livesToAdd;
                if (result.shouldPlayLifeSound) soundManager.lifeGained();
                newState = addFloatingStar(true, customer.lane, customer.position, newState);
              }

              return { ...customer, served: true, hasPlate: false, woozy: false, frozen: false, unfrozenThisPeriod: undefined };
            }
            return customer;
          });
        }

        // 4. Process Minion Hits
        const hitMinionSet = new Set(collisionResult.hitMinionIds);
        if (hitMinionSet.size > 0 && newState.bossBattle) {
          newState.bossBattle.minions = newState.bossBattle.minions.map(minion => {
            if (hitMinionSet.has(minion.id)) {
              soundManager.customerServed();
              const pointsEarned = calculateMinionScore(); // Assumes this is available in scope
              newState.score += pointsEarned;
              // addFloatingScore helper handles the state update for score list, but we can't call it easily inside map.
              // We'll add to nyanScores list and process it after.
              nyanScores.push({ points: pointsEarned, lane: minion.lane, position: minion.position });
              return { ...minion, defeated: true };
            }
            return minion;
          });
        }

        // Add floaters
        nyanScores.forEach(({ points, lane, position }) => { newState = addFloatingScore(points, lane, position, newState); });

        // 5. Update State
        newState.chefLane = newLane;

        if (sweepResult.sweepComplete) {
          // Snap lane done in helper but helper returned finalLane as nextChefLane
          newState.nyanSweep = undefined;
          if (newState.pendingStoreShow) {
            newState.showStore = true;
            newState.pendingStoreShow = false;
          }
        } else if (sweepResult.nextSweep) {
          newState.nyanSweep = sweepResult.nextSweep;
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

        // Check if boss battle should trigger
        const bossTrigger = checkBossTrigger(
          oldLevel,
          targetLevel,
          newState.defeatedBossLevels,
        );
        if (bossTrigger !== null) {
          if (newState.bossBattle?.active) {
            // Queue the boss for after the current battle ends
            newState.pendingBossTrigger = bossTrigger;
          } else {
            newState.bossBattle = initializeBossBattle(now, bossTrigger.type);
          }
        }
      }

      // --- BOSS BATTLE PROCESSING ---
      if (newState.bossBattle?.active && !newState.bossBattle.bossDefeated) {
        const bossResult = processBossTick(
          newState.bossBattle,
          newState.pizzaSlices,
          newState.level,
          newState.defeatedBossLevels,
          now
        );

        newState.bossBattle = bossResult.nextBossBattle;
        newState.pizzaSlices = newState.pizzaSlices.filter(s => !bossResult.consumedSliceIds.has(s.id));
        newState.score += bossResult.scoreGained;

        // Handle lives lost
        if (bossResult.livesLost > 0) {
          for (let i = 0; i < bossResult.livesLost; i++) {
            soundManager.lifeLost();
            newState = addFloatingStar(false, i % 4, GAME_CONFIG.CHEF_X_POSITION, newState);
          }
          newState.lives = Math.max(0, newState.lives - bossResult.livesLost);
          // Set boss-specific loss reason
          newState.lastStarLostReason = newState.bossBattle?.bossType === 'papaJohn'
            ? 'papajohn_minion_reached'
            : 'dominos_minion_reached';
          if (newState.lives === 0) {
            newState = triggerGameOver(newState, now);
          }
        }

        // Handle defeated boss level
        if (bossResult.defeatedBossLevel !== undefined) {
          newState.defeatedBossLevels = [...newState.defeatedBossLevels, bossResult.defeatedBossLevel];

          // Spawn queued boss if one was pending
          if (newState.pendingBossTrigger) {
            newState.bossBattle = initializeBossBattle(now, newState.pendingBossTrigger.type);
            newState.pendingBossTrigger = undefined;
          }
        }

        // Play sounds and add floating scores for events
        bossResult.events.forEach(event => {
          if (event.type === 'MINION_DEFEATED' || event.type === 'BOSS_HIT' || event.type === 'BOSS_DEFEATED') {
            soundManager.customerServed();
            newState = addFloatingScore(event.points, event.lane, event.position, newState);
          }
        });
      }

      // --- CLEAN KITCHEN BONUS CHECK ---
      if (newState.cleanKitchenStartTime !== undefined) {
        const cleanDuration = now - newState.cleanKitchenStartTime;
        const timeSinceLastBonus = newState.lastCleanKitchenBonusTime
          ? now - newState.lastCleanKitchenBonusTime
          : Infinity;

        // Award bonus if 30 seconds of clean kitchen and at least 30 seconds since last bonus
        if (cleanDuration >= SCORING.CLEAN_KITCHEN_TIME && timeSinceLastBonus >= SCORING.CLEAN_KITCHEN_TIME) {
          const bonusPoints = SCORING.CLEAN_KITCHEN_BONUS * dogeMultiplier;
          newState.score += bonusPoints;
          newState = addFloatingScore(bonusPoints, newState.chefLane, GAME_CONFIG.CHEF_X_POSITION, newState);
          newState.cleanKitchenStartTime = now; // Reset timer for next bonus
          newState.lastCleanKitchenBonusTime = now;
          newState.cleanKitchenBonusAlert = { endTime: now + 3000 }; // Show for 3 seconds
          soundManager.lifeGained(); // Use a celebratory sound
        }
      }

      // Clear expired clean kitchen bonus alert
      if (newState.cleanKitchenBonusAlert && now >= newState.cleanKitchenBonusAlert.endTime) {
        newState.cleanKitchenBonusAlert = undefined;
      }

      return newState;
    });
  }, [addFloatingScore, addFloatingStar, triggerGameOver]); // ✅ removed gameState.* and ovenSoundStates deps

  // --- Store / Upgrades / Debug (now via storeSystem.ts) ---

  const upgradeOven = useCallback((lane: number) => {
    setGameState(prev => upgradeOvenStore(prev, lane));
  }, []);

  const upgradeOvenSpeed = useCallback((lane: number) => {
    setGameState(prev => upgradeOvenSpeedStore(prev, lane));
  }, []);

  const closeStore = useCallback(() => {
    setGameState(prev => closeStoreStore(prev));
  }, []);

  const bribeReviewer = useCallback(() => {
    setGameState(prev => {
      const result = bribeReviewerStore(prev);
      if (result.events.some(e => e.type === 'LIFE_GAINED')) {
        soundManager.lifeGained();
      }
      return result.nextState;
    });
  }, []);

  const buyPowerUp = useCallback((type: 'beer' | 'ice-cream' | 'honey') => {
    setGameState(prev => buyPowerUpStore(prev, type, Date.now()));
  }, []);

  const hireWorker = useCallback(() => {
    setGameState(prev => hireWorkerStore(prev, prev.chefLane));
  }, []);

  const debugActivatePowerUp = useCallback((type: PowerUpType) => {
    setGameState(prev => {
      if (prev.gameOver) return prev;
      const now = Date.now();

      // Create synthetic power-up for the collection system
      const syntheticPowerUp = {
        id: `debug-${now}`,
        lane: prev.chefLane,
        position: GAME_CONFIG.CHEF_X_POSITION,
        speed: 0,
        type
      };

      // Use the unified power-up collection system
      const result = processPowerUpCollection(prev, syntheticPowerUp, 1, now);
      let newState = result.newState;

      // Handle side effects
      if (result.livesLost > 0) {
        soundManager.lifeLost();
        if (result.shouldTriggerGameOver) {
          newState = triggerGameOver(newState, now);
        }
      }

      // Play Nyan sweep sound if started
      if (result.nyanSweepStarted) {
        soundManager.nyanCatPowerUp();
      }

      return newState;
    });
  }, [triggerGameOver]);

  const resetGame = useCallback(() => {
    soundManager.stopNyan();
    setGameState({ ...INITIAL_GAME_STATE });
    lastCustomerSpawnRef.current = 0;
    lastPowerUpSpawnRef.current = 0;
    // ✅ reset ref (no render)
    ovenSoundStatesRef.current = { ...DEFAULT_OVEN_SOUND_STATES };
  }, []);

  const togglePause = useCallback(() => {
    setGameState(prev => {
      const now = Date.now();
      const newPaused = !prev.paused;
      const updatedOvens = calculateOvenPauseState(prev.ovens, newPaused, now);

      // Pause/resume Nyan cat song
      if (newPaused) {
        soundManager.pauseNyan();
      } else {
        soundManager.resumeNyan();
      }

      // Handle clean kitchen timer pause/resume
      let cleanKitchenStartTime = prev.cleanKitchenStartTime;
      let lastPauseTime = prev.lastPauseTime;

      if (newPaused) {
        // Starting pause - record when we paused
        lastPauseTime = now;
      } else if (prev.lastPauseTime && cleanKitchenStartTime) {
        // Resuming - adjust clean kitchen start time to exclude pause duration
        const pauseDuration = now - prev.lastPauseTime;
        cleanKitchenStartTime = cleanKitchenStartTime + pauseDuration;
        lastPauseTime = undefined;
      }

      return { ...prev, paused: newPaused, ovens: updatedOvens, cleanKitchenStartTime, lastPauseTime };
    });
  }, []);

  // --- Effects ---

  useEffect(() => {
    const prevShowStore = prevShowStoreRef.current;
    const currentShowStore = gameState.showStore;
    const now = Date.now();

    if (!prevShowStore && currentShowStore) {
      // Store opening - pause game and process worker retention
      setGameState(prev => {
        const withRetention = processWorkerRetention(prev);
        return {
          ...withRetention,
          paused: true,
          ovens: calculateOvenPauseState(withRetention.ovens, true, now),
          lastPauseTime: now, // Track pause time for clean kitchen timer
        };
      });
    }
    if (prevShowStore && !currentShowStore) {
      // Store closing - unpause game
      setGameState(prev => {
        // Adjust clean kitchen start time to exclude pause duration
        let cleanKitchenStartTime = prev.cleanKitchenStartTime;
        if (prev.lastPauseTime && cleanKitchenStartTime) {
          const pauseDuration = now - prev.lastPauseTime;
          cleanKitchenStartTime = cleanKitchenStartTime + pauseDuration;
        }
        return {
          ...prev,
          paused: false,
          ovens: calculateOvenPauseState(prev.ovens, false, now),
          cleanKitchenStartTime,
          lastPauseTime: undefined,
        };
      });
    }
    prevShowStoreRef.current = currentShowStore;
  }, [gameState.showStore]);

  // --- 2. THE CONSOLIDATED TICK FUNCTION ---
  // Combines physics (updateGame) + spawning in a way that uses latest state.
  const tick = useCallback(() => {
    updateGame();

    // Spawn decision uses current state (functional) so it doesn't depend on closures.
    setGameState(current => {
      if (current.paused || current.gameOver) return current;

      const now = Date.now();

      // Use spawn system for customer and power-up spawning
      const spawnResult = processSpawning(
        lastCustomerSpawnRef.current,
        lastPowerUpSpawnRef.current,
        now,
        current.level,
        current.bossBattle?.active ?? false
      );

      let next = current;

      if (spawnResult.newCustomer) {
        lastCustomerSpawnRef.current = now;
        next = { ...next, customers: [...next.customers, spawnResult.newCustomer] };
      }

      if (spawnResult.newPowerUp) {
        lastPowerUpSpawnRef.current = now;
        next = { ...next, powerUps: [...next.powerUps, spawnResult.newPowerUp] };
      }

      return next;
    });
  }, [updateGame]);

  // --- 3. KEEP REF UPDATED ---
  useEffect(() => {
    latestTickRef.current = tick;
  }, [tick]);

  // --- 4. THE STABLE rAF LOOP (fixed-timestep accumulator) ---
  useEffect(() => {
    if (!gameStarted) return;

    let rafId: number;
    let lastTimestamp: number | null = null;
    let accumulator = 0;
    const TICK_MS = GAME_CONFIG.GAME_LOOP_INTERVAL;
    const MAX_FRAME_TIME = GAME_CONFIG.MAX_FRAME_TIME ?? 200;

    const loop = (timestamp: DOMHighResTimeStamp) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
        rafId = requestAnimationFrame(loop);
        return;
      }
      const deltaTime = Math.min(timestamp - lastTimestamp, MAX_FRAME_TIME);
      lastTimestamp = timestamp;
      accumulator += deltaTime;

      while (accumulator >= TICK_MS) {
        latestTickRef.current();
        accumulator -= TICK_MS;
      }
      rafId = requestAnimationFrame(loop);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        lastTimestamp = null;
        accumulator = 0;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameStarted]);

  return {
    gameState,
    servePizza,
    moveChef,
    useOven,
    cleanOven,
    resetGame,
    togglePause,
    upgradeOven,
    upgradeOvenSpeed,
    closeStore,
    bribeReviewer,
    buyPowerUp,
    hireWorker,
    debugActivatePowerUp,
  };
};