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

import {
  processPowerUpCollection,
  processPowerUpExpirations
} from '../logic/powerUpSystem';

export const useGameLogic = (gameStarted: boolean = true) => {
  const [gameState, setGameState] = useState<GameState>({ ...INITIAL_GAME_STATE });
  const [lastCustomerSpawn, setLastCustomerSpawn] = useState(0);
  const [lastPowerUpSpawn, setLastPowerUpSpawn] = useState(0);
  
  const [ovenSoundStates, setOvenSoundStates] = useState<{ [key: number]: OvenSoundState }>({
    0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle'
  });
  
  const prevShowStoreRef = useRef(false);

  // --- Helpers ---
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
        id: `powerup-${now}-${lane}`, lane, position: POSITIONS.POWERUP_SPAWN_X, speed: ENTITY_SPEEDS.POWERUP, type: randomType,
      }],
    }));
    setLastPowerUpSpawn(now);
  }, [lastPowerUpSpawn]);

  const spawnCustomer = useCallback(() => {
    const now = Date.now();
    const spawnDelay = SPAWN_RATES.CUSTOMER_MIN_INTERVAL_BASE - (gameState.level * SPAWN_RATES.CUSTOMER_MIN_INTERVAL_DECREMENT);
    if (now - lastCustomerSpawn < spawnDelay || gameState.paused) return;

    const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
    const disappointedEmojis = ['😢', '😭', '😠', '🤬'];
    const isCritic = Math.random() < PROBABILITIES.CRITIC_CHANCE;
    const isBadLuckBrian = !isCritic && Math.random() < PROBABILITIES.BAD_LUCK_BRIAN_CHANCE;

    setGameState(prev => ({
      ...prev,
      customers: [...prev.customers, {
        id: `customer-${now}-${lane}`, lane, position: POSITIONS.SPAWN_X, speed: ENTITY_SPEEDS.CUSTOMER_BASE,
        served: false, hasPlate: false, leaving: false, disappointed: false,
        disappointedEmoji: disappointedEmojis[Math.floor(Math.random() * disappointedEmojis.length)],
        movingRight: false, critic: isCritic, badLuckBrian: isBadLuckBrian, flipped: isBadLuckBrian,
      }],
    }));
    setLastCustomerSpawn(now);
  }, [lastCustomerSpawn, gameState.level, gameState.paused]);

  // --- Main Logic ---
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

      // 1. OVEN TICK
      const ovenTickResult = processOvenTick(newState.ovens, ovenSoundStates, newState.ovenSpeedUpgrades, now);
      newState.ovens = ovenTickResult.nextOvens;
      if (JSON.stringify(ovenTickResult.nextSoundStates) !== JSON.stringify(ovenSoundStates)) setOvenSoundStates(ovenTickResult.nextSoundStates);
      ovenTickResult.events.forEach(event => {
        if (event.type === 'BURNED_ALIVE') {
          soundManager.ovenBurned(); soundManager.lifeLost();
          newState.lives = Math.max(0, newState.lives - 1);
          newState.lastStarLostReason = 'burned_pizza';
          if (newState.lives === 0) {
            newState.gameOver = true; soundManager.gameOver();
            newState.availableSlices = 0; newState.fallingPizza = { lane: newState.chefLane, y: 0 };
          }
        }
      });

      // 2. CUSTOMER POSITIONS
      const customerUpdate = updateCustomerPositions(newState.customers, newState.activePowerUps, now);
      newState.customers = customerUpdate.nextCustomers;
      if (customerUpdate.statsUpdate.customerStreakReset) newState.stats.currentCustomerStreak = 0;
      customerUpdate.events.forEach(event => {
        if (event === 'LIFE_LOST') { soundManager.customerDisappointed(); soundManager.lifeLost(); }
        if (event === 'STAR_LOST_CRITIC') newState.lives = Math.max(0, newState.lives - 2);
        if (event === 'STAR_LOST_NORMAL') newState.lives = Math.max(0, newState.lives - 1);
        if (event === 'GAME_OVER' && newState.lives === 0) { newState.gameOver = true; soundManager.gameOver(); }
      });

      // 3. PIZZA SLICE MOVEMENT & COLLISIONS
      const slicesToKeep: PizzaSlice[] = [];
      const pizzaHits: Array<{ points: number, lane: number, pos: number }> = [];
      newState.pizzaSlices.forEach(slice => {
        let hitSomething = false;
        const nextPos = slice.position + slice.speed;

        newState.customers = newState.customers.map(c => {
          if (hitSomething || c.served || c.disappointed || c.vomit || c.leaving) return c;
          if (c.lane === slice.lane && Math.abs(c.position - nextPos) < 5) {
            hitSomething = true;
            const hitResult = processCustomerHit(c, now);
            if (hitResult.newEntities.droppedPlate) newState.droppedPlates = [...newState.droppedPlates, hitResult.newEntities.droppedPlate];
            if (hitResult.newEntities.emptyPlate) newState.emptyPlates = [...newState.emptyPlates, hitResult.newEntities.emptyPlate];
            
            hitResult.events.forEach(e => {
              if (e === 'BRIAN_DROPPED_PLATE') { soundManager.plateDropped(); newState.stats.currentCustomerStreak = 0; }
              else {
                soundManager.customerServed();
                const base = (e === 'WOOZY_STEP_1') ? SCORING.CUSTOMER_FIRST_SLICE : (c.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL);
                const pts = Math.floor(base * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
                newState.score += pts; newState.bank += SCORING.BASE_BANK_REWARD * dogeMultiplier;
                pizzaHits.push({ points: pts, lane: c.lane, pos: c.position });
                if (e !== 'WOOZY_STEP_1') { newState.happyCustomers++; newState.stats.customersServed++; newState.stats.currentCustomerStreak++; }
              }
            });
            return hitResult.updatedCustomer;
          }
          return c;
        });

        if (!hitSomething) {
          const pUpHit = newState.powerUps.find(p => p.lane === slice.lane && Math.abs(p.position - nextPos) < 5);
          if (pUpHit) { hitSomething = true; soundManager.pizzaDestroyed(); newState.powerUps = newState.powerUps.filter(p => p.id !== pUpHit.id); }
        }
        if (!hitSomething && nextPos < POSITIONS.OFF_SCREEN_RIGHT) slicesToKeep.push({ ...slice, position: nextPos });
        else if (!hitSomething) newState.stats.currentPlateStreak = 0;
      });
      newState.pizzaSlices = slicesToKeep;
      pizzaHits.forEach(h => newState = addFloatingScore(h.points, h.lane, h.pos, newState));

      // 4. POWERUP & EXPIRATIONS
      const powerUpExpiry = processPowerUpExpirations(newState.activePowerUps, newState.customers, now);
      newState.activePowerUps = powerUpExpiry.stillActive;
      newState.customers = powerUpExpiry.nextCustomers;
      if (powerUpExpiry.expiredTypes.includes('star')) newState.starPowerActive = false;
      newState.floatingScores = newState.floatingScores.filter(fs => now - fs.startTime < TIMINGS.FLOATING_SCORE_LIFETIME);
      newState.droppedPlates = newState.droppedPlates.filter(dp => now - dp.startTime < TIMINGS.DROPPED_PLATE_LIFETIME);
      if (newState.powerUpAlert && now >= newState.powerUpAlert.endTime && (newState.powerUpAlert.type !== 'doge' || !hasDoge)) newState.powerUpAlert = undefined;

      // 5. STAR POWER AUTO-FEED
      if (hasStar && newState.availableSlices > 0) {
        newState.customers = newState.customers.map(c => {
          if (c.lane === newState.chefLane && !c.served && !c.disappointed && !c.vomit && Math.abs(c.position - GAME_CONFIG.CHEF_X_POSITION) < 8) {
            newState.availableSlices--;
            const hit = processCustomerHit(c, now);
            if (!c.badLuckBrian) {
              const pts = Math.floor((c.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL) * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
              newState.score += pts; newState.stats.customersServed++; newState.stats.currentCustomerStreak++;
              newState = addFloatingScore(pts, c.lane, c.position, newState);
            }
            return hit.updatedCustomer;
          }
          return c;
        });
      }

      // 6. CHEF PICKUPS (PowerUps)
      const pUpsToKeep: PowerUp[] = [];
      newState.powerUps.forEach(p => {
        const nextPos = p.position - p.speed;
        if (nextPos <= GAME_CONFIG.CHEF_X_POSITION && p.lane === newState.chefLane && !newState.nyanSweep?.active) {
          const res = processPowerUpCollection(newState, p, now);
          newState = { ...newState, ...res.newState };
          newState = addFloatingScore(SCORING.POWERUP_COLLECTED * dogeMultiplier, p.lane, p.position, newState);
          res.events.forEach(e => { if (e.type === 'SOUND') soundManager.powerUpCollected(e.effect as any); });
        } else if (nextPos > 0) pUpsToKeep.push({ ...p, position: nextPos });
      });
      newState.powerUps = pUpsToKeep;

      // 7. PLATE CATCHING (Restored Fixed Version)
      const platesToKeep: EmptyPlate[] = [];
      const caughtPlates: Array<{ points: number, lane: number, pos: number }> = [];
      newState.emptyPlates.forEach(plate => {
        const nextPos = plate.position - plate.speed;
        if (nextPos <= 10 && plate.lane === newState.chefLane && !newState.nyanSweep?.active) {
          soundManager.plateCaught();
          const pts = Math.floor(SCORING.PLATE_CAUGHT * dogeMultiplier * getStreakMultiplier(newState.stats.currentPlateStreak));
          newState.score += pts; newState.stats.platesCaught++; newState.stats.currentPlateStreak++;
          caughtPlates.push({ points: pts, lane: newState.chefLane, pos: 10 });
        } else if (nextPos <= 0) {
          soundManager.plateDropped(); newState.stats.currentPlateStreak = 0;
        } else {
          platesToKeep.push({ ...plate, position: nextPos });
        }
      });
      newState.emptyPlates = platesToKeep;
      caughtPlates.forEach(p => newState = addFloatingScore(p.points, p.lane, p.pos, newState));

      // 8. NYAN SWEEP
      if (newState.nyanSweep?.active) {
        const MAX_X = 90;
        const dt = Math.min(now - newState.nyanSweep.lastUpdateTime, 100);
        const INITIAL_X = GAME_CONFIG.CHEF_X_POSITION;
        const moveIncrement = ((MAX_X - INITIAL_X) / 2600) * dt;
        const newX = newState.nyanSweep.xPosition + moveIncrement;
        let newLane = newState.chefLane + (newState.nyanSweep.laneDirection * 0.01 * dt);
        let newDir = newState.nyanSweep.laneDirection;

        if (newLane > GAME_CONFIG.LANE_BOTTOM) { newLane = GAME_CONFIG.LANE_BOTTOM; newDir = -1; }
        else if (newLane < GAME_CONFIG.LANE_TOP) { newLane = GAME_CONFIG.LANE_TOP; newDir = 1; }

        newState.customers = newState.customers.map(c => {
          if (c.served || c.disappointed || c.vomit) return c;
          if (Math.abs(c.lane - newLane) < 0.8 && c.position >= newX - 10 && c.position <= newX + 10) {
            soundManager.customerServed();
            const pts = Math.floor((c.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL) * dogeMultiplier * getStreakMultiplier(newState.stats.currentCustomerStreak));
            newState.score += pts; newState.happyCustomers++; newState.stats.customersServed++; newState.stats.currentCustomerStreak++;
            newState = addFloatingScore(pts, c.lane, c.position, newState);
            return { ...c, served: true, hasPlate: false };
          }
          return c;
        });

        newState.chefLane = newLane;
        newState.nyanSweep = { ...newState.nyanSweep, xPosition: newX, laneDirection: newDir, lastUpdateTime: now };
        if (newX >= MAX_X) {
          newState.chefLane = Math.round(newState.chefLane);
          newState.nyanSweep = undefined;
          if (newState.pendingStoreShow) { newState.showStore = true; newState.pendingStoreShow = false; }
        }
      }

      // 9. LEVEL & BOSS LOGIC
      const targetLevel = Math.floor(newState.score / GAME_CONFIG.LEVEL_THRESHOLD) + 1;
      if (targetLevel > newState.level) {
        const oldLvl = newState.level; newState.level = targetLevel;
        const shopLvl = Math.floor(targetLevel / GAME_CONFIG.STORE_LEVEL_INTERVAL) * GAME_CONFIG.STORE_LEVEL_INTERVAL;
        if (shopLvl >= 10 && shopLvl > newState.lastStoreLevelShown) {
          newState.lastStoreLevelShown = shopLvl;
          if (newState.nyanSweep?.active) newState.pendingStoreShow = true; else newState.showStore = true;
        }
        const bossLvl = BOSS_CONFIG.TRIGGER_LEVELS.find(l => oldLvl < l && targetLevel >= l);
        if (bossLvl !== undefined && !newState.defeatedBossLevels.includes(bossLvl) && !newState.bossBattle?.active) {
          const mins: BossMinion[] = [];
          for (let i = 0; i < BOSS_CONFIG.MINIONS_PER_WAVE; i++) mins.push({ id: `m-${now}-${i}`, lane: i % 4, position: POSITIONS.SPAWN_X + (Math.floor(i / 4) * 15), speed: ENTITY_SPEEDS.MINION, defeated: false });
          newState.bossBattle = { active: true, bossHealth: BOSS_CONFIG.HEALTH, currentWave: 1, minions: mins, bossVulnerable: true, bossDefeated: false, bossPosition: BOSS_CONFIG.BOSS_POSITION };
        }
      }

      // Boss Minion Movement
      if (newState.bossBattle?.active && !newState.bossBattle.bossDefeated) {
        newState.bossBattle.minions = newState.bossBattle.minions.map(m => m.defeated ? m : { ...m, position: m.position - m.speed });
        newState.bossBattle.minions.forEach(m => {
          if (!m.defeated && m.position <= GAME_CONFIG.CHEF_X_POSITION) {
            soundManager.lifeLost(); newState.lives = Math.max(0, newState.lives - 1); m.defeated = true;
            if (newState.lives === 0) { newState.gameOver = true; }
          }
        });
      }

      return newState;
    });
  }, [gameState.gameOver, gameState.paused, ovenSoundStates, addFloatingScore]);

  // --- External Actions ---
  const servePizza = useCallback(() => {
    if (gameState.gameOver || gameState.paused || gameState.availableSlices <= 0 || gameState.nyanSweep?.active) return;
    soundManager.servePizza();
    setGameState(prev => ({
      ...prev,
      pizzaSlices: [...prev.pizzaSlices, { id: `pizza-${Date.now()}`, lane: prev.chefLane, position: GAME_CONFIG.CHEF_X_POSITION, speed: ENTITY_SPEEDS.PIZZA }],
      availableSlices: prev.availableSlices - 1,
    }));
  }, [gameState.gameOver, gameState.paused, gameState.chefLane, gameState.availableSlices, gameState.nyanSweep?.active]);

  const moveChef = useCallback((dir: 'up' | 'down') => {
    if (gameState.gameOver || gameState.paused || gameState.nyanSweep?.active) return;
    setGameState(prev => {
      let lane = prev.chefLane;
      if (dir === 'up' && lane > GAME_CONFIG.LANE_TOP) lane -= 1;
      else if (dir === 'down' && lane < GAME_CONFIG.LANE_BOTTOM) lane += 1;
      return { ...prev, chefLane: lane };
    });
  }, [gameState.gameOver, gameState.paused, gameState.nyanSweep?.active]);

  const buyPowerUp = (type: 'beer' | 'ice-cream' | 'honey') => setGameState(prev => {
    if (prev.bank < COSTS.BUY_POWERUP) return prev;
    return { ...prev, bank: prev.bank - COSTS.BUY_POWERUP, powerUps: [...prev.powerUps, { id: `b-${Date.now()}`, lane: prev.chefLane, position: POSITIONS.SPAWN_X, speed: ENTITY_SPEEDS.POWERUP, type }] };
  });

  const debugActivatePowerUp = (type: PowerUpType) => setGameState(prev => {
    const res = processPowerUpCollection(prev, { id: 'd', type, lane: 0, position: 0, speed: 0 }, Date.now());
    return { ...prev, ...res.newState };
  });

  useEffect(() => {
    if (!gameStarted) return;
    const loop = setInterval(() => updateGame(), GAME_CONFIG.GAME_LOOP_INTERVAL);
    return () => clearInterval(loop);
  }, [gameStarted, updateGame]);

  return {
    gameState, servePizza, moveChef, buyPowerUp, debugActivatePowerUp,
    useOven, cleanOven,
    upgradeOven: (lane: number) => setGameState(p => (p.bank >= COSTS.OVEN_UPGRADE && (p.ovenUpgrades[lane] || 0) < OVEN_CONFIG.MAX_UPGRADE_LEVEL) ? { ...p, bank: p.bank - COSTS.OVEN_UPGRADE, ovenUpgrades: { ...p.ovenUpgrades, [lane]: (p.ovenUpgrades[lane] || 0) + 1 }, stats: { ...p.stats, ovenUpgradesMade: p.stats.ovenUpgradesMade + 1 } } : p),
    upgradeOvenSpeed: (lane: number) => setGameState(p => (p.bank >= COSTS.OVEN_SPEED_UPGRADE && (p.ovenSpeedUpgrades[lane] || 0) < OVEN_CONFIG.MAX_SPEED_LEVEL) ? { ...p, bank: p.bank - COSTS.OVEN_SPEED_UPGRADE, ovenSpeedUpgrades: { ...p.ovenSpeedUpgrades, [lane]: (p.ovenSpeedUpgrades[lane] || 0) + 1 }, stats: { ...p.stats, ovenUpgradesMade: p.stats.ovenUpgradesMade + 1 } } : p),
    togglePause: () => setGameState(p => ({ ...p, paused: !p.paused, ovens: calculateOvenPauseState(p.ovens, !p.paused, Date.now()) })),
    resetGame: () => { setGameState({ ...INITIAL_GAME_STATE }); setOvenSoundStates({ 0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle' }); },
    closeStore: () => setGameState(p => ({ ...p, showStore: false })),
    bribeReviewer: () => setGameState(p => (p.bank >= COSTS.BRIBE_REVIEWER && p.lives < GAME_CONFIG.MAX_LIVES) ? { ...p, bank: p.bank - COSTS.BRIBE_REVIEWER, lives: p.lives + 1 } : p),
  };
};