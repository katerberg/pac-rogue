import { describe, expect, it } from "vitest";
import {
  TURN_CATCH_GRACE_MS,
  startTurnCatchGrace,
  tickTurnCatchGrace,
  turnCatchGraceActive,
} from "./turnCatchGrace";

describe("turnCatchGrace", () => {
  it("starts at the full grace window and refreshes when already active", () => {
    expect(startTurnCatchGrace()).toBe(TURN_CATCH_GRACE_MS);
    expect(startTurnCatchGrace(50)).toBe(TURN_CATCH_GRACE_MS);
    expect(startTurnCatchGrace(TURN_CATCH_GRACE_MS + 10)).toBe(TURN_CATCH_GRACE_MS + 10);
  });

  it("ticks down and expires", () => {
    expect(tickTurnCatchGrace(TURN_CATCH_GRACE_MS, 50)).toBe(TURN_CATCH_GRACE_MS - 50);
    expect(tickTurnCatchGrace(40, 50)).toBe(0);
    expect(tickTurnCatchGrace(0, 16)).toBe(0);
  });

  it("reports active only while remaining", () => {
    expect(turnCatchGraceActive(1)).toBe(true);
    expect(turnCatchGraceActive(0)).toBe(false);
  });
});
