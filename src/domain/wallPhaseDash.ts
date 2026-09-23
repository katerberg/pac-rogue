import type { GhostTarget } from "./ghostTarget";
import { isSolid, isWalkable, type SolidGrid } from "./maze";

const ORTHOGONAL_STEPS: readonly { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 0 },
];

/** Number of wall tiles the lunge crosses ("##"); the landing tile is one past that ("not ###"). */
export const WALL_PHASE_WALL_THICKNESS = 2;

export function wallPhaseDashLungeTarget(
  ghostCol: number,
  ghostRow: number,
  playerCol: number,
  playerRow: number,
  solids: SolidGrid,
): GhostTarget | null {
  let best: GhostTarget | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const { dx, dy } of ORTHOGONAL_STEPS) {
    const firstWallCol = ghostCol + dx;
    const firstWallRow = ghostRow + dy;
    const secondWallCol = ghostCol + dx * WALL_PHASE_WALL_THICKNESS;
    const secondWallRow = ghostRow + dy * WALL_PHASE_WALL_THICKNESS;
    const farCol = ghostCol + dx * (WALL_PHASE_WALL_THICKNESS + 1);
    const farRow = ghostRow + dy * (WALL_PHASE_WALL_THICKNESS + 1);

    if (
      !isSolid(firstWallCol, firstWallRow, solids) ||
      !isSolid(secondWallCol, secondWallRow, solids) ||
      !isWalkable(farCol, farRow, solids)
    ) {
      continue;
    }

    const dCol = farCol - playerCol;
    const dRow = farRow - playerRow;
    const dist = dCol * dCol + dRow * dRow;
    if (dist < bestDist) {
      bestDist = dist;
      best = { col: farCol, row: farRow };
    }
  }

  return best;
}
