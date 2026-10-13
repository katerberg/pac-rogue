import { describe, expect, it } from "vitest";
import { GHOST_KIND, GHOST_SCHOOL, ghostKindLabel, type GhostKindId } from "./ghostKind";
import { UPGRADE_SCHOOL_ORDER } from "./upgrades";

describe("GHOST_SCHOOL", () => {
  it("maps every ghost to its own school, covering every non-neutral school", () => {
    const kinds = Object.values(GHOST_KIND) as GhostKindId[];
    const schools = kinds.map((kind) => GHOST_SCHOOL[kind]);
    expect(new Set(schools).size).toBe(kinds.length);
    expect([...schools].sort()).toEqual(UPGRADE_SCHOOL_ORDER.filter((s) => s !== "neutral").sort());
    expect(GHOST_SCHOOL[GHOST_KIND.pinky]).toBe("automation");
  });
});

describe("ghostKindLabel", () => {
  it("names every ghost kind in capitals", () => {
    expect(ghostKindLabel(GHOST_KIND.blinky)).toBe("BLINKY");
    expect(ghostKindLabel(GHOST_KIND.wardy)).toBe("WARDY");
    for (const kind of Object.values(GHOST_KIND) as GhostKindId[]) {
      expect(ghostKindLabel(kind)).not.toBe("");
    }
  });
});
