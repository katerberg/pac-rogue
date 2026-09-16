import { describe, expect, it } from "vitest";
import { BLINKY_SCATTER_COL, BLINKY_SCATTER_ROW, blinkyTarget, GHOST_PHASE } from "./ghostTarget";
import { GHOST_AI_MODE } from "./ghostMode";
import { GHOST_HOUSE_EXIT_COL, GHOST_HOUSE_EXIT_ROW } from "./maze";

describe("ghostTarget", () => {
  it("targets the house exit while leaving", () => {
    expect(
      blinkyTarget({
        phase: GHOST_PHASE.leaving,
        mode: GHOST_AI_MODE.scatter,
        pelletsRemaining: 100,
        playerCol: 10,
        playerRow: 20,
      }),
    ).toEqual({ col: GHOST_HOUSE_EXIT_COL, row: GHOST_HOUSE_EXIT_ROW });
  });

  it("uses the scatter corner when not Elroy", () => {
    expect(
      blinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.scatter,
        pelletsRemaining: 50,
        playerCol: 10,
        playerRow: 20,
      }),
    ).toEqual({ col: BLINKY_SCATTER_COL, row: BLINKY_SCATTER_ROW });
  });

  it("targets the player in chase and during Elroy scatter", () => {
    expect(
      blinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        pelletsRemaining: 50,
        playerCol: 10,
        playerRow: 20,
      }),
    ).toEqual({ col: 10, row: 20 });

    expect(
      blinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.scatter,
        pelletsRemaining: 20,
        playerCol: 9,
        playerRow: 8,
      }),
    ).toEqual({ col: 9, row: 8 });
  });
});
