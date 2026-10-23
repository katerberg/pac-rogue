import { LAZY_LOOPER_OPTIONAL_TINT } from "./lazyLooper";
import { cellKey, type Cell } from "./pennies";

export type Gleaning = {
  eligible: ReadonlySet<string>;
  gleaned: ReadonlySet<string>;
};

export function createGleaning(pelletCells: readonly Cell[] = []): Gleaning {
  return { eligible: new Set(pelletCells.map(cellKey)), gleaned: new Set() };
}

export function stepGleaning(
  state: Gleaning,
  ghostCells: readonly Cell[],
  pelletCells: readonly Cell[],
  streakActive: boolean,
): { state: Gleaning; crumbs: Cell[] } {
  if (!streakActive || ghostCells.length === 0) {
    return { state, crumbs: [] };
  }
  const present = new Set(pelletCells.map(cellKey));
  const gleaned = new Set(state.gleaned);
  const crumbs: Cell[] = [];
  for (const cell of ghostCells) {
    const key = cellKey(cell);
    if (state.eligible.has(key) && !present.has(key) && !gleaned.has(key)) {
      gleaned.add(key);
      crumbs.push(cell);
    }
  }
  return crumbs.length === 0 ? { state, crumbs } : { state: { ...state, gleaned }, crumbs };
}

export const CRUMB_PAID_TINT = 0xa56b31;

export function crumbTint(paid: boolean): number {
  return paid ? CRUMB_PAID_TINT : LAZY_LOOPER_OPTIONAL_TINT;
}
