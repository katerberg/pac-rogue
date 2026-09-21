import { describe, expect, it } from "vitest";
import { shouldAutoPlay } from "./playFlag";

describe("shouldAutoPlay", () => {
  it("is true only for play=1", () => {
    expect(shouldAutoPlay(new URLSearchParams("play=1"))).toBe(true);
    expect(shouldAutoPlay(new URLSearchParams("play=true"))).toBe(false);
    expect(shouldAutoPlay(new URLSearchParams("play=0"))).toBe(false);
    expect(shouldAutoPlay(new URLSearchParams())).toBe(false);
  });
});
