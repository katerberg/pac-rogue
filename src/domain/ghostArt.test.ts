import { describe, expect, it } from "vitest";
import {
  DEFAULT_GHOST_STYLE,
  ghostLineArtLook,
  lineArtDrawableIds,
  lineArtGhostKinds,
  lineArtPlayer,
  parseGhostStyle,
  playerLineArtLook,
  sameGhostLineArtLook,
  textStyleFor,
} from "./ghostArt";
import { BLINKY_DRAWABLE_ID, CLYDE_DRAWABLE_ID, PLAYER_DRAWABLE_ID } from "./playfield";
import { resolveTuning } from "./tuning";
import { GHOST_KIND } from "./ghostKind";

describe("parseGhostStyle", () => {
  it("reads a stored style and defaults to neon", () => {
    expect(parseGhostStyle("pixel")).toBe("pixel");
    expect(parseGhostStyle("neon")).toBe("neon");
    expect(parseGhostStyle(null)).toBe(DEFAULT_GHOST_STYLE);
    expect(parseGhostStyle("sparkly")).toBe("neon");
  });
});

describe("textStyleFor", () => {
  it("maps STYLE to the matching typeface", () => {
    expect(textStyleFor("neon")).toBe("neon");
    expect(textStyleFor("pixel")).toBe("pixel");
  });
});

describe("lineArtGhostKinds", () => {
  it("draws every present ghost kind as line art when neon, once each", () => {
    expect(
      lineArtGhostKinds("neon", [GHOST_KIND.blinky, GHOST_KIND.blinky, GHOST_KIND.clyde]),
    ).toEqual([GHOST_KIND.blinky, GHOST_KIND.clyde]);
  });

  it("draws none as line art when pixel", () => {
    expect(lineArtGhostKinds("pixel", [GHOST_KIND.blinky, GHOST_KIND.clyde])).toEqual([]);
  });
});

describe("lineArtDrawableIds", () => {
  it("draws Dot-Man and every present ghost as line art when neon", () => {
    expect(lineArtPlayer("neon")).toBe(true);
    expect(lineArtDrawableIds("neon", [GHOST_KIND.blinky, GHOST_KIND.clyde])).toEqual([
      PLAYER_DRAWABLE_ID,
      BLINKY_DRAWABLE_ID,
      CLYDE_DRAWABLE_ID,
    ]);
  });

  it("draws nothing as line art when pixel", () => {
    expect(lineArtPlayer("pixel")).toBe(false);
    expect(lineArtDrawableIds("pixel", [GHOST_KIND.blinky])).toEqual([]);
  });
});

describe("playerLineArtLook", () => {
  it("keeps the ghost glow but its own line width and no stretch", () => {
    const ghost = ghostLineArtLook(
      resolveTuning({ ghostGlow: 3, ghostLineWidth: 12, ghostWidth: 1.4, ghostHeight: 0.8 }),
    );
    expect(playerLineArtLook(ghost)).toEqual({
      glow: ghost.glow,
      lineWidth: 0.065,
      widthScale: 1,
      heightScale: 1,
    });
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
