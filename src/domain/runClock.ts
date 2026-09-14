import { advanceCountdown, COUNTDOWN_START } from "./countdown";

export type RunClock = {
  started: boolean;
  remaining: number;
  carryMs: number;
};

export function createRunClock(): RunClock {
  return { started: false, remaining: COUNTDOWN_START, carryMs: 0 };
}

export function tickRunClock(
  clock: RunClock,
  hasDirectionInput: boolean,
  deltaMs: number,
): RunClock {
  const started = clock.started || hasDirectionInput;
  if (!started) {
    return clock;
  }

  if (clock.remaining <= 0) {
    return { started: true, remaining: 0, carryMs: 0 };
  }

  const next = advanceCountdown(clock.remaining, clock.carryMs, deltaMs);
  return { started: true, remaining: next.remaining, carryMs: next.carryMs };
}
