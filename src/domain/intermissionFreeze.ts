import { GHOST_DIR } from "./ghostPath";
import {
  INTERMISSION_PELLET_MS,
  INTERMISSION_PELLET_X,
  INTERMISSION_Y,
  beatAtMs,
  chaserX,
  intermissionBobPx,
  msToLeave,
  pelletActors,
  walkingDotMan,
  type IntermissionActor,
  type IntermissionScript,
} from "./intermissionScript";
import { CLYDE_DRAWABLE_ID } from "./playfield";

const CLYDE_GAP_AT_PELLET_PX = 170;
const CLYDE_SPEED = 0.42;
const CLYDE_FROZEN_X = INTERMISSION_PELLET_X - CLYDE_GAP_AT_PELLET_PX;
export const FREEZE_THAW_MS = INTERMISSION_PELLET_MS + 1800;

function clyde(elapsedMs: number, bob: number): IntermissionActor {
  const at = { kind: "ghost", key: "clyde", drawableId: CLYDE_DRAWABLE_ID } as const;
  if (elapsedMs < INTERMISSION_PELLET_MS) {
    const x = chaserX(elapsedMs, CLYDE_GAP_AT_PELLET_PX, CLYDE_SPEED);
    return { ...at, facing: GHOST_DIR.right, x, y: INTERMISSION_Y + bob };
  }
  if (elapsedMs < FREEZE_THAW_MS) {
    return { ...at, facing: GHOST_DIR.right, look: "frozen", x: CLYDE_FROZEN_X, y: INTERMISSION_Y };
  }
  const x = CLYDE_FROZEN_X + CLYDE_SPEED * (elapsedMs - FREEZE_THAW_MS);
  return { ...at, facing: GHOST_DIR.right, x, y: INTERMISSION_Y + bob };
}

export const freeze: IntermissionScript = {
  durationMs: FREEZE_THAW_MS + msToLeave(CLYDE_FROZEN_X, INTERMISSION_Y, CLYDE_SPEED),
  beatAt(elapsedMs) {
    const bob = intermissionBobPx(elapsedMs);
    const actors = pelletActors(elapsedMs);
    actors.push(clyde(elapsedMs, bob), walkingDotMan(elapsedMs));
    const beats = [
      ["chase", INTERMISSION_PELLET_MS],
      ["frozen", FREEZE_THAW_MS],
    ] as const;
    return { beat: beatAtMs(elapsedMs, beats, "exit"), actors };
  },
};
