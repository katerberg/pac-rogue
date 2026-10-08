import { describe, expect, it } from "vitest";
import {
  MAX_LIVES_FLAG,
  START_LIVES,
  STORE_REGEN_AMOUNT,
  levelLivesIconFloor,
  levelRegenAmount,
  livesAfterLevelRegen,
  livesHudIconCount,
  livesRemainingAfterCatch,
  parseInfiniteLivesFlag,
  parseLivesCountParam,
  storeLifeRoom,
} from "./lives";

describe("livesRemainingAfterCatch", () => {
  it("starts from START_LIVES of 4", () => {
    expect(START_LIVES).toBe(4);
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

describe("parseInfiniteLivesFlag", () => {
  it("only accepts infiniteLives=1", () => {
    expect(parseInfiniteLivesFlag(new URLSearchParams("infiniteLives=1"))).toBe(true);
    expect(parseInfiniteLivesFlag(new URLSearchParams("infiniteLives=0"))).toBe(false);
    expect(parseInfiniteLivesFlag(new URLSearchParams())).toBe(false);
  });
});

describe.each(["lives", "maxLives"] as const)("parseLivesCountParam(%s)", (flag) => {
  const parse = (query: string) => parseLivesCountParam(new URLSearchParams(query), flag);
  it("accepts positive integers only", () => {
    expect(parse(`${flag}=7`)).toBe(7);
    expect(parse(`${flag}=1`)).toBe(1);
    expect(parse(`${flag}=0`)).toBeNull();
    expect(parse(`${flag}=-2`)).toBeNull();
    expect(parse(`${flag}=2.5`)).toBeNull();
    expect(parse(`${flag}=`)).toBeNull();
    expect(parse("")).toBeNull();
  });

  it("clamps to MAX_LIVES_FLAG", () => {
    expect(parse(`${flag}=99`)).toBe(MAX_LIVES_FLAG);
    expect(parse(`${flag}=100000`)).toBe(MAX_LIVES_FLAG);
    expect(parse(`${flag}=${"9".repeat(400)}`)).toBe(MAX_LIVES_FLAG);
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

  it("leaves lives unchanged when regen amount is zero", () => {
    expect(livesAfterLevelRegen(2, 3, 0)).toBe(2);
  });
});

describe("levelLivesIconFloor", () => {
  it("raises the regen floor to 4 icons with Extra Life", () => {
    expect(levelLivesIconFloor(0)).toBe(3);
    expect(levelLivesIconFloor(1)).toBe(4);
    expect(livesAfterLevelRegen(4, levelLivesIconFloor(1))).toBe(5);
    expect(livesAfterLevelRegen(5, levelLivesIconFloor(1))).toBe(5);
    expect(livesAfterLevelRegen(4, levelLivesIconFloor(0))).toBe(4);
  });

  it("caps regen at maxLives lives", () => {
    expect(levelLivesIconFloor(0, 6)).toBe(5);
    expect(levelLivesIconFloor(1, 2)).toBe(2);
    expect(livesAfterLevelRegen(5, levelLivesIconFloor(0, 6))).toBe(6);
    expect(livesAfterLevelRegen(6, levelLivesIconFloor(0, 6))).toBe(6);
    expect(livesAfterLevelRegen(2, levelLivesIconFloor(0, 2))).toBe(2);
  });
});

describe("levelRegenAmount", () => {
  it("regenerates one life with Myogenesis and none without", () => {
    expect(STORE_REGEN_AMOUNT).toBe(1);
    expect(levelRegenAmount(false)).toBe(0);
    expect(levelRegenAmount(true)).toBe(1);
    expect(levelRegenAmount(true, true)).toBe(Number.POSITIVE_INFINITY);
    expect(livesAfterLevelRegen(2, levelLivesIconFloor(2), levelRegenAmount(true, true))).toBe(6);
  });

  it("clamps a multi-life regen at the icon floor", () => {
    expect(livesAfterLevelRegen(1, 3, 2)).toBe(3);
    expect(livesAfterLevelRegen(2, 3, 2)).toBe(4);
    expect(livesAfterLevelRegen(3, 3, 2)).toBe(4);
    expect(livesAfterLevelRegen(4, 3, 2)).toBe(4);
    expect(livesAfterLevelRegen(3, 4, 2)).toBe(5);
  });
});

describe("storeLifeRoom", () => {
  it("is the lives still purchasable under the cap, never negative", () => {
    expect(storeLifeRoom(2, 0)).toBe(2);
    expect(storeLifeRoom(3, 0)).toBe(1);
    expect(storeLifeRoom(4, 0)).toBe(0);
    expect(storeLifeRoom(6, 0)).toBe(0);
  });

  it("counts the Extra Life floor bonus and maxLives", () => {
    expect(storeLifeRoom(4, 1)).toBe(1);
    expect(storeLifeRoom(3, 0, 10)).toBe(7);
  });
});
