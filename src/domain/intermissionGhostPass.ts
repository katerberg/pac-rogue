import { GHOST_DIR } from "./ghostPath";
import {
  INTERMISSION_DOT_MAN_SPEED,
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
import { INKY_DRAWABLE_ID } from "./playfield";
import { PLAYER_INVULN_TINT } from "./playerTint";

const INKY_GAP_AT_PELLET_PX = 330;
const INKY_SPEED = 0.42;
const POWER_UP_MS = 600;
const WALK_START_MS = INTERMISSION_PELLET_MS + POWER_UP_MS;
export const GHOST_PASS_MEET_MS =
  INTERMISSION_PELLET_MS +
  (INKY_GAP_AT_PELLET_PX + INTERMISSION_DOT_MAN_SPEED * POWER_UP_MS) /
    (INKY_SPEED + INTERMISSION_DOT_MAN_SPEED);
const PASS_MS = 250;

function dotMan(elapsedMs: number, bob: number): IntermissionActor {
  const at = { kind: "dotMan", key: "dotMan", y: INTERMISSION_Y - bob } as const;
  if (elapsedMs < INTERMISSION_PELLET_MS) {
    return { ...at, x: dotManApproachX(elapsedMs) };
  }
  const ghostProof = { ...at, flipX: true, tint: PLAYER_INVULN_TINT } as const;
  if (elapsedMs < WALK_START_MS) {
    return { ...ghostProof, x: INTERMISSION_PELLET_X, y: INTERMISSION_Y };
  }
  const x = INTERMISSION_PELLET_X - INTERMISSION_DOT_MAN_SPEED * (elapsedMs - WALK_START_MS);
  return { ...ghostProof, x };
}

export const ghostPass: IntermissionScript = {
  durationMs: Math.max(
    WALK_START_MS + msToLeave(INTERMISSION_PELLET_X, INTERMISSION_Y, -INTERMISSION_DOT_MAN_SPEED),
    INTERMISSION_PELLET_MS +
      msToLeave(INTERMISSION_PELLET_X - INKY_GAP_AT_PELLET_PX, INTERMISSION_Y, INKY_SPEED),
  ),
  beatAt(elapsedMs) {
    const bob = intermissionBobPx(elapsedMs);
    const actors = pelletActors(elapsedMs);
    actors.push(
      {
        kind: "ghost",
        key: "inky",
        drawableId: INKY_DRAWABLE_ID,
        facing: GHOST_DIR.right,
        x: chaserX(elapsedMs, INKY_GAP_AT_PELLET_PX, INKY_SPEED),
        y: INTERMISSION_Y + bob,
      },
      dotMan(elapsedMs, bob),
    );
    const beats = [
      ["chase", INTERMISSION_PELLET_MS],
      ["ghostProof", GHOST_PASS_MEET_MS - PASS_MS],
      ["pass", GHOST_PASS_MEET_MS + PASS_MS],
    ] as const;
    return { beat: beatAtMs(elapsedMs, beats, "exit"), actors };
  },
};
