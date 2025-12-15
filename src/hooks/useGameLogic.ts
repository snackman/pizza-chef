import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Customer, PizzaSlice, EmptyPlate, PowerUp, PowerUpType } from '../types/game';
import { soundManager } from '../utils/sounds';

const CUSTOMER_SPAWN_RATE = 2.5;
const PIZZA_SPEED = 3;
const PLATE_SPEED = 2;
const POWERUP_SPEED = 0.5;
const BASE_COOKING_TIME = 3000; // 3 seconds base cooking time
const WARNING_TIME = 7000; // Pizza starts warning at 7 seconds
const BURN_TIME = 8000; // Pizza burns after 8 seconds (3s cooking + 3s ready + 1s warning + 1s burnt)
const CLEANING_TIME = 3000; // 3 seconds to clean a burned oven
const MAX_SLICES = 8; // Chef can only hold 8 slices at a time
const POWERUP_DURATION = 5000; // Power-ups last 5 seconds

export const useGameLogic = (gameStarted: boolean = true) => {
  const [gameState, setGameState] = useState<GameState>({
    customers: [],
    pizzaSlices: [],
    emptyPlates: [],
    powerUps: [],
    activePowerUps: [],
    chefLane: 0,
    score: 0,
    lives: 3,
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
      },
      ovenUpgradesMade: 0,
    },
  });

  const [lastCustomerSpawn, setLastCustomerSpawn] = useState(0);
  const [lastPowerUpSpawn, setLastPowerUpSpawn] = useState(0);
  const [ovenSoundStates, setOvenSoundStates] = useState<{[key: number]: 'idle' | 'cooking' | 'ready' | 'warning' | 'burning'}>({
    0: 'idle',
    1: 'idle',
    2: 'idle',
    3: 'idle'
  });
  const prevShowStoreRef = useRef(false);

  const spawnPowerUp = useCallback(() => {
    const now = Date.now();
    if (now - lastPowerUpSpawn < 8000) return; // Spawn power-up every 8 seconds minimum

    const lane = Math.floor(Math.random() * 4);
    const powerUpTypes: PowerUpType[] = ['honey', 'ice-cream', 'beer', 'doge', 'nyan'];
    const rand = Math.random();
    const randomType = rand < 0.1 ? 'star' : powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

    const newPowerUp: PowerUp = {
      id: `powerup-${now}-${lane}`,
      lane,
      position: 90,
      speed: POWERUP_SPEED,
      type: randomType,
    };

    setGameState(prev => ({
      ...prev,
      powerUps: [...prev.powerUps, newPowerUp],
    }));

    setLastPowerUpSpawn(now);
  }, [lastPowerUpSpawn]);

  const spawnCustomer = useCallback(() => {
    const now = Date.now();
    if (now - lastCustomerSpawn < 200 - (gameState.level * 20)) return;

    // Don't spawn customers when ice cream power-up is active
    const hasIceCream = gameState.activePowerUps.some(p => p.type === 'ice-cream');
    if (hasIceCream) return;
    
    // Don't spawn customers when game state is paused
    //const gamePaused = gameState.paused;
    if (gameState.paused) return;

    // Customer spawn choice
    const lane = Math.floor(Math.random() * 4);
    const disappointedEmojis = ['😢', '😭', '😠', '🤬'];
    const newCustomer: Customer = {
      id: `customer-${now}-${lane}`,
      lane,
      position: 90,
      speed: 0.4,
      served: false,
      hasPlate: false,
      disappointed: false,
      disappointedEmoji: disappointedEmojis[Math.floor(Math.random() * disappointedEmojis.length)],
      movingRight: false,
    };

    setGameState(prev => ({
      ...prev,
      customers: [...prev.customers, newCustomer],
    }));

    setLastCustomerSpawn(now);
  }, [lastCustomerSpawn, gameState.level, gameState.activePowerUps]);

  const servePizza = useCallback(() => {
    if (gameState.gameOver || gameState.paused || gameState.availableSlices <= 0 || gameState.nyanSweep?.active) return;

    soundManager.servePizza();

    const newSlice: PizzaSlice = {
      id: `pizza-${Date.now()}-${gameState.chefLane}`,
      lane: gameState.chefLane,
      position: 15,
      speed: PIZZA_SPEED,
    };

    setGameState(prev => ({
      ...prev,
      pizzaSlices: [...prev.pizzaSlices, newSlice],
      availableSlices: prev.availableSlices - 1,
    }));
  }, [gameState.gameOver, gameState.paused, gameState.chefLane, gameState.availableSlices, gameState.nyanSweep?.active]);

  const moveChef = useCallback((direction: 'up' | 'down') => {
    if (gameState.gameOver || gameState.paused || gameState.nyanSweep?.active) return;

    setGameState(prev => {
      let newLane = prev.chefLane;
      if (direction === 'up' && newLane > 0) {
        newLane -= 1;
      } else if (direction === 'down' && newLane < 3) {
        newLane += 1;
      }
      return { ...prev, chefLane: newLane };
    });
  }, [gameState.gameOver, gameState.paused, gameState.nyanSweep?.active]);

  const useOven = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;

    setGameState(prev => {
      const currentOven = prev.ovens[prev.chefLane];
      const now = Date.now();

      if (currentOven.burned) {
        // Can't use a burned oven
        return prev;
      }

      if (!currentOven.cooking) {
        soundManager.ovenStart();
        setOvenSoundStates(prevStates => ({ ...prevStates, [prev.chefLane]: 'cooking' }));
        // Put pizza in oven
        // Upgraded ovens produce more slices (1 + upgrade level)
        const slicesProduced = 1 + (prev.ovenUpgrades[prev.chefLane] || 0);
        return {
          ...prev,
          ovens: {
            ...prev.ovens,
            [prev.chefLane]: { cooking: true, startTime: now, burned: false, cleaningStartTime: 0, sliceCount: slicesProduced }
          }
        };
      } else {
        // Calculate cook time based on speed upgrades
        const speedUpgrade = prev.ovenSpeedUpgrades[prev.chefLane] || 0;
        const cookTime = speedUpgrade === 0 ? BASE_COOKING_TIME :
                         speedUpgrade === 1 ? 2000 :
                         speedUpgrade === 2 ? 1000 : 500;

        if (now - currentOven.startTime >= cookTime && now - currentOven.startTime < BURN_TIME) {
        // Take pizza out of oven (cooked) - chef can hold up to 8 slices
        // Available for pickup between 3-10 seconds (before it burns)
        const slicesProduced = currentOven.sliceCount;
        const newTotal = prev.availableSlices + slicesProduced;

        if (newTotal <= MAX_SLICES) {
          soundManager.servePizza();
          setOvenSoundStates(prevStates => ({ ...prevStates, [prev.chefLane]: 'idle' }));
          return {
            ...prev,
            availableSlices: newTotal,
            ovens: {
              ...prev.ovens,
              [prev.chefLane]: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 }
            },
            stats: {
              ...prev.stats,
              slicesBaked: prev.stats.slicesBaked + slicesProduced,
            }
          };
        }
      }
      }

      return prev;
    });
  }, [gameState.gameOver, gameState.paused, gameState.chefLane]);

  const updateGame = useCallback(() => {
    setGameState(prev => {
      // If game is over, only update falling pizza animation
      if (prev.gameOver) {
        if (prev.fallingPizza) {
          const newY = prev.fallingPizza.y + 5;
          if (newY > 400) {
            return { ...prev, fallingPizza: undefined };
          }
          return { ...prev, fallingPizza: { ...prev.fallingPizza, y: newY } };
        }
        return prev;
      }

      if (prev.paused) return prev;

      let newState = { ...prev };

      // Check for burned pizzas and cleaning progress
      const now = Date.now();
      const updatedOvens = { ...newState.ovens };
      const newOvenSoundStates = { ...ovenSoundStates };

      Object.keys(updatedOvens).forEach(laneKey => {
        const lane = parseInt(laneKey);
        const oven = updatedOvens[lane];

        if (oven.cooking && !oven.burned) {
          // Use pausedElapsed if available (when paused), otherwise calculate from startTime
          const elapsed = oven.pausedElapsed !== undefined ? oven.pausedElapsed : now - oven.startTime;

          // Calculate cook time based on speed upgrades
          const speedUpgrade = newState.ovenSpeedUpgrades[lane] || 0;
          const cookTime = speedUpgrade === 0 ? BASE_COOKING_TIME :
                           speedUpgrade === 1 ? 2000 :
                           speedUpgrade === 2 ? 1000 : 500;

          // Determine current oven state
          let currentState: 'idle' | 'cooking' | 'ready' | 'warning' | 'burning' = 'cooking';
          if (elapsed >= BURN_TIME) {
            currentState = 'burning';
          } else if (elapsed >= WARNING_TIME) {
            currentState = 'warning';
          } else if (elapsed >= cookTime) {
            currentState = 'ready';
          }

          // Check for state transitions and play sounds
          const previousState = newOvenSoundStates[lane];
          if (currentState !== previousState) {
            if (currentState === 'ready' && previousState === 'cooking') {
              soundManager.ovenReady();
            } else if (currentState === 'warning' && previousState === 'ready') {
              soundManager.ovenWarning();
            } else if (currentState === 'burning' && previousState === 'warning') {
              soundManager.ovenBurning();
            }
            newOvenSoundStates[lane] = currentState;
          }

          // Check if pizza burned
          if (elapsed >= BURN_TIME) {
            // Pizza burned - lose a star and mark oven as burned
            soundManager.ovenBurned();
            soundManager.lifeLost();
            newState.lives = Math.max(0, newState.lives - 1);
            if (newState.lives === 0) {
              newState.gameOver = true;
              soundManager.gameOver();
              // Drop the pizza if holding one
              if (newState.availableSlices > 0) {
                newState.fallingPizza = { lane: newState.chefLane, y: 0 };
                newState.availableSlices = 0;
              }
            }
            updatedOvens[lane] = { cooking: false, startTime: 0, burned: true, cleaningStartTime: 0, sliceCount: 0 };
            newOvenSoundStates[lane] = 'idle';
          }
        } else if (!oven.cooking && newOvenSoundStates[lane] !== 'idle') {
          // Oven was taken out or cleaned, reset sound state
          newOvenSoundStates[lane] = 'idle';
        }

        // Check if cleaning is complete
        if (oven.burned && oven.cleaningStartTime > 0 && now - oven.cleaningStartTime >= CLEANING_TIME) {
          soundManager.cleaningComplete();
          updatedOvens[lane] = { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 };
        }
      });

      // Update oven sound states if they changed
      if (JSON.stringify(newOvenSoundStates) !== JSON.stringify(ovenSoundStates)) {
        setOvenSoundStates(newOvenSoundStates);
      }

      newState.ovens = updatedOvens;

      // Remove expired power-ups
      const expiredStarPower = newState.activePowerUps.some(p => p.type === 'star' && now >= p.endTime);
      newState.activePowerUps = newState.activePowerUps.filter(powerUp => now < powerUp.endTime);

      // If star power expired, disable it
      if (expiredStarPower) {
        newState.starPowerActive = false;
      }

      // Clear expired power-up alerts
      if (newState.powerUpAlert && now >= newState.powerUpAlert.endTime) {
        newState.powerUpAlert = undefined;
      }

      // Check active power-ups
      const hasHoney = newState.activePowerUps.some(p => p.type === 'honey');
      const hasIceCream = newState.activePowerUps.some(p => p.type === 'ice-cream');
      const hasStar = newState.activePowerUps.some(p => p.type === 'star');
      const hasDoge = newState.activePowerUps.some(p => p.type === 'doge');
      const hasNyan = newState.activePowerUps.some(p => p.type === 'nyan');

      // Update frozen state on all customers based on ice cream power-up
      // But only freeze customers that aren't already manually unfrozen
      newState.customers = newState.customers.map(customer => {
        // If ice cream is active and customer isn't explicitly unfrozen, freeze them
         // Don't freeze departing customers (served, disappointed, or vomit)
        const isDeparting = customer.served || customer.disappointed || customer.vomit;
        if (hasIceCream && customer.frozen !== false && !isDeparting) {
          return { ...customer, frozen: true };
        }
        // If ice cream is not active, unfreeze everyone
        if (!hasIceCream && customer.frozen) {
          return { ...customer, frozen: false };
        }
        return customer;
      });

      // Move customers (with speed modifier if hot honey is active, or frozen if ice cream)
      // Move customers that are not frozen (or ice cream is not active)
      newState.customers = newState.customers.map(customer => {
        // Mark customers as affected by hot honey (including woozy customers)
        const nowHotHoneyAffected = hasHoney && !customer.served && !customer.disappointed && !customer.vomit;

        // Skip frozen customers
        if (customer.frozen) {
          return { ...customer, hotHoneyAffected: false };
        }

        // Satisfied customers move back to the right
        if (customer.served && !customer.woozy) {
          const newPosition = customer.position + (customer.speed * 2);
          return { ...customer, position: newPosition, hotHoneyAffected: false };
        }

        // Woozy customers - move right until they hit pickup zone, then turn around
        if (customer.woozy) {
          if (customer.movingRight) {
            const newPosition = customer.position + (customer.speed * 2);
            // Turn around when reaching pickup zone (85-95%)
            if (newPosition >= 85) {
              return { ...customer, position: newPosition, movingRight: false, hotHoneyAffected: nowHotHoneyAffected };
            }
            return { ...customer, position: newPosition, hotHoneyAffected: nowHotHoneyAffected };
          } else {
            // Moving left towards chef
            const speedModifier = hasHoney ? 0.5 : 1;
            const newPosition = customer.position - (customer.speed * speedModifier);
            // Mark as disappointed when reaching chef position
            if (newPosition <= 15) {
              soundManager.customerDisappointed();
              soundManager.lifeLost();
              newState.stats.currentCustomerStreak = 0;
              newState.lives = Math.max(0, newState.lives - 1);
              if (newState.lives === 0) {
                newState.gameOver = true;
                soundManager.gameOver();
                // Drop the pizza if holding one
                if (newState.availableSlices > 0) {
                  newState.fallingPizza = { lane: newState.chefLane, y: 0 };
                  newState.availableSlices = 0;
                }
              }
              return { ...customer, position: newPosition, disappointed: true, movingRight: true, woozy: false, hotHoneyAffected: false };
            }
            return { ...customer, position: newPosition, hotHoneyAffected: nowHotHoneyAffected };
          }
        }

        // Vomit/disappointed customers move back to the right
        if (customer.disappointed || customer.vomit) {
          const newPosition = customer.position + (customer.speed * 2);
          return { ...customer, position: newPosition, hotHoneyAffected: false };
        }

        const speedModifier = hasHoney ? 0.5 : 1;
        const newPosition = customer.position - (customer.speed * speedModifier);
        // Mark as disappointed when reaching chef position (around 10-15%) and lose a life
        if (newPosition <= 15) {
          soundManager.customerDisappointed();
          soundManager.lifeLost();
          newState.stats.currentCustomerStreak = 0;
          newState.lives = Math.max(0, newState.lives - 1);
          if (newState.lives === 0) {
            newState.gameOver = true;
            soundManager.gameOver();
            // Drop the pizza if holding one
            if (newState.availableSlices > 0) {
              newState.fallingPizza = { lane: newState.chefLane, y: 0 };
              newState.availableSlices = 0;
            }
          }
          return { ...customer, position: newPosition, disappointed: true, movingRight: true, hotHoneyAffected: false };
        }
        return { ...customer, position: newPosition, hotHoneyAffected: nowHotHoneyAffected };
      }).filter(customer => {
        // Remove customers when they exit right
        if (customer.position > 95) {
          return false;
        }
        return customer.position > -10;
      });

      // Star power: auto-feed customers on contact with chef
      if (hasStar && newState.availableSlices > 0) {
        newState.customers = newState.customers.map(customer => {
          // Check if customer is in same lane and close to chef
          if (customer.lane === newState.chefLane && !customer.served && !customer.disappointed && !customer.vomit && Math.abs(customer.position - 15) < 8) {
            soundManager.customerServed();
            const baseScore = 150;
            const baseBank = 1;
            const scoreMultiplier = hasDoge ? 2 : 1;
            const bankMultiplier = hasDoge ? 2 : 1;
            newState.score += baseScore * scoreMultiplier;
            newState.bank += baseBank * bankMultiplier;
            newState.happyCustomers += 1;
            newState.stats.customersServed += 1;
            newState.stats.currentCustomerStreak += 1;
            if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) {
              newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
            }
            newState.availableSlices = Math.max(0, newState.availableSlices - 1);

            // Check if we should award a star (every 8 happy customers, max 5 stars)
            if (newState.happyCustomers % 8 === 0 && newState.lives < 5) {
              const starsToAdd = hasDoge ? 2 : 1;
              const actualStarsToAdd = Math.min(starsToAdd, 5 - newState.lives);
              newState.lives += actualStarsToAdd;
              if (actualStarsToAdd > 0) {
                soundManager.lifeGained();
              }
            }

            // Create empty plate
            const newPlate: EmptyPlate = {
              id: `plate-star-${Date.now()}-${customer.id}`,
              lane: customer.lane,
              position: customer.position,
              speed: PLATE_SPEED,
            };
            newState.emptyPlates = [...newState.emptyPlates, newPlate];

            return { ...customer, served: true, hasPlate: false };
          }
          return customer;
        });
      }

      // Check chef-powerup collisions first (chef grabs power-up at position 15 or less)
      const caughtPowerUpIds = new Set<string>();
      newState.powerUps.forEach(powerUp => {
        if (powerUp.position <= 15 && powerUp.lane === newState.chefLane) {
          // Chef grabbed the power-up - activate it
          soundManager.powerUpCollected(powerUp.type);
          const baseScore = 100;
          const scoreMultiplier = hasDoge ? 2 : 1;
          newState.score += baseScore * scoreMultiplier;
          caughtPowerUpIds.add(powerUp.id);

          // Activate the power-up
          newState.stats.powerUpsUsed[powerUp.type] += 1;

          if (powerUp.type === 'beer') {
            // Make all current unsatisfied customers woozy, existing woozy customers become vomit faces
            let livesLost = 0;
            newState.customers = newState.customers.map(customer => {
              if (customer.woozy) {
                // Existing woozy customers become vomit/dissatisfied
                livesLost++;
                return {
                  ...customer,
                  woozy: false,
                  vomit: true,
                  disappointed: true,
                  movingRight: true,
                };
              }
              if (!customer.served && !customer.vomit && !customer.disappointed) {
                return {
                  ...customer,
                  woozy: true,
                  woozyState: 'normal',
                  movingRight: true,
                };
              }
              return customer;
            });
            newState.lives = Math.max(0, newState.lives - livesLost);
            if (livesLost > 0) {
              soundManager.lifeLost();
            }
            if (newState.lives === 0) {
              newState.gameOver = true;
              soundManager.gameOver();
              // Drop the pizza if holding one
              if (newState.availableSlices > 0) {
                newState.fallingPizza = { lane: newState.chefLane, y: 0 };
                newState.availableSlices = 0;
              }
            }
          } else if (powerUp.type === 'star') {
            // Star power-up gives 8-slice pizza and auto-feeds customers on contact
            newState.availableSlices = 8;
            newState.starPowerActive = true;
            newState.activePowerUps = [
              ...newState.activePowerUps.filter(p => p.type !== 'star'),
              { type: 'star', endTime: now + POWERUP_DURATION }
            ];
          } else if (powerUp.type === 'doge') {
            // Doge power-up doubles dollars, scores, and stars received during duration
            newState.activePowerUps = [
              ...newState.activePowerUps.filter(p => p.type !== 'doge'),
              { type: 'doge', endTime: now + POWERUP_DURATION }
            ];
            // Show Doge alert for 2 seconds
            newState.powerUpAlert = { type: 'doge', endTime: now + 2000, chefLane: newState.chefLane };
          } else if (powerUp.type === 'nyan') {
            if (!newState.nyanSweep?.active) {
              newState.nyanSweep = {
                active: true,
                xPosition: 15,
                laneDirection: 1,
                startTime: now,
                lastUpdateTime: now,
                startingLane: newState.chefLane
              };
              newState.powerUpAlert = { type: 'nyan', endTime: now + 3000, chefLane: newState.chefLane };
            }
          } else {
            // Add to active power-ups (hot honey and ice-cream)
            newState.activePowerUps = [
              ...newState.activePowerUps.filter(p => p.type !== powerUp.type),
              { type: powerUp.type, endTime: now + POWERUP_DURATION }
            ];
          }
        }
      });

      // Move power-ups and remove caught ones
        newState.powerUps = newState.powerUps
          .filter(powerUp => !caughtPowerUpIds.has(powerUp.id))
          .map(powerUp => ({
            ...powerUp,
            position: powerUp.position - (powerUp.speed),
          }))
          .filter(powerUp => powerUp.position > 10);

      // Move pizza slices
      newState.pizzaSlices = newState.pizzaSlices.map(slice => ({
        ...slice,
        position: slice.position + (slice.speed),
      }));

      // Check pizza-customer and pizza-powerup collisions
      const remainingSlices: PizzaSlice[] = [];
      const destroyedPowerUpIds = new Set<string>();
      const platesFromSlices = new Set<string>();
      let sliceWentOffScreen = false;

      newState.pizzaSlices.forEach(slice => {
        let consumed = false;

        // Check pizza-customer collisions first
        newState.customers = newState.customers.map(customer => {
          // Skip customers that are leaving (disappointed or vomit)
          if (customer.disappointed || customer.vomit) {
            return customer;
          }

          // Handle frozen customers - they unfreeze when hit by pizza (even past 0% line)
          if (!consumed && customer.frozen && customer.lane === slice.lane &&
              Math.abs(customer.position - slice.position) < 5) {
            consumed = true;
            soundManager.customerUnfreeze();
            return { ...customer, frozen: false };
          }

          // Skip customers that have crossed the 0% line (but allow unfreezing above)
          if (customer.position <= 0) {
            return customer;
          }

          // Handle woozy customers eating pizza (not frozen)
          if (!consumed && customer.woozy && !customer.frozen && customer.lane === slice.lane &&
              Math.abs(customer.position - slice.position) < 5) {
            consumed = true;
            const currentState = customer.woozyState || 'normal';

            // If hot honey is active and customer is affected by it, satisfy them with one slice
            if (hasHoney && customer.hotHoneyAffected) {
              soundManager.customerServed();
              const baseScore = 150;
              const baseBank = 1;
              const scoreMultiplier = hasDoge ? 2 : 1;
              const bankMultiplier = hasDoge ? 2 : 1;
              newState.score += baseScore * scoreMultiplier;
              newState.bank += baseBank * bankMultiplier;
              newState.happyCustomers += 1;
              newState.stats.customersServed += 1;
              newState.stats.currentCustomerStreak += 1;
              if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) {
                newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
              }

              // Check if we should award a star (every 8 happy customers, max 5 stars)
              if (newState.happyCustomers % 8 === 0 && newState.lives < 5) {
                const starsToAdd = hasDoge ? 2 : 1;
                const actualStarsToAdd = Math.min(starsToAdd, 5 - newState.lives);
                newState.lives += actualStarsToAdd;
                if (actualStarsToAdd > 0) {
                  soundManager.lifeGained();
                }
              }

              // Create empty plate
              const newPlate: EmptyPlate = {
                id: `plate-${Date.now()}-${customer.id}`,
                lane: customer.lane,
                position: customer.position,
                speed: PLATE_SPEED,
              };
              newState.emptyPlates = [...newState.emptyPlates, newPlate];
              platesFromSlices.add(slice.id);

              return { ...customer, woozy: false, woozyState: 'satisfied', served: true, hasPlate: false, hotHoneyAffected: false };
            }

            if (currentState === 'normal') {
              // First pizza - becomes drooling
              soundManager.woozyServed();
              const baseScore = 50;
              const baseBank = 1;
              const scoreMultiplier = hasDoge ? 2 : 1;
              const bankMultiplier = hasDoge ? 2 : 1;
              newState.score += baseScore * scoreMultiplier;
              newState.bank += baseBank * bankMultiplier;
              return { ...customer, woozyState: 'drooling' };
            } else if (currentState === 'drooling') {
              // Second pizza - becomes satisfied
              soundManager.customerServed();
              const baseScore = 150;
              const baseBank = 1;
              const scoreMultiplier = hasDoge ? 2 : 1;
              const bankMultiplier = hasDoge ? 2 : 1;
              newState.score += baseScore * scoreMultiplier;
              newState.bank += baseBank * bankMultiplier;
              newState.happyCustomers += 1;
              newState.stats.customersServed += 1;
              newState.stats.currentCustomerStreak += 1;
              if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) {
                newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
              }

              // Check if we should award a star (every 8 happy customers, max 5 stars)
              if (newState.happyCustomers % 8 === 0 && newState.lives < 5) {
                const starsToAdd = hasDoge ? 2 : 1;
                const actualStarsToAdd = Math.min(starsToAdd, 5 - newState.lives);
                newState.lives += actualStarsToAdd;
                if (actualStarsToAdd > 0) {
                  soundManager.lifeGained();
                }
              }

              // Create empty plate
              const newPlate: EmptyPlate = {
                id: `plate-${Date.now()}-${customer.id}`,
                lane: customer.lane,
                position: customer.position,
                speed: PLATE_SPEED,
              };
              newState.emptyPlates = [...newState.emptyPlates, newPlate];
              platesFromSlices.add(slice.id);

              return { ...customer, woozy: false, woozyState: 'satisfied', served: true, hasPlate: false };
            }
          }

          // Handle normal customers eating pizza (not frozen)
          if (!consumed && !customer.served && !customer.woozy && !customer.frozen && customer.lane === slice.lane &&
              Math.abs(customer.position - slice.position) < 5) {
            consumed = true;
            soundManager.customerServed();
            const baseScore = 150; // 100 base + 50 bonus for customer eating pizza
            const baseBank = 1;
            const scoreMultiplier = hasDoge ? 2 : 1;
            const bankMultiplier = hasDoge ? 2 : 1;
            newState.score += baseScore * scoreMultiplier;
            newState.bank += baseBank * bankMultiplier;
            newState.happyCustomers += 1;
            newState.stats.customersServed += 1;
            newState.stats.currentCustomerStreak += 1;
            if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) {
              newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
            }

            // Check if we should award a star (every 8 happy customers, max 5 stars)
            if (newState.happyCustomers % 8 === 0 && newState.lives < 5) {
              soundManager.lifeGained();
              newState.lives += 1;
            }

            // Create empty plate immediately when customer is served
            const newPlate: EmptyPlate = {
              id: `plate-${Date.now()}-${customer.id}`,
              lane: customer.lane,
              position: customer.position,
              speed: PLATE_SPEED,
            };
            newState.emptyPlates = [...newState.emptyPlates, newPlate];
            platesFromSlices.add(slice.id);

            return { ...customer, served: true, hasPlate: false };
          }
          return customer;
        });

        if (!consumed && slice.position < 95) {
          remainingSlices.push(slice);

          // Check pizza-powerup collisions only if pizza didn't hit a customer
          newState.powerUps.forEach(powerUp => {
            if (powerUp.lane === slice.lane &&
                Math.abs(powerUp.position - slice.position) < 5) {
              soundManager.pizzaDestroyed();
              destroyedPowerUpIds.add(powerUp.id);
            }
          });
        } else if (!consumed && slice.position >= 95) {
          // Slice went off-screen without hitting a customer (no plate created)
          sliceWentOffScreen = true;
        }
      });

      // Remove pizza slices that hit power-ups
      const finalSlices = remainingSlices.filter(slice => {
        // Don't destroy slices that created plates
        if (platesFromSlices.has(slice.id)) return true;

        const hitPowerUp = Array.from(destroyedPowerUpIds).some(powerUpId => {
          const powerUp = newState.powerUps.find(p => p.id === powerUpId);
          return powerUp && powerUp.lane === slice.lane &&
                 Math.abs(powerUp.position - slice.position) < 5;
        });
        if (hitPowerUp) {
          // Slice hit a power-up, no plate created
          sliceWentOffScreen = true;
        }
        return !hitPowerUp;
      });

      newState.pizzaSlices = finalSlices;
      newState.powerUps = newState.powerUps.filter(p => !destroyedPowerUpIds.has(p.id));

      // Reset plate streak if a slice went off-screen without hitting a customer
      if (sliceWentOffScreen) {
        newState.stats.currentPlateStreak = 0;
      }

      // Move empty plates
      newState.emptyPlates = newState.emptyPlates.map(plate => ({
        ...plate,
        position: plate.position - (plate.speed),
      })).filter(plate => {
        if (plate.position <= 10 && plate.lane === newState.chefLane) {
          // Chef caught the plate - it disappears immediately
          soundManager.plateCaught();
          newState.score += 50;
          newState.stats.platesCaught += 1;
          newState.stats.currentPlateStreak += 1;
          if (newState.stats.currentPlateStreak > newState.stats.largestPlateStreak) {
            newState.stats.largestPlateStreak = newState.stats.currentPlateStreak;
          }
          return false;
        } else if (plate.position <= 0) {
          // Plate reached position 0% without being caught - plate hits counter
          soundManager.plateDropped();
          newState.stats.currentPlateStreak = 0;
          return false;
        }
        return true;
      });

      // Handle Nyan Cat sweep animation
      if (newState.nyanSweep?.active) {
        const MAX_X = 90;
        const UPDATE_INTERVAL = 100;

        if (now - newState.nyanSweep.lastUpdateTime >= UPDATE_INTERVAL) {
          const INITIAL_X = 15;
          const increment = (MAX_X - INITIAL_X) / 40;
          newState.nyanSweep.xPosition += increment;

          let newLane = newState.chefLane + newState.nyanSweep.laneDirection;
          if (newLane > 2) {
            newLane = 1;
            newState.nyanSweep.laneDirection = -1;
          } else if (newLane < 1) {
            newLane = 1;
            newState.nyanSweep.laneDirection = 1;
          }
          newState.chefLane = newLane;

          newState.nyanSweep.lastUpdateTime = now;
        }

        // Check for customers at chef's current position and serve them
        newState.customers = newState.customers.map(customer => {
          if (customer.served || customer.disappointed || customer.vomit || customer.frozen) {
            return customer;
          }

          // Check if customer is in chef's lane and at approximately the chef's x position
          if (customer.lane === newState.chefLane &&
              Math.abs(customer.position - newState.nyanSweep!.xPosition) < 10) {
            soundManager.customerServed();
            const baseScore = 150;
            newState.score += baseScore;
            newState.bank += 1;
            newState.happyCustomers += 1;
            newState.stats.customersServed += 1;
            newState.stats.currentCustomerStreak += 1;
            if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) {
              newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
            }

            // Check if we should award a star
            if (newState.happyCustomers % 8 === 0 && newState.lives < 5) {
              soundManager.lifeGained();
              newState.lives += 1;
            }

            // Create empty plate
            const newPlate: EmptyPlate = {
              id: `plate-${Date.now()}-${customer.id}`,
              lane: customer.lane,
              position: customer.position,
              speed: PLATE_SPEED,
            };
            newState.emptyPlates = [...newState.emptyPlates, newPlate];

            return { ...customer, served: true, hasPlate: false, woozy: false };
          }

          return customer;
        });

        if (newState.nyanSweep.xPosition >= MAX_X) {
          newState.nyanSweep = undefined;
        }
      }

      // Level progression
      if (newState.score >= newState.level * 500) {
        newState.level += 1;

        // Show store every 5 levels
        if (newState.level % 5 === 0 && newState.level > newState.lastStoreLevelShown) {
          newState.showStore = true;
          newState.lastStoreLevelShown = newState.level;
        }
      }

      return newState;
    });
  }, [gameState.gameOver, gameState.paused, ovenSoundStates]);

  const cleanOven = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;

    setGameState(prev => {
      const currentOven = prev.ovens[prev.chefLane];
      const now = Date.now();

      if (currentOven.burned && currentOven.cleaningStartTime === 0) {
        soundManager.cleaningStart();
        // Start cleaning the burned oven
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
      const upgradeCost = 10;
      const currentUpgrade = prev.ovenUpgrades[lane] || 0;

      // Check if player has enough money and oven isn't fully upgraded
      if (prev.bank >= upgradeCost && currentUpgrade < 7) {
        return {
          ...prev,
          bank: prev.bank - upgradeCost,
          ovenUpgrades: {
            ...prev.ovenUpgrades,
            [lane]: currentUpgrade + 1
          },
          stats: {
            ...prev.stats,
            ovenUpgradesMade: prev.stats.ovenUpgradesMade + 1,
          }
        };
      }
      return prev;
    });
  }, []);

  const upgradeOvenSpeed = useCallback((lane: number) => {
    setGameState(prev => {
      const speedUpgradeCost = 10;
      const currentSpeedUpgrade = prev.ovenSpeedUpgrades[lane] || 0;

      // Check if player has enough money and oven speed isn't fully upgraded (max 3)
      if (prev.bank >= speedUpgradeCost && currentSpeedUpgrade < 3) {
        return {
          ...prev,
          bank: prev.bank - speedUpgradeCost,
          ovenSpeedUpgrades: {
            ...prev.ovenSpeedUpgrades,
            [lane]: currentSpeedUpgrade + 1
          },
          stats: {
            ...prev.stats,
            ovenUpgradesMade: prev.stats.ovenUpgradesMade + 1,
          }
        };
      }
      return prev;
    });
  }, []);

  const closeStore = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      showStore: false
    }));
  }, []);

  const bribeReviewer = useCallback(() => {
    setGameState(prev => {
      const bribeCost = 25;

      // Check if player has enough money and isn't at max lives
      if (prev.bank >= bribeCost && prev.lives < 5) {
        soundManager.lifeGained();
        return {
          ...prev,
          bank: prev.bank - bribeCost,
          lives: prev.lives + 1
        };
      }
      return prev;
    });
  }, []);

  const buyPowerUp = useCallback((type: 'beer' | 'ice-cream' | 'honey') => {
    setGameState(prev => {
      const powerUpCost = 5;

      if (prev.bank >= powerUpCost) {
        const lane = prev.chefLane;
        const now = Date.now();

        const newPowerUp: PowerUp = {
          id: `powerup-bought-${now}`,
          lane,
          position: 90,
          speed: POWERUP_SPEED,
          type: type === 'ice-cream' ? 'ice-cream' : type === 'beer' ? 'beer' : 'honey',
        };

        return {
          ...prev,
          bank: prev.bank - powerUpCost,
          powerUps: [...prev.powerUps, newPowerUp],
        };
      }
      return prev;
    });
  }, []);

  const debugActivatePowerUp = useCallback((type: PowerUpType) => {
    setGameState(prev => {
      if (prev.gameOver) return prev;

      const now = Date.now();
      let newState = { ...prev };

      newState.stats = {
        ...newState.stats,
        powerUpsUsed: {
          ...newState.stats.powerUpsUsed,
          [type]: newState.stats.powerUpsUsed[type] + 1,
        }
      };

      if (type === 'beer') {
        let livesLost = 0;
        newState.customers = newState.customers.map(customer => {
          if (customer.woozy) {
            livesLost++;
            return {
              ...customer,
              woozy: false,
              vomit: true,
              disappointed: true,
              movingRight: true,
            };
          }
          if (!customer.served && !customer.vomit && !customer.disappointed) {
            return {
              ...customer,
              woozy: true,
              woozyState: 'normal',
              movingRight: true,
            };
          }
          return customer;
        });
        newState.lives = Math.max(0, newState.lives - livesLost);
        if (newState.lives === 0) {
          newState.gameOver = true;
        }
      } else if (type === 'star') {
        newState.availableSlices = 8;
        newState.starPowerActive = true;
        newState.activePowerUps = [
          ...newState.activePowerUps.filter(p => p.type !== 'star'),
          { type: 'star', endTime: now + POWERUP_DURATION }
        ];
      } else if (type === 'doge') {
        newState.activePowerUps = [
          ...newState.activePowerUps.filter(p => p.type !== 'doge'),
          { type: 'doge', endTime: now + POWERUP_DURATION }
        ];
        newState.powerUpAlert = { type: 'doge', endTime: now + 2000, chefLane: newState.chefLane };
      } else if (type === 'nyan') {
        if (!newState.nyanSweep?.active) {
          newState.nyanSweep = {
            active: true,
            xPosition: 15,
            laneDirection: 1,
            startTime: now,
            lastUpdateTime: now,
            startingLane: newState.chefLane
          };
          newState.powerUpAlert = { type: 'nyan', endTime: now + 3000, chefLane: newState.chefLane };
        }
      } else {
        newState.activePowerUps = [
          ...newState.activePowerUps.filter(p => p.type !== type),
          { type: type, endTime: now + POWERUP_DURATION }
        ];
      }

      return newState;
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState({
      customers: [],
      pizzaSlices: [],
      emptyPlates: [],
      powerUps: [],
      activePowerUps: [],
      chefLane: 0,
      score: 0,
      lives: 3,
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
        },
        ovenUpgradesMade: 0,
      },
    });
    setLastCustomerSpawn(0);
    setLastPowerUpSpawn(0);
    setOvenSoundStates({
      0: 'idle',
      1: 'idle',
      2: 'idle',
      3: 'idle'
    });
  }, []);

  const togglePause = useCallback(() => {
    setGameState(prev => {
      const newPaused = !prev.paused;
      const now = Date.now();
      const updatedOvens = { ...prev.ovens };

      // When pausing, save the elapsed time for each cooking oven
      if (newPaused) {
        Object.keys(updatedOvens).forEach(laneKey => {
          const lane = parseInt(laneKey);
          const oven = updatedOvens[lane];
          if (oven.cooking && !oven.burned) {
            const elapsed = now - oven.startTime;
            updatedOvens[lane] = { ...oven, pausedElapsed: elapsed };
          }
        });
      } else {
        // When unpausing, adjust startTime to account for paused duration
        Object.keys(updatedOvens).forEach(laneKey => {
          const lane = parseInt(laneKey);
          const oven = updatedOvens[lane];
          if (oven.cooking && !oven.burned && oven.pausedElapsed !== undefined) {
            // Set startTime so that elapsed time equals pausedElapsed
            updatedOvens[lane] = {
              ...oven,
              startTime: now - oven.pausedElapsed,
              pausedElapsed: undefined
            };
          }
        });
      }

      return { ...prev, paused: newPaused, ovens: updatedOvens };
    });
  }, []);

  // Handle pause state when store opens/closes
  useEffect(() => {
    const prevShowStore = prevShowStoreRef.current;
    const currentShowStore = gameState.showStore;

    // Store just opened - pause the game
    if (!prevShowStore && currentShowStore) {
      setGameState(prev => {
        const now = Date.now();
        const updatedOvens = { ...prev.ovens };

        // Save elapsed time for cooking ovens when pausing
        Object.keys(updatedOvens).forEach(laneKey => {
          const lane = parseInt(laneKey);
          const oven = updatedOvens[lane];
          if (oven.cooking && !oven.burned) {
            const elapsed = now - oven.startTime;
            updatedOvens[lane] = { ...oven, pausedElapsed: elapsed };
          }
        });

        return { ...prev, paused: true, ovens: updatedOvens };
      });
    }

    // Store just closed - unpause the game
    if (prevShowStore && !currentShowStore) {
      setGameState(prev => {
        const now = Date.now();
        const updatedOvens = { ...prev.ovens };

        // Adjust startTime to account for paused duration
        Object.keys(updatedOvens).forEach(laneKey => {
          const lane = parseInt(laneKey);
          const oven = updatedOvens[lane];
          if (oven.cooking && !oven.burned && oven.pausedElapsed !== undefined) {
            updatedOvens[lane] = {
              ...oven,
              startTime: now - oven.pausedElapsed,
              pausedElapsed: undefined
            };
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
        // Only spawn if not paused
        if (!current.paused && !current.gameOver) {
          // Increase spawn rate based on level (slower ramp)
          const levelSpawnRate = CUSTOMER_SPAWN_RATE + (current.level - 1) * 0.1;
          if (Math.random() < levelSpawnRate * 0.01) {
            spawnCustomer();
          }
          // Spawn power-ups occasionally
          if (Math.random() < 2 * 0.01) {
            spawnPowerUp();
          }
        }
        return current;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameStarted, updateGame, spawnCustomer, spawnPowerUp]);

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
    debugActivatePowerUp,
  };
};