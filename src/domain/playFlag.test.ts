import { describe, expect, it } from "vitest";
import { bootSceneKey, shouldAutoPlay } from "./playFlag";

describe("shouldAutoPlay", () => {
  it("is true only for play=1", () => {
    expect(shouldAutoPlay(new URLSearchParams("play=1"))).toBe(true);
    expect(shouldAutoPlay(new URLSearchParams("play=true"))).toBe(false);
    expect(shouldAutoPlay(new URLSearchParams("play=0"))).toBe(false);
    expect(shouldAutoPlay(new URLSearchParams())).toBe(false);
  });
});

describe("bootSceneKey", () => {
  it("lets play beat learnAll, and learnAll beat the menu", () => {
    expect(bootSceneKey(new URLSearchParams("play=1&learnAll=1"))).toBe("PlayScene");
    expect(bootSceneKey(new URLSearchParams("learnAll=1"))).toBe("LearnScene");
    expect(bootSceneKey(new URLSearchParams("learnAll=0"))).toBe("LearnScene");
    expect(bootSceneKey(new URLSearchParams("learnAll=yes"))).toBe("MenuScene");
    expect(bootSceneKey(new URLSearchParams("play=0&learnAll=1"))).toBe("LearnScene");
    expect(bootSceneKey(new URLSearchParams())).toBe("MenuScene");
  });
});
