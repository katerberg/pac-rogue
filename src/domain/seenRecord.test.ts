import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import {
  allSeenRecord,
  emptySeenRecord,
  parseLearnAllFlag,
  parseSeenRecord,
  serializeSeenRecord,
  withSeenCorruption,
  withSeenGhosts,
} from "./seenRecord";

describe("parseSeenRecord", () => {
  it.each([null, "", "not json", "null", "42", '"str"', "[]"])(
    "falls back to empty for %j",
    (raw) => {
      expect(parseSeenRecord(raw)).toEqual(emptySeenRecord());
    },
  );

  it("drops unknown ids and duplicates, and ignores wrong types", () => {
    const raw = JSON.stringify({
      ghosts: [GHOST_KIND.inky, 99, GHOST_KIND.inky, "blinky", GHOST_KIND.blinky],
      corruptions: ["slimeTrail", "bogus", "slimeTrail"],
    });
    expect(parseSeenRecord(raw)).toEqual({
      ghosts: [GHOST_KIND.blinky, GHOST_KIND.inky],
      corruptions: ["slimeTrail"],
    });
    expect(parseSeenRecord(JSON.stringify({ ghosts: "x", corruptions: 3 }))).toEqual(
      emptySeenRecord(),
    );
  });

  it("round-trips through serialize", () => {
    const record = withSeenCorruption(
      withSeenGhosts(emptySeenRecord(), [GHOST_KIND.pinky]),
      "speedSurge",
    );
    expect(parseSeenRecord(serializeSeenRecord(record))).toEqual(record);
  });
});

describe("withSeenGhosts / withSeenCorruption", () => {
  it("returns the same reference when nothing is new", () => {
    const record = withSeenGhosts(emptySeenRecord(), [GHOST_KIND.blinky, GHOST_KIND.pinky]);
    expect(withSeenGhosts(record, [GHOST_KIND.pinky])).toBe(record);
    const withCorruption = withSeenCorruption(record, "falseScatter");
    expect(withSeenCorruption(withCorruption, "falseScatter")).toBe(withCorruption);
  });

  it("merges in canonical order", () => {
    const record = withSeenGhosts(withSeenGhosts(emptySeenRecord(), [GHOST_KIND.inky]), [
      GHOST_KIND.blinky,
    ]);
    expect(record.ghosts).toEqual([GHOST_KIND.blinky, GHOST_KIND.inky]);
    const corrupt = withSeenCorruption(withSeenCorruption(record, "falseScatter"), "slimeTrail");
    expect(corrupt.corruptions).toEqual(["slimeTrail", "falseScatter"]);
  });
});

describe("allSeenRecord / parseLearnAllFlag", () => {
  it("covers every ghost and corruption", () => {
    const all = allSeenRecord();
    expect(all.ghosts).toHaveLength(4);
    expect(all.corruptions).toHaveLength(7);
  });

  it("only accepts learnAll=1", () => {
    expect(parseLearnAllFlag(new URLSearchParams("learnAll=1"))).toBe(true);
    expect(parseLearnAllFlag(new URLSearchParams("learnAll=0"))).toBe(false);
    expect(parseLearnAllFlag(new URLSearchParams(""))).toBe(false);
  });
});
