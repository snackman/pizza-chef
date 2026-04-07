// src/lib/assets.ts

const ASSET_BASE = "https://pizza-chef-assets.pages.dev";

const withBase = (path: string) =>
  `${ASSET_BASE}/${path.replace(/^\/+/, "")}`;

// Sprite URL cache — blob URLs from sprite sheets override CDN URLs
const spriteCache: Record<string, string> = {};

export const setSpriteUrl = (name: string, url: string) => {
  spriteCache[name] = url;
};

export const sprite = (name: string) => spriteCache[name] || withBase(`sprites/${name}`);
export const spriteSheet = (name: string) => withBase(`sprites/sheets/${name}`);
export const ui = (name: string) => withBase(`ui/${name}`);
export const bg = (name: string) => withBase(`backgrounds/${name}`);
export const audio = (name: string) => withBase(`audio/${name}`);
