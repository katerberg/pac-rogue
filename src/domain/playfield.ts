import { clamp } from "./clamp";

/** Open rectangular playfield, matching the Phaser canvas (pixels). */
export const PLAYFIELD_WIDTH = 800;
export const PLAYFIELD_HEIGHT = 600;

/** Player travel speed in pixels per second. Instant direction changes; no accel. */
export const PLAYER_SPEED = 200;

/** Visual / collision radius of the Pac-Man stand-in (pixels). */
export const PLAYER_RADIUS = 16;

/** Pac-Man yellow. Stored on Drawable; Phaser must not own the color. */
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

/** Clamp a sprite center so its radius stays fully on the playfield. */
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
