import { DEFAULT_TUNING } from "./tuning";

export const BONUS_BAR_MAX = 300;
export const BONUS_STREAK_TIER_SIZE = 5;
export const BONUS_STREAK_IDLE_MS = DEFAULT_TUNING.bonusStreakIdleMs;
export const FRUIT_BONUS_CHARGE = BONUS_BAR_MAX / 2;
const BONUS_TIER_BUMPS = [2, 3, 5, 8, 12, 16] as const;
const BONUS_TIER_BUMP_STEP = 5;

export type Cell = { col: number; row: number };

export type BonusBar = {
  charge: number;
  streak: number;
  idleMs: number;
  credited: ReadonlySet<string>;
};

export type BonusResult = { bar: BonusBar; tier: number; filled: number };

function cellKey(cell: Cell): string {
  return `${cell.col},${cell.row}`;
}

export function createBonusBar(charge = 0): BonusBar {
  return { charge, streak: 0, idleMs: 0, credited: new Set() };
}

export function bonusTierBump(tier: number): number {
  if (tier <= BONUS_TIER_BUMPS.length) {
    return BONUS_TIER_BUMPS[tier - 1] ?? 0;
  }
  const last = BONUS_TIER_BUMPS[BONUS_TIER_BUMPS.length - 1];
  return last + BONUS_TIER_BUMP_STEP * (tier - BONUS_TIER_BUMPS.length);
}

export function addBonusCharge(bar: BonusBar, points: number): { bar: BonusBar; filled: number } {
  const total = bar.charge + Math.max(0, points);
  const filled = Math.floor(total / BONUS_BAR_MAX);
  return { bar: { ...bar, charge: total % BONUS_BAR_MAX }, filled };
}

export function applyStreakPellets(bar: BonusBar, cells: readonly Cell[]): BonusResult {
  if (cells.length === 0) {
    return { bar, tier: 0, filled: 0 };
  }
  const streak = bar.streak + cells.length;
  const credited = new Set(bar.credited);
  for (const cell of cells) {
    credited.add(cellKey(cell));
  }
  const fromTier = Math.floor(bar.streak / BONUS_STREAK_TIER_SIZE);
  const toTier = Math.floor(streak / BONUS_STREAK_TIER_SIZE);
  let bump = 0;
  for (let tier = fromTier + 1; tier <= toTier; tier += 1) {
    bump += bonusTierBump(tier);
  }
  const charged = addBonusCharge({ ...bar, streak, idleMs: 0, credited }, bump);
  return { bar: charged.bar, tier: toTier > fromTier ? toTier : 0, filled: charged.filled };
}

export function breakStreak(bar: BonusBar): BonusBar {
  return { charge: bar.charge, streak: 0, idleMs: 0, credited: new Set() };
}

export function enterCell(bar: BonusBar, cell: Cell, hasPellet: boolean): BonusBar {
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
  bar: BonusBar,
  deltaMs: number,
  idleLimitMs: number = BONUS_STREAK_IDLE_MS,
): BonusBar {
  if (bar.streak === 0) {
    return bar;
  }
  const idleMs = bar.idleMs + deltaMs;
  return idleMs >= idleLimitMs ? breakStreak(bar) : { ...bar, idleMs };
}
