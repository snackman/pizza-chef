import { Customer, DroppedPlate, EmptyPlate, GameState } from '../types/game';
import { ENTITY_SPEEDS, GAME_CONFIG, POSITIONS } from '../lib/constants';

// --- Types for the Update Result ---
export type CustomerUpdateEvent = 
  | 'GAME_OVER' 
  | 'LIFE_LOST' 
  | 'STAR_LOST_CRITIC' 
  | 'STAR_LOST_NORMAL';

export interface CustomerUpdateResult {
  nextCustomers: Customer[];
  events: CustomerUpdateEvent[];
  statsUpdate: {
    customerStreakReset: boolean;
  };
}

// --- Types for the Hit Result ---
export type CustomerHitEvent = 
  | 'SERVED_NORMAL'
  | 'SERVED_CRITIC'
  | 'WOOZY_STEP_1'
  | 'WOOZY_STEP_2'
  | 'UNFROZEN_AND_SERVED'
  | 'BRIAN_DROPPED_PLATE';

export interface CustomerHitResult {
  updatedCustomer: Customer;
  events: CustomerHitEvent[];
  newEntities: {
    droppedPlate?: DroppedPlate;
    emptyPlate?: EmptyPlate;
  };
}

/**
 * 1. MOVEMENT LOGIC
 * Runs every frame. Handles physics, AI, status effects, and win/loss checks.
 */
export const updateCustomerPositions = (
  customers: Customer[],
  activePowerUps: { type: string; endTime: number }[],
  now: number
): CustomerUpdateResult => {
  const events: CustomerUpdateEvent[] = [];
  const nextCustomers: Customer[] = [];
  let customerStreakReset = false;

  const hasHoney = activePowerUps.some(p => p.type === 'honey');
  const hasIceCream = activePowerUps.some(p => p.type === 'ice-cream');
  
  // Find power-up end times for conflict resolution
  const honeyEnd = activePowerUps.find(p => p.type === 'honey')?.endTime || 0;
  const iceCreamEnd = activePowerUps.find(p => p.type === 'ice-cream')?.endTime || 0;

  customers.forEach(customer => {
    // A. Clean up off-screen customers
    if (customer.position <= POSITIONS.OFF_SCREEN_LEFT || customer.position > 100) {
      return; 
    }

    // B. Status Effects Application (Honey/Ice Cream)
    let processedCustomer = { ...customer };
    
    // Brian is immune/complains about effects
    if (processedCustomer.badLuckBrian) {
      if (processedCustomer.hotHoneyAffected || processedCustomer.shouldBeHotHoneyAffected) {
        processedCustomer.hotHoneyAffected = false;
        processedCustomer.shouldBeHotHoneyAffected = false;
        processedCustomer.textMessage = "I can't do spicy.";
        processedCustomer.textMessageTime = now;
      }
    } else if (!processedCustomer.woozy && !processedCustomer.served && !processedCustomer.leaving && !processedCustomer.disappointed) {
      // Normal customers get effects
      if (hasHoney && hasIceCream) {
        if (honeyEnd > iceCreamEnd) {
           // Honey wins
           if (processedCustomer.shouldBeHotHoneyAffected) {
             processedCustomer.hotHoneyAffected = true;
             processedCustomer.frozen = false;
           }
        } else {
           // Ice Cream wins
           if (processedCustomer.shouldBeFrozenByIceCream && !processedCustomer.unfrozenThisPeriod) {
             processedCustomer.frozen = true;
             processedCustomer.hotHoneyAffected = false;
           }
        }
      } else if (hasHoney && processedCustomer.shouldBeHotHoneyAffected) {
        processedCustomer.hotHoneyAffected = true;
        processedCustomer.frozen = false;
      } else if (hasIceCream && processedCustomer.shouldBeFrozenByIceCream && !processedCustomer.unfrozenThisPeriod) {
        processedCustomer.frozen = true;
        processedCustomer.hotHoneyAffected = false;
      }
    }

    // Clear effects if powerups are gone
    if (!hasIceCream && (processedCustomer.frozen || processedCustomer.shouldBeFrozenByIceCream)) {
      processedCustomer.frozen = false;
      processedCustomer.shouldBeFrozenByIceCream = false;
    }
    if (!hasHoney && processedCustomer.hotHoneyAffected) {
      processedCustomer.hotHoneyAffected = false;
    }

    // C. Movement Calculations
    const isDeparting = processedCustomer.served || processedCustomer.disappointed || processedCustomer.vomit || processedCustomer.leaving;

    // 1. Nyan Cat pushed (Zoom!)
    if (processedCustomer.brianNyaned) {
      processedCustomer.position += (processedCustomer.speed * 3);
      processedCustomer.lane -= 0.06;
      nextCustomers.push(processedCustomer);
      return;
    }

    // 2. Frozen (No move)
    if (processedCustomer.frozen && !processedCustomer.hotHoneyAffected && !isDeparting) {
      nextCustomers.push(processedCustomer);
      return;
    }

    // 3. Served/Leaving (Move Right Fast)
    if (processedCustomer.served && !processedCustomer.woozy) {
       processedCustomer.position += (processedCustomer.speed * 2);
       processedCustomer.hotHoneyAffected = false;
       nextCustomers.push(processedCustomer);
       return;
    }

    // 4. Woozy Movement (Swaying)
    if (processedCustomer.woozy) {
      if (processedCustomer.movingRight) {
        // Sway Right
        const newPos = processedCustomer.position + (processedCustomer.speed * 0.75);
        if (newPos >= POSITIONS.TURN_AROUND_POINT) {
          processedCustomer.position = newPos;
          processedCustomer.movingRight = false;
        } else {
          processedCustomer.position = newPos;
        }
      } else {
        // Sway Left (Danger!)
        const newPos = processedCustomer.position - (processedCustomer.speed * 0.75);
        if (newPos <= GAME_CONFIG.CHEF_X_POSITION) {
          // Game Over Condition for Woozy
          events.push('LIFE_LOST');
          events.push(processedCustomer.critic ? 'STAR_LOST_CRITIC' : 'STAR_LOST_NORMAL');
          events.push('GAME_OVER'); // Technically game over logic checks lives later, but this signals a fail state
          
          processedCustomer.disappointed = true;
          processedCustomer.movingRight = true;
          processedCustomer.woozy = false;
          processedCustomer.position = newPos;
          customerStreakReset = true;
        } else {
          processedCustomer.position = newPos;
        }
      }
      nextCustomers.push(processedCustomer);
      return;
    }

    // 5. Departed (Leaving screen)
    if (isDeparting) {
      processedCustomer.position += (processedCustomer.speed * 2);
      nextCustomers.push(processedCustomer);
      return;
    }

    // 6. Bad Luck Brian Special Movement
    if (processedCustomer.badLuckBrian) {
      if (processedCustomer.movingRight) {
        processedCustomer.position += processedCustomer.speed;
        nextCustomers.push(processedCustomer);
        return;
      }
      // Moving Left (Approaching)
      const speedMod = processedCustomer.hotHoneyAffected ? 0.5 : 1;
      const newPos = processedCustomer.position - (processedCustomer.speed * speedMod);
      
      if (newPos <= GAME_CONFIG.CHEF_X_POSITION) {
        // Brian Reaches Chef -> Complains and Leaves (No Game Over)
        processedCustomer.position = newPos;
        processedCustomer.textMessage = "You don't have gluten free?";
        processedCustomer.textMessageTime = now;
        processedCustomer.flipped = false;
        processedCustomer.leaving = true;
        processedCustomer.movingRight = true;
        processedCustomer.hotHoneyAffected = false;
      } else {
        processedCustomer.position = newPos;
      }
      nextCustomers.push(processedCustomer);
      return;
    }

    // 7. Standard Customer Movement (Approaching)
    const speedMod = processedCustomer.hotHoneyAffected ? 0.5 : 1;
    const newPos = processedCustomer.position - (processedCustomer.speed * speedMod);

    if (newPos <= GAME_CONFIG.CHEF_X_POSITION) {
      // Reached Chef -> Angry -> Life Lost
      events.push('LIFE_LOST');
      events.push(processedCustomer.critic ? 'STAR_LOST_CRITIC' : 'STAR_LOST_NORMAL');
      events.push('GAME_OVER');
      
      processedCustomer.disappointed = true;
      processedCustomer.movingRight = true;
      processedCustomer.hotHoneyAffected = false;
      processedCustomer.position = newPos;
      customerStreakReset = true;
    } else {
      processedCustomer.position = newPos;
    }
    
    nextCustomers.push(processedCustomer);
  });

  return { nextCustomers, events, statsUpdate: { customerStreakReset } };
};


/**
 * 2. HIT REACTION LOGIC
 * Runs ONLY when a collision is detected.
 */
export const processCustomerHit = (
  customer: Customer,
  now: number
): CustomerHitResult => {
  const events: CustomerHitEvent[] = [];
  const newEntities: { droppedPlate?: DroppedPlate; emptyPlate?: EmptyPlate } = {};
  
  // 1. Bad Luck Brian (Fail State)
  if (customer.badLuckBrian) {
    events.push('BRIAN_DROPPED_PLATE');
    const droppedPlate: DroppedPlate = {
      id: `dropped-${now}-${customer.id}`,
      lane: customer.lane,
      position: customer.position,
      startTime: now,
      hasSlice: true,
    };
    return {
      updatedCustomer: {
        ...customer,
        leaving: true,
        flipped: false,
        movingRight: true,
        textMessage: "Ugh! I dropped my slice!",
        textMessageTime: now,
        frozen: false,
        woozy: false
      },
      events,
      newEntities: { droppedPlate }
    };
  }

  // 2. Frozen Customers (Instant Serve + Unfreeze)
  if (customer.frozen) {
    events.push('UNFROZEN_AND_SERVED');
    newEntities.emptyPlate = {
      id: `plate-${now}-${customer.id}-unfreeze`,
      lane: customer.lane,
      position: customer.position,
      speed: ENTITY_SPEEDS.PLATE
    };
    return {
      updatedCustomer: {
        ...customer,
        frozen: false,
        unfrozenThisPeriod: true,
        served: true,
        hasPlate: false
      },
      events,
      newEntities
    };
  }

  // 3. Woozy Customers (Two-Step Process)
  if (customer.woozy) {
    const currentState = customer.woozyState || 'normal';
    if (currentState === 'normal') {
      events.push('WOOZY_STEP_1');
      newEntities.emptyPlate = {
        id: `plate-${now}-${customer.id}-first`,
        lane: customer.lane,
        position: customer.position,
        speed: ENTITY_SPEEDS.PLATE
      };
      return {
        updatedCustomer: { ...customer, woozy: false, woozyState: 'drooling' },
        events,
        newEntities
      };
    } 
    if (currentState === 'drooling') {
      events.push('WOOZY_STEP_2');
      newEntities.emptyPlate = {
        id: `plate-${now}-${customer.id}`,
        lane: customer.lane,
        position: customer.position,
        speed: ENTITY_SPEEDS.PLATE
      };
      return {
        updatedCustomer: { ...customer, woozy: false, woozyState: 'satisfied', served: true, hasPlate: false },
        events,
        newEntities
      };
    }
  }

  // 4. Normal / Hot Honey Customers (Standard Serve)
  events.push(customer.critic ? 'SERVED_CRITIC' : 'SERVED_NORMAL');
  newEntities.emptyPlate = {
    id: `plate-${now}-${customer.id}`,
    lane: customer.lane,
    position: customer.position,
    speed: ENTITY_SPEEDS.PLATE
  };

  return {
    updatedCustomer: { ...customer, served: true, hasPlate: false, hotHoneyAffected: false },
    events,
    newEntities
  };
};