import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UPGRADE_ART_URLS, upgradeIconTexture } from "./upgradeArt";
import { upgradeArtTextureKey } from "../domain/upgradeArt";
import { schoolArtTextureKey } from "../domain/schoolArt";

describe("upgradeArt registry", () => {
  it("registers every PNG dropped into src/art/upgrades", () => {
    const onDisk = readdirSync(join("src", "art", "upgrades"))
      .filter((name) => name.endsWith(".png"))
      .map((name) => name.replace(/\.png$/, ""));
    expect([...UPGRADE_ART_URLS.keys()].sort()).toEqual(onDisk.sort());
  });

  it("picks art for Speed Burst and the school icon for an upgrade without art", () => {
    expect(upgradeIconTexture("powerPelletSpeedBurst")).toBe(
      upgradeArtTextureKey("powerPelletSpeedBurst"),
    );
    expect(upgradeIconTexture("passiveGhostSlow")).toBe(schoolArtTextureKey("disruption"));
  });
});
