import { EXPIRY_BLINK_MS } from "./expiryBlink";

export const TIMED_TUNNEL_OPEN_MS = 6000;
export const TIMED_TUNNEL_WARN_MS = 1500;
export const TIMED_TUNNEL_CLOSED_MS = 2500;
export const TIMED_TUNNEL_CYCLE_MS = TIMED_TUNNEL_OPEN_MS + TIMED_TUNNEL_CLOSED_MS;

export type TimedTunnelPhase = "open" | "warn" | "closed";

export function timedTunnelPhase(elapsedMs: number): TimedTunnelPhase {
  const t = ((elapsedMs % TIMED_TUNNEL_CYCLE_MS) + TIMED_TUNNEL_CYCLE_MS) % TIMED_TUNNEL_CYCLE_MS;
  if (t >= TIMED_TUNNEL_OPEN_MS) {
    return "closed";
  }
  if (t >= TIMED_TUNNEL_OPEN_MS - TIMED_TUNNEL_WARN_MS) {
    return "warn";
  }
  return "open";
}

export function timedTunnelPhaseRemainingMs(elapsedMs: number): number {
  const t = ((elapsedMs % TIMED_TUNNEL_CYCLE_MS) + TIMED_TUNNEL_CYCLE_MS) % TIMED_TUNNEL_CYCLE_MS;
  if (t >= TIMED_TUNNEL_OPEN_MS) {
    return TIMED_TUNNEL_CYCLE_MS - t;
  }
  if (t >= TIMED_TUNNEL_OPEN_MS - TIMED_TUNNEL_WARN_MS) {
    return TIMED_TUNNEL_OPEN_MS - t;
  }
  return TIMED_TUNNEL_OPEN_MS - TIMED_TUNNEL_WARN_MS - t;
}

export function pickTimedTunnelRow(
  rows: readonly number[],
  nextRandom: () => number,
): number | null {
  if (rows.length === 0) {
    return null;
  }
  if (rows.length === 1) {
    return rows[0]!;
  }
  return rows[Math.floor(nextRandom() * rows.length)]!;
}

export function timedTunnelBlocksWrap(args: {
  phase: TimedTunnelPhase;
  gatedRow: number | null;
  entityRow: number;
  wallPassLoopActive: boolean;
}): boolean {
  if (args.wallPassLoopActive || args.gatedRow === null || args.phase !== "closed") {
    return false;
  }
  return args.entityRow === args.gatedRow;
}

export function timedTunnelMouthBlinkOn(phase: TimedTunnelPhase, nowMs: number): boolean {
  return phase === "warn" && Math.floor(nowMs / EXPIRY_BLINK_MS) % 2 === 0;
}
