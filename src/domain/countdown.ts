import { DEFAULT_TUNING } from "./tuning";

export const COUNTDOWN_START = DEFAULT_TUNING.timerMax;
export const COUNTDOWN_TICK_MS = DEFAULT_TUNING.timerTickMs;

export type CountdownState = {
  remaining: number;
  carryMs: number;
};

export function advanceCountdown(
  remaining: number,
  carryMs: number,
  deltaMs: number,
  tickMs: number = COUNTDOWN_TICK_MS,
): CountdownState {
  if (remaining <= 0) {
    return { remaining: 0, carryMs: 0 };
  }

  const totalMs = Math.max(0, carryMs) + Math.max(0, deltaMs);
  const ticks = Math.floor(totalMs / tickMs);
  const nextCarry = totalMs % tickMs;
  const nextRemaining = Math.max(0, remaining - ticks);

  if (nextRemaining === 0) {
    return { remaining: 0, carryMs: 0 };
  }

  return { remaining: nextRemaining, carryMs: nextCarry };
}
