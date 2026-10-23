import { GHOST_DIR, lCornerTurnDir, openGhostDirsAt, type GhostDir } from "./ghostPath";
import { GHOST_PHASE } from "./ghostPhase";
import {
  canGhostEnterDirection,
  getActiveLayout,
  worldToCol,
  worldToRow,
  type SolidGrid,
} from "./maze";
import { ghostStepBlockedByWall, withSolidCell, type DroppedWall } from "./wallDrop";

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

export function ghostMovementRules(
  phase: number,
  blockTunnels = false,
  blockTunnelRow: number | null = null,
  droppedWall: DroppedWall | null = null,
  ghostAt: { x: number; y: number } | null = null,
): GhostMovementRules {
  const layout = getActiveLayout();
  const onWall =
    droppedWall !== null &&
    ghostAt !== null &&
    worldToCol(ghostAt.x) === droppedWall.col &&
    worldToRow(ghostAt.y) === droppedWall.row;
  const solids = withSolidCell(
    phase === GHOST_PHASE.active ? layout.ghostActiveSolids : layout.ghostSolids,
    onWall ? null : droppedWall,
  );
  const { door } = layout;
  const canEnter = (x: number, y: number, dx: number, dy: number) =>
    !ghostStepBlockedByWall(droppedWall, worldToCol(x), worldToRow(y), dx, dy) &&
    canGhostEnterDirection(
      x,
      y,
      dx,
      dy,
      phase,
      solids,
      door,
      layout.house,
      blockTunnels,
      blockTunnelRow,
    );

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
