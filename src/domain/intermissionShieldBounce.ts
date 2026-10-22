import { GHOST_DIR } from "./ghostPath";
import {
  INTERMISSION_DOT_MAN_SPEED,
  INTERMISSION_HALF,
  INTERMISSION_PELLET_MS,
  INTERMISSION_PELLET_X,
  INTERMISSION_SHIELD_SIZE,
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
import { PINKY_DRAWABLE_ID } from "./playfield";

const PINKY_GAP_AT_PELLET_PX = 200;
const PINKY_SPEED = 0.42;
const PINKY_HIT_X = INTERMISSION_PELLET_X - INTERMISSION_SHIELD_SIZE / 2 - INTERMISSION_HALF * 0.6;
export const SHIELD_BOUNCE_HIT_MS =
  INTERMISSION_PELLET_MS +
  (PINKY_HIT_X - (INTERMISSION_PELLET_X - PINKY_GAP_AT_PELLET_PX)) / PINKY_SPEED;
const BOUNCE_MS = 550;
const BOUNCE_BACK_PX = 150;
const BOUNCE_HOP_PX = 48;
const BOUNCE_END_MS = SHIELD_BOUNCE_HIT_MS + BOUNCE_MS;
const PINKY_LANDED_X = PINKY_HIT_X - BOUNCE_BACK_PX;
const PINKY_EXIT_SPEED = 0.3;

function pinky(elapsedMs: number, bob: number): IntermissionActor {
  const at = { kind: "ghost", key: "pinky", drawableId: PINKY_DRAWABLE_ID } as const;
  if (elapsedMs < SHIELD_BOUNCE_HIT_MS) {
    const x = chaserX(elapsedMs, PINKY_GAP_AT_PELLET_PX, PINKY_SPEED);
    return { ...at, facing: GHOST_DIR.right, x, y: INTERMISSION_Y + bob };
  }
  if (elapsedMs < BOUNCE_END_MS) {
    const t = (elapsedMs - SHIELD_BOUNCE_HIT_MS) / BOUNCE_MS;
    return {
      ...at,
      facing: GHOST_DIR.up,
      ...bounceArc(t, PINKY_HIT_X, BOUNCE_BACK_PX, BOUNCE_HOP_PX),
    };
  }
  const x = PINKY_LANDED_X - PINKY_EXIT_SPEED * (elapsedMs - BOUNCE_END_MS);
  return { ...at, facing: GHOST_DIR.left, x, y: INTERMISSION_Y + bob };
}

function dotMan(elapsedMs: number, bob: number): IntermissionActor {
  const at = { kind: "dotMan", key: "dotMan", y: INTERMISSION_Y - bob } as const;
  if (elapsedMs < INTERMISSION_PELLET_MS) {
    return { ...at, x: dotManApproachX(elapsedMs) };
  }
  if (elapsedMs < BOUNCE_END_MS) {
    return { ...at, x: INTERMISSION_PELLET_X, y: INTERMISSION_Y, flipX: true };
  }
  const x = INTERMISSION_PELLET_X + INTERMISSION_DOT_MAN_SPEED * (elapsedMs - BOUNCE_END_MS);
  return { ...at, x };
}

export const shieldBounce: IntermissionScript = {
  durationMs:
    BOUNCE_END_MS +
    Math.max(
      msToLeave(INTERMISSION_PELLET_X, INTERMISSION_Y, INTERMISSION_DOT_MAN_SPEED),
      msToLeave(PINKY_LANDED_X, INTERMISSION_Y, -PINKY_EXIT_SPEED),
    ),
  beatAt(elapsedMs) {
    const bob = intermissionBobPx(elapsedMs);
    const actors = pelletActors(elapsedMs);
    actors.push(pinky(elapsedMs, bob), dotMan(elapsedMs, bob));
    if (elapsedMs >= INTERMISSION_PELLET_MS && elapsedMs < SHIELD_BOUNCE_HIT_MS) {
      actors.push({
        kind: "bubbleShield",
        key: "shield",
        x: INTERMISSION_PELLET_X,
        y: INTERMISSION_Y,
      });
    }
    const beats = [
      ["chase", INTERMISSION_PELLET_MS],
      ["shield", SHIELD_BOUNCE_HIT_MS],
      ["bounce", BOUNCE_END_MS],
    ] as const;
    return { beat: beatAtMs(elapsedMs, beats, "exit"), actors };
  },
};
