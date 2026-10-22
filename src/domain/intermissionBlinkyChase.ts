import { clamp } from "./clamp";
import { GHOST_DIR } from "./ghostPath";
import {
  INTERMISSION_ACTOR_SIZE,
  INTERMISSION_Y,
  intermissionBobPx,
  type IntermissionScript,
} from "./intermissionScript";
import { BLINKY_DRAWABLE_ID } from "./playfield";
import { PLAYFIELD_WIDTH } from "./playfieldBounds";

export const BLINKY_CHASE_MS = 4000;
export const BLINKY_CHASE_GAP_PX = 130;

export const blinkyChase: IntermissionScript = {
  durationMs: BLINKY_CHASE_MS,
  beatAt(elapsedMs) {
    const progress = clamp(elapsedMs / BLINKY_CHASE_MS, 0, 1);
    const half = INTERMISSION_ACTOR_SIZE / 2;
    const startX = -half - BLINKY_CHASE_GAP_PX;
    const endX = PLAYFIELD_WIDTH + half;
    const blinkyX = startX + (endX - startX) * progress;
    const bob = intermissionBobPx(elapsedMs);
    return {
      beat: "chase",
      actors: [
        {
          kind: "ghost",
          key: "blinky",
          drawableId: BLINKY_DRAWABLE_ID,
          facing: GHOST_DIR.right,
          x: blinkyX,
          y: INTERMISSION_Y + bob,
        },
        {
          kind: "dotMan",
          key: "dotMan",
          x: blinkyX + BLINKY_CHASE_GAP_PX,
          y: INTERMISSION_Y - bob,
        },
      ],
    };
  },
};
