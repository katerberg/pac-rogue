const BONUS_TIME_SQUARE_DIVISOR = 2250;
export const TIME_BONUS_DRAIN_MS = 1200;

export type TimeBonusDrain = { startUnits: number; elapsedMs: number; creditedPoints: number };

export type TimeBonusTick = {
  drain: TimeBonusDrain;
  remaining: number;
  points: number;
  done: boolean;
};

export function timeBonusPoints(remaining: number): number {
  const units = Math.max(0, remaining);
  return Math.floor((units * units) / BONUS_TIME_SQUARE_DIVISOR);
}

export function createTimeBonusDrain(remaining: number): TimeBonusDrain | null {
  return remaining > 0 ? { startUnits: remaining, elapsedMs: 0, creditedPoints: 0 } : null;
}

export function tickTimeBonusDrain(drain: TimeBonusDrain, deltaMs: number): TimeBonusTick {
  const elapsedMs = drain.elapsedMs + Math.max(0, deltaMs);
  const drained =
    elapsedMs >= TIME_BONUS_DRAIN_MS
      ? drain.startUnits
      : Math.floor((drain.startUnits * elapsedMs) / TIME_BONUS_DRAIN_MS);
  const earned = timeBonusPoints(drain.startUnits) - timeBonusPoints(drain.startUnits - drained);
  return {
    drain: { ...drain, elapsedMs, creditedPoints: earned },
    remaining: drain.startUnits - drained,
    points: earned - drain.creditedPoints,
    done: drained === drain.startUnits,
  };
}
