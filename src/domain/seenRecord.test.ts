import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { ALL_UPGRADE_IDS } from "./upgrades";
import {
  allSeenRecord,
  emptySeenRecord,
  learnGhostLabel,
  learnGhostUnlocked,
  learnSeenRecord,
  parseLearnAllMode,
  parseSeenRecord,
  serializeSeenRecord,
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
      upgrades: ["passiveAfterburner", "bogus", "passiveAfterburner"],
    });
    expect(parseSeenRecord(raw)).toEqual({
      ghosts: [GHOST_KIND.blinky, GHOST_KIND.inky],
      upgrades: ["passiveAfterburner"],
    });
    expect(parseSeenRecord(JSON.stringify({ ghosts: "x", upgrades: 3 }))).toEqual(
      emptySeenRecord(),
    );
  });

  it("parses a legacy record without an upgrades field as no upgrades seen", () => {
    const raw = JSON.stringify({ ghosts: [GHOST_KIND.blinky] });
    expect(parseSeenRecord(raw)).toEqual({ ghosts: [GHOST_KIND.blinky], upgrades: [] });
  });

  it("ignores and drops a legacy corruptions field", () => {
    const raw = JSON.stringify({
      ghosts: [GHOST_KIND.blinky],
      corruptions: ["slimeTrail", "falseScatter"],
      upgrades: ["passiveAfterburner"],
    });
    const parsed = parseSeenRecord(raw);
    expect(parsed).toEqual({ ghosts: [GHOST_KIND.blinky], upgrades: ["passiveAfterburner"] });
    expect(serializeSeenRecord(parsed)).not.toContain("corruptions");
  });

  it("round-trips through serialize", () => {
    const record = withSeenUpgrade(
      withSeenGhosts(emptySeenRecord(), [GHOST_KIND.pinky]),
      "powerPelletFreeze",
    );
    expect(parseSeenRecord(serializeSeenRecord(record))).toEqual(record);
  });
});

describe("withSeenUpgrade with enhanced ids", () => {
  it("records the base id for a Plus upgrade", () => {
    const seen = withSeenUpgrade(emptySeenRecord(), "passiveAfterburnerPlus");
    expect(seen.upgrades).toEqual(["passiveAfterburner"]);
    expect(withSeenUpgrade(seen, "passiveAfterburner")).toBe(seen);
  });
});
describe("withSeenGhosts / withSeenUpgrade", () => {
  it("returns the same reference when nothing is new", () => {
    const record = withSeenGhosts(emptySeenRecord(), [GHOST_KIND.blinky, GHOST_KIND.pinky]);
    expect(withSeenGhosts(record, [GHOST_KIND.pinky])).toBe(record);
    const withUpgrade = withSeenUpgrade(record, "passiveAfterburner");
    expect(withSeenUpgrade(withUpgrade, "passiveAfterburner")).toBe(withUpgrade);
  });

  it("merges in canonical order", () => {
    const record = withSeenGhosts(withSeenGhosts(emptySeenRecord(), [GHOST_KIND.inky]), [
      GHOST_KIND.blinky,
    ]);
    expect(record.ghosts).toEqual([GHOST_KIND.blinky, GHOST_KIND.inky]);
    const upgraded = withSeenUpgrade(
      withSeenUpgrade(record, "passiveGhostSlow"),
      "powerPelletFreeze",
    );
    expect(upgraded.upgrades).toEqual(["powerPelletFreeze", "passiveGhostSlow"]);
  });
});

describe("allSeenRecord / parseLearnAllMode", () => {
  it("covers every ghost and upgrade", () => {
    const all = allSeenRecord();
    expect(all.ghosts).toHaveLength(6);
    expect(all.upgrades).toHaveLength(ALL_UPGRADE_IDS.length);
  });

  it("only accepts learnAll=1 or learnAll=0", () => {
    expect(parseLearnAllMode(new URLSearchParams("learnAll=1"))).toBe("all");
    expect(parseLearnAllMode(new URLSearchParams("learnAll=0"))).toBe("none");
    expect(parseLearnAllMode(new URLSearchParams(""))).toBeNull();
    expect(parseLearnAllMode(new URLSearchParams("learnAll=yes"))).toBeNull();
  });
});

describe("learnSeenRecord", () => {
  const stored = () => ({ ghosts: [], upgrades: ["passiveAfterburner" as const] });

  it("learnAll=1 unlocks every ghost, learnAll=0 only Blinky, otherwise Blinky plus the stored ones", () => {
    const seenPinky = () => ({ ghosts: [GHOST_KIND.pinky], upgrades: [] });
    expect(learnSeenRecord("all", stored).ghosts).toEqual(allSeenRecord().ghosts);
    expect(learnSeenRecord("none", seenPinky).ghosts).toEqual([GHOST_KIND.blinky]);
    expect(learnSeenRecord(null, stored).ghosts).toEqual([GHOST_KIND.blinky]);
    expect(learnSeenRecord(null, seenPinky).ghosts).toEqual([GHOST_KIND.blinky, GHOST_KIND.pinky]);
  });

  it("names unseen ghosts ??? and keeps Blinky always unlocked", () => {
    const record = learnSeenRecord(null, () => ({ ghosts: [GHOST_KIND.inky], upgrades: [] }));
    expect(learnGhostUnlocked(record, GHOST_KIND.blinky)).toBe(true);
    expect(learnGhostUnlocked(record, GHOST_KIND.inky)).toBe(true);
    expect(learnGhostUnlocked(record, GHOST_KIND.clyde)).toBe(false);
    expect(learnGhostLabel(record, GHOST_KIND.inky)).toBe("INKY");
    expect(learnGhostLabel(record, GHOST_KIND.clyde)).toBe("???");
  });

  it("learnAll=0 lists no upgrades, learnAll=1 all, otherwise the stored ones", () => {
    expect(learnSeenRecord("none", stored).upgrades).toEqual([]);
    expect(learnSeenRecord("all", stored).upgrades).toEqual(allSeenRecord().upgrades);
    expect(learnSeenRecord(null, stored).upgrades).toEqual(["passiveAfterburner"]);
  });
});
