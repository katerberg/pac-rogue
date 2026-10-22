import { GHOST_DIR } from "./ghostPath";
import {
  INTERMISSION_DOT_MAN_SPEED,
  INTERMISSION_PELLET_MS,
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
import {
  BLINKY_DRAWABLE_ID,
  CLYDE_DRAWABLE_ID,
  INKY_DRAWABLE_ID,
  PINKY_DRAWABLE_ID,
} from "./playfield";

const FLING_SPEED = 1;
const PACK = [
  { key: "blinky", drawableId: BLINKY_DRAWABLE_ID, gapPx: 120, vx: 0.6, vy: -0.8 },
  { key: "pinky", drawableId: PINKY_DRAWABLE_ID, gapPx: 180, vx: -0.6, vy: -0.8 },
  { key: "inky", drawableId: INKY_DRAWABLE_ID, gapPx: 240, vx: 0.6, vy: 0.8 },
  { key: "clyde", drawableId: CLYDE_DRAWABLE_ID, gapPx: 300, vx: -0.6, vy: 0.8 },
] as const;

function packGhost(
  ghost: (typeof PACK)[number],
  elapsedMs: number,
  bob: number,
): IntermissionActor {
  const at = { kind: "ghost", key: ghost.key, drawableId: ghost.drawableId } as const;
  const atPelletX = chaserX(INTERMISSION_PELLET_MS, ghost.gapPx, INTERMISSION_DOT_MAN_SPEED);
  if (elapsedMs < INTERMISSION_PELLET_MS) {
    const x = chaserX(elapsedMs, ghost.gapPx, INTERMISSION_DOT_MAN_SPEED);
    return { ...at, facing: GHOST_DIR.right, x, y: INTERMISSION_Y + bob };
  }
  const t = (elapsedMs - INTERMISSION_PELLET_MS) * FLING_SPEED;
  return {
    ...at,
    facing: ghost.vy < 0 ? GHOST_DIR.up : GHOST_DIR.down,
    x: atPelletX + ghost.vx * t,
    y: INTERMISSION_Y + ghost.vy * t,
  };
}

export const SCATTER_BURST_GONE_MS =
  INTERMISSION_PELLET_MS +
  Math.max(
    ...PACK.map((ghost) =>
      msToLeave(
        chaserX(INTERMISSION_PELLET_MS, ghost.gapPx, INTERMISSION_DOT_MAN_SPEED),
        INTERMISSION_Y,
        ghost.vx * FLING_SPEED,
        ghost.vy * FLING_SPEED,
      ),
    ),
  );

export const scatterBurst: IntermissionScript = {
  durationMs: msToLeave(dotManApproachX(0), INTERMISSION_Y, INTERMISSION_DOT_MAN_SPEED),
  beatAt(elapsedMs) {
    const bob = intermissionBobPx(elapsedMs);
    const actors = pelletActors(elapsedMs);
    if (elapsedMs < SCATTER_BURST_GONE_MS) {
      actors.push(...PACK.map((ghost) => packGhost(ghost, elapsedMs, bob)));
    }
    actors.push({
      kind: "dotMan",
      key: "dotMan",
      x: dotManApproachX(elapsedMs),
      y: INTERMISSION_Y - bob,
    });
    const beats = [
      ["chase", INTERMISSION_PELLET_MS],
      ["scatter", SCATTER_BURST_GONE_MS],
    ] as const;
    return { beat: beatAtMs(elapsedMs, beats, "exit"), actors };
  },
};
