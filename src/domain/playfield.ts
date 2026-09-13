import { clamp } from "./clamp";
import { TILE_SIZE } from "./maze";

export const PLAYFIELD_WIDTH = 800;
export const PLAYFIELD_HEIGHT = 600;

export const PLAYER_SPEED = 200;

export const PLAYER_RADIUS = TILE_SIZE / 2;

export const PLAYER_COLOR = 0xffe066;

export const PLAYER_DRAWABLE_ID = "player";

export function playfieldMinX(radius = PLAYER_RADIUS): number {
  return radius;
}

export function playfieldMaxX(radius = PLAYER_RADIUS): number {
  return PLAYFIELD_WIDTH - radius;
}

export function playfieldMinY(radius = PLAYER_RADIUS): number {
  return radius;
}

export function playfieldMaxY(radius = PLAYER_RADIUS): number {
  return PLAYFIELD_HEIGHT - radius;
}

export function clampPositionToPlayfield(
  x: number,
  y: number,
  radius = PLAYER_RADIUS,
): { x: number; y: number } {
  return {
    x: clamp(x, playfieldMinX(radius), playfieldMaxX(radius)),
    y: clamp(y, playfieldMinY(radius), playfieldMaxY(radius)),
  };
}
