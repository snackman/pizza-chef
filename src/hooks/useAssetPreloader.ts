// src/hooks/useAssetPreloader.ts
// Preloads images during the splash screen so they are cached before gameplay.

import { useEffect, useState } from 'react';
import { PRELOAD_BACKGROUNDS } from '../lib/spriteManifest';

/**
 * Preloads all background images listed in spriteManifest.
 * Returns { loaded, total, progress } so the splash screen can show a loading bar.
 */
export function useAssetPreloader() {
  const urls = PRELOAD_BACKGROUNDS;
  const [loaded, setLoaded] = useState(0);
  const total = urls.length;

  useEffect(() => {
    let cancelled = false;

    urls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        if (!cancelled) {
          setLoaded((prev) => prev + 1);
        }
      };
      img.src = url;
    });

    return () => {
      cancelled = true;
    };
  }, []); // only run once on mount

  return {
    loaded,
    total,
    progress: total > 0 ? loaded / total : 1,
    done: loaded >= total,
  };
}
