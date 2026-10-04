import type { SolidGrid } from "./maze";
import type { Cell } from "./bonusBar";

export type RouteStep = { dx: number; dy: number };

const STEPS: readonly RouteStep[] = [
  { dx: 0, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 0 },
];

function isOpen(solids: SolidGrid, col: number, row: number): boolean {
  return solids[row]?.[col] === false;
}

export function storeExitCellAt(solids: SolidGrid, col: number, row: number): Cell | null {
  const rows = solids.length;
  const cols = solids[0]?.length ?? 0;
  if (col < -1 || col > cols || row < -1 || row > rows) {
    return null;
  }
  const c = Math.min(cols - 1, Math.max(0, col));
  const r = Math.min(rows - 1, Math.max(0, row));
  const onBorder = c === 0 || c === cols - 1 || r === 0 || r === rows - 1;
  return onBorder && isOpen(solids, c, r) ? { col: c, row: r } : null;
}

function firstStep(
  solids: SolidGrid,
  from: Cell,
  to: Cell,
  passable: (col: number, row: number) => boolean,
): RouteStep | null {
  const key = (col: number, row: number) => `${col},${row}`;
  const firstStepOf = new Map<string, RouteStep | null>([[key(from.col, from.row), null]]);
  const queue: Cell[] = [from];
  for (let i = 0; i < queue.length; i += 1) {
    const cell = queue[i]!;
    const via = firstStepOf.get(key(cell.col, cell.row)) ?? null;
    for (const step of STEPS) {
      const col = cell.col + step.dx;
      const row = cell.row + step.dy;
      const k = key(col, row);
      if (firstStepOf.has(k) || !isOpen(solids, col, row)) {
        continue;
      }
      if (col === to.col && row === to.row) {
        return via ?? step;
      }
      if (!passable(col, row)) {
        continue;
      }
      firstStepOf.set(k, via ?? step);
      queue.push({ col, row });
    }
  }
  return null;
}

export function storeRouteStep(
  solids: SolidGrid,
  from: Cell,
  to: Cell,
  avoid: (col: number, row: number) => boolean,
): RouteStep | null {
  return (
    firstStep(solids, from, to, (col, row) => !avoid(col, row)) ??
    firstStep(solids, from, to, () => true)
  );
}
