import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { schoolArtPath, schoolArtTextureKey, schoolArtSize } from "./schoolArt";
import { UPGRADE_SCHOOL_ORDER } from "./upgrades";

describe("schoolArt", () => {
  it("maps every school to art/schools/<school>.png", () => {
    for (const school of UPGRADE_SCHOOL_ORDER) {
      expect(schoolArtPath(school)).toBe(`art/schools/${school}.png`);
    }
  });

  it("has a PNG in public/ for every school", () => {
    for (const school of UPGRADE_SCHOOL_ORDER) {
      const path = schoolArtPath(school);
      expect(existsSync(join("public", path)), path).toBe(true);
    }
  });

  it("keys textures uniquely per school", () => {
    const keys = UPGRADE_SCHOOL_ORDER.map(schoolArtTextureKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("scales the watermark in whole art pixels from the smaller card side", () => {
    expect(schoolArtSize(230, 150)).toBe(112);
    expect(schoolArtSize(340, 220)).toBe(160);
    expect(schoolArtSize(168, 190)).toBe(112);
    expect(schoolArtSize(10, 10)).toBe(16);
  });
});
