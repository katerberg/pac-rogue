import { describe, expect, it } from "vitest";
import { INTEREST_POP_DELAY_MS, INTEREST_POP_INTERVAL_MS, interestCoinsShown } from "./interest";

describe("interestCoinsShown", () => {
  it("shows nothing before the delay", () => {
    expect(interestCoinsShown({ count: 3, elapsedMs: 0 })).toBe(0);
    expect(interestCoinsShown({ count: 3, elapsedMs: INTEREST_POP_DELAY_MS - 1 })).toBe(0);
  });

  it("pops one coin per interval after the delay", () => {
    expect(interestCoinsShown({ count: 3, elapsedMs: INTEREST_POP_DELAY_MS })).toBe(1);
    const second = INTEREST_POP_DELAY_MS + INTEREST_POP_INTERVAL_MS;
    expect(interestCoinsShown({ count: 3, elapsedMs: second - 1 })).toBe(1);
    expect(interestCoinsShown({ count: 3, elapsedMs: second })).toBe(2);
  });

  it("never shows more than the payout", () => {
    expect(interestCoinsShown({ count: 3, elapsedMs: 60_000 })).toBe(3);
    expect(interestCoinsShown({ count: 0, elapsedMs: 60_000 })).toBe(0);
  });
});
