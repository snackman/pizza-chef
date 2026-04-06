import {
  Customer,
  DroppedPlate,
  EmptyPlate,
  OvenState,
  isCustomerLeaving,
  isCustomerAffectedByPowerUps,
  getCustomerVariant
} from '../types/game';
import { ENTITY_SPEEDS, GAME_CONFIG, POSITIONS, SCUMBAG_STEVE } from '../lib/constants';

// --- Types for the Update Result ---
export type CustomerUpdateEvent =
  | { type: 'GAME_OVER' }
  | { type: 'LIFE_LOST'; lane: number; position: number }
  | { type: 'STAR_LOST_CRITIC'; lane: number; position: number }
  | { type: 'STAR_LOST_NORMAL'; lane: number; position: number }
  | { type: 'HEALTH_INSPECTOR_PASSED'; lane: number; position: number }
  | { type: 'HEALTH_INSPECTOR_FAILED'; lane: number; position: number };

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
  | 'SERVED_BRIAN_DOGE'
  | 'WOOZY_STEP_1'
  | 'WOOZY_STEP_2'
  | 'UNFROZEN_AND_SERVED'
  | 'BRIAN_DROPPED_PLATE'
  | 'STEVE_FIRST_SLICE'
  | 'STEVE_SERVED'
  | 'HEALTH_INSPECTOR_BRIBED';

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
  now: number,
  ovens?: { [key: number]: OvenState }
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
    // Critics are immune to hot honey
    } else if (processedCustomer.critic) {
      if (processedCustomer.hotHoneyAffected || processedCustomer.shouldBeHotHoneyAffected) {
        processedCustomer.hotHoneyAffected = false;
        processedCustomer.shouldBeHotHoneyAffected = false;
        processedCustomer.textMessage = "Just plain, thanks.";
        processedCustomer.textMessageTime = now;
      }
    } else if (isCustomerAffectedByPowerUps(processedCustomer)) {
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
      // If woozy customer was frozen, cure them when ice cream ends
      if (processedCustomer.woozy && processedCustomer.frozen) {
        processedCustomer.woozy = false;
        processedCustomer.woozyState = 'drooling';
      }
      processedCustomer.frozen = false;
      processedCustomer.shouldBeFrozenByIceCream = false;
    }
    if (!hasHoney && processedCustomer.hotHoneyAffected) {
      // If woozy customer had hot honey, cure them when honey ends
      if (processedCustomer.woozy) {
        processedCustomer.woozy = false;
        processedCustomer.woozyState = 'drooling';
      }
      processedCustomer.hotHoneyAffected = false;
    }

    // C. Movement Calculations
    const isDeparting = isCustomerLeaving(processedCustomer);

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
          events.push({ type: 'LIFE_LOST', lane: processedCustomer.lane, position: newPos });
          events.push(getCustomerVariant(processedCustomer) === 'critic'
            ? { type: 'STAR_LOST_CRITIC', lane: processedCustomer.lane, position: newPos }
            : { type: 'STAR_LOST_NORMAL', lane: processedCustomer.lane, position: newPos });
          events.push({ type: 'GAME_OVER' }); // Technically game over logic checks lives later, but this signals a fail state

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

    // 6.5. Scumbag Steve Special Movement (Lane Changing)
    if (processedCustomer.scumbagSteve && !isDeparting) {
      // Check for lane change
      const lastChange = processedCustomer.lastLaneChangeTime || 0;
      if (now - lastChange >= SCUMBAG_STEVE.LANE_CHANGE_INTERVAL) {
        if (Math.random() < SCUMBAG_STEVE.LANE_CHANGE_CHANCE) {
          // Change to a random adjacent lane
          const currentLane = processedCustomer.lane;
          let newLane: number;
          if (currentLane === 0) {
            newLane = 1;
          } else if (currentLane === GAME_CONFIG.LANE_COUNT - 1) {
            newLane = GAME_CONFIG.LANE_COUNT - 2;
          } else {
            newLane = Math.random() < 0.5 ? currentLane - 1 : currentLane + 1;
          }
          processedCustomer.lane = newLane;
        }
        processedCustomer.lastLaneChangeTime = now;
      }

      // Steve moves (faster than normal, set in spawn)
      if (processedCustomer.movingRight) {
        processedCustomer.position += processedCustomer.speed;
        nextCustomers.push(processedCustomer);
        return;
      }

      const newPos = processedCustomer.position - processedCustomer.speed;
      if (newPos <= GAME_CONFIG.CHEF_X_POSITION) {
        // Steve reaches chef without enough pizza -> Disappointed
        events.push({ type: 'LIFE_LOST', lane: processedCustomer.lane, position: newPos });
        events.push({ type: 'STAR_LOST_NORMAL', lane: processedCustomer.lane, position: newPos });
        events.push({ type: 'GAME_OVER' });

        processedCustomer.disappointed = true;
        processedCustomer.movingRight = true;
        processedCustomer.position = newPos;
        processedCustomer.textMessage = "I wanted more!";
        processedCustomer.textMessageTime = now;
        customerStreakReset = true;
      } else {
        processedCustomer.position = newPos;
      }
      nextCustomers.push(processedCustomer);
      return;
    }

    // 6.75. Health Inspector Movement
    if (processedCustomer.healthInspector && !isDeparting) {
      if (processedCustomer.movingRight) {
        processedCustomer.position += processedCustomer.speed * 2;
        nextCustomers.push(processedCustomer);
        return;
      }

      const hiNewPos = processedCustomer.position - processedCustomer.speed;
      if (hiNewPos <= GAME_CONFIG.CHEF_X_POSITION) {
        // Health inspector reached the counter - check ovens
        processedCustomer.position = hiNewPos;
        if (ovens) {
          const hasBurntOven = Object.values(ovens).some(oven => oven.burned);
          if (hasBurntOven) {
            events.push({ type: 'HEALTH_INSPECTOR_FAILED', lane: processedCustomer.lane, position: hiNewPos });
          } else {
            events.push({ type: 'HEALTH_INSPECTOR_PASSED', lane: processedCustomer.lane, position: hiNewPos });
          }
        } else {
          events.push({ type: 'HEALTH_INSPECTOR_PASSED', lane: processedCustomer.lane, position: hiNewPos });
        }
        processedCustomer.leaving = true;
        processedCustomer.movingRight = true;
      } else {
        processedCustomer.position = hiNewPos;
      }
      nextCustomers.push(processedCustomer);
      return;
    }

    // 7. Standard Customer Movement (Approaching)
    const speedMod = processedCustomer.hotHoneyAffected ? 0.5 : 1;
    const newPos = processedCustomer.position - (processedCustomer.speed * speedMod);

    if (newPos <= GAME_CONFIG.CHEF_X_POSITION) {
      // Reached Chef -> Angry -> Life Lost
      events.push({ type: 'LIFE_LOST', lane: processedCustomer.lane, position: newPos });
      events.push(getCustomerVariant(processedCustomer) === 'critic'
        ? { type: 'STAR_LOST_CRITIC', lane: processedCustomer.lane, position: newPos }
        : { type: 'STAR_LOST_NORMAL', lane: processedCustomer.lane, position: newPos });
      events.push({ type: 'GAME_OVER' });

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
  now: number,
  dogeActive: boolean = false
): CustomerHitResult => {
  const events: CustomerHitEvent[] = [];
  const newEntities: { droppedPlate?: DroppedPlate; emptyPlate?: EmptyPlate } = {};

  // 0. Health Inspector - rejects pizza ("No bribes!")
  if (customer.healthInspector) {
    events.push('HEALTH_INSPECTOR_BRIBED');
    return {
      updatedCustomer: {
        ...customer,
        textMessage: "No bribes!",
        textMessageTime: now,
      },
      events,
      newEntities: {}
    };
  }

  // 1. Bad Luck Brian
  if (customer.badLuckBrian) {
    // Doge power-up lets Brian be served successfully!
    if (dogeActive) {
      events.push('SERVED_BRIAN_DOGE');
      newEntities.emptyPlate = {
        id: `plate-${now}-${customer.id}`,
        lane: customer.lane,
        position: customer.position,
        speed: ENTITY_SPEEDS.PLATE,
        createdAt: now
      };
      return {
        updatedCustomer: {
          ...customer,
          served: true,
          hasPlate: false,
          flipped: false,
          textMessage: "Such yum!",
          textMessageTime: now,
          frozen: false,
          woozy: false
        },
        events,
        newEntities
      };
    }

    // Normal Brian behavior - drops the plate
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
      speed: ENTITY_SPEEDS.PLATE,
      createdAt: now
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
        speed: ENTITY_SPEEDS.PLATE,
        createdAt: now
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
        speed: ENTITY_SPEEDS.PLATE,
        createdAt: now
      };
      return {
        updatedCustomer: { ...customer, woozy: false, woozyState: 'satisfied', served: true, hasPlate: false },
        events,
        newEntities
      };
    }
  }

  // 4. Scumbag Steve (Two-Slice Requirement, Angled Plate, No Payment)
  if (customer.scumbagSteve) {
    const slicesReceived = (customer.slicesReceived || 0) + 1;

    // Calculate target lane for angled throw (toward adjacent oven)
    let targetLane: number;
    if (customer.lane === 0) {
      targetLane = 1; // Top lane throws to lane below
    } else if (customer.lane === GAME_CONFIG.LANE_COUNT - 1) {
      targetLane = GAME_CONFIG.LANE_COUNT - 2; // Bottom lane throws to lane above
    } else {
      // Middle lanes randomly throw up or down
      targetLane = Math.random() < 0.5 ? customer.lane - 1 : customer.lane + 1;
    }

    if (slicesReceived < SCUMBAG_STEVE.SLICES_REQUIRED) {
      // First slice - not satisfied yet
      events.push('STEVE_FIRST_SLICE');
      newEntities.emptyPlate = {
        id: `plate-${now}-${customer.id}-first`,
        lane: customer.lane, // Start at Steve's lane
        position: customer.position,
        speed: ENTITY_SPEEDS.PLATE,
        createdAt: now,
        // Angled throw properties
        startLane: customer.lane,
        startPosition: customer.position,
        targetLane: targetLane
      };
      return {
        updatedCustomer: {
          ...customer,
          slicesReceived,
          textMessage: "I'm still hungry!",
          textMessageTime: now
        },
        events,
        newEntities
      };
    } else {
      // Second slice - Steve is satisfied but doesn't pay
      events.push('STEVE_SERVED');
      newEntities.emptyPlate = {
        id: `plate-${now}-${customer.id}`,
        lane: customer.lane, // Start at Steve's lane
        position: customer.position,
        speed: ENTITY_SPEEDS.PLATE,
        createdAt: now,
        // Angled throw properties
        startLane: customer.lane,
        startPosition: customer.position,
        targetLane: targetLane
      };
      return {
        updatedCustomer: {
          ...customer,
          served: true,
          hasPlate: false,
          slicesReceived,
          flipped: true, // Flip when leaving
          textMessage: "Thanks sucker!",
          textMessageTime: now
        },
        events,
        newEntities
      };
    }
  }

  // 5. Normal / Hot Honey Customers (Standard Serve)
  events.push(getCustomerVariant(customer) === 'critic' ? 'SERVED_CRITIC' : 'SERVED_NORMAL');
  newEntities.emptyPlate = {
    id: `plate-${now}-${customer.id}`,
    lane: customer.lane,
    position: customer.position,
    speed: ENTITY_SPEEDS.PLATE,
    createdAt: now
  };

  return {
    updatedCustomer: { ...customer, served: true, hasPlate: false, hotHoneyAffected: false },
    events,
    newEntities
  };
};