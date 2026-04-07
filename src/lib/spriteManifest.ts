import { bg } from './assets';

// Sprite sheets are loaded by the preloader — individual sprites no longer preloaded
// Kept for reference: all sprite names that exist in the sheets
export const ALL_SPRITES = [
  'chef.png', 'sad-chef.png', 'cheesed-chef.png', 'chef-smoking.png',
  'drool-face.png', 'yum-face.png', 'frozen-face.png', 'woozy-face.png',
  'spicy-face.png', 'critic.png', 'slice-plate.png', 'paperplate.png',
  'health-inspector.png', 'intern.png', 'beer.png', 'hot-honey.png',
  'sundae.png', 'doge.png', 'nyan-cat.png', 'molto-benny.png', 'star.png',
  'pepe.png', 'doge-power-up-alert.png', 'nyan-chef.png', 'rainbow.png',
  'rainbow-brian.png', 'gotchi.png', '1slicepizzapan.png', '2slicepizzapan.png',
  '3slicepizzapan.png', '4slicepizzapan.png', '5slicepizzapan.png',
  '6slicepizzapan.png', '7slicepizzapan.png', '8slicepizzapan.png',
  'fullpizza.png', 'pizzapan.png', 'bad-luck-brian.png', 'bad-luck-brian-puke.png',
  'scumbag-steve.png', 'pizza-mafia.png', 'dominos-boss.png', 'papa-john.png',
  'papa-john-2.png', 'papa-john-3.png', 'papa-john-4.png', 'papa-john-5.png',
  'papa-john-6.png', 'franco-pepe.png', 'frank-pepe.png', 'chuck-e-cheese.png',
  'pizza-the-hut.png', 'cheese-slime.png', 'kid-1.png', 'kid-2.png',
  'kid-3.png', 'kid-4.png', 'kid-5.png', 'kid-6.png', 'luigi-primo.png',
  'DogeBackup.png',
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
