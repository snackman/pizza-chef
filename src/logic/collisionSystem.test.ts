import { describe, it, expect } from 'vitest';
import {
  checkSliceCustomerCollision,
  checkSlicePowerUpCollision,
  checkChefPowerUpCollision,
  checkChefPlateCollision,
  checkStarPowerRange,
  checkMinionReachedChef,
  checkSliceMinionCollision,
  checkNyanSweepCollision,
} from './collisionSystem';
import {
  createCustomer,
  createPizzaSlice,
  createPowerUp,
  createBossMinion,
} from '../test/factories';
import { GAME_CONFIG } from '../lib/constants';

describe('collisionSystem', () => {
  // ---- Slice ↔ Customer ----
  describe('checkSliceCustomerCollision', () => {
    it('detects collision when slice and customer are on same lane and close', () => {
      const slice = createPizzaSlice({ lane: 1, position: 50 });
      const customer = createCustomer({ lane: 1, position: 52 });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(true);
    });

    it('returns false when on different lanes', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 2, position: 50 });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('returns false when positions are too far apart', () => {
      const slice = createPizzaSlice({ lane: 0, position: 10 });
      const customer = createCustomer({ lane: 0, position: 80 });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('returns false for a served customer', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 0, position: 50, served: true });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('returns false for a disappointed customer', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 0, position: 50, disappointed: true });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('returns false for a vomiting customer', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 0, position: 50, vomit: true });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('returns false for a leaving customer', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 0, position: 50, leaving: true });

      expect(checkSliceCustomerCollision(slice, customer)).toBe(false);
    });

    it('respects custom threshold', () => {
      const slice = createPizzaSlice({ lane: 0, position: 50 });
      const customer = createCustomer({ lane: 0, position: 53 });

      // Default threshold is 5, so distance 3 is a hit
      expect(checkSliceCustomerCollision(slice, customer, 5)).toBe(true);
      // With threshold 2, distance 3 is NOT a hit
      expect(checkSliceCustomerCollision(slice, customer, 2)).toBe(false);
    });
  });

  // ---- Slice ↔ PowerUp ----
  describe('checkSlicePowerUpCollision', () => {
    it('detects collision on same lane and close position', () => {
      const slice = createPizzaSlice({ lane: 2, position: 40 });
      const powerUp = createPowerUp({ lane: 2, position: 42 });

      expect(checkSlicePowerUpCollision(slice, powerUp)).toBe(true);
    });

    it('returns false on different lanes', () => {
      const slice = createPizzaSlice({ lane: 0, position: 40 });
      const powerUp = createPowerUp({ lane: 3, position: 40 });

      expect(checkSlicePowerUpCollision(slice, powerUp)).toBe(false);
    });
  });

  // ---- Chef ↔ PowerUp ----
  describe('checkChefPowerUpCollision', () => {
    it('detects collision when powerUp passes the chef x position', () => {
      const chefLane = 1;
      const chefX = GAME_CONFIG.CHEF_X_POSITION;
      const powerUp = createPowerUp({ lane: 1, position: chefX - 1 }); // past chef

      expect(checkChefPowerUpCollision(chefLane, chefX, powerUp)).toBe(true);
    });

    it('returns false when powerUp is ahead of chef', () => {
      const chefLane = 1;
      const chefX = GAME_CONFIG.CHEF_X_POSITION;
      const powerUp = createPowerUp({ lane: 1, position: chefX + 10 });

      expect(checkChefPowerUpCollision(chefLane, chefX, powerUp)).toBe(false);
    });

    it('returns false when on different lanes', () => {
      const chefLane = 0;
      const chefX = GAME_CONFIG.CHEF_X_POSITION;
      const powerUp = createPowerUp({ lane: 2, position: chefX });

      expect(checkChefPowerUpCollision(chefLane, chefX, powerUp)).toBe(false);
    });
  });

  // ---- Chef ↔ EmptyPlate ----
  describe('checkChefPlateCollision', () => {
    it('detects collision when plate reaches chef position on same lane', () => {
      const chefLane = 0;
      const plate = {
        id: 'plate-1',
        lane: 0,
        position: 5, // past threshold of 10
        speed: 2,
        createdAt: Date.now(),
      };

      expect(checkChefPlateCollision(chefLane, plate)).toBe(true);
    });

    it('returns false when plate is far from chef', () => {
      const chefLane = 0;
      const plate = {
        id: 'plate-1',
        lane: 0,
        position: 50,
        speed: 2,
        createdAt: Date.now(),
      };

      expect(checkChefPlateCollision(chefLane, plate)).toBe(false);
    });

    it('returns false on different lanes (no angled throw)', () => {
      const chefLane = 0;
      const plate = {
        id: 'plate-1',
        lane: 2,
        position: 5,
        speed: 2,
        createdAt: Date.now(),
      };

      expect(checkChefPlateCollision(chefLane, plate)).toBe(false);
    });
  });

  // ---- Star Power Range ----
  describe('checkStarPowerRange', () => {
    it('detects when chef is close to customer on same lane', () => {
      const customer = createCustomer({ lane: 1, position: 20 });
      expect(checkStarPowerRange(1, 15, customer)).toBe(true);
    });

    it('returns false when customer is served', () => {
      const customer = createCustomer({ lane: 1, position: 20, served: true });
      expect(checkStarPowerRange(1, 15, customer)).toBe(false);
    });

    it('returns false when customer is disappointed', () => {
      const customer = createCustomer({ lane: 1, position: 20, disappointed: true });
      expect(checkStarPowerRange(1, 15, customer)).toBe(false);
    });

    it('returns false when too far away', () => {
      const customer = createCustomer({ lane: 1, position: 80 });
      expect(checkStarPowerRange(1, 15, customer)).toBe(false);
    });
  });

  // ---- Minion ↔ Chef ----
  describe('checkMinionReachedChef', () => {
    it('detects when minion has reached chef', () => {
      const minion = createBossMinion({ position: GAME_CONFIG.CHEF_X_POSITION - 1 });
      expect(checkMinionReachedChef(minion)).toBe(true);
    });

    it('returns false when minion is still approaching', () => {
      const minion = createBossMinion({ position: 50 });
      expect(checkMinionReachedChef(minion)).toBe(false);
    });

    it('returns false for defeated minion', () => {
      const minion = createBossMinion({ position: 5, defeated: true });
      expect(checkMinionReachedChef(minion)).toBe(false);
    });
  });

  // ---- Slice ↔ Minion ----
  describe('checkSliceMinionCollision', () => {
    it('detects collision on same lane and close position', () => {
      const slice = createPizzaSlice({ lane: 2, position: 60 });
      const minion = createBossMinion({ lane: 2, position: 62 });

      expect(checkSliceMinionCollision(slice, minion)).toBe(true);
    });

    it('returns false for defeated minion', () => {
      const slice = createPizzaSlice({ lane: 2, position: 60 });
      const minion = createBossMinion({ lane: 2, position: 60, defeated: true });

      expect(checkSliceMinionCollision(slice, minion)).toBe(false);
    });

    it('returns false on different lanes', () => {
      const slice = createPizzaSlice({ lane: 0, position: 60 });
      const minion = createBossMinion({ lane: 3, position: 60 });

      expect(checkSliceMinionCollision(slice, minion)).toBe(false);
    });
  });

  // ---- Nyan Sweep ----
  describe('checkNyanSweepCollision', () => {
    it('detects entity within sweep range and lane tolerance', () => {
      const entity = { lane: 1, position: 45 };
      // Sweep from 40 to 50, nyan is on lane 1
      expect(checkNyanSweepCollision(1, 40, 50, entity)).toBe(true);
    });

    it('returns false when entity is outside sweep range', () => {
      const entity = { lane: 1, position: 10 };
      expect(checkNyanSweepCollision(1, 40, 50, entity)).toBe(false);
    });

    it('returns false when entity is on a distant lane', () => {
      const entity = { lane: 3, position: 45 };
      expect(checkNyanSweepCollision(0, 40, 50, entity)).toBe(false);
    });

    it('hits adjacent lanes within tolerance', () => {
      const entity = { lane: 1, position: 45 };
      // Nyan on lane 0, tolerance 0.8 — lane diff is 1, which is > 0.8
      expect(checkNyanSweepCollision(0, 40, 50, entity, 0.8)).toBe(false);
      // Tolerance 1.5 — lane diff 1 < 1.5
      expect(checkNyanSweepCollision(0, 40, 50, entity, 1.5)).toBe(true);
    });
  });
});
