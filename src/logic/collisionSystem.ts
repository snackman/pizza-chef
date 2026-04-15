import {
    Customer,
    PizzaSlice,
    PowerUp,
    EmptyPlate,
    BossMinion
} from '../types/game';
import { GAME_CONFIG } from '../lib/constants';

/**
 * Default collision threshold (in position units, which are percentages of board width).
 */
const DEFAULT_THRESHOLD = 5;

/**
 * Checks if a pizza slice has collided with a customer.
 */
export const checkSliceCustomerCollision = (
    slice: PizzaSlice,
    customer: Customer,
    threshold: number = DEFAULT_THRESHOLD
): boolean => {
    if (customer.served || customer.disappointed || customer.vomit || customer.leaving) {
        return false;
    }
    return customer.lane === slice.lane && Math.abs(customer.position - slice.position) < threshold;
};

/**
 * Checks if a pizza slice has collided with a power-up (destroying both).
 */
export const checkSlicePowerUpCollision = (
    slice: PizzaSlice,
    powerUp: PowerUp,
    threshold: number = DEFAULT_THRESHOLD
): boolean => {
    return powerUp.lane === slice.lane && Math.abs(powerUp.position - slice.position) < threshold;
};

/**
 * Checks if the chef has collided with a power-up (collecting it).
 */
export const checkChefPowerUpCollision = (
    chefLane: number,
    chefX: number,
    powerUp: PowerUp
): boolean => {
    return powerUp.lane === chefLane && powerUp.position <= chefX;
};

/**
 * Calculates the visual lane for a plate (handles angled throws)
 */
const getPlateVisualLane = (plate: EmptyPlate): number => {
    if (plate.targetLane !== undefined && plate.startLane !== undefined && plate.startPosition !== undefined) {
        const OVEN_POSITION = 10;
        const totalDistance = plate.startPosition - OVEN_POSITION;
        const traveled = plate.startPosition - plate.position;
        const progress = Math.min(1, Math.max(0, traveled / totalDistance));
        return plate.startLane + (plate.targetLane - plate.startLane) * progress;
    }
    return plate.lane;
};

/**
 * Checks if the chef has caught an empty plate.
 */
export const checkChefPlateCollision = (
    chefLane: number,
    plate: EmptyPlate,
    threshold: number = 10
): boolean => {
    const visualLane = getPlateVisualLane(plate);
    // For angled plates, check if within 0.5 lane distance for more forgiving collision
    const laneTolerance = plate.targetLane !== undefined ? 0.5 : 0;
    return Math.abs(visualLane - chefLane) <= laneTolerance && plate.position <= threshold;
};

/**
 * Checks if the Nyan cat sweep has collided with an entity.
 * The sweep covers a range from oldX to newX and affects entities within lane tolerance.
 */
export const checkNyanSweepCollision = (
    nyanLane: number,
    sweepOldX: number,
    sweepNewX: number,
    entity: { lane: number; position: number },
    laneTolerance: number = 0.8,
    positionBuffer: number = 10
): boolean => {
    const isLaneHit = Math.abs(entity.lane - nyanLane) < laneTolerance;
    const sweepStart = sweepOldX - positionBuffer;
    const sweepEnd = sweepNewX + positionBuffer;
    const isPositionHit = entity.position >= sweepStart && entity.position <= sweepEnd;

    return isLaneHit && isPositionHit;
};

/**
 * Checks if the chef is in range of a customer for star power auto-feed.
 */
export const checkStarPowerRange = (
    chefLane: number,
    chefX: number,
    customer: Customer,
    threshold: number = 8
): boolean => {
    if (customer.served || customer.disappointed || customer.vomit) {
        return false;
    }
    return customer.lane === chefLane && Math.abs(customer.position - chefX) < threshold;
};

/**
 * Checks if a minion has reached the chef (causing damage).
 */
export const checkMinionReachedChef = (
    minion: BossMinion,
    chefX: number = GAME_CONFIG.CHEF_X_POSITION
): boolean => {
    return !minion.defeated && minion.position <= chefX;
};

/**
 * Checks if a pizza slice has hit a boss minion.
 */
export const checkSliceMinionCollision = (
    slice: PizzaSlice,
    minion: BossMinion,
    threshold: number = DEFAULT_THRESHOLD
): boolean => {
    if (minion.defeated) return false;
    return minion.lane === slice.lane && Math.abs(minion.position - slice.position) < threshold;
};
