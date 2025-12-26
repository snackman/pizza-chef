import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Customer, PizzaSlice, EmptyPlate, PowerUp, PowerUpType, FloatingScore, DroppedPlate, StarLostReason, BossMinion, BossBattle } from '../types/game';
import { soundManager } from '../utils/sounds';
import { getStreakMultiplier } from '../components/StreakDisplay';

const BOSS_LEVEL = 10;
const BOSS_WAVES = 3;
const MINIONS_PER_WAVE = 8;
const BOSS_HEALTH = 8;
const MINION_SPEED = 0.15;

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
    floatingScores: [],
    droppedPlates: [],
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
  const [ovenSoundStates, setOvenSoundStates] = useState<{[key: number]: 'idle' | 'cooking' | 'ready' | 'warning' | 'burning'}>({
    0: 'idle',
    1: 'idle',
    2: 'idle',
    3: 'idle'
  });
  const prevShowStoreRef = useRef(false);

  const addFloatingScore = useCallback((points: number, lane: number, position: number, state: GameState): GameState => {
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
  }, []);

  const spawnPowerUp = useCallback(() => {
    const now = Date.now();
    if (now - lastPowerUpSpawn < 8000) return; // Spawn power-up every 8 seconds minimum

    const lane = Math.floor(Math.random() * 4);
    const powerUpTypes: PowerUpType[] = ['honey', 'ice-cream', 'beer', 'doge', 'nyan', 'moltobenny'];
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

    if (gameState.paused) return;

    // Customer spawn choice
    const lane = Math.floor(Math.random() * 4);
    const disappointedEmojis = ['😢', '😭', '😠', '🤬'];
    const isCritic = Math.random() < 0.15;
    const isBadLuckBrian = !isCritic && Math.random() < 0.1;
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
      critic: isCritic,
      badLuckBrian: isBadLuckBrian,
      flipped: isBadLuckBrian,
    };

    setGameState(prev => ({
      ...prev,
      customers: [...prev.customers, newCustomer],
    }));

    setLastCustomerSpawn(now);
  }, [lastCustomerSpawn, gameState.level, gameState.activePowerUps]);

  const spawnBossWave = useCallback((waveNumber: number): BossMinion[] => {
    const minions: BossMinion[] = [];
    const now = Date.now();
    for (let i = 0; i < MINIONS_PER_WAVE; i++) {
      const lane = i % 4;
      minions.push({
        id: `minion-${now}-${waveNumber}-${i}`,
        lane,
        position: 95 + (Math.floor(i / 4) * 15),
        speed: MINION_SPEED,
        defeated: false,
      });
    }
    return minions;
  }, []);

  const startBossBattle = useCallback(() => {
    setGameState(prev => {
      if (prev.bossBattle?.active) return prev;

      const initialMinions = spawnBossWave(1);
      return {
        ...prev,
        customers: [],
        bossBattle: {
          active: true,
          bossHealth: BOSS_HEALTH,
          currentWave: 1,
          minions: initialMinions,
          bossVulnerable: false,
          bossDefeated: false,
          bossPosition: 85,
        },
      };
    });
  }, [spawnBossWave]);

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

      let newState = { ...prev, stats: { ...prev.stats, powerUpsUsed: { ...prev.stats.powerUpsUsed } } };

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
            newState.lastStarLostReason = 'burned_pizza';
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

      // Remove expired floating scores (after 1 second)
      newState.floatingScores = newState.floatingScores.filter(fs => now - fs.startTime < 1000);

      // Remove expired dropped plates (after 1 second)
      newState.droppedPlates = newState.droppedPlates.filter(dp => now - dp.startTime < 1000);

      // Clear expired text messages (after 3 seconds)
      newState.customers = newState.customers.map(customer => {
        if (customer.textMessage && customer.textMessageTime && now - customer.textMessageTime >= 3000) {
          return { ...customer, textMessage: undefined, textMessageTime: undefined };
        }
        return customer;
      });

      // Remove expired power-ups
      const expiredStarPower = newState.activePowerUps.some(p => p.type === 'star' && now >= p.endTime);
      const expiredHoney = newState.activePowerUps.some(p => p.type === 'honey' && now >= p.endTime);
      newState.activePowerUps = newState.activePowerUps.filter(powerUp => now < powerUp.endTime);

      // If star power expired, disable it
      if (expiredStarPower) {
        newState.starPowerActive = false;
      }

      // If hot honey expired, clear affected status from all customers
      if (expiredHoney) {
        newState.customers = newState.customers.map(c => ({ ...c, hotHoneyAffected: false }));
      }

      // Check active power-ups
      const hasHoney = newState.activePowerUps.some(p => p.type === 'honey');
      const hasIceCream = newState.activePowerUps.some(p => p.type === 'ice-cream');
      const hasStar = newState.activePowerUps.some(p => p.type === 'star');
      const hasDoge = newState.activePowerUps.some(p => p.type === 'doge');
      const hasNyan = newState.activePowerUps.some(p => p.type === 'nyan');

      // Clear expired power-up alerts (but keep doge alert while doge is active)
      if (newState.powerUpAlert && now >= newState.powerUpAlert.endTime) {
        if (newState.powerUpAlert.type !== 'doge' || !hasDoge) {
          newState.powerUpAlert = undefined;
        }
      }

      // Apply power-up state overrides based on "last activated wins"
      // Compare endTime to determine which was activated most recently
      const honeyPowerUp = newState.activePowerUps.find(p => p.type === 'honey');
      const iceCreamPowerUp = newState.activePowerUps.find(p => p.type === 'ice-cream');
      const honeyEndTime = honeyPowerUp?.endTime || 0;
      const iceCreamEndTime = iceCreamPowerUp?.endTime || 0;

      newState.customers = newState.customers.map(customer => {
        const isDeparting = customer.served || customer.disappointed || customer.vomit;
        if (isDeparting) return customer;

        // Woozy customers (beer effect) override both frozen and hot honey
        // Beer clears these states at activation, so woozy customers stay woozy
        if (customer.woozy) {
          return { ...customer, frozen: false, hotHoneyAffected: false };
        }

        // If both honey and ice cream are active, the one activated last wins
        if (hasHoney && hasIceCream) {
          if (honeyEndTime > iceCreamEndTime) {
            // Hot honey was activated more recently - unfreeze and speed up (only if marked to be affected)
            if (customer.shouldBeHotHoneyAffected) {
              return { ...customer, hotHoneyAffected: true, frozen: false };
            }
          } else {
            // Ice cream was activated more recently - freeze (only if marked to be frozen)
            if (customer.shouldBeFrozenByIceCream && !customer.unfrozenThisPeriod) {
              return { ...customer, frozen: true, hotHoneyAffected: false };
            }
          }
        } else if (hasHoney) {
          // Only hot honey active - speed up customers (only if marked to be affected)
          if (customer.shouldBeHotHoneyAffected) {
            return { ...customer, hotHoneyAffected: true, frozen: false };
          }
        } else if (hasIceCream) {
          // Only ice cream active - freeze customers (only if marked to be frozen)
          if (customer.shouldBeFrozenByIceCream && !customer.unfrozenThisPeriod) {
            return { ...customer, frozen: true, hotHoneyAffected: false };
          }
        }

        // Reset states when no conflicting power-ups are active
        if (!hasIceCream && (customer.frozen || customer.unfrozenThisPeriod || customer.shouldBeFrozenByIceCream)) {
          return { ...customer, frozen: undefined, unfrozenThisPeriod: undefined, shouldBeFrozenByIceCream: undefined };
        }
        if (!hasHoney && customer.hotHoneyAffected) {
          return { ...customer, hotHoneyAffected: false, shouldBeHotHoneyAffected: undefined };
        }

        return customer;
      });

      // Move customers (with speed modifier if hot honey affected, or frozen if ice cream)
      // Move customers that are not frozen (or ice cream is not active)
      newState.customers = newState.customers.map(customer => {
        // Skip frozen customers (unless hot honey overrides it)
        if (customer.frozen && !customer.hotHoneyAffected) {
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
            const newPosition = customer.position + (customer.speed * 0.75);
            // Turn around when reaching pickup zone (85-95%)
            if (newPosition >= 90) {
              return { ...customer, position: newPosition, movingRight: false };
            }
            return { ...customer, position: newPosition };
          } else {
            // Moving left towards chef
            const speedModifier = 0.75;
            const newPosition = customer.position - (customer.speed * speedModifier);
            // Mark as disappointed when reaching chef position
            if (newPosition <= 15) {
              soundManager.customerDisappointed();
              soundManager.lifeLost();
              newState.stats.currentCustomerStreak = 0;
              // Critic customers remove 2 stars instead of 1
              const starsLost = customer.critic ? 2 : 1;
              newState.lives = Math.max(0, newState.lives - starsLost);
              newState.lastStarLostReason = customer.critic ? 'woozy_critic_reached' : 'woozy_customer_reached';
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
            return { ...customer, position: newPosition };
          }
        }

        // Vomit/disappointed customers move back to the right
        if (customer.disappointed || customer.vomit) {
          const newPosition = customer.position + (customer.speed * 2);
          return { ...customer, position: newPosition, hotHoneyAffected: false };
        }

        // Bad Luck Brian moving right after dropping a plate
        if (customer.badLuckBrian && customer.movingRight) {
          const newPosition = customer.position + customer.speed;
          return { ...customer, position: newPosition, hotHoneyAffected: false };
        }

        // Bad Luck Brian reaching the counter without being served
        if (customer.badLuckBrian && !customer.movingRight && !customer.served && !customer.disappointed) {
          const speedModifier = customer.hotHoneyAffected ? 0.5 : 1;
          const newPosition = customer.position - (customer.speed * speedModifier);

          if (newPosition <= 15) {
            const counterMessages = [
              "Damn! They sold out again!",
              "You don't have gluten free?"
            ];
            const randomMessage = counterMessages[Math.floor(Math.random() * counterMessages.length)];
            return {
              ...customer,
              position: newPosition,
              textMessage: randomMessage,
              textMessageTime: Date.now(),
              flipped: false,
              movingRight: true,
              hotHoneyAffected: false
            };
          }
          return { ...customer, position: newPosition };
        }

        // Normal customers - only slow if this customer was affected by hot honey
        const speedModifier = customer.hotHoneyAffected ? 0.5 : 1;
        const newPosition = customer.position - (customer.speed * speedModifier);
        // Mark as disappointed when reaching chef position (around 10-15%) and lose a life
        if (newPosition <= 15) {
          soundManager.customerDisappointed();
          soundManager.lifeLost();
          newState.stats.currentCustomerStreak = 0;
          // Critic customers remove 2 stars instead of 1
          const starsLost = customer.critic ? 2 : 1;
          newState.lives = Math.max(0, newState.lives - starsLost);
          newState.lastStarLostReason = customer.critic ? 'disappointed_critic' : 'disappointed_customer';
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
        return { ...customer, position: newPosition };
      }).filter(customer => {
        // Remove customers when they exit right
        if (customer.position > 95) {
          return false;
        }
        return customer.position > -10;
      });

      // Star power: auto-feed customers on contact with chef
      const starPowerScores: Array<{ points: number; lane: number; position: number }> = [];
      if (hasStar && newState.availableSlices > 0) {
        newState.customers = newState.customers.map(customer => {
          // Check if customer is in same lane and close to chef
          if (customer.lane === newState.chefLane && !customer.served && !customer.disappointed && !customer.vomit && Math.abs(customer.position - 15) < 8) {
            newState.availableSlices = Math.max(0, newState.availableSlices - 1);

            // Bad Luck Brian drops the plate immediately
            if (customer.badLuckBrian) {
              soundManager.plateDropped();
              newState.stats.currentCustomerStreak = 0;
              newState.stats.currentPlateStreak = 0;

              const droppedPlate = {
                id: `dropped-${Date.now()}-${customer.id}`,
                lane: customer.lane,
                position: customer.position,
                startTime: Date.now(),
                hasSlice: true,
              };
              newState.droppedPlates = [...newState.droppedPlates, droppedPlate];

              return {
                ...customer,
                flipped: false,
                movingRight: true,
                textMessage: "Ugh! I dropped my slice!",
                textMessageTime: Date.now()
              };
            }

            soundManager.customerServed();
            const baseScore = customer.critic ? 300 : 150;
            const baseBank = 1;
            const dogeMultiplier = hasDoge ? 2 : 1;
            const bankMultiplier = hasDoge ? 2 : 1;
            const customerStreakMultiplier = getStreakMultiplier(newState.stats.currentCustomerStreak);
            const pointsEarned = Math.floor(baseScore * dogeMultiplier * customerStreakMultiplier);
            newState.score += pointsEarned;
            newState.bank += baseBank * bankMultiplier;
            newState.happyCustomers += 1;
            starPowerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
            newState.stats.customersServed += 1;
            newState.stats.currentCustomerStreak += 1;
            if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) {
              newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
            }

            // Check if we should award a star (every 8 happy customers, max 5 stars)
            // Critic customers don't get special treatment with star power (served at position ~15)
            if (!customer.critic && newState.happyCustomers % 8 === 0 && newState.lives < 5) {
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

      // Add floating scores for star power
      starPowerScores.forEach(({ points, lane, position }) => {
        newState = addFloatingScore(points, lane, position, newState);
      });

      // Check chef-powerup collisions first (chef grabs power-up at position 15 or less)
      // Don't pick up power-ups while nyan cat sweep is active
      const caughtPowerUpIds = new Set<string>();
      const powerUpScores: Array<{ points: number; lane: number; position: number }> = [];
      newState.powerUps.forEach(powerUp => {
        if (powerUp.position <= 15 && powerUp.lane === newState.chefLane && !newState.nyanSweep?.active) {
          // Chef grabbed the power-up - activate it
          soundManager.powerUpCollected(powerUp.type);
          const baseScore = 100;
          const scoreMultiplier = hasDoge ? 2 : 1;
          const pointsEarned = baseScore * scoreMultiplier;
          newState.score += pointsEarned;
          powerUpScores.push({ points: pointsEarned, lane: powerUp.lane, position: powerUp.position });
          caughtPowerUpIds.add(powerUp.id);

          // Activate the power-up
          newState.stats.powerUpsUsed[powerUp.type] += 1;

          if (powerUp.type === 'beer') {
            // Make all current unsatisfied customers woozy, existing woozy customers become vomit faces
            // Beer overrides hot honey and frozen states
            let livesLost = 0;
            let lastReason: StarLostReason | undefined;
            newState.customers = newState.customers.map(customer => {
              if (customer.woozy) {
                // Existing woozy customers become vomit/dissatisfied
                // Critic customers lose 2 lives instead of 1
                livesLost += customer.critic ? 2 : 1;
                lastReason = customer.critic ? 'beer_critic_vomit' : 'beer_vomit';
                return {
                  ...customer,
                  woozy: false,
                  vomit: true,
                  disappointed: true,
                  movingRight: true,
                };
              }
              if (!customer.served && !customer.vomit && !customer.disappointed) {
                // Bad Luck Brian can't handle beer - hurls and loses you a star
                if (customer.badLuckBrian) {
                  livesLost += 1;
                  lastReason = 'brian_hurled';
                  return {
                    ...customer,
                    vomit: true,
                    disappointed: true,
                    movingRight: true,
                    flipped: false,
                    textMessage: "Oh man I hurled",
                    textMessageTime: Date.now(),
                    hotHoneyAffected: false,
                    frozen: false,
                  };
                }
                return {
                  ...customer,
                  woozy: true,
                  woozyState: 'normal',
                  movingRight: true,
                  hotHoneyAffected: false,
                  frozen: false,
                };
              }
              return customer;
            });
            newState.lives = Math.max(0, newState.lives - livesLost);
            if (livesLost > 0) {
              soundManager.lifeLost();
              newState.stats.currentCustomerStreak = 0;
              if (lastReason) {
                newState.lastStarLostReason = lastReason;
              }
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
            // Show Doge alert for 5 seconds
            newState.powerUpAlert = { type: 'doge', endTime: now + 5000, chefLane: newState.chefLane };
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
              soundManager.nyanCatPowerUp();
              const dogeActive = newState.activePowerUps.some(p => p.type === 'doge');
              if (!dogeActive || newState.powerUpAlert?.type !== 'doge') {
                newState.powerUpAlert = { type: 'nyan', endTime: now + 3000, chefLane: newState.chefLane };
              }
            }
          } else if (powerUp.type === 'moltobenny') {
            // Moltobenny power-up gives 10,000 points (affected by doge multiplier)
            const moltoScore = 10000 * scoreMultiplier;
            newState.score += moltoScore;
            powerUpScores.push({ points: moltoScore, lane: newState.chefLane, position: 15 });
          } else {
            // Add to active power-ups (hot honey and ice-cream)
            newState.activePowerUps = [
              ...newState.activePowerUps.filter(p => p.type !== powerUp.type),
              { type: powerUp.type, endTime: now + POWERUP_DURATION }
            ];
            // If honey, mark all current non-served customers as affected
            // Hot honey overrides frozen and woozy states
            if (powerUp.type === 'honey') {
              newState.customers = newState.customers.map(c =>
                (!c.served && !c.disappointed && !c.vomit)
                  ? { ...c, shouldBeHotHoneyAffected: true, hotHoneyAffected: true, frozen: false, woozy: false, woozyState: undefined }
                  : c
              );
            }
            // If ice cream, mark all current non-served customers to be frozen (except Bad Luck Brian)
            if (powerUp.type === 'ice-cream') {
              newState.customers = newState.customers.map(c => {
                if (!c.served && !c.disappointed && !c.vomit) {
                  if (c.badLuckBrian) {
                    return {
                      ...c,
                      textMessage: "I'm lactose intolerant",
                      textMessageTime: Date.now()
                    };
                  }
                  return {
                    ...c,
                    shouldBeFrozenByIceCream: true,
                    frozen: true,
                    hotHoneyAffected: false,
                    woozy: false,
                    woozyState: undefined
                  };
                }
                return c;
              });
            }
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

      // Add floating scores for power-ups
      powerUpScores.forEach(({ points, lane, position }) => {
        newState = addFloatingScore(points, lane, position, newState);
      });

      // Move pizza slices
      newState.pizzaSlices = newState.pizzaSlices.map(slice => ({
        ...slice,
        position: slice.position + (slice.speed),
      }));

      // Check pizza-customer and pizza-powerup collisions
      const remainingSlices: PizzaSlice[] = [];
      const destroyedPowerUpIds = new Set<string>();
      const platesFromSlices = new Set<string>();
      const customerScores: Array<{ points: number; lane: number; position: number }> = [];
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

            // Bad Luck Brian drops the plate immediately (even when frozen)
            if (customer.badLuckBrian) {
              soundManager.plateDropped();
              newState.stats.currentCustomerStreak = 0;
              newState.stats.currentPlateStreak = 0;
              platesFromSlices.add(slice.id);

              const droppedPlate = {
                id: `dropped-${Date.now()}-${customer.id}`,
                lane: customer.lane,
                position: customer.position,
                startTime: Date.now(),
                hasSlice: true,
              };
              newState.droppedPlates = [...newState.droppedPlates, droppedPlate];

              return {
                ...customer,
                frozen: false,
                flipped: false,
                movingRight: true,
                textMessage: "Ugh! I dropped my slice!",
                textMessageTime: Date.now()
              };
            }

            soundManager.customerUnfreeze();

            // Give score for serving frozen customer with customer streak multiplier
            const baseScore = customer.critic ? 300 : 150;
            const baseBank = 1;
            const dogeMultiplier = hasDoge ? 2 : 1;
            const bankMultiplier = hasDoge ? 2 : 1;
            const customerStreakMultiplier = getStreakMultiplier(newState.stats.currentCustomerStreak);
            const pointsEarned = Math.floor(baseScore * dogeMultiplier * customerStreakMultiplier);
            newState.score += pointsEarned;
            newState.bank += baseBank * bankMultiplier;
            customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
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

            // Create empty plate for unfreezing slice
            const newPlate: EmptyPlate = {
              id: `plate-${Date.now()}-${customer.id}-unfreeze`,
              lane: customer.lane,
              position: customer.position,
              speed: PLATE_SPEED,
            };
            newState.emptyPlates = [...newState.emptyPlates, newPlate];
            platesFromSlices.add(slice.id);

            // Mark as unfrozen this period so they won't refreeze until ice cream expires
            return { ...customer, frozen: false, unfrozenThisPeriod: true, served: true, hasPlate: false };
          }

          // Skip customers that have crossed the 0% line (but allow unfreezing above)
          if (customer.position <= 0) {
            return customer;
          }

          // Handle woozy customers eating pizza (not frozen)
          if (!consumed && customer.woozy && !customer.frozen && customer.lane === slice.lane &&
              Math.abs(customer.position - slice.position) < 5) {
            consumed = true;

            // Bad Luck Brian drops the plate immediately (even when woozy)
            if (customer.badLuckBrian) {
              soundManager.plateDropped();
              newState.stats.currentCustomerStreak = 0;
              newState.stats.currentPlateStreak = 0;
              platesFromSlices.add(slice.id);

              const droppedPlate = {
                id: `dropped-${Date.now()}-${customer.id}`,
                lane: customer.lane,
                position: customer.position,
                startTime: Date.now(),
                hasSlice: true,
              };
              newState.droppedPlates = [...newState.droppedPlates, droppedPlate];

              return {
                ...customer,
                woozy: false,
                flipped: false,
                movingRight: true,
                textMessage: "Ugh! I dropped my slice!",
                textMessageTime: Date.now()
              };
            }

            const currentState = customer.woozyState || 'normal';

            // If hot honey is active and customer is affected by it, satisfy them with one slice
            if (hasHoney && customer.hotHoneyAffected) {
              soundManager.customerServed();
              const baseScore = customer.critic ? 300 : 150;
              const baseBank = 1;
              const dogeMultiplier = hasDoge ? 2 : 1;
              const bankMultiplier = hasDoge ? 2 : 1;
              const customerStreakMultiplier = getStreakMultiplier(newState.stats.currentCustomerStreak);
              const pointsEarned = Math.floor(baseScore * dogeMultiplier * customerStreakMultiplier);
              newState.score += pointsEarned;
              newState.bank += baseBank * bankMultiplier;
              customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
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
              const dogeMultiplier = hasDoge ? 2 : 1;
              const bankMultiplier = hasDoge ? 2 : 1;
              const customerStreakMultiplier = getStreakMultiplier(newState.stats.currentCustomerStreak);
              const pointsEarned = Math.floor(baseScore * dogeMultiplier * customerStreakMultiplier);
              newState.score += pointsEarned;
              newState.bank += baseBank * bankMultiplier;
              customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });

              // Create empty plate for first slice too
              const newPlate: EmptyPlate = {
                id: `plate-${Date.now()}-${customer.id}-first`,
                lane: customer.lane,
                position: customer.position,
                speed: PLATE_SPEED,
              };
              newState.emptyPlates = [...newState.emptyPlates, newPlate];
              platesFromSlices.add(slice.id);

              return { ...customer, woozy: false, woozyState: 'drooling' };
            } else if (currentState === 'drooling') {
              // Second pizza - becomes satisfied
              soundManager.customerServed();
              const baseScore = customer.critic ? 300 : 150;
              const baseBank = 1;
              const dogeMultiplier = hasDoge ? 2 : 1;
              const bankMultiplier = hasDoge ? 2 : 1;
              const customerStreakMultiplier = getStreakMultiplier(newState.stats.currentCustomerStreak);
              const pointsEarned = Math.floor(baseScore * dogeMultiplier * customerStreakMultiplier);
              newState.score += pointsEarned;
              newState.bank += baseBank * bankMultiplier;
              customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
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

            // Bad Luck Brian drops the plate immediately
            if (customer.badLuckBrian) {
              soundManager.plateDropped();
              newState.stats.currentCustomerStreak = 0;
              newState.stats.currentPlateStreak = 0;
              platesFromSlices.add(slice.id);

              const droppedPlate = {
                id: `dropped-${Date.now()}-${customer.id}`,
                lane: customer.lane,
                position: customer.position,
                startTime: Date.now(),
                hasSlice: true,
              };
              newState.droppedPlates = [...newState.droppedPlates, droppedPlate];

              return {
                ...customer,
                flipped: false,
                movingRight: true,
                textMessage: "Ugh! I dropped my slice!",
                textMessageTime: Date.now()
              };
            }

            soundManager.customerServed();
            const baseScore = customer.critic ? 300 : 150;
            const baseBank = 1;
            const dogeMultiplier = hasDoge ? 2 : 1;
            const bankMultiplier = hasDoge ? 2 : 1;
            const customerStreakMultiplier = getStreakMultiplier(newState.stats.currentCustomerStreak);
            const pointsEarned = Math.floor(baseScore * dogeMultiplier * customerStreakMultiplier);
            newState.score += pointsEarned;
            newState.bank += baseBank * bankMultiplier;
            customerScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
            newState.happyCustomers += 1;
            newState.stats.customersServed += 1;
            newState.stats.currentCustomerStreak += 1;
            if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) {
              newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
            }

            // Critic customer special star mechanics
            if (customer.critic) {
              if (customer.position >= 55) {
                // Served before xPosition 55 - add a star
                if (newState.lives < 5) {
                  newState.lives += 1;
                  soundManager.lifeGained();
                }
              }
            } else {
              // Check if we should award a star (every 8 happy customers, max 5 stars)
              if (newState.happyCustomers % 8 === 0 && newState.lives < 5) {
                soundManager.lifeGained();
                newState.lives += 1;
              }
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

      // Add floating scores for customer servings
      customerScores.forEach(({ points, lane, position }) => {
        newState = addFloatingScore(points, lane, position, newState);
      });

      // Move empty plates
      const platesToAddScores: Array<{ points: number; lane: number; position: number }> = [];
      newState.emptyPlates = newState.emptyPlates.map(plate => ({
        ...plate,
        position: plate.position - (plate.speed),
      })).filter(plate => {
        if (plate.position <= 10 && plate.lane === newState.chefLane && !newState.nyanSweep?.active) {
          // Chef caught the plate - it disappears immediately (but not during nyan sweep)
          soundManager.plateCaught();
          const baseScore = 50;
          const dogeMultiplier = hasDoge ? 2 : 1;
          const plateStreakMultiplier = getStreakMultiplier(newState.stats.currentPlateStreak);
          const pointsEarned = Math.floor(baseScore * dogeMultiplier * plateStreakMultiplier);
          newState.score += pointsEarned;
          platesToAddScores.push({ points: pointsEarned, lane: plate.lane, position: plate.position });
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

      // Add floating scores for caught plates
      platesToAddScores.forEach(({ points, lane, position }) => {
        newState = addFloatingScore(points, lane, position, newState);
      });

      // Handle Nyan Cat sweep animation
      if (newState.nyanSweep?.active) {
        const MAX_X = 90;
        const UPDATE_INTERVAL = 50;

        if (now - newState.nyanSweep.lastUpdateTime >= UPDATE_INTERVAL) {
          const INITIAL_X = 15;
          const increment = ((MAX_X - INITIAL_X) / 80) * 1.5;
          const newXPosition = newState.nyanSweep.xPosition + increment;

          let newLane = newState.chefLane + newState.nyanSweep.laneDirection * 0.5;
          let newLaneDirection = newState.nyanSweep.laneDirection;
          if (newLane > 3) {
            newLane = 2.5;
            newLaneDirection = -1;
          } else if (newLane < 0) {
            newLane = 0.5;
            newLaneDirection = 1;
          }
          newState.chefLane = newLane;

          newState.nyanSweep = {
            ...newState.nyanSweep,
            xPosition: newXPosition,
            laneDirection: newLaneDirection,
            lastUpdateTime: now
          };
        }

        // Check for customers at chef's current position and serve them
        const nyanScores: Array<{ points: number; lane: number; position: number }> = [];
        newState.customers = newState.customers.map(customer => {
          if (customer.served || customer.disappointed || customer.vomit) {
            return customer;
          }

          // Check if customer is in chef's lane and at approximately the chef's x position
          if (customer.lane === newState.chefLane &&
              Math.abs(customer.position - newState.nyanSweep!.xPosition) < 10) {

            // Bad Luck Brian drops the plate immediately (nyan cat doesn't create plates anyway)
            if (customer.badLuckBrian) {
              soundManager.plateDropped();
              newState.stats.currentCustomerStreak = 0;
              newState.stats.currentPlateStreak = 0;

              const droppedPlate = {
                id: `dropped-${Date.now()}-${customer.id}`,
                lane: customer.lane,
                position: customer.position,
                startTime: Date.now(),
                hasSlice: true,
              };
              newState.droppedPlates = [...newState.droppedPlates, droppedPlate];

              return {
                ...customer,
                flipped: false,
                movingRight: true,
                textMessage: "Ugh! I dropped my slice!",
                textMessageTime: Date.now()
              };
            }

            soundManager.customerServed();
            const baseScore = customer.critic ? 300 : 150;
            const baseBank = 1;
            const dogeMultiplier = hasDoge ? 2 : 1;
            const bankMultiplier = hasDoge ? 2 : 1;
            const customerStreakMultiplier = getStreakMultiplier(newState.stats.currentCustomerStreak);
            const pointsEarned = Math.floor(baseScore * dogeMultiplier * customerStreakMultiplier);
            newState.score += pointsEarned;
            newState.bank += baseBank * bankMultiplier;
            nyanScores.push({ points: pointsEarned, lane: customer.lane, position: customer.position });
            newState.happyCustomers += 1;
            newState.stats.customersServed += 1;
            newState.stats.currentCustomerStreak += 1;
            if (newState.stats.currentCustomerStreak > newState.stats.longestCustomerStreak) {
              newState.stats.longestCustomerStreak = newState.stats.currentCustomerStreak;
            }

            // Critic customer special star mechanics
            if (customer.critic) {
              if (customer.position >= 55) {
                // Served before xPosition 55 - add a star
                if (newState.lives < 5) {
                  newState.lives += 1;
                  soundManager.lifeGained();
                }
              }
            } else {
              // Check if we should award a star
              if (newState.happyCustomers % 8 === 0 && newState.lives < 5) {
                const starsToAdd = hasDoge ? 2 : 1;
                const actualStarsToAdd = Math.min(starsToAdd, 5 - newState.lives);
                newState.lives += actualStarsToAdd;
                if (actualStarsToAdd > 0) {
                  soundManager.lifeGained();
                }
              }
            }

            return { ...customer, served: true, hasPlate: false, woozy: false, frozen: false, unfrozenThisPeriod: undefined };
          }

          return customer;
        });

        // Add floating scores for nyan sweep
        nyanScores.forEach(({ points, lane, position }) => {
          newState = addFloatingScore(points, lane, position, newState);
        });

        if (newState.nyanSweep.xPosition >= MAX_X) {
          newState.chefLane = Math.round(newState.chefLane);
          newState.chefLane = Math.max(0, Math.min(3, newState.chefLane));
          newState.nyanSweep = undefined;

          // Show pending store if one was triggered during nyan sweep
          if (newState.pendingStoreShow) {
            newState.showStore = true;
            newState.pendingStoreShow = false;
          }
        }
      }

      // Level progression - calculate final level in one step to avoid multiple store triggers
      const targetLevel = Math.floor(newState.score / 500) + 1;
      if (targetLevel > newState.level) {
        newState.level = targetLevel;

        // Show store if we crossed any 5-level threshold (only once)
        const highestStoreLevel = Math.floor(targetLevel / 5) * 5;
        if (highestStoreLevel >= 5 && highestStoreLevel > newState.lastStoreLevelShown) {
          newState.lastStoreLevelShown = highestStoreLevel;
          // If nyan sweep is active, delay showing the store until it ends
          if (newState.nyanSweep?.active) {
            newState.pendingStoreShow = true;
          } else {
            newState.showStore = true;
          }
        }

        // Start boss battle at level 10
        if (targetLevel === BOSS_LEVEL && !newState.bossBattle?.active && !newState.bossBattle?.bossDefeated) {
          const initialMinions: BossMinion[] = [];
          for (let i = 0; i < MINIONS_PER_WAVE; i++) {
            const lane = i % 4;
            initialMinions.push({
              id: `minion-${now}-1-${i}`,
              lane,
              position: 95 + (Math.floor(i / 4) * 15),
              speed: MINION_SPEED,
              defeated: false,
            });
          }
          newState.customers = [];
          newState.bossBattle = {
            active: true,
            bossHealth: BOSS_HEALTH,
            currentWave: 1,
            minions: initialMinions,
            bossVulnerable: false,
            bossDefeated: false,
            bossPosition: 85,
          };
        }
      }

      // Boss battle logic
      if (newState.bossBattle?.active && !newState.bossBattle.bossDefeated) {
        const bossScores: Array<{ points: number; lane: number; position: number }> = [];

        // Move minions
        newState.bossBattle.minions = newState.bossBattle.minions.map(minion => {
          if (minion.defeated) return minion;
          return {
            ...minion,
            position: minion.position - minion.speed,
          };
        });

        // Check if any minion reached the chef (lose a life)
        newState.bossBattle.minions = newState.bossBattle.minions.map(minion => {
          if (minion.defeated) return minion;
          if (minion.position <= 15) {
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

        // Check pizza-minion collisions
        const consumedSliceIds = new Set<string>();
        newState.pizzaSlices.forEach(slice => {
          if (consumedSliceIds.has(slice.id)) return;

          newState.bossBattle!.minions = newState.bossBattle!.minions.map(minion => {
            if (minion.defeated || consumedSliceIds.has(slice.id)) return minion;

            if (minion.lane === slice.lane && Math.abs(minion.position - slice.position) < 8) {
              consumedSliceIds.add(slice.id);
              soundManager.customerServed();
              const pointsEarned = 100;
              newState.score += pointsEarned;
              bossScores.push({ points: pointsEarned, lane: minion.lane, position: minion.position });
              return { ...minion, defeated: true };
            }
            return minion;
          });
        });

        // Check pizza-boss collision (only if vulnerable)
        if (newState.bossBattle.bossVulnerable) {
          newState.pizzaSlices.forEach(slice => {
            if (consumedSliceIds.has(slice.id)) return;

            // Boss spans all 4 lanes, check if pizza is near boss position
            if (Math.abs(newState.bossBattle!.bossPosition - slice.position) < 10) {
              consumedSliceIds.add(slice.id);
              soundManager.customerServed();
              newState.bossBattle!.bossHealth -= 1;
              const pointsEarned = 500;
              newState.score += pointsEarned;
              bossScores.push({ points: pointsEarned, lane: slice.lane, position: slice.position });

              if (newState.bossBattle!.bossHealth <= 0) {
                newState.bossBattle!.bossDefeated = true;
                newState.bossBattle!.active = false;
                newState.score += 5000;
                bossScores.push({ points: 5000, lane: 1, position: newState.bossBattle!.bossPosition });
              }
            }
          });
        }

        // Remove consumed slices
        newState.pizzaSlices = newState.pizzaSlices.filter(slice => !consumedSliceIds.has(slice.id));

        // Add floating scores for boss battle
        bossScores.forEach(({ points, lane, position }) => {
          newState = addFloatingScore(points, lane, position, newState);
        });

        // Check if all minions in current wave are defeated
        const activeMinions = newState.bossBattle.minions.filter(m => !m.defeated);
        if (activeMinions.length === 0) {
          if (newState.bossBattle.currentWave < BOSS_WAVES) {
            // Spawn next wave
            const nextWave = newState.bossBattle.currentWave + 1;
            const newMinions: BossMinion[] = [];
            for (let i = 0; i < MINIONS_PER_WAVE; i++) {
              const lane = i % 4;
              newMinions.push({
                id: `minion-${now}-${nextWave}-${i}`,
                lane,
                position: 95 + (Math.floor(i / 4) * 15),
                speed: MINION_SPEED,
                defeated: false,
              });
            }
            newState.bossBattle.currentWave = nextWave;
            newState.bossBattle.minions = newMinions;
          } else if (!newState.bossBattle.bossVulnerable) {
            // All waves completed, boss becomes vulnerable
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
      let newState = {
        ...prev,
        stats: {
          ...prev.stats,
          powerUpsUsed: {
            ...prev.stats.powerUpsUsed,
            [type]: prev.stats.powerUpsUsed[type] + 1,
          }
        }
      };

      if (type === 'beer') {
        let livesLost = 0;
        let lastReason: StarLostReason | undefined;
        newState.customers = newState.customers.map(customer => {
          if (customer.woozy) {
            // Critic customers lose 2 lives instead of 1
            livesLost += customer.critic ? 2 : 1;
            lastReason = customer.critic ? 'beer_critic_vomit' : 'beer_vomit';
            return {
              ...customer,
              woozy: false,
              vomit: true,
              disappointed: true,
              movingRight: true,
            };
          }
          if (!customer.served && !customer.vomit && !customer.disappointed) {
            // Bad Luck Brian can't handle beer - hurls and loses you a star
            if (customer.badLuckBrian) {
              livesLost += 1;
              lastReason = 'brian_hurled';
              return {
                ...customer,
                vomit: true,
                disappointed: true,
                movingRight: true,
                flipped: false,
                textMessage: "Oh man I hurled",
                textMessageTime: Date.now(),
                hotHoneyAffected: false,
                frozen: false,
              };
            }
            return {
              ...customer,
              woozy: true,
              woozyState: 'normal',
              movingRight: true,
              hotHoneyAffected: false,
              frozen: false,
            };
          }
          return customer;
        });
        newState.lives = Math.max(0, newState.lives - livesLost);
        if (livesLost > 0) {
          newState.stats.currentCustomerStreak = 0;
          if (lastReason) {
            newState.lastStarLostReason = lastReason;
          }
        }
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
        newState.powerUpAlert = { type: 'doge', endTime: now + 5000, chefLane: newState.chefLane };
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
          soundManager.nyanCatPowerUp();
          const dogeActive = newState.activePowerUps.some(p => p.type === 'doge');
          if (!dogeActive || newState.powerUpAlert?.type !== 'doge') {
            newState.powerUpAlert = { type: 'nyan', endTime: now + 3000, chefLane: newState.chefLane };
          }
        }
      } else {
        newState.activePowerUps = [
          ...newState.activePowerUps.filter(p => p.type !== type),
          { type: type, endTime: now + POWERUP_DURATION }
        ];
        // Hot honey overrides frozen and woozy states
        if (type === 'honey') {
          newState.customers = newState.customers.map(c =>
            (!c.served && !c.disappointed && !c.vomit)
              ? { ...c, shouldBeHotHoneyAffected: true, hotHoneyAffected: true, frozen: false, woozy: false, woozyState: undefined }
              : c
          );
        }
        // Ice cream overrides hot honey and woozy states (except Bad Luck Brian)
        if (type === 'ice-cream') {
          newState.customers = newState.customers.map(c => {
            if (!c.served && !c.disappointed && !c.vomit) {
              if (c.badLuckBrian) {
                return {
                  ...c,
                  textMessage: "I'm lactose intolerant",
                  textMessageTime: Date.now()
                };
              }
              return {
                ...c,
                shouldBeFrozenByIceCream: true,
                frozen: true,
                hotHoneyAffected: false,
                woozy: false,
                woozyState: undefined
              };
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
      customers: [],
      pizzaSlices: [],
      emptyPlates: [],
      droppedPlates: [],
      powerUps: [],
      activePowerUps: [],
      floatingScores: [],
      chefLane: 0,
      score: 0,
      lives: 3,
      level: 1,
      gameOver: false,
      lastStarLostReason: undefined,
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
      bossBattle: undefined,
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
          // Don't spawn regular customers during boss battle
          if (!current.bossBattle?.active) {
            // Increase spawn rate based on level (slower ramp)
            const levelSpawnRate = CUSTOMER_SPAWN_RATE + (current.level - 1) * 0.05;
            if (Math.random() < levelSpawnRate * 0.01) {
              spawnCustomer();
            }
          }
          // Spawn power-ups occasionally (also during boss battle)
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