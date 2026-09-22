import { describe, expect, it } from "vitest";
import {
  createKeyRepeatState,
  KEY_REPEAT_INITIAL_DELAY_MS,
  KEY_REPEAT_INTERVAL_MS,
  tickKeyRepeat,
} from "./keyRepeat";

describe("tickKeyRepeat", () => {
  it("fires immediately on a fresh press", () => {
    const result = tickKeyRepeat(createKeyRepeatState(), true, true, 16);
    expect(result.fire).toBe(true);
    expect(result.state.remainingMs).toBe(KEY_REPEAT_INITIAL_DELAY_MS);
  });

  it("does not fire again while still within the initial delay", () => {
    const first = tickKeyRepeat(createKeyRepeatState(), true, true, 16);
    const second = tickKeyRepeat(first.state, true, false, KEY_REPEAT_INITIAL_DELAY_MS - 1);
    expect(second.fire).toBe(false);
    expect(second.state.remainingMs).toBe(1);
  });

  it("fires again once the initial delay elapses, then resets to the shorter interval", () => {
    const first = tickKeyRepeat(createKeyRepeatState(), true, true, 16);
    const second = tickKeyRepeat(first.state, true, false, KEY_REPEAT_INITIAL_DELAY_MS);
    expect(second.fire).toBe(true);
    expect(second.state.remainingMs).toBe(KEY_REPEAT_INTERVAL_MS);
  });

  it("keeps repeating at the shorter interval while held", () => {
    const afterInitial = tickKeyRepeat(
      tickKeyRepeat(createKeyRepeatState(), true, true, 16).state,
      true,
      false,
      KEY_REPEAT_INITIAL_DELAY_MS,
    );
    const third = tickKeyRepeat(afterInitial.state, true, false, KEY_REPEAT_INTERVAL_MS - 1);
    expect(third.fire).toBe(false);
    const fourth = tickKeyRepeat(third.state, true, false, 1);
    expect(fourth.fire).toBe(true);
  });

  it("a quick separate tap fires immediately without waiting on any leftover timer", () => {
    const tap1 = tickKeyRepeat(createKeyRepeatState(), true, true, 16);
    const released = tickKeyRepeat(tap1.state, false, false, 16);
    const tap2 = tickKeyRepeat(released.state, true, true, 16);
    expect(tap2.fire).toBe(true);
  });

  it("resets to idle as soon as the key is released", () => {
    const held = tickKeyRepeat(createKeyRepeatState(), true, true, 16);
    const released = tickKeyRepeat(held.state, false, false, 16);
    expect(released.fire).toBe(false);
    expect(released.state).toEqual(createKeyRepeatState());
  });
});
