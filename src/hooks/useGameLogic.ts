import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  Customer,
  PizzaSlice,
  EmptyPlate,
  PowerUp,
  PowerUpType,
  FloatingScore,
  DroppedPlate,
  StarLostReason,
  BossMinion,
} from '../types/game';
import { soundManager } from '../utils/sounds';
import { getStreakMultiplier } from '../components/StreakDisplay';
import {
  GAME_CONFIG,
  OVEN_CONFIG,
  ENTITY_SPEEDS,
  SPAWN_RATES,
  PROBABILITIES,
  SCORING,
  COSTS,
  BOSS_CONFIG,
  POWERUPS,
  TIMINGS,
  POSITIONS,
} from '../lib/constants';

/**
 * Refactor goals in this single file:
 * - Remove duplicated initial state literals (makeInitialState)
 * - Centralize repeated patterns: loseLives/triggerGameOver, awardPoints, brianDropsSlice, serveCustomerAndSpawnPlate
 * - Break updateGame into named “systems” for readability (still in same file)
 * - Keep external hook API identical
 *
 * NOTE: This keeps your existing logic structure, but reorganizes it.
 */

const LANES = [0, 1, 2, 3] as const;
type Lane = (typeof LANES)[number];
type OvenSound = 'idle' | 'cooking' | 'ready' | 'warning' | 'burning';

const makeOvens = () =>
  Object.fromEntries(
    LANES.map(l => [l, { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 }])
  ) as GameState['ovens'];

const makeZeroLanes = () => Object.fromEntries(LANES.map(l => [l, 0])) as Record<number, number>;

const makeStats = (): GameState['stats'] => ({
  slicesBaked: 0,
  customersServed: 0,
  longestCustomerStreak: 0,
  currentCustomerStreak: 0,
  platesCaught: 0,
  largestPlateStreak: 0,
  currentPlateStreak: 0,
  powerUpsUsed: { honey: 0, 'ice-cream': 0, beer: 0, star: 0, doge: 0, nyan: 0, moltobenny: 0 },
  ovenUpgradesMade: 0,
});

const makeInitialState = (): GameState => ({
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
  ovens: makeOvens(),
  ovenUpgrades: makeZeroLanes(),
  ovenSpeedUpgrades: makeZeroLanes(),
  happyCustomers: 0,
  bank: 0,
  showStore: false,
  lastStoreLevelShown: 0,
  pendingStoreShow: false,
  fallingPizza: undefined,
  starPowerActive: false,
  powerUpAlert: undefined,
  stats: makeStats(),
  bossBattle: undefined,
  lastStarLostReason: undefined,
});

// “draft” style helper without external libs
type Draft = GameState;
function withDraft(prev: GameState, fn: (s: Draft) => void): GameState {
  const next: Draft = {
    ...prev,
    stats: { ...prev.stats, powerUpsUsed: { ...prev.stats.powerUpsUsed } },
    ovens: { ...prev.ovens },
    ovenUpgrades: { ...prev.ovenUpgrades },
    ovenSpeedUpgrades: { ...prev.ovenSpeedUpgrades },
    customers: [...prev.customers],
    pizzaSlices: [...prev.pizzaSlices],
    emptyPlates: [...prev.emptyPlates],
    powerUps: [...prev.powerUps],
    activePowerUps: [...prev.activePowerUps],
    floatingScores: [...prev.floatingScores],
    droppedPlates: [...prev.droppedPlates],
    bossBattle: prev.bossBattle ? { ...prev.bossBattle, minions: [...prev.bossBattle.minions] } : undefined,
  };
  fn(next);
  return next;
}

function clampLaneFloat(lane: number) {
  return Math.max(GAME_CONFIG.LANE_TOP, Math.min(GAME_CONFIG.LANE_BOTTOM, lane));
}

function createDroppedPlate(customer: Customer, now: number): DroppedPlate {
  return {
    id: `dropped-${now}-${customer.id}`,
    lane: customer.lane,
    position: customer.position,
    startTime: now,
    hasSlice: true,
  };
}

export const useGameLogic = (gameStarted: boolean = true) => {
  const [gameState, setGameState] = useState<GameState>(makeInitialState);

  const [lastCustomerSpawn, setLastCustomerSpawn] = useState(0);
  const [lastPowerUpSpawn, setLastPowerUpSpawn] = useState(0);

  const [ovenSoundStates, setOvenSoundStates] = useState<{ [key: number]: OvenSound }>({
    0: 'idle',
    1: 'idle',
    2: 'idle',
    3: 'idle',
  });

  const prevShowStoreRef = useRef(false);

  /** Floating score helper (kept as your immutable-return pattern) */
  const addFloatingScore = useCallback((points: number, lane: number, position: number, state: GameState): GameState => {
    const now = Date.now();
    const newFloatingScore: FloatingScore = {
      id: `score-${now}-${Math.random()}`,
      points,
      lane,
      position,
      startTime: now,
    };
    return { ...state, floatingScores: [...state.floatingScores, newFloatingScore] };
  }, []);

  /** ===== Centralized repeated patterns ===== */

  const triggerGameOver = useCallback((s: Draft) => {
    s.gameOver = true;
    soundManager.gameOver();
    if (s.availableSlices > 0) {
      s.fallingPizza = { lane: s.chefLane, y: 0 };
      s.availableSlices = 0;
    }
  }, []);

  const loseLives = useCallback(
    (s: Draft, amount: number, reason?: StarLostReason) => {
      if (amount <= 0) return;
      soundManager.lifeLost();
      s.lives = Math.max(0, s.lives - amount);
      if (reason) s.lastStarLostReason = reason;
      // (your code resets streak in multiple places; centralize)
      s.stats.currentCustomerStreak = 0;
      if (s.lives === 0) triggerGameOver(s);
    },
    [triggerGameOver]
  );

  const awardPoints = useCallback(
    (s: Draft, points: number, lane: number, position: number) => {
      s.score += points;
      const next = addFloatingScore(points, lane, position, s);
      s.floatingScores = next.floatingScores;
    },
    [addFloatingScore]
  );

  const brianDropsSlice = useCallback(
    (s: Draft, customer: Customer, now: number, message: string) => {
      soundManager.plateDropped();
      s.stats.currentCustomerStreak = 0;
      s.stats.currentPlateStreak = 0;
      s.droppedPlates.push(createDroppedPlate(customer, now));
      return {
        ...customer,
        flipped: false,
        leaving: true,
        movingRight: true,
        textMessage: message,
        textMessageTime: now,
      };
    },
    []
  );

  const serveCustomerAndSpawnPlate = useCallback(
    (s: Draft, customer: Customer, now: number, hasDoge: boolean) => {
      soundManager.customerServed();

      const base = customer.critic ? SCORING.CUSTOMER_CRITIC : SCORING.CUSTOMER_NORMAL;
      const dogeMult = hasDoge ? 2 : 1;
      const streakMult = getStreakMultiplier(s.stats.currentCustomerStreak);
      const points = Math.floor(base * dogeMult * streakMult);

      s.bank += SCORING.BASE_BANK_REWARD * dogeMult;
      s.happyCustomers += 1;
      s.stats.customersServed += 1;
      s.stats.currentCustomerStreak += 1;
      s.stats.longestCustomerStreak = Math.max(s.stats.longestCustomerStreak, s.stats.currentCustomerStreak);

      awardPoints(s, points, customer.lane, customer.position);

      if (!customer.critic && s.happyCustomers % 8 === 0 && s.lives < GAME_CONFIG.MAX_LIVES) {
        const stars = Math.min(hasDoge ? 2 : 1, GAME_CONFIG.MAX_LIVES - s.lives);
        if (stars > 0) soundManager.lifeGained();
        s.lives += stars;
      }

      s.emptyPlates.push({
        id: `plate-${now}-${customer.id}`,
        lane: customer.lane,
        position: customer.position,
        speed: ENTITY_SPEEDS.PLATE,
      });

      return { ...customer, served: true, hasPlate: false };
    },
    [awardPoints]
  );

  /** ===== Spawns ===== */

  const spawnPowerUp = useCallback(() => {
    const now = Date.now();
    if (now - lastPowerUpSpawn < SPAWN_RATES.POWERUP_MIN_INTERVAL) return;

    const lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
    const rand = Math.random();
    const randomType =
      rand < PROBABILITIES.POWERUP_STAR_CHANCE
        ? 'star'
        : POWERUPS.TYPES[Math.floor(Math.random() * POWERUPS.TYPES.length)];

    const newPowerUp: PowerUp = {
      id: `powerup-${now}-${lane}`,
      lane,
      position: POSITIONS.POWERUP_SPAWN_X,
      speed: ENTITY_SPEEDS.POWERUP,
      type: randomType,
    };

    setGameState(prev => ({ ...prev, powerUps: [...prev.powerUps, newPowerUp] }));
    setLastPowerUpSpawn(now);
  }, [lastPowerUpSpawn]);

  const spawnCustomer = useCallback(() => {
    const now = Date.now();
    const spawnDelay = SPAWN_RATES.CUSTOMER_MIN_INTERVAL_BASE - gameState.level * SPAWN_RATES.CUSTOMER_MIN_INTERVAL_DECREMENT;
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

    setGameState(prev => ({ ...prev, customers: [...prev.customers, newCustomer] }));
    setLastCustomerSpawn(now);
  }, [lastCustomerSpawn, gameState.level, gameState.paused]);

  const spawnBossWave = useCallback((waveNumber: number): BossMinion[] => {
    const now = Date.now();
    return Array.from({ length: BOSS_CONFIG.MINIONS_PER_WAVE }, (_, i) => ({
      id: `minion-${now}-${waveNumber}-${i}`,
      lane: i % 4,
      position: POSITIONS.SPAWN_X + Math.floor(i / 4) * 15,
      speed: ENTITY_SPEEDS.MINION,
      defeated: false,
    }));
  }, []);

  const startBossBattle = useCallback(() => {
    setGameState(prev => {
      if (prev.bossBattle?.active) return prev;
      return {
        ...prev,
        customers: [],
        bossBattle: {
          active: true,
          bossHealth: BOSS_CONFIG.HEALTH,
          currentWave: 1,
          minions: spawnBossWave(1),
          bossVulnerable: true,
          bossDefeated: false,
          bossPosition: BOSS_CONFIG.BOSS_POSITION,
        },
      };
    });
  }, [spawnBossWave]);

  /** ===== Player actions ===== */

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
  }, [gameState.gameOver, gameState.paused, gameState.availableSlices, gameState.chefLane, gameState.nyanSweep?.active]);

  const moveChef = useCallback(
    (direction: 'up' | 'down') => {
      if (gameState.gameOver || gameState.paused || gameState.nyanSweep?.active) return;

      setGameState(prev => {
        let newLane = prev.chefLane;
        if (direction === 'up' && newLane > GAME_CONFIG.LANE_TOP) newLane -= 1;
        if (direction === 'down' && newLane < GAME_CONFIG.LANE_BOTTOM) newLane += 1;
        return { ...prev, chefLane: newLane };
      });
    },
    [gameState.gameOver, gameState.paused, gameState.nyanSweep?.active]
  );

  const useOven = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;

    setGameState(prev =>
      withDraft(prev, s => {
        const lane = s.chefLane as number;
        const currentOven = s.ovens[lane];
        const now = Date.now();
        if (currentOven.burned) return;

        if (!currentOven.cooking) {
          soundManager.ovenStart();
          setOvenSoundStates(prevStates => ({ ...prevStates, [lane]: 'cooking' }));
          const slicesProduced = 1 + (s.ovenUpgrades[lane] || 0);
          s.ovens[lane] = { cooking: true, startTime: now, burned: false, cleaningStartTime: 0, sliceCount: slicesProduced };
          return;
        }

        const speedUpgrade = s.ovenSpeedUpgrades[lane] || 0;
        const cookTime = OVEN_CONFIG.COOK_TIMES[speedUpgrade];

        if (now - currentOven.startTime >= cookTime && now - currentOven.startTime < OVEN_CONFIG.BURN_TIME) {
          const slicesProduced = currentOven.sliceCount;
          const newTotal = s.availableSlices + slicesProduced;

          if (newTotal <= GAME_CONFIG.MAX_SLICES) {
            soundManager.servePizza();
            setOvenSoundStates(prevStates => ({ ...prevStates, [lane]: 'idle' }));
            s.availableSlices = newTotal;
            s.ovens[lane] = { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 };
            s.stats.slicesBaked += slicesProduced;
          }
        }
      })
    );
  }, [gameState.gameOver, gameState.paused, gameState.chefLane]);

  const cleanOven = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;

    setGameState(prev =>
      withDraft(prev, s => {
        const lane = s.chefLane as number;
        const currentOven = s.ovens[lane];
        const now = Date.now();
        if (currentOven.burned && currentOven.cleaningStartTime === 0) {
          soundManager.cleaningStart();
          s.ovens[lane] = { ...currentOven, cleaningStartTime: now };
        }
      })
    );
  }, [gameState.gameOver, gameState.paused, gameState.chefLane]);

  /** ===== Systems used by updateGame ===== */

  const tickFallingPizza = useCallback((s: Draft) => {
    if (!s.fallingPizza) return;
    const newY = s.fallingPizza.y + ENTITY_SPEEDS.FALLING_PIZZA;
    s.fallingPizza = newY > 400 ? undefined : { ...s.fallingPizza, y: newY };
  }, []);

  const ovenPhase = (elapsed: number, cookTime: number): OvenSound => {
    if (elapsed >= OVEN_CONFIG.BURN_TIME) return 'burning';
    if (elapsed >= OVEN_CONFIG.WARNING_TIME) return 'warning';
    if (elapsed >= cookTime) return 'ready';
    return 'cooking';
  };

  const tickOvens = useCallback(
    (s: Draft, now: number) => {
      const nextSound = { ...ovenSoundStates };

      for (const lane of LANES) {
        const oven = s.ovens[lane];
        if (oven.cooking && !oven.burned) {
          const elapsed = (oven as any).pausedElapsed ?? now - oven.startTime;
          const speedUpgrade = s.ovenSpeedUpgrades[lane] || 0;
          const cookTime = OVEN_CONFIG.COOK_TIMES[speedUpgrade];
          const phase = ovenPhase(elapsed, cookTime);
          const prevPhase = nextSound[lane];

          if (phase !== prevPhase) {
            if (phase === 'ready' && prevPhase === 'cooking') soundManager.ovenReady();
            else if (phase === 'warning' && prevPhase === 'ready') soundManager.ovenWarning();
            else if (phase === 'burning' && prevPhase === 'warning') soundManager.ovenBurning();
            nextSound[lane] = phase;
          }

          if (phase === 'burning') {
            soundManager.ovenBurned();
            loseLives(s, 1, 'burned_pizza');
            s.ovens[lane] = { cooking: false, startTime: 0, burned: true, cleaningStartTime: 0, sliceCount: 0 };
            nextSound[lane] = 'idle';
          }
        } else if (!oven.cooking && nextSound[lane] !== 'idle') {
          nextSound[lane] = 'idle';
        }

        if (oven.burned && oven.cleaningStartTime > 0 && now - oven.cleaningStartTime >= OVEN_CONFIG.CLEANING_TIME) {
          soundManager.cleaningComplete();
          s.ovens[lane] = { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 };
        }
      }

      // update sound map once (shallow compare)
      let changed = false;
      for (const lane of LANES) if (nextSound[lane] !== ovenSoundStates[lane]) changed = true;
      if (changed) setOvenSoundStates(nextSound);
    },
    [ovenSoundStates, loseLives]
  );

  const expireTransientUI = useCallback((s: Draft, now: number) => {
    s.floatingScores = s.floatingScores.filter(fs => now - fs.startTime < TIMINGS.FLOATING_SCORE_LIFETIME);
    s.droppedPlates = s.droppedPlates.filter(dp => now - dp.startTime < TIMINGS.DROPPED_PLATE_LIFETIME);
    s.customers = s.customers.map(c => {
      if (c.textMessage && c.textMessageTime && now - c.textMessageTime >= TIMINGS.TEXT_MESSAGE_LIFETIME) {
        return { ...c, textMessage: undefined, textMessageTime: undefined };
      }
      return c;
    });
  }, []);

  const tickActivePowerUps = useCallback((s: Draft, now: number) => {
    const expiredStar = s.activePowerUps.some(p => p.type === 'star' && now >= p.endTime);
    const expiredHoney = s.activePowerUps.some(p => p.type === 'honey' && now >= p.endTime);

    s.activePowerUps = s.activePowerUps.filter(p => now < p.endTime);

    if (expiredStar) s.starPowerActive = false;
    if (expiredHoney) s.customers = s.customers.map(c => ({ ...c, hotHoneyAffected: false }));

    const hasDoge = s.activePowerUps.some(p => p.type === 'doge');
    if (s.powerUpAlert && now >= s.powerUpAlert.endTime) {
      if (s.powerUpAlert.type !== 'doge' || !hasDoge) s.powerUpAlert = undefined;
    }
  }, []);

  const computeHas = (s: Draft) => {
    const hasHoney = s.activePowerUps.some(p => p.type === 'honey');
    const hasIceCream = s.activePowerUps.some(p => p.type === 'ice-cream');
    const hasStar = s.activePowerUps.some(p => p.type === 'star');
    const hasDoge = s.activePowerUps.some(p => p.type === 'doge');
    const honeyEndTime = s.activePowerUps.find(p => p.type === 'honey')?.endTime || 0;
    const iceEndTime = s.activePowerUps.find(p => p.type === 'ice-cream')?.endTime || 0;
    return { hasHoney, hasIceCream, hasStar, hasDoge, honeyEndTime, iceEndTime };
  };

  const applyCustomerStatusEffects = useCallback(
    (s: Draft, now: number) => {
      const { hasHoney, hasIceCream, honeyEndTime, iceEndTime } = computeHas(s);

      s.customers = s.customers.map(c => {
        const isDeparting = c.served || c.disappointed || c.vomit || c.leaving;
        if (isDeparting) return c;

        // Bad Luck Brian is immune to hot honey (and should never carry the flag)
        if (c.badLuckBrian) {
          if (c.hotHoneyAffected || c.shouldBeHotHoneyAffected) return { ...c, hotHoneyAffected: false, shouldBeHotHoneyAffected: false };
          return c;
        }

        if (c.woozy) return { ...c, frozen: false, hotHoneyAffected: false };

        if (hasHoney && hasIceCream) {
          if (honeyEndTime > iceEndTime) {
            if (c.shouldBeHotHoneyAffected) return { ...c, hotHoneyAffected: true, frozen: false };
          } else {
            if (c.shouldBeFrozenByIceCream && !c.unfrozenThisPeriod) return { ...c, frozen: true, hotHoneyAffected: false };
          }
        } else if (hasHoney && c.shouldBeHotHoneyAffected) {
          return { ...c, hotHoneyAffected: true, frozen: false };
        } else if (hasIceCream && c.shouldBeFrozenByIceCream && !c.unfrozenThisPeriod) {
          return { ...c, frozen: true, hotHoneyAffected: false };
        }

        if (!hasIceCream && (c.frozen || c.unfrozenThisPeriod || c.shouldBeFrozenByIceCream)) {
          return { ...c, frozen: undefined, unfrozenThisPeriod: undefined, shouldBeFrozenByIceCream: undefined };
        }
        if (!hasHoney && c.hotHoneyAffected) {
          return { ...c, hotHoneyAffected: false, shouldBeHotHoneyAffected: undefined };
        }
        return c;
      });
    },
    []
  );

  const moveCustomersAndHandleReachingChef = useCallback(
    (s: Draft, now: number) => {
      const { hasHoney } = computeHas(s);

      s.customers = s.customers
        .map(c => {
          if (c.brianNyaned) {
            return {
              ...c,
              position: c.position + c.speed * 3,
              lane: (c.lane as any) - 0.06,
              flipped: false,
              hotHoneyAffected: false,
              frozen: false,
              woozy: false,
            };
          }

          if (c.frozen && !c.hotHoneyAffected) return { ...c, hotHoneyAffected: false };

          if (c.served && !c.woozy) return { ...c, position: c.position + c.speed * 2, hotHoneyAffected: false };

          if (c.woozy) {
            if (c.movingRight) {
              const newPosition = c.position + c.speed * 0.75;
              if (newPosition >= POSITIONS.TURN_AROUND_POINT) return { ...c, position: newPosition, movingRight: false };
              return { ...c, position: newPosition };
            } else {
              const newPosition = c.position - c.speed * 0.75;
              if (newPosition <= GAME_CONFIG.CHEF_X_POSITION) {
                soundManager.customerDisappointed();
                const starsLost = c.critic ? 2 : 1;
                loseLives(s, starsLost, c.critic ? 'woozy_critic_reached' : 'woozy_customer_reached');
                return { ...c, position: newPosition, disappointed: true, movingRight: true, woozy: false, hotHoneyAffected: false };
              }
              return { ...c, position: newPosition };
            }
          }

          if (c.disappointed || c.vomit || c.brianDropped) return { ...c, position: c.position + c.speed * 2, hotHoneyAffected: false };

          if (c.badLuckBrian && c.movingRight) return { ...c, position: c.position + c.speed, hotHoneyAffected: false };

          if (c.badLuckBrian && !c.movingRight && !c.served && !c.disappointed) {
            const speedModifier = c.hotHoneyAffected ? 0.5 : 1;
            const newPosition = c.position - c.speed * speedModifier;
            if (newPosition <= GAME_CONFIG.CHEF_X_POSITION) {
              return {
                ...c,
                position: newPosition,
                textMessage: "You don't have gluten free?",
                textMessageTime: now,
                flipped: false,
                leaving: true,
                movingRight: true,
                hotHoneyAffected: false,
              };
            }
            return { ...c, position: newPosition };
          }

          const speedModifier = c.hotHoneyAffected ? 0.5 : 1;
          const newPosition = c.position - c.speed * speedModifier;

          if (newPosition <= GAME_CONFIG.CHEF_X_POSITION) {
            soundManager.customerDisappointed();
            const starsLost = c.critic ? 2 : 1;
            loseLives(s, starsLost, c.critic ? 'disappointed_critic' : 'disappointed_customer');
            return { ...c, position: newPosition, disappointed: true, movingRight: true, hotHoneyAffected: false };
          }

          // If honey expired in same tick, ensure clean flag
          if (!hasHoney && c.hotHoneyAffected) return { ...c, hotHoneyAffected: false };
          return { ...c, position: newPosition };
        })
        .filter(c => c.position > POSITIONS.OFF_SCREEN_LEFT && c.position <= 100);
    },
    [loseLives]
  );

  const tickStarAutofeed = useCallback(
    (s: Draft, now: number) => {
      const { hasStar, hasDoge } = computeHas(s);
      if (!hasStar || s.availableSlices <= 0) return;

      s.customers = s.customers.map(c => {
        if (c.lane === s.chefLane && !c.served && !c.disappointed && !c.vomit && Math.abs(c.position - GAME_CONFIG.CHEF_X_POSITION) < 8) {
          s.availableSlices = Math.max(0, s.availableSlices - 1);

          if (c.badLuckBrian) {
            return brianDropsSlice(s, c, now, 'Ugh! I dropped my slice!');
          }

          const served = serveCustomerAndSpawnPlate(s, c, now, hasDoge);
          return served;
        }
        return c;
      });
    },
    [brianDropsSlice, serveCustomerAndSpawnPlate]
  );

  const tickChefPowerUpCollisions = useCallback(
    (s: Draft, now: number) => {
      const { hasDoge, hasHoney, hasIceCream } = computeHas(s);
      const caught = new Set<string>();

      for (const p of s.powerUps) {
        if (p.position <= GAME_CONFIG.CHEF_X_POSITION && p.lane === s.chefLane && !s.nyanSweep?.active) {
          caught.add(p.id);
          soundManager.powerUpCollected(p.type);

          const scoreMult = hasDoge ? 2 : 1;
          awardPoints(s, SCORING.POWERUP_COLLECTED * scoreMult, p.lane, p.position);
          s.stats.powerUpsUsed[p.type] = (s.stats.powerUpsUsed[p.type] || 0) + 1;

          if (p.type === 'beer') {
            // keep your original beer logic, but tightened
            let livesLost = 0;
            let lastReason: StarLostReason | undefined;

            s.customers = s.customers.map(c => {
              // Critic immune
              if (c.critic) {
                if (c.woozy) {
                  return {
                    ...c,
                    woozy: false,
                    woozyState: undefined,
                    frozen: false,
                    hotHoneyAffected: false,
                    textMessage: 'I prefer wine',
                    textMessageTime: now,
                  };
                }
                if (!c.served && !c.vomit && !c.disappointed && !c.leaving) {
                  return { ...c, textMessage: 'I prefer wine', textMessageTime: now };
                }
                return c;
              }

              if (c.woozy) {
                livesLost += 1;
                lastReason = 'beer_vomit';
                return { ...c, woozy: false, vomit: true, disappointed: true, movingRight: true };
              }

              if (!c.served && !c.vomit && !c.disappointed) {
                if (c.badLuckBrian) {
                  livesLost += 1;
                  lastReason = 'brian_hurled';
                  return {
                    ...c,
                    vomit: true,
                    disappointed: true,
                    movingRight: true,
                    flipped: false,
                    textMessage: 'Oh man I hurled',
                    textMessageTime: now,
                    hotHoneyAffected: false,
                    frozen: false,
                  };
                }
                return { ...c, woozy: true, woozyState: 'normal', movingRight: true, hotHoneyAffected: false, frozen: false };
              }
              return c;
            });

            if (livesLost > 0) loseLives(s, livesLost, lastReason);
          } else if (p.type === 'star') {
            s.availableSlices = GAME_CONFIG.MAX_SLICES;
            s.starPowerActive = true;
            s.activePowerUps = [...s.activePowerUps.filter(x => x.type !== 'star'), { type: 'star', endTime: now + POWERUPS.DURATION }];
          } else if (p.type === 'doge') {
            s.activePowerUps = [...s.activePowerUps.filter(x => x.type !== 'doge'), { type: 'doge', endTime: now + POWERUPS.DURATION }];
            s.powerUpAlert = { type: 'doge', endTime: now + POWERUPS.ALERT_DURATION_DOGE, chefLane: s.chefLane };
          } else if (p.type === 'nyan') {
            if (!s.nyanSweep?.active) {
              s.nyanSweep = {
                active: true,
                xPosition: GAME_CONFIG.CHEF_X_POSITION,
                laneDirection: 1,
                startTime: now,
                lastUpdateTime: now,
                startingLane: s.chefLane,
              };
              soundManager.nyanCatPowerUp();
              if (!hasDoge || s.powerUpAlert?.type !== 'doge') {
                s.powerUpAlert = { type: 'nyan', endTime: now + POWERUPS.ALERT_DURATION_NYAN, chefLane: s.chefLane };
              }
            }
          } else if (p.type === 'moltobenny') {
            const mult = hasDoge ? 2 : 1;
            const pts = SCORING.MOLTOBENNY_POINTS * mult;
            const cash = SCORING.MOLTOBENNY_CASH * mult;
            s.bank += cash;
            awardPoints(s, pts, s.chefLane, GAME_CONFIG.CHEF_X_POSITION);
          } else {
            // regular timed powerups
            s.activePowerUps = [...s.activePowerUps.filter(x => x.type !== p.type), { type: p.type, endTime: now + POWERUPS.DURATION }];

            if (p.type === 'honey') {
              // Hot honey affects everyone except Bad Luck Brian
              s.customers = s.customers.map(c => {
                if (c.served || c.disappointed || c.vomit || c.leaving) return c;
                if (c.badLuckBrian) {
                  return {
                    ...c,
                    shouldBeHotHoneyAffected: false,
                    hotHoneyAffected: false,
                    frozen: false,
                    woozy: false,
                    woozyState: undefined,
                    textMessage: "I can't do spicy.",
                    textMessageTime: now,
                  };
                }
                return { ...c, shouldBeHotHoneyAffected: true, hotHoneyAffected: true, frozen: false, woozy: false, woozyState: undefined };
              });
            }

            if (p.type === 'ice-cream') {
              s.customers = s.customers.map(c => {
                if (!c.served && !c.disappointed && !c.vomit) {
                  if (c.badLuckBrian) return { ...c, textMessage: "I'm lactose intolerant", textMessageTime: now };
                  return { ...c, shouldBeFrozenByIceCream: true, frozen: true, hotHoneyAffected: false, woozy: false, woozyState: undefined };
                }
                return c;
              });
            }
          }
        }
      }

      s.powerUps = s.powerUps
        .filter(p => !caught.has(p.id))
        .map(p => ({ ...p, position: p.position - p.speed }))
        .filter(p => p.position > 10);
    },
    [awardPoints, loseLives]
  );

  const tickSlices = useCallback(
    (s: Draft, now: number) => {
      const { hasDoge, hasHoney } = computeHas(s);

      s.pizzaSlices = s.pizzaSlices.map(sl => ({ ...sl, position: sl.position + sl.speed }));

      const remaining: PizzaSlice[] = [];
      const destroyedPowerUpIds = new Set<string>();
      const platesFromSlices = new Set<string>();
      let sliceWentOffScreen = false;

      for (const slice of s.pizzaSlices) {
        let consumed = false;

        s.customers = s.customers.map(c => {
          if (c.disappointed || c.vomit || c.leaving) return c;

          const sameLane = c.lane === slice.lane;
          const close = Math.abs(c.position - slice.position) < 5;

          // frozen: unfreeze serve
          if (!consumed && c.frozen && sameLane && close) {
            consumed = true;
            platesFromSlices.add(slice.id);

            if (c.badLuckBrian) {
              const updated = brianDropsSlice(s, c, now, 'Ugh! I dropped my slice!');
              return { ...updated, frozen: false };
            }

            soundManager.customerUnfreeze();
            const served = serveCustomerAndSpawnPlate(s, c, now, hasDoge);
            return { ...served, frozen: false, unfrozenThisPeriod: true };
          }

          // woozy: your staged woozy logic (kept, but de-spaghettified)
          if (!consumed && c.woozy && !c.frozen && sameLane && close) {
            consumed = true;
            platesFromSlices.add(slice.id);

            if (c.badLuckBrian) {
              return brianDropsSlice(s, c, now, 'Ugh! I dropped my slice!');
            }

            // Honey overrides woozy chain if they are hotHoneyAffected
            if (hasHoney && c.hotHoneyAffected) {
              const served = serveCustomerAndSpawnPlate(s, c, now, hasDoge);
              return { ...served, woozy: false, woozyState: 'satisfied', hotHoneyAffected: false };
            }

            const state = c.woozyState || 'normal';
            if (state === 'normal') {
              soundManager.woozyServed();
              const base = SCORING.CUSTOMER_FIRST_SLICE;
              const dogeMult = hasDoge ? 2 : 1;
              const pts = Math.floor(base * dogeMult * getStreakMultiplier(s.stats.currentCustomerStreak));
              s.bank += SCORING.BASE_BANK_REWARD * dogeMult;
              awardPoints(s, pts, c.lane, c.position);

              s.emptyPlates.push({ id: `plate-${now}-${c.id}-first`, lane: c.lane, position: c.position, speed: ENTITY_SPEEDS.PLATE });
              return { ...c, woozy: false, woozyState: 'drooling' };
            }

            if (state === 'drooling') {
              const served = serveCustomerAndSpawnPlate(s, c, now, hasDoge);
              return { ...served, woozy: false, woozyState: 'satisfied' };
            }

            return { ...c, woozy: false };
          }

          // normal serve
          if (!consumed && !c.served && !c.woozy && !c.frozen && sameLane && close) {
            consumed = true;
            platesFromSlices.add(slice.id);

            if (c.badLuckBrian) return brianDropsSlice(s, c, now, 'Ugh! I dropped my slice!');

            const served = serveCustomerAndSpawnPlate(s, c, now, hasDoge);

            // critic bonus (kept)
            if (c.critic) {
              if (c.position >= 50 && s.lives < GAME_CONFIG.MAX_LIVES) {
                s.lives += 1;
                soundManager.lifeGained();
              }
            } else {
              if (s.happyCustomers % 8 === 0 && s.lives < GAME_CONFIG.MAX_LIVES) {
                // servedCustomerAndSpawnPlate already does periodic gain for non-critics;
                // your original had some overlap — we keep the centralized one.
              }
            }

            return served;
          }

          return c;
        });

        if (!consumed && slice.position < POSITIONS.OFF_SCREEN_RIGHT) {
          remaining.push(slice);
          for (const p of s.powerUps) {
            if (p.lane === slice.lane && Math.abs(p.position - slice.position) < 5) {
              soundManager.pizzaDestroyed();
              destroyedPowerUpIds.add(p.id);
            }
          }
        } else if (!consumed && slice.position >= POSITIONS.OFF_SCREEN_RIGHT) {
          sliceWentOffScreen = true;
        }
      }

      // If slice hit a powerup (destroyed), treat as “offscreen” for streak reset like before
      if (destroyedPowerUpIds.size > 0) sliceWentOffScreen = true;

      s.pizzaSlices = remaining; // slices that produced plates were already removed by being “consumed”
      s.powerUps = s.powerUps.filter(p => !destroyedPowerUpIds.has(p.id));

      if (sliceWentOffScreen) s.stats.currentPlateStreak = 0;
    },
    [awardPoints, brianDropsSlice, serveCustomerAndSpawnPlate]
  );

  const tickPlates = useCallback(
    (s: Draft, _now: number) => {
      const { hasDoge } = computeHas(s);

      s.emptyPlates = s.emptyPlates
        .map(p => ({ ...p, position: p.position - p.speed }))
        .filter(p => {
          if (p.position <= 10 && p.lane === s.chefLane && !s.nyanSweep?.active) {
            soundManager.plateCaught();
            const base = SCORING.PLATE_CAUGHT;
            const dogeMult = hasDoge ? 2 : 1;
            const pts = Math.floor(base * dogeMult * getStreakMultiplier(s.stats.currentPlateStreak));

            awardPoints(s, pts, p.lane, p.position);

            s.stats.platesCaught += 1;
            s.stats.currentPlateStreak += 1;
            s.stats.largestPlateStreak = Math.max(s.stats.largestPlateStreak, s.stats.currentPlateStreak);
            return false;
          }
          if (p.position <= 0) {
            soundManager.plateDropped();
            s.stats.currentPlateStreak = 0;
            return false;
          }
          return true;
        });
    },
    [awardPoints]
  );

  const tickNyan = useCallback(
    (s: Draft, now: number) => {
      if (!s.nyanSweep?.active) return;

      const MAX_X = 90;
      const UPDATE_INTERVAL = 50;

      if (now - s.nyanSweep.lastUpdateTime >= UPDATE_INTERVAL) {
        const INITIAL_X = GAME_CONFIG.CHEF_X_POSITION;
        const increment = ((MAX_X - INITIAL_X) / 80) * 1.5;

        const newXPosition = s.nyanSweep.xPosition + increment;
        let newLane = (s.chefLane as number) + s.nyanSweep.laneDirection * 0.5;
        let newLaneDirection = s.nyanSweep.laneDirection;

        if (newLane > GAME_CONFIG.LANE_BOTTOM) {
          newLane = 2.5;
          newLaneDirection = -1;
        } else if (newLane < GAME_CONFIG.LANE_TOP) {
          newLane = 0.5;
          newLaneDirection = 1;
        }

        s.chefLane = newLane as any;
        s.nyanSweep = { ...s.nyanSweep, xPosition: newXPosition, laneDirection: newLaneDirection, lastUpdateTime: now };
      }

      const { hasDoge } = computeHas(s);

      // customers hit by nyan
      s.customers = s.customers.map(c => {
        if (c.served || c.disappointed || c.vomit) return c;

        if (c.lane === s.chefLane && Math.abs(c.position - s.nyanSweep!.xPosition) < 10) {
          if (c.badLuckBrian) {
            soundManager.customerServed();
            return { ...c, brianNyaned: true, leaving: true, hasPlate: false, flipped: false, movingRight: true, woozy: false, frozen: false, unfrozenThisPeriod: undefined };
          }
          const served = serveCustomerAndSpawnPlate(s, c, now, hasDoge);
          return { ...served, woozy: false, frozen: false, unfrozenThisPeriod: undefined };
        }

        return c;
      });

      // minions hit by nyan
      if (s.bossBattle?.active && !s.bossBattle.bossDefeated) {
        const nyanX = s.nyanSweep.xPosition;
        const chefLaneFloat = s.chefLane as unknown as number;

        s.bossBattle.minions = s.bossBattle.minions.map(m => {
          if (m.defeated) return m;
          if (Math.abs(m.lane - chefLaneFloat) < 0.6 && Math.abs(m.position - nyanX) < 10) {
            soundManager.customerServed();
            const pts = SCORING.MINION_DEFEAT;
            awardPoints(s, pts, m.lane, m.position);
            return { ...m, defeated: true };
          }
          return m;
        });
      }

      if (s.nyanSweep.xPosition >= MAX_X) {
        s.chefLane = clampLaneFloat(Math.round(s.chefLane as number)) as any;
        s.nyanSweep = undefined;
        if (s.pendingStoreShow) {
          s.showStore = true;
          s.pendingStoreShow = false;
        }
      }
    },
    [awardPoints, serveCustomerAndSpawnPlate]
  );

  const tickLevelUpsAndStore = useCallback((s: Draft, now: number) => {
    const targetLevel = Math.floor(s.score / GAME_CONFIG.LEVEL_THRESHOLD) + 1;
    if (targetLevel <= s.level) return;

    s.level = targetLevel;
    const highestStoreLevel = Math.floor(targetLevel / GAME_CONFIG.STORE_LEVEL_INTERVAL) * GAME_CONFIG.STORE_LEVEL_INTERVAL;

    if (highestStoreLevel >= 10 && highestStoreLevel > s.lastStoreLevelShown) {
      s.lastStoreLevelShown = highestStoreLevel;
      if (s.nyanSweep?.active) s.pendingStoreShow = true;
      else s.showStore = true;
    }

    if (targetLevel === BOSS_CONFIG.TRIGGER_LEVEL && !s.bossBattle?.active && !s.bossBattle?.bossDefeated) {
      s.bossBattle = {
        active: true,
        bossHealth: BOSS_CONFIG.HEALTH,
        currentWave: 1,
        minions: spawnBossWave(1),
        bossVulnerable: true,
        bossDefeated: false,
        bossPosition: BOSS_CONFIG.BOSS_POSITION,
      };
    }
  }, [spawnBossWave]);

  const tickBossBattle = useCallback(
    (s: Draft, now: number) => {
      if (!s.bossBattle?.active || s.bossBattle.bossDefeated) return;

      // move minions
      s.bossBattle.minions = s.bossBattle.minions.map(m => (m.defeated ? m : { ...m, position: m.position - m.speed }));

      // minions reaching chef
      s.bossBattle.minions = s.bossBattle.minions.map(m => {
        if (m.defeated) return m;
        if (m.position <= GAME_CONFIG.CHEF_X_POSITION) {
          loseLives(s, 1);
          return { ...m, defeated: true };
        }
        return m;
      });

      // slices hit minions / boss
      const consumedSliceIds = new Set<string>();

      for (const slice of s.pizzaSlices) {
        if (consumedSliceIds.has(slice.id)) continue;

        s.bossBattle.minions = s.bossBattle.minions.map(m => {
          if (m.defeated || consumedSliceIds.has(slice.id)) return m;
          if (m.lane === slice.lane && Math.abs(m.position - slice.position) < 8) {
            consumedSliceIds.add(slice.id);
            soundManager.customerServed();
            awardPoints(s, SCORING.MINION_DEFEAT, m.lane, m.position);
            return { ...m, defeated: true };
          }
          return m;
        });
      }

      if (s.bossBattle.bossVulnerable) {
        for (const slice of s.pizzaSlices) {
          if (consumedSliceIds.has(slice.id)) continue;
          if (Math.abs(s.bossBattle.bossPosition - slice.position) < 10) {
            consumedSliceIds.add(slice.id);
            soundManager.customerServed();
            s.bossBattle.bossHealth -= 1;
            awardPoints(s, SCORING.BOSS_HIT, slice.lane, slice.position);

            if (s.bossBattle.bossHealth <= 0) {
              s.bossBattle.bossDefeated = true;
              s.bossBattle.active = false;
              s.bossBattle.minions = [];
              awardPoints(s, SCORING.BOSS_DEFEAT, 1, s.bossBattle.bossPosition);
            }
          }
        }
      }

      s.pizzaSlices = s.pizzaSlices.filter(sl => !consumedSliceIds.has(sl.id));

      // wave progression
      const activeMinions = s.bossBattle.minions.filter(m => !m.defeated);
      if (activeMinions.length === 0) {
        if (s.bossBattle.currentWave < BOSS_CONFIG.WAVES) {
          const nextWave = s.bossBattle.currentWave + 1;
          s.bossBattle.currentWave = nextWave;
          s.bossBattle.minions = spawnBossWave(nextWave);
        } else if (!s.bossBattle.bossVulnerable) {
          s.bossBattle.bossVulnerable = true;
          s.bossBattle.minions = [];
        }
      }
    },
    [awardPoints, loseLives, spawnBossWave]
  );

  /** ===== Main game tick ===== */

  const updateGame = useCallback(() => {
    const now = Date.now();

    setGameState(prev =>
      withDraft(prev, s => {
        if (s.gameOver) return tickFallingPizza(s);
        if (s.paused) return;

        tickOvens(s, now);
        expireTransientUI(s, now);
        tickActivePowerUps(s, now);

        applyCustomerStatusEffects(s, now);
        moveCustomersAndHandleReachingChef(s, now);

        tickStarAutofeed(s, now);
        tickChefPowerUpCollisions(s, now);

        tickSlices(s, now);
        tickPlates(s, now);

        tickNyan(s, now);

        tickLevelUpsAndStore(s, now);
        tickBossBattle(s, now);
      })
    );
  }, [
    tickFallingPizza,
    tickOvens,
    expireTransientUI,
    tickActivePowerUps,
    applyCustomerStatusEffects,
    moveCustomersAndHandleReachingChef,
    tickStarAutofeed,
    tickChefPowerUpCollisions,
    tickSlices,
    tickPlates,
    tickNyan,
    tickLevelUpsAndStore,
    tickBossBattle,
  ]);

  /** ===== Store / Upgrades / Pause / Reset ===== */

  const upgradeOven = useCallback((lane: number) => {
    setGameState(prev =>
      withDraft(prev, s => {
        const upgradeCost = COSTS.OVEN_UPGRADE;
        const current = s.ovenUpgrades[lane] || 0;
        if (s.bank >= upgradeCost && current < OVEN_CONFIG.MAX_UPGRADE_LEVEL) {
          s.bank -= upgradeCost;
          s.ovenUpgrades[lane] = current + 1;
          s.stats.ovenUpgradesMade += 1;
        }
      })
    );
  }, []);

  const upgradeOvenSpeed = useCallback((lane: number) => {
    setGameState(prev =>
      withDraft(prev, s => {
        const cost = COSTS.OVEN_SPEED_UPGRADE;
        const current = s.ovenSpeedUpgrades[lane] || 0;
        if (s.bank >= cost && current < OVEN_CONFIG.MAX_SPEED_LEVEL) {
          s.bank -= cost;
          s.ovenSpeedUpgrades[lane] = current + 1;
          s.stats.ovenUpgradesMade += 1;
        }
      })
    );
  }, []);

  const closeStore = useCallback(() => {
    setGameState(prev => ({ ...prev, showStore: false }));
  }, []);

  const bribeReviewer = useCallback(() => {
    setGameState(prev =>
      withDraft(prev, s => {
        const cost = COSTS.BRIBE_REVIEWER;
        if (s.bank >= cost && s.lives < GAME_CONFIG.MAX_LIVES) {
          soundManager.lifeGained();
          s.bank -= cost;
          s.lives += 1;
        }
      })
    );
  }, []);

  const buyPowerUp = useCallback((type: 'beer' | 'ice-cream' | 'honey') => {
    setGameState(prev =>
      withDraft(prev, s => {
        const cost = COSTS.BUY_POWERUP;
        if (s.bank < cost) return;
        const now = Date.now();
        s.bank -= cost;
        s.powerUps.push({
          id: `powerup-bought-${now}`,
          lane: s.chefLane,
          position: POSITIONS.SPAWN_X,
          speed: ENTITY_SPEEDS.POWERUP,
          type,
        });
      })
    );
  }, []);

  const debugActivatePowerUp = useCallback(
    (type: PowerUpType) => {
      setGameState(prev =>
        withDraft(prev, s => {
          if (s.gameOver) return;
          const now = Date.now();

          s.stats.powerUpsUsed[type] = (s.stats.powerUpsUsed[type] || 0) + 1;

          // reuse the same collision logic by injecting a fake powerup at chef
          // (simple + keeps behavior consistent)
          s.powerUps.push({
            id: `powerup-debug-${now}`,
            lane: s.chefLane,
            position: GAME_CONFIG.CHEF_X_POSITION,
            speed: 0,
            type,
          });
        })
      );
    },
    []
  );

  const resetGame = useCallback(() => {
    setGameState(makeInitialState());
    setLastCustomerSpawn(0);
    setLastPowerUpSpawn(0);
    setOvenSoundStates({ 0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle' });
  }, []);

  const togglePause = useCallback(() => {
    setGameState(prev =>
      withDraft(prev, s => {
        const newPaused = !s.paused;
        const now = Date.now();

        if (newPaused) {
          for (const lane of LANES) {
            const oven: any = s.ovens[lane];
            if (oven.cooking && !oven.burned) s.ovens[lane] = { ...oven, pausedElapsed: now - oven.startTime };
          }
        } else {
          for (const lane of LANES) {
            const oven: any = s.ovens[lane];
            if (oven.cooking && !oven.burned && oven.pausedElapsed !== undefined) {
              s.ovens[lane] = { ...oven, startTime: now - oven.pausedElapsed, pausedElapsed: undefined };
            }
          }
        }

        s.paused = newPaused;
      })
    );
  }, []);

  /** ===== Store auto-pausing when opened ===== */
  useEffect(() => {
    const prevShowStore = prevShowStoreRef.current;
    const currentShowStore = gameState.showStore;

    if (!prevShowStore && currentShowStore) {
      setGameState(prev =>
        withDraft(prev, s => {
          const now = Date.now();
          for (const lane of LANES) {
            const oven: any = s.ovens[lane];
            if (oven.cooking && !oven.burned) s.ovens[lane] = { ...oven, pausedElapsed: now - oven.startTime };
          }
          s.paused = true;
        })
      );
    }

    if (prevShowStore && !currentShowStore) {
      setGameState(prev =>
        withDraft(prev, s => {
          const now = Date.now();
          for (const lane of LANES) {
            const oven: any = s.ovens[lane];
            if (oven.cooking && !oven.burned && oven.pausedElapsed !== undefined) {
              s.ovens[lane] = { ...oven, startTime: now - oven.pausedElapsed, pausedElapsed: undefined };
            }
          }
          s.paused = false;
        })
      );
    }

    prevShowStoreRef.current = currentShowStore;
  }, [gameState.showStore]);

  /** ===== Main loop ===== */
  useEffect(() => {
    if (!gameStarted) return;

    const gameLoop = setInterval(() => {
      updateGame();

      // spawn checks (kept close to your original)
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
    startBossBattle, // kept available if you were using it elsewhere
  };
};
