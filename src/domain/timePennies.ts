const PENNY_TIME_SQUARE_DIVISOR = 2250;
export const TIME_PENNY_DRAIN_MS = 1200;

export type TimePennyDrain = { startUnits: number; elapsedMs: number; creditedPoints: number };

export type TimeBonusTick = {
  drain: TimePennyDrain;
  remaining: number;
  points: number;
  done: boolean;
};

export function timePennyCharge(remaining: number): number {
  const units = Math.max(0, remaining);
  return Math.floor((units * units) / PENNY_TIME_SQUARE_DIVISOR);
}

export function createTimePennyDrain(remaining: number): TimePennyDrain | null {
  return remaining > 0 ? { startUnits: remaining, elapsedMs: 0, creditedPoints: 0 } : null;
}

export function tickTimePennyDrain(drain: TimePennyDrain, deltaMs: number): TimeBonusTick {
  const elapsedMs = drain.elapsedMs + Math.max(0, deltaMs);
  const drained =
    elapsedMs >= TIME_PENNY_DRAIN_MS
      ? drain.startUnits
      : Math.floor((drain.startUnits * elapsedMs) / TIME_PENNY_DRAIN_MS);
  const remaining = drain.startUnits - drained;
  const earned = timePennyCharge(drain.startUnits) - timePennyCharge(remaining);
  return {
    drain: { ...drain, elapsedMs, creditedPoints: earned },
    remaining,
    points: earned - drain.creditedPoints,
    done: remaining === 0,
  };
}
