// src/types/game.ts

export type PowerUpType =
  | 'honey'
  | 'icecream'
  | 'beer'
  | 'doge'
  | 'nyan'
  | 'star';

export interface Customer {
  id: string;
  lane: number;
  x: number;
  speed: number;
  patience: number;
  type?: string;
  disappointed?: boolean;
}

export interface PizzaSlice {
  id: string;
  lane: number;
  x: number;
  y: number;
  speed: number;
}

export interface EmptyPlate {
  id: string;
  lane: number;
  x: number;
  y: number;
  speed: number;
}

export interface DroppedPlate {
  id: string;
  x: number;
  y: number;
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  lane: number;
  x: number;
  y: number;
}

export interface FloatingScore {
  id: string;
  x: number;
  y: number;
  value: number;
}

export interface FloatingStar {
  id: string;
  x: number;
  y: number;
  delta: number; // +1 / -1
}

export interface BossMinion {
  id: string;
  lane: number;
  x: number;
  speed: number;
  health: number;
}

export interface BossBattle {
  active: boolean;
  wave: number;
  bossHealth: number;
  minions: BossMinion[];
}

export interface GameState {
  customers: Customer[];
  pizzaSlices: PizzaSlice[];
  emptyPlates: EmptyPlate[];
  powerUps: PowerUp[];
  activePowerUps: PowerUpType[];

  floatingScores: FloatingScore[];
  floatingStars: FloatingStar[]; // ⭐ NEW

  droppedPlates: DroppedPlate[];

  chefLane: number;
  score: number;
  stars: number;

  bossBattle?: BossBattle;

  gameOver: boolean;
}
