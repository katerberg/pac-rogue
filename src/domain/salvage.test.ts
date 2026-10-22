import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { randomFromSeed } from "./mazeTiling";
import {
  canSalvage,
  isAtCap,
  needsSalvage,
  rollTrinket,
  salvageNew,
  salvageUpgrade,
} from "./salvage";
import {
  TRINKET_IDS,
  TRINKET_MAX_COPIES,
  isTrinketId,
  slotCount,
  trinketEligible,
} from "./trinkets";
import { MAX_RUN_UPGRADES, createRunUpgrades, type UpgradeId } from "./upgrades";

const ROSTER = [GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky, GHOST_KIND.clyde];
const SIX: UpgradeId[] = [
  "powerPelletFreeze",
  "passiveAfterburner",
  "passiveGhostSlow",
  "powerPelletScatterBurst",
  "powerPelletGhostRecall",
  "powerPelletWarpFarthest",
];

describe("slot count and cap", () => {
  it("ignores Trinkets and counts a Plus once", () => {
    expect(slotCount(["powerPelletFreezePlus", "lowSpeed", "lowSpeed", "lowTurning"])).toBe(1);
  });

  it("is at the cap from 6 normal upgrades, whatever the Trinkets", () => {
    expect(MAX_RUN_UPGRADES).toBe(6);
    expect(isAtCap([...SIX.slice(0, 5), "lowSpeed", "lowSpeed"])).toBe(false);
    expect(isAtCap(SIX)).toBe(true);
    expect(isAtCap([...SIX, "passiveExtraLife"])).toBe(true);
  });

  it("only prompts for a non-Trinket at the cap", () => {
    expect(needsSalvage(SIX.slice(0, 5), "passiveExtraLife")).toBe(false);
    expect(needsSalvage(SIX, "passiveExtraLife")).toBe(true);
    expect(needsSalvage(SIX, "lowSpeed")).toBe(false);
  });

  it("never salvages a Trinket or an unowned upgrade", () => {
    expect(canSalvage(["lowSpeed", "powerPelletFreezePlus"], "lowSpeed")).toBe(false);
    expect(canSalvage(["lowSpeed"], "powerPelletFreeze")).toBe(false);
    expect(canSalvage(["powerPelletFreezePlus"], "powerPelletFreezePlus")).toBe(true);
  });
});

describe("rollTrinket", () => {
  it("draws every eligible Trinket and replays by seed", () => {
    const seen = new Set<UpgradeId>();
    const rng = randomFromSeed("salvage-roll");
    for (let i = 0; i < 2000; i += 1) {
      seen.add(rollTrinket([], ROSTER, rng)!);
    }
    const eligible = TRINKET_IDS.filter((id) => trinketEligible([], id, ROSTER));
    expect([...seen].sort()).toEqual([...eligible].sort());
    const a = randomFromSeed("same");
    const b = randomFromSeed("same");
    expect(rollTrinket([], ROSTER, a)).toBe(rollTrinket([], ROSTER, b));
  });

  it("skips Trinkets at the copy cap and returns null when none are left", () => {
    const maxed = TRINKET_IDS.flatMap((id) =>
      Array.from({ length: TRINKET_MAX_COPIES }, () => id as UpgradeId),
    );
    expect(rollTrinket(maxed, ROSTER, randomFromSeed("x"))).toBeNull();
    const oneLeft = maxed.filter((id, i) => id !== "lowSpeed" || i > 0);
    expect(rollTrinket(oneLeft, ROSTER, randomFromSeed("x"))).toBe("lowSpeed");
  });
});

describe("salvage", () => {
  it("swaps an owned upgrade for one Trinket and clears its timer", () => {
    const state = { ...createRunUpgrades(SIX), freezeRemainingMs: 3000, frozenGhostEid: 4 };
    const result = salvageUpgrade(state, "powerPelletFreeze", ROSTER, randomFromSeed("s"));
    expect(result.quarters).toBe(0);
    expect(isTrinketId(result.gained!)).toBe(true);
    expect(result.state.owned).toEqual([...SIX.slice(1), result.gained]);
    expect(result.state).toMatchObject({ freezeRemainingMs: 0, frozenGhostEid: null });
  });

  it("rejects a Trinket or unowned id without a change", () => {
    const state = createRunUpgrades(["powerPelletFreeze", "lowSpeed"]);
    for (const id of ["lowSpeed", "passiveExtraLife"] as const) {
      expect(salvageUpgrade(state, id, ROSTER, randomFromSeed("r"))).toEqual({
        state,
        gained: null,
        quarters: 0,
      });
    }
  });

  it("pays a Quarter when no Trinket is eligible", () => {
    const maxed = TRINKET_IDS.flatMap((id) =>
      Array.from({ length: TRINKET_MAX_COPIES }, () => id as UpgradeId),
    );
    const state = createRunUpgrades(["powerPelletFreeze", ...maxed]);
    const result = salvageUpgrade(state, "powerPelletFreeze", ROSTER, randomFromSeed("q"));
    expect(result).toMatchObject({ gained: null, quarters: 1 });
    expect(result.state.owned).toEqual(maxed);
  });

  it("salvaging the new card keeps the six and adds a Trinket", () => {
    const result = salvageNew(createRunUpgrades(SIX), ROSTER, randomFromSeed("n"));
    expect(result.state.owned.slice(0, 6)).toEqual(SIX);
    expect(slotCount(result.state.owned)).toBe(6);
    expect(isTrinketId(result.gained!)).toBe(true);
  });
});
