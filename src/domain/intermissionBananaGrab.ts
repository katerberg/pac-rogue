import { GHOST_DIR } from "./ghostPath";
import {
  INTERMISSION_ACTOR_SIZE,
  INTERMISSION_Y,
  intermissionBobPx,
  type IntermissionActor,
  type IntermissionScript,
} from "./intermissionScript";
import { CLYDE_DRAWABLE_ID } from "./playfield";
import { PLAYFIELD_WIDTH } from "./playfieldBounds";

const HALF = INTERMISSION_ACTOR_SIZE / 2;
export const BANANA_GRAB_PELLET_X = 520;
export const BANANA_GRAB_PELLET_MS = 2000;
const DOT_MAN_SPEED = (BANANA_GRAB_PELLET_X + HALF) / BANANA_GRAB_PELLET_MS;
export const BANANA_GRAB_PEEL_X = BANANA_GRAB_PELLET_X - 50;
const CLYDE_AT_PELLET_X = BANANA_GRAB_PELLET_X - 240;
const CLYDE_SPEED = 0.45;
const CLYDE_START_X = CLYDE_AT_PELLET_X - CLYDE_SPEED * BANANA_GRAB_PELLET_MS;
const CLYDE_HIT_X = BANANA_GRAB_PEEL_X - HALF * 0.7;
export const BANANA_GRAB_HIT_MS =
  BANANA_GRAB_PELLET_MS + (CLYDE_HIT_X - CLYDE_AT_PELLET_X) / CLYDE_SPEED;
const BOUNCE_MS = 500;
const BOUNCE_BACK_PX = 120;
const BOUNCE_HOP_PX = 40;
const CLYDE_EXIT_SPEED = 0.25;
const CLYDE_LANDED_X = CLYDE_HIT_X - BOUNCE_BACK_PX;
const BOUNCE_END_MS = BANANA_GRAB_HIT_MS + BOUNCE_MS;
const DOT_MAN_EXIT_MS = (PLAYFIELD_WIDTH + HALF + HALF) / DOT_MAN_SPEED;
const CLYDE_EXIT_MS = BOUNCE_END_MS + (CLYDE_LANDED_X + HALF) / CLYDE_EXIT_SPEED;

function beatName(elapsedMs: number): string {
  if (elapsedMs < BANANA_GRAB_PELLET_MS) {
    return "chase";
  }
  if (elapsedMs < BANANA_GRAB_HIT_MS) {
    return "peel";
  }
  return elapsedMs < BOUNCE_END_MS ? "bounce" : "exit";
}

function clyde(elapsedMs: number, bob: number): IntermissionActor {
  const at = { kind: "ghost", key: "clyde", drawableId: CLYDE_DRAWABLE_ID } as const;
  if (elapsedMs < BANANA_GRAB_HIT_MS) {
    const x = CLYDE_START_X + CLYDE_SPEED * elapsedMs;
    return { ...at, facing: GHOST_DIR.right, x, y: INTERMISSION_Y + bob };
  }
  if (elapsedMs < BOUNCE_END_MS) {
    const t = (elapsedMs - BANANA_GRAB_HIT_MS) / BOUNCE_MS;
    const x = CLYDE_HIT_X - BOUNCE_BACK_PX * t;
    const y = INTERMISSION_Y - Math.sin(Math.PI * t) * BOUNCE_HOP_PX;
    return { ...at, facing: GHOST_DIR.up, x, y };
  }
  const x = CLYDE_LANDED_X - CLYDE_EXIT_SPEED * (elapsedMs - BOUNCE_END_MS);
  return { ...at, facing: GHOST_DIR.left, x, y: INTERMISSION_Y + bob };
}

export const bananaGrab: IntermissionScript = {
  durationMs: Math.max(DOT_MAN_EXIT_MS, CLYDE_EXIT_MS),
  beatAt(elapsedMs) {
    const bob = intermissionBobPx(elapsedMs);
    const actors: IntermissionActor[] = [];
    if (elapsedMs < BANANA_GRAB_PELLET_MS) {
      actors.push({
        kind: "powerPellet",
        key: "pellet",
        x: BANANA_GRAB_PELLET_X,
        y: INTERMISSION_Y,
      });
    } else if (elapsedMs < BOUNCE_END_MS) {
      actors.push({ kind: "bananaPeel", key: "peel", x: BANANA_GRAB_PEEL_X, y: INTERMISSION_Y });
    }
    actors.push(clyde(elapsedMs, bob), {
      kind: "dotMan",
      key: "dotMan",
      x: -HALF + DOT_MAN_SPEED * elapsedMs,
      y: INTERMISSION_Y - bob,
    });
    return { beat: beatName(elapsedMs), actors };
  },
};
