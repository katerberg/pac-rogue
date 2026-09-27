import { GHOST_DIR, type GhostDir } from "./ghostPath";

export type BossTunnelMouth = { col: number; row: number; facing: GhostDir };

export type TileCell = { col: number; row: number };

export const BOSS_PELLET_SPAWN_CLEARANCE_TILES = 6;

// Clockwise from the bottom-left: left mouths bottom → top, then right mouths top → bottom.
export function bossTunnelMouths(tunnelRows: readonly number[], cols: number): BossTunnelMouth[] {
  const bottomUp = [...tunnelRows].sort((a, b) => b - a);
  const left = bottomUp.map((row) => ({ col: 0, row, facing: GHOST_DIR.right }));
  const right = [...bottomUp]
    .reverse()
    .map((row) => ({ col: cols - 1, row, facing: GHOST_DIR.left }));
  return [...left, ...right];
}

function manhattan(a: TileCell, b: TileCell): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function readingOrder(a: TileCell, b: TileCell): number {
  return a.row - b.row || a.col - b.col;
}

// Farthest-point spread: the first pick is farthest from the player spawn, each next pick
// maximizes its distance to the nearest earlier pick. Ties break by row, then column.
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
