import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Customer, PizzaSlice, PowerUp, PowerUpType, BossMinion, StarLostReason } from '../types/game';
import { soundManager } from '../utils/sounds';
import { calculateNextGameState } from '../lib/gameEngine';
import { 
  GAME_CONFIG, 
  OVEN_CONFIG, 
  ENTITY_SPEEDS, 
  SPAWN_RATES, 
  PROBABILITIES, 
  COSTS, 
  BOSS_CONFIG, 
  POWERUPS, 
  POSITIONS 
} from '../lib/constants';

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
  const [ovenSoundStates, setOvenSoundStates] = useState<{[key: number]: 'idle' | 'cooking' | 'ready' | 'warning' | 'burning'}>({
    0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle'
  });
  const prevShowStoreRef = useRef(false);

  const spawnPowerUp = useCallback(() => {
    const now = Date.now();
    if (now - lastPowerUpSpawn < SPAWN_RATES.POWERUP_MIN_INTERVAL) return;

    const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
    const rand = Math.random();
    const randomType = rand < PROBABILITIES.POWERUP_STAR_CHANCE ? 'star' : POWERUPS.TYPES[Math.floor(Math.random() * POWERUPS.TYPES.length)];

    const newPowerUp: PowerUp = {
      id: `powerup-${now}-${lane}`,
      lane,
      position: POSITIONS.POWERUP_SPAWN_X,
      speed: ENTITY_SPEEDS.POWERUP,
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
    const spawnDelay = SPAWN_RATES.CUSTOMER_MIN_INTERVAL_BASE - (gameState.level * SPAWN_RATES.CUSTOMER_MIN_INTERVAL_DECREMENT);
    if (now - lastCustomerSpawn < spawnDelay) return;

    if (gameState.paused) return;

    const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
    const disappointedEmojis = ['😢', '😭', '😠', '🤬'];
    const isCritic = Math.random() < PROBABILITIES.CRITIC_CHANCE;
    const isBadLuckBrian = !isCritic && Math.random() < PROBABILITIES.BAD_LUCK_BRIAN_CHANCE;
    
    const newCustomer: Customer = {
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
    };

    setGameState(prev => ({
      ...prev,
      customers: [...prev.customers, newCustomer],
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

  const startBossBattle = useCallback(() => {
    setGameState(prev => {
      if (prev.bossBattle?.active) return prev;

      const initialMinions = spawnBossWave(1);
      return {
        ...prev,
        customers: [],
        bossBattle: {
          active: true,
          bossHealth: BOSS_CONFIG.HEALTH,
          currentWave: 1,
          minions: initialMinions,
          bossVulnerable: true,
          bossDefeated: false,
          bossPosition: BOSS_CONFIG.BOSS_POSITION,
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
      position: GAME_CONFIG.CHEF_X_POSITION,
      speed: ENTITY_SPEEDS.PIZZA,
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
      if (direction === 'up' && newLane > GAME_CONFIG.LANE_TOP) {
        newLane -= 1;
      } else if (direction === 'down' && newLane < GAME_CONFIG.LANE_BOTTOM) {
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

      if (currentOven.burned) return prev;

      if (!currentOven.cooking) {
        soundManager.ovenStart();
        setOvenSoundStates(prevStates => ({ ...prevStates, [prev.chefLane]: 'cooking' }));
        const slicesProduced = 1 + (prev.ovenUpgrades[prev.chefLane] || 0);
        return {
          ...prev,
          ovens: {
            ...prev.ovens,
            [prev.chefLane]: { cooking: true, startTime: now, burned: false, cleaningStartTime: 0, sliceCount: slicesProduced }
          }
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
      const { nextState, nextOvenSounds } = calculateNextGameState(prev, ovenSoundStates);
      
      // Update local sound state if changed
      if (JSON.stringify(nextOvenSounds) !== JSON.stringify(ovenSoundStates)) {
        setOvenSoundStates(nextOvenSounds);
      }
      
      return nextState;
    });
  }, [ovenSoundStates]);

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
          if (customer.critic && !customer.served && !customer.vomit && !customer.leaving) {
            return {
              ...customer,
              textMessage: "I prefer wine",
              textMessageTime: Date.now(),
            };
          }

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