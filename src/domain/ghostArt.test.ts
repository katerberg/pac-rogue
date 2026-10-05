import { describe, expect, it } from "vitest";
import { ghostArtStyle, ghostGlowFilter } from "./ghostArt";
import { resolveTuning } from "./tuning";
import { GHOST_KIND } from "./ghostKind";

describe("ghostArtStyle", () => {
  it("draws Clyde as line art on levels 5-8 only", () => {
    for (const level of [1, 4, 9]) {
      expect(ghostArtStyle(GHOST_KIND.clyde, level)).toBe("pixel");
    }
    for (const level of [5, 6, 7, 8]) {
      expect(ghostArtStyle(GHOST_KIND.clyde, level)).toBe("line");
    }
  });

  it("keeps the other ghosts pixel art", () => {
    for (const kind of [GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky]) {
      for (const level of [5, 6, 7, 8]) {
        expect(ghostArtStyle(kind, level)).toBe("pixel");
      }
    }
  });
});

describe("ghostGlowFilter", () => {
  it("is null with no glow strength or radius", () => {
    expect(ghostGlowFilter(resolveTuning({ ghostGlow: 0 }))).toBeNull();
    expect(ghostGlowFilter(resolveTuning({ ghostGlowRadius: 0 }))).toBeNull();
  });

  it("uses the knob strength and radius, glowing softly by default", () => {
    expect(ghostGlowFilter(resolveTuning({ ghostGlow: 2, ghostGlowRadius: 8 }))).toEqual({
      outerStrength: 2,
      distancePx: 8,
    });
    expect(ghostGlowFilter(resolveTuning({}))).toEqual({ outerStrength: 1.2, distancePx: 6 });
  });
});
