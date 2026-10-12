import { describe, expect, it } from "vitest";
import { GHOST_KIND, ghostKindLabel, type GhostKindId } from "./ghostKind";

describe("ghostKindLabel", () => {
  it("names every ghost kind in capitals", () => {
    expect(ghostKindLabel(GHOST_KIND.blinky)).toBe("BLINKY");
    expect(ghostKindLabel(GHOST_KIND.wardy)).toBe("WARDY");
    for (const kind of Object.values(GHOST_KIND) as GhostKindId[]) {
      expect(ghostKindLabel(kind)).not.toBe("");
    }
  });
});
