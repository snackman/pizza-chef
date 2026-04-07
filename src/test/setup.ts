import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock the SoundManager — the game uses AudioContext heavily which is not available in jsdom
vi.mock('../utils/sounds', () => {
  const noOp = () => {};
  return {
    soundManager: {
      servePizza: noOp,
      customerServed: noOp,
      customerDisappointed: noOp,
      plateCaught: noOp,
      plateDropped: noOp,
      powerUpCollected: noOp,
      ovenStart: noOp,
      ovenReady: noOp,
      ovenWarning: noOp,
      ovenBurning: noOp,
      ovenBurned: noOp,
      lifeLost: noOp,
      lifeGained: noOp,
      gameOver: noOp,
      chefMove: noOp,
      pizzaDestroyed: noOp,
      customerUnfreeze: noOp,
      beerEffect: noOp,
      woozyServed: noOp,
      cleaningStart: noOp,
      cleaningComplete: noOp,
      nyanCatPowerUp: noOp,
      pauseNyan: noOp,
      resumeNyan: noOp,
      stopNyan: noOp,
      setMuted: noOp,
      getMuted: () => false,
      toggleMute: () => false,
      checkMuted: () => false,
    },
  };
});

// Mock requestAnimationFrame / cancelAnimationFrame for component tests
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    return setTimeout(() => cb(Date.now()), 0) as unknown as number;
  };
}
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id);
  };
}

// Mock HTMLCanvasElement.getContext for GameOverScreen and any canvas usage
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  canvas: { width: 800, height: 600 },
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;
