import { GHOST_DIR, type GhostDir } from "./ghostPath";
import {
  INTERMISSION_PELLET_MS,
  INTERMISSION_PELLET_X,
  INTERMISSION_Y,
  beatAtMs,
  chaserX,
  dotManApproachX,
  intermissionBobPx,
  msToLeave,
  pelletActors,
  type IntermissionActor,
  type IntermissionScript,
} from "./intermissionScript";
import { BLINKY_DRAWABLE_ID } from "./playfield";

const BLINKY_GAP_AT_PELLET_PX = 160;
const BLINKY_SPEED = 0.42;
const DASH_SPEED = 0.9;
const TRAIL_STEP_PX = 26;
const TRAIL_ALPHAS = [0.45, 0.3, 0.15];
const BRAKE_MS = 700;
const BLINKY_STOP_X =
  INTERMISSION_PELLET_X - BLINKY_GAP_AT_PELLET_PX + (BLINKY_SPEED * BRAKE_MS) / 2;
const STOPPED_MS = INTERMISSION_PELLET_MS + BRAKE_MS;
const LOOK_UP_MS = STOPPED_MS + 350;
export const SPEED_BURST_TURN_MS = STOPPED_MS + 900;
const BLINKY_EXIT_SPEED = 0.42;

function blinky(elapsedMs: number, bob: number): IntermissionActor {
  const at = { kind: "ghost", key: "blinky", drawableId: BLINKY_DRAWABLE_ID } as const;
  if (elapsedMs < INTERMISSION_PELLET_MS) {
    const x = chaserX(elapsedMs, BLINKY_GAP_AT_PELLET_PX, BLINKY_SPEED);
    return { ...at, facing: GHOST_DIR.right, x, y: INTERMISSION_Y + bob };
  }
  if (elapsedMs < SPEED_BURST_TURN_MS) {
    const t = Math.min(elapsedMs - INTERMISSION_PELLET_MS, BRAKE_MS);
    const x =
      INTERMISSION_PELLET_X -
      BLINKY_GAP_AT_PELLET_PX +
      BLINKY_SPEED * (t - (t * t) / (2 * BRAKE_MS));
    const facing: GhostDir = elapsedMs < LOOK_UP_MS ? GHOST_DIR.right : GHOST_DIR.up;
    return { ...at, facing, x, y: INTERMISSION_Y };
  }
  const x = BLINKY_STOP_X - BLINKY_EXIT_SPEED * (elapsedMs - SPEED_BURST_TURN_MS);
  return { ...at, facing: GHOST_DIR.left, x, y: INTERMISSION_Y + bob };
}

function dotMen(elapsedMs: number, bob: number): IntermissionActor[] {
  const y = INTERMISSION_Y - bob;
  if (elapsedMs < INTERMISSION_PELLET_MS) {
    return [{ kind: "dotMan", key: "dotMan", x: dotManApproachX(elapsedMs), y }];
  }
  const x = INTERMISSION_PELLET_X + DASH_SPEED * (elapsedMs - INTERMISSION_PELLET_MS);
  return [
    ...TRAIL_ALPHAS.map((alpha, i): IntermissionActor => ({
      kind: "dotMan",
      key: `trail${i}`,
      x: Math.max(INTERMISSION_PELLET_X, x - TRAIL_STEP_PX * (i + 1)),
      y,
      alpha,
    })),
    { kind: "dotMan", key: "dotMan", x, y },
  ];
}

export const speedBurst: IntermissionScript = {
  durationMs: SPEED_BURST_TURN_MS + msToLeave(BLINKY_STOP_X, INTERMISSION_Y, -BLINKY_EXIT_SPEED),
  beatAt(elapsedMs) {
    const bob = intermissionBobPx(elapsedMs);
    const actors = pelletActors(elapsedMs);
    actors.push(blinky(elapsedMs, bob), ...dotMen(elapsedMs, bob));
    const beats = [
      ["chase", INTERMISSION_PELLET_MS],
      ["dash", STOPPED_MS],
      ["huh", SPEED_BURST_TURN_MS],
    ] as const;
    return { beat: beatAtMs(elapsedMs, beats, "exit"), actors };
  },
};
