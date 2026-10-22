import { describe, expect, it } from "vitest";
import { createRunRandom } from "./runRandom";
import {
  composeSlotGrid,
  parseJumpToSpinnerFlag,
  parseSlotParam,
  pickSlotUpgrade,
  rollSlotOutcome,
  SLOT_ANTICIPATION_MS,
  SLOT_LINES,
  SLOT_REEL_STOP_MS,
  SLOT_SCHOOLS,
  slotAnticipation,
  SLOT_MUSIC_DUCK_GAIN,
  slotFrame,
  stepMusicDuck,
  slotReelCells,
  slotOutcomeTable,
  slotSchoolWeights,
  slotTimeline,
  slotWins,
  slotWinTotals,
  spinSlot,
  type SlotGrid,
} from "./slotMachine";
import { TRINKET_IDS, TRINKET_MAX_COPIES, isTrinketId } from "./trinkets";
import {
  eligibleUpgrades,
  getUpgradeDef,
  UPGRADE_SCHOOL_ORDER,
  type BaseUpgradeId,
  type UpgradeId,
} from "./upgrades";

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
    multi: share((o) => o.quarters + o.upgrades + o.lives > 1),
    anyUpgrade: share((o) => o.upgrades > 0),
    anyLife: share((o) => o.lives > 0),
    quarters: mean((o) => o.quarters),
  };
}

describe("slot outcome table", () => {
  it("pays nothing under 10%, multi under a quarter, and averages at least 0.65 Quarters", () => {
    for (const livesOnReels of [true, false]) {
      const stats = tableStats(livesOnReels);
      expect(stats.nothing).toBeLessThan(0.1);
      expect(stats.multi).toBeLessThan(0.25);
      expect(stats.quarters).toBeGreaterThanOrEqual(0.65);
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

  it("lands a single win on every payline about equally often", () => {
    const random = rng("lines");
    const hits = SLOT_LINES.map(() => 0);
    const spins = 3000;
    for (let i = 0; i < spins; i += 1) {
      const grid = composeSlotGrid(
        { quarters: 1, upgrades: 0, lives: 0 },
        evenSchools,
        true,
        random,
      );
      hits[slotWins(grid)[0]!.line]! += 1;
    }
    for (const count of hits) {
      expect(count / spins).toBeGreaterThan(0.15);
      expect(count / spins).toBeLessThan(0.25);
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
    livesOnReels: true,
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

describe("slotReelCells", () => {
  const random = rng("reels");
  const spin = spinSlot({ quarters: 1, upgrades: 0, lives: 0 }, evenSchools, false, random);
  const timeline = slotTimeline(spin);
  const stopMs = timeline.reelStopsMs[0]!;

  it("scrolls the strip down smoothly while the reel spins", () => {
    const a = slotReelCells(spin, timeline, 0, 100);
    const b = slotReelCells(spin, timeline, 0, 110);
    expect(a).toHaveLength(4);
    const offset = (cells: typeof a) => cells[0]!.y + 1;
    expect(offset(b)).not.toBe(offset(a));
    expect(Math.abs(offset(b) - offset(a))).toBeLessThan(0.5);
    expect(a.every((cell) => cell.y >= -1 && cell.y < 3)).toBe(true);
  });

  it("lands on the grid without a jump", () => {
    const before = slotReelCells(spin, timeline, 0, stopMs - 0.01);
    const landed = slotReelCells(spin, timeline, 0, stopMs + 1000);
    expect(landed).toEqual(spin.grid[0]!.map((symbol, row) => ({ symbol, y: row })));
    for (const { symbol, y } of landed) {
      const near = before.find((cell) => Math.abs(cell.y - y) < 0.01);
      expect(near?.symbol).toBe(symbol);
    }
  });

  it("bounces briefly on landing", () => {
    expect(slotReelCells(spin, timeline, 0, stopMs + 80)[0]!.y).toBeGreaterThan(0);
  });

  it("never scrolls a life past at the life cap", () => {
    for (let ms = 0; ms < stopMs; ms += 7) {
      expect(slotReelCells(spin, timeline, 0, ms).map((cell) => cell.symbol)).not.toContain("life");
    }
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

describe("parseJumpToSpinnerFlag", () => {
  it("is true only for jumpToSpinner=1", () => {
    expect(parseJumpToSpinnerFlag(new URLSearchParams("jumpToSpinner=1"))).toBe(true);
    expect(parseJumpToSpinnerFlag(new URLSearchParams("jumpToSpinner=0"))).toBe(false);
    expect(parseJumpToSpinnerFlag(new URLSearchParams())).toBe(false);
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
    livesOnReels: true,
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

  it("holds on the final grid with every winning line lit once the payout ends", () => {
    expect(slotFrame(spin, timeline, timeline.durationMs - 1).held).toBe(false);
    const held = slotFrame(spin, timeline, timeline.durationMs);
    expect(held).toMatchObject({ held: true, finale: false, activeWin: null });
    expect(held.stopped).toEqual([true, true, true]);
  });

  it("keeps a single win lit until the spin ends, with no finale", () => {
    const single = { ...spin, wins: [spin.wins[0]!], anticipation: false };
    const frame = slotFrame(single, slotTimeline(single), slotTimeline(single).durationMs - 1);
    expect(frame).toMatchObject({ activeWin: 0, finale: false, anticipating: false });
  });
});

describe("slot miss title", () => {
  const miss = { grid: [], wins: [], anticipation: false, livesOnReels: true };
  const timeline = slotTimeline(miss);
  const stop = timeline.reelStopsMs[2]!;

  it("reads BONUS! while spinning and NO PRIZE once the reels stop on a miss", () => {
    expect(slotFrame(miss, timeline, stop - 1).title).toBe("BONUS!");
    expect(slotFrame(miss, timeline, stop).title).toBe("NO PRIZE");
    expect(slotFrame(miss, timeline, timeline.durationMs).title).toBe("NO PRIZE");
  });

  it("flashes once, right as the reels stop", () => {
    expect(slotFrame(miss, timeline, stop - 1).titleFlash).toBe(false);
    expect(slotFrame(miss, timeline, stop).titleFlash).toBe(true);
    expect(slotFrame(miss, timeline, stop + 500).titleFlash).toBe(false);
  });

  it("keeps BONUS! and never flashes on a win", () => {
    const win = { ...miss, wins: [{ line: 0, symbol: "quarter" as const }] };
    const frame = slotFrame(win, slotTimeline(win), slotTimeline(win).durationMs);
    expect(frame).toMatchObject({ title: "BONUS!", titleFlash: false });
  });
});

describe("stepMusicDuck", () => {
  it("fades down to a quarter while ducked and never below", () => {
    const half = stepMusicDuck(1, true, 200);
    expect(half).toBeLessThan(1);
    expect(half).toBeGreaterThan(SLOT_MUSIC_DUCK_GAIN);
    expect(stepMusicDuck(1, true, 10_000)).toBe(SLOT_MUSIC_DUCK_GAIN);
  });

  it("fades back up to full volume and never above", () => {
    expect(stepMusicDuck(SLOT_MUSIC_DUCK_GAIN, false, 100)).toBeGreaterThan(SLOT_MUSIC_DUCK_GAIN);
    expect(stepMusicDuck(SLOT_MUSIC_DUCK_GAIN, false, 10_000)).toBe(1);
  });
});

describe("neutral reel symbol", () => {
  it("puts neutral on the reels at the same base weight as every school", () => {
    expect([...SLOT_SCHOOLS]).toEqual([...UPGRADE_SCHOOL_ORDER]);
    expect(new Set(Object.values(evenSchools))).toEqual(new Set([1]));
    expect(slotSchoolWeights(["lowSpeed", "lowSpeed", "passiveOvercharge"]).neutral).toBe(1);
  });

  it("shows exactly the rolled lines when a neutral line wins", () => {
    const random = rng("neutral-line");
    let neutralWins = 0;
    for (let i = 0; i < 300; i += 1) {
      const outcome = { quarters: 1, upgrades: 1, lives: 0 };
      const spin = spinSlot(outcome, evenSchools, false, random);
      if (spin.wins.some((win) => win.symbol === "neutral")) {
        neutralWins += 1;
        expect(slotWinTotals(spin.wins)).toEqual(outcome);
      }
    }
    expect(neutralWins).toBeGreaterThan(0);
  });

  it("pays a Trinket or Overcharge, and nothing once both are gone", () => {
    const random = rng("neutral-pick");
    for (let i = 0; i < 50; i += 1) {
      const id = pickSlotUpgrade(["powerPelletFreeze", "passiveAfterburner"], "neutral", random)!;
      expect(isTrinketId(id) || id === "passiveOvercharge").toBe(true);
    }
    const maxed: UpgradeId[] = TRINKET_IDS.flatMap((id) =>
      Array.from({ length: TRINKET_MAX_COPIES }, () => id),
    );
    expect(pickSlotUpgrade([...maxed, "passiveOvercharge"], "neutral", random)).toBeNull();
  });
});
