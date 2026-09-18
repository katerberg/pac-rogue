import { describe, expect, it } from "vitest";
import { START_LIVES, livesIconCount, livesRemainingAfterCatch } from "./lives";

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

describe("livesIconCount", () => {
  it("shows reserve lives only, excluding the life in progress", () => {
    expect(livesIconCount(START_LIVES)).toBe(2);
    expect(livesIconCount(2)).toBe(1);
    expect(livesIconCount(1)).toBe(0);
    expect(livesIconCount(0)).toBe(0);
    expect(livesIconCount(4)).toBe(3);
  });
});
