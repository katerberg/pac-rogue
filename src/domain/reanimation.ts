import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  nearestWalkableCellCenter,
  playerSpawnCenter,
  worldToCol,
  worldToRow,
  type SolidGrid,
} from "./maze";
import { reanimationMode, type UpgradeId } from "./upgrades";

type Point = { x: number; y: number };

const ORTHOGONAL = [
  { dCol: -1, dRow: 0 },
  { dCol: 1, dRow: 0 },
  { dCol: 0, dRow: -1 },
  { dCol: 0, dRow: 1 },
] as const;

export function nearestWalkableBesidePowerPellet(
  fell: Point,
  powerPellets: readonly Point[],
  solids: SolidGrid = getActiveLayout().playerSolids,
): Point | null {
  if (powerPellets.length === 0) {
    return null;
  }
  const fromCol = worldToCol(fell.x);
  const fromRow = worldToRow(fell.y);
  let best: { col: number; row: number; dist: number } | null = null;
  for (const pellet of powerPellets) {
    const pCol = worldToCol(pellet.x);
    const pRow = worldToRow(pellet.y);
    for (const { dCol, dRow } of ORTHOGONAL) {
      const col = pCol + dCol;
      const row = pRow + dRow;
      if (!isWalkable(col, row, solids)) {
        continue;
      }
      const dx = col - fromCol;
      const dy = row - fromRow;
      const dist = dx * dx + dy * dy;
      if (
        best === null ||
        dist < best.dist ||
        (dist === best.dist && (row < best.row || (row === best.row && col < best.col)))
      ) {
        best = { col, row, dist };
      }
    }
  }
  if (best === null) {
    return null;
  }
  return { x: cellCenterX(best.col), y: cellCenterY(best.row) };
}

export function respawnCenter(
  owned: readonly UpgradeId[],
  fell: Point | null,
  powerPellets: readonly Point[] = [],
): Point {
  const mode = reanimationMode(owned);
  if (fell === null || mode === null) {
    return playerSpawnCenter();
  }
  if (mode === "nearPowerPellet") {
    const beside = nearestWalkableBesidePowerPellet(fell, powerPellets);
    if (beside !== null) {
      return beside;
    }
  }
  return nearestWalkableCellCenter(fell.x, fell.y);
}
