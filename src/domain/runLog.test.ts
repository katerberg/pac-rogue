import { describe, expect, it } from "vitest";
import {
  addLoadout,
  beginLevelLog,
  createRunLog,
  didWrap,
  finishRun,
  isNearMiss,
  notePace,
  parseRunLogRecord,
  removeLoadout,
  RUN_LOG_SOFT_CAP,
  runLogOverrun,
  syntheticRunLog,
  TEST_RUN_LOG_META,
} from "./runLog";

function levelOf() {
  const record = createRunLog(TEST_RUN_LOG_META, "seed", false);
  return beginLevelLog(record, {
    level: 1,
    layout: "maze1",
    inverted: false,
    boss: false,
    countdownStart: 999,
    livesStart: 3,
  });
}

describe("runLog", () => {
  it("creates an in-progress record", () => {
    const record = createRunLog(TEST_RUN_LOG_META, "abc", true);
    expect(record).toMatchObject({
      version: 1,
      outcome: "inProgress",
      endedAt: null,
      debug: true,
      seed: "abc",
    });
  });

  it("finishes only once, from in-progress", () => {
    const record = createRunLog(TEST_RUN_LOG_META, "abc", false);
    expect(finishRun(record, "death")).toBe(true);
    expect(finishRun(record, "quit")).toBe(false);
    expect(record.outcome).toBe("death");
  });

  it("fills each pace mark once, including several in one jump", () => {
    const level = levelOf();
    notePace(level, 10, 100, 1000, 900);
    expect(level.pace.p25).toBeNull();
    notePace(level, 60, 100, 2000, 800);
    expect(level.pace).toMatchObject({
      p25: { simMs: 2000, countdown: 800 },
      p50: { simMs: 2000, countdown: 800 },
      p75: null,
    });
    notePace(level, 100, 100, 3000, 700);
    notePace(level, 100, 100, 4000, 600);
    expect(level.pace.p100).toEqual({ simMs: 3000, countdown: 700 });
  });

  it("tracks a swap in the loadout timeline", () => {
    const record = createRunLog(TEST_RUN_LOG_META, "abc", false);
    addLoadout(record, "passiveGhostSlow", "start", 1);
    removeLoadout(record, "passiveGhostSlow", 5);
    addLoadout(record, "passiveExtraLife", "store", 5);
    expect(record.loadout).toEqual([
      { id: "passiveGhostSlow", source: "start", level: 1, removedLevel: 5 },
      { id: "passiveExtraLife", source: "store", level: 5 },
    ]);
  });

  it("detects a wrap only for a jump over half the span", () => {
    expect(didWrap(2, 446, 448)).toBe(true);
    expect(didWrap(100, 102, 448)).toBe(false);
  });

  it("counts a near miss up to one tile", () => {
    expect(isNearMiss(16, 16)).toBe(true);
    expect(isNearMiss(16.1, 16)).toBe(false);
  });

  it("overruns at the soft cap or after a quota failure", () => {
    expect(runLogOverrun(RUN_LOG_SOFT_CAP - 1, false)).toBe(false);
    expect(runLogOverrun(RUN_LOG_SOFT_CAP, false)).toBe(true);
    expect(runLogOverrun(0, true)).toBe(true);
  });

  it("varies synthetic runs across levels, outcomes and loadouts", () => {
    const runs = Array.from({ length: 90 }, (_, i) => syntheticRunLog(i, TEST_RUN_LOG_META));
    expect(new Set(runs.map((run) => run.finalLevel)).size).toBe(9);
    expect(runs.some((run) => run.outcome === "complete")).toBe(true);
    expect(runs.every((run) => run.debug && run.loadout.length === 2)).toBe(true);
    expect(runs.every((run) => run.levels.length === run.finalLevel)).toBe(true);
  });

  it("round-trips a record and rejects garbage or other versions", () => {
    const record = syntheticRunLog(1, TEST_RUN_LOG_META);
    expect(parseRunLogRecord(JSON.stringify(record))).toEqual(record);
    expect(parseRunLogRecord("not json")).toBeNull();
    expect(parseRunLogRecord(null)).toBeNull();
    expect(parseRunLogRecord(JSON.stringify({ ...record, version: 2 }))).toBeNull();
    expect(parseRunLogRecord(JSON.stringify({ ...record, levels: undefined }))).toBeNull();
  });
});
