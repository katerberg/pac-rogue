import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UPGRADE_ART_URLS } from "./upgradeArt";

describe("upgradeArt registry", () => {
  it("registers every PNG dropped into src/art/upgrades", () => {
    const onDisk = readdirSync(join("src", "art", "upgrades"))
      .filter((name) => name.endsWith(".png"))
      .map((name) => name.replace(/\.png$/, ""));
    expect([...UPGRADE_ART_URLS.keys()].sort()).toEqual(onDisk.sort());
  });
});
