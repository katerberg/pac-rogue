import { EXPIRY_BLINK_MS } from "./expiryBlink";

export const TIMED_TUNNEL_OPEN_MS = 6000;
export const TIMED_TUNNEL_WARN_MS = 1500;
export const TIMED_TUNNEL_CLOSED_MS = 2500;
export const TIMED_TUNNEL_CYCLE_MS = TIMED_TUNNEL_OPEN_MS + TIMED_TUNNEL_CLOSED_MS;

export type TimedTunnelPhase = "open" | "warn" | "closed";

export type TimedTunnelRenderState = {
  row: number;
  phase: TimedTunnelPhase;
  gateVisible: boolean;
};

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
  return rows[Math.floor(nextRandom() * rows.length)]!;
}

export function timedTunnelMouthBlinkOn(phase: TimedTunnelPhase, nowMs: number): boolean {
  return phase === "warn" && Math.floor(nowMs / EXPIRY_BLINK_MS) % 2 === 0;
}

export function timedTunnelGateVisible(phase: TimedTunnelPhase, nowMs: number): boolean {
  return phase === "closed" || timedTunnelMouthBlinkOn(phase, nowMs);
}
