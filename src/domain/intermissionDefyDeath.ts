import { GHOST_DIR } from "./ghostPath";
import {
  INTERMISSION_ACTOR_SIZE,
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
import { BLINKY_DRAWABLE_ID } from "./playfield";
import { REVIVE_SPLASH_MS, reviveSplashLook } from "./reviveSplash";

const BLINKY_GAP_AT_PELLET_PX = 120;
const BLINKY_SPEED = 0.45;
const CATCH_GAP_PX = 10;
export const DEFY_DEATH_CATCH_MS =
  INTERMISSION_PELLET_MS +
  (BLINKY_GAP_AT_PELLET_PX - CATCH_GAP_PX) / (BLINKY_SPEED - INTERMISSION_DOT_MAN_SPEED);
const CATCH_X = dotManApproachX(DEFY_DEATH_CATCH_MS);
const BLINKY_CATCH_X = CATCH_X - CATCH_GAP_PX;
const BLINKY_STRUT_SPEED = 0.18;
const VANISH_MS = 350;
const REVIVE_START_MS = DEFY_DEATH_CATCH_MS + VANISH_MS;
const REVIVE_END_MS = REVIVE_START_MS + REVIVE_SPLASH_MS;
const REVIVE_X = CATCH_X - 90;
const WALK_OFF_SPEED = 0.36;

function blinky(elapsedMs: number, bob: number): IntermissionActor {
  const x =
    elapsedMs < DEFY_DEATH_CATCH_MS
      ? chaserX(elapsedMs, BLINKY_GAP_AT_PELLET_PX, BLINKY_SPEED)
      : BLINKY_CATCH_X + BLINKY_STRUT_SPEED * (elapsedMs - DEFY_DEATH_CATCH_MS);
  return {
    kind: "ghost",
    key: "blinky",
    drawableId: BLINKY_DRAWABLE_ID,
    facing: GHOST_DIR.right,
    x,
    y: INTERMISSION_Y + bob,
  };
}

function dotMan(elapsedMs: number, bob: number): IntermissionActor[] {
  const at = { kind: "dotMan", key: "dotMan", y: INTERMISSION_Y - bob } as const;
  if (elapsedMs < DEFY_DEATH_CATCH_MS) {
    return [{ ...at, x: dotManApproachX(elapsedMs) }];
  }
  if (elapsedMs < REVIVE_START_MS) {
    return [];
  }
  if (elapsedMs < REVIVE_END_MS) {
    const look = reviveSplashLook(
      (elapsedMs - REVIVE_START_MS) / REVIVE_SPLASH_MS,
      INTERMISSION_ACTOR_SIZE,
    );
    return [{ ...at, x: REVIVE_X, y: INTERMISSION_Y, flipX: true, ...look }];
  }
  const x = REVIVE_X - WALK_OFF_SPEED * (elapsedMs - REVIVE_END_MS);
  return [{ ...at, x, flipX: true }];
}

export const defyDeath: IntermissionScript = {
  durationMs: Math.max(
    REVIVE_END_MS + msToLeave(REVIVE_X, INTERMISSION_Y, -WALK_OFF_SPEED),
    DEFY_DEATH_CATCH_MS + msToLeave(BLINKY_CATCH_X, INTERMISSION_Y, BLINKY_STRUT_SPEED),
  ),
  beatAt(elapsedMs) {
    const bob = intermissionBobPx(elapsedMs);
    const actors = pelletActors(elapsedMs);
    actors.push(blinky(elapsedMs, bob), ...dotMan(elapsedMs, bob));
    const beats = [
      ["chase", DEFY_DEATH_CATCH_MS],
      ["caught", REVIVE_START_MS],
      ["revive", REVIVE_END_MS],
    ] as const;
    return { beat: beatAtMs(elapsedMs, beats, "exit"), actors };
  },
};
