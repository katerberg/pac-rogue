import { describe, expect, it } from "vitest";
import {
  DEFAULT_GHOST_STYLE,
  ghostLineArtLook,
  lineArtGhostKinds,
  parseGhostStyle,
  sameGhostLineArtLook,
  styleUsesGlow,
} from "./ghostArt";
import { resolveTuning } from "./tuning";
import { GHOST_KIND } from "./ghostKind";

describe("parseGhostStyle", () => {
  it("reads a stored style and defaults to neon", () => {
    expect(parseGhostStyle("pixel")).toBe("pixel");
    expect(parseGhostStyle("neon")).toBe("neon");
    expect(parseGhostStyle("lined")).toBe("lined");
    expect(parseGhostStyle(null)).toBe(DEFAULT_GHOST_STYLE);
    expect(parseGhostStyle("sparkly")).toBe("neon");
  });
});

describe("styleUsesGlow", () => {
  it("is only neon", () => {
    expect(styleUsesGlow("neon")).toBe(true);
    expect(styleUsesGlow("lined")).toBe(false);
    expect(styleUsesGlow("pixel")).toBe(false);
  });
});

describe("lineArtGhostKinds", () => {
  it("draws every present ghost kind as line art when neon, once each", () => {
    expect(
      lineArtGhostKinds("neon", [GHOST_KIND.blinky, GHOST_KIND.blinky, GHOST_KIND.clyde]),
    ).toEqual([GHOST_KIND.blinky, GHOST_KIND.clyde]);
  });

  it("draws line art under lined the same as neon", () => {
    expect(lineArtGhostKinds("lined", [GHOST_KIND.blinky, GHOST_KIND.inky])).toEqual([
      GHOST_KIND.blinky,
      GHOST_KIND.inky,
    ]);
  });

  it("draws none as line art when pixel", () => {
    expect(lineArtGhostKinds("pixel", [GHOST_KIND.blinky, GHOST_KIND.clyde])).toEqual([]);
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

  it("defaults to the tuned soft glow, 6.5% line and stretch", () => {
    expect(ghostLineArtLook(resolveTuning({}))).toEqual({
      glow: { outerStrength: 1.6, distancePx: 6 },
      lineWidth: 0.065,
      widthScale: 1.16,
      heightScale: 1.14,
    });
  });

  it("keeps neon glow with null tuning and drops it under lined", () => {
    expect(ghostLineArtLook(null, "neon").glow).toEqual({
      outerStrength: 1.6,
      distancePx: 6,
    });
    expect(ghostLineArtLook(null, "lined").glow).toBeNull();
    expect(ghostLineArtLook(null, "lined").lineWidth).toBe(
      ghostLineArtLook(null, "neon").lineWidth,
    );
  });

  it("ignores STYLE glow when knobs are on", () => {
    expect(
      ghostLineArtLook(resolveTuning({ ghostGlow: 3, ghostGlowRadius: 9 }), "lined").glow,
    ).toEqual({ outerStrength: 3, distancePx: 9 });
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
