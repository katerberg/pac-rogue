import { describe, expect, it } from "vitest";
import {
  DEFAULT_GHOST_STYLE,
  ghostLineArtLook,
  lineArtDrawableIds,
  lineArtGhostKinds,
  lineArtPlayer,
  lineArtQuarter,
  parseGhostStyle,
  playerLineArtLook,
  quarterLineArtLook,
  sameGhostLineArtLook,
  learnCheckboxLook,
  styleUsesGlow,
  textStyleFor,
} from "./ghostArt";
import { BLINKY_DRAWABLE_ID, CLYDE_DRAWABLE_ID, PLAYER_DRAWABLE_ID } from "./playfield";
import { resolveTuning } from "./tuning";
import { GHOST_KIND } from "./ghostKind";

describe("parseGhostStyle", () => {
  it("reads a stored style and defaults to pixel", () => {
    expect(parseGhostStyle("pixel")).toBe("pixel");
    expect(parseGhostStyle("neon")).toBe("neon");
    expect(parseGhostStyle("lined")).toBe("lined");
    expect(parseGhostStyle(null)).toBe(DEFAULT_GHOST_STYLE);
    expect(parseGhostStyle("sparkly")).toBe(DEFAULT_GHOST_STYLE);
    expect(DEFAULT_GHOST_STYLE).toBe("pixel");
  });
});

describe("styleUsesGlow", () => {
  it("is only neon", () => {
    expect(styleUsesGlow("neon")).toBe(true);
    expect(styleUsesGlow("lined")).toBe(false);
    expect(styleUsesGlow("pixel")).toBe(false);
  });
});

describe("textStyleFor", () => {
  it("maps STYLE to the matching typeface", () => {
    expect(textStyleFor("neon")).toBe("neon");
    expect(textStyleFor("lined")).toBe("neon");
    expect(textStyleFor("pixel")).toBe("pixel");
  });
});

describe("learnCheckboxLook", () => {
  it("uses a thin circle under neon and lined", () => {
    expect(learnCheckboxLook("neon")).toEqual({ shape: "circle", strokeWidth: 1 });
    expect(learnCheckboxLook("lined")).toEqual({ shape: "circle", strokeWidth: 1 });
  });

  it("keeps the square box under pixel", () => {
    expect(learnCheckboxLook("pixel")).toEqual({ shape: "square", strokeWidth: 2 });
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

describe("lineArtDrawableIds", () => {
  it("draws Dot-Man and every present ghost as line art when neon", () => {
    expect(lineArtPlayer("neon")).toBe(true);
    expect(lineArtDrawableIds("neon", [GHOST_KIND.blinky, GHOST_KIND.clyde])).toEqual([
      PLAYER_DRAWABLE_ID,
      BLINKY_DRAWABLE_ID,
      CLYDE_DRAWABLE_ID,
    ]);
  });

  it("keeps Dot-Man as line art when lined", () => {
    expect(lineArtDrawableIds("lined", [GHOST_KIND.blinky])).toEqual([
      PLAYER_DRAWABLE_ID,
      BLINKY_DRAWABLE_ID,
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

describe("lineArtQuarter", () => {
  it("uses line art under neon and lined, not pixel", () => {
    expect(lineArtQuarter("neon")).toBe(true);
    expect(lineArtQuarter("lined")).toBe(true);
    expect(lineArtQuarter("pixel")).toBe(false);
  });
});

describe("quarterLineArtLook", () => {
  it("reads glow and line thickness from the quarter knobs", () => {
    expect(
      quarterLineArtLook(
        resolveTuning({
          quarterGlow: 2.5,
          quarterGlowRadius: 10,
          quarterLineWidth: 8,
        }),
      ),
    ).toEqual({
      glow: { outerStrength: 2.5, distancePx: 10 },
      lineWidth: 0.08,
      widthScale: 1,
      heightScale: 1,
    });
  });

  it("keeps neon glow with null tuning and drops it under lined", () => {
    expect(quarterLineArtLook(null, "neon").glow).toEqual({
      outerStrength: 0.6,
      distancePx: 5,
    });
    expect(quarterLineArtLook(null, "neon").lineWidth).toBe(0.06);
    expect(quarterLineArtLook(null, "lined").glow).toBeNull();
    expect(quarterLineArtLook(null, "lined").lineWidth).toBe(
      quarterLineArtLook(null, "neon").lineWidth,
    );
  });

  it("ignores STYLE glow when knobs are on", () => {
    expect(
      quarterLineArtLook(resolveTuning({ quarterGlow: 3, quarterGlowRadius: 9 }), "lined").glow,
    ).toEqual({ outerStrength: 3, distancePx: 9 });
  });

  it("has no glow with no glow strength or radius", () => {
    expect(quarterLineArtLook(resolveTuning({ quarterGlow: 0 })).glow).toBeNull();
    expect(quarterLineArtLook(resolveTuning({ quarterGlowRadius: 0 })).glow).toBeNull();
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
