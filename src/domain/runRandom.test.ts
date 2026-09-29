import { describe, expect, it } from "vitest";
import { createRunRandom, freshSeed, parseSeedParam } from "./runRandom";

function draws(next: () => number, count = 5): number[] {
  return Array.from({ length: count }, () => next());
}

describe("parseSeedParam", () => {
  it("accepts url-safe seeds up to 32 chars", () => {
    expect(parseSeedParam(new URLSearchParams("seed=abc-123_X"))).toBe("abc-123_X");
    expect(parseSeedParam(new URLSearchParams(`seed=${"a".repeat(32)}`))).toBe("a".repeat(32));
  });

  it("rejects missing, empty, oversized and unsafe seeds", () => {
    expect(parseSeedParam(new URLSearchParams())).toBeNull();
    expect(parseSeedParam(new URLSearchParams("seed="))).toBeNull();
    expect(parseSeedParam(new URLSearchParams(`seed=${"a".repeat(33)}`))).toBeNull();
    expect(parseSeedParam(new URLSearchParams("seed=a%20b"))).toBeNull();
  });
});

describe("freshSeed", () => {
  it("produces a seed parseSeedParam accepts", () => {
    const seed = freshSeed();
    expect(parseSeedParam(new URLSearchParams({ seed }))).toBe(seed);
  });
});

describe("createRunRandom", () => {
  it("replays the same sequence for the same seed and stream", () => {
    expect(draws(createRunRandom("s1").stream("upgradeOffer", 3))).toEqual(
      draws(createRunRandom("s1").stream("upgradeOffer", 3)),
    );
  });

  it("differs across seeds, stream names and levels", () => {
    const base = draws(createRunRandom("s1").stream("upgradeOffer", 3));
    expect(draws(createRunRandom("s2").stream("upgradeOffer", 3))).not.toEqual(base);
    expect(draws(createRunRandom("s1").stream("storeStock", 3))).not.toEqual(base);
    expect(draws(createRunRandom("s1").stream("upgradeOffer", 4))).not.toEqual(base);
  });

  it("continues a stream across calls instead of restarting it", () => {
    const random = createRunRandom("s1");
    const first = random.stream("storePurchase", 3)();
    const second = random.stream("storePurchase", 3)();
    expect([first, second]).toEqual(draws(createRunRandom("s1").stream("storePurchase", 3), 2));
  });

  it("keeps streams independent of how much others were drawn", () => {
    const busy = createRunRandom("s1");
    draws(busy.stream("upgradeFx"), 100);
    expect(draws(busy.stream("corruption", 4))).toEqual(
      draws(createRunRandom("s1").stream("corruption", 4)),
    );
  });
});
