import { useState, useCallback } from 'react';
import { soundManager } from '../utils/sounds';
import { updateSingleOven, getOvenState } from '../systems/ovenLogic';
import { COSTS, OVEN_CONFIG } from '../lib/constants';
import { Oven } from '../types/game';

export const useOvenSystem = (bank: number, setBank: (amt: number) => void) => {
  
  const [ovens, setOvens] = useState<{ [key: number]: Oven }>({
    0: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
    1: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
    2: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
    3: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 }
  });

  const [ovenUpgrades, setOvenUpgrades] = useState<{ [key: number]: number }>({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [ovenSpeedUpgrades, setOvenSpeedUpgrades] = useState<{ [key: number]: number }>({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [ovenSoundStates, setOvenSoundStates] = useState<{ [key: number]: string }>({ 0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle' });

  // Reset Logic
  const resetOvens = useCallback(() => {
    setOvens({
      0: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
      1: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
      2: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 },
      3: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 }
    });
    setOvenUpgrades({ 0: 0, 1: 0, 2: 0, 3: 0 });
    setOvenSpeedUpgrades({ 0: 0, 1: 0, 2: 0, 3: 0 });
    setOvenSoundStates({ 0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle' });
  }, []);

  const handleOvenInteraction = useCallback((lane: number, currentSlices: number, maxSlices: number): { slicesToAdd: number, success: boolean } => {
    let result = { slicesToAdd: 0, success: false };
    
    setOvens(prev => {
      const oven = prev[lane];
      const now = Date.now();
      
      if (oven.burned) return prev; // Cannot interact with burned oven here (needs cleaning)

      if (!oven.cooking) {
        // Start Cooking
        soundManager.ovenStart();
        const slicesProduced = 1 + (ovenUpgrades[lane] || 0);
        result = { slicesToAdd: 0, success: true };
        return {
          ...prev,
          [lane]: { cooking: true, startTime: now, burned: false, cleaningStartTime: 0, sliceCount: slicesProduced }
        };
      } else {
        // Try to Collect
        const speedUpgrade = ovenSpeedUpgrades[lane] || 0;
        const cookTime = OVEN_CONFIG.COOK_TIMES[speedUpgrade];
        const elapsed = now - oven.startTime;

        if (elapsed >= cookTime && elapsed < OVEN_CONFIG.BURN_TIME) {
          const slicesProduced = oven.sliceCount;
          if (currentSlices + slicesProduced <= maxSlices) {
             soundManager.servePizza();
             result = { slicesToAdd: slicesProduced, success: true };
             return {
               ...prev,
               [lane]: { cooking: false, startTime: 0, burned: false, cleaningStartTime: 0, sliceCount: 0 }
             };
          }
        }
      }
      return prev;
    });

    return result;
  }, [ovenUpgrades, ovenSpeedUpgrades]);

  const startCleaning = useCallback((lane: number) => {
    setOvens(prev => {
      const oven = prev[lane];
      if (oven.burned && oven.cleaningStartTime === 0) {
        soundManager.cleaningStart();
        return { ...prev, [lane]: { ...oven, cleaningStartTime: Date.now() } };
      }
      return prev;
    });
  }, []);

  const performUpgrade = useCallback((lane: number, type: 'yield' | 'speed') => {
    const cost = type === 'yield' ? COSTS.OVEN_UPGRADE : COSTS.OVEN_SPEED_UPGRADE;
    const currentLevel = type === 'yield' ? ovenUpgrades[lane] : ovenSpeedUpgrades[lane];
    const maxLevel = type === 'yield' ? OVEN_CONFIG.MAX_UPGRADE_LEVEL : OVEN_CONFIG.MAX_SPEED_LEVEL;
    
    if (bank >= cost && currentLevel < maxLevel) {
      setBank(bank - cost);
      if (type === 'yield') setOvenUpgrades(prev => ({ ...prev, [lane]: prev[lane] + 1 }));
      else setOvenSpeedUpgrades(prev => ({ ...prev, [lane]: prev[lane] + 1 }));
      return true;
    }
    return false;
  }, [bank, ovenUpgrades, ovenSpeedUpgrades, setBank]);

  // Main Loop Tick
  const updateOvensTick = useCallback((paused: boolean) => {
    if (paused) return { livesLost: 0 };
    
    const now = Date.now();
    let livesLost = 0;
    const newSoundStates = { ...ovenSoundStates };
    
    setOvens(prevOvens => {
      const nextOvens = { ...prevOvens };
      let hasChanges = false;

      Object.keys(nextOvens).forEach(key => {
        const lane = Number(key);
        const oven = nextOvens[lane];
        const { newOven, event } = updateSingleOven(oven, ovenSpeedUpgrades[lane], now, ovenSoundStates[lane]);

        if (event === 'BECAME_READY') soundManager.ovenReady();
        if (event === 'BECAME_WARNING') soundManager.ovenWarning();
        if (event === 'BECAME_BURNING') soundManager.ovenBurning();
        if (event === 'CLEANING_COMPLETE') {
           soundManager.cleaningComplete();
           hasChanges = true;
        }
        if (event === 'BURNED_ALIVE') {
          soundManager.ovenBurned();
          soundManager.lifeLost();
          livesLost++;
          hasChanges = true;
        }

        // Check if visual state changed for sound tracking
        const currentVisState = getOvenState(newOven, ovenSpeedUpgrades[lane], now);
        if (currentVisState !== ovenSoundStates[lane]) {
           newSoundStates[lane] = currentVisState;
           // We can't update state inside this loop, so we track it
        }

        if (newOven !== oven) {
            nextOvens[lane] = newOven;
            hasChanges = true;
        }
      });
      
      return hasChanges ? nextOvens : prevOvens;
    });

    setOvenSoundStates(newSoundStates);
    return { livesLost };
  }, [ovenSpeedUpgrades, ovenSoundStates]);

  // Pause toggle logic (adjust start times)
  const toggleOvenPause = useCallback((paused: boolean) => {
    const now = Date.now();
    setOvens(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
            const lane = Number(key);
            const oven = next[lane];
            if (oven.cooking && !oven.burned) {
                if (paused) next[lane] = { ...oven, pausedElapsed: now - oven.startTime };
                else if (oven.pausedElapsed !== undefined) {
                    next[lane] = { ...oven, startTime: now - oven.pausedElapsed, pausedElapsed: undefined };
                }
            }
        });
        return next;
    });
  }, []);

  return {
    ovens,
    ovenUpgrades,
    ovenSpeedUpgrades,
    resetOvens,
    handleOvenInteraction,
    startCleaning,
    performUpgrade,
    updateOvensTick,
    toggleOvenPause
  };
};