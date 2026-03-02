import { useState, useEffect } from 'react';
import { sprite, ui } from '../lib/assets';
import { PRELOAD_SPRITES, PRELOAD_UI } from '../lib/spriteManifest';

interface PreloadResult {
  progress: number;       // 0-100
  isComplete: boolean;
  failedAssets: string[];
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
  const [loaded, setLoaded] = useState(0);
  const [failedAssets, setFailedAssets] = useState<string[]>([]);

  // Build full URL list
  const allUrls = [
    ...PRELOAD_SPRITES.map(name => sprite(name)),
    ...PRELOAD_UI.map(name => ui(name)),
  ];

  const total = allUrls.length;

  useEffect(() => {
    let isMounted = true;

    const loadAssets = async () => {
      // Load images in parallel with individual tracking
      const promises = allUrls.map(async (url) => {
        try {
          await preloadImage(url);
          if (isMounted) {
            setLoaded(prev => prev + 1);
          }
        } catch {
          console.warn(`Asset preload failed: ${url}`);
          if (isMounted) {
            setLoaded(prev => prev + 1); // Still count as "processed"
            setFailedAssets(prev => [...prev, url]);
          }
        }
      });

      await Promise.all(promises);
    };

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, []); // Run once on mount

  const progress = total > 0 ? Math.round((loaded / total) * 100) : 0;
  const isComplete = loaded >= total;

  return { progress, isComplete, failedAssets };
}
