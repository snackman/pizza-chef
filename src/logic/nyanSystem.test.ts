import { describe, it, expect } from 'vitest';
import { processNyanSweepMovement, checkNyanSweepCollisions } from './nyanSystem';
import { Customer, BossMinion, NyanSweep } from '../types/game';
import { GAME_CONFIG } from '../lib/constants';

describe('nyanSystem', () => {
    describe('processNyanSweepMovement', () => {
        it('moves the nyan cat forward', () => {
            const initialSweep: NyanSweep = {
                active: true,
                xPosition: 10,
                laneDirection: 1,
                startTime: 1000,
                lastUpdateTime: 1000,
                startingLane: 1
            };

            // Advance time by 100ms
            const result = processNyanSweepMovement(initialSweep, 1, 1100);

            expect(result.nextSweep?.xPosition).toBeGreaterThan(10);
            expect(result.newXPosition).toBeGreaterThan(10);
            expect(result.sweepComplete).toBe(false);
        });

        it('completes the sweep when reaching MAX_X', () => {
            const initialSweep: NyanSweep = {
                active: true,
                xPosition: 89, // Near end (90)
                laneDirection: 1,
                startTime: 1000,
                lastUpdateTime: 1000,
                startingLane: 1
            };

            // Advance time significantly to ensure completion
            const result = processNyanSweepMovement(initialSweep, 1, 5000);

            expect(result.sweepComplete).toBe(true);
            expect(result.nextSweep).toBeUndefined();
        });
    });

    describe('checkNyanSweepCollisions', () => {
        it('detects collisions with customers', () => {
            const sweep: NyanSweep = {
                active: true,
                xPosition: 50,
                laneDirection: 1,
                startTime: 1000,
                lastUpdateTime: 1000,
                startingLane: 0
            };

            const customers: Customer[] = [
                // Hit
                { id: 'c1', lane: 0, position: 50, speed: 0, served: false, hasPlate: false, leaving: false, disappointed: false, woozy: false, vomit: false, movingRight: false, critic: false, badLuckBrian: false, flipped: false },
                // Miss (wrong position)
                { id: 'c2', lane: 0, position: 20, speed: 0, served: false, hasPlate: false, leaving: false, disappointed: false, woozy: false, vomit: false, movingRight: false, critic: false, badLuckBrian: false, flipped: false }
            ];

            // Assuming newLane calculation placed it on lane 0
            const result = checkNyanSweepCollisions(sweep, 52, 0, customers);

            expect(result.hitCustomerIds).toContain('c1');
            expect(result.hitCustomerIds).not.toContain('c2');
        });

        it('detects collisions with minions', () => {
            const sweep: NyanSweep = {
                active: true,
                xPosition: 50,
                laneDirection: 1,
                startTime: 1000,
                lastUpdateTime: 1000,
                startingLane: 0
            };

            const minions: BossMinion[] = [
                { id: 'm1', lane: 0, position: 50, speed: 0, defeated: false }
            ];

            const result = checkNyanSweepCollisions(sweep, 52, 0, [], minions);

            expect(result.hitMinionIds).toContain('m1');
        });
    });
});
