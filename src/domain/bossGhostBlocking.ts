import { GHOST_DIR, reverseGhostDir, type GhostDir } from "./ghostPath";
import type { SolidGrid } from "./maze";

const STEPS: readonly { dir: GhostDir; dx: number; dy: number }[] = [
  { dir: GHOST_DIR.up, dx: 0, dy: -1 },
  { dir: GHOST_DIR.left, dx: -1, dy: 0 },
  { dir: GHOST_DIR.down, dx: 0, dy: 1 },
  { dir: GHOST_DIR.right, dx: 1, dy: 0 },
];

export function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function open(solids: SolidGrid, col: number, row: number): boolean {
  return solids[row]?.[col] === false;
}

// Walks the corridor leaving (col,row) by one (dx,dy) step, following bends, and stops after the
// first junction or dead end. True if any tile on that run is occupied — a ghost treating
// other ghosts as walls should not pick a route that runs through one.
export function corridorOccupied(
  col: number,
  row: number,
  dx: number,
  dy: number,
  occupied: ReadonlySet<string>,
  solids: SolidGrid,
): boolean {
  const rows = solids.length;
  const cols = solids[0]?.length ?? 0;
  if (rows === 0 || cols === 0) {
    return false;
  }
  let heading = STEPS.find((s) => s.dx === dx && s.dy === dy)?.dir ?? GHOST_DIR.none;
  let c = col;
  let r = row;
  for (let steps = 0; steps < cols + rows; steps += 1) {
    const step = STEPS.find((s) => s.dir === heading);
    if (!step) {
      return false;
    }
    c = wrap(c + step.dx, cols);
    r = wrap(r + step.dy, rows);
    if (!open(solids, c, r)) {
      return false;
    }
    if (occupied.has(tileKey(c, r))) {
      return true;
    }
    const back = reverseGhostDir(heading);
    const exits = STEPS.filter(
      (s) => s.dir !== back && open(solids, wrap(c + s.dx, cols), wrap(r + s.dy, rows)),
    );
    if (exits.length !== 1) {
      return false;
    }
    heading = exits[0]!.dir;
  }
  return false;
}
