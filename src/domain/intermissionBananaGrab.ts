import { GHOST_DIR } from "./ghostPath";
import {
  INTERMISSION_DOT_MAN_SPEED,
  INTERMISSION_HALF,
  INTERMISSION_PELLET_MS,
  INTERMISSION_PELLET_X,
  INTERMISSION_Y,
  beatAtMs,
  bounceArc,
  chaserX,
  dotManApproachX,
  intermissionBobPx,
  msToLeave,
  pelletActors,
  type IntermissionActor,
  type IntermissionScript,
} from "./intermissionScript";
import { CLYDE_DRAWABLE_ID } from "./playfield";

export const BANANA_GRAB_PEEL_X = INTERMISSION_PELLET_X - 50;
const CLYDE_GAP_AT_PELLET_PX = 240;
const CLYDE_SPEED = 0.45;
const CLYDE_HIT_X = BANANA_GRAB_PEEL_X - INTERMISSION_HALF * 0.7;
export const BANANA_GRAB_HIT_MS =
  INTERMISSION_PELLET_MS +
  (CLYDE_HIT_X - (INTERMISSION_PELLET_X - CLYDE_GAP_AT_PELLET_PX)) / CLYDE_SPEED;
const BOUNCE_MS = 500;
const BOUNCE_BACK_PX = 120;
const BOUNCE_HOP_PX = 40;
const CLYDE_EXIT_SPEED = 0.25;
const CLYDE_LANDED_X = CLYDE_HIT_X - BOUNCE_BACK_PX;
const BOUNCE_END_MS = BANANA_GRAB_HIT_MS + BOUNCE_MS;

function clyde(elapsedMs: number, bob: number): IntermissionActor {
  const at = { kind: "ghost", key: "clyde", drawableId: CLYDE_DRAWABLE_ID } as const;
  if (elapsedMs < BANANA_GRAB_HIT_MS) {
    const x = chaserX(elapsedMs, CLYDE_GAP_AT_PELLET_PX, CLYDE_SPEED);
    return { ...at, facing: GHOST_DIR.right, x, y: INTERMISSION_Y + bob };
  }
  if (elapsedMs < BOUNCE_END_MS) {
    const t = (elapsedMs - BANANA_GRAB_HIT_MS) / BOUNCE_MS;
    return {
      ...at,
      facing: GHOST_DIR.up,
      ...bounceArc(t, CLYDE_HIT_X, BOUNCE_BACK_PX, BOUNCE_HOP_PX),
    };
  }
  const x = CLYDE_LANDED_X - CLYDE_EXIT_SPEED * (elapsedMs - BOUNCE_END_MS);
  return { ...at, facing: GHOST_DIR.left, x, y: INTERMISSION_Y + bob };
}

export const bananaGrab: IntermissionScript = {
  durationMs: Math.max(
    msToLeave(dotManApproachX(0), INTERMISSION_Y, INTERMISSION_DOT_MAN_SPEED),
    BOUNCE_END_MS + msToLeave(CLYDE_LANDED_X, INTERMISSION_Y, -CLYDE_EXIT_SPEED),
  ),
  beatAt(elapsedMs) {
    const bob = intermissionBobPx(elapsedMs);
    const actors = pelletActors(elapsedMs);
    if (elapsedMs >= INTERMISSION_PELLET_MS && elapsedMs < BOUNCE_END_MS) {
      actors.push({ kind: "bananaPeel", key: "peel", x: BANANA_GRAB_PEEL_X, y: INTERMISSION_Y });
    }
    actors.push(clyde(elapsedMs, bob), {
      kind: "dotMan",
      key: "dotMan",
      x: dotManApproachX(elapsedMs),
      y: INTERMISSION_Y - bob,
    });
    const beats = [
      ["chase", INTERMISSION_PELLET_MS],
      ["peel", BANANA_GRAB_HIT_MS],
      ["bounce", BOUNCE_END_MS],
    ] as const;
    return { beat: beatAtMs(elapsedMs, beats, "exit"), actors };
  },
};
