import { bg } from './assets';

// All sprites to preload before game starts
export const PRELOAD_SPRITES = [
  // Characters
  'chef.png',
  'sad-chef.png',
  'nyan-chef.png',

  // Customer faces
  'drool-face.png',
  'yum-face.png',
  'frozen-face.png',
  'woozy-face.png',
  'spicy-face.png',
  'critic.png',
  'bad-luck-brian.png',
  'bad-luck-brian-puke.png',
  'scumbag-steve.png',
  'rainbow-brian.png',
  'health-inspector.png',

  // Food
  'slice-plate.png',
  'paperplate.png',
  '1slicepizzapan.png',
  '2slicepizzapan.png',
  '3slicepizzapan.png',
  '4slicepizzapan.png',
  '5slicepizzapan.png',
  '6slicepizzapan.png',
  '7slicepizzapan.png',
  '8slicepizzapan.png',

  // Power-ups
  'beer.png',
  'hot-honey.png',
  'sundae.png',
  'doge.png',
  'nyan-cat.png',
  'pepe.png',
  'molto-benny.png',
  'star.png',

  // Boss/special
  'dominos-boss.png',
  'papa-john.png',
  'papa-john-2.png',
  'papa-john-3.png',
  'papa-john-4.png',
  'papa-john-5.png',
  'papa-john-6.png',
  'franco-pepe.png',
  'frank-pepe.png',
] as const;

// UI assets to preload (separate array for different CDN path)
export const PRELOAD_UI = [
  'controls.png',
] as const;

// Background images served from CDN — preloaded during splash screen
export const PRELOAD_BACKGROUNDS: string[] = [
  bg('pizza-shop-background.webp'),
  bg('counter.webp'),
];
