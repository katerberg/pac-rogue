import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadsInBackground,
  musicDownloadInFlight,
  musicIdForContext,
  pelletCollectSfxId,
} from "./sfx";

const requirePhaser = createRequire(import.meta.url);
const LOADER = requirePhaser(
  join(dirname(requirePhaser.resolve("phaser/package.json")), "src/loader/const.js"),
) as Record<string, number>;

describe("pelletCollectSfxId", () => {
  it("uses munch for non-multiples of 2", () => {
    expect(pelletCollectSfxId(1)).toBe("pelletMunch");
    expect(pelletCollectSfxId(3)).toBe("pelletMunch");
    expect(pelletCollectSfxId(5)).toBe("pelletMunch");
    expect(pelletCollectSfxId(7)).toBe("pelletMunch");
  });

  it("uses pickup2 every other pellet", () => {
    expect(pelletCollectSfxId(2)).toBe("pelletMunch2");
    expect(pelletCollectSfxId(4)).toBe("pelletMunch2");
    expect(pelletCollectSfxId(6)).toBe("pelletMunch2");
  });

  it("treats non-positive pickup numbers as munch", () => {
    expect(pelletCollectSfxId(0)).toBe("pelletMunch");
    expect(pelletCollectSfxId(-3)).toBe("pelletMunch");
  });
});

describe("musicIdForContext", () => {
  it("resolves to gameplay music from the pause menu, menu music otherwise", () => {
    expect(musicIdForContext("PauseScene")).toBe("gameplayMusic");
    expect(musicIdForContext("MenuScene")).toBe("menuMusic");
    expect(musicIdForContext("HighScoresScene")).toBe("menuMusic");
  });
});

describe("loadsInBackground", () => {
  it("defers music so scenes start without waiting on it", () => {
    expect(loadsInBackground("menuMusic")).toBe(true);
    expect(loadsInBackground("storeMusic")).toBe(true);
    expect(loadsInBackground("gameplayMusic")).toBe(true);
  });

  it("preloads sound effects so they are ready when they fire", () => {
    expect(loadsInBackground("pelletMunch")).toBe(false);
    expect(loadsInBackground("death")).toBe(false);
    expect(loadsInBackground("levelComplete")).toBe(false);
  });
});

describe("musicDownloadInFlight", () => {
  it("treats a file another scene is still downloading or decoding as in flight", () => {
    expect(musicDownloadInFlight(LOADER.FILE_LOADING)).toBe(true);
    expect(musicDownloadInFlight(LOADER.FILE_LOADED)).toBe(true);
    expect(musicDownloadInFlight(LOADER.FILE_PROCESSING)).toBe(true);
  });

  it("starts a new download when none was requested or the last one ended", () => {
    expect(musicDownloadInFlight(undefined)).toBe(false);
    expect(musicDownloadInFlight(LOADER.FILE_PENDING)).toBe(false);
    expect(musicDownloadInFlight(LOADER.FILE_FAILED)).toBe(false);
    expect(musicDownloadInFlight(LOADER.FILE_ERRORED)).toBe(false);
    expect(musicDownloadInFlight(LOADER.FILE_COMPLETE)).toBe(false);
    expect(musicDownloadInFlight(LOADER.FILE_DESTROYED)).toBe(false);
  });
});
