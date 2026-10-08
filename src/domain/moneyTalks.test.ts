import { describe, expect, it } from "vitest";
import {
  MONEY_TALKS_COIN_FLY_MS,
  MONEY_TALKS_END_SIZE_FRAC,
  MONEY_TALKS_WINDOW_MS,
  lastLifeSaveCost,
  moneyTalksCoinLook,
  moneyTalksLaunchedCount,
  quarterHudIconPosition,
} from "./moneyTalks";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";

describe("lastLifeSaveCost", () => {
  it("charges the cost on the last life when the Quarters cover it", () => {
    expect(lastLifeSaveCost(1, 3, 3)).toBe(3);
    expect(lastLifeSaveCost(1, 5, 1)).toBe(1);
  });

  it("does nothing when short, not on the last life, or not owned", () => {
    expect(lastLifeSaveCost(1, 2, 3)).toBeNull();
    expect(lastLifeSaveCost(2, 9, 3)).toBeNull();
    expect(lastLifeSaveCost(1, 9, null)).toBeNull();
  });
});

describe("quarterHudIconPosition", () => {
  it("lays icons left to right along the top HUD row", () => {
    expect(quarterHudIconPosition(0, 10)).toEqual({ x: 17, y: 13 });
    expect(quarterHudIconPosition(2, 10)).toEqual({ x: 45, y: 13 });
  });

  it("accepts a custom left edge for knobs mode", () => {
    expect(quarterHudIconPosition(0, 10, 84)).toEqual({ x: 89, y: 13 });
  });
});

describe("moneyTalksLaunchedCount", () => {
  it("launches the first coin at once and the last so it lands as the window ends", () => {
    const lastLaunch = MONEY_TALKS_WINDOW_MS - MONEY_TALKS_COIN_FLY_MS;
    expect(moneyTalksLaunchedCount(0, 3)).toBe(1);
    expect(moneyTalksLaunchedCount(lastLaunch / 2 - 1, 3)).toBe(1);
    expect(moneyTalksLaunchedCount(lastLaunch / 2, 3)).toBe(2);
    expect(moneyTalksLaunchedCount(lastLaunch, 3)).toBe(3);
    expect(moneyTalksLaunchedCount(0, 1)).toBe(1);
  });
});

describe("moneyTalksCoinLook", () => {
  it("starts the first coin on the rightmost HUD icon at icon size", () => {
    const rightmost = quarterHudIconPosition(4, 12);
    expect(moneyTalksCoinLook(0, 0, 3, 5, 12)).toEqual({ ...rightmost, size: 12, alpha: 1 });
  });

  it("starts each later coin one icon further left", () => {
    const launch = MONEY_TALKS_WINDOW_MS - MONEY_TALKS_COIN_FLY_MS;
    const last = moneyTalksCoinLook(launch, 2, 3, 5, 12)!;
    expect({ x: last.x, y: last.y }).toEqual(quarterHudIconPosition(2, 12));
  });

  it("is hidden before launch and after landing", () => {
    expect(moneyTalksCoinLook(0, 2, 3, 3, 12)).toBeNull();
    expect(moneyTalksCoinLook(MONEY_TALKS_COIN_FLY_MS, 0, 3, 3, 12)).toBeNull();
  });

  it("flies toward the playfield center, grows huge and fades out", () => {
    const late = moneyTalksCoinLook(MONEY_TALKS_COIN_FLY_MS * 0.95, 0, 3, 3, 12)!;
    expect(late.x).toBeCloseTo(PLAYFIELD_WIDTH / 2, -1);
    expect(late.y).toBeCloseTo(PLAYFIELD_HEIGHT / 2, -1);
    expect(late.size).toBeGreaterThan(PLAYFIELD_WIDTH * MONEY_TALKS_END_SIZE_FRAC * 0.85);
    expect(late.alpha).toBeLessThan(0.2);
    const mid = moneyTalksCoinLook(MONEY_TALKS_COIN_FLY_MS * 0.5, 0, 3, 3, 12)!;
    expect(mid.alpha).toBe(1);
    expect(mid.size).toBeLessThan(late.size);
  });

  it("stretches a single coin across the whole window", () => {
    expect(moneyTalksCoinLook(MONEY_TALKS_WINDOW_MS - 1, 0, 1, 3, 12)).not.toBeNull();
    expect(moneyTalksCoinLook(MONEY_TALKS_WINDOW_MS, 0, 1, 3, 12)).toBeNull();
  });
});
