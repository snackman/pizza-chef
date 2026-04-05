import { GameState, Customer, BossMinion, NyanSweep } from '../types/game';
import { GAME_CONFIG, NYAN_CONFIG } from '../lib/constants';
import { checkNyanSweepCollision } from './collisionSystem';
import { LaneBuckets, getEntitiesInAdjacentLanes, buildLaneBuckets } from './laneBuckets';

export interface NyanSweepResult {
    nextSweep?: NyanSweep;
    nextChefLane: number;
    sweepComplete: boolean;
    newXPosition: number;
}

export interface NyanCollisionResult {
    hitCustomerIds: string[];
    hitMinionIds: string[];
}

/**
 * Processes the movement of the Nyan Cat sweep
 */
export const processNyanSweepMovement = (
    currentSweep: NyanSweep,
    currentChefLane: number,
    now: number
): NyanSweepResult => {
    const dt = Math.min(now - currentSweep.lastUpdateTime, NYAN_CONFIG.DT_MAX);
    const INITIAL_X = GAME_CONFIG.CHEF_X_POSITION;
    const totalDistance = NYAN_CONFIG.MAX_X - INITIAL_X;

    const moveIncrement = (totalDistance / NYAN_CONFIG.DURATION) * dt;
    const newXPosition = currentSweep.xPosition + moveIncrement;

    let newLane = currentChefLane + (currentSweep.laneDirection * NYAN_CONFIG.LANE_CHANGE_SPEED * dt);
    let newLaneDirection = currentSweep.laneDirection;

    // Bounce logic
    if (newLane > GAME_CONFIG.LANE_BOTTOM) {
        newLane = GAME_CONFIG.LANE_BOTTOM;
        newLaneDirection = -1;
    } else if (newLane < GAME_CONFIG.LANE_TOP) {
        newLane = GAME_CONFIG.LANE_TOP;
        newLaneDirection = 1;
    }

    const sweepComplete = newXPosition >= NYAN_CONFIG.MAX_X;

    if (sweepComplete) {
        // Snap to nearest lane when done
        const finalLane = Math.max(
            GAME_CONFIG.LANE_TOP,
            Math.min(GAME_CONFIG.LANE_BOTTOM, Math.round(newLane))
        );
        return {
            nextSweep: undefined,
            nextChefLane: finalLane,
            sweepComplete: true,
            newXPosition
        };
    }

    return {
        nextSweep: {
            ...currentSweep,
            xPosition: newXPosition,
            laneDirection: newLaneDirection,
            lastUpdateTime: now
        },
        nextChefLane: newLane,
        sweepComplete: false,
        newXPosition
    };
};

/**
 * Checks for collisions during Nyan Sweep.
 * Uses lane-bucketed lookups to only check entities in adjacent lanes (tolerance 0.8),
 * reducing checks from all entities to ~2 lanes worth.
 *
 * Accepts optional pre-built lane buckets. If not provided, builds them on the fly.
 */
export const checkNyanSweepCollisions = (
    sweep: NyanSweep,
    newXPosition: number,
    newLane: number,
    customers: Customer[],
    minions?: BossMinion[],
    customerBuckets?: LaneBuckets<Customer>,
    minionBuckets?: LaneBuckets<BossMinion>
): NyanCollisionResult => {
    const hitCustomerIds: string[] = [];
    const hitMinionIds: string[] = [];

    const oldX = sweep.xPosition;
    const NYAN_LANE_TOLERANCE = 0.8;

    // Use pre-built buckets or build on the fly
    const custBuckets = customerBuckets || buildLaneBuckets(customers);

    // Only check customers in adjacent lanes (within tolerance 0.8)
    const nearbyCustomers = getEntitiesInAdjacentLanes(custBuckets, newLane, NYAN_LANE_TOLERANCE);

    nearbyCustomers.forEach(customer => {
        if (customer.served || customer.disappointed || customer.vomit || customer.healthInspector) return;

        if (checkNyanSweepCollision(newLane, oldX, newXPosition, customer)) {
            hitCustomerIds.push(customer.id);
        }
    });

    // Check Boss Minions in adjacent lanes
    if (minions) {
        const minBuckets = minionBuckets || buildLaneBuckets(minions);
        const nearbyMinions = getEntitiesInAdjacentLanes(minBuckets, newLane, NYAN_LANE_TOLERANCE);

        nearbyMinions.forEach(minion => {
            if (minion.defeated) return;

            if (checkNyanSweepCollision(newLane, oldX, newXPosition, minion)) {
                hitMinionIds.push(minion.id);
            }
        });
    }

    return { hitCustomerIds, hitMinionIds };
};
