import { describe, expect, it } from "vitest";
import {
  HAUNT_LOCK_BLINK_MS,
  HAUNT_LOCK_SIZE_MUL,
  HAUNT_LOCK_URGENCY_MS,
  hauntLockDisplaySize,
  hauntLockVisible,
} from "./hauntLock";

describe("hauntLockVisible", () => {
  it("is hidden when no haunt is running", () => {
    expect(hauntLockVisible(0, 0)).toBe(false);
  });

  it("stays solid until the last second", () => {
    expect(hauntLockVisible(HAUNT_LOCK_URGENCY_MS + 1, HAUNT_LOCK_BLINK_MS)).toBe(true);
  });

  it("never blinks for a rest-of-level haunt", () => {
    expect(hauntLockVisible(Number.POSITIVE_INFINITY, HAUNT_LOCK_BLINK_MS)).toBe(true);
  });

  it("blinks every blink period in the last second", () => {
    expect(hauntLockVisible(HAUNT_LOCK_URGENCY_MS, 0)).toBe(true);
    expect(hauntLockVisible(HAUNT_LOCK_URGENCY_MS, HAUNT_LOCK_BLINK_MS)).toBe(false);
    expect(hauntLockVisible(HAUNT_LOCK_URGENCY_MS, HAUNT_LOCK_BLINK_MS * 2)).toBe(true);
  });
});

describe("hauntLockDisplaySize", () => {
  it("scales the lock from the ghost size", () => {
    expect(hauntLockDisplaySize(20)).toBe(20 * HAUNT_LOCK_SIZE_MUL);
  });
});
