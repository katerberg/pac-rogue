import { describe, expect, it } from "vitest";
import {
  START_LIVES,
  livesAfterLevelRegen,
  livesHudIconCount,
  livesRemainingAfterCatch,
} from "./lives";

describe("livesRemainingAfterCatch", () => {
  it("starts from START_LIVES of 3", () => {
    expect(START_LIVES).toBe(3);
  });

  it("decrements without game over when more than one life remains", () => {
    expect(livesRemainingAfterCatch(3)).toEqual({ lives: 2, gameOver: false });
    expect(livesRemainingAfterCatch(2)).toEqual({ lives: 1, gameOver: false });
  });

  it("goes to game over when catching with one life", () => {
    expect(livesRemainingAfterCatch(1)).toEqual({ lives: 0, gameOver: true });
  });

  it("treats zero or negative as game over", () => {
    expect(livesRemainingAfterCatch(0)).toEqual({ lives: 0, gameOver: true });
  });
});

describe("livesHudIconCount", () => {
  it("excludes the life currently in play", () => {
    expect(livesHudIconCount(3)).toBe(2);
    expect(livesHudIconCount(2)).toBe(1);
    expect(livesHudIconCount(1)).toBe(0);
    expect(livesHudIconCount(0)).toBe(0);
  });
});

describe("livesAfterLevelRegen", () => {
  it("trickles one life when fewer than 3 icons are showing", () => {
    expect(livesAfterLevelRegen(3)).toBe(4);
    expect(livesAfterLevelRegen(2)).toBe(3);
    expect(livesAfterLevelRegen(1)).toBe(2);
    expect(livesAfterLevelRegen(0)).toBe(1);
  });

  it("leaves lives unchanged once 3 icons are already showing", () => {
    expect(livesAfterLevelRegen(4)).toBe(4);
    expect(livesAfterLevelRegen(5)).toBe(5);
  });
});
