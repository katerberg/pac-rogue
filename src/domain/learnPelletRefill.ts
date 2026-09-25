import type { PelletKind } from "./maze";

export type PendingPelletRefill = { x: number; y: number; kind: PelletKind; remainingMs: number };

export function queuePelletRefills(
  pending: readonly PendingPelletRefill[],
  positions: readonly { x: number; y: number; kind: PelletKind }[],
  delayMs: number,
): PendingPelletRefill[] {
  if (positions.length === 0) {
    return [...pending];
  }
  return [...pending, ...positions.map((pos) => ({ ...pos, remainingMs: delayMs }))];
}

export function tickPelletRefills(
  pending: readonly PendingPelletRefill[],
  deltaMs: number,
): { pending: PendingPelletRefill[]; ready: { x: number; y: number; kind: PelletKind }[] } {
  const remaining: PendingPelletRefill[] = [];
  const ready: { x: number; y: number; kind: PelletKind }[] = [];
  for (const entry of pending) {
    const remainingMs = entry.remainingMs - Math.max(0, deltaMs);
    if (remainingMs > 0) {
      remaining.push({ ...entry, remainingMs });
    } else {
      ready.push({ x: entry.x, y: entry.y, kind: entry.kind });
    }
  }
  return { pending: remaining, ready };
}
