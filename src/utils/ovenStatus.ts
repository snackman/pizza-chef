export type OvenStatus =
  | 'empty'
  | 'cooking'
  | 'ready'
  | 'warning-fire'
  | 'warning-pizza'
  | 'warning'
  | 'burning'
  | 'burned'
  | 'extinguishing'
  | 'sweeping';

export interface OvenState {
  cooking: boolean;
  startTime: number;
  burned: boolean;
  cleaningStartTime: number;
  pausedElapsed?: number;
  sliceCount: number;
}

export const OVEN_TIMING = {
  BASE_COOKING_TIME: 3000,
  WARNING_TIME: 7000,
  BURN_TIME: 8000,
  CLEANING_TIME: 3000,
  HALF_CLEANING_TIME: 1500,
  BLINK_INTERVAL: 250,
} as const;

export function getCookingTime(speedUpgrade: number): number {
  switch (speedUpgrade) {
    case 1: return 2000;
    case 2: return 1000;
    case 3: return 500;
    default: return OVEN_TIMING.BASE_COOKING_TIME;
  }
}

export function getOvenStatus(
  oven: OvenState,
  speedUpgrade: number = 0,
  includeBlinking: boolean = true
): OvenStatus {
  if (oven.burned) {
    if (oven.cleaningStartTime > 0) {
      const cleaningElapsed = Date.now() - oven.cleaningStartTime;
      if (cleaningElapsed < OVEN_TIMING.HALF_CLEANING_TIME) {
        return 'extinguishing';
      }
      return 'sweeping';
    }
    return 'burned';
  }

  if (!oven.cooking) return 'empty';

  const elapsed = oven.pausedElapsed !== undefined
    ? oven.pausedElapsed
    : Date.now() - oven.startTime;

  const cookingTime = getCookingTime(speedUpgrade);

  if (elapsed >= OVEN_TIMING.BURN_TIME) return 'burning';

  if (elapsed >= OVEN_TIMING.WARNING_TIME) {
    if (includeBlinking) {
      const warningElapsed = elapsed - OVEN_TIMING.WARNING_TIME;
      const blinkCycle = Math.floor(warningElapsed / OVEN_TIMING.BLINK_INTERVAL);
      return blinkCycle % 2 === 0 ? 'warning-fire' : 'warning-pizza';
    }
    return 'warning';
  }

  if (elapsed >= cookingTime) return 'ready';
  return 'cooking';
}

export function getOvenStatusEmoji(status: OvenStatus): string {
  switch (status) {
    case 'burned':
    case 'burning':
      return '💀';
    case 'extinguishing':
      return '🧯';
    case 'sweeping':
      return '🧹';
    case 'warning-fire':
      return '🔥';
    case 'warning-pizza':
    case 'warning':
      return '⚠️';
    case 'ready':
      return '♨️';
    case 'cooking':
      return '🌡️';
    default:
      return '';
  }
}

export function getOvenActionLabel(status: OvenStatus): string {
  switch (status) {
    case 'burned':
      return 'Clean!';
    case 'burning':
      return 'Burning!';
    case 'warning':
    case 'warning-fire':
    case 'warning-pizza':
      return 'Warning!';
    case 'ready':
      return 'Take Out!';
    case 'cooking':
      return 'Cooking...';
    default:
      return 'Put Pizza';
  }
}
