const ASSET_BASE = "https://pizza-chef-assets.pages.dev";

const withBase = (path: string) =>
  `${ASSET_BASE}/${path.replace(/^\/+/, "")}`;

export const spriteUrl = (name: string) =>
  withBase(`sprites/${name}`);

export const uiUrl = (name: string) =>
  withBase(`ui/${name}`);

export const bgUrl = (name: string) =>
  withBase(`backgrounds/${name}`);

export const audioUrl = (name: string) =>
  withBase(`audio/${name}`);
