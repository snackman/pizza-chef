/**
 * Boss Collision Masks
 *
 * Loads pre-generated collision masks for pixel-perfect collision detection.
 * Masks are 32x32 boolean grids where true = solid pixel, false = transparent.
 */

import { BOSS_CONFIG } from '../lib/constants';

const ASSET_BASE = "https://pizza-chef-assets.pages.dev";

export interface CollisionMask {
  width: number;
  height: number;
  data: boolean[][];
}

// Cached masks for Papa John sprites (6 variants)
const papaJohnMasks: (CollisionMask | null)[] = [null, null, null, null, null, null];
let masksInitialized = false;

const PAPA_JOHN_MASK_FILES = [
  'papa-john.json',
  'papa-john-2.json',
  'papa-john-3.json',
  'papa-john-4.json',
  'papa-john-5.json',
  'papa-john-6.json',
];

/**
 * Fetch and cache all Papa John collision masks.
 * Call once at game start. Fire-and-forget - game works without masks.
 */
export const initializeBossMasks = async (): Promise<void> => {
  if (masksInitialized) return;

  const loadPromises = PAPA_JOHN_MASK_FILES.map(async (filename, index) => {
    try {
      const url = `${ASSET_BASE}/sprites/masks/${filename}`;
      const response = await fetch(url);
      if (response.ok) {
        const mask = await response.json() as CollisionMask;
        papaJohnMasks[index] = mask;
      }
    } catch {
      // Silently fail - game works without pixel-perfect collision
    }
  });

  await Promise.all(loadPromises);
  masksInitialized = true;
};

/**
 * Get the collision mask for the current Papa John sprite.
 * Returns null if masks haven't loaded yet.
 *
 * @param hitsReceived - Number of hits Papa John has taken
 */
export const getPapaJohnMask = (hitsReceived: number): CollisionMask | null => {
  const spriteIndex = Math.min(
    Math.floor(hitsReceived / BOSS_CONFIG.HITS_PER_IMAGE),
    papaJohnMasks.length - 1
  );
  return papaJohnMasks[spriteIndex];
};

/**
 * Check if a point collides with a solid pixel in the mask.
 *
 * @param mask - The collision mask
 * @param normalizedX - X position within sprite bounds (0-1)
 * @param normalizedY - Y position within sprite bounds (0-1)
 * @returns true if the point hits a solid pixel
 */
export const checkMaskCollision = (
  mask: CollisionMask,
  normalizedX: number,
  normalizedY: number
): boolean => {
  // Clamp to valid range
  if (normalizedX < 0 || normalizedX >= 1 || normalizedY < 0 || normalizedY >= 1) {
    return false;
  }

  // Map to mask grid coordinates
  const gridX = Math.floor(normalizedX * mask.width);
  const gridY = Math.floor(normalizedY * mask.height);

  // Return whether this cell is solid
  return mask.data[gridY]?.[gridX] ?? false;
};
