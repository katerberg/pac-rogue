import { BONUS_BAR_MAX } from "./bonusBar";
import type { BossId } from "./bossRules";
import { expiryTintOn } from "./expiryBlink";
import { GHOST_DIR, reverseGhostDir, type GhostDir } from "./ghostPath";

export const HUNTER_FRIGHTENED_MS = 6000;
export const HUNTER_FRIGHTENED_LEVEL_STEP_MS = 500;
export const HUNTER_FRIGHTENED_MIN_MS = 4000;
export const HUNTER_FRIGHTENED_SPEED_MUL = 0.6;
export const HUNTER_FULL_BAR_EAT = 3;
export const HUNTER_SWARM_FRIGHTEN_LIMIT = 4;

export function hunterFrightenedMs(
  baseMs: number,
  shortensPerLevel: boolean,
  levelIndex: number,
): number {
  if (!shortensPerLevel) {
    return baseMs;
  }
  const shortened = baseMs - HUNTER_FRIGHTENED_LEVEL_STEP_MS * (Math.max(1, levelIndex) - 1);
  return Math.max(HUNTER_FRIGHTENED_MIN_MS, shortened);
}

export function hunterEatCharge(eatenBefore: number): number {
  return BONUS_BAR_MAX * 2 ** (eatenBefore + 1 - HUNTER_FULL_BAR_EAT);
}

export function hunterFrightenLimit(bossId: BossId | null): number | null {
  return bossId === "blinkySwarm" ? HUNTER_SWARM_FRIGHTEN_LIMIT : null;
}

export type FrightenCandidate = { eid: number; x: number; y: number };

export function pickFrightenTargets(
  candidates: readonly FrightenCandidate[],
  from: { x: number; y: number },
  limit: number | null,
): number[] {
  const byDistance = [...candidates].sort(
    (a, b) =>
      Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y) ||
      a.eid - b.eid,
  );
  return (limit === null ? byDistance : byDistance.slice(0, limit)).map((c) => c.eid);
}

export function pickFrightenedDirection(
  opens: readonly GhostDir[],
  facing: GhostDir,
  roll: () => number,
): GhostDir {
  const back = reverseGhostDir(facing);
  const forward = opens.filter((dir) => dir !== back);
  if (forward.length === 0) {
    return opens.includes(back) ? back : GHOST_DIR.none;
  }
  return forward[Math.min(forward.length - 1, Math.floor(roll() * forward.length))]!;
}

export type FrightenedGhosts = { eids: number[]; remainingMs: number };

export function showsFrightenedLook(
  frightened: FrightenedGhosts | null | undefined,
  eid: number,
  nowMs: number,
): boolean {
  return (
    frightened != null &&
    frightened.eids.includes(eid) &&
    expiryTintOn(frightened.remainingMs, nowMs)
  );
}
