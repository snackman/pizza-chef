import { describe, it, expect } from 'vitest';
import { processPowerUpCollection, processPowerUpExpirations, processChefPowerUpCollisions } from './powerUpSystem';
import { GAME_CONFIG } from '../lib/constants';
import { createGameState, createCustomer, createPowerUp } from '../test/factories';

describe('powerUpSystem', () => {
    describe('processPowerUpExpirations', () => {
        it('removes expired power-ups', () => {
            const now = 1000;
            const result = processPowerUpExpirations([
                { type: 'speed', endTime: 500 }, // Expired
                { type: 'slow', endTime: 1500 }  // Active
            ], now);

            expect(result.activePowerUps).toHaveLength(1);
            expect(result.activePowerUps[0].type).toBe('slow');
            expect(result.expiredTypes).toContain('speed');
        });

        it('detects active star power', () => {
            const now = 1000;
            const result = processPowerUpExpirations([
                { type: 'star', endTime: 1500 }
            ], now);

            expect(result.starPowerActive).toBe(true);
        });
    });

    describe('processPowerUpCollection', () => {
        it('activates timed power-ups', () => {
            const state = createGameState({ chefLane: 0 });
            const now = 1000;
            const result = processPowerUpCollection(
                state,
                createPowerUp({ id: '1', type: 'speed', lane: 0, position: 0, speed: 0 }),
                1,
                now
            );

            expect(result.newState.activePowerUps).toHaveLength(1);
            expect(result.newState.activePowerUps[0].type).toBe('speed');
        });

        it('triggers star power effects', () => {
            const state = createGameState({ availableSlices: 0 });
            const now = 1000;
            const result = processPowerUpCollection(
                state,
                createPowerUp({ id: '1', type: 'star', lane: 0, position: 0, speed: 0 }),
                1,
                now
            );

            expect(result.newState.starPowerActive).toBe(true);
            expect(result.newState.availableSlices).toBe(8); // MAX_SLICES
            expect(result.newState.activePowerUps).toHaveLength(1);
        });

        it('handles beer power-up lives lost', () => {
            const woozyCustomer = createCustomer({
                id: 'c1', lane: 0, position: 50, speed: 0,
                woozy: true, vomit: false
            });

            const state = createGameState({
                lives: 3,
                customers: [woozyCustomer]
            });

            const result = processPowerUpCollection(
                state,
                createPowerUp({ id: '1', type: 'beer', lane: 0, position: 0, speed: 0 }),
                1,
                1000
            );

            // Woozy + Beer = Vomit and Life Lost
            expect(result.livesLost).toBe(1);
            expect(result.newState.lives).toBe(2);
            expect(result.newState.customers[0].vomit).toBe(true);
        });

        it('initializes nyan sweep and returns nyanSweepStarted flag', () => {
            const state = createGameState({ chefLane: 1 });
            const now = 1000;
            const result = processPowerUpCollection(
                state,
                createPowerUp({ id: '1', type: 'nyan', lane: 0, position: 0, speed: 0 }),
                1,
                now
            );

            expect(result.nyanSweepStarted).toBe(true);
            expect(result.newState.nyanSweep).toBeDefined();
            expect(result.newState.nyanSweep?.active).toBe(true);
            expect(result.newState.nyanSweep?.startingLane).toBe(1);
        });

        it('does not start nyan sweep if already active', () => {
            const state = createGameState({
                chefLane: 1,
                nyanSweep: {
                    active: true,
                    xPosition: 50,
                    laneDirection: 1,
                    startTime: 500,
                    lastUpdateTime: 500,
                    startingLane: 0
                }
            });
            const now = 1000;
            const result = processPowerUpCollection(
                state,
                createPowerUp({ id: '1', type: 'nyan', lane: 0, position: 0, speed: 0 }),
                1,
                now
            );

            expect(result.nyanSweepStarted).toBe(false);
            // Original sweep should remain unchanged
            expect(result.newState.nyanSweep?.startingLane).toBe(0);
        });
    });

    describe('processChefPowerUpCollisions', () => {
        it('detects collision when chef is on same lane and position', () => {
            const powerUp = createPowerUp({ id: 'p1', type: 'honey', lane: 0, position: GAME_CONFIG.CHEF_X_POSITION });
            const state = createGameState({ powerUps: [powerUp] });

            const result = processChefPowerUpCollisions(
                state,
                0, // chefLane
                GAME_CONFIG.CHEF_X_POSITION,
                1, // dogeMultiplier
                1000
            );

            expect(result.caughtPowerUpIds.has('p1')).toBe(true);
            expect(result.scores.length).toBeGreaterThan(0);
        });

        it('does not detect collision when chef is on different lane', () => {
            const powerUp = createPowerUp({ id: 'p1', type: 'honey', lane: 2, position: GAME_CONFIG.CHEF_X_POSITION });
            const state = createGameState({ powerUps: [powerUp] });

            const result = processChefPowerUpCollisions(
                state,
                0, // chefLane - different from powerUp lane
                GAME_CONFIG.CHEF_X_POSITION,
                1,
                1000
            );

            expect(result.caughtPowerUpIds.size).toBe(0);
        });

        it('skips collision detection during active nyan sweep', () => {
            const powerUp = createPowerUp({ id: 'p1', type: 'honey', lane: 0, position: GAME_CONFIG.CHEF_X_POSITION });
            const state = createGameState({
                powerUps: [powerUp],
                nyanSweep: {
                    active: true,
                    xPosition: 50,
                    laneDirection: 1,
                    startTime: 500,
                    lastUpdateTime: 500,
                    startingLane: 0
                }
            });

            const result = processChefPowerUpCollisions(
                state,
                0,
                GAME_CONFIG.CHEF_X_POSITION,
                1,
                1000
            );

            expect(result.caughtPowerUpIds.size).toBe(0);
        });

        it('collects multiple power-ups in single pass', () => {
            const powerUps = [
                createPowerUp({ id: 'p1', type: 'honey', lane: 0, position: GAME_CONFIG.CHEF_X_POSITION }),
                createPowerUp({ id: 'p2', type: 'star', lane: 0, position: GAME_CONFIG.CHEF_X_POSITION })
            ];
            const state = createGameState({ powerUps });

            const result = processChefPowerUpCollisions(
                state,
                0,
                GAME_CONFIG.CHEF_X_POSITION,
                1,
                1000
            );

            expect(result.caughtPowerUpIds.size).toBe(2);
        });

        it('returns nyanSweepStarted when nyan power-up collected', () => {
            const powerUp = createPowerUp({ id: 'p1', type: 'nyan', lane: 0, position: GAME_CONFIG.CHEF_X_POSITION });
            const state = createGameState({ powerUps: [powerUp] });

            const result = processChefPowerUpCollisions(
                state,
                0,
                GAME_CONFIG.CHEF_X_POSITION,
                1,
                1000
            );

            expect(result.nyanSweepStarted).toBe(true);
            expect(result.newState.nyanSweep?.active).toBe(true);
        });

        it('aggregates lives lost from beer power-up', () => {
            const woozyCustomer = createCustomer({
                id: 'c1', lane: 0, position: 50, speed: 0,
                woozy: true, vomit: false
            });
            const powerUp = createPowerUp({ id: 'p1', type: 'beer', lane: 0, position: GAME_CONFIG.CHEF_X_POSITION });
            const state = createGameState({
                powerUps: [powerUp],
                customers: [woozyCustomer],
                lives: 3
            });

            const result = processChefPowerUpCollisions(
                state,
                0,
                GAME_CONFIG.CHEF_X_POSITION,
                1,
                1000
            );

            expect(result.livesLost).toBe(1);
            expect(result.newState.lives).toBe(2);
        });
    });

});
