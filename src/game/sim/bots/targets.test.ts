import { describe, expect, it } from "vitest";
import type { EpisodeResult } from "./episode";
import { checkTarget, targetMisses, tierActual, tierOf } from "./targets";

function build(levelReached: number, i: number): EpisodeResult {
  return {
    job: { experiment: "builds", arm: "build", profile: "casual@novice", seed: `t-${i}` },
    outcome: levelReached >= 9 ? "reachedBoss" : "death",
    levelReached,
    progress: 0.5,
    simMs: 1000,
    deaths: [],
    ghostOutMs: {},
    offers: [],
    finalLoadout: [],
    quartersSpent: 0,
    storeStall: false,
  };
}

describe("tierActual", () => {
  it("measures reach shares and leaves the win unmeasured", () => {
    const runs = [2, 3, 3, 6, 9].map(build);
    const actual = tierActual(runs);
    expect(actual.n).toBe(5);
    expect(actual.metrics.reachL3!.value).toBeCloseTo(0.8, 10);
    expect(actual.metrics.reachL6!.value).toBeCloseTo(0.4, 10);
    expect(actual.metrics.reachBoss!.value).toBeCloseTo(0.2, 10);
    expect(actual.metrics.win).toBeNull();
  });

  it("reads the tier off the profile id", () => {
    expect(tierOf("casual@novice")).toBe("novice");
    expect(tierOf("cautious@expert")).toBe("expert");
  });
});

describe("checkTarget", () => {
  it("marks a point outside the band and whether the interval clears it", () => {
    const band = { lo: 0.6, hi: 0.8 };
    expect(checkTarget("reachL3", band, { value: 0.7, lo: 0.5, hi: 0.9, n: 20 })).toMatchObject({
      verdict: "ok",
      separated: false,
    });
    expect(checkTarget("reachL3", band, { value: 0.3, lo: 0.2, hi: 0.4, n: 80 })).toMatchObject({
      verdict: "below",
      separated: true,
    });
    expect(checkTarget("reachL3", band, { value: 0.85, lo: 0.75, hi: 0.95, n: 40 })).toMatchObject({
      verdict: "above",
      separated: false,
    });
  });
});

describe("targetMisses", () => {
  it("lists only the metrics off band for the tier", () => {
    const runs = Array.from({ length: 40 }, (_, i) => build(i < 10 ? 2 : 7, i));
    const misses = targetMisses("novice", tierActual(runs));
    expect(misses.map((m) => m.metric)).toEqual(["reachL6"]);
    expect(misses[0]!.verdict).toBe("above");
    expect(targetMisses("novice", tierActual([]))).toEqual([]);
  });
});
