import {
  GHOST_DIR,
  lCornerTurnDir,
  openGhostDirsAt,
  reverseGhostDir,
  type GhostDir,
} from "./ghostPath";
import { canGhostEnterDirection, ghostSolidsForPhase, type SolidGrid } from "./maze";

type Step = { dx: number; dy: number };

function directionStep(direction: GhostDir): Step {
  switch (direction) {
    case GHOST_DIR.up:
      return { dx: 0, dy: -1 };
    case GHOST_DIR.down:
      return { dx: 0, dy: 1 };
    case GHOST_DIR.left:
      return { dx: -1, dy: 0 };
    case GHOST_DIR.right:
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}

export type GhostMovementRules = {
  solids: SolidGrid;
  canEnter: (x: number, y: number, dx: number, dy: number) => boolean;
  clearFacingAtDeadEnd: false;
  resolveReverse: (
    x: number,
    y: number,
    facing: GhostDir,
    intent: GhostDir,
  ) => { facing: GhostDir; intent: GhostDir };
};

export function ghostMovementRules(phase: number): GhostMovementRules {
  const solids = ghostSolidsForPhase(phase);
  const canEnter = (x: number, y: number, dx: number, dy: number) =>
    canGhostEnterDirection(x, y, dx, dy, phase);

  return {
    solids,
    canEnter,
    clearFacingAtDeadEnd: false,
    resolveReverse(x, y, facing, intent) {
      if (facing === GHOST_DIR.none || intent === GHOST_DIR.none) {
        return { facing, intent };
      }
      if (reverseGhostDir(facing) !== intent) {
        return { facing, intent };
      }
      const opens = openGhostDirsAt(x, y, solids, canEnter);
      const turn = lCornerTurnDir(opens, facing);
      if (turn !== GHOST_DIR.none) {
        const { dx, dy } = directionStep(turn);
        if (canEnter(x, y, dx, dy)) {
          return { facing: turn, intent: turn };
        }
      }
      return { facing: intent, intent };
    },
  };
}
