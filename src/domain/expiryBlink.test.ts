import { describe, expect, it } from "vitest";
import { EXPIRY_BLINK_MS, EXPIRY_URGENCY_MS, expiryTintOn } from "./expiryBlink";

describe("expiryTintOn", () => {
  it("is off once the effect has ended", () => {
    expect(expiryTintOn(0, 0)).toBe(false);
  });

  it("holds steady while more than the urgency window remains", () => {
    expect(expiryTintOn(EXPIRY_URGENCY_MS + 1, 0)).toBe(true);
    expect(expiryTintOn(EXPIRY_URGENCY_MS + 1, EXPIRY_BLINK_MS)).toBe(true);
  });

  it("blinks during the final urgency window", () => {
    expect(expiryTintOn(EXPIRY_URGENCY_MS, 0)).toBe(true);
    expect(expiryTintOn(EXPIRY_URGENCY_MS, EXPIRY_BLINK_MS)).toBe(false);
    expect(expiryTintOn(1, 2 * EXPIRY_BLINK_MS)).toBe(true);
  });
});
