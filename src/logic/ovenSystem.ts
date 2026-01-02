import { GameState, OvenState } from '../types/game';
import { OVEN_CONFIG, GAME_CONFIG } from '../lib/constants';

export type OvenSoundState = 'idle' | 'cooking' | 'ready' | 'warning' | 'burning';

export interface OvenTickResult {
  nextOvens: { [key: number]: OvenState };
  nextSoundStates: { [key: number]: OvenSoundState };
  events: OvenEvent[];
  statsUpdate: {
    slicesBaked: number;
    burned: boolean;
  };
}

export type OvenEvent = 
  | { type: 'SOUND_READY', lane: number }
  | { type: 'SOUND_WARNING', lane: number }
  | { type: 'SOUND_BURNING', lane: number }
  | { type: 'BURNED_ALIVE', lane: number } // The moment it burns
  | { type: 'CLEANING_COMPLETE', lane: number };

export interface OvenInteractionResult {
  action: 'STARTED' | 'SERVED' | 'NONE';
  newState?: Partial<GameState>; // Only the parts that changed
}

/**
 * Calculates the status of all ovens for a single game tick
 */
export const processOvenTick = (
  currentOvens: { [key: number]: OvenState },
  currentSoundStates: { [key: number]: OvenSoundState },
  speedUpgrades: { [key: number]: number },
  now: number
): OvenTickResult => {
  const nextOvens = { ...currentOvens };
  const nextSoundStates = { ...currentSoundStates };
  const events: OvenEvent[] = [];
  const statsUpdate = { slicesBaked: 0, burned: false };

  Object.keys(nextOvens).forEach(laneKey => {
    const lane = parseInt(laneKey);
    const oven = nextOvens[lane];

    // 1. Handle Cleaning
    if (oven.burned && oven.cleaningStartTime > 0) {
      if (now - oven.cleaningStartTime >= OVEN_CONFIG.CLEANING_TIME) {
        events.push({ type: 'CLEANING_COMPLETE', lane });
        nextOvens[lane] = { 
          cooking: false, 
          startTime: 0, 
          burned: false, 
          cleaningStartTime: 0, 
          sliceCount: 0 
        };
      }
      return; 
    }

    // 2. Handle Cooking
    if (oven.cooking && !oven.burned) {
      const elapsed = oven.pausedElapsed !== undefined ? oven.pausedElapsed : now - oven.startTime;
      const speedUpgrade = speedUpgrades[lane] || 0;
      const cookTime = OVEN_CONFIG.COOK_TIMES[speedUpgrade];

      // Determine current logical state
      let currentState: OvenSoundState = 'cooking';
      if (elapsed >= OVEN_CONFIG.BURN_TIME) currentState = 'burning';
      else if (elapsed >= OVEN_CONFIG.WARNING_TIME) currentState = 'warning';
      else if (elapsed >= cookTime) currentState = 'ready';

      // Detect Sound State Changes
      const previousState = nextSoundStates[lane];
      if (currentState !== previousState) {
        if (currentState === 'ready' && previousState === 'cooking') events.push({ type: 'SOUND_READY', lane });
        else if (currentState === 'warning' && previousState === 'ready') events.push({ type: 'SOUND_WARNING', lane });
        else if (currentState === 'burning' && previousState === 'warning') events.push({ type: 'SOUND_BURNING', lane });
        
        nextSoundStates[lane] = currentState;
      }

      // Handle actual Burn Event (Game logic impact)
      if (elapsed >= OVEN_CONFIG.BURN_TIME) {
        events.push({ type: 'BURNED_ALIVE', lane });
        statsUpdate.burned = true;
        
        // Reset oven to burned state
        nextOvens[lane] = { 
          cooking: false, 
          startTime: 0, 
          burned: true, 
          cleaningStartTime: 0, 
          sliceCount: 0 
        };
        nextSoundStates[lane] = 'idle';
      }
    } else if (!oven.cooking && nextSoundStates[lane] !== 'idle') {
      // Ensure sound state resets if oven stops cooking (e.g. served)
      nextSoundStates[lane] = 'idle';
    }
  });

  return { nextOvens, nextSoundStates, events, statsUpdate };
};

/**
 * Handles the logic when a user clicks an oven to Cook or Serve
 */
export const tryInteractWithOven = (
  gameState: GameState,
  lane: number,
  now: number
): OvenInteractionResult => {
  const currentOven = gameState.ovens[lane];
  
  if (currentOven.burned) return { action: 'NONE' };

  // A. Start Cooking
  if (!currentOven.cooking) {
    const slicesProduced = 1 + (gameState.ovenUpgrades[lane] || 0);
    return {
      action: 'STARTED',
      newState: {
        ovens: {
          ...gameState.ovens,
          [lane]: { 
            cooking: true, 
            startTime: now, 
            burned: false, 
            cleaningStartTime: 0, 
            sliceCount: slicesProduced 
          }
        }
      }
    };
  } 
  
  // B. Serve Pizza
  const speedUpgrade = gameState.ovenSpeedUpgrades[lane] || 0;
  const cookTime = OVEN_CONFIG.COOK_TIMES[speedUpgrade];
  
  // Check if cooked enough but not burned
  if (now - currentOven.startTime >= cookTime && now - currentOven.startTime < OVEN_CONFIG.BURN_TIME) {
    const slicesProduced = currentOven.sliceCount;
    const newTotal = gameState.availableSlices + slicesProduced;

    if (newTotal <= GAME_CONFIG.MAX_SLICES) {
      return {
        action: 'SERVED',
        newState: {
          availableSlices: newTotal,
          ovens: {
            ...gameState.ovens,
            [lane]: { 
              cooking: false, 
              startTime: 0, 
              burned: false, 
              cleaningStartTime: 0, 
              sliceCount: 0 
            }
          },
          stats: {
            ...gameState.stats,
            slicesBaked: gameState.stats.slicesBaked + slicesProduced,
          }
        }
      };
    }
  }

  return { action: 'NONE' };
};

/**
 * Handles the logic for pausing/unpausing ovens (adjusting timestamps)
 */
export const calculateOvenPauseState = (
  ovens: { [key: number]: OvenState },
  isPausing: boolean,
  now: number
): { [key: number]: OvenState } => {
  const updatedOvens = { ...ovens };
  
  Object.keys(updatedOvens).forEach(laneKey => {
    const lane = parseInt(laneKey);
    const oven = updatedOvens[lane];
    
    if (isPausing) {
      if (oven.cooking && !oven.burned) {
        updatedOvens[lane] = { ...oven, pausedElapsed: now - oven.startTime };
      }
    } else {
      // Unpausing
      if (oven.cooking && !oven.burned && oven.pausedElapsed !== undefined) {
        updatedOvens[lane] = { 
          ...oven, 
          startTime: now - oven.pausedElapsed, 
          pausedElapsed: undefined 
        };
      }
    }
  });

  return updatedOvens;
};