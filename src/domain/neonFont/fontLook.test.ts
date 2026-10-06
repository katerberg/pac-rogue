import { describe, expect, it } from "vitest";
import { fontLineArtLook } from "./fontLook";
import { resolveTuning } from "../tuning";

describe("fontLineArtLook", () => {
  it("has no bloom with no bloom strength or radius", () => {
    expect(fontLineArtLook(resolveTuning({ fontBloom: 0 })).glow).toBeNull();
    expect(fontLineArtLook(resolveTuning({ fontBloomRadius: 0 })).glow).toBeNull();
  });

  it("reads restrained defaults", () => {
    expect(fontLineArtLook(resolveTuning({}))).toEqual({
      thickness: 0.12,
      glow: { outerStrength: 0.8, distancePx: 4 },
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
          fontThickness: 0.2,
          fontBloom: 2,
          fontBloomRadius: 8,
          fontGlowColor: 0xff0000,
          fontLetterSpacing: 0.5,
          fontHeightScale: 1.2,
          fontGlowKnockout: false,
        }),
      ),
    ).toEqual({
      thickness: 0.2,
      glow: { outerStrength: 2, distancePx: 8 },
      glowColor: 0xff0000,
      letterSpacing: 0.5,
      heightScale: 1.2,
      glowKnockout: false,
    });
  });
});
