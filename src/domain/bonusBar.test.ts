import { describe, expect, it } from "vitest";
import {
  addBonusCharge,
  applyStreakPellets,
  BONUS_STREAK_IDLE_MS,
  bonusTierBump,
  breakStreak,
  createBonusBar,
  enterCell,
  tickStreakIdle,
  type BonusBar,
  type Cell,
} from "./bonusBar";

function cells(count: number, row = 0, fromCol = 0): Cell[] {
  return Array.from({ length: count }, (_, i) => ({ col: fromCol + i, row }));
}

function runStreaks(lengths: number[]): { bar: BonusBar; filled: number } {
  let bar = createBonusBar();
  let filled = 0;
  for (const length of lengths) {
    const result = applyStreakPellets(bar, cells(length));
    filled += result.filled;
    bar = breakStreak(result.bar);
  }
  return { bar, filled };
}

describe("bonusTierBump", () => {
  it("ramps 2, 3, 5, 8, 12, 16, then +5 per tier", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(bonusTierBump)).toEqual([2, 3, 5, 8, 12, 16, 21, 26]);
  });
});

describe("bonus economy reference", () => {
  it("pays about 0.72 of a bar for 12 streaks of 20", () => {
    const { bar, filled } = runStreaks(Array<number>(12).fill(20));
    expect(filled).toBe(0);
    expect(bar.charge).toBe(216);
  });

  it("pays 120 points for 24 streaks of 10", () => {
    expect(runStreaks(Array<number>(24).fill(10)).bar.charge).toBe(120);
  });

  it("pays more than 3 bars for 4 streaks of 60", () => {
    const { bar, filled } = runStreaks([60, 60, 60, 60]);
    expect(filled).toBe(3);
    expect(bar.charge).toBe(88);
  });
});

describe("applyStreakPellets", () => {
  it("bumps only when a multiple of 5 is reached", () => {
    const four = applyStreakPellets(createBonusBar(), cells(4));
    expect(four.tier).toBe(0);
    expect(four.bar.charge).toBe(0);
    const five = applyStreakPellets(four.bar, cells(1, 1));
    expect(five.tier).toBe(1);
    expect(five.bar.charge).toBe(2);
  });

  it("crosses one tier going from 4 to 6", () => {
    const four = applyStreakPellets(createBonusBar(), cells(4)).bar;
    const result = applyStreakPellets(four, cells(2, 1));
    expect(result.tier).toBe(1);
    expect(result.bar.charge).toBe(2);
  });

  it("sums every tier crossed in one call and reports the highest", () => {
    const nine = applyStreakPellets(createBonusBar(), cells(9)).bar;
    const result = applyStreakPellets(nine, cells(7, 1));
    expect(result.tier).toBe(3);
    expect(result.bar.charge - nine.charge).toBe(8);
  });

  it("resets the idle clock", () => {
    const bar = { ...createBonusBar(), streak: 1, idleMs: 300 };
    expect(applyStreakPellets(bar, cells(1)).bar.idleMs).toBe(0);
  });
});

describe("addBonusCharge", () => {
  it("pays one fill and carries the remainder", () => {
    const result = addBonusCharge(createBonusBar(295), 16);
    expect(result.filled).toBe(1);
    expect(result.bar.charge).toBe(11);
  });

  it("pays several fills at once", () => {
    const result = addBonusCharge(createBonusBar(), 650);
    expect(result.filled).toBe(2);
    expect(result.bar.charge).toBe(50);
  });
});

describe("enterCell", () => {
  const eaten = applyStreakPellets(createBonusBar(100), [{ col: 3, row: 4 }]).bar;

  it("keeps the streak when the cell holds a pellet", () => {
    expect(enterCell(eaten, { col: 9, row: 9 }, true)).toBe(eaten);
  });

  it("uses up a credited cell once, then breaks on re-entry", () => {
    const entered = enterCell(eaten, { col: 3, row: 4 }, false);
    expect(entered.streak).toBe(1);
    const again = enterCell(entered, { col: 3, row: 4 }, false);
    expect(again.streak).toBe(0);
    expect(again.charge).toBe(100);
  });

  it("breaks on an uncredited empty cell and keeps the charge", () => {
    const broken = enterCell(eaten, { col: 5, row: 4 }, false);
    expect(broken.streak).toBe(0);
    expect(broken.credited.size).toBe(0);
    expect(broken.charge).toBe(100);
  });
});

describe("tickStreakIdle", () => {
  it("does nothing without a streak", () => {
    expect(tickStreakIdle(createBonusBar(), 1000).idleMs).toBe(0);
  });

  it("breaks the streak at the idle limit", () => {
    const bar = applyStreakPellets(createBonusBar(), cells(3)).bar;
    expect(tickStreakIdle(bar, BONUS_STREAK_IDLE_MS - 1).streak).toBe(3);
    expect(tickStreakIdle(bar, BONUS_STREAK_IDLE_MS).streak).toBe(0);
  });
});
