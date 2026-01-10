import { describe, it, expect } from 'vitest';
import { applyCustomerScoring, calculateCustomerScore, checkLifeGain } from './scoringSystem';
import { GameState, Customer } from '../types/game';
import { INITIAL_GAME_STATE, SCORING, GAME_CONFIG } from '../lib/constants';

const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
    ...INITIAL_GAME_STATE,
    ...overrides
} as GameState);

const createMockCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    id: 'c1',
    lane: 0,
    position: 50,
    speed: 1,
    served: false,
    hasPlate: true,
    leaving: false,
    disappointed: false,
    woozy: false,
    vomit: false,
    movingRight: false,
    critic: false,
    badLuckBrian: false,
    flipped: false,
    ...overrides
});

describe('scoringSystem', () => {
    describe('calculateCustomerScore', () => {
        it('calculates normal customer score', () => {
            const customer = createMockCustomer();
            const result = calculateCustomerScore(customer, 1, 1);

            expect(result.points).toBe(SCORING.CUSTOMER_NORMAL);
            expect(result.bank).toBe(SCORING.BASE_BANK_REWARD);
        });

        it('calculates critic score (double points)', () => {
            const customer = createMockCustomer({ critic: true });
            const result = calculateCustomerScore(customer, 1, 1);

            expect(result.points).toBe(SCORING.CUSTOMER_CRITIC);
        });

        it('calculates first slice score', () => {
            const customer = createMockCustomer();
            const result = calculateCustomerScore(customer, 1, 1, true);

            expect(result.points).toBe(SCORING.CUSTOMER_FIRST_SLICE);
        });

        it('applies doge multiplier to points and bank', () => {
            const customer = createMockCustomer();
            const dogeMultiplier = 2;
            const result = calculateCustomerScore(customer, dogeMultiplier, 1);

            expect(result.points).toBe(SCORING.CUSTOMER_NORMAL * dogeMultiplier);
            expect(result.bank).toBe(SCORING.BASE_BANK_REWARD * dogeMultiplier);
        });

        it('applies streak multiplier to points', () => {
            const customer = createMockCustomer();
            const streakMultiplier = 1.5;
            const result = calculateCustomerScore(customer, 1, streakMultiplier);

            expect(result.points).toBe(Math.floor(SCORING.CUSTOMER_NORMAL * streakMultiplier));
        });
    });

    describe('checkLifeGain', () => {
        it('grants life at every 8 happy customers', () => {
            const result = checkLifeGain(3, 8, 1); // 8th customer

            expect(result.livesToAdd).toBe(1);
            expect(result.shouldPlaySound).toBe(true);
        });

        it('does not grant life at non-multiples of 8', () => {
            const result = checkLifeGain(3, 7, 1);

            expect(result.livesToAdd).toBe(0);
        });

        it('does not exceed max lives', () => {
            const result = checkLifeGain(GAME_CONFIG.MAX_LIVES, 8, 1);

            expect(result.livesToAdd).toBe(0);
        });

        it('grants bonus life for critic served efficiently', () => {
            const result = checkLifeGain(3, 5, 1, true, 60); // critic at position 60+

            expect(result.livesToAdd).toBe(1);
        });

        it('does not grant critic bonus if served too late', () => {
            const result = checkLifeGain(3, 5, 1, true, 40); // position < 50

            expect(result.livesToAdd).toBe(0);
        });
    });

    describe('applyCustomerScoring', () => {
        it('applies full scoring with bank and stats for served customer', () => {
            const customer = createMockCustomer({ lane: 1, position: 60 });
            const state = createMockGameState({ happyCustomers: 0, lives: 3 });

            const result = applyCustomerScoring(customer, state, 1, 1, {
                includeBank: true,
                countsAsServed: true,
                isFirstSlice: false,
                checkLifeGain: true
            });

            expect(result.scoreToAdd).toBe(SCORING.CUSTOMER_NORMAL);
            expect(result.bankToAdd).toBe(SCORING.BASE_BANK_REWARD);
            expect(result.newHappyCustomers).toBe(1);
            expect(result.newStats.customersServed).toBe(1);
            expect(result.floatingScore.points).toBe(SCORING.CUSTOMER_NORMAL);
        });

        it('excludes bank when includeBank is false (Scumbag Steve)', () => {
            const customer = createMockCustomer();
            const state = createMockGameState();

            const result = applyCustomerScoring(customer, state, 1, 1, {
                includeBank: false,
                countsAsServed: true,
                isFirstSlice: false,
                checkLifeGain: true
            });

            expect(result.bankToAdd).toBe(0);
            expect(result.scoreToAdd).toBe(SCORING.CUSTOMER_NORMAL);
        });

        it('does not increment happy customers when countsAsServed is false', () => {
            const customer = createMockCustomer();
            const state = createMockGameState({ happyCustomers: 5 });

            const result = applyCustomerScoring(customer, state, 1, 1, {
                includeBank: true,
                countsAsServed: false,
                isFirstSlice: true,
                checkLifeGain: false
            });

            expect(result.newHappyCustomers).toBe(5); // unchanged
            expect(result.scoreToAdd).toBe(SCORING.CUSTOMER_FIRST_SLICE);
        });

        it('checks life gain when checkLifeGain is true', () => {
            const customer = createMockCustomer({ lane: 2, position: 55 });
            const state = createMockGameState({ happyCustomers: 7, lives: 3 }); // Will become 8

            const result = applyCustomerScoring(customer, state, 1, 1, {
                includeBank: true,
                countsAsServed: true,
                isFirstSlice: false,
                checkLifeGain: true
            });

            expect(result.livesToAdd).toBe(1);
            expect(result.shouldPlayLifeSound).toBe(true);
            expect(result.starGain).toBeDefined();
        });

        it('returns correct floatingScore position', () => {
            const customer = createMockCustomer({ lane: 2, position: 75 });
            const state = createMockGameState();

            const result = applyCustomerScoring(customer, state, 1, 1, {
                includeBank: true,
                countsAsServed: true,
                isFirstSlice: false,
                checkLifeGain: false
            });

            expect(result.floatingScore.lane).toBe(2);
            expect(result.floatingScore.position).toBe(75);
        });
    });
});
