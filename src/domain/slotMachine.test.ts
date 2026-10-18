import { describe, expect, it } from "vitest";
import { createRunRandom } from "./runRandom";
import {
  composeSlotGrid,
  parseSlotParam,
  pickSlotUpgrade,
  rollSlotOutcome,
  SLOT_ANTICIPATION_MS,
  SLOT_REEL_STOP_MS,
  SLOT_SCHOOLS,
  slotAnticipation,
  slotFrame,
  slotOutcomeTable,
  slotSchoolWeights,
  slotTimeline,
  slotWins,
  slotWinTotals,
  spinSlot,
  type SlotGrid,
} from "./slotMachine";
import { eligibleUpgrades, getUpgradeDef, type BaseUpgradeId } from "./upgrades";

const rng = (seed: string) => createRunRandom(seed).stream("slots");
const evenSchools = slotSchoolWeights([]);

function tableStats(livesOnReels: boolean) {
  const table = slotOutcomeTable(livesOnReels);
  const total = table.reduce((sum, outcome) => sum + outcome.weight, 0);
  const share = (pick: (o: (typeof table)[number]) => boolean) =>
    table.filter(pick).reduce((sum, o) => sum + o.weight, 0) / total;
  const mean = (pick: (o: (typeof table)[number]) => number) =>
    table.reduce((sum, o) => sum + o.weight * pick(o), 0) / total;
  return {
    nothing: share((o) => o.quarters + o.upgrades + o.lives === 0),
    anyUpgrade: share((o) => o.upgrades > 0),
    anyLife: share((o) => o.lives > 0),
    quarters: mean((o) => o.quarters),
  };
}

describe("slot outcome table", () => {
  it("pays nothing under 10% of the time and averages at least 0.85 Quarters", () => {
    for (const livesOnReels of [true, false]) {
      const stats = tableStats(livesOnReels);
      expect(stats.nothing).toBeLessThan(0.1);
      expect(stats.quarters).toBeGreaterThanOrEqual(0.85);
      expect(stats.anyUpgrade).toBeCloseTo(0.25, 2);
    }
  });

  it("hits a life as often as an upgrade below max lives, and never at max", () => {
    expect(Math.abs(tableStats(true).anyLife - tableStats(true).anyUpgrade)).toBeLessThan(0.01);
    expect(tableStats(false).anyLife).toBe(0);
  });

  it("turns life lines into Quarter lines at max lives", () => {
    const random = rng("max-lives");
    for (let i = 0; i < 500; i += 1) {
      expect(rollSlotOutcome(random, false).lives).toBe(0);
    }
  });
});

describe("composeSlotGrid", () => {
  it("shows exactly the rolled outcome for every row of the table", () => {
    const random = rng("compose");
    for (const livesOnReels of [true, false]) {
      for (const outcome of slotOutcomeTable(livesOnReels)) {
        for (let i = 0; i < 40; i += 1) {
          const grid = composeSlotGrid(outcome, evenSchools, livesOnReels, random);
          const { quarters, upgrades, lives } = outcome;
          expect(slotWinTotals(slotWins(grid))).toEqual({ quarters, upgrades, lives });
        }
      }
    }
  });

  it("keeps the life symbol off the reels at max lives", () => {
    const random = rng("no-life");
    for (let i = 0; i < 200; i += 1) {
      const grid = composeSlotGrid(rollSlotOutcome(random, false), evenSchools, false, random);
      expect(grid.flat()).not.toContain("life");
    }
  });

  it("leans school symbols toward owned schools", () => {
    const owned = eligibleUpgrades([])
      .filter((id) => getUpgradeDef(id).school === "speed")
      .slice(0, 2);
    const leaning = slotSchoolWeights(owned);
    expect(leaning.speed).toBeGreaterThan(leaning.death);
    const random = rng("lean");
    let speed = 0;
    let death = 0;
    for (let i = 0; i < 400; i += 1) {
      const spin = spinSlot({ quarters: 0, upgrades: 1, lives: 0 }, leaning, false, random);
      speed += spin.wins[0]!.symbol === "speed" ? 1 : 0;
      death += spin.wins[0]!.symbol === "death" ? 1 : 0;
    }
    expect(speed).toBeGreaterThan(death);
  });

  it("sometimes teases a near miss on a spin with no upgrade or life", () => {
    const random = rng("tease");
    let teased = 0;
    for (let i = 0; i < 400; i += 1) {
      const spin = spinSlot({ quarters: 1, upgrades: 0, lives: 0 }, evenSchools, true, random);
      teased += spin.anticipation ? 1 : 0;
    }
    expect(teased / 400).toBeGreaterThan(0.2);
    expect(teased / 400).toBeLessThan(0.7);
  });
});

describe("slotWins", () => {
  it("pays every line on a full grid of Quarters", () => {
    const grid: SlotGrid = [
      ["quarter", "quarter", "quarter"],
      ["quarter", "quarter", "quarter"],
      ["quarter", "quarter", "quarter"],
    ];
    expect(slotWins(grid)).toHaveLength(5);
  });

  it("pays Quarters, then lives, then upgrades", () => {
    const grid: SlotGrid = [
      ["speed", "life", "quarter"],
      ["speed", "life", "quarter"],
      ["speed", "life", "quarter"],
    ];
    expect(slotWins(grid).map((win) => win.symbol)).toEqual(["quarter", "life", "speed"]);
  });
});

describe("slotAnticipation", () => {
  it("holds the third reel when the first two reels line up a school or life", () => {
    const grid: SlotGrid = [
      ["death", "quarter", "quarter"],
      ["death", "speed", "quarter"],
      ["quarter", "death", "quarter"],
    ];
    expect(slotAnticipation(grid)).toBe(true);
    expect(
      slotAnticipation([
        ["quarter", "death", "life"],
        ["quarter", "speed", "harvest"],
        ["quarter", "death", "life"],
      ]),
    ).toBe(false);
  });
});

describe("slotTimeline", () => {
  const spinWith = (wins: number, anticipation = false) => ({
    grid: [],
    wins: Array.from({ length: wins }, (_, line) => ({ line, symbol: "quarter" as const })),
    anticipation,
  });

  it("lands a single-line spin in about three seconds", () => {
    expect(slotTimeline(spinWith(1)).durationMs).toBe(3000);
    expect(slotTimeline(spinWith(0)).durationMs).toBeLessThan(3000);
  });

  it("stops the reels left to right and delays the third on anticipation", () => {
    expect(slotTimeline(spinWith(1)).reelStopsMs).toEqual([...SLOT_REEL_STOP_MS]);
    const held = slotTimeline(spinWith(1, true));
    expect(held.reelStopsMs[2]).toBe(SLOT_REEL_STOP_MS[2] + SLOT_ANTICIPATION_MS);
  });

  it("flashes multi-line payouts one line at a time and runs longer", () => {
    const multi = slotTimeline(spinWith(3));
    expect(multi.winStartsMs[1]! - multi.winStartsMs[0]!).toBeGreaterThan(0);
    expect(multi.durationMs).toBeGreaterThan(slotTimeline(spinWith(1)).durationMs);
  });
});

describe("pickSlotUpgrade", () => {
  it("draws an unowned upgrade of the school, or null when the school is empty", () => {
    const random = rng("pick");
    for (const school of SLOT_SCHOOLS) {
      const id = pickSlotUpgrade([], school, random);
      expect(id).not.toBeNull();
      expect(getUpgradeDef(id!).school).toBe(school);
    }
    const owned: BaseUpgradeId[] = [];
    for (let id = pickSlotUpgrade(owned, "speed", random); id !== null;) {
      expect(getUpgradeDef(id).school).toBe("speed");
      owned.push(id);
      id = pickSlotUpgrade(owned, "speed", random);
    }
    expect(owned.length).toBeGreaterThan(1);
  });
});

describe("parseSlotParam", () => {
  it("reads forced outcomes", () => {
    const parse = (raw: string) => parseSlotParam(new URLSearchParams({ slot: raw }));
    expect(parse("2q1u")).toEqual({ quarters: 2, upgrades: 1, lives: 0 });
    expect(parse("1l")).toEqual({ quarters: 0, upgrades: 0, lives: 1 });
    expect(parse("5q")).toEqual({ quarters: 5, upgrades: 0, lives: 0 });
    expect(parse("0")).toEqual({ quarters: 0, upgrades: 0, lives: 0 });
    expect(parse("6q")).toBeNull();
    expect(parse("junk")).toBeNull();
    expect(parseSlotParam(new URLSearchParams())).toBeNull();
  });
});

describe("slotFrame", () => {
  const spin = {
    grid: [],
    wins: [
      { line: 0, symbol: "quarter" as const },
      { line: 1, symbol: "speed" as const },
    ],
    anticipation: true,
  };
  const timeline = slotTimeline(spin);

  it("stops reels in order and flags the held third reel", () => {
    const mid = slotFrame(spin, timeline, SLOT_REEL_STOP_MS[1] + 10);
    expect(mid.stopped).toEqual([true, true, false]);
    expect(mid.anticipating).toBe(true);
    expect(mid.activeWin).toBeNull();
  });

  it("flashes each winning line in turn, then the multi-line finale", () => {
    expect(slotFrame(spin, timeline, timeline.winStartsMs[0]!).activeWin).toBe(0);
    expect(slotFrame(spin, timeline, timeline.winStartsMs[1]!).activeWin).toBe(1);
    const end = slotFrame(spin, timeline, timeline.durationMs - 1);
    expect(end).toMatchObject({ finale: true, activeWin: null });
  });

  it("keeps a single win lit until the spin ends, with no finale", () => {
    const single = { ...spin, wins: [spin.wins[0]!], anticipation: false };
    const frame = slotFrame(single, slotTimeline(single), slotTimeline(single).durationMs - 1);
    expect(frame).toMatchObject({ activeWin: 0, finale: false, anticipating: false });
  });
});
