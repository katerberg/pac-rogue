import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import {
  allSeenRecord,
  emptySeenRecord,
  parseLearnAllMode,
  parseSeenRecord,
  serializeSeenRecord,
  withSeenCorruption,
  withSeenGhosts,
  withSeenUpgrade,
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
      upgrades: ["passivePlayerSpeedUp", "bogus", "passivePlayerSpeedUp"],
    });
    expect(parseSeenRecord(raw)).toEqual({
      ghosts: [GHOST_KIND.blinky, GHOST_KIND.inky],
      corruptions: ["slimeTrail"],
      upgrades: ["passivePlayerSpeedUp"],
    });
    expect(parseSeenRecord(JSON.stringify({ ghosts: "x", corruptions: 3, upgrades: 3 }))).toEqual(
      emptySeenRecord(),
    );
  });

  it("parses a legacy record without an upgrades field as no upgrades seen", () => {
    const raw = JSON.stringify({ ghosts: [GHOST_KIND.blinky], corruptions: [] });
    expect(parseSeenRecord(raw)).toEqual({
      ghosts: [GHOST_KIND.blinky],
      corruptions: [],
      upgrades: [],
    });
  });

  it("round-trips through serialize", () => {
    const record = withSeenCorruption(
      withSeenGhosts(emptySeenRecord(), [GHOST_KIND.pinky]),
      "speedSurge",
    );
    expect(parseSeenRecord(serializeSeenRecord(record))).toEqual(record);
  });
});

describe("withSeenGhosts / withSeenCorruption / withSeenUpgrade", () => {
  it("returns the same reference when nothing is new", () => {
    const record = withSeenGhosts(emptySeenRecord(), [GHOST_KIND.blinky, GHOST_KIND.pinky]);
    expect(withSeenGhosts(record, [GHOST_KIND.pinky])).toBe(record);
    const withCorruption = withSeenCorruption(record, "falseScatter");
    expect(withSeenCorruption(withCorruption, "falseScatter")).toBe(withCorruption);
    const withUpgrade = withSeenUpgrade(record, "passivePlayerSpeedUp");
    expect(withSeenUpgrade(withUpgrade, "passivePlayerSpeedUp")).toBe(withUpgrade);
  });

  it("merges in canonical order", () => {
    const record = withSeenGhosts(withSeenGhosts(emptySeenRecord(), [GHOST_KIND.inky]), [
      GHOST_KIND.blinky,
    ]);
    expect(record.ghosts).toEqual([GHOST_KIND.blinky, GHOST_KIND.inky]);
    const corrupt = withSeenCorruption(withSeenCorruption(record, "falseScatter"), "slimeTrail");
    expect(corrupt.corruptions).toEqual(["slimeTrail", "falseScatter"]);
    const upgraded = withSeenUpgrade(
      withSeenUpgrade(record, "passiveGhostSlow"),
      "powerPelletFreeze",
    );
    expect(upgraded.upgrades).toEqual(["powerPelletFreeze", "passiveGhostSlow"]);
  });
});

describe("allSeenRecord / parseLearnAllMode", () => {
  it("covers every ghost, corruption, and upgrade", () => {
    const all = allSeenRecord();
    expect(all.ghosts).toHaveLength(4);
    expect(all.corruptions).toHaveLength(7);
    expect(all.upgrades).toHaveLength(20);
  });

  it("only accepts learnAll=1 or learnAll=0", () => {
    expect(parseLearnAllMode(new URLSearchParams("learnAll=1"))).toBe("all");
    expect(parseLearnAllMode(new URLSearchParams("learnAll=0"))).toBe("none");
    expect(parseLearnAllMode(new URLSearchParams(""))).toBeNull();
    expect(parseLearnAllMode(new URLSearchParams("learnAll=yes"))).toBeNull();
  });
});
