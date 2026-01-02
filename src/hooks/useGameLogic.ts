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

  // --- Core Helpers ---

  const triggerGameOver = useCallback((state: GameState): GameState => {
    soundManager.gameOver();
    const fallingPizza = state.availableSlices > 0 ? { lane: state.chefLane, y: 0 } : undefined;
    return { ...state, gameOver: true, fallingPizza, availableSlices: 0 };
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

  const spawnBossWave = useCallback((waveNumber: number): BossMinion[] => {
    const minions: BossMinion[] = [];
    const now = Date.now();
    for (let i = 0; i < BOSS_CONFIG.MINIONS_PER_WAVE; i++) {
      minions.push({
        id: `minion-${now}-${waveNumber}-${i}`,
        lane: i % 4,
        position: POSITIONS.SPAWN_X + (Math.floor(i / 4) * 15),
        speed: ENTITY_SPEEDS.MINION,
        defeated: false,
      });
    }
    return minions;
  }, []);

  const checkProgression = useCallback((state: GameState): GameState => {
    const targetLevel = Math.floor(state.score / GAME_CONFIG.LEVEL_THRESHOLD) + 1;
    let newState = { ...state };

    if (targetLevel > state.level) {
      const oldLevel = state.level;
      newState.level = targetLevel;

      const highestStoreLevel = Math.floor(targetLevel / GAME_CONFIG.STORE_LEVEL_INTERVAL) * GAME_CONFIG.STORE_LEVEL_INTERVAL;
      if (highestStoreLevel >= 10 && highestStoreLevel > state.lastStoreLevelShown) {
        newState.lastStoreLevelShown = highestStoreLevel;
        if (newState.nyanSweep?.active) newState.pendingStoreShow = true;
        else newState.showStore = true;
      }

      const crossedBossLevel = BOSS_CONFIG.TRIGGER_LEVELS.find(lvl => oldLevel < lvl && targetLevel >= lvl);
      if (crossedBossLevel !== undefined && !state.defeatedBossLevels.includes(crossedBossLevel) && !state.bossBattle?.active) {
        newState.bossBattle = {
          active: true, bossHealth: BOSS_CONFIG.HEALTH, currentWave: 1,
          minions: spawnBossWave(1), bossVulnerable: false, bossDefeated: false,
          bossPosition: BOSS_CONFIG.BOSS_POSITION,
        };
      }
    }
    return newState;
  }, [spawnBossWave]);

  const applyPowerUpEffect = useCallback((type: PowerUpType, state: GameState, now: number): GameState => {
    let newState = { ...state, stats: { ...state.stats, powerUpsUsed: { ...state.stats.powerUpsUsed, [type]: (state.stats.powerUpsUsed[type] || 0) + 1 } } };
    const hasDoge = state.activePowerUps.some(p => p.type === 'doge');

    switch (type) {
      case 'beer':
        let livesLost = 0;
        newState.customers = newState.customers.map(c => {
          if (c.critic) return (!c.served && !c.leaving) ? { ...c, textMessage: "I prefer wine", textMessageTime: now } : c;
          if (c.woozy) { livesLost++; return { ...c, woozy: false, vomit: true, disappointed: true, movingRight: true }; }
          if (!c.served && !c.disappointed && !c.leaving) {
            if (c.badLuckBrian) { livesLost++; return { ...c, vomit: true, disappointed: true, movingRight: true, textMessage: "Oh man I hurled", textMessageTime: now }; }
            return { ...c, woozy: true, movingRight: true };
          }
          return c;
        });
        newState.lives = Math.max(0, newState.lives - livesLost);
        if (livesLost > 0) { soundManager.lifeLost(); newState.stats.currentCustomerStreak = 0; }
        if (newState.lives === 0) newState = triggerGameOver(newState);
        break;

      case 'star':
        newState.availableSlices = GAME_CONFIG.MAX_SLICES;
        newState.starPowerActive = true;
        newState.activePowerUps = [...state.activePowerUps.filter(p => p.type !== 'star'), { type: 'star', endTime: now + POWERUPS.DURATION }];
        break;

      case 'doge':
        newState.activePowerUps = [...state.activePowerUps.filter(p => p.type !== 'doge'), { type: 'doge', endTime: now + POWERUPS.DURATION }];
        newState.powerUpAlert = { type: 'doge', endTime: now + POWERUPS.ALERT_DURATION_DOGE, chefLane: state.chefLane };
        break;

      case 'nyan':
        if (!state.nyanSweep?.active) {
          newState.nyanSweep = { active: true, xPosition: GAME_CONFIG.CHEF_X_POSITION, laneDirection: 1, startTime: now, lastUpdateTime: now, startingLane: state.chefLane };
          soundManager.nyanCatPowerUp();
          if (!hasDoge) newState.powerUpAlert = { type: 'nyan', endTime: now + POWERUPS.ALERT_DURATION_NYAN, chefLane: state.chefLane };
        }
        break;

      case 'moltobenny':
        const mult = hasDoge ? 2 : 1;
        newState.score += SCORING.MOLTOBENNY_POINTS * mult;
        newState.bank += SCORING.MOLTOBENNY_CASH * mult;
        newState = checkProgression(newState);
        break;

      default:
        newState.activePowerUps = [...state.activePowerUps.filter(p => p.type !== type), { type: type, endTime: now + POWERUPS.DURATION }];
        newState.customers = newState.customers.map(c => {
          if (c.served || c.leaving) return c;
          if (type === 'honey') return c.badLuckBrian ? { ...c, textMessage: "Too spicy!", textMessageTime: now } : { ...c, hotHoneyAffected: true };
          if (type === 'ice-cream') return c.badLuckBrian ? { ...c, textMessage: "Lactose!", textMessageTime: now } : { ...c, frozen: true };
          return c;
        });
    }
    return newState;
  }, [checkProgression, triggerGameOver]);

  // --- Spawning ---

  const spawnCustomer = useCallback(() => {
    const now = Date.now();
    const spawnDelay = SPAWN_RATES.CUSTOMER_MIN_INTERVAL_BASE - (gameState.level * SPAWN_RATES.CUSTOMER_MIN_INTERVAL_DECREMENT);
    if (now - lastCustomerSpawn < spawnDelay || gameState.paused) return;

    const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
    const isCritic = Math.random() < PROBABILITIES.CRITIC_CHANCE;
    const isBadLuckBrian = !isCritic && Math.random() < PROBABILITIES.BAD_LUCK_BRIAN_CHANCE;

    setGameState(prev => ({
      ...prev,
      customers: [...prev.customers, {
        id: `customer-${now}-${lane}`, lane, position: POSITIONS.SPAWN_X, speed: ENTITY_SPEEDS.CUSTOMER_BASE,
        served: false, hasPlate: false, leaving: false, disappointed: false, movingRight: false,
        critic: isCritic, badLuckBrian: isBadLuckBrian, flipped: isBadLuckBrian,
        disappointedEmoji: ['😢', '😭', '😠', '🤬'][Math.floor(Math.random() * 4)],
      }],
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
      powerUps: [...prev.powerUps, { id: `powerup-${now}-${lane}`, lane, position: POSITIONS.POWERUP_SPAWN_X, speed: ENTITY_SPEEDS.POWERUP, type }],
    }));
    setLastPowerUpSpawn(now);
  }, [lastPowerUpSpawn]);

  // --- Actions ---

  const servePizza = useCallback(() => {
    if (gameState.gameOver || gameState.paused || gameState.availableSlices <= 0 || gameState.nyanSweep?.active) return;
    soundManager.servePizza();
    setGameState(prev => ({
      ...prev,
      pizzaSlices: [...prev.pizzaSlices, { id: `pizza-${Date.now()}`, lane: prev.chefLane, position: GAME_CONFIG.CHEF_X_POSITION, speed: ENTITY_SPEEDS.PIZZA }],
      availableSlices: prev.availableSlices - 1,
    }));
  }, [gameState]);

  const moveChef = useCallback((direction: 'up' | 'down') => {
    if (gameState.gameOver || gameState.paused || gameState.nyanSweep?.active) return;
    setGameState(prev => {
      let newLane = prev.chefLane;
      if (direction === 'up' && newLane > GAME_CONFIG.LANE_TOP) newLane -= 1;
      else if (direction === 'down' && newLane < GAME_CONFIG.LANE_BOTTOM) newLane += 1;
      return { ...prev, chefLane: newLane };
    });
  }, [gameState]);

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
      return result.newState ? { ...prev, ...result.newState } : prev;
    });
  }, [gameState]);

  // --- Main Loop ---

  const updateGame = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver) {
        if (!prev.fallingPizza) return prev;
        const newY = prev.fallingPizza.y + ENTITY_SPEEDS.FALLING_PIZZA;
        return newY > 400 ? { ...prev, fallingPizza: undefined } : { ...prev, fallingPizza: { ...prev.fallingPizza, y: newY } };
      }
      if (prev.paused) return prev;

      let newState = { ...prev };
      const now = Date.now();
      const dogeMultiplier = newState.activePowerUps.some(p => p.type === 'doge') ? 2 : 1;

      // 1. Ovens
      const ovenResult = processOvenTick(newState.ovens, ovenSoundStates, newState.ovenSpeedUpgrades, now);
      newState.ovens = ovenResult.nextOvens;
      setOvenSoundStates(ovenResult.nextSoundStates);
      
      ovenResult.events.forEach(e => {
        if (e.type === 'BURNED_ALIVE') {
          soundManager.ovenBurned(); soundManager.lifeLost();
          newState.lives = Math.max(0, newState.lives - 1);
          if (newState.lives === 0) newState = triggerGameOver(newState);
        } else if (e.type === 'SOUND_READY') soundManager.ovenReady();
      });

      // 2. Customers & Collision
      const customerUpdate = updateCustomerPositions(newState.customers, newState.activePowerUps, now);
      newState.customers = customerUpdate.nextCustomers;
      if (customerUpdate.statsUpdate.customerStreakReset) newState.stats.currentCustomerStreak = 0;
      
      customerUpdate.events.forEach(e => {
        if (e.includes('STAR_LOST')) {
          newState.lives = Math.max(0, newState.lives - (e === 'STAR_LOST_CRITIC' ? 2 : 1));
          if (newState.lives === 0) newState = triggerGameOver(newState);
        }
      });

      newState.pizzaSlices = newState.pizzaSlices.map(s => ({ ...s, position: s.position + s.speed }));
      const remainingSlices: PizzaSlice[] = [];

      newState.pizzaSlices.forEach(slice => {
        let hit = false;
        newState.customers = newState.customers.map(c => {
          if (hit || c.served || c.disappointed || c.leaving) return c;
          if (c.lane === slice.lane && Math.abs(c.position - slice.position) < 5) {
            hit = true;
            const res = processCustomerHit(c, now);
            if (res.newEntities.emptyPlate) newState.emptyPlates.push(res.newEntities.emptyPlate);
            
            // Score Handling
            const points = Math.floor(SCORING.CUSTOMER_NORMAL * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
            newState.score += points;
            newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
            newState = addFloatingScore(points, c.lane, c.position, newState);
            newState = checkProgression(newState);
            return res.updatedCustomer;
          }
          return c;
        });
        if (!hit && slice.position < POSITIONS.OFF_SCREEN_RIGHT) remainingSlices.push(slice);
      });
      newState.pizzaSlices = remainingSlices;

      // 3. Power-Up Collection
      newState.powerUps = newState.powerUps.map(p => ({ ...p, position: p.position - p.speed })).filter(p => {
        if (p.position <= GAME_CONFIG.CHEF_X_POSITION && p.lane === newState.chefLane) {
          soundManager.powerUpCollected(p.type);
          newState = applyPowerUpEffect(p.type, newState, now);
          return false;
        }
        return p.position > 0;
      });

      // 4. Plate Catching
      newState.emptyPlates = newState.emptyPlates.map(p => ({ ...p, position: p.position - p.speed })).filter(p => {
        if (p.position <= 10 && p.lane === newState.chefLane) {
          soundManager.plateCaught();
          newState.score += SCORING.PLATE_CAUGHT * dogeMultiplier;
          newState = checkProgression(newState);
          return false;
        }
        return p.position > 0;
      });

      return newState;
    });
  }, [ovenSoundStates, triggerGameOver, addFloatingScore, checkProgression, applyPowerUpEffect]);

  // --- Effects & Lifecycle ---

  useEffect(() => {
    if (!gameStarted) return;
    const interval = setInterval(updateGame, GAME_CONFIG.GAME_LOOP_INTERVAL);
    return () => clearInterval(interval);
  }, [gameStarted, updateGame]);

  useEffect(() => {
    if (!gameStarted || gameState.paused || gameState.gameOver) return;
    const spawnInterval = setInterval(() => {
      if (Math.random() < SPAWN_RATES.CUSTOMER_BASE_RATE * 0.01) spawnCustomer();
      if (Math.random() < SPAWN_RATES.POWERUP_CHANCE) spawnPowerUp();
    }, 100);
    return () => clearInterval(spawnInterval);
  }, [gameStarted, gameState.paused, gameState.gameOver, spawnCustomer, spawnPowerUp]);

  return {
    gameState, servePizza, moveChef, useOven, 
    resetGame: () => setGameState({ ...INITIAL_GAME_STATE }),
    togglePause: () => setGameState(p => ({ ...p, paused: !p.paused })),
    debugActivatePowerUp: (type: PowerUpType) => setGameState(p => applyPowerUpEffect(type, p, Date.now()))
  };
};