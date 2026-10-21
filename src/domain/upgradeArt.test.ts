import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { schoolArtTextureKey } from "./schoolArt";
import {
  UPGRADE_ART_PIXELS,
  upgradeArtIdOfPath,
  upgradeArtTextureKey,
  upgradeIconTextureKey,
} from "./upgradeArt";
import { ALL_UPGRADE_IDS, enhancedIdOf, getUpgradeDef } from "./upgrades";

const ART_DIR = join("src", "art", "upgrades");
const artFiles = readdirSync(ART_DIR).filter((name) => !name.startsWith("."));

describe("upgradeArt", () => {
  it("only ships <baseUpgradeId>.png files at 48x48", () => {
    const baseIds = new Set<string>(ALL_UPGRADE_IDS);
    for (const name of artFiles) {
      expect(name, name).toMatch(/\.png$/);
      expect(baseIds.has(upgradeArtIdOfPath(name)), `${name} is not a base upgrade id`).toBe(true);
      const header = readFileSync(join(ART_DIR, name));
      expect(header.readUInt32BE(16), `${name} width`).toBe(UPGRADE_ART_PIXELS);
      expect(header.readUInt32BE(20), `${name} height`).toBe(UPGRADE_ART_PIXELS);
    }
  });

  it("derives the art id from a glob path", () => {
    expect(upgradeArtIdOfPath("../art/upgrades/powerPelletSpeedBurst.png")).toBe(
      "powerPelletSpeedBurst",
    );
  });

  it("uses upgrade art when present, shared by the enhanced form", () => {
    const art = new Set(["powerPelletSpeedBurst"]);
    const key = upgradeArtTextureKey("powerPelletSpeedBurst");
    expect(upgradeIconTextureKey("powerPelletSpeedBurst", art)).toBe(key);
    expect(upgradeIconTextureKey(enhancedIdOf("powerPelletSpeedBurst"), art)).toBe(key);
  });

  it("falls back to the school icon for upgrades without art", () => {
    const art = new Set(["powerPelletSpeedBurst"]);
    for (const id of ALL_UPGRADE_IDS.filter((id) => id !== "powerPelletSpeedBurst")) {
      expect(upgradeIconTextureKey(id, art)).toBe(schoolArtTextureKey(getUpgradeDef(id).school));
    }
    expect(upgradeIconTextureKey("powerPelletSpeedBurst", new Set())).toBe(
      schoolArtTextureKey("speed"),
    );
  });
});
