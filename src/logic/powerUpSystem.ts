import { GameState, PowerUp, StarLostReason, PowerUpType, ActivePowerUp, NyanSweep } from '../types/game';
import { GAME_CONFIG, POWERUPS, SCORING } from '../lib/constants';
import { checkChefPowerUpCollision } from './collisionSystem';
import { calculatePowerUpScore } from './scoringSystem';
import { initializePepeHelpers } from './pepeHelperSystem';

// Result of collecting a power-up
export interface PowerUpCollectionResult {
    newState: GameState; // Modified state
    scoresToAdd: Array<{ points: number; lane: number; position: number }>; // Floating scores to spawn
    livesLost: number; // For sound effects
    shouldTriggerGameOver: boolean;
    powerUpAlert?: { type: PowerUpType; endTime: number; chefLane: number };
    nyanSweepStarted: boolean; // Whether a new Nyan sweep was started
}

// Result of processing all chef power-up collisions
export interface ChefPowerUpCollisionResult {
    newState: GameState;
    caughtPowerUpIds: Set<string>;
    scores: Array<{ points: number; lane: number; position: number }>;
    livesLost: number;
    shouldTriggerGameOver: boolean;
    nyanSweepStarted: boolean;
}

// Result of processing expirations
export interface PowerUpExpirationResult {
    activePowerUps: ActivePowerUp[];
    expiredTypes: PowerUpType[];
    starPowerActive: boolean;
}

/**
 * Processes the collection of a power-up by the chef
 */
export const processPowerUpCollection = (
    currentState: GameState,
    powerUp: PowerUp,
    dogeMultiplier: number,
    now: number
): PowerUpCollectionResult => {
    let newState = { ...currentState };
    const scoresToAdd: Array<{ points: number; lane: number; position: number }> = [];
    let livesLost = 0;
    let shouldTriggerGameOver = false;

    // Track power-up usage
    newState.stats = {
        ...newState.stats,
        powerUpsUsed: {
            ...newState.stats.powerUpsUsed,
            [powerUp.type]: (newState.stats.powerUpsUsed[powerUp.type] || 0) + 1
        }
    };

    if (powerUp.type === 'beer') {
        let lastReason: StarLostReason | undefined;

        newState.customers = newState.customers.map(customer => {
            // Impact on Critic
            if (customer.critic) {
                if (customer.woozy) return { ...customer, woozy: false, woozyState: undefined, frozen: false, hotHoneyAffected: false, textMessage: "I prefer wine", textMessageTime: now };
                if (!customer.served && !customer.vomit && !customer.disappointed && !customer.leaving) return { ...customer, textMessage: "I prefer wine", textMessageTime: now };
                return customer;
            }

            // Impact on Woozy customers (Double Beer = Vomit)
            if (customer.woozy) {
                livesLost += 1;
                lastReason = 'beer_vomit';
                return { ...customer, woozy: false, vomit: true, disappointed: true, movingRight: true };
            }

            // Impact on Normal customers
            if (!customer.served && !customer.vomit && !customer.disappointed && !customer.leaving) {
                if (customer.badLuckBrian) {
                    livesLost += 1;
                    lastReason = 'brian_hurled';
                    return { ...customer, vomit: true, disappointed: true, movingRight: true, flipped: false, textMessage: "Oh man I hurled", textMessageTime: now, hotHoneyAffected: false, frozen: false };
                }
                return { ...customer, woozy: true, woozyState: 'normal', movingRight: true, hotHoneyAffected: false, frozen: false };
            }
            return customer;
        });

        if (livesLost > 0) {
            newState.lives = Math.max(0, newState.lives - livesLost);
            newState.stats = { ...newState.stats, currentCustomerStreak: 0 };
            if (lastReason) newState.lastStarLostReason = lastReason;
        }

        if (newState.lives === 0) {
            shouldTriggerGameOver = true;
        }

    } else if (powerUp.type === 'star') {
        newState.availableSlices = GAME_CONFIG.MAX_SLICES;
        newState.starPowerActive = true;
        newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== 'star'), { type: 'star', endTime: now + POWERUPS.DURATION }];
    } else if (powerUp.type === 'doge') {
        newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== 'doge'), { type: 'doge', endTime: now + POWERUPS.DOGE_DURATION }];
        newState.powerUpAlert = { type: 'doge', endTime: now + POWERUPS.ALERT_DURATION_DOGE, chefLane: newState.chefLane };
    } else if (powerUp.type === 'nyan') {
        newState.powerUpAlert = { type: 'nyan', endTime: now + POWERUPS.ALERT_DURATION_NYAN, chefLane: newState.chefLane };
        // Initialize Nyan sweep if not already active
        if (!newState.nyanSweep?.active) {
            newState.nyanSweep = {
                active: true,
                xPosition: GAME_CONFIG.CHEF_X_POSITION,
                laneDirection: 1,
                startTime: now,
                lastUpdateTime: now,
                startingLane: newState.chefLane
            };
            return { newState, scoresToAdd, livesLost, shouldTriggerGameOver, powerUpAlert: newState.powerUpAlert, nyanSweepStarted: true };
        }
    } else if (powerUp.type === 'moltobenny') {
        const moltoScore = SCORING.MOLTOBENNY_POINTS * dogeMultiplier;
        const moltoMoney = SCORING.MOLTOBENNY_CASH * dogeMultiplier;
        newState.score += moltoScore;
        newState.bank += moltoMoney;
        newState.stats = { ...newState.stats, totalEarned: newState.stats.totalEarned + moltoMoney };
        scoresToAdd.push({ points: moltoScore, lane: newState.chefLane, position: GAME_CONFIG.CHEF_X_POSITION });
    } else if (powerUp.type === 'pepe') {
        // Initialize Pepe helpers - Franco-Pepe and Frank-Pepe assist the chef
        newState.pepeHelpers = initializePepeHelpers(now, newState.chefLane);
        newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== 'pepe'), { type: 'pepe', endTime: now + POWERUPS.PEPE_DURATION }];
    } else {
        // Generic timed power-up addition
        newState.activePowerUps = [...newState.activePowerUps.filter(p => p.type !== powerUp.type), { type: powerUp.type, endTime: now + POWERUPS.DURATION }];

        // Immediate effects for Honey
        if (powerUp.type === 'honey') {
            newState.customers = newState.customers.map(c => {
                if (c.served || c.disappointed || c.vomit || c.leaving) return c;
                if (c.critic) return { ...c, shouldBeHotHoneyAffected: false, hotHoneyAffected: false, textMessage: "Just plain, thanks.", textMessageTime: now };
                if (c.badLuckBrian) return { ...c, shouldBeHotHoneyAffected: false, hotHoneyAffected: false, frozen: false, woozy: false, woozyState: undefined, textMessage: "I can't do spicy.", textMessageTime: now };
                return { ...c, shouldBeHotHoneyAffected: true, hotHoneyAffected: true, frozen: false, woozy: false, woozyState: undefined };
            });
        }

        // Immediate effects for Ice Cream
        if (powerUp.type === 'ice-cream') {
            newState.customers = newState.customers.map(c => {
                if (!c.served && !c.disappointed && !c.vomit) {
                    if (c.badLuckBrian) return { ...c, textMessage: "I'm lactose intolerant", textMessageTime: now };
                    return { ...c, shouldBeFrozenByIceCream: true, frozen: true, hotHoneyAffected: false, woozy: false, woozyState: undefined };
                }
                return c;
            });
        }
    }

    return { newState, scoresToAdd, livesLost, shouldTriggerGameOver, powerUpAlert: newState.powerUpAlert, nyanSweepStarted: false };
};

/**
 * Handles expiration of active power-ups
 */
export const processPowerUpExpirations = (
    activePowerUps: ActivePowerUp[],
    now: number
): PowerUpExpirationResult => {
    const nextPowerUps = activePowerUps.filter(p => p.endTime > now);
    const expiredTypes = activePowerUps
        .filter(p => p.endTime <= now)
        .map(p => p.type);

    const starPowerActive = nextPowerUps.some(p => p.type === 'star');

    return {
        activePowerUps: nextPowerUps,
        expiredTypes,
        starPowerActive
    };
};

/**
 * Processes all chef power-up collisions in a single pass
 * Returns updated state, caught IDs, scores, and events for sound handling
 */
export const processChefPowerUpCollisions = (
    state: GameState,
    chefLane: number,
    chefXPosition: number,
    dogeMultiplier: number,
    now: number
): ChefPowerUpCollisionResult => {
    const caughtPowerUpIds = new Set<string>();
    const scores: Array<{ points: number; lane: number; position: number }> = [];
    let newState = state;
    let totalLivesLost = 0;
    let shouldTriggerGameOver = false;
    let nyanSweepStarted = false;

    // Skip collision detection during active Nyan sweep
    if (state.nyanSweep?.active) {
        return { newState, caughtPowerUpIds, scores, livesLost: 0, shouldTriggerGameOver: false, nyanSweepStarted: false };
    }

    state.powerUps.forEach(powerUp => {
        if (checkChefPowerUpCollision(chefLane, chefXPosition, powerUp)) {
            caughtPowerUpIds.add(powerUp.id);

            // Add base score for non-moltobenny power-ups
            if (powerUp.type !== 'moltobenny') {
                const pointsEarned = calculatePowerUpScore(dogeMultiplier);
                newState = { ...newState, score: newState.score + pointsEarned };
                scores.push({ points: pointsEarned, lane: powerUp.lane, position: powerUp.position });
            }

            // Process the collection effects
            const collectionResult = processPowerUpCollection(newState, powerUp, dogeMultiplier, now);
            newState = collectionResult.newState;

            // Aggregate results
            totalLivesLost += collectionResult.livesLost;
            if (collectionResult.shouldTriggerGameOver) {
                shouldTriggerGameOver = true;
            }
            if (collectionResult.nyanSweepStarted) {
                nyanSweepStarted = true;
            }
            if (collectionResult.scoresToAdd.length > 0) {
                scores.push(...collectionResult.scoresToAdd);
            }
        }
    });

    return { newState, caughtPowerUpIds, scores, livesLost: totalLivesLost, shouldTriggerGameOver, nyanSweepStarted };
};

