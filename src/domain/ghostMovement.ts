import { GHOST_DIR, lCornerTurnDir, openGhostDirsAt, type GhostDir } from "./ghostPath";
import { canGhostEnterDirection, ghostSolidsForPhase, type SolidGrid } from "./maze";

export type GhostMovementRules = {
  solids: SolidGrid;
  canEnter: (x: number, y: number, dx: number, dy: number) => boolean;
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
    resolveReverse(x, y, facing, intent) {
      const opens = openGhostDirsAt(x, y, solids, canEnter);
      const turn = lCornerTurnDir(opens, facing);
      if (turn !== GHOST_DIR.none) {
        return { facing: turn, intent: turn };
      }
      return { facing: intent, intent };
    },
  };
}
