import { describe, expect, it } from "vitest";
import {
  lifeAfterDeathClear,
  martyrOwned,
  shouldFireMartyr,
  shouldStartPossession,
} from "./possession";
import { POSSESSION_HAUNT_MS, POSSESSION_MS, possessionHauntMs } from "./upgrades";

describe("shouldFireMartyr", () => {
  it("fires on a real life loss", () => {
    expect(
      shouldFireMartyr(["passiveMartyr"], {
        infiniteLives: false,
        lifeLost: true,
        saved: false,
      }),
    ).toBe(true);
  });

  it("skips infiniteLives and unowned", () => {
    expect(
      shouldFireMartyr(["passiveMartyr"], {
        infiniteLives: true,
        lifeLost: true,
        saved: false,
      }),
    ).toBe(false);
    expect(shouldFireMartyr([], { infiniteLives: false, lifeLost: true, saved: false })).toBe(
      false,
    );
  });

  it("base skips soft saves; Plus fires on them", () => {
    expect(
      shouldFireMartyr(["passiveMartyr"], {
        infiniteLives: false,
        lifeLost: false,
        saved: true,
      }),
    ).toBe(false);
    expect(
      shouldFireMartyr(["passiveMartyrPlus"], {
        infiniteLives: false,
        lifeLost: false,
        saved: true,
      }),
    ).toBe(true);
  });
});

describe("shouldStartPossession", () => {
  it("starts on a ghost catch that loses a life", () => {
    expect(
      shouldStartPossession(["passivePossession"], {
        infiniteLives: false,
        lifeLost: true,
        lava: false,
        caughtBy: 7,
      }),
    ).toBe(true);
  });

  it("skips lava, infiniteLives, saves, and missing ghost", () => {
    const base = {
      infiniteLives: false,
      lifeLost: true,
      lava: false,
      caughtBy: 7 as number | null,
    };
    expect(shouldStartPossession(["passivePossession"], { ...base, lava: true })).toBe(false);
    expect(shouldStartPossession(["passivePossession"], { ...base, infiniteLives: true })).toBe(
      false,
    );
    expect(shouldStartPossession(["passivePossession"], { ...base, lifeLost: false })).toBe(false);
    expect(shouldStartPossession(["passivePossession"], { ...base, caughtBy: null })).toBe(false);
    expect(shouldStartPossession([], base)).toBe(false);
  });
});

describe("possession helpers", () => {
  it("exports durations and Plus haunt", () => {
    expect(POSSESSION_MS).toBe(5000);
    expect(POSSESSION_HAUNT_MS).toBe(5000);
    expect(possessionHauntMs(["passivePossession"])).toBeNull();
    expect(possessionHauntMs(["passivePossessionPlus"])).toBe(POSSESSION_HAUNT_MS);
    expect(martyrOwned(["passiveMartyrPlus"])).toBe(true);
    expect(lifeAfterDeathClear(1)).toBe(1);
    expect(lifeAfterDeathClear(3)).toBe(3);
  });
});
