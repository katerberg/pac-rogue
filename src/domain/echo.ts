import type { BaseUpgradeId } from "./upgrades";

export const ECHO_DELAY_MS = 3000;

export type EchoEffects = "one" | "all";

export type PendingEcho = { remainingMs: number; bases: readonly BaseUpgradeId[] };

export function pickEchoBases(
  mode: EchoEffects | null,
  powerBases: readonly BaseUpgradeId[],
  rng: () => number,
): BaseUpgradeId[] {
  if (mode === null || powerBases.length === 0) {
    return [];
  }
  if (mode === "all") {
    return [...powerBases];
  }
  return [powerBases[Math.min(powerBases.length - 1, Math.floor(rng() * powerBases.length))]!];
}

export function tickEchoes(
  pending: readonly PendingEcho[],
  deltaMs: number,
): { pending: PendingEcho[]; ready: (readonly BaseUpgradeId[])[] } {
  const remaining: PendingEcho[] = [];
  const ready: (readonly BaseUpgradeId[])[] = [];
  for (const echo of pending) {
    const remainingMs = echo.remainingMs - Math.max(0, deltaMs);
    if (remainingMs > 0) {
      remaining.push({ ...echo, remainingMs });
    } else {
      ready.push(echo.bases);
    }
  }
  return { pending: remaining, ready };
}
