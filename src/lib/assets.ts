// src/lib/assets.ts

const ASSET_BASE = "https://pizza-chef-assets.pages.dev";

const withBase = (path: string) =>
  `${ASSET_BASE}/${path.replace(/^\/+/, "")}`;

export const sprite = (name: string) => withBase(`sprites/${name}`);
export const ui = (name: string) => withBase(`ui/${name}`);
export const bg = (name: string) => withBase(`backgrounds/${name}`);
export const audio = (name: string) => withBase(`audio/${name}`);