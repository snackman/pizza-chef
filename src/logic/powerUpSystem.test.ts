import { describe, it, expect } from 'vitest';
import { processPowerUpCollection, processPowerUpExpirations } from './powerUpSystem';
import { GameState, Customer } from '../types/game';
import { INITIAL_GAME_STATE } from '../lib/constants';

const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
    ...INITIAL_GAME_STATE,
    ...overrides
} as GameState);

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
            const state = createMockGameState({ chefLane: 0 });
            const now = 1000;
            const result = processPowerUpCollection(
                state,
                { id: '1', type: 'speed', lane: 0, position: 0, speed: 0 },
                1,
                now
            );

            expect(result.newState.activePowerUps).toHaveLength(1);
            expect(result.newState.activePowerUps[0].type).toBe('speed');
        });

        it('triggers star power effects', () => {
            const state = createMockGameState({ availableSlices: 0 });
            const now = 1000;
            const result = processPowerUpCollection(
                state,
                { id: '1', type: 'star', lane: 0, position: 0, speed: 0 },
                1,
                now
            );

            expect(result.newState.starPowerActive).toBe(true);
            expect(result.newState.availableSlices).toBe(8); // MAX_SLICES
            expect(result.newState.activePowerUps).toHaveLength(1);
        });

        it('handles beer power-up lives lost', () => {
            const woozyCustomer: Customer = {
                id: 'c1', lane: 0, position: 50, speed: 0, served: false,
                hasPlate: false, leaving: false, disappointed: false,
                woozy: true, vomit: false, movingRight: false, critic: false, badLuckBrian: false, flipped: false
            };

            const state = createMockGameState({
                lives: 3,
                customers: [woozyCustomer]
            });

            const result = processPowerUpCollection(
                state,
                { id: '1', type: 'beer', lane: 0, position: 0, speed: 0 },
                1,
                1000
            );

            // Woozy + Beer = Vomit and Life Lost
            expect(result.livesLost).toBe(1);
            expect(result.newState.lives).toBe(2);
            expect(result.newState.customers[0].vomit).toBe(true);
        });
    });

});
