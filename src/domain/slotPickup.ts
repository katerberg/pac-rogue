import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  nearestWalkableCellCenter,
  type SolidGrid,
  walkableCellCenters,
  worldToCol,
  worldToRow,
} from "./maze";
import { takeRandomFrom } from "./upgrades";

export const SLOT_PICKUP_QUARTERS = 4;

export type SlotPickupCell = { col: number; row: number };

export function tickSlotPickupProgress(
  progress: number,
  gained: number,
): { progress: number; spawns: number } {
  if (gained <= 0) {
    return { progress, spawns: 0 };
  }
  const total = progress + gained;
  return {
    progress: total % SLOT_PICKUP_QUARTERS,
    spawns: Math.floor(total / SLOT_PICKUP_QUARTERS),
  };
}

export function remapSlotPickupCell(
  col: number,
  row: number,
  solids: SolidGrid = getActiveLayout().playerSolids,
): SlotPickupCell {
  if (isWalkable(col, row, solids)) {
    return { col, row };
  }
  const center = nearestWalkableCellCenter(cellCenterX(col), cellCenterY(row), solids);
  return { col: worldToCol(center.x), row: worldToRow(center.y) };
}

export function pickSlotPickupCell(
  rng: () => number,
  solids: SolidGrid = getActiveLayout().playerSolids,
  avoid: readonly SlotPickupCell[] = [],
): SlotPickupCell {
  const spawn = getActiveLayout().playerSpawn;
  const blocked = new Set<string>([
    `${spawn.col},${spawn.row}`,
    ...avoid.map((cell) => `${cell.col},${cell.row}`),
  ]);
  const walkable = walkableCellCenters(solids);
  const preferred = walkable.filter((cell) => !blocked.has(`${cell.col},${cell.row}`));
  const pool = preferred.length > 0 ? preferred : walkable;
  const picked = takeRandomFrom(pool, rng);
  return { col: picked.col, row: picked.row };
}
