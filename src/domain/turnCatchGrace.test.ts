import { describe, expect, it } from "vitest";
import { TURN_CATCH_GRACE_MS, tickTurnCatchGrace } from "./turnCatchGrace";

describe("turnCatchGrace", () => {
  it("ticks down and expires", () => {
    expect(tickTurnCatchGrace(TURN_CATCH_GRACE_MS, 50)).toBe(TURN_CATCH_GRACE_MS - 50);
    expect(tickTurnCatchGrace(40, 50)).toBe(0);
    expect(tickTurnCatchGrace(0, 16)).toBe(0);
  });
});
