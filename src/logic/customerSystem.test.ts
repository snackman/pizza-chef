import { describe, it, expect } from 'vitest';
import { updateCustomerPositions, processCustomerHit, CustomerUpdateResult, CustomerHitResult } from './customerSystem';
import { Customer, ActivePowerUp } from '../types/game';

// Helper to create a basic customer
const createCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'test-customer-1',
  lane: 0,
  position: 80,
  speed: 0.5,
  served: false,
  hasPlate: false,
  leaving: false,
  disappointed: false,
  disappointedEmoji: '😢',
  movingRight: false,
  critic: false,
  badLuckBrian: false,
  flipped: false,
  ...overrides,
});

describe('Customer System - Integrated Tests', () => {
  const now = Date.now();

  describe('Customer Movement (updateCustomerPositions)', () => {
    it('should move customer left when approaching', () => {
      const customer = createCustomer({ position: 80, speed: 0.5 });
      const result = updateCustomerPositions([customer], [], now);

      expect(result.nextCustomers[0].position).toBeLessThan(80);
    });

    it('should move customer right when served', () => {
      const customer = createCustomer({ position: 50, served: true });
      const result = updateCustomerPositions([customer], [], now);

      expect(result.nextCustomers[0].position).toBeGreaterThan(50);
    });

    it('should remove customer when off screen left (position <= -10)', () => {
      const customer = createCustomer({ position: -10 });
      const result = updateCustomerPositions([customer], [], now);

      // Customer should not be in nextCustomers (removed)
      expect(result.nextCustomers.length).toBe(0);
    });

    it('should remove customer when off screen right', () => {
      const customer = createCustomer({ position: 101, served: true });
      const result = updateCustomerPositions([customer], [], now);

      expect(result.nextCustomers.length).toBe(0);
    });
  });

  describe('Customer Disappointment', () => {
    it('should mark customer disappointed when reaching chef (position <= 15)', () => {
      const customer = createCustomer({ position: 16, speed: 2 }); // Will move to 14
      const result = updateCustomerPositions([customer], [], now);

      expect(result.nextCustomers[0].disappointed).toBe(true);
      expect(result.nextCustomers[0].movingRight).toBe(true);
      expect(result.events.some(e => e.type === 'LIFE_LOST')).toBe(true);
    });

    it('should not mark served customer as disappointed', () => {
      const customer = createCustomer({ position: 14, served: true });
      const result = updateCustomerPositions([customer], [], now);

      expect(result.nextCustomers[0].disappointed).toBe(false);
    });
  });

  describe('Frozen Effect (Ice Cream)', () => {
    it('should freeze normal customer when ice cream active and shouldBeFrozenByIceCream', () => {
      const customer = createCustomer({ shouldBeFrozenByIceCream: true });
      const iceCreamPowerUp: ActivePowerUp = { type: 'ice-cream', endTime: now + 5000 };

      const result = updateCustomerPositions([customer], [iceCreamPowerUp], now);

      expect(result.nextCustomers[0].frozen).toBe(true);
    });

    it('should not freeze Bad Luck Brian', () => {
      const customer = createCustomer({
        badLuckBrian: true,
        shouldBeFrozenByIceCream: true
      });
      const iceCreamPowerUp: ActivePowerUp = { type: 'ice-cream', endTime: now + 5000 };

      const result = updateCustomerPositions([customer], [iceCreamPowerUp], now);

      // Brian is immune - shouldBeFrozenByIceCream check is bypassed for badLuckBrian
      expect(result.nextCustomers[0].frozen).toBeFalsy();
    });

    it('should not move frozen customer', () => {
      const customer = createCustomer({
        position: 50,
        frozen: true,
        shouldBeFrozenByIceCream: true
      });
      const iceCreamPowerUp: ActivePowerUp = { type: 'ice-cream', endTime: now + 5000 };

      const result = updateCustomerPositions([customer], [iceCreamPowerUp], now);

      // Position should remain the same (frozen)
      expect(result.nextCustomers[0].position).toBe(50);
    });
  });

  describe('Hot Honey Effect', () => {
    it('should slow down normal customer when honey active (half speed)', () => {
      const customer = createCustomer({
        position: 80,
        speed: 1,
        shouldBeHotHoneyAffected: true
      });
      const honeyPowerUp: ActivePowerUp = { type: 'honey', endTime: now + 5000 };

      const result = updateCustomerPositions([customer], [honeyPowerUp], now);

      // Hot honey slows customers (speed * 0.5), so movement should be 0.5
      const actualMovement = 80 - result.nextCustomers[0].position;
      expect(actualMovement).toBeCloseTo(0.5, 1);
      expect(result.nextCustomers[0].hotHoneyAffected).toBe(true);
    });

    it('should not affect critic with hot honey', () => {
      const customer = createCustomer({
        critic: true,
        shouldBeHotHoneyAffected: true
      });
      const honeyPowerUp: ActivePowerUp = { type: 'honey', endTime: now + 5000 };

      const result = updateCustomerPositions([customer], [honeyPowerUp], now);

      expect(result.nextCustomers[0].hotHoneyAffected).toBe(false);
      expect(result.nextCustomers[0].textMessage).toBe('Just plain, thanks.');
    });

    it('should not affect Bad Luck Brian with hot honey', () => {
      const customer = createCustomer({
        badLuckBrian: true,
        shouldBeHotHoneyAffected: true
      });
      const honeyPowerUp: ActivePowerUp = { type: 'honey', endTime: now + 5000 };

      const result = updateCustomerPositions([customer], [honeyPowerUp], now);

      expect(result.nextCustomers[0].hotHoneyAffected).toBe(false);
      expect(result.nextCustomers[0].textMessage).toBe("I can't do spicy.");
    });
  });

  describe('Woozy Movement', () => {
    it('should move woozy customer right when movingRight is true', () => {
      const customer = createCustomer({
        position: 50,
        woozy: true,
        woozyState: 'normal',
        movingRight: true
      });

      const result = updateCustomerPositions([customer], [], now);

      expect(result.nextCustomers[0].position).toBeGreaterThan(50);
    });

    it('should move woozy customer left when movingRight is false', () => {
      const customer = createCustomer({
        position: 50,
        woozy: true,
        woozyState: 'normal',
        movingRight: false
      });

      const result = updateCustomerPositions([customer], [], now);

      expect(result.nextCustomers[0].position).toBeLessThan(50);
    });
  });

  describe('processCustomerHit', () => {
    it('should serve normal customer and create empty plate', () => {
      const customer = createCustomer();
      const result = processCustomerHit(customer, now);

      expect(result.updatedCustomer.served).toBe(true);
      expect(result.events).toContain('SERVED_NORMAL');
      expect(result.newEntities.emptyPlate).toBeDefined();
    });

    it('should serve critic and emit SERVED_CRITIC event', () => {
      const customer = createCustomer({ critic: true });
      const result = processCustomerHit(customer, now);

      expect(result.updatedCustomer.served).toBe(true);
      expect(result.events).toContain('SERVED_CRITIC');
    });

    it('should handle Bad Luck Brian drop and create dropped plate', () => {
      const customer = createCustomer({ badLuckBrian: true });
      const result = processCustomerHit(customer, now);

      expect(result.updatedCustomer.leaving).toBe(true);
      expect(result.events).toContain('BRIAN_DROPPED_PLATE');
      expect(result.newEntities.droppedPlate).toBeDefined();
      expect(result.updatedCustomer.textMessage).toBe("Ugh! I dropped my slice!");
    });

    it('should serve Bad Luck Brian when doge power-up is active', () => {
      const customer = createCustomer({ badLuckBrian: true });
      const result = processCustomerHit(customer, now, true); // dogeActive = true

      expect(result.updatedCustomer.served).toBe(true);
      expect(result.updatedCustomer.leaving).toBeFalsy();
      expect(result.events).toContain('SERVED_BRIAN_DOGE');
      expect(result.newEntities.emptyPlate).toBeDefined();
      expect(result.updatedCustomer.textMessage).toBe("Such yum!");
    });

    it('should unfreeze and serve frozen customer', () => {
      const customer = createCustomer({ frozen: true });
      const result = processCustomerHit(customer, now);

      expect(result.updatedCustomer.frozen).toBe(false);
      expect(result.updatedCustomer.unfrozenThisPeriod).toBe(true);
      expect(result.updatedCustomer.served).toBe(true);
      expect(result.events).toContain('UNFROZEN_AND_SERVED');
    });

    it('should handle woozy customer first hit (step 1)', () => {
      const customer = createCustomer({ woozy: true, woozyState: 'normal' });
      const result = processCustomerHit(customer, now);

      expect(result.updatedCustomer.woozyState).toBe('drooling');
      expect(result.updatedCustomer.woozy).toBe(false);
      expect(result.events).toContain('WOOZY_STEP_1');
    });

    it('should handle woozy customer second hit (step 2)', () => {
      const customer = createCustomer({ woozy: true, woozyState: 'drooling' });
      const result = processCustomerHit(customer, now);

      expect(result.updatedCustomer.woozyState).toBe('satisfied');
      expect(result.updatedCustomer.served).toBe(true);
      expect(result.events).toContain('WOOZY_STEP_2');
    });
  });

  describe('Bad Luck Brian Behavior', () => {
    it('should move Brian right when movingRight is true', () => {
      const customer = createCustomer({
        badLuckBrian: true,
        movingRight: true,
        position: 50
      });

      const result = updateCustomerPositions([customer], [], now);

      expect(result.nextCustomers[0].position).toBeGreaterThan(50);
    });

    it('should make Brian leave with complaint when reaching chef', () => {
      const customer = createCustomer({
        badLuckBrian: true,
        position: 16,
        speed: 2
      });

      const result = updateCustomerPositions([customer], [], now);

      expect(result.nextCustomers[0].leaving).toBe(true);
      expect(result.nextCustomers[0].textMessage).toBe("You don't have gluten free?");
      // Brian doesn't cause LIFE_LOST
      expect(result.events.some(e => e.type === 'LIFE_LOST')).toBe(false);
    });
  });

  describe('Nyan Cat Effect', () => {
    it('should push brianNyaned customer right and up', () => {
      const customer = createCustomer({
        brianNyaned: true,
        position: 50,
        lane: 2
      });

      const result = updateCustomerPositions([customer], [], now);

      expect(result.nextCustomers[0].position).toBeGreaterThan(50);
      expect(result.nextCustomers[0].lane).toBeLessThan(2);
    });
  });
});
