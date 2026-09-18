import { describe, expect, it } from "vitest";
import {
  FREEZE_MS,
  GHOST_HOUSE_CLYDE_PELLET_ADD,
  GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
  GHOST_SLOW_MUL,
  PICKUP_RANGE_BONUS_PX,
  PLAYER_SPEED_BURST_MUL,
  PLAYER_SPEED_UP_MUL,
  SCATTER_BURST_MS,
  SPEED_BURST_MS,
  applyPowerPelletEffects,
  confirmUpgradeChoice,
  createRunUpgrades,
  eligibleUpgrades,
  ghostsAreFrozen,
  ghostHouseClydePelletAdd,
  ghostHouseReleaseDelayAddMs,
  grantUpgrade,
  grantLivesForUpgrade,
  parseEnableUpgradeParams,
  parseUpgradeId,
  pickUpgradeChoiceOffer,
  pelletCollectRadiusBonusPx,
  playerSpeedMultiplier,
  ghostSpeedMultiplier,
  scatterBurstActive,
  speedBurstActive,
  tickFreeze,
  tickScatterBurst,
  tickSpeedBurst,
  upgradeLabels,
  type RunUpgrades,
  type UpgradeId,
} from "./upgrades";
import { TILE_SIZE } from "./maze";

const ALL_IDS: UpgradeId[] = [
  "powerPelletFreeze",
  "playerSpeedUp",
  "ghostSlow",
  "scatterBurst",
  "ghostRecall",
  "warpTop",
  "pickupRange",
  "ghostHouseDelay",
  "extraLife",
  "pelletToPower",
  "powerCollectThree",
  "powerWallPass",
  "powerSpeedBurst",
  "powerInvuln",
];

const STUB_IDS: UpgradeId[] = ["powerCollectThree", "powerWallPass", "powerInvuln"];

function withForce(forceNextId: UpgradeId | null, owned: UpgradeId[] = []): RunUpgrades {
  return { ...createRunUpgrades(forceNextId), owned };
}

describe("parseUpgradeId", () => {
  it("parses known ids and rejects invalid", () => {
    expect(parseUpgradeId("ghostSlow")).toBe("ghostSlow");
    expect(parseUpgradeId("playerSpeedUp")).toBe("playerSpeedUp");
    expect(parseUpgradeId("powerPelletFreeze")).toBe("powerPelletFreeze");
    expect(parseUpgradeId("scatterBurst")).toBe("scatterBurst");
    expect(parseUpgradeId("ghostRecall")).toBe("ghostRecall");
    expect(parseUpgradeId("warpTop")).toBe("warpTop");
    expect(parseUpgradeId("powerSpeedBurst")).toBe("powerSpeedBurst");
    for (const id of STUB_IDS) {
      expect(parseUpgradeId(id)).toBe(id);
    }
    expect(parseUpgradeId("nope")).toBeNull();
    expect(parseUpgradeId(null)).toBeNull();
    expect(parseUpgradeId("")).toBeNull();
  });
});

describe("parseEnableUpgradeParams / createRunUpgrades enabled", () => {
  it("collects all valid enableUpgrade values in order", () => {
    const params = new URLSearchParams(
      "enableUpgrade=ghostSlow&enableUpgrade=nope&enableUpgrade=playerSpeedUp&enableUpgrade=ghostSlow",
    );
    expect(parseEnableUpgradeParams(params)).toEqual(["ghostSlow", "playerSpeedUp", "ghostSlow"]);
  });

  it("returns empty when missing", () => {
    expect(parseEnableUpgradeParams(new URLSearchParams())).toEqual([]);
  });

  it("seeds owned immediately and dedupes via grant", () => {
    const state = createRunUpgrades(null, ["powerPelletFreeze", "ghostSlow", "powerPelletFreeze"]);
    expect(state.owned).toEqual(["powerPelletFreeze", "ghostSlow"]);
    expect(state.forceNextId).toBeNull();
    expect(state.lastDeclinedUpgradeId).toBeNull();
    expect(state.scatterBurstRemainingMs).toBe(0);
    expect(state.speedBurstRemainingMs).toBe(0);
  });
});

describe("pickUpgradeChoiceOffer / confirmUpgradeChoice", () => {
  it("returns null when pool empty", () => {
    expect(pickUpgradeChoiceOffer(ALL_IDS, null, () => 0, null)).toBeNull();
  });

  it("returns a single option when only one eligible", () => {
    const owned = ALL_IDS.filter((id) => id !== "warpTop");
    expect(pickUpgradeChoiceOffer(owned, null, () => 0, null)).toEqual(["warpTop"]);
  });

  it("returns two distinct unowned options", () => {
    const options = pickUpgradeChoiceOffer([], null, () => 0, null);
    expect(options).not.toBeNull();
    expect(options!).toHaveLength(2);
    expect(new Set(options!).size).toBe(2);
    for (const id of options!) {
      expect(ALL_IDS).toContain(id);
    }
  });

  it("excludes lastDeclined when enough eligible remain", () => {
    const options = pickUpgradeChoiceOffer([], "ghostSlow", () => 0, null);
    expect(options).not.toBeNull();
    expect(options!).not.toContain("ghostSlow");
    expect(options!).toHaveLength(2);
  });

  it("re-includes lastDeclined when needed to form a pair", () => {
    const owned = ALL_IDS.filter((id) => id !== "ghostSlow" && id !== "warpTop");
    const options = pickUpgradeChoiceOffer(owned, "ghostSlow", () => 0, null);
    expect(options).toEqual(expect.arrayContaining(["ghostSlow", "warpTop"]));
    expect(options!).toHaveLength(2);
  });

  it("always includes force when eligible", () => {
    const options = pickUpgradeChoiceOffer([], null, () => 0.99, "ghostRecall");
    expect(options).not.toBeNull();
    expect(options!).toContain("ghostRecall");
    expect(options!).toHaveLength(2);
  });

  it("still includes force when that id was last declined", () => {
    const options = pickUpgradeChoiceOffer([], "ghostRecall", () => 0, "ghostRecall");
    expect(options).not.toBeNull();
    expect(options!).toContain("ghostRecall");
    expect(options!).toHaveLength(2);
    expect(new Set(options!).size).toBe(2);
  });

  it("confirm grants chosen, sets declined, clears force", () => {
    const state = withForce("playerSpeedUp");
    const options: UpgradeId[] = ["playerSpeedUp", "ghostSlow"];
    const next = confirmUpgradeChoice(state, options, "playerSpeedUp");
    expect(next.owned).toEqual(["playerSpeedUp"]);
    expect(next.forceNextId).toBeNull();
    expect(next.lastDeclinedUpgradeId).toBe("ghostSlow");
  });

  it("confirm with one option leaves lastDeclined unchanged", () => {
    const state = {
      ...createRunUpgrades(),
      lastDeclinedUpgradeId: "ghostSlow" as UpgradeId,
    };
    const next = confirmUpgradeChoice(state, ["warpTop"], "warpTop");
    expect(next.owned).toEqual(["warpTop"]);
    expect(next.lastDeclinedUpgradeId).toBe("ghostSlow");
  });
});

describe("eligibleUpgrades", () => {
  it("excludes owned ids", () => {
    expect(eligibleUpgrades([])).toEqual(ALL_IDS);
    expect(eligibleUpgrades(["playerSpeedUp"])).toEqual(
      ALL_IDS.filter((id) => id !== "playerSpeedUp"),
    );
    expect(eligibleUpgrades(ALL_IDS)).toEqual([]);
  });
});

describe("grantUpgrade", () => {
  it("is idempotent for already owned", () => {
    const once = grantUpgrade(createRunUpgrades(), "ghostSlow");
    expect(grantUpgrade(once, "ghostSlow")).toEqual(once);
  });

  it("grants stub ids with no power-pellet side effects", () => {
    let state = createRunUpgrades();
    for (const id of STUB_IDS) {
      state = grantUpgrade(state, id);
    }
    expect(state.owned).toEqual(STUB_IDS);
    expect(applyPowerPelletEffects(state, 1)).toEqual({
      state,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
    });
    expect(playerSpeedMultiplier(state.owned)).toBe(1);
    expect(ghostSpeedMultiplier(state.owned)).toBe(1);
  });

  it("extraLife grants lives delta without power-pellet effects", () => {
    expect(grantLivesForUpgrade("extraLife")).toBe(1);
    expect(grantLivesForUpgrade("ghostSlow")).toBe(0);
    const owned = grantUpgrade(createRunUpgrades(), "extraLife");
    expect(applyPowerPelletEffects(owned, 1)).toEqual({
      state: owned,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
    });
  });

  it("ghostHouseDelay sums release delay and Clyde pellet adds", () => {
    expect(ghostHouseReleaseDelayAddMs([])).toBe(0);
    expect(ghostHouseClydePelletAdd([])).toBe(0);
    expect(ghostHouseReleaseDelayAddMs(["ghostHouseDelay"])).toBe(GHOST_HOUSE_RELEASE_DELAY_ADD_MS);
    expect(ghostHouseClydePelletAdd(["ghostHouseDelay"])).toBe(GHOST_HOUSE_CLYDE_PELLET_ADD);
    expect(ghostHouseReleaseDelayAddMs(["ghostSlow", "ghostHouseDelay"])).toBe(
      GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
    );
    expect(ghostHouseClydePelletAdd(["playerSpeedUp"])).toBe(0);
  });
});

describe("freeze / power pellet", () => {
  it("ticks freeze down and expires", () => {
    const started = { ...createRunUpgrades(), freezeRemainingMs: FREEZE_MS };
    expect(ghostsAreFrozen(started)).toBe(true);
    const mid = tickFreeze(started, 1000);
    expect(mid.freezeRemainingMs).toBe(2000);
    const done = tickFreeze(mid, 2500);
    expect(done.freezeRemainingMs).toBe(0);
    expect(ghostsAreFrozen(done)).toBe(false);
  });

  it("applies freeze only when upgrade owned and refreshes to full", () => {
    const bare = createRunUpgrades();
    expect(applyPowerPelletEffects(bare, 1)).toEqual({
      state: bare,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
    });

    const owned = grantUpgrade(createRunUpgrades(), "powerPelletFreeze");
    const frozen = applyPowerPelletEffects(owned, 1);
    expect(frozen.state.freezeRemainingMs).toBe(FREEZE_MS);
    expect(frozen.recallClosestGhost).toBe(false);
    expect(frozen.warpPlayerTopCenter).toBe(false);

    const partial = { ...frozen.state, freezeRemainingMs: 500 };
    expect(applyPowerPelletEffects(partial, 2).state.freezeRemainingMs).toBe(FREEZE_MS);
  });

  it("powerRemoved zero is a no-op", () => {
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletFreeze");
    expect(applyPowerPelletEffects(owned, 0)).toEqual({
      state: owned,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
    });
  });
});

describe("scatter burst / multi power-pellet effects", () => {
  it("ticks scatter burst down and expires", () => {
    const started = { ...createRunUpgrades(), scatterBurstRemainingMs: SCATTER_BURST_MS };
    expect(scatterBurstActive(started)).toBe(true);
    const mid = tickScatterBurst(started, 1000);
    expect(mid.scatterBurstRemainingMs).toBe(2000);
    const done = tickScatterBurst(mid, 2500);
    expect(done.scatterBurstRemainingMs).toBe(0);
    expect(scatterBurstActive(done)).toBe(false);
  });

  it("applies scatter burst when owned and refreshes", () => {
    const owned = grantUpgrade(createRunUpgrades(), "scatterBurst");
    const applied = applyPowerPelletEffects(owned, 1);
    expect(applied.state.scatterBurstRemainingMs).toBe(SCATTER_BURST_MS);
    const partial = { ...applied.state, scatterBurstRemainingMs: 100 };
    expect(applyPowerPelletEffects(partial, 1).state.scatterBurstRemainingMs).toBe(
      SCATTER_BURST_MS,
    );
  });

  it("fires all owned power-pellet effects together", () => {
    let state = createRunUpgrades();
    for (const id of [
      "powerPelletFreeze",
      "scatterBurst",
      "powerSpeedBurst",
      "ghostRecall",
      "warpTop",
    ] as const) {
      state = grantUpgrade(state, id);
    }
    const result = applyPowerPelletEffects(state, 1);
    expect(result.state.freezeRemainingMs).toBe(FREEZE_MS);
    expect(result.state.scatterBurstRemainingMs).toBe(SCATTER_BURST_MS);
    expect(result.state.speedBurstRemainingMs).toBe(SPEED_BURST_MS);
    expect(result.recallClosestGhost).toBe(true);
    expect(result.warpPlayerTopCenter).toBe(true);
  });

  it("sets recall and warp flags from owned defs", () => {
    const recall = applyPowerPelletEffects(grantUpgrade(createRunUpgrades(), "ghostRecall"), 1);
    expect(recall.recallClosestGhost).toBe(true);
    expect(recall.warpPlayerTopCenter).toBe(false);

    const warp = applyPowerPelletEffects(grantUpgrade(createRunUpgrades(), "warpTop"), 1);
    expect(warp.recallClosestGhost).toBe(false);
    expect(warp.warpPlayerTopCenter).toBe(true);
  });
});

describe("speed burst / power pellet", () => {
  it("ticks speed burst down and expires", () => {
    const started = { ...createRunUpgrades(), speedBurstRemainingMs: SPEED_BURST_MS };
    expect(speedBurstActive(started)).toBe(true);
    const mid = tickSpeedBurst(started, 1000);
    expect(mid.speedBurstRemainingMs).toBe(2000);
    const done = tickSpeedBurst(mid, 2500);
    expect(done.speedBurstRemainingMs).toBe(0);
    expect(speedBurstActive(done)).toBe(false);
  });

  it("applies speed burst only when upgrade owned and refreshes to full", () => {
    const bare = createRunUpgrades();
    expect(applyPowerPelletEffects(bare, 1).state.speedBurstRemainingMs).toBe(0);

    const owned = grantUpgrade(createRunUpgrades(), "powerSpeedBurst");
    const applied = applyPowerPelletEffects(owned, 1);
    expect(applied.state.speedBurstRemainingMs).toBe(SPEED_BURST_MS);

    const partial = { ...applied.state, speedBurstRemainingMs: 500 };
    expect(applyPowerPelletEffects(partial, 2).state.speedBurstRemainingMs).toBe(SPEED_BURST_MS);
  });

  it("composes burst mul with passive Speed Up only while active", () => {
    const burstOnly = {
      ...grantUpgrade(createRunUpgrades(), "powerSpeedBurst"),
      speedBurstRemainingMs: SPEED_BURST_MS,
    };
    expect(playerSpeedMultiplier(burstOnly.owned)).toBe(1);
    expect(
      playerSpeedMultiplier(burstOnly.owned) *
        (speedBurstActive(burstOnly) ? PLAYER_SPEED_BURST_MUL : 1),
    ).toBe(PLAYER_SPEED_BURST_MUL);

    let both = grantUpgrade(createRunUpgrades(), "powerSpeedBurst");
    both = grantUpgrade(both, "playerSpeedUp");
    both = { ...both, speedBurstRemainingMs: SPEED_BURST_MS };
    expect(playerSpeedMultiplier(both.owned)).toBe(PLAYER_SPEED_UP_MUL);
    expect(
      playerSpeedMultiplier(both.owned) * (speedBurstActive(both) ? PLAYER_SPEED_BURST_MUL : 1),
    ).toBe(PLAYER_SPEED_UP_MUL * PLAYER_SPEED_BURST_MUL);

    const expired = { ...both, speedBurstRemainingMs: 0 };
    expect(
      playerSpeedMultiplier(expired.owned) *
        (speedBurstActive(expired) ? PLAYER_SPEED_BURST_MUL : 1),
    ).toBe(PLAYER_SPEED_UP_MUL);
  });
});

describe("speed multipliers / labels", () => {
  it("multiplies owned speed defs", () => {
    expect(playerSpeedMultiplier([])).toBe(1);
    expect(playerSpeedMultiplier(["playerSpeedUp"])).toBe(PLAYER_SPEED_UP_MUL);
    expect(ghostSpeedMultiplier(["ghostSlow"])).toBe(GHOST_SLOW_MUL);
    expect(ghostSpeedMultiplier(["playerSpeedUp"])).toBe(1);
  });

  it("maps owned ids to labels in order", () => {
    expect(upgradeLabels(["ghostSlow", "playerSpeedUp", "scatterBurst"])).toEqual([
      "Ghost Slow",
      "Speed Up",
      "Scatter Burst",
    ]);
  });
});

describe("pelletCollectRadiusBonusPx", () => {
  it("returns TILE_SIZE for pickupRange and 0 otherwise", () => {
    expect(pelletCollectRadiusBonusPx([])).toBe(0);
    expect(pelletCollectRadiusBonusPx(["pickupRange"])).toBe(PICKUP_RANGE_BONUS_PX);
    expect(PICKUP_RANGE_BONUS_PX).toBe(TILE_SIZE);
    expect(pelletCollectRadiusBonusPx(["playerSpeedUp"])).toBe(0);
  });
});
