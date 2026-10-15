import { describe, expect, it } from "vitest";
import { schoolArtPath, schoolArtTextureKey, schoolWatermarkSize } from "./schoolArt";
import { UPGRADE_SCHOOL_ORDER } from "./upgrades";

describe("schoolArt", () => {
  it("maps every school except neutral to art/schools/<school>.png", () => {
    for (const school of UPGRADE_SCHOOL_ORDER) {
      expect(schoolArtPath(school)).toBe(school === "neutral" ? null : `art/schools/${school}.png`);
    }
  });

  it("keys textures uniquely per school", () => {
    const keys = UPGRADE_SCHOOL_ORDER.map(schoolArtTextureKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("scales the watermark in whole art pixels from the smaller card side", () => {
    expect(schoolWatermarkSize(230, 150)).toBe(112);
    expect(schoolWatermarkSize(340, 220)).toBe(160);
    expect(schoolWatermarkSize(168, 190)).toBe(112);
    expect(schoolWatermarkSize(10, 10)).toBe(16);
  });
});
