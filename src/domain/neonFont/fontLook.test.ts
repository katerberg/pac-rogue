import { describe, expect, it } from "vitest";
import { fontLineArtLook, sameFontLook } from "./fontLook";
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
      coreColor: null,
      glowColor: 0x7ec8ff,
      letterSpacing: 0.15,
      heightScale: 1,
      glowKnockout: true,
    });
  });

  it("compares every field", () => {
    const base = fontLineArtLook(resolveTuning({}));
    expect(sameFontLook(base, fontLineArtLook(resolveTuning({})))).toBe(true);
    for (const change of [
      { fontThickness: 0.2 },
      { fontBloom: 0 },
      { fontBloomRadius: 8 },
      { fontGlowColor: 0xff0000 },
      { fontLetterSpacing: 0.5 },
      { fontHeightScale: 1.2 },
      { fontGlowKnockout: false },
    ]) {
      expect(sameFontLook(base, fontLineArtLook(resolveTuning(change)))).toBe(false);
    }
  });
});
