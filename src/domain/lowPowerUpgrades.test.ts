import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { releaseAddsForKind, shouldReleaseSlot, createGhostReleaseClock } from "./ghostRelease";
import { RELEASE_SLOT, GHOST_ROSTERS } from "./ghostRoster";
import {
  LOW_POWER_DEFS,
  LOW_POWER_HOUSE_DELAY_MS,
  LOW_POWER_IDS,
  LOW_POWER_MAX_COPIES,
  LOW_POWER_OFFER_WEIGHT,
  LOW_POWER_MIN_SPEED_MUL,
  LOW_POWER_SLOWDOWN_CUT,
  LOW_POWER_SPEED_ADD,
  LOW_POWER_TUNNEL_SPEED_ADD,
  LOW_POWER_VORTEX_CUT,
  lowPowerCopyControls,
  lowPowerGhostSpeedMul,
  lowPowerHouseDelayMs,
  lowPowerPlayerSpeedMul,
  lowPowerPreTurnBonusPx,
  lowPowerTractionCopies,
  lowPowerTractionMul,
  lowPowerVortexMul,
} from "./lowPowerUpgrades";
import {
  ALL_UPGRADE_IDS,
  carryEnhancement,
  eligibleUpgrades,
  enhanceableUpgrades,
  getUpgradeDef,
  grantUpgrade,
  createRunUpgrades,
  ownedUpgradeStacks,
  pickUpgradeChoiceOffer,
  rareWeightForPool,
  storeUpgradeWeight,
  upgradeOfferWeight,
  revokeUpgrade,
  type UpgradeId,
} from "./upgrades";

const copies = (id: UpgradeId, n: number): UpgradeId[] => Array.from({ length: n }, () => id);
const [BLINKY_ROSTER] = GHOST_ROSTERS;

describe("low-power registry", () => {
  it("has a neutral, non-rare, non-enhanceable def for every id", () => {
    for (const def of LOW_POWER_DEFS) {
      expect(def.school).toBe("neutral");
      expect(def.rare).toBeUndefined();
      expect(def.isEnhanced).toBe(false);
      expect(ALL_UPGRADE_IDS).toContain(def.id);
      expect(getUpgradeDef(`${def.id}Plus` as UpgradeId)).toBeUndefined();
    }
    expect(LOW_POWER_IDS).toHaveLength(4 + 3 * 6);
  });

  it("is never offered an enhancement", () => {
    expect(enhanceableUpgrades(["lowSpeed", "lowSlowdownBlinky"])).toEqual([]);
    expect(carryEnhancement("passiveMolePlus", "lowSpeed")).toBe("lowSpeed");
    const offer = pickUpgradeChoiceOffer([], null, () => 0, 1, null, 9, BLINKY_ROSTER);
    expect(offer.enhanced.filter((id) => id.startsWith("low"))).toEqual([]);
  });
});

describe("low-power offer weight", () => {
  it("is a quarter of a normal upgrade's in level-clear and store draws", () => {
    expect(upgradeOfferWeight("lowSpeed", [], 0)).toBe(LOW_POWER_OFFER_WEIGHT);
    expect(upgradeOfferWeight("passiveMole", [], 0)).toBe(1);
    const pool = ["lowSpeed", "passiveMole"] as const;
    const weigh = storeUpgradeWeight([...pool]);
    expect(weigh("lowSpeed") / weigh("passiveMole")).toBe(0.25);
  });

  it("does not count towards the rare mass as a full common", () => {
    expect(rareWeightForPool(["fruitPowerPellet", "lowSpeed"], 0.1)).toBeLessThan(
      rareWeightForPool(["fruitPowerPellet", "passiveMole"], 0.1),
    );
  });
});

describe("low-power copy controls", () => {
  it("disables down at one copy and up at the cap", () => {
    expect(lowPowerCopyControls(1)).toEqual({ down: false, up: true });
    expect(lowPowerCopyControls(5)).toEqual({ down: true, up: true });
    expect(lowPowerCopyControls(LOW_POWER_MAX_COPIES)).toEqual({ down: true, up: false });
  });
});

describe("low-power stacking", () => {
  it("grants copies up to the cap and then stops", () => {
    let state = createRunUpgrades([]);
    for (let i = 0; i < LOW_POWER_MAX_COPIES + 2; i += 1) {
      state = grantUpgrade(state, "lowSpeed");
    }
    expect(state.owned).toHaveLength(LOW_POWER_MAX_COPIES);
  });

  it("stays eligible until the cap, and revokes every copy at once", () => {
    const owned = copies("lowSpeed", LOW_POWER_MAX_COPIES - 1);
    expect(eligibleUpgrades(owned)).toContain("lowSpeed");
    expect(eligibleUpgrades([...owned, "lowSpeed"])).not.toContain("lowSpeed");
    const after = revokeUpgrade({ ...createRunUpgrades([]), owned }, "lowSpeed");
    expect(after.owned).toEqual([]);
  });

  it("only offers a ghost's upgrades when it is in the roster", () => {
    const roster = [GHOST_KIND.blinky, GHOST_KIND.pinky];
    const pool = eligibleUpgrades([], { roster });
    expect(pool).toContain("lowSlowdownBlinky");
    expect(pool).toContain("lowTractionPinky");
    expect(pool).not.toContain("lowHouseDelayClyde");
    expect(eligibleUpgrades([])).not.toContain("lowSlowdownBlinky");
    expect(eligibleUpgrades([])).toContain("lowSpeed");
  });

  it("groups owned copies for the HUD", () => {
    expect(ownedUpgradeStacks(["lowSpeed", "passiveMole", "lowSpeed"])).toEqual([
      { id: "lowSpeed", copies: 2 },
      { id: "passiveMole", copies: 1 },
    ]);
  });
});

describe("low-power effects", () => {
  it("adds player speed per copy, and tunnel speed only in a tunnel", () => {
    expect(lowPowerPlayerSpeedMul([], false)).toBe(1);
    expect(lowPowerPlayerSpeedMul(copies("lowSpeed", 3), false)).toBeCloseTo(
      1 + 3 * LOW_POWER_SPEED_ADD,
    );
    const tunnel = copies("lowTunnelSpeed", 2);
    expect(lowPowerPlayerSpeedMul(tunnel, false)).toBe(1);
    expect(lowPowerPlayerSpeedMul(tunnel, true)).toBeCloseTo(1 + 2 * LOW_POWER_TUNNEL_SPEED_ADD);
  });

  it("slows only the named ghost, and floors at the minimum multiplier", () => {
    const owned = copies("lowSlowdownClyde", 2);
    expect(lowPowerGhostSpeedMul(owned, GHOST_KIND.clyde)).toBeCloseTo(
      1 - 2 * LOW_POWER_SLOWDOWN_CUT,
    );
    expect(lowPowerGhostSpeedMul(owned, GHOST_KIND.blinky)).toBe(1);
    expect(lowPowerGhostSpeedMul(copies("lowSlowdownClyde", 100), GHOST_KIND.clyde)).toBe(
      LOW_POWER_MIN_SPEED_MUL,
    );
  });

  it("cuts ghost tunnel speed, widens the turn window and drags per ghost", () => {
    expect(lowPowerVortexMul(copies("lowTunnelVortex", 2))).toBeCloseTo(
      1 - 2 * LOW_POWER_VORTEX_CUT,
    );
    expect(lowPowerPreTurnBonusPx([])).toBe(0);
    expect(lowPowerPreTurnBonusPx(copies("lowTurning", 2))).toBeGreaterThan(0);
    const owned = copies("lowTractionInky", 2);
    expect(lowPowerTractionCopies(owned, GHOST_KIND.inky)).toBe(2);
    expect(lowPowerTractionCopies(owned, GHOST_KIND.blinky)).toBe(0);
    expect(lowPowerTractionMul(2)).toBeLessThan(1);
  });

  it("delays only the named ghost's release, in time and in pellets", () => {
    const owned = copies("lowHouseDelayBlinky", 2);
    expect(lowPowerHouseDelayMs(owned, GHOST_KIND.blinky)).toBe(2 * LOW_POWER_HOUSE_DELAY_MS);
    expect(lowPowerHouseDelayMs(owned, GHOST_KIND.pinky)).toBe(0);
    const kindAdds = (kind: number) => ({
      delayMs: lowPowerHouseDelayMs(owned, kind as 0),
      pellets: kind === GHOST_KIND.blinky ? 2 : 0,
    });
    const clock = { ...createGhostReleaseClock(1), started: true, elapsedMs: 1000 };
    const plain = shouldReleaseSlot(RELEASE_SLOT.anchor, clock, 0, false, {});
    expect(plain).toBe(true);
    const delayed = releaseAddsForKind({ kindAdds }, GHOST_KIND.blinky);
    expect(shouldReleaseSlot(RELEASE_SLOT.anchor, clock, 0, false, delayed)).toBe(false);
    const other = releaseAddsForKind({ kindAdds }, GHOST_KIND.pinky);
    expect(shouldReleaseSlot(RELEASE_SLOT.anchor, clock, 0, false, other)).toBe(true);
    const dotted = shouldReleaseSlot(RELEASE_SLOT.flank, clock, 0, false, delayed);
    expect(dotted).toBe(false);
  });
});
