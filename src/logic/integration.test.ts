import { describe, it, expect } from 'vitest';
import { createGameState, createCustomer, createPizzaSlice, createBossMinion } from '../test/factories';
import { spawnCustomerAtLane, activatePowerUp, advanceGameFrames } from '../test/helpers';
import { checkSliceCustomerCollision, checkSliceMinionCollision } from './collisionSystem';
import { processCustomerHit } from './customerSystem';
import { applyCustomerScoring, calculateCustomerScore } from './scoringSystem';
import { SCORING, GAME_CONFIG } from '../lib/constants';

describe('Integration Tests', () => {
  describe('Serve pizza → score update → streak tracking', () => {
    it('serving a normal customer awards correct score and increments stats', () => {
      const state = createGameState({ score: 0, happyCustomers: 0 });
      const customer = createCustomer({ lane: 1, position: 60 });

      // Step 1: Hit the customer with a slice
      const hitResult = processCustomerHit(customer, Date.now());
      expect(hitResult.updatedCustomer.served).toBe(true);
      expect(hitResult.events).toContain('SERVED_NORMAL');

      // Step 2: Apply scoring
      const scoringResult = applyCustomerScoring(
        customer,
        state,
        1, // dogeMultiplier
        1, // streakMultiplier
        {
          includeBank: true,
          countsAsServed: true,
          isFirstSlice: false,
          checkLifeGain: true,
        }
      );

      expect(scoringResult.scoreToAdd).toBe(SCORING.CUSTOMER_NORMAL);
      expect(scoringResult.bankToAdd).toBe(SCORING.BASE_BANK_REWARD);
      expect(scoringResult.newHappyCustomers).toBe(1);
      expect(scoringResult.newStats.customersServed).toBe(1);
      expect(scoringResult.newStats.currentCustomerStreak).toBe(1);
    });

    it('serving multiple customers builds up a streak', () => {
      let state = createGameState({ score: 0, happyCustomers: 0 });

      for (let i = 0; i < 5; i++) {
        const customer = createCustomer({ lane: 0, position: 60 });
        const scoringResult = applyCustomerScoring(
          customer,
          state,
          1,
          1,
          {
            includeBank: true,
            countsAsServed: true,
            isFirstSlice: false,
            checkLifeGain: true,
          }
        );

        state = createGameState({
          score: state.score + scoringResult.scoreToAdd,
          happyCustomers: scoringResult.newHappyCustomers,
          stats: scoringResult.newStats,
        });
      }

      expect(state.happyCustomers).toBe(5);
      expect(state.stats.customersServed).toBe(5);
      expect(state.stats.currentCustomerStreak).toBe(5);
      expect(state.stats.longestCustomerStreak).toBe(5);
      expect(state.score).toBe(SCORING.CUSTOMER_NORMAL * 5);
    });
  });

  describe('Doge power-up doubles scoring', () => {
    it('doge multiplier doubles points and bank for a served customer', () => {
      const customer = createCustomer({ lane: 0, position: 70 });

      const normalScore = calculateCustomerScore(customer, 1, 1);
      const dogeScore = calculateCustomerScore(customer, 2, 1);

      expect(dogeScore.points).toBe(normalScore.points * 2);
      expect(dogeScore.bank).toBe(normalScore.bank * 2);
    });
  });

  describe('Critic gives bonus score and possible life gain', () => {
    it('critic awards double points compared to normal customer', () => {
      const normal = createCustomer();
      const critic = createCustomer({ critic: true });

      const normalScore = calculateCustomerScore(normal, 1, 1);
      const criticScore = calculateCustomerScore(critic, 1, 1);

      expect(criticScore.points).toBe(SCORING.CUSTOMER_CRITIC);
      expect(criticScore.points).toBe(normalScore.points * 2);
    });

    it('serving critic at position >= 50 grants a life when below max', () => {
      const state = createGameState({ lives: 3, happyCustomers: 0 });
      const critic = createCustomer({ critic: true, lane: 1, position: 65 });

      const result = applyCustomerScoring(critic, state, 1, 1, {
        includeBank: true,
        countsAsServed: true,
        isFirstSlice: false,
        checkLifeGain: true,
      });

      expect(result.livesToAdd).toBe(1);
      expect(result.shouldPlayLifeSound).toBe(true);
    });
  });

  describe('Customer movement and collision flow', () => {
    it('customers move toward the chef each frame', () => {
      let state = createGameState();
      state = spawnCustomerAtLane(state, 2);
      const initialPosition = state.customers[0].position;

      state = advanceGameFrames(state, 5);

      expect(state.customers[0].position).toBeLessThan(initialPosition);
    });

    it('slice can collide with approaching customer at correct position', () => {
      const customer = createCustomer({ lane: 1, position: 50 });
      const slice = createPizzaSlice({ lane: 1, position: 48 });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(true);
    });

    it('full flow: customer approaches, slice hits, customer is served', () => {
      const customer = createCustomer({ lane: 0, position: 50 });
      const slice = createPizzaSlice({ lane: 0, position: 48 });

      // Check collision
      const isHit = checkSliceCustomerCollision(slice, customer);
      expect(isHit).toBe(true);

      // Process the hit
      const hitResult = processCustomerHit(customer, Date.now());
      expect(hitResult.updatedCustomer.served).toBe(true);
      expect(hitResult.newEntities.emptyPlate).toBeDefined();
    });
  });

  describe('Boss battle: slice hits minion', () => {
    it('pizza slice collides with minion on same lane', () => {
      const slice = createPizzaSlice({ lane: 2, position: 60 });
      const minion = createBossMinion({ lane: 2, position: 62 });

      expect(checkSliceMinionCollision(slice, minion)).toBe(true);
    });

    it('defeated minion ignores further collisions', () => {
      const slice = createPizzaSlice({ lane: 2, position: 60 });
      const minion = createBossMinion({ lane: 2, position: 60, defeated: true });

      expect(checkSliceMinionCollision(slice, minion)).toBe(false);
    });
  });

  describe('Life gain at every 8 happy customers', () => {
    it('grants a life at the 8th happy customer when below max', () => {
      const state = createGameState({ lives: 3, happyCustomers: 7 });
      const customer = createCustomer({ lane: 0, position: 60 });

      const result = applyCustomerScoring(customer, state, 1, 1, {
        includeBank: true,
        countsAsServed: true,
        isFirstSlice: false,
        checkLifeGain: true,
      });

      // happyCustomers goes from 7 → 8, triggering life gain
      expect(result.newHappyCustomers).toBe(8);
      expect(result.livesToAdd).toBe(1);
    });

    it('does not exceed MAX_LIVES', () => {
      const state = createGameState({ lives: GAME_CONFIG.MAX_LIVES, happyCustomers: 7 });
      const customer = createCustomer({ lane: 0, position: 60 });

      const result = applyCustomerScoring(customer, state, 1, 1, {
        includeBank: true,
        countsAsServed: true,
        isFirstSlice: false,
        checkLifeGain: true,
      });

      expect(result.livesToAdd).toBe(0);
    });
  });
});
