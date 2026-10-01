import { describe, expect, it } from "vitest";
import {
  DEFY_DEATH_MS,
  FREEZE_MS,
  GHOST_HOUSE_CLYDE_PELLET_ADD,
  GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
  GHOST_SLOW_MUL,
  INVULN_MS,
  OVERCHARGE_MUL,
  PLAYER_SPEED_BURST_MUL,
  PLAYER_SPEED_UP_MUL,
  POWER_COLLECT_THREE_COUNT,
  FRUIT_QUARTERS,
  FRUIT_QUARTERS_ENHANCED,
  FRUIT_FECUNDITY_MUL,
  SCATTER_BURST_MS,
  SPEED_BURST_MS,
  WALL_PASS_MS,
  QUARTERS_CHOICE_AMOUNT,
  STORE_UPGRADE_PRICE,
  UPGRADE_DEFS,
  UPGRADE_SCHOOL_LABELS,
  UPGRADE_SCHOOL_ORDER,
  groupUpgradesBySchool,
  storePriceFor,
  applyPowerPelletEffects,
  confirmUpgradeChoice,
  createRunUpgrades,
  declineUpgrades,
  eligibleUpgrades,
  fruitLifetimeMultiplier,
  fruitQuartersPerFruit,
  type BaseUpgradeId,
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
  playerIsInvulnerable,
  playerSpeedMultiplier,
  queuePowerPelletRespawns,
  scatterBurstActive,
  SECOND_CHOMP_MS,
  speedBurstActive,
  ghostHarvestActive,
  clearUpgradeTimers,
  defyDeathActive,
  playerTintRemainingMs,
  tickDefyDeath,
  tickGhostHarvest,
  GHOST_HARVEST_MS,
  tickFreeze,
  tickInvuln,
  tickPowerPelletRespawns,
  tickScatterBurst,
  tickSpeedBurst,
  tickWallPass,
  upgradeLabels,
  wallPassActive,
  type UpgradeId,
  ALL_UPGRADE_IDS,
  carryEnhancement,
  getUpgradeDef,
  remoteTransferEvery,
  deathsHarvestRadiusTiles,
  enhanceGrantLives,
  enhanceUpgrade,
  enhanceableUpgrades,
  enhancedIdOf,
  fruitFeastThresholds,
  fruitPersistsUntilLevelEnd,
  fruitPowerConvertsPellet,
  ghostTunnelSpeedRatio,
  hasUpgrade,
  isEnhancedId,
  learnEnhanceToggleState,
  ownedFormOf,
  lifeFloorBonus,
  overchargeMultiplier,
  pelletSurgeCount,
  regenToFull,
  secondChompMs,
  speedBurstMultiplier,
  turnBoostMs,
  turnPerfectPx,
  wallPassLoopOwned,
} from "./upgrades";
import { TILE_SIZE } from "./maze";

const ALL_IDS: BaseUpgradeId[] = [
  "powerPelletFreeze",
  "passivePlayerSpeedUp",
  "passiveGhostSlow",
  "powerPelletScatterBurst",
  "powerPelletGhostRecall",
  "powerPelletWarpTop",
  "passivePickupRange",
  "passiveGhostHouseDelay",
  "passiveExtraLife",
  "passivePelletToPower",
  "powerPelletCollectThree",
  "powerPelletWallPass",
  "powerPelletSpeedBurst",
  "powerPelletInvuln",
  "powerPelletGhostHarvester",
  "fruitPowerPellet",
  "fruitQuarterBounty",
  "fruitFecundity",
  "fruitFeast",
  "passiveDeathsHarvest",
  "passiveOvercharge",
  "passiveTunnelDash",
  "passivePowerPelletRecharge",
  "passiveRemoteTransference",
  "passiveMyogenesis",
  "passiveDefyDeath",
  "passiveTurnTuning",
];

const STUB_IDS: BaseUpgradeId[] = [
  "fruitPowerPellet",
  "passiveDeathsHarvest",
  "passiveOvercharge",
  "passiveTunnelDash",
  "passivePowerPelletRecharge",
  "passiveRemoteTransference",
];

describe("parseUpgradeId", () => {
  it("parses known ids and rejects invalid", () => {
    expect(parseUpgradeId("passiveGhostSlow")).toBe("passiveGhostSlow");
    expect(parseUpgradeId("passivePlayerSpeedUp")).toBe("passivePlayerSpeedUp");
    expect(parseUpgradeId("powerPelletFreeze")).toBe("powerPelletFreeze");
    expect(parseUpgradeId("powerPelletScatterBurst")).toBe("powerPelletScatterBurst");
    expect(parseUpgradeId("powerPelletGhostRecall")).toBe("powerPelletGhostRecall");
    expect(parseUpgradeId("powerPelletWarpTop")).toBe("powerPelletWarpTop");
    expect(parseUpgradeId("powerPelletCollectThree")).toBe("powerPelletCollectThree");
    expect(parseUpgradeId("powerPelletSpeedBurst")).toBe("powerPelletSpeedBurst");
    expect(parseUpgradeId("powerPelletWallPass")).toBe("powerPelletWallPass");
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
      "enableUpgrade=passiveGhostSlow&enableUpgrade=nope&enableUpgrade=passivePlayerSpeedUp&enableUpgrade=passiveGhostSlow",
    );
    expect(parseEnableUpgradeParams(params)).toEqual([
      "passiveGhostSlow",
      "passivePlayerSpeedUp",
      "passiveGhostSlow",
    ]);
  });

  it("returns empty when missing", () => {
    expect(parseEnableUpgradeParams(new URLSearchParams())).toEqual([]);
  });

  it("seeds owned immediately and dedupes via grant", () => {
    const state = createRunUpgrades(["powerPelletFreeze", "passiveGhostSlow", "powerPelletFreeze"]);
    expect(state.owned).toEqual(["powerPelletFreeze", "passiveGhostSlow"]);
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
    const owned = ALL_IDS.filter((id) => id !== "powerPelletWarpTop");
    const offer = pickUpgradeChoiceOffer(owned, null, () => 0);
    expect(offer.upgrades).toEqual(["powerPelletWarpTop"]);
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
    const offer = pickUpgradeChoiceOffer([], "passiveGhostSlow", () => 0);
    expect(offer.upgrades).not.toContain("passiveGhostSlow");
    expect(offer.upgrades).toHaveLength(3);
  });

  it("re-includes lastDeclined when needed to fill the offer", () => {
    const owned = ALL_IDS.filter(
      (id) => id !== "passiveGhostSlow" && id !== "powerPelletWarpTop" && id !== "passiveExtraLife",
    );
    const offer = pickUpgradeChoiceOffer(owned, "passiveGhostSlow", () => 0);
    expect(offer.upgrades).toEqual(
      expect.arrayContaining(["passiveGhostSlow", "powerPelletWarpTop", "passiveExtraLife"]),
    );
    expect(offer.upgrades).toHaveLength(3);
  });

  it("confirm grants chosen and tracks the single declined option", () => {
    const state = createRunUpgrades();
    const options: BaseUpgradeId[] = ["passivePlayerSpeedUp", "passiveGhostSlow"];
    const next = confirmUpgradeChoice(state, options, "passivePlayerSpeedUp");
    expect(next.owned).toEqual(["passivePlayerSpeedUp"]);
    expect(next.lastDeclinedUpgradeId).toBe("passiveGhostSlow");
  });

  it("confirm with one option leaves lastDeclined unchanged", () => {
    const state = {
      ...createRunUpgrades(),
      lastDeclinedUpgradeId: "passiveGhostSlow" as BaseUpgradeId,
    };
    const next = confirmUpgradeChoice(state, ["powerPelletWarpTop"], "powerPelletWarpTop");
    expect(next.owned).toEqual(["powerPelletWarpTop"]);
    expect(next.lastDeclinedUpgradeId).toBe("passiveGhostSlow");
  });

  it("confirm with three options leaves lastDeclined unchanged (ambiguous)", () => {
    const state = {
      ...createRunUpgrades(),
      lastDeclinedUpgradeId: "passiveGhostSlow" as BaseUpgradeId,
    };
    const options: BaseUpgradeId[] = [
      "passivePlayerSpeedUp",
      "powerPelletWarpTop",
      "passiveExtraLife",
    ];
    const next = confirmUpgradeChoice(state, options, "passivePlayerSpeedUp");
    expect(next.owned).toEqual(["passivePlayerSpeedUp"]);
    expect(next.lastDeclinedUpgradeId).toBe("passiveGhostSlow");
  });
});

describe("declineUpgrades", () => {
  it("remembers the single declined upgrade when quarters is chosen instead", () => {
    const state = createRunUpgrades();
    const next = declineUpgrades(state, ["powerPelletWarpTop"]);
    expect(next.lastDeclinedUpgradeId).toBe("powerPelletWarpTop");
  });

  it("leaves lastDeclined unchanged when zero or multiple upgrades were declined", () => {
    const state = {
      ...createRunUpgrades(),
      lastDeclinedUpgradeId: "passiveGhostSlow" as BaseUpgradeId,
    };
    expect(declineUpgrades(state, []).lastDeclinedUpgradeId).toBe("passiveGhostSlow");
    expect(
      declineUpgrades(state, ["powerPelletWarpTop", "passiveExtraLife"]).lastDeclinedUpgradeId,
    ).toBe("passiveGhostSlow");
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
    expect(eligibleUpgrades(["passivePlayerSpeedUp"])).toEqual(
      ALL_IDS.filter((id) => id !== "passivePlayerSpeedUp"),
    );
    expect(eligibleUpgrades(ALL_IDS)).toEqual([]);
  });
});

describe("grantUpgrade", () => {
  it("is idempotent for already owned", () => {
    const once = grantUpgrade(createRunUpgrades(), "passiveGhostSlow");
    expect(grantUpgrade(once, "passiveGhostSlow")).toEqual(once);
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
      recallGhostCount: 0,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
    });
    expect(playerSpeedMultiplier(state.owned)).toBe(1);
    expect(ghostSpeedMultiplier(state.owned)).toBe(1);
  });

  it("extraLife grants lives delta without power-pellet effects", () => {
    expect(grantLivesForUpgrade("passiveExtraLife")).toBe(1);
    expect(grantLivesForUpgrade("passiveGhostSlow")).toBe(0);
    const owned = grantUpgrade(createRunUpgrades(), "passiveExtraLife");
    expect(applyPowerPelletEffects(owned, 1)).toEqual({
      state: owned,
      freezeClosestMs: null,
      recallGhostCount: 0,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
    });
  });

  it("ghostHouseDelay sums release delay and Clyde pellet adds", () => {
    expect(ghostHouseReleaseDelayAddMs([])).toBe(0);
    expect(ghostHouseClydePelletAdd([])).toBe(0);
    expect(ghostHouseReleaseDelayAddMs(["passiveGhostHouseDelay"])).toBe(
      GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
    );
    expect(ghostHouseClydePelletAdd(["passiveGhostHouseDelay"])).toBe(GHOST_HOUSE_CLYDE_PELLET_ADD);
    expect(ghostHouseReleaseDelayAddMs(["passiveGhostSlow", "passiveGhostHouseDelay"])).toBe(
      GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
    );
    expect(ghostHouseClydePelletAdd(["passivePlayerSpeedUp"])).toBe(0);
  });
});

describe("revokeUpgrade", () => {
  it("removes an owned id", () => {
    const owned = grantUpgrade(createRunUpgrades(), "passiveGhostSlow");
    expect(revokeUpgrade(owned, "passiveGhostSlow").owned).toEqual([]);
  });

  it("is a no-op (same reference) when the id isn't owned", () => {
    const state = createRunUpgrades();
    expect(revokeUpgrade(state, "passiveGhostSlow")).toBe(state);
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
      recallGhostCount: 0,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
    });

    const owned = grantUpgrade(createRunUpgrades(), "powerPelletFreeze");
    const frozen = applyPowerPelletEffects(owned, 1);
    expect(frozen.state.freezeRemainingMs).toBe(0);
    expect(frozen.state.frozenGhostEid).toBeNull();
    expect(frozen.freezeClosestMs).toBe(FREEZE_MS);
    expect(frozen.recallGhostCount).toBe(0);
    expect(frozen.warpPlayerFarthest).toBe(false);
    expect(frozen.collectExtraPellets).toBe(0);

    const partial = { ...owned, freezeRemainingMs: 500, frozenGhostEid: 3 };
    expect(applyPowerPelletEffects(partial, 2).freezeClosestMs).toBe(FREEZE_MS);
  });

  it("powerRemoved zero is a no-op", () => {
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletFreeze");
    expect(applyPowerPelletEffects(owned, 0)).toEqual({
      state: owned,
      freezeClosestMs: null,
      recallGhostCount: 0,
      warpPlayerFarthest: false,
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
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletScatterBurst");
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
      "powerPelletScatterBurst",
      "powerPelletSpeedBurst",
      "powerPelletGhostRecall",
      "powerPelletWarpTop",
      "powerPelletInvuln",
      "powerPelletCollectThree",
      "powerPelletWallPass",
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
    expect(result.recallGhostCount).toBe(1);
    expect(result.warpPlayerFarthest).toBe(true);
    expect(result.collectExtraPellets).toBe(POWER_COLLECT_THREE_COUNT);
  });

  it("sets recall and warp flags from owned defs", () => {
    const recall = applyPowerPelletEffects(
      grantUpgrade(createRunUpgrades(), "powerPelletGhostRecall"),
      1,
    );
    expect(recall.recallGhostCount).toBe(1);
    expect(recall.warpPlayerFarthest).toBe(false);
    expect(recall.collectExtraPellets).toBe(0);

    const warp = applyPowerPelletEffects(
      grantUpgrade(createRunUpgrades(), "powerPelletWarpTop"),
      1,
    );
    expect(warp.recallGhostCount).toBe(0);
    expect(warp.warpPlayerFarthest).toBe(true);
    expect(warp.collectExtraPellets).toBe(0);
  });

  it("sets collectExtraPellets once from powerCollectThree", () => {
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletCollectThree");
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

    const owned = grantUpgrade(createRunUpgrades(), "powerPelletWallPass");
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
      recallGhostCount: 0,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
    });

    const owned = grantUpgrade(createRunUpgrades(), "powerPelletInvuln");
    const armed = applyPowerPelletEffects(owned, 1);
    expect(armed.state.invulnRemainingMs).toBe(INVULN_MS);
    expect(armed.recallGhostCount).toBe(0);
    expect(armed.warpPlayerFarthest).toBe(false);
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

    const owned = grantUpgrade(createRunUpgrades(), "powerPelletSpeedBurst");
    const applied = applyPowerPelletEffects(owned, 1);
    expect(applied.state.speedBurstRemainingMs).toBe(SPEED_BURST_MS);

    const partial = { ...applied.state, speedBurstRemainingMs: 500 };
    expect(applyPowerPelletEffects(partial, 2).state.speedBurstRemainingMs).toBe(SPEED_BURST_MS);
  });

  it("composes burst mul with passive Speed Up only while active", () => {
    const burstOnly = {
      ...grantUpgrade(createRunUpgrades(), "powerPelletSpeedBurst"),
      speedBurstRemainingMs: SPEED_BURST_MS,
    };
    expect(playerSpeedMultiplier(burstOnly.owned)).toBe(1);
    expect(
      playerSpeedMultiplier(burstOnly.owned) *
        (speedBurstActive(burstOnly) ? PLAYER_SPEED_BURST_MUL : 1),
    ).toBe(PLAYER_SPEED_BURST_MUL);

    let both = grantUpgrade(createRunUpgrades(), "powerPelletSpeedBurst");
    both = grantUpgrade(both, "passivePlayerSpeedUp");
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
    expect(playerSpeedMultiplier(["passivePlayerSpeedUp"])).toBe(PLAYER_SPEED_UP_MUL);
    expect(ghostSpeedMultiplier(["passiveGhostSlow"])).toBe(GHOST_SLOW_MUL);
    expect(ghostSpeedMultiplier(["passivePlayerSpeedUp"])).toBe(1);
  });

  it("maps owned ids to labels in order", () => {
    expect(
      upgradeLabels(["passiveGhostSlow", "passivePlayerSpeedUp", "powerPelletScatterBurst"]),
    ).toEqual(["Ghost Slow", "Speed Up", "Scatter Burst"]);
  });
});

describe("pelletCollectRadiusBonusPx", () => {
  it("returns TILE_SIZE for pickupRange and 0 otherwise", () => {
    expect(pelletCollectRadiusBonusPx([])).toBe(0);
    expect(pelletCollectRadiusBonusPx(["passivePickupRange"])).toBe(TILE_SIZE);
    expect(pelletCollectRadiusBonusPx(["passivePickupRangePlus"])).toBe(2 * TILE_SIZE);
    expect(pelletCollectRadiusBonusPx(["passivePlayerSpeedUp"])).toBe(0);
  });
});

describe("fruitQuartersPerFruit", () => {
  it("pays Quarters directly only while Quarter Bounty is owned", () => {
    expect(fruitQuartersPerFruit([])).toBeNull();
    expect(fruitQuartersPerFruit(["fruitQuarterBounty"])).toBe(FRUIT_QUARTERS);
    expect(fruitQuartersPerFruit(["fruitQuarterBountyPlus"])).toBe(FRUIT_QUARTERS_ENHANCED);
    expect(fruitQuartersPerFruit(["passivePlayerSpeedUp"])).toBeNull();
  });
});

describe("passiveOvercharge", () => {
  it("doubles every owned onPowerPellet timer duration", () => {
    let state = createRunUpgrades();
    for (const id of [
      "powerPelletFreeze",
      "powerPelletScatterBurst",
      "powerPelletWallPass",
      "powerPelletInvuln",
      "powerPelletSpeedBurst",
      "passiveOvercharge",
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
    for (const id of [
      "powerPelletGhostRecall",
      "powerPelletWarpTop",
      "powerPelletCollectThree",
      "passiveOvercharge",
    ] as const) {
      state = grantUpgrade(state, id);
    }
    const result = applyPowerPelletEffects(state, 1);
    expect(result.recallGhostCount).toBe(1);
    expect(result.warpPlayerFarthest).toBe(true);
    expect(result.collectExtraPellets).toBe(POWER_COLLECT_THREE_COUNT);
  });

  it("is a no-op alone with nothing else owned", () => {
    const state = grantUpgrade(createRunUpgrades(), "passiveOvercharge");
    expect(applyPowerPelletEffects(state, 1)).toEqual({
      state,
      freezeClosestMs: null,
      recallGhostCount: 0,
      warpPlayerFarthest: false,
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

describe("storePrice", () => {
  it("is an explicit positive integer on every upgrade", () => {
    for (const def of UPGRADE_DEFS) {
      expect(Number.isInteger(def.storePrice) && def.storePrice > 0).toBe(true);
    }
    expect(storePriceFor("passiveMyogenesis")).toBe(STORE_UPGRADE_PRICE);
  });
});

describe("ghost harvester / power pellet", () => {
  it("starts on a power pellet only when owned, refreshes, and ticks down", () => {
    expect(applyPowerPelletEffects(createRunUpgrades(), 1).state.ghostHarvestRemainingMs).toBe(0);
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletGhostHarvester");
    const armed = applyPowerPelletEffects(owned, 1).state;
    expect(armed.ghostHarvestRemainingMs).toBe(GHOST_HARVEST_MS);
    expect(ghostHarvestActive(armed)).toBe(true);
    const mid = tickGhostHarvest(armed, 2000);
    expect(mid.ghostHarvestRemainingMs).toBe(GHOST_HARVEST_MS - 2000);
    expect(applyPowerPelletEffects(mid, 1).state.ghostHarvestRemainingMs).toBe(GHOST_HARVEST_MS);
    expect(ghostHarvestActive(tickGhostHarvest(armed, GHOST_HARVEST_MS + 1))).toBe(false);
  });

  it("doubles under Overcharge and clears with the other timers", () => {
    let state = grantUpgrade(createRunUpgrades(), "powerPelletGhostHarvester");
    state = grantUpgrade(state, "passiveOvercharge");
    const armed = applyPowerPelletEffects(state, 1).state;
    expect(armed.ghostHarvestRemainingMs).toBe(GHOST_HARVEST_MS * 2);
    expect(clearUpgradeTimers(armed).ghostHarvestRemainingMs).toBe(0);
  });
});

describe("defy death / power pellet", () => {
  it("arms only when owned, refreshes on re-chomp, and ticks down", () => {
    expect(applyPowerPelletEffects(createRunUpgrades(), 1).state.defyDeathRemainingMs).toBe(0);
    const owned = grantUpgrade(createRunUpgrades(), "passiveDefyDeath");
    const armed = applyPowerPelletEffects(owned, 1).state;
    expect(armed.defyDeathRemainingMs).toBe(DEFY_DEATH_MS);
    expect(defyDeathActive(armed)).toBe(true);
    const mid = tickDefyDeath(armed, 2000);
    expect(mid.defyDeathRemainingMs).toBe(DEFY_DEATH_MS - 2000);
    expect(applyPowerPelletEffects(mid, 1).state.defyDeathRemainingMs).toBe(DEFY_DEATH_MS);
    expect(defyDeathActive(tickDefyDeath(armed, DEFY_DEATH_MS + 1))).toBe(false);
  });

  it("is not doubled by Overcharge and clears with the other timers", () => {
    let state = grantUpgrade(createRunUpgrades(), "passiveDefyDeath");
    state = grantUpgrade(state, "passiveOvercharge");
    const armed = applyPowerPelletEffects(state, 1).state;
    expect(armed.defyDeathRemainingMs).toBe(DEFY_DEATH_MS);
    expect(clearUpgradeTimers(armed).defyDeathRemainingMs).toBe(0);
  });
});

describe("fruitLifetimeMultiplier", () => {
  it("is 1 by default and doubles with fruitFecundity", () => {
    expect(fruitLifetimeMultiplier([])).toBe(1);
    expect(fruitLifetimeMultiplier(["fruitFecundity"])).toBe(FRUIT_FECUNDITY_MUL);
    expect(fruitLifetimeMultiplier(["fruitQuarterBounty"])).toBe(1);
  });

  it("tints and blinks the player off the longer of invuln and defy death", () => {
    let state = grantUpgrade(createRunUpgrades(), "passiveDefyDeath");
    expect(playerTintRemainingMs(state)).toBe(0);
    state = applyPowerPelletEffects(state, 1).state;
    expect(playerTintRemainingMs(state)).toBe(DEFY_DEATH_MS);
    state = grantUpgrade(state, "powerPelletInvuln");
    state = applyPowerPelletEffects(state, 1).state;
    expect(playerTintRemainingMs(state)).toBe(Math.max(INVULN_MS, DEFY_DEATH_MS));
    expect(playerTintRemainingMs(tickDefyDeath(clearUpgradeTimers(state), 100))).toBe(0);
  });
});

describe("upgrade schools", () => {
  it("assigns every upgrade one of the six schools", () => {
    const schools = Object.keys(UPGRADE_SCHOOL_LABELS).sort();
    expect(schools).toEqual(["death", "disruption", "harvest", "neutral", "protection", "speed"]);
    for (const def of UPGRADE_DEFS) {
      expect(schools, def.id).toContain(def.school);
    }
  });

  it("groups defs by school in school order, keeping def order and skipping empty schools", () => {
    expect([...UPGRADE_SCHOOL_ORDER].sort()).toEqual(Object.keys(UPGRADE_SCHOOL_LABELS).sort());
    const groups = groupUpgradesBySchool(UPGRADE_DEFS);
    expect(groups.map((g) => g.school)).toEqual([...UPGRADE_SCHOOL_ORDER]);
    expect(groups.flatMap((g) => g.defs)).toHaveLength(UPGRADE_DEFS.length);
    const speed = groups.find((g) => g.school === "speed")!;
    expect(speed.defs.map((d) => d.id)).toEqual(
      UPGRADE_DEFS.filter((d) => d.school === "speed").map((d) => d.id),
    );

    const some = UPGRADE_DEFS.filter((d) => d.school === "neutral" || d.school === "death");
    expect(groupUpgradesBySchool(some).map((g) => g.school)).toEqual(["death", "neutral"]);
    expect(groupUpgradesBySchool([])).toEqual([]);
  });

  it("uses every school at least once", () => {
    const used = new Set(UPGRADE_DEFS.map((def) => def.school));
    expect([...used].sort()).toEqual(Object.keys(UPGRADE_SCHOOL_LABELS).sort());
  });
});

describe("enhanced upgrades", () => {
  it("derives a Plus def for every base id with a + label and the same school", () => {
    for (const id of ALL_UPGRADE_IDS) {
      const base = getUpgradeDef(id);
      const plus = getUpgradeDef(enhancedIdOf(id));
      expect(plus.isEnhanced).toBe(true);
      expect(plus.baseId).toBe(id);
      expect(plus.label).toBe(`${base.label}+`);
      expect(plus.school).toBe(base.school);
      expect(plus.description).not.toBe(base.description);
      expect(plus.enhanceNote).toContain(base.label);
      expect(base.enhanceNote).toBeUndefined();
    }
  });

  it("keeps Plus ids out of every pool", () => {
    expect(ALL_UPGRADE_IDS.some((id) => isEnhancedId(id))).toBe(false);
    expect(eligibleUpgrades([])).toHaveLength(ALL_UPGRADE_IDS.length);
    expect(eligibleUpgrades(["passiveGhostSlowPlus"])).not.toContain("passiveGhostSlow");
  });

  it("hasUpgrade matches either form", () => {
    expect(hasUpgrade(["passiveGhostSlow"], "passiveGhostSlow")).toBe(true);
    expect(hasUpgrade(["passiveGhostSlowPlus"], "passiveGhostSlow")).toBe(true);
    expect(hasUpgrade(["passiveGhostSlow"], "passivePlayerSpeedUp")).toBe(false);
  });

  it("enhances in place, once, and never grants a base alongside its Plus", () => {
    const state = createRunUpgrades(["passiveGhostSlow", "passivePlayerSpeedUp"]);
    const enhanced = enhanceUpgrade(state, "passiveGhostSlow");
    expect(enhanced.owned).toEqual(["passiveGhostSlowPlus", "passivePlayerSpeedUp"]);
    expect(enhanceUpgrade(enhanced, "passiveGhostSlow")).toBe(enhanced);
    expect(enhanceableUpgrades(enhanced.owned)).toEqual(["passivePlayerSpeedUp"]);
    expect(grantUpgrade(enhanced, "passiveGhostSlow")).toBe(enhanced);
    expect(enhanceUpgrade(createRunUpgrades(), "passiveGhostSlow").owned).toEqual([]);
  });

  it("revokes whichever form is owned", () => {
    const state = createRunUpgrades(["passiveGhostSlowPlus"]);
    expect(revokeUpgrade(state, "passiveGhostSlow").owned).toEqual([]);
  });

  it("carries the outgoing form onto the incoming upgrade", () => {
    expect(carryEnhancement("passiveGhostSlowPlus", "passivePlayerSpeedUp")).toBe(
      "passivePlayerSpeedUpPlus",
    );
    expect(carryEnhancement("passiveGhostSlow", "passivePlayerSpeedUp")).toBe(
      "passivePlayerSpeedUp",
    );
  });

  it("grants only the extra life on enhancing Extra Life", () => {
    expect(grantLivesForUpgrade("passiveExtraLife")).toBe(1);
    expect(grantLivesForUpgrade("passiveExtraLifePlus")).toBe(2);
    expect(enhanceGrantLives("passiveExtraLife")).toBe(1);
    expect(enhanceGrantLives("passiveGhostSlow")).toBe(0);
  });

  it("reports the Learn toggle state per upgrade", () => {
    expect(learnEnhanceToggleState([], "passiveGhostSlow")).toBe("hidden");
    expect(learnEnhanceToggleState(["passiveGhostSlow"], "passiveGhostSlow")).toBe("off");
    expect(learnEnhanceToggleState(["passiveGhostSlowPlus"], "passiveGhostSlow")).toBe("on");
    expect(ownedFormOf(["passiveGhostSlowPlus"], "passiveGhostSlow")).toBe("passiveGhostSlowPlus");
  });

  it("accepts Plus ids in enableUpgrade", () => {
    const ids = parseEnableUpgradeParams(new URLSearchParams("enableUpgrade=passiveGhostSlowPlus"));
    expect(ids).toEqual(["passiveGhostSlowPlus"]);
  });

  it("returns base versus enhanced numbers from the owned list", () => {
    expect(playerSpeedMultiplier(["passivePlayerSpeedUp"])).toBe(1.25);
    expect(playerSpeedMultiplier(["passivePlayerSpeedUpPlus"])).toBe(1.5);
    expect(ghostSpeedMultiplier(["passiveGhostSlow"])).toBe(0.8);
    expect(ghostSpeedMultiplier(["passiveGhostSlowPlus"])).toBe(0.65);
    expect(speedBurstMultiplier(["powerPelletSpeedBurst"])).toBe(1.25);
    expect(speedBurstMultiplier(["powerPelletSpeedBurstPlus"])).toBe(1.5);
    expect(deathsHarvestRadiusTiles([])).toBe(6);
    expect(deathsHarvestRadiusTiles(["passiveDeathsHarvestPlus"])).toBe(10);
    expect(overchargeMultiplier([])).toBe(1);
    expect(overchargeMultiplier(["passiveOvercharge"])).toBe(2);
    expect(overchargeMultiplier(["passiveOverchargePlus"])).toBe(3);
    expect(secondChompMs(["passivePowerPelletRechargePlus"])).toBe(7000);
    expect(remoteTransferEvery(["passiveRemoteTransferencePlus"])).toBe(3);
    expect(turnBoostMs(["passiveTurnTuningPlus"])).toBe(750);
    expect(turnPerfectPx(["passiveTurnTuningPlus"])).toBe(12);
    expect(ghostTunnelSpeedRatio(["passiveTunnelDash"])).toBeNull();
    expect(ghostTunnelSpeedRatio(["passiveTunnelDashPlus"])).toBe(0.3);
    expect(lifeFloorBonus(["passiveExtraLifePlus"])).toBe(2);
    expect(pelletSurgeCount(["passivePelletToPowerPlus"])).toBe(2);
    expect(ghostHouseReleaseDelayAddMs(["passiveGhostHouseDelayPlus"])).toBe(3000);
    expect(ghostHouseClydePelletAdd(["passiveGhostHouseDelayPlus"])).toBe(25);
    expect(regenToFull(["passiveMyogenesisPlus"])).toBe(true);
    expect(fruitFeastThresholds(["fruitFeastPlus"])).toEqual([45, 100, 150, 200]);
    expect(fruitPersistsUntilLevelEnd(["fruitFecundityPlus"])).toBe(true);
    expect(fruitPersistsUntilLevelEnd(["fruitFecundity"])).toBe(false);
    expect(fruitPowerConvertsPellet(["fruitPowerPelletPlus"])).toBe(true);
    expect(wallPassLoopOwned(["powerPelletWallPassPlus"])).toBe(true);
    expect(wallPassLoopOwned(["powerPelletWallPass"])).toBe(false);
  });

  it("applies enhanced power-pellet numbers", () => {
    const apply = (id: UpgradeId) => applyPowerPelletEffects(createRunUpgrades([id]), 1);
    expect(apply("powerPelletFreezePlus").freezeClosestMs).toBe(5000);
    expect(apply("powerPelletScatterBurstPlus").state.scatterBurstRemainingMs).toBe(5000);
    expect(apply("powerPelletInvulnPlus").state.invulnRemainingMs).toBe(5000);
    expect(apply("powerPelletGhostHarvesterPlus").state.ghostHarvestRemainingMs).toBe(8000);
    expect(apply("passiveDefyDeathPlus").state.defyDeathRemainingMs).toBe(8000);
    expect(apply("powerPelletGhostRecallPlus").recallGhostCount).toBe(2);
    expect(apply("powerPelletCollectThreePlus").collectExtraPellets).toBe(5);
    expect(apply("powerPelletWallPassPlus").state.wallPassRemainingMs).toBe(6000);
  });

  it("Warp Top Plus shields for 2s and Overcharge does not triple it", () => {
    const warp = applyPowerPelletEffects(createRunUpgrades(["powerPelletWarpTopPlus"]), 1);
    expect(warp.warpPlayerFarthest).toBe(true);
    expect(warp.state.invulnRemainingMs).toBe(2000);
    const both = applyPowerPelletEffects(
      createRunUpgrades(["powerPelletWarpTopPlus", "passiveOverchargePlus"]),
      1,
    );
    expect(both.state.invulnRemainingMs).toBe(2000);
    const proof = applyPowerPelletEffects(
      createRunUpgrades(["powerPelletWarpTopPlus", "powerPelletInvuln", "passiveOvercharge"]),
      1,
    );
    expect(proof.state.invulnRemainingMs).toBe(6000);
  });

  it("Overcharge Plus triples enhanced timers but not Defy Death", () => {
    const result = applyPowerPelletEffects(
      createRunUpgrades(["passiveOverchargePlus", "powerPelletFreezePlus", "passiveDefyDeathPlus"]),
      1,
    );
    expect(result.freezeClosestMs).toBe(15000);
    expect(result.state.defyDeathRemainingMs).toBe(8000);
  });
});
