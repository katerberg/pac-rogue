import { DEFAULT_TUNING } from "./tuning";

export const QUARTER_CHARGE = 300;
export const PENNIES_PER_QUARTER = 24;
export const CHARGE_PER_PENNY = QUARTER_CHARGE / PENNIES_PER_QUARTER;
export const PENNY_STREAK_TIER_SIZE = 5;
export const PENNY_STREAK_IDLE_MS = DEFAULT_TUNING.pennyStreakIdleMs;
export const FRUIT_BONUS_CHARGE = QUARTER_CHARGE / 2;
const BONUS_TIER_BUMPS = [2, 3, 5, 8, 12, 16] as const;
const BONUS_TIER_BUMP_STEP = 5;

export function penniesInCharge(charge: number): number {
  return Math.min(PENNIES_PER_QUARTER - 1, Math.floor(Math.max(0, charge) / CHARGE_PER_PENNY));
}

export function formatPennies(charge: number): string {
  return `${Number((charge / CHARGE_PER_PENNY).toFixed(1))} PENNIES`;
}

export type Cell = { col: number; row: number };

export type PennyPurse = {
  charge: number;
  streak: number;
  idleMs: number;
  credited: ReadonlySet<string>;
};

export type PennyResult = { bar: PennyPurse; tier: number; filled: number };

function cellKey(cell: Cell): string {
  return `${cell.col},${cell.row}`;
}

export function createPennyPurse(charge = 0): PennyPurse {
  return { charge, streak: 0, idleMs: 0, credited: new Set() };
}

export function pennyTierBump(tier: number): number {
  if (tier <= BONUS_TIER_BUMPS.length) {
    return BONUS_TIER_BUMPS[tier - 1] ?? 0;
  }
  const last = BONUS_TIER_BUMPS[BONUS_TIER_BUMPS.length - 1];
  return last + BONUS_TIER_BUMP_STEP * (tier - BONUS_TIER_BUMPS.length);
}

export function addPennyCharge(
  bar: PennyPurse,
  points: number,
): { bar: PennyPurse; filled: number } {
  const total = bar.charge + Math.max(0, points);
  const filled = Math.floor(total / QUARTER_CHARGE);
  return { bar: { ...bar, charge: total % QUARTER_CHARGE }, filled };
}

export function applyStreakPellets(
  bar: PennyPurse,
  cells: readonly Cell[],
  weight = 1,
): PennyResult {
  if (cells.length === 0) {
    return { bar, tier: 0, filled: 0 };
  }
  const streak = bar.streak + cells.length * weight;
  const credited = new Set(bar.credited);
  for (const cell of cells) {
    credited.add(cellKey(cell));
  }
  const fromTier = Math.floor(bar.streak / PENNY_STREAK_TIER_SIZE);
  const toTier = Math.floor(streak / PENNY_STREAK_TIER_SIZE);
  let bump = 0;
  for (let tier = fromTier + 1; tier <= toTier; tier += 1) {
    bump += pennyTierBump(tier);
  }
  const charged = addPennyCharge({ ...bar, streak, idleMs: 0, credited }, bump);
  return { bar: charged.bar, tier: toTier > fromTier ? toTier : 0, filled: charged.filled };
}

export function breakStreak(bar: PennyPurse): PennyPurse {
  return { charge: bar.charge, streak: 0, idleMs: 0, credited: new Set() };
}

export function enterCell(bar: PennyPurse, cell: Cell, hasPellet: boolean): PennyPurse {
  if (hasPellet) {
    return bar;
  }
  const key = cellKey(cell);
  if (!bar.credited.has(key)) {
    return breakStreak(bar);
  }
  const credited = new Set(bar.credited);
  credited.delete(key);
  return { ...bar, credited };
}

export function tickStreakIdle(
  bar: PennyPurse,
  deltaMs: number,
  idleLimitMs: number = PENNY_STREAK_IDLE_MS,
): PennyPurse {
  if (bar.streak === 0) {
    return bar;
  }
  const idleMs = bar.idleMs + deltaMs;
  return idleMs >= idleLimitMs ? breakStreak(bar) : { ...bar, idleMs };
}
