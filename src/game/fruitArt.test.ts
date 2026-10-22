import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FRUIT_ART_PIXELS, fruitArtIdOfPath } from "../domain/fruitArt";
import { FRUIT_ART_URLS, FRUIT_KINDS } from "./fruitArt";

const ART_DIR = join("src", "art", "fruit");
const artFiles = readdirSync(ART_DIR).filter((name) => !name.startsWith("."));

describe("fruitArt registry", () => {
  it("registers every PNG dropped into src/art/fruit", () => {
    const onDisk = artFiles.filter((name) => name.endsWith(".png")).map(fruitArtIdOfPath);
    expect([...FRUIT_ART_URLS.keys()].sort()).toEqual(onDisk.sort());
    expect([...FRUIT_KINDS]).toEqual(onDisk.sort());
  });

  it("only ships <kind>.png files at 16x16", () => {
    expect(FRUIT_KINDS.length).toBeGreaterThan(0);
    expect(fruitArtIdOfPath("../art/fruit/watermelon.png")).toBe("watermelon");
    for (const name of artFiles) {
      expect(name, name).toMatch(/\.png$/);
      const header = readFileSync(join(ART_DIR, name));
      expect(header.readUInt32BE(16), `${name} width`).toBe(FRUIT_ART_PIXELS);
      expect(header.readUInt32BE(20), `${name} height`).toBe(FRUIT_ART_PIXELS);
    }
  });
});
