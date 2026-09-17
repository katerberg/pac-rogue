import { GHOST_DIR, lCornerTurnDir, openGhostDirsAt, type GhostDir } from "./ghostPath";
import { GHOST_PHASE } from "./ghostPhase";
import { canGhostEnterDirection, getActiveLayout, type SolidGrid } from "./maze";

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
  const layout = getActiveLayout();
  const solids = phase === GHOST_PHASE.active ? layout.playerSolids : layout.ghostSolids;
  const { door } = layout;
  const canEnter = (x: number, y: number, dx: number, dy: number) =>
    canGhostEnterDirection(x, y, dx, dy, phase, solids, door);

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
