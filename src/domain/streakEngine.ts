import { BONUS_STREAK_TIER_SIZE } from "./bonusBar";

export const STREAK_POP_MS = 700;
export const STREAK_POP_RISE_PX = 22;
export const STREAK_POP_FADE_START = 0.5;
export const STREAK_POP_CAP_SIZE_MUL = 1.5;

export type StreakPop = { value: number; cellIndex: number };

export function streakEngineFires(prevStreak: number, nextStreak: number, every: number): number {
  return Math.floor(nextStreak / every) - Math.floor(prevStreak / every);
}

export function streakPops(prevStreak: number, nextStreak: number, cycle: number): StreakPop[] {
  const pops: StreakPop[] = [];
  const from = Math.floor(prevStreak / BONUS_STREAK_TIER_SIZE) + 1;
  const to = Math.floor(nextStreak / BONUS_STREAK_TIER_SIZE);
  for (let milestone = from; milestone <= to; milestone += 1) {
    const count = milestone * BONUS_STREAK_TIER_SIZE;
    pops.push({ value: ((count - 1) % cycle) + 1, cellIndex: count - prevStreak - 1 });
  }
  return pops;
}

export function streakPopLook(
  progress: number,
  value: number,
  cycle: number,
): { dy: number; alpha: number; sizeMul: number } {
  const t = Math.min(1, Math.max(0, progress));
  const fade =
    t <= STREAK_POP_FADE_START ? 0 : (t - STREAK_POP_FADE_START) / (1 - STREAK_POP_FADE_START);
  return {
    dy: -STREAK_POP_RISE_PX * t,
    alpha: 1 - fade,
    sizeMul: value === cycle ? STREAK_POP_CAP_SIZE_MUL : 1,
  };
}
