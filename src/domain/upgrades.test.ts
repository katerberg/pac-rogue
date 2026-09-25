import { describe, expect, it } from "vitest";
import {
  FREEZE_MS,
  GHOST_HOUSE_CLYDE_PELLET_ADD,
  GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
  GHOST_SLOW_MUL,
  INVULN_MS,
  OVERCHARGE_MUL,
  PLAYER_SPEED_BURST_MUL,
  PLAYER_SPEED_UP_MUL,
  POWER_COLLECT_THREE_COUNT,
  QUARTER_BOUNTY_MUL,
  SCATTER_BURST_MS,
  SPEED_BURST_MS,
  WALL_PASS_MS,
  QUARTERS_CHOICE_AMOUNT,
  applyPowerPelletEffects,
  confirmUpgradeChoice,
  createRunUpgrades,
  declineUpgrades,
  eligibleUpgrades,
  fruitQuarterMultiplier,
  frozenGhostEid,
  ghostHouseClydePelletAdd,
  ghostHouseReleaseDelayAddMs,
  ghostSpeedMultiplier,
  grantUpgrade,
  grantLivesForUpgrade,
  revokeUpgrade,
  parseDisableLevelUpgradesFlag,
  parseEnableUpgradeParams,
  parseUpgradeId,
  pickStartingUpgrade,
  pickUpgradeChoiceOffer,
  pelletCollectRadiusBonusPx,
  pickupRangeBonusPx,
  playerIsInvulnerable,
  playerSpeedMultiplier,
  queuePowerPelletRespawns,
  scatterBurstActive,
  SECOND_CHOMP_MS,
  speedBurstActive,
  tickFreeze,
  tickInvuln,
  tickPowerPelletRespawns,
  tickScatterBurst,
  tickSpeedBurst,
  tickWallPass,
  upgradeLabels,
  wallPassActive,
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
  "fruitPower",
  "quarterBounty",
  "deathsHarvest",
  "overcharge",
  "tunnelDash",
  "secondChomp",
];

const STUB_IDS: UpgradeId[] = [
  "fruitPower",
  "deathsHarvest",
  "overcharge",
  "tunnelDash",
  "secondChomp",
];

describe("parseUpgradeId", () => {
  it("parses known ids and rejects invalid", () => {
    expect(parseUpgradeId("ghostSlow")).toBe("ghostSlow");
    expect(parseUpgradeId("playerSpeedUp")).toBe("playerSpeedUp");
    expect(parseUpgradeId("powerPelletFreeze")).toBe("powerPelletFreeze");
    expect(parseUpgradeId("scatterBurst")).toBe("scatterBurst");
    expect(parseUpgradeId("ghostRecall")).toBe("ghostRecall");
    expect(parseUpgradeId("warpTop")).toBe("warpTop");
    expect(parseUpgradeId("powerCollectThree")).toBe("powerCollectThree");
    expect(parseUpgradeId("powerSpeedBurst")).toBe("powerSpeedBurst");
    expect(parseUpgradeId("powerWallPass")).toBe("powerWallPass");
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
    const state = createRunUpgrades(["powerPelletFreeze", "ghostSlow", "powerPelletFreeze"]);
    expect(state.owned).toEqual(["powerPelletFreeze", "ghostSlow"]);
    expect(state.lastDeclinedUpgradeId).toBeNull();
    expect(state.scatterBurstRemainingMs).toBe(0);
    expect(state.speedBurstRemainingMs).toBe(0);
  });
});

describe("parseDisableLevelUpgradesFlag", () => {
  it("only accepts disableLevelUpgrades=1", () => {
    expect(parseDisableLevelUpgradesFlag(new URLSearchParams("disableLevelUpgrades=1"))).toBe(true);
    expect(parseDisableLevelUpgradesFlag(new URLSearchParams("disableLevelUpgrades=0"))).toBe(
      false,
    );
    expect(parseDisableLevelUpgradesFlag(new URLSearchParams())).toBe(false);
  });
});

describe("pickUpgradeChoiceOffer / confirmUpgradeChoice", () => {
  it("always offers quarters, with an empty upgrade pool when none are eligible", () => {
    const offer = pickUpgradeChoiceOffer(ALL_IDS, null, () => 0);
    expect(offer.quarters).toBe(QUARTERS_CHOICE_AMOUNT);
    expect(offer.upgrades).toEqual([]);
  });

  it("returns a single upgrade option when only one eligible", () => {
    const owned = ALL_IDS.filter((id) => id !== "warpTop");
    const offer = pickUpgradeChoiceOffer(owned, null, () => 0);
    expect(offer.upgrades).toEqual(["warpTop"]);
  });

  it("returns up to three distinct unowned upgrade options", () => {
    const offer = pickUpgradeChoiceOffer([], null, () => 0);
    expect(offer.upgrades).toHaveLength(3);
    expect(new Set(offer.upgrades).size).toBe(3);
    for (const id of offer.upgrades) {
      expect(ALL_IDS).toContain(id);
    }
  });

  it("excludes lastDeclined when enough eligible remain", () => {
    const offer = pickUpgradeChoiceOffer([], "ghostSlow", () => 0);
    expect(offer.upgrades).not.toContain("ghostSlow");
    expect(offer.upgrades).toHaveLength(3);
  });

  it("re-includes lastDeclined when needed to fill the offer", () => {
    const owned = ALL_IDS.filter(
      (id) => id !== "ghostSlow" && id !== "warpTop" && id !== "extraLife",
    );
    const offer = pickUpgradeChoiceOffer(owned, "ghostSlow", () => 0);
    expect(offer.upgrades).toEqual(expect.arrayContaining(["ghostSlow", "warpTop", "extraLife"]));
    expect(offer.upgrades).toHaveLength(3);
  });

  it("confirm grants chosen and tracks the single declined option", () => {
    const state = createRunUpgrades();
    const options: UpgradeId[] = ["playerSpeedUp", "ghostSlow"];
    const next = confirmUpgradeChoice(state, options, "playerSpeedUp");
    expect(next.owned).toEqual(["playerSpeedUp"]);
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

  it("confirm with three options leaves lastDeclined unchanged (ambiguous)", () => {
    const state = {
      ...createRunUpgrades(),
      lastDeclinedUpgradeId: "ghostSlow" as UpgradeId,
    };
    const options: UpgradeId[] = ["playerSpeedUp", "warpTop", "extraLife"];
    const next = confirmUpgradeChoice(state, options, "playerSpeedUp");
    expect(next.owned).toEqual(["playerSpeedUp"]);
    expect(next.lastDeclinedUpgradeId).toBe("ghostSlow");
  });
});

describe("declineUpgrades", () => {
  it("remembers the single declined upgrade when quarters is chosen instead", () => {
    const state = createRunUpgrades();
    const next = declineUpgrades(state, ["warpTop"]);
    expect(next.lastDeclinedUpgradeId).toBe("warpTop");
  });

  it("leaves lastDeclined unchanged when zero or multiple upgrades were declined", () => {
    const state = {
      ...createRunUpgrades(),
      lastDeclinedUpgradeId: "ghostSlow" as UpgradeId,
    };
    expect(declineUpgrades(state, []).lastDeclinedUpgradeId).toBe("ghostSlow");
    expect(declineUpgrades(state, ["warpTop", "extraLife"]).lastDeclinedUpgradeId).toBe(
      "ghostSlow",
    );
  });
});

describe("pickStartingUpgrade", () => {
  it("returns null when pool empty", () => {
    expect(pickStartingUpgrade(ALL_IDS, () => 0)).toBeNull();
  });

  it("picks uniformly from unowned ids by rng", () => {
    expect(pickStartingUpgrade([], () => 0)).toBe(ALL_IDS[0]);
    expect(pickStartingUpgrade([], () => 0.9999)).toBe(ALL_IDS[ALL_IDS.length - 1]);
    expect(pickStartingUpgrade([ALL_IDS[0]!], () => 0)).toBe(ALL_IDS[1]);
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
      freezeClosestMs: null,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
      collectExtraPellets: 0,
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
      freezeClosestMs: null,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
      collectExtraPellets: 0,
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

describe("revokeUpgrade", () => {
  it("removes an owned id", () => {
    const owned = grantUpgrade(createRunUpgrades(), "ghostSlow");
    expect(revokeUpgrade(owned, "ghostSlow").owned).toEqual([]);
  });

  it("is a no-op (same reference) when the id isn't owned", () => {
    const state = createRunUpgrades();
    expect(revokeUpgrade(state, "ghostSlow")).toBe(state);
  });
});

describe("freeze / power pellet", () => {
  it("ticks freeze down and expires", () => {
    const started = {
      ...createRunUpgrades(),
      freezeRemainingMs: FREEZE_MS,
      frozenGhostEid: 7,
    };
    expect(frozenGhostEid(started)).toBe(7);
    const mid = tickFreeze(started, 1000);
    expect(mid.freezeRemainingMs).toBe(2000);
    expect(mid.frozenGhostEid).toBe(7);
    const done = tickFreeze(mid, 2500);
    expect(done.freezeRemainingMs).toBe(0);
    expect(done.frozenGhostEid).toBeNull();
    expect(frozenGhostEid(done)).toBeNull();
  });

  it("signals closest-ghost freeze only when upgrade owned", () => {
    const bare = createRunUpgrades();
    expect(applyPowerPelletEffects(bare, 1)).toEqual({
      state: bare,
      freezeClosestMs: null,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
      collectExtraPellets: 0,
    });

    const owned = grantUpgrade(createRunUpgrades(), "powerPelletFreeze");
    const frozen = applyPowerPelletEffects(owned, 1);
    expect(frozen.state.freezeRemainingMs).toBe(0);
    expect(frozen.state.frozenGhostEid).toBeNull();
    expect(frozen.freezeClosestMs).toBe(FREEZE_MS);
    expect(frozen.recallClosestGhost).toBe(false);
    expect(frozen.warpPlayerTopCenter).toBe(false);
    expect(frozen.collectExtraPellets).toBe(0);

    const partial = { ...owned, freezeRemainingMs: 500, frozenGhostEid: 3 };
    expect(applyPowerPelletEffects(partial, 2).freezeClosestMs).toBe(FREEZE_MS);
  });

  it("powerRemoved zero is a no-op", () => {
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletFreeze");
    expect(applyPowerPelletEffects(owned, 0)).toEqual({
      state: owned,
      freezeClosestMs: null,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
      collectExtraPellets: 0,
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
      "powerInvuln",
      "powerCollectThree",
      "powerWallPass",
    ] as const) {
      state = grantUpgrade(state, id);
    }
    const result = applyPowerPelletEffects(state, 1);
    expect(result.state.freezeRemainingMs).toBe(0);
    expect(result.freezeClosestMs).toBe(FREEZE_MS);
    expect(result.state.scatterBurstRemainingMs).toBe(SCATTER_BURST_MS);
    expect(result.state.invulnRemainingMs).toBe(INVULN_MS);
    expect(result.state.speedBurstRemainingMs).toBe(SPEED_BURST_MS);
    expect(result.state.wallPassRemainingMs).toBe(WALL_PASS_MS);
    expect(result.recallClosestGhost).toBe(true);
    expect(result.warpPlayerTopCenter).toBe(true);
    expect(result.collectExtraPellets).toBe(POWER_COLLECT_THREE_COUNT);
  });

  it("sets recall and warp flags from owned defs", () => {
    const recall = applyPowerPelletEffects(grantUpgrade(createRunUpgrades(), "ghostRecall"), 1);
    expect(recall.recallClosestGhost).toBe(true);
    expect(recall.warpPlayerTopCenter).toBe(false);
    expect(recall.collectExtraPellets).toBe(0);

    const warp = applyPowerPelletEffects(grantUpgrade(createRunUpgrades(), "warpTop"), 1);
    expect(warp.recallClosestGhost).toBe(false);
    expect(warp.warpPlayerTopCenter).toBe(true);
    expect(warp.collectExtraPellets).toBe(0);
  });

  it("sets collectExtraPellets once from powerCollectThree", () => {
    const owned = grantUpgrade(createRunUpgrades(), "powerCollectThree");
    expect(applyPowerPelletEffects(owned, 1).collectExtraPellets).toBe(POWER_COLLECT_THREE_COUNT);
    expect(applyPowerPelletEffects(owned, 2).collectExtraPellets).toBe(POWER_COLLECT_THREE_COUNT);
    expect(applyPowerPelletEffects(owned, 0).collectExtraPellets).toBe(0);
  });
});

describe("wall pass / power pellet", () => {
  it("ticks wall pass down and expires", () => {
    const started = { ...createRunUpgrades(), wallPassRemainingMs: WALL_PASS_MS };
    expect(wallPassActive(started)).toBe(true);
    const mid = tickWallPass(started, 1000);
    expect(mid.wallPassRemainingMs).toBe(WALL_PASS_MS - 1000);
    const done = tickWallPass(mid, WALL_PASS_MS);
    expect(done.wallPassRemainingMs).toBe(0);
    expect(wallPassActive(done)).toBe(false);
  });

  it("applies wall pass when owned and refreshes to full", () => {
    const bare = createRunUpgrades();
    expect(applyPowerPelletEffects(bare, 1).state.wallPassRemainingMs).toBe(0);

    const owned = grantUpgrade(createRunUpgrades(), "powerWallPass");
    const applied = applyPowerPelletEffects(owned, 1);
    expect(applied.state.wallPassRemainingMs).toBe(WALL_PASS_MS);

    const partial = { ...applied.state, wallPassRemainingMs: 400 };
    expect(applyPowerPelletEffects(partial, 1).state.wallPassRemainingMs).toBe(WALL_PASS_MS);
  });
});

describe("invuln / power pellet", () => {
  it("ticks invuln down and expires", () => {
    const started = { ...createRunUpgrades(), invulnRemainingMs: INVULN_MS };
    expect(playerIsInvulnerable(started)).toBe(true);
    const mid = tickInvuln(started, 1000);
    expect(mid.invulnRemainingMs).toBe(2000);
    const done = tickInvuln(mid, 2500);
    expect(done.invulnRemainingMs).toBe(0);
    expect(playerIsInvulnerable(done)).toBe(false);
  });

  it("applies invuln only when upgrade owned and refreshes to full", () => {
    const bare = createRunUpgrades();
    expect(applyPowerPelletEffects(bare, 1)).toEqual({
      state: bare,
      freezeClosestMs: null,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
      collectExtraPellets: 0,
    });

    const owned = grantUpgrade(createRunUpgrades(), "powerInvuln");
    const armed = applyPowerPelletEffects(owned, 1);
    expect(armed.state.invulnRemainingMs).toBe(INVULN_MS);
    expect(armed.recallClosestGhost).toBe(false);
    expect(armed.warpPlayerTopCenter).toBe(false);
    expect(armed.collectExtraPellets).toBe(0);

    const partial = { ...armed.state, invulnRemainingMs: 500 };
    expect(applyPowerPelletEffects(partial, 2).state.invulnRemainingMs).toBe(INVULN_MS);
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
    expect(pelletCollectRadiusBonusPx(["pickupRange"])).toBe(pickupRangeBonusPx());
    expect(pickupRangeBonusPx()).toBe(TILE_SIZE);
    expect(pelletCollectRadiusBonusPx(["playerSpeedUp"])).toBe(0);
  });
});

describe("fruitQuarterMultiplier", () => {
  it("doubles only when quarterBounty is owned", () => {
    expect(fruitQuarterMultiplier([])).toBe(1);
    expect(fruitQuarterMultiplier(["quarterBounty"])).toBe(QUARTER_BOUNTY_MUL);
    expect(fruitQuarterMultiplier(["playerSpeedUp"])).toBe(1);
  });
});

describe("overcharge", () => {
  it("doubles every owned onPowerPellet timer duration", () => {
    let state = createRunUpgrades();
    for (const id of [
      "powerPelletFreeze",
      "scatterBurst",
      "powerWallPass",
      "powerInvuln",
      "powerSpeedBurst",
      "overcharge",
    ] as const) {
      state = grantUpgrade(state, id);
    }
    const result = applyPowerPelletEffects(state, 1);
    expect(result.freezeClosestMs).toBe(FREEZE_MS * OVERCHARGE_MUL);
    expect(result.state.scatterBurstRemainingMs).toBe(SCATTER_BURST_MS * OVERCHARGE_MUL);
    expect(result.state.wallPassRemainingMs).toBe(WALL_PASS_MS * OVERCHARGE_MUL);
    expect(result.state.invulnRemainingMs).toBe(INVULN_MS * OVERCHARGE_MUL);
    expect(result.state.speedBurstRemainingMs).toBe(SPEED_BURST_MS * OVERCHARGE_MUL);
  });

  it("does not double recall, warp, or collectExtraPellets", () => {
    let state = createRunUpgrades();
    for (const id of ["ghostRecall", "warpTop", "powerCollectThree", "overcharge"] as const) {
      state = grantUpgrade(state, id);
    }
    const result = applyPowerPelletEffects(state, 1);
    expect(result.recallClosestGhost).toBe(true);
    expect(result.warpPlayerTopCenter).toBe(true);
    expect(result.collectExtraPellets).toBe(POWER_COLLECT_THREE_COUNT);
  });

  it("is a no-op alone with nothing else owned", () => {
    const state = grantUpgrade(createRunUpgrades(), "overcharge");
    expect(applyPowerPelletEffects(state, 1)).toEqual({
      state,
      freezeClosestMs: null,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
      collectExtraPellets: 0,
    });
  });
});

describe("power pellet respawns / Second Chomp", () => {
  it("queues a respawn per removed position and is a no-op for an empty list", () => {
    const queued = queuePowerPelletRespawns([], [{ x: 10, y: 20 }]);
    expect(queued).toEqual([{ x: 10, y: 20, remainingMs: SECOND_CHOMP_MS }]);
    expect(queuePowerPelletRespawns(queued, [])).toBe(queued);
  });

  it("ticks remaining time down and reports entries ready to respawn", () => {
    const queued = queuePowerPelletRespawns([], [{ x: 1, y: 2 }]);
    const mid = tickPowerPelletRespawns(queued, SECOND_CHOMP_MS - 1);
    expect(mid.pending).toEqual([{ x: 1, y: 2, remainingMs: 1 }]);
    expect(mid.ready).toEqual([]);

    const done = tickPowerPelletRespawns(mid.pending, 1);
    expect(done.pending).toEqual([]);
    expect(done.ready).toEqual([{ x: 1, y: 2 }]);
  });

  it("handles several pending respawns independently", () => {
    const queued = queuePowerPelletRespawns(
      [],
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    );
    const almostDone = tickPowerPelletRespawns(queued, SECOND_CHOMP_MS - 5);
    const tick = tickPowerPelletRespawns(almostDone.pending, 5);
    expect(tick.pending).toEqual([]);
    expect(tick.ready.sort((a, b) => a.x - b.x)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
  });
});
