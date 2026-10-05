import { describe, expect, it } from "vitest";
import { ghostArtStyle, ghostLineArtLook, sameGhostLineArtLook } from "./ghostArt";
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

describe("ghostLineArtLook", () => {
  it("has no glow with no glow strength or radius", () => {
    expect(ghostLineArtLook(resolveTuning({ ghostGlow: 0 })).glow).toBeNull();
    expect(ghostLineArtLook(resolveTuning({ ghostGlowRadius: 0 })).glow).toBeNull();
  });

  it("reads glow, line thickness and width from the knobs", () => {
    expect(
      ghostLineArtLook(
        resolveTuning({
          ghostGlow: 2,
          ghostGlowRadius: 8,
          ghostLineWidth: 9,
          ghostWidth: 1.1,
          ghostHeight: 0.9,
        }),
      ),
    ).toEqual({
      glow: { outerStrength: 2, distancePx: 8 },
      lineWidth: 0.09,
      widthScale: 1.1,
      heightScale: 0.9,
    });
  });

  it("defaults to a soft glow, a 4.5% line and pixel-ghost width", () => {
    expect(ghostLineArtLook(resolveTuning({}))).toEqual({
      glow: { outerStrength: 1.2, distancePx: 6 },
      lineWidth: 0.045,
      widthScale: 1.24,
      heightScale: 1,
    });
  });

  it("compares every field", () => {
    const base = ghostLineArtLook(resolveTuning({}));
    expect(sameGhostLineArtLook(base, ghostLineArtLook(resolveTuning({})))).toBe(true);
    for (const change of [
      { ghostGlow: 0 },
      { ghostGlowRadius: 7 },
      { ghostLineWidth: 6 },
      { ghostWidth: 1 },
      { ghostHeight: 1.2 },
    ]) {
      expect(sameGhostLineArtLook(base, ghostLineArtLook(resolveTuning(change)))).toBe(false);
    }
  });
});
