import { describe, expect, it } from "vitest";
import {
  eatFrightenedGhost,
  frightenedGhostEids,
  frightenedGhosts,
  hunterHoldsEaten,
  tickFrightened,
  DEFY_DEATH_ENHANCED_MS,
  effectiveOwned,
  isSpecialist,
  learnUpgradeDefs,
  specialistEnhancedBases,
  DEFY_DEATH_MS,
  FREEZE_MS,
  GHOST_HOUSE_CLYDE_PELLET_ADD,
  GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
  GHOST_SLOW_MUL,
  INVULN_MS,
  OVERCHARGE_ENHANCED_MUL,
  SHIELD_BREAK_INVULN_MS,
  SHIELD_PELLETS_CAP,
  SHIELD_PELLETS_ENHANCED_CAP,
  applyShieldBreakInvuln,
  applyTunnelExitInvuln,
  martyrGhostPlacement,
  HAUNTING_MS,
  armHaunt,
  hauntDurationMs,
  STREAK_ENGINE_ENHANCED_INVULN_MS,
  STREAK_ENGINE_EVERY,
  applyStreakEngineInvuln,
  streakEngineEvery,
  streakEngineInvulnMs,
  hauntedGhost,
  hauntedGhostEid,
  tickHaunt,
  interestPayout,
  nearMissCharge,
  NEAR_MISS_CHARGE,
  NEAR_MISS_ENHANCED_CHARGE,
  bankShields,
  shieldPelletsCap,
  spendShield,
  OVERCHARGE_MUL,
  PLAYER_SPEED_BURST_MUL,
  AFTERBURNER_MUL,
  AFTERBURNER_ENHANCED_MUL,
  EXTRA_HUNGRY_COUNT,
  FRUIT_QUARTERS,
  FRUIT_QUARTERS_ENHANCED,
  MONEY_TALKS_ENHANCED_QUARTERS,
  MONEY_TALKS_QUARTERS,
  FRUIT_FECUNDITY_MUL,
  CORNER_TELEPORT_HOLD_ENHANCED_MS,
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
  moneyTalksCost,
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
  STARTING_UPGRADE_POOL,
  pickUpgradeChoiceOffer,
  pelletCollectRadiusBonusPx,
  playerIsInvulnerable,
  cellSpeedMultiplier,
  playerSpeedMultiplier,
  queuePowerPelletRespawns,
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
  tickSpeedBurst,
  tickWallPass,
  upgradeLabels,
  wallPassActive,
  type UpgradeId,
  ALL_UPGRADE_IDS,
  carryEnhancement,
  getUpgradeDef,
  remoteTransferEvery,
  deathsBountyCharge,
  lazyLooperRings,
  deathsHarvestRadiusTiles,
  enhanceGrantLives,
  enhanceUpgrade,
  enhanceableUpgrades,
  enhancedIdOf,
  fruitFeastThresholds,
  fruitPersistsUntilLevelEnd,
  fruitPowerConvertsPellet,
  ghostTunnelSpeedRatio,
  ghostsBlockedFromTunnels,
  tunnelExitInvulnMs,
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
  echoEffects,
  queueEcho,
} from "./upgrades";
import { ECHO_DELAY_MS } from "./echo";
import { TILE_SIZE } from "./maze";

const ALL_IDS: BaseUpgradeId[] = [
  "powerPelletFreeze",
  "passiveAfterburner",
  "passiveGhostSlow",
  "powerPelletScatterBurst",
  "powerPelletGhostRecall",
  "powerPelletWarpFarthest",
  "passivePickupRange",
  "passiveGhostHouseDelay",
  "passiveExtraLife",
  "passivePelletToPower",
  "powerPelletExtraHungry",
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
  "passiveDeathsBounty",
  "passiveMoneyTalks",
  "passiveLazyLooper",
  "passiveShieldPellets",
  "passiveDeathSpecialist",
  "passiveHarvestSpecialist",
  "passiveSpeedSpecialist",
  "passiveAutomationSpecialist",
  "passiveProtectionSpecialist",
  "passiveDisruptionSpecialist",
  "passiveMartyr",
  "passiveInterest",
  "passiveNearMiss",
  "passiveHaunting",
  "passiveTunnelSanctuary",
  "passiveStreakEngine",
  "passiveEcho",
  "powerPelletHunter",
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
    expect(parseUpgradeId("passiveAfterburner")).toBe("passiveAfterburner");
    expect(parseUpgradeId("powerPelletFreeze")).toBe("powerPelletFreeze");
    expect(parseUpgradeId("powerPelletScatterBurst")).toBe("powerPelletScatterBurst");
    expect(parseUpgradeId("powerPelletGhostRecall")).toBe("powerPelletGhostRecall");
    expect(parseUpgradeId("powerPelletWarpFarthest")).toBe("powerPelletWarpFarthest");
    expect(parseUpgradeId("powerPelletExtraHungry")).toBe("powerPelletExtraHungry");
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
      "enableUpgrade=passiveGhostSlow&enableUpgrade=nope&enableUpgrade=passiveAfterburner&enableUpgrade=passiveGhostSlow",
    );
    expect(parseEnableUpgradeParams(params)).toEqual([
      "passiveGhostSlow",
      "passiveAfterburner",
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
    const owned = ALL_IDS.filter((id) => id !== "powerPelletWarpFarthest");
    const offer = pickUpgradeChoiceOffer(owned, null, () => 0);
    expect(offer.upgrades).toEqual(["powerPelletWarpFarthest"]);
  });

  it("forces an eligible upgrade into the offer, but never an owned one", () => {
    const offer = pickUpgradeChoiceOffer([], null, () => 0, 0, "passiveRemoteTransference");
    expect(offer.upgrades).toHaveLength(3);
    expect(offer.upgrades).toContain("passiveRemoteTransference");
    const owned = pickUpgradeChoiceOffer(
      ["passiveRemoteTransference"],
      null,
      () => 0,
      0,
      "passiveRemoteTransference",
    );
    expect(owned.upgrades).not.toContain("passiveRemoteTransference");
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
      (id) =>
        id !== "passiveGhostSlow" && id !== "powerPelletWarpFarthest" && id !== "passiveExtraLife",
    );
    const offer = pickUpgradeChoiceOffer(owned, "passiveGhostSlow", () => 0);
    expect(offer.upgrades).toEqual(
      expect.arrayContaining(["passiveGhostSlow", "powerPelletWarpFarthest", "passiveExtraLife"]),
    );
    expect(offer.upgrades).toHaveLength(3);
  });

  it("marks no option enhanced at chance 0 and every option at chance 1", () => {
    expect(pickUpgradeChoiceOffer([], null, () => 0.5).enhanced).toEqual([]);
    const all = pickUpgradeChoiceOffer([], null, () => 0.5, 1);
    expect(all.enhanced).toHaveLength(3);
    expect(all.enhanced).toEqual(expect.arrayContaining(all.upgrades));
  });

  it("enhances each option independently at the given chance", () => {
    const draws = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.1, 0.9, 0.9];
    let i = 0;
    const offer = pickUpgradeChoiceOffer([], null, () => draws[i++ % draws.length]!, 0.125);
    expect(offer.enhanced).toHaveLength(1);
    expect(offer.upgrades).toContain(offer.enhanced[0]);
  });

  it("confirm grants the enhanced form when one is given", () => {
    const state = confirmUpgradeChoice(
      createRunUpgrades(),
      ["passiveGhostSlow", "passiveAfterburner"],
      "passiveGhostSlow",
      "passiveGhostSlowPlus",
    );
    expect(state.owned).toContain("passiveGhostSlowPlus");
    expect(state.owned).not.toContain("passiveGhostSlow");
  });

  it("confirm grants chosen and tracks the single declined option", () => {
    const state = createRunUpgrades();
    const options: BaseUpgradeId[] = ["passiveAfterburner", "passiveGhostSlow"];
    const next = confirmUpgradeChoice(state, options, "passiveAfterburner");
    expect(next.owned).toEqual(["passiveAfterburner"]);
    expect(next.lastDeclinedUpgradeId).toBe("passiveGhostSlow");
  });

  it("confirm with one option leaves lastDeclined unchanged", () => {
    const state = {
      ...createRunUpgrades(),
      lastDeclinedUpgradeId: "passiveGhostSlow" as BaseUpgradeId,
    };
    const next = confirmUpgradeChoice(
      state,
      ["powerPelletWarpFarthest"],
      "powerPelletWarpFarthest",
    );
    expect(next.owned).toEqual(["powerPelletWarpFarthest"]);
    expect(next.lastDeclinedUpgradeId).toBe("passiveGhostSlow");
  });

  it("confirm with three options leaves lastDeclined unchanged (ambiguous)", () => {
    const state = {
      ...createRunUpgrades(),
      lastDeclinedUpgradeId: "passiveGhostSlow" as BaseUpgradeId,
    };
    const options: BaseUpgradeId[] = [
      "passiveAfterburner",
      "powerPelletWarpFarthest",
      "passiveExtraLife",
    ];
    const next = confirmUpgradeChoice(state, options, "passiveAfterburner");
    expect(next.owned).toEqual(["passiveAfterburner"]);
    expect(next.lastDeclinedUpgradeId).toBe("passiveGhostSlow");
  });
});

describe("declineUpgrades", () => {
  it("remembers the single declined upgrade when quarters is chosen instead", () => {
    const state = createRunUpgrades();
    const next = declineUpgrades(state, ["powerPelletWarpFarthest"]);
    expect(next.lastDeclinedUpgradeId).toBe("powerPelletWarpFarthest");
  });

  it("leaves lastDeclined unchanged when zero or multiple upgrades were declined", () => {
    const state = {
      ...createRunUpgrades(),
      lastDeclinedUpgradeId: "passiveGhostSlow" as BaseUpgradeId,
    };
    expect(declineUpgrades(state, []).lastDeclinedUpgradeId).toBe("passiveGhostSlow");
    expect(
      declineUpgrades(state, ["powerPelletWarpFarthest", "passiveExtraLife"]).lastDeclinedUpgradeId,
    ).toBe("passiveGhostSlow");
  });
});

describe("pickStartingUpgrade", () => {
  it("returns null when every starting-pool id is owned", () => {
    expect(pickStartingUpgrade(STARTING_UPGRADE_POOL, () => 0)).toBeNull();
    expect(pickStartingUpgrade(STARTING_UPGRADE_POOL.map(enhancedIdOf), () => 0)).toBeNull();
  });

  it("never starts a run with Fruit Feast", () => {
    expect(STARTING_UPGRADE_POOL).not.toContain("fruitFeast");
  });

  it("picks uniformly from unowned starting-pool ids by rng", () => {
    const pool = STARTING_UPGRADE_POOL;
    expect(pickStartingUpgrade(["passiveGhostSlow"], () => 0)).toBe(pool[0]);
    expect(pickStartingUpgrade([], () => 0.9999)).toBe(pool[pool.length - 1]);
    expect(pickStartingUpgrade([pool[0]!], () => 0)).toBe(pool[1]);
  });
});

describe("eligibleUpgrades", () => {
  it("excludes owned ids", () => {
    const unlocked = ALL_IDS.filter((id) => !isSpecialist(id));
    expect(eligibleUpgrades([])).toEqual(unlocked);
    expect(eligibleUpgrades(["passiveAfterburner"])).toEqual(
      unlocked.filter((id) => id !== "passiveAfterburner"),
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
      cornerTeleportHoldMs: null,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
      frightenGhosts: false,
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
      cornerTeleportHoldMs: null,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
      frightenGhosts: false,
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
    expect(ghostHouseClydePelletAdd(["passiveAfterburner"])).toBe(0);
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
      cornerTeleportHoldMs: null,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
      frightenGhosts: false,
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
      cornerTeleportHoldMs: null,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
      frightenGhosts: false,
    });
  });
});

describe("scatter burst / multi power-pellet effects", () => {
  it("requests a corner teleport with no hold when Scatter Burst is owned", () => {
    expect(applyPowerPelletEffects(createRunUpgrades(), 1).cornerTeleportHoldMs).toBeNull();
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletScatterBurst");
    expect(applyPowerPelletEffects(owned, 1).cornerTeleportHoldMs).toBe(0);
  });

  it("fires all owned power-pellet effects together", () => {
    let state = createRunUpgrades();
    for (const id of [
      "powerPelletFreeze",
      "powerPelletScatterBurst",
      "powerPelletSpeedBurst",
      "powerPelletGhostRecall",
      "powerPelletWarpFarthest",
      "powerPelletInvuln",
      "powerPelletExtraHungry",
      "powerPelletWallPass",
    ] as const) {
      state = grantUpgrade(state, id);
    }
    const result = applyPowerPelletEffects(state, 1);
    expect(result.state.freezeRemainingMs).toBe(0);
    expect(result.freezeClosestMs).toBe(FREEZE_MS);
    expect(result.cornerTeleportHoldMs).toBe(0);
    expect(result.state.invulnRemainingMs).toBe(INVULN_MS);
    expect(result.state.speedBurstRemainingMs).toBe(SPEED_BURST_MS);
    expect(result.state.wallPassRemainingMs).toBe(WALL_PASS_MS);
    expect(result.recallGhostCount).toBe(1);
    expect(result.warpPlayerFarthest).toBe(true);
    expect(result.collectExtraPellets).toBe(EXTRA_HUNGRY_COUNT);
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
      grantUpgrade(createRunUpgrades(), "powerPelletWarpFarthest"),
      1,
    );
    expect(warp.recallGhostCount).toBe(0);
    expect(warp.warpPlayerFarthest).toBe(true);
    expect(warp.collectExtraPellets).toBe(0);
  });

  it("sets collectExtraPellets once from powerCollectThree", () => {
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletExtraHungry");
    expect(applyPowerPelletEffects(owned, 1).collectExtraPellets).toBe(EXTRA_HUNGRY_COUNT);
    expect(applyPowerPelletEffects(owned, 2).collectExtraPellets).toBe(EXTRA_HUNGRY_COUNT);
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
      cornerTeleportHoldMs: null,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
      frightenGhosts: false,
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

  it("raises Ghost Proof to 1s on a tunnel exit and never shortens a longer timer", () => {
    const owned = createRunUpgrades(["passiveTunnelSanctuary"]);
    expect(applyTunnelExitInvuln(owned, owned.owned).invulnRemainingMs).toBe(1000);
    expect(
      applyTunnelExitInvuln({ ...owned, invulnRemainingMs: INVULN_MS }, owned.owned)
        .invulnRemainingMs,
    ).toBe(INVULN_MS);
    const plus = createRunUpgrades(["passiveTunnelSanctuaryPlus", "passiveOverchargePlus"]);
    expect(applyTunnelExitInvuln(plus, plus.owned).invulnRemainingMs).toBe(1000);
    const bare = createRunUpgrades();
    expect(applyTunnelExitInvuln(bare, bare.owned)).toBe(bare);
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

  it("composes burst mul with Afterburner only while active", () => {
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
    both = grantUpgrade(both, "passiveAfterburner");
    both = { ...both, speedBurstRemainingMs: SPEED_BURST_MS };
    expect(playerSpeedMultiplier(both.owned)).toBe(1);
    expect(
      cellSpeedMultiplier(both.owned, true) * (speedBurstActive(both) ? PLAYER_SPEED_BURST_MUL : 1),
    ).toBe(AFTERBURNER_MUL * PLAYER_SPEED_BURST_MUL);

    const expired = { ...both, speedBurstRemainingMs: 0 };
    expect(
      cellSpeedMultiplier(expired.owned, true) *
        (speedBurstActive(expired) ? PLAYER_SPEED_BURST_MUL : 1),
    ).toBe(AFTERBURNER_MUL);
  });
});

describe("speed multipliers / labels", () => {
  it("multiplies owned speed defs", () => {
    expect(playerSpeedMultiplier([])).toBe(1);
    expect(playerSpeedMultiplier(["passiveAfterburner"])).toBe(1);
    expect(ghostSpeedMultiplier(["passiveGhostSlow"])).toBe(GHOST_SLOW_MUL);
    expect(ghostSpeedMultiplier(["passiveAfterburner"])).toBe(1);
  });

  it("maps owned ids to labels in order", () => {
    expect(
      upgradeLabels(["passiveGhostSlow", "passiveAfterburner", "powerPelletScatterBurst"]),
    ).toEqual(["Ghost Slow", "Afterburner", "Scatter Burst"]);
  });
});

describe("pelletCollectRadiusBonusPx", () => {
  it("returns TILE_SIZE for pickupRange and 0 otherwise", () => {
    expect(pelletCollectRadiusBonusPx([])).toBe(0);
    expect(pelletCollectRadiusBonusPx(["passivePickupRange"])).toBe(TILE_SIZE);
    expect(pelletCollectRadiusBonusPx(["passivePickupRangePlus"])).toBe(2 * TILE_SIZE);
    expect(pelletCollectRadiusBonusPx(["passiveAfterburner"])).toBe(0);
  });
});

describe("fruitQuartersPerFruit", () => {
  it("pays Quarters directly only while Quarter Bounty is owned", () => {
    expect(fruitQuartersPerFruit([])).toBeNull();
    expect(fruitQuartersPerFruit(["fruitQuarterBounty"])).toBe(FRUIT_QUARTERS);
    expect(fruitQuartersPerFruit(["fruitQuarterBountyPlus"])).toBe(FRUIT_QUARTERS_ENHANCED);
    expect(fruitQuartersPerFruit(["passiveAfterburner"])).toBeNull();
  });
});

describe("moneyTalksCost", () => {
  it("charges 3 Quarters, 1 enhanced, and nothing when not owned", () => {
    expect(moneyTalksCost([])).toBeNull();
    expect(moneyTalksCost(["passiveMoneyTalks"])).toBe(MONEY_TALKS_QUARTERS);
    expect(moneyTalksCost(["passiveMoneyTalksPlus"])).toBe(MONEY_TALKS_ENHANCED_QUARTERS);
    expect(moneyTalksCost(["passiveDefyDeath"])).toBeNull();
  });
});

describe("Martyr", () => {
  it("sends ghosts to their corners, or home when enhanced", () => {
    expect(martyrGhostPlacement([])).toBeNull();
    expect(martyrGhostPlacement(["passiveMartyr"])).toBe("corners");
    expect(martyrGhostPlacement(["passiveMartyrPlus"])).toBe("house");
  });
});

describe("interestPayout", () => {
  it("pays 1 per 3 held, 1 per 2 enhanced, rounding down", () => {
    expect(interestPayout([], 30)).toBe(0);
    expect(interestPayout(["passiveInterest"], 0)).toBe(0);
    expect(interestPayout(["passiveInterest"], 2)).toBe(0);
    expect(interestPayout(["passiveInterest"], 3)).toBe(1);
    expect(interestPayout(["passiveInterest"], 10)).toBe(3);
    expect(interestPayout(["passiveInterestPlus"], 1)).toBe(0);
    expect(interestPayout(["passiveInterestPlus"], 9)).toBe(4);
  });

  it("is enhanced by Automation Specialist", () => {
    const owned = effectiveOwned(["passiveInterest", "passiveAutomationSpecialistPlus"]);
    expect(interestPayout(owned, 9)).toBe(4);
  });
});

describe("Near Miss", () => {
  it("charges the BONUS bar per pass, double when enhanced", () => {
    expect(nearMissCharge([])).toBe(0);
    expect(nearMissCharge(["passiveNearMiss"])).toBe(NEAR_MISS_CHARGE);
    expect(nearMissCharge(["passiveNearMissPlus"])).toBe(NEAR_MISS_ENHANCED_CHARGE);
  });
});

describe("Haunting", () => {
  it("cages for 10 seconds, or the rest of the level when enhanced", () => {
    expect(hauntDurationMs([])).toBeNull();
    expect(hauntDurationMs(["passiveHaunting"])).toBe(HAUNTING_MS);
    expect(hauntDurationMs(["passiveHauntingPlus"])).toBe(Number.POSITIVE_INFINITY);
  });

  it("holds the ghost until the timer runs out", () => {
    const armed = armHaunt(createRunUpgrades(["passiveHaunting"]), 7, HAUNTING_MS);
    expect(hauntedGhost(armed)).toEqual({ eid: 7, remainingMs: HAUNTING_MS });
    expect(hauntedGhostEid(tickHaunt(armed, HAUNTING_MS - 1))).toBe(7);
    const expired = tickHaunt(armed, HAUNTING_MS);
    expect(hauntedGhostEid(expired)).toBeNull();
    expect(hauntedGhost(expired)).toBeNull();
  });

  it("never expires a rest-of-level haunt, but clearing the timers frees it", () => {
    const armed = armHaunt(createRunUpgrades(["passiveHauntingPlus"]), 3, Infinity);
    expect(hauntedGhostEid(tickHaunt(armed, 1_000_000))).toBe(3);
    expect(hauntedGhostEid(clearUpgradeTimers(armed))).toBeNull();
  });
});

describe("passiveOvercharge", () => {
  it("doubles every owned onPowerPellet timer duration", () => {
    let state = createRunUpgrades();
    for (const id of [
      "powerPelletFreeze",
      "powerPelletScatterBurstPlus",
      "powerPelletWallPass",
      "powerPelletInvuln",
      "powerPelletSpeedBurst",
      "passiveOvercharge",
    ] as const) {
      state = grantUpgrade(state, id);
    }
    const result = applyPowerPelletEffects(state, 1);
    expect(result.freezeClosestMs).toBe(FREEZE_MS * OVERCHARGE_MUL);
    expect(result.cornerTeleportHoldMs).toBe(CORNER_TELEPORT_HOLD_ENHANCED_MS * OVERCHARGE_MUL);
    expect(result.state.wallPassRemainingMs).toBe(WALL_PASS_MS * OVERCHARGE_MUL);
    expect(result.state.invulnRemainingMs).toBe(INVULN_MS * OVERCHARGE_MUL);
    expect(result.state.speedBurstRemainingMs).toBe(SPEED_BURST_MS * OVERCHARGE_MUL);
  });

  it("does not double recall, warp, or collectExtraPellets", () => {
    let state = createRunUpgrades();
    for (const id of [
      "powerPelletGhostRecall",
      "powerPelletWarpFarthest",
      "powerPelletExtraHungry",
      "passiveOvercharge",
    ] as const) {
      state = grantUpgrade(state, id);
    }
    const result = applyPowerPelletEffects(state, 1);
    expect(result.recallGhostCount).toBe(1);
    expect(result.warpPlayerFarthest).toBe(true);
    expect(result.collectExtraPellets).toBe(EXTRA_HUNGRY_COUNT);
  });

  it("is a no-op alone with nothing else owned", () => {
    const state = grantUpgrade(createRunUpgrades(), "passiveOvercharge");
    expect(applyPowerPelletEffects(state, 1)).toEqual({
      state,
      freezeClosestMs: null,
      recallGhostCount: 0,
      cornerTeleportHoldMs: null,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
      frightenGhosts: false,
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

  it("is doubled by Overcharge and clears with the other timers", () => {
    let state = grantUpgrade(createRunUpgrades(), "passiveDefyDeath");
    state = grantUpgrade(state, "passiveOvercharge");
    const armed = applyPowerPelletEffects(state, 1).state;
    expect(armed.defyDeathRemainingMs).toBe(DEFY_DEATH_MS * OVERCHARGE_MUL);
    expect(clearUpgradeTimers(armed).defyDeathRemainingMs).toBe(0);
  });
});

describe("shield pellets", () => {
  it("has no cap unless owned; caps at 1 base and 3 enhanced", () => {
    expect(shieldPelletsCap([])).toBeNull();
    expect(shieldPelletsCap(["passiveShieldPellets"])).toBe(SHIELD_PELLETS_CAP);
    expect(shieldPelletsCap(["passiveShieldPelletsPlus"])).toBe(SHIELD_PELLETS_ENHANCED_CAP);
  });

  it("banks up to the cap and ignores banking when not owned", () => {
    expect(bankShields(createRunUpgrades(), 2).shieldsBanked).toBe(0);
    const base = createRunUpgrades(["passiveShieldPellets"]);
    expect(bankShields(bankShields(base, 1), 1).shieldsBanked).toBe(1);
    const plus = createRunUpgrades(["passiveShieldPelletsPlus"]);
    expect(bankShields(plus, 2).shieldsBanked).toBe(2);
    expect(bankShields(bankShields(plus, 2), 2).shieldsBanked).toBe(3);
  });

  it("spends one shield, or returns null when the bank is empty", () => {
    const plus = bankShields(createRunUpgrades(["passiveShieldPelletsPlus"]), 3);
    expect(spendShield(plus)?.shieldsBanked).toBe(2);
    expect(spendShield(createRunUpgrades(["passiveShieldPelletsPlus"]))).toBeNull();
  });

  it("break immunity keeps a longer invuln and is multiplied by Overcharge", () => {
    const base = createRunUpgrades(["passiveShieldPellets"]);
    expect(applyShieldBreakInvuln(base).invulnRemainingMs).toBe(SHIELD_BREAK_INVULN_MS);
    const longer = { ...base, invulnRemainingMs: INVULN_MS };
    expect(applyShieldBreakInvuln(longer).invulnRemainingMs).toBe(INVULN_MS);
    const overcharged = createRunUpgrades(["passiveShieldPellets", "passiveOverchargePlus"]);
    expect(applyShieldBreakInvuln(overcharged).invulnRemainingMs).toBe(
      SHIELD_BREAK_INVULN_MS * OVERCHARGE_ENHANCED_MUL,
    );
  });

  it("empties the bank when Shield Pellets is revoked", () => {
    const banked = bankShields(createRunUpgrades(["passiveShieldPelletsPlus"]), 3);
    expect(revokeUpgrade(banked, "passiveShieldPelletsPlus").shieldsBanked).toBe(0);
    expect(revokeUpgrade(banked, "powerPelletInvuln").shieldsBanked).toBe(3);
  });

  it("keeps the bank through clearUpgradeTimers", () => {
    const banked = bankShields(createRunUpgrades(["passiveShieldPellets"]), 1);
    expect(clearUpgradeTimers(banked).shieldsBanked).toBe(1);
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
  it("assigns every upgrade one of the seven schools", () => {
    const schools = Object.keys(UPGRADE_SCHOOL_LABELS).sort();
    expect(schools).toEqual([
      "automation",
      "death",
      "disruption",
      "harvest",
      "neutral",
      "protection",
      "speed",
    ]);
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
    expect(eligibleUpgrades([])).toEqual(ALL_UPGRADE_IDS.filter((id) => !isSpecialist(id)));
    expect(eligibleUpgrades(["passiveGhostSlowPlus"])).not.toContain("passiveGhostSlow");
  });

  it("hasUpgrade matches either form", () => {
    expect(hasUpgrade(["passiveGhostSlow"], "passiveGhostSlow")).toBe(true);
    expect(hasUpgrade(["passiveGhostSlowPlus"], "passiveGhostSlow")).toBe(true);
    expect(hasUpgrade(["passiveGhostSlow"], "passiveAfterburner")).toBe(false);
  });

  it("enhances in place, once, and never grants a base alongside its Plus", () => {
    const state = createRunUpgrades(["passiveGhostSlow", "passiveAfterburner"]);
    const enhanced = enhanceUpgrade(state, "passiveGhostSlow");
    expect(enhanced.owned).toEqual(["passiveGhostSlowPlus", "passiveAfterburner"]);
    expect(enhanceUpgrade(enhanced, "passiveGhostSlow")).toBe(enhanced);
    expect(enhanceableUpgrades(enhanced.owned)).toEqual(["passiveAfterburner"]);
    expect(grantUpgrade(enhanced, "passiveGhostSlow")).toBe(enhanced);
    expect(enhanceUpgrade(createRunUpgrades(), "passiveGhostSlow").owned).toEqual([]);
  });

  it("revokes whichever form is owned", () => {
    const state = createRunUpgrades(["passiveGhostSlowPlus"]);
    expect(revokeUpgrade(state, "passiveGhostSlow").owned).toEqual([]);
  });

  it("carries the outgoing form onto the incoming upgrade", () => {
    expect(carryEnhancement("passiveGhostSlowPlus", "passiveAfterburner")).toBe(
      "passiveAfterburnerPlus",
    );
    expect(carryEnhancement("passiveGhostSlow", "passiveAfterburner")).toBe("passiveAfterburner");
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
    expect(cellSpeedMultiplier(["passiveAfterburner"], true)).toBe(1.3);
    expect(cellSpeedMultiplier(["passiveAfterburnerPlus"], true)).toBe(1.5);
    expect(cellSpeedMultiplier(["passiveAfterburner"], false)).toBe(0.9);
    expect(cellSpeedMultiplier(["passiveAfterburnerPlus"], false)).toBe(0.9);
    expect(cellSpeedMultiplier([], true)).toBe(1);
    expect(AFTERBURNER_ENHANCED_MUL).toBe(1.5);
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
    expect(ghostTunnelSpeedRatio(["passiveTunnelSanctuary"])).toBe(0.9);
    expect(ghostTunnelSpeedRatio(["passiveTunnelSanctuaryPlus"])).toBeNull();
    expect(ghostTunnelSpeedRatio(["passiveTunnelDashPlus", "passiveTunnelSanctuary"])).toBe(0.9);
    expect(tunnelExitInvulnMs(["passiveTunnelSanctuary"])).toBe(1000);
    expect(tunnelExitInvulnMs(["passiveTunnelSanctuaryPlus"])).toBe(1000);
    expect(tunnelExitInvulnMs([])).toBe(0);
    expect(ghostsBlockedFromTunnels(["passiveTunnelSanctuary"])).toBe(false);
    expect(ghostsBlockedFromTunnels(["passiveTunnelSanctuaryPlus"])).toBe(true);
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

  it("pays Death's Bounty as a full bar that decays per prior death on the level", () => {
    const charges = (id: UpgradeId) => [0, 1, 2, 3, 4].map((n) => deathsBountyCharge([id], n));
    expect(charges("passiveDeathsBounty")).toEqual([300, 240, 192, 153, 122]);
    expect(charges("passiveDeathsBountyPlus")).toEqual([300, 270, 243, 218, 196]);
    expect(deathsBountyCharge([], 0)).toBe(0);
  });

  it("Lazy Looper requires outer + inner rings, Plus only the outer ring", () => {
    expect(lazyLooperRings(["passiveLazyLooper"])).toBe("outerInner");
    expect(lazyLooperRings(["passiveLazyLooperPlus"])).toBe("outer");
    expect(lazyLooperRings(["passiveAfterburner"])).toBeNull();
  });

  it("applies enhanced power-pellet numbers", () => {
    const apply = (id: UpgradeId) => applyPowerPelletEffects(createRunUpgrades([id]), 1);
    expect(apply("powerPelletFreezePlus").freezeClosestMs).toBe(5000);
    expect(apply("powerPelletScatterBurstPlus").cornerTeleportHoldMs).toBe(2000);
    expect(apply("powerPelletInvulnPlus").state.invulnRemainingMs).toBe(5000);
    expect(apply("powerPelletGhostHarvesterPlus").state.ghostHarvestRemainingMs).toBe(8000);
    expect(apply("passiveDefyDeathPlus").state.defyDeathRemainingMs).toBe(8000);
    expect(apply("powerPelletGhostRecallPlus").recallGhostCount).toBe(2);
    expect(apply("powerPelletExtraHungryPlus").collectExtraPellets).toBe(10);
    expect(apply("powerPelletWallPassPlus").state.wallPassRemainingMs).toBe(6000);
  });

  it("Warp Farthest Plus shields for 2s and Overcharge does not triple it", () => {
    const warp = applyPowerPelletEffects(createRunUpgrades(["powerPelletWarpFarthestPlus"]), 1);
    expect(warp.warpPlayerFarthest).toBe(true);
    expect(warp.state.invulnRemainingMs).toBe(2000);
    const both = applyPowerPelletEffects(
      createRunUpgrades(["powerPelletWarpFarthestPlus", "passiveOverchargePlus"]),
      1,
    );
    expect(both.state.invulnRemainingMs).toBe(2000);
    const proof = applyPowerPelletEffects(
      createRunUpgrades(["powerPelletWarpFarthestPlus", "powerPelletInvuln", "passiveOvercharge"]),
      1,
    );
    expect(proof.state.invulnRemainingMs).toBe(6000);
  });

  it("Overcharge Plus triples enhanced timers including Defy Death", () => {
    const result = applyPowerPelletEffects(
      createRunUpgrades(["passiveOverchargePlus", "powerPelletFreezePlus", "passiveDefyDeathPlus"]),
      1,
    );
    expect(result.freezeClosestMs).toBe(15000);
    expect(result.state.defyDeathRemainingMs).toBe(24000);
  });
});

describe("School Specialists", () => {
  const THREE_DEATH: UpgradeId[] = ["passiveDefyDeath", "passiveMoneyTalks", "passiveMyogenesis"];

  it("enhances every upgrade in its school once three others are owned", () => {
    expect(effectiveOwned([...THREE_DEATH, "passiveDeathSpecialist", "passiveOvercharge"])).toEqual(
      [
        "passiveDefyDeathPlus",
        "passiveMoneyTalksPlus",
        "passiveMyogenesisPlus",
        "passiveDeathSpecialist",
        "passiveOvercharge",
      ],
    );
  });

  it("does not count itself toward the three", () => {
    const owned: UpgradeId[] = ["passiveDefyDeath", "passiveMoneyTalks", "passiveDeathSpecialist"];
    expect(effectiveOwned(owned)).toEqual(owned);
  });

  it("counts already-enhanced upgrades toward the three", () => {
    expect(
      effectiveOwned([
        "passiveDefyDeathPlus",
        "passiveMoneyTalks",
        "passiveMyogenesis",
        "passiveDeathSpecialist",
      ]),
    ).toEqual([
      "passiveDefyDeathPlus",
      "passiveMoneyTalksPlus",
      "passiveMyogenesisPlus",
      "passiveDeathSpecialist",
    ]);
  });

  it("leaves other schools and Neutral alone", () => {
    const owned: UpgradeId[] = [
      ...THREE_DEATH,
      "passiveDeathSpecialist",
      "fruitFeast",
      "passivePelletToPower",
    ];
    expect(effectiveOwned(owned).slice(4)).toEqual(["fruitFeast", "passivePelletToPower"]);
  });

  it("enhanced form needs no threshold", () => {
    expect(effectiveOwned(["passiveDefyDeath", "passiveDeathSpecialistPlus"])).toEqual([
      "passiveDefyDeathPlus",
      "passiveDeathSpecialistPlus",
    ]);
  });

  it("returns the same array when no specialist is owned", () => {
    const owned: UpgradeId[] = [...THREE_DEATH];
    expect(effectiveOwned(owned)).toBe(owned);
  });

  it("feeds power-pellet effects", () => {
    const result = applyPowerPelletEffects(
      createRunUpgrades([...THREE_DEATH, "passiveDeathSpecialist"]),
      1,
    );
    expect(result.state.defyDeathRemainingMs).toBe(DEFY_DEATH_ENHANCED_MS);
  });

  it("lists only the bases a specialist enhances", () => {
    expect(
      specialistEnhancedBases([
        "passiveDefyDeathPlus",
        "passiveMoneyTalks",
        "passiveMyogenesis",
        "passiveDeathSpecialist",
      ]),
    ).toEqual(["passiveMoneyTalks", "passiveMyogenesis"]);
  });

  it("is offered only with three upgrades of its school", () => {
    expect(eligibleUpgrades(THREE_DEATH.slice(0, 2))).not.toContain("passiveDeathSpecialist");
    const eligible = eligibleUpgrades(THREE_DEATH);
    expect(eligible).toContain("passiveDeathSpecialist");
    expect(eligible).not.toContain("passiveHarvestSpecialist");
  });

  it("hides specialist-enhanced upgrades from the store's enhance pool", () => {
    expect(enhanceableUpgrades([...THREE_DEATH, "passiveDeathSpecialist", "fruitFeast"])).toEqual([
      "passiveDeathSpecialist",
      "fruitFeast",
    ]);
  });

  it("Protection Specialist raises the Shield Pellets bank to its enhanced cap", () => {
    const owned: UpgradeId[] = [
      "powerPelletWarpFarthest",
      "powerPelletInvuln",
      "passiveShieldPellets",
      "passiveProtectionSpecialist",
    ];
    expect(bankShields(createRunUpgrades(owned), 5).shieldsBanked).toBe(3);
    expect(bankShields(createRunUpgrades(owned.slice(0, 3)), 5).shieldsBanked).toBe(1);
  });

  it("is left off the LEARN list", () => {
    const ids = learnUpgradeDefs(["passiveDefyDeath", "passiveDeathSpecialist"]).map(
      (def) => def.id,
    );
    expect(ids).toEqual(["passiveDefyDeath"]);
  });
});

describe("Streak Engine", () => {
  it("fires every 30 pellets in both forms", () => {
    expect(streakEngineEvery([])).toBeNull();
    expect(streakEngineEvery(["passiveStreakEngine"])).toBe(STREAK_ENGINE_EVERY);
    expect(streakEngineEvery(["passiveStreakEnginePlus"])).toBe(STREAK_ENGINE_EVERY);
  });

  it("grants Ghost Proof only when enhanced, scaled by Overcharge", () => {
    expect(streakEngineInvulnMs(["passiveStreakEngine"])).toBe(0);
    expect(streakEngineInvulnMs(["passiveStreakEnginePlus"])).toBe(
      STREAK_ENGINE_ENHANCED_INVULN_MS,
    );
    const base = createRunUpgrades(["passiveStreakEngine"]);
    expect(applyStreakEngineInvuln(base, base.owned)).toBe(base);
    const plus = createRunUpgrades(["passiveStreakEnginePlus", "passiveOvercharge"]);
    expect(applyStreakEngineInvuln(plus, plus.owned).invulnRemainingMs).toBe(
      STREAK_ENGINE_ENHANCED_INVULN_MS * 2,
    );
  });

  it("never shortens a longer Ghost Proof", () => {
    const state = {
      ...createRunUpgrades(["passiveStreakEnginePlus"]),
      invulnRemainingMs: STREAK_ENGINE_ENHANCED_INVULN_MS + 500,
    };
    expect(applyStreakEngineInvuln(state, state.owned)).toBe(state);
  });
});

describe("Echo", () => {
  const firstPick = (): number => 0;

  it("queues one random owned power-pellet upgrade 3s out", () => {
    const state = createRunUpgrades(["passiveEcho", "powerPelletInvuln", "powerPelletFreeze"]);
    expect(queueEcho(state, () => 0.99).pendingEchoes).toEqual([
      { remainingMs: ECHO_DELAY_MS, bases: ["powerPelletFreeze"] },
    ]);
  });

  it("queues every owned power-pellet upgrade when enhanced", () => {
    const state = createRunUpgrades(["passiveEchoPlus", "powerPelletInvuln", "passiveGhostSlow"]);
    const next = queueEcho(state, firstPick);
    expect(next.pendingEchoes).toEqual([
      { remainingMs: ECHO_DELAY_MS, bases: ["powerPelletInvuln"] },
    ]);
    const both = queueEcho(
      createRunUpgrades(["passiveEchoPlus", "powerPelletInvuln", "powerPelletFreeze"]),
      firstPick,
    );
    expect(both.pendingEchoes[0]!.bases).toEqual(["powerPelletInvuln", "powerPelletFreeze"]);
  });

  it("queues nothing without Echo or without power-pellet upgrades", () => {
    const noEcho = createRunUpgrades(["powerPelletInvuln"]);
    expect(queueEcho(noEcho, firstPick)).toBe(noEcho);
    const noPower = createRunUpgrades(["passiveEcho", "passiveGhostSlow"]);
    expect(queueEcho(noPower, firstPick)).toBe(noPower);
  });

  it("reads one or all from the owned form", () => {
    expect(echoEffects(["passiveEcho"])).toBe("one");
    expect(echoEffects(["passiveEchoPlus"])).toBe("all");
    expect(echoEffects(["powerPelletInvuln"])).toBeNull();
  });

  it("keeps each queued echo separate", () => {
    const state = createRunUpgrades(["passiveEcho", "powerPelletInvuln"]);
    expect(queueEcho(queueEcho(state, firstPick), firstPick).pendingEchoes).toHaveLength(2);
  });

  it("is cleared with the other upgrade timers", () => {
    const state = queueEcho(createRunUpgrades(["passiveEcho", "powerPelletInvuln"]), firstPick);
    expect(clearUpgradeTimers(state).pendingEchoes).toEqual([]);
  });

  it("fires only the echoed upgrades, still scaled by Overcharge", () => {
    const state = createRunUpgrades([
      "powerPelletInvuln",
      "powerPelletSpeedBurst",
      "passiveOvercharge",
    ]);
    const echo = applyPowerPelletEffects(state, 1, ["powerPelletInvuln"]);
    expect(echo.state.invulnRemainingMs).toBe(INVULN_MS * 2);
    expect(echo.state.speedBurstRemainingMs).toBe(0);
  });
});

describe("Hunter", () => {
  const chomp = (owned: UpgradeId[], level = 1) =>
    applyPowerPelletEffects(createRunUpgrades(owned), 1, undefined, level);

  it("frightens for 6s at level 1, shortening per level to 4s; Hunter+ stays at 6s", () => {
    expect(chomp(["powerPelletHunter"]).state.frightenedRemainingMs).toBe(6000);
    expect(chomp(["powerPelletHunter"], 3).state.frightenedRemainingMs).toBe(5000);
    expect(chomp(["powerPelletHunter"], 8).state.frightenedRemainingMs).toBe(4000);
    expect(chomp(["powerPelletHunterPlus"], 8).state.frightenedRemainingMs).toBe(6000);
    expect(chomp(["powerPelletHunter"]).frightenGhosts).toBe(true);
    expect(chomp([]).frightenGhosts).toBe(false);
  });

  it("Overcharge doubles the fright and Overcharge+ triples it", () => {
    expect(chomp(["powerPelletHunter", "passiveOvercharge"], 5).state.frightenedRemainingMs).toBe(
      8000,
    );
    expect(
      chomp(["powerPelletHunterPlus", "passiveOverchargePlus"]).state.frightenedRemainingMs,
    ).toBe(18_000);
  });

  it("pays 75, 150 then 300 per ghost eaten and restarts the count on a new chomp", () => {
    let state = {
      ...chomp(["powerPelletHunter"]).state,
      frightenedGhostEids: [1, 2, 3],
    };
    const charges: number[] = [];
    for (const eid of [1, 2, 3]) {
      const ate = eatFrightenedGhost(state, eid, false);
      charges.push(ate.charge);
      state = ate.state;
    }
    expect(charges).toEqual([75, 150, 300]);
    expect(state.frightenedGhostEids).toEqual([]);
    expect(state.hunterHeldEids).toEqual([]);
    expect(applyPowerPelletEffects(state, 1).state.ghostsEatenThisFright).toBe(0);
  });

  it("Hunter+ holds eaten ghosts until the fright ends", () => {
    expect(hunterHoldsEaten(["powerPelletHunter"])).toBe(false);
    expect(hunterHoldsEaten(["powerPelletHunterPlus"])).toBe(true);
    const frightened = {
      ...chomp(["powerPelletHunterPlus"]).state,
      frightenedGhostEids: [1, 2],
    };
    let state = eatFrightenedGhost(frightened, 1, true).state;
    expect(state.hunterHeldEids).toEqual([1]);
    expect(frightenedGhosts(state)).toEqual({ eids: [2], remainingMs: 6000 });
    state = tickFrightened(state, 5999);
    expect(state.hunterHeldEids).toEqual([1]);
    state = tickFrightened(state, 1);
    expect(state.hunterHeldEids).toEqual([]);
    expect(frightenedGhostEids(state).size).toBe(0);
    expect(frightenedGhosts(state)).toBeNull();
  });

  it("clears the fright on timer reset and when Hunter is lost", () => {
    const state = {
      ...chomp(["powerPelletHunterPlus"]).state,
      frightenedGhostEids: [1],
      hunterHeldEids: [2],
    };
    for (const cleared of [
      clearUpgradeTimers(state),
      revokeUpgrade(state, "powerPelletHunterPlus"),
    ]) {
      expect(cleared).toMatchObject({
        frightenedRemainingMs: 0,
        frightenedGhostEids: [],
        hunterHeldEids: [],
      });
    }
  });
});
