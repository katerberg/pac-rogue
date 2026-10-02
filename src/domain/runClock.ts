import { advanceCountdown } from "./countdown";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export type RunClock = {
  started: boolean;
  remaining: number;
  carryMs: number;
};

export function createRunClock(tuning: Tuning = DEFAULT_TUNING): RunClock {
  return { started: false, remaining: tuning.timerMax, carryMs: 0 };
}

export function tickRunClock(
  clock: RunClock,
  hasDirectionInput: boolean,
  deltaMs: number,
  tuning: Tuning = DEFAULT_TUNING,
): RunClock {
  const started = clock.started || hasDirectionInput;
  if (!started) {
    return clock;
  }

  if (clock.remaining <= 0) {
    return { started: true, remaining: 0, carryMs: 0 };
  }

  const next = advanceCountdown(clock.remaining, clock.carryMs, deltaMs, tuning.timerTickMs);
  return { started: true, remaining: next.remaining, carryMs: next.carryMs };
}
