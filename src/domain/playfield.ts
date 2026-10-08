import { clamp } from "./clamp";
import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import {
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  MAZE_PIXEL_HEIGHT,
  MAZE_PIXEL_WIDTH,
  TILE_SIZE,
} from "./maze";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH };

// Ms Pac Man is 5.315
// First pass result was 8.333
export const PLAYER_SPEED = DEFAULT_TUNING.playerSpeedTiles * TILE_SIZE;

export function playerSpeed(tuning: Tuning = DEFAULT_TUNING): number {
  return tuning.playerSpeedTiles * TILE_SIZE;
}

export function playerRadius(): number {
  return TILE_SIZE / 2;
}

export function ghostRadius(): number {
  return playerRadius();
}

export function playerPreTurnPx(tuning: Tuning = DEFAULT_TUNING): number {
  return tuning.preTurnPx;
}

export const PLAYER_DRAWABLE_ID = "player";

export const PELLET_RADIUS = 2;

export const PELLET_DRAWABLE_ID = "pellet";

export const POWER_PELLET_DRAWABLE_ID = "power-pellet";

export const BOSS_PELLET_DRAWABLE_ID = "boss-pellet";

export const BLINKY_DRAWABLE_ID = "blinky";
export const PINKY_DRAWABLE_ID = "pinky";
export const INKY_DRAWABLE_ID = "inky";
export const CLYDE_DRAWABLE_ID = "clyde";

export const GHOST_DRAWABLE_BY_KIND: Record<GhostKindId, string> = {
  [GHOST_KIND.blinky]: BLINKY_DRAWABLE_ID,
  [GHOST_KIND.pinky]: PINKY_DRAWABLE_ID,
  [GHOST_KIND.inky]: INKY_DRAWABLE_ID,
  [GHOST_KIND.clyde]: CLYDE_DRAWABLE_ID,
};

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
  // Tall boards crop past the playfield; wall-pass loops still need to reach the
  // maze wrap seams (which can sit outside the visible 800×600).
  const minX = Math.min(playfieldMinX(radius), MAZE_OFFSET_X);
  const maxX = Math.max(playfieldMaxX(radius), MAZE_OFFSET_X + MAZE_PIXEL_WIDTH);
  const minY = Math.min(playfieldMinY(radius), MAZE_OFFSET_Y);
  const maxY = Math.max(playfieldMaxY(radius), MAZE_OFFSET_Y + MAZE_PIXEL_HEIGHT);
  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}
