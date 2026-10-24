import { GHOST_DIR, type GhostDir } from "./ghostPath";
import type { SolidGrid } from "./maze";

export type BossTunnelMouth = { col: number; row: number; facing: GhostDir };

export type TileCell = { col: number; row: number };

export const BOSS_PELLET_SPAWN_CLEARANCE_TILES = 6;

function spreadOpposites<T>(clockwise: readonly T[]): T[] {
  const half = Math.ceil(clockwise.length / 2);
  const order: T[] = [];
  for (let i = 0; i < half; i += 1) {
    order.push(clockwise[i]!);
    if (i + half < clockwise.length) {
      order.push(clockwise[i + half]!);
    }
  }
  return order;
}

/** Every tunnel end, vertical ones first and each group ordered so consecutive spawns come from opposite sides. */
export function bossTunnelMouths(solids: SolidGrid): BossTunnelMouth[] {
  const rows = solids.length;
  const cols = solids[0]?.length ?? 0;
  const open = (col: number, row: number): boolean => !(solids[row]?.[col] ?? true);
  const tunnelCols = Array.from({ length: cols }, (_, col) => col).filter(
    (col) => open(col, 0) && open(col, rows - 1),
  );
  const sideRows = Array.from({ length: rows }, (_, row) => row).filter(
    (row) => open(0, row) && open(cols - 1, row),
  );
  const vertical: BossTunnelMouth[] = [
    ...tunnelCols.map((col) => ({ col, row: 0, facing: GHOST_DIR.down })),
    ...tunnelCols.map((col) => ({ col, row: rows - 1, facing: GHOST_DIR.up })),
  ];
  const side: BossTunnelMouth[] = [
    ...sideRows.map((row) => ({ col: 0, row, facing: GHOST_DIR.right })),
    ...sideRows.map((row) => ({ col: cols - 1, row, facing: GHOST_DIR.left })),
  ];
  // Clockwise from the bottom-left corner: up the left edge, across the top, down the right, back along the bottom.
  const perimeter = (mouth: BossTunnelMouth): number => {
    if (mouth.col === 0) {
      return rows - 1 - mouth.row;
    }
    if (mouth.row === 0) {
      return rows - 1 + mouth.col;
    }
    if (mouth.col === cols - 1) {
      return rows + cols - 2 + mouth.row;
    }
    return 2 * (rows - 1) + cols - 1 + (cols - 1 - mouth.col);
  };
  const clockwise = (mouths: BossTunnelMouth[]): BossTunnelMouth[] =>
    spreadOpposites(mouths.sort((a, b) => perimeter(a) - perimeter(b)));
  return [...clockwise(vertical), ...clockwise(side)];
}

function manhattan(a: TileCell, b: TileCell): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function readingOrder(a: TileCell, b: TileCell): number {
  return a.row - b.row || a.col - b.col;
}

export function pickBossPelletCells<T extends TileCell>(
  candidates: readonly T[],
  playerSpawn: TileCell,
  count: number,
): T[] {
  const pool = candidates
    .filter((cell) => manhattan(cell, playerSpawn) > BOSS_PELLET_SPAWN_CLEARANCE_TILES)
    .sort(readingOrder);
  const picked: T[] = [];
  const nearest = pool.map((cell) => manhattan(cell, playerSpawn));
  while (picked.length < count && pool.length > 0) {
    let best = 0;
    for (let i = 1; i < pool.length; i += 1) {
      if (nearest[i]! > nearest[best]!) {
        best = i;
      }
    }
    const [chosen] = pool.splice(best, 1);
    nearest.splice(best, 1);
    picked.push(chosen!);
    for (let i = 0; i < pool.length; i += 1) {
      const d = manhattan(pool[i]!, chosen!);
      if (picked.length === 1 || d < nearest[i]!) {
        nearest[i] = d;
      }
    }
  }
  return picked;
}
