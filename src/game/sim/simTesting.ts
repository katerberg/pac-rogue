import { NO_KEYS_HELD, type HeldKeys } from "../systems/heldKeys";
import type { PlaySim } from "./playSim";
import type { SimEvent } from "./simEvents";
import { IDLE_INPUT, type SimInput } from "./simInput";

export const FRAME_MS = 1000 / 60;

export function held(direction: keyof HeldKeys): HeldKeys {
  return { ...NO_KEYS_HELD, [direction]: 0 };
}

export function runFrames(sim: PlaySim, frames: number, input: Partial<SimInput> = {}): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < frames; i += 1) {
    events.push(...sim.step({ ...IDLE_INPUT, ...input }, FRAME_MS));
  }
  return events;
}

export function runUntil(
  sim: PlaySim,
  done: () => boolean,
  maxFrames: number,
  input: Partial<SimInput> = {},
): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < maxFrames && !done(); i += 1) {
    events.push(...runFrames(sim, 1, input));
  }
  if (!done()) {
    throw new Error(`condition not reached within ${maxFrames} frames`);
  }
  return events;
}
