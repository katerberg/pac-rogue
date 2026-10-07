import { describe, expect, it } from "vitest";
import { fontLineArtLook } from "./fontLook";
import { DEFAULT_TUNING, resolveTuning } from "../tuning";

describe("fontLineArtLook", () => {
  it("has no bloom with no bloom strength or radius", () => {
    expect(fontLineArtLook(resolveTuning({ fontBloom: 0 })).glow).toBeNull();
    expect(fontLineArtLook(resolveTuning({ fontBloomRadius: 0 })).glow).toBeNull();
  });

  it("keeps neon bloom with null tuning and drops it under lined/pixel", () => {
    expect(fontLineArtLook(null, "neon").glow).toEqual({
      outerStrength: DEFAULT_TUNING.fontBloom,
      distancePx: DEFAULT_TUNING.fontBloomRadius,
    });
    expect(fontLineArtLook(null, "lined").glow).toBeNull();
    expect(fontLineArtLook(null, "pixel").glow).toBeNull();
  });

  it("ignores STYLE glow when knobs are on", () => {
    expect(
      fontLineArtLook(resolveTuning({ fontBloom: 3, fontBloomRadius: 9 }), "lined").glow,
    ).toEqual({ outerStrength: 3, distancePx: 9 });
  });

  it("reads neon defaults", () => {
    expect(fontLineArtLook(null, "neon")).toEqual({
      thickness: 0.4,
      glow: { outerStrength: 2.4, distancePx: 12 },
      glowColor: 0x7ec8ff,
      letterSpacing: 0,
      heightScale: 1,
      glowKnockout: true,
    });
  });

  it("picks up knob overrides", () => {
    expect(
      fontLineArtLook(
        resolveTuning({
          fontThickness: 0.8,
          fontBloom: 2,
          fontBloomRadius: 8,
          fontGlowColor: 0xff0000,
          fontLetterSpacing: 0.5,
          fontHeightScale: 1.2,
          fontGlowKnockout: false,
        }),
      ),
    ).toEqual({
      thickness: 0.8,
      glow: { outerStrength: 2, distancePx: 8 },
      glowColor: 0xff0000,
      letterSpacing: 0.5,
      heightScale: 1.2,
      glowKnockout: false,
    });
  });
});
