import { describe, expect, it } from "vitest";
import { TURN_CATCH_GRACE_MS, tickTurnCatchGrace } from "./turnCatchGrace";

describe("turnCatchGrace", () => {
  it("is shorter than a tile of travel so you cannot phase through a ghost on a turn", () => {
    // At default player speed (~7.315 tiles/s), this is well under half a tile.
    expect(TURN_CATCH_GRACE_MS).toBeLessThan(100);
  });

  it("ticks down and expires", () => {
    expect(tickTurnCatchGrace(TURN_CATCH_GRACE_MS, 16)).toBe(TURN_CATCH_GRACE_MS - 16);
    expect(tickTurnCatchGrace(40, 50)).toBe(0);
    expect(tickTurnCatchGrace(0, 16)).toBe(0);
  });
});
