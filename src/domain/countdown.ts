export const COUNTDOWN_START = 999;
export const COUNTDOWN_TICK_MS = 100;

export type CountdownState = {
  remaining: number;
  carryMs: number;
};

export function advanceCountdown(
  remaining: number,
  carryMs: number,
  deltaMs: number,
): CountdownState {
  if (remaining <= 0) {
    return { remaining: 0, carryMs: 0 };
  }

  const totalMs = Math.max(0, carryMs) + Math.max(0, deltaMs);
  const ticks = Math.floor(totalMs / COUNTDOWN_TICK_MS);
  const nextCarry = totalMs % COUNTDOWN_TICK_MS;
  const nextRemaining = Math.max(0, remaining - ticks);

  if (nextRemaining === 0) {
    return { remaining: 0, carryMs: 0 };
  }

  return { remaining: nextRemaining, carryMs: nextCarry };
}
