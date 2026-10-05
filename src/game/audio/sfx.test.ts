import { describe, expect, it } from "vitest";
import { loadsInBackground, musicIdForContext, pelletCollectSfxId } from "./sfx";

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
