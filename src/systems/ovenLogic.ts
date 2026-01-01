import { OVEN_CONFIG } from '../lib/constants';
import { Oven } from '../types/game';

type OvenEvent = 'BECAME_READY' | 'BECAME_WARNING' | 'BECAME_BURNING' | 'BURNED_ALIVE' | 'CLEANING_COMPLETE' | 'NONE';

interface OvenUpdateResult {
  newOven: Oven;
  event: OvenEvent;
  slicesProduced: number;
}

export const getOvenState = (oven: Oven, speedLevel: number, now: number): 'idle' | 'cooking' | 'ready' | 'warning' | 'burning' => {
  if (oven.burned) return 'burning';
  if (!oven.cooking) return 'idle';

  const elapsed = oven.pausedElapsed ?? (now - oven.startTime);
  const cookTime = OVEN_CONFIG.COOK_TIMES[speedLevel];

  if (elapsed >= OVEN_CONFIG.BURN_TIME) return 'burning';
  if (elapsed >= OVEN_CONFIG.WARNING_TIME) return 'warning';
  if (elapsed >= cookTime) return 'ready';
  return 'cooking';
};

export const updateSingleOven = (
  oven: Oven, 
  speedLevel: number, 
  now: number, 
  prevSoundState: string
): OvenUpdateResult => {
  let event: OvenEvent = 'NONE';
  let slicesProduced = 0;
  let newOven = { ...oven };

  // 1. Handle Cleaning
  if (oven.burned && oven.cleaningStartTime > 0) {
    if (now - oven.cleaningStartTime >= OVEN_CONFIG.CLEANING_TIME) {
      newOven = { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 };
      event = 'CLEANING_COMPLETE';
    }
    return { newOven, event, slicesProduced };
  }

  // 2. Handle Cooking States
  if (oven.cooking && !oven.burned) {
    const currentState = getOvenState(oven, speedLevel, now);
    
    // Detect State Transitions (for sounds/events)
    if (currentState !== prevSoundState) {
      if (currentState === 'ready' && prevSoundState === 'cooking') event = 'BECAME_READY';
      else if (currentState === 'warning' && prevSoundState === 'ready') event = 'BECAME_WARNING';
      else if (currentState === 'burning' && prevSoundState === 'warning') event = 'BECAME_BURNING';
    }

    // Check for "Done Cooking" (Ready to collect) - In this game, collection happens via interaction, 
    // BUT the original code auto-collected if it didn't burn.
    // **Original Logic Preservation**: The original code had `if (elapsed >= cookTime && !burned) ... servePizza()` inside the useOven interaction OR inside updateGame?
    // Actually, looking at original code: The updateGame ONLY handles burning. The "Serving" happened inside `useOven` (user interaction).
    // HOWEVER, `updateGame` handled the burning transition.
    
    // Check for Burn
    const elapsed = oven.pausedElapsed ?? (now - oven.startTime);
    if (elapsed >= OVEN_CONFIG.BURN_TIME) {
      event = 'BURNED_ALIVE';
      newOven = { cooking: false, startTime: 0, burned: true, cleaningStartTime: 0, sliceCount: 0 };
    }
  }

  return { newOven, event, slicesProduced };
};