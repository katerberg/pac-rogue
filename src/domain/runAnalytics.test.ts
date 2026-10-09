import { describe, expect, it } from "vitest";
import {
  COMPLETE_REACH,
  formatPercent,
  formatReach,
  median,
  reachOf,
  sortUpgradeRows,
  summarize,
  upgradeRows,
  type RunScope,
} from "./runAnalytics";
import {
  beginLevelLog,
  createRunLog,
  TEST_RUN_LOG_META,
  type LoadoutEntry,
  type RunLogRecord,
  type RunOutcome,
} from "./runLog";

const FINISHED: RunScope = { includeUnfinished: false, includeDebug: false };

function run(
  finalLevel: number,
  outcome: RunOutcome,
  loadout: LoadoutEntry[] = [],
  extra: Partial<RunLogRecord> = {},
): RunLogRecord {
  const record = createRunLog(TEST_RUN_LOG_META, "s", false);
  for (let level = 1; level <= finalLevel; level += 1) {
    beginLevelLog(record, {
      level,
      layout: "maze1",
      inverted: false,
      boss: false,
      countdownStart: 999,
      livesStart: 3,
    });
  }
  return { ...record, outcome, loadout, ...extra };
}

describe("runAnalytics", () => {
  it("reaches the last level played, or WIN for a complete run", () => {
    expect(reachOf(run(4, "death"))).toBe(4);
    expect(reachOf(run(9, "complete"))).toBe(COMPLETE_REACH);
  });

  it("formats reach and percentages, with a dash for no data", () => {
    expect(formatReach(null)).toBe("—");
    expect(formatReach(4)).toBe("L4");
    expect(formatReach(4.5)).toBe("L4.5");
    expect(formatReach(COMPLETE_REACH)).toBe("WIN");
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(0.256)).toBe("26%");
  });

  it("takes the middle value, averaging an even pair", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });

  it("summarizes finished, non-debug runs by default", () => {
    const runs = [
      run(2, "death", [], { gameVersion: "b" }),
      run(9, "complete", [], { gameVersion: "a" }),
      run(3, "quit"),
      run(1, "abandoned"),
      run(1, "inProgress"),
      run(5, "death", [], { debug: true }),
    ];
    const summary = summarize(runs, FINISHED);
    expect(summary).toMatchObject({ runs: 2, completeRate: 0.5, debugRuns: 1 });
    expect(summary.reach[1]).toBe(1);
    expect(summary.reach[COMPLETE_REACH - 1]).toBe(1);
    expect(summary.versions).toEqual(["a", "b"]);
    expect(summarize(runs, { includeUnfinished: true, includeDebug: false }).runs).toBe(4);
    expect(summarize(runs, { includeUnfinished: false, includeDebug: true }).runs).toBe(3);
  });

  it("counts a run for an upgrade owned at any point, folding Plus into the base row", () => {
    const runs = [
      run(3, "death", [{ id: "passiveGhostSlow", source: "start", level: 1 }]),
      run(9, "complete", [
        { id: "passiveGhostSlow", source: "offer", level: 2, removedLevel: 5 },
        { id: "passiveGhostSlowPlus", source: "enhance", level: 5 },
      ]),
      run(6, "death"),
    ];
    const row = upgradeRows(runs, FINISHED).find((r) => r.id === "passiveGhostSlow")!;
    expect(row).toMatchObject({
      runs: 2,
      plusRuns: 1,
      completeRate: 0.5,
      medianLevelTaken: 1.5,
      lowSample: true,
    });
    expect(row.medianReach).toBe((3 + COMPLETE_REACH) / 2);
    expect(row.reach[2]).toBe(1);
    expect(row.reach[COMPLETE_REACH - 1]).toBe(1);
  });

  it("counts offers and picks across every level", () => {
    const offered = run(2, "death");
    offered.levels[0]!.offer = {
      upgrades: ["passiveGhostSlow", "passiveExtraLife", "fruitFeast"],
      quarters: 1,
      picked: "passiveGhostSlow",
      choiceMs: 100,
    };
    offered.levels[1]!.offer = {
      upgrades: ["passiveGhostSlow", "fruitFeast", "passiveExtraLife"],
      quarters: 1,
      picked: "quarters",
      choiceMs: 100,
    };
    const rows = upgradeRows([offered], FINISHED);
    expect(rows.find((r) => r.id === "passiveGhostSlow")).toMatchObject({
      offered: 2,
      picked: 1,
      pickRate: 0.5,
    });
    expect(rows.find((r) => r.id === "fruitFeast")!.pickRate).toBe(0);
  });

  it("ignores loadout ids that no longer exist", () => {
    const stale = run(4, "death", [
      { id: "removedUpgrade" as LoadoutEntry["id"], source: "store", level: 2 },
    ]);
    expect(upgradeRows([stale], FINISHED).every((row) => row.runs === 0)).toBe(true);
  });

  it("sorts sampled rows first, then low samples, then unowned", () => {
    const loadout = (id: LoadoutEntry["id"]): LoadoutEntry[] => [{ id, source: "start", level: 1 }];
    const runs = [
      ...Array.from({ length: 5 }, () => run(3, "death", loadout("passiveGhostSlow"))),
      ...Array.from({ length: 5 }, () => run(7, "death", loadout("fruitFeast"))),
      run(9, "complete", loadout("passiveExtraLife")),
    ];
    const ids = sortUpgradeRows(upgradeRows(runs, FINISHED), "medianReach").map((r) => r.id);
    expect(ids.slice(0, 3)).toEqual(["fruitFeast", "passiveGhostSlow", "passiveExtraLife"]);
  });
});
