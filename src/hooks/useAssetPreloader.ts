import { useState, useEffect } from 'react';
import { setSpriteUrl, spriteSheet, ui } from '../lib/assets';
import { PRELOAD_UI, PRELOAD_BACKGROUNDS } from '../lib/spriteManifest';

// Sprite sheet definitions — sheet name → manifest URL
const SPRITE_SHEETS = ['core', 'powerups', 'food', 'special'];

interface PreloadResult {
  progress: number;       // 0-100
  isComplete: boolean;
  failedAssets: string[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Needed for canvas extraction
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

interface SpriteCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Load a sprite sheet, fetch its JSON manifest, extract individual sprites
 * as blob URLs, and register them in the sprite cache.
 */
async function loadSpriteSheet(sheetName: string): Promise<number> {
  const sheetUrl = spriteSheet(`${sheetName}.png`);
  const manifestUrl = spriteSheet(`${sheetName}.json`);

  // Load sheet image and manifest in parallel
  const [sheetImg, manifestRes] = await Promise.all([
    loadImage(sheetUrl),
    fetch(manifestUrl),
  ]);

  const manifest: Record<string, SpriteCoords> = await manifestRes.json();

  // Extract each sprite from the sheet using offscreen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  let extracted = 0;
  for (const [spriteName, coords] of Object.entries(manifest)) {
    canvas.width = coords.width;
    canvas.height = coords.height;
    ctx.clearRect(0, 0, coords.width, coords.height);
    ctx.drawImage(
      sheetImg,
      coords.x, coords.y, coords.width, coords.height,
      0, 0, coords.width, coords.height
    );

    // Convert to blob URL
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error(`Failed to extract ${spriteName}`)),
        'image/png'
      );
    });
    const blobUrl = URL.createObjectURL(blob);
    setSpriteUrl(spriteName, blobUrl);
    extracted++;
  }

  return extracted;
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export function useAssetPreloader(): PreloadResult {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [failedAssets, setFailedAssets] = useState<string[]>([]);

  // Total steps: 4 sprite sheets + UI assets + background assets
  const totalSteps = SPRITE_SHEETS.length + PRELOAD_UI.length + PRELOAD_BACKGROUNDS.length;

  useEffect(() => {
    let isMounted = true;
    let completedSteps = 0;

    const updateProgress = () => {
      completedSteps++;
      if (isMounted) {
        setProgress(Math.round((completedSteps / totalSteps) * 100));
      }
    };

    const loadAssets = async () => {
      // Phase 1: Load sprite sheets and extract blob URLs
      for (const sheetName of SPRITE_SHEETS) {
        try {
          await loadSpriteSheet(sheetName);
        } catch (err) {
          console.warn(`Sprite sheet ${sheetName} failed, falling back to individual URLs:`, err);
          if (isMounted) {
            setFailedAssets(prev => [...prev, `sheet:${sheetName}`]);
          }
        }
        updateProgress();
      }

      // Phase 2: Preload UI and backgrounds (these aren't in sprite sheets)
      const otherAssets = [
        ...PRELOAD_UI.map(name => ui(name)),
        ...PRELOAD_BACKGROUNDS,
      ];

      await Promise.all(otherAssets.map(async (url) => {
        try {
          await preloadImage(url);
        } catch {
          console.warn(`Asset preload failed: ${url}`);
          if (isMounted) {
            setFailedAssets(prev => [...prev, url]);
          }
        }
        updateProgress();
      }));

      if (isMounted) {
        setIsComplete(true);
      }
    };

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  return { progress, isComplete, failedAssets };
}
