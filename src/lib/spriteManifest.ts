// src/lib/spriteManifest.ts
// Central list of assets to preload during the splash screen.

import { bg } from './assets';

/** Background images served from CDN — preloaded during splash screen. */
export const PRELOAD_BACKGROUNDS: string[] = [
  bg('pizza-shop-background.webp'),
  bg('counter.webp'),
];
