import { clamp } from "./clamp";
import { TILE_SIZE } from "./maze";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";

export { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH };

export const PLAYER_SPEED = 150;

export function playerRadius(): number {
  return TILE_SIZE / 2;
}

export function ghostRadius(): number {
  return playerRadius();
}

export const PLAYER_DRAWABLE_ID = "player";

export const PELLET_RADIUS = 2;

export const PELLET_DRAWABLE_ID = "pellet";

export const POWER_PELLET_DRAWABLE_ID = "power-pellet";

export const BLINKY_DRAWABLE_ID = "blinky";
export const PINKY_DRAWABLE_ID = "pinky";
export const INKY_DRAWABLE_ID = "inky";
export const CLYDE_DRAWABLE_ID = "clyde";

export const FRUIT_DRAWABLE_ID = "fruit";

export const FRUIT_RADIUS = 8;

export function playfieldMinX(radius = playerRadius()): number {
  return radius;
}

export function playfieldMaxX(radius = playerRadius()): number {
  return PLAYFIELD_WIDTH - radius;
}

export function playfieldMinY(radius = playerRadius()): number {
  return radius;
}

export function playfieldMaxY(radius = playerRadius()): number {
  return PLAYFIELD_HEIGHT - radius;
}

export function clampPositionToPlayfield(
  x: number,
  y: number,
  radius = playerRadius(),
): { x: number; y: number } {
  return {
    x: clamp(x, playfieldMinX(radius), playfieldMaxX(radius)),
    y: clamp(y, playfieldMinY(radius), playfieldMaxY(radius)),
  };
}
