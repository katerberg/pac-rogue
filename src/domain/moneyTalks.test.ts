import { describe, expect, it } from "vitest";
import {
  MONEY_TALKS_COIN_FLY_MS,
  MONEY_TALKS_END_SIZE_FRAC,
  MONEY_TALKS_WINDOW_MS,
  moneyTalksCoinLook,
  moneyTalksLaunchedCount,
  quarterHudIconPosition,
  resolveLastLifeSave,
} from "./moneyTalks";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";

describe("resolveLastLifeSave", () => {
  it("saves the last life when the Quarters cover the cost", () => {
    expect(resolveLastLifeSave(1, 3, 3)).toEqual({ saved: true, spend: 3 });
    expect(resolveLastLifeSave(1, 5, 1)).toEqual({ saved: true, spend: 1 });
  });

  it("does nothing when short, not on the last life, or not owned", () => {
    expect(resolveLastLifeSave(1, 2, 3)).toEqual({ saved: false, spend: 0 });
    expect(resolveLastLifeSave(2, 9, 3)).toEqual({ saved: false, spend: 0 });
    expect(resolveLastLifeSave(1, 9, null)).toEqual({ saved: false, spend: 0 });
  });
});

describe("quarterHudIconPosition", () => {
  it("lays icons left to right along the top HUD row", () => {
    expect(quarterHudIconPosition(0, 10)).toEqual({ x: 17, y: 13 });
    expect(quarterHudIconPosition(2, 10)).toEqual({ x: 45, y: 13 });
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
  const from = { x: 20, y: 10 };

  it("starts at the HUD icon at icon size", () => {
    expect(moneyTalksCoinLook(0, 0, 3, from, 12)).toEqual({ x: 20, y: 10, size: 12, alpha: 1 });
  });

  it("is hidden before launch and after landing", () => {
    expect(moneyTalksCoinLook(0, 2, 3, from, 12)).toBeNull();
    expect(moneyTalksCoinLook(MONEY_TALKS_COIN_FLY_MS, 0, 3, from, 12)).toBeNull();
  });

  it("flies toward the playfield center, grows huge and fades out", () => {
    const late = moneyTalksCoinLook(MONEY_TALKS_COIN_FLY_MS * 0.95, 0, 3, from, 12)!;
    expect(late.x).toBeCloseTo(PLAYFIELD_WIDTH / 2, -1);
    expect(late.y).toBeCloseTo(PLAYFIELD_HEIGHT / 2, -1);
    expect(late.size).toBeGreaterThan(PLAYFIELD_WIDTH * MONEY_TALKS_END_SIZE_FRAC * 0.85);
    expect(late.alpha).toBeLessThan(0.2);
    const mid = moneyTalksCoinLook(MONEY_TALKS_COIN_FLY_MS * 0.5, 0, 3, from, 12)!;
    expect(mid.alpha).toBe(1);
    expect(mid.size).toBeLessThan(late.size);
  });

  it("stretches a single coin across the whole window", () => {
    expect(moneyTalksCoinLook(MONEY_TALKS_WINDOW_MS - 1, 0, 1, from, 12)).not.toBeNull();
    expect(moneyTalksCoinLook(MONEY_TALKS_WINDOW_MS, 0, 1, from, 12)).toBeNull();
  });
});
