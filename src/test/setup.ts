import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock the sound manager to prevent AudioContext errors in tests
vi.mock('../utils/sounds', () => ({
  soundManager: {
    servePizza: vi.fn(),
    customerServed: vi.fn(),
    customerDisappointed: vi.fn(),
    plateCaught: vi.fn(),
    plateDropped: vi.fn(),
    powerUpCollected: vi.fn(),
    ovenStart: vi.fn(),
    ovenReady: vi.fn(),
    ovenWarning: vi.fn(),
    ovenBurning: vi.fn(),
    ovenBurned: vi.fn(),
    lifeLost: vi.fn(),
    lifeGained: vi.fn(),
    gameOver: vi.fn(),
    chefMove: vi.fn(),
    pizzaDestroyed: vi.fn(),
    customerUnfreeze: vi.fn(),
    beerEffect: vi.fn(),
    woozyServed: vi.fn(),
    cleaningStart: vi.fn(),
    cleaningComplete: vi.fn(),
    nyanCatPowerUp: vi.fn(),
    pauseNyan: vi.fn(),
    resumeNyan: vi.fn(),
    stopNyan: vi.fn(),
    setMuted: vi.fn(),
    getMuted: vi.fn(() => false),
    toggleMute: vi.fn(() => true),
    checkMuted: vi.fn(() => false),
  },
}));
