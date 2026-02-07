import { describe, it, expect } from 'vitest';
import {
  checkSliceCustomerCollision,
  checkSlicePowerUpCollision,
  checkChefPowerUpCollision,
  checkChefPlateCollision,
  checkMinionReachedChef,
  checkSliceMinionCollision,
} from './collisionSystem';
import { GAME_CONFIG } from '../lib/constants';
import {
  createCustomer,
  createPizzaSlice,
  createPowerUp,
  createEmptyPlate,
  createBossMinion,
} from '../test/factories';

describe('collisionSystem', () => {
  describe('checkSliceCustomerCollision', () => {
    it('returns true when slice and customer are in same lane and close enough', () => {
      const slice = createPizzaSlice({ lane: 1, position: 50 });
      const customer = createCustomer({ lane: 1, position: 52 });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(true);
    });

    it('returns false when slice and customer are in different lanes', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 2, position: 50 });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('returns false when slice and customer are too far apart', () => {
      const slice = createPizzaSlice({ lane: 1, position: 20 });
      const customer = createCustomer({ lane: 1, position: 80 });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('skips served customers', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 0, position: 50, served: true });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('skips disappointed customers', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 0, position: 50, disappointed: true });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('skips leaving customers', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 0, position: 50, leaving: true });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('skips vomiting customers', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 0, position: 50, vomit: true });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('detects collision at the threshold boundary', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      // Default threshold is 5, so position 54.9 should still collide
      const customer = createCustomer({ lane: 0, position: 54.9 });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(true);
    });

    it('does not collide exactly at threshold distance', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      // Default threshold is 5, so exactly 5 apart should NOT collide (< not <=)
      const customer = createCustomer({ lane: 0, position: 55 });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });
  });

  describe('checkSlicePowerUpCollision', () => {
    it('returns true when slice and power-up are in same lane and close enough', () => {
      const slice = createPizzaSlice({ lane: 2, position: 40 });
      const powerUp = createPowerUp({ lane: 2, position: 42 });

      expect(checkSlicePowerUpCollision(slice, powerUp)).toBe(true);
    });

    it('returns false when in different lanes', () => {
      const slice = createPizzaSlice({ lane: 0, position: 40 });
      const powerUp = createPowerUp({ lane: 3, position: 40 });

      expect(checkSlicePowerUpCollision(slice, powerUp)).toBe(false);
    });

    it('returns false when too far apart in same lane', () => {
      const slice = createPizzaSlice({ lane: 1, position: 10 });
      const powerUp = createPowerUp({ lane: 1, position: 80 });

      expect(checkSlicePowerUpCollision(slice, powerUp)).toBe(false);
    });
  });

  describe('checkChefPowerUpCollision', () => {
    it('returns true when power-up reaches chef position on same lane', () => {
      const powerUp = createPowerUp({ lane: 0, position: GAME_CONFIG.CHEF_X_POSITION });

      expect(checkChefPowerUpCollision(0, GAME_CONFIG.CHEF_X_POSITION, powerUp)).toBe(true);
    });

    it('returns true when power-up is past the chef position', () => {
      const powerUp = createPowerUp({ lane: 1, position: GAME_CONFIG.CHEF_X_POSITION - 5 });

      expect(checkChefPowerUpCollision(1, GAME_CONFIG.CHEF_X_POSITION, powerUp)).toBe(true);
    });

    it('returns false when chef is on different lane', () => {
      const powerUp = createPowerUp({ lane: 2, position: GAME_CONFIG.CHEF_X_POSITION });

      expect(checkChefPowerUpCollision(0, GAME_CONFIG.CHEF_X_POSITION, powerUp)).toBe(false);
    });

    it('returns false when power-up has not yet reached chef', () => {
      const powerUp = createPowerUp({ lane: 0, position: 80 });

      expect(checkChefPowerUpCollision(0, GAME_CONFIG.CHEF_X_POSITION, powerUp)).toBe(false);
    });
  });

  describe('checkChefPlateCollision', () => {
    it('returns true when plate reaches chef on same lane', () => {
      const plate = createEmptyPlate({ lane: 1, position: 8 });

      expect(checkChefPlateCollision(1, plate)).toBe(true);
    });

    it('returns false when plate has not reached chef threshold', () => {
      const plate = createEmptyPlate({ lane: 0, position: 50 });

      expect(checkChefPlateCollision(0, plate)).toBe(false);
    });

    it('handles angled plate with target lane', () => {
      const plate = createEmptyPlate({
        lane: 0,
        position: 5,
        startLane: 2,
        startPosition: 80,
        targetLane: 0,
      });

      expect(checkChefPlateCollision(0, plate)).toBe(true);
    });

    it('returns false for angled plate on wrong lane', () => {
      const plate = createEmptyPlate({
        lane: 2,
        position: 5,
        startLane: 2,
        startPosition: 80,
        targetLane: 2,
      });

      // Chef is on lane 0, plate target is lane 2
      expect(checkChefPlateCollision(0, plate)).toBe(false);
    });
  });

  describe('checkMinionReachedChef', () => {
    it('returns true when minion reaches chef position', () => {
      const minion = createBossMinion({ position: GAME_CONFIG.CHEF_X_POSITION, defeated: false });

      expect(checkMinionReachedChef(minion)).toBe(true);
    });

    it('returns true when minion is past chef position', () => {
      const minion = createBossMinion({ position: GAME_CONFIG.CHEF_X_POSITION - 5, defeated: false });

      expect(checkMinionReachedChef(minion)).toBe(true);
    });

    it('returns false when minion has not reached chef', () => {
      const minion = createBossMinion({ position: 80, defeated: false });

      expect(checkMinionReachedChef(minion)).toBe(false);
    });

    it('returns false for defeated minions even at chef position', () => {
      const minion = createBossMinion({ position: GAME_CONFIG.CHEF_X_POSITION, defeated: true });

      expect(checkMinionReachedChef(minion)).toBe(false);
    });
  });

  describe('checkSliceMinionCollision', () => {
    it('returns true when slice hits minion in same lane and close enough', () => {
      const slice = createPizzaSlice({ lane: 1, position: 50 });
      const minion = createBossMinion({ lane: 1, position: 52, defeated: false });

      expect(checkSliceMinionCollision(slice, minion)).toBe(true);
    });

    it('returns false when in different lanes', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const minion = createBossMinion({ lane: 3, position: 50, defeated: false });

      expect(checkSliceMinionCollision(slice, minion)).toBe(false);
    });

    it('returns false when too far apart', () => {
      const slice = createPizzaSlice({ lane: 1, position: 10 });
      const minion = createBossMinion({ lane: 1, position: 80, defeated: false });

      expect(checkSliceMinionCollision(slice, minion)).toBe(false);
    });

    it('returns false for defeated minions', () => {
      const slice = createPizzaSlice({ lane: 1, position: 50 });
      const minion = createBossMinion({ lane: 1, position: 50, defeated: true });

      expect(checkSliceMinionCollision(slice, minion)).toBe(false);
    });
  });
});
