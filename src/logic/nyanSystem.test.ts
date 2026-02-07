import { describe, it, expect } from 'vitest';
import { processNyanSweepMovement, checkNyanSweepCollisions } from './nyanSystem';
import { createCustomer, createBossMinion, createNyanSweep } from '../test/factories';

describe('nyanSystem', () => {
    describe('processNyanSweepMovement', () => {
        it('moves the nyan cat forward', () => {
            const initialSweep = createNyanSweep({
                xPosition: 10,
                startTime: 1000,
                lastUpdateTime: 1000,
                startingLane: 1
            });

            // Advance time by 100ms
            const result = processNyanSweepMovement(initialSweep, 1, 1100);

            expect(result.nextSweep?.xPosition).toBeGreaterThan(10);
            expect(result.newXPosition).toBeGreaterThan(10);
            expect(result.sweepComplete).toBe(false);
        });

        it('completes the sweep when reaching MAX_X', () => {
            const initialSweep = createNyanSweep({
                xPosition: 89, // Near end (90)
                startTime: 1000,
                lastUpdateTime: 1000,
                startingLane: 1
            });

            // Advance time significantly to ensure completion
            const result = processNyanSweepMovement(initialSweep, 1, 5000);

            expect(result.sweepComplete).toBe(true);
            expect(result.nextSweep).toBeUndefined();
        });
    });

    describe('checkNyanSweepCollisions', () => {
        it('detects collisions with customers', () => {
            const sweep = createNyanSweep({
                xPosition: 50,
                startTime: 1000,
                lastUpdateTime: 1000,
                startingLane: 0
            });

            const customers = [
                // Hit
                createCustomer({ id: 'c1', lane: 0, position: 50, speed: 0 }),
                // Miss (wrong position)
                createCustomer({ id: 'c2', lane: 0, position: 20, speed: 0 })
            ];

            // Assuming newLane calculation placed it on lane 0
            const result = checkNyanSweepCollisions(sweep, 52, 0, customers);

            expect(result.hitCustomerIds).toContain('c1');
            expect(result.hitCustomerIds).not.toContain('c2');
        });

        it('detects collisions with minions', () => {
            const sweep = createNyanSweep({
                xPosition: 50,
                startTime: 1000,
                lastUpdateTime: 1000,
                startingLane: 0
            });

            const minions = [
                createBossMinion({ id: 'm1', lane: 0, position: 50, speed: 0 })
            ];

            const result = checkNyanSweepCollisions(sweep, 52, 0, [], minions);

            expect(result.hitMinionIds).toContain('m1');
        });
    });
});
