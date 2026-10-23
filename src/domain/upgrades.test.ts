import { describe, expect, it } from "vitest";
import { randomFromSeed } from "./mazeTiling";
import { INVULN_FLOOR_RATIO, levelScaledDurationMs } from "./levelScaledDuration";
import { TRINKET_IDS, TRINKET_MAX_COPIES, isTrinketId } from "./trinkets";
import {
  clearStaleUpgradeTimers,
  eatFrightenedGhost,
  frightenedGhostEids,
  frightenedGhosts,
  floatingZoneEffect,
  floatsOverHazards,
  hunterHoldsEaten,
  tickFrightened,
  DEFY_DEATH_ENHANCED_MS,
  effectiveOwned,
  isSpecialist,
  learnUpgradeDefs,
  specialistEnhancedBases,
  DEFY_DEATH_MS,
  FREEZE_ENHANCED_MS,
  FREEZE_MS,
  GHOST_HOUSE_RELIEF_PELLET_ADD,
  GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
  GHOST_SLOW_MUL,
  INVULN_ENHANCED_MS,
  INVULN_MS,
  OVERCHARGE_ENHANCED_MUL,
  SHIELD_BREAK_INVULN_MS,
  SHIELD_PELLETS_CAP,
  SHIELD_PELLETS_ENHANCED_CAP,
  applyShieldBreakInvuln,
  applyTunnelExitInvuln,
  reanimationMode,
  HAUNTING_MS,
  TITHE_ENHANCED_MS,
  TITHE_MS,
  TITHE_SPEED_MUL,
  TITHE_STREAK_WEIGHT,
  tickTithe,
  titheActive,
  titheSpeedMultiplier,
  titheStreakWeight,
  armHaunt,
  dropWall,
  droppedWallBlocksPlayer,
  tickWallDrop,
  trackPlayerOnWall,
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
  bankPeels,
  bananaPeelCap,
  BANANA_SHIELD_CAP,
  BANANA_SHIELD_ENHANCED_CAP,
  grantStartingShields,
  peelBankCap,
  powerPelletPickupFires,
  providesShields,
  shieldBankCap,
  shieldBreakOwned,
  reactiveArmorOwned,
  reactiveArmorRadiusTiles,
  REACTIVE_ARMOR_RADIUS_TILES,
  shieldOverflow,
  startingShieldCount,
  STARTING_SHIELD_COUNT,
  STARTING_SHIELD_ENHANCED_COUNT,
  shieldPelletsCap,
  spendShield,
  spendPeel,
  OVERCHARGE_MUL,
  PLAYER_SPEED_BURST_MUL,
  AFTERBURNER_MUL,
  AFTERBURNER_ENHANCED_MUL,
  MOLE_PELLET_MUL,
  MOLE_EMPTY_MUL,
  MOLE_ENHANCED_PELLET_MUL,
  EXTRA_HUNGRY_COUNT,
  EXTRA_HUNGRY_ENHANCED_COUNT,
  FRUIT_QUARTERS,
  FRUIT_QUARTERS_ENHANCED,
  MONEY_TALKS_ENHANCED_QUARTERS,
  MONEY_TALKS_QUARTERS,
  FRUIT_FECUNDITY_MUL,
  CORNER_TELEPORT_HOLD_ENHANCED_MS,
  CORNER_TELEPORT_HOLD_MS,
  SPEED_BURST_MS,
  WALL_PASS_MS,
  STORE_RARE_UPGRADE_PRICE,
  STORE_UPGRADE_PRICE,
  isRare,
  RARE_MIN_CLEAR_LEVEL,
  RARE_OFFER_MASS,
  STORE_RARE_OFFER_MASS,
  rareWeightForPool,
  SCHOOL_AFFINITY_COMMON_RATE,
  SCHOOL_AFFINITY_RARE_RATE,
  schoolAffinityPoints,
  storeUpgradeWeight,
  upgradeOfferWeight,
  takeRandomFrom,
  takeWeightedUpgrade,
  BASE_UPGRADE_DEFS,
  UPGRADE_DEFS,
  upgradeLabelAlias,
  UPGRADE_SCHOOL_LABELS,
  UPGRADE_SCHOOL_ORDER,
  groupUpgradesBySchool,
  storePriceFor,
  applyPowerPelletEffects,
  endMirror,
  mirrorSavesLife,
  cornucopiaAlongsideOwned,
  confirmUpgradeChoice,
  createRunUpgrades,
  eligibleUpgrades,
  fruitLifetimeMultiplier,
  fruitQuartersPerFruit,
  moneyTalksCost,
  type BaseUpgradeId,
  frozenGhostEid,
  ghostHouseReliefPelletAdd,
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
  claimSecondChompRespawns,
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
  wallPassActive,
  type RunUpgrades,
  type UpgradeId,
  ALL_UPGRADE_IDS,
  carryEnhancement,
  getUpgradeDef,
  remoteTransferEvery,
  deathsBountyCharge,
  inheritancePayout,
  lazyLooperRings,
  deathsHarvestRadiusTiles,
  enhanceGrantLives,
  enhanceUpgrade,
  enhanceableUpgrades,
  enhancedIdOf,
  fruitFeastThresholds,
  fruitPersistsUntilLevelEnd,
  fruitPowerEffects,
  pickFruitPowerBases,
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
  secondChompPellets,
  speedBurstMultiplier,
  turnBoostMs,
  turnPerfectPx,
  wallPassLoopOwned,
  echoEffects,
  queueEcho,
  tickHyperspeed,
  startHyperspeedTurnDelay,
  spendHyperspeedShield,
  hyperspeedMultiplier,
} from "./upgrades";
import { ECHO_DELAY_MS } from "./echo";
import { TILE_SIZE } from "./maze";
import { WALL_DROP_MS } from "./wallDrop";

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
  "passiveReanimation",
  "passiveInterest",
  "passiveNearMiss",
  "passiveHaunting",
  "passiveTunnelSanctuary",
  "passiveStreakEngine",
  "passiveEcho",
  "powerPelletHunter",
  "passiveStartingShield",
  "powerPelletHyperspeed",
  "passiveShieldBreak",
  "powerPelletCornucopia",
  "powerPelletWallDrop",
  "powerPelletProgrammer",
  "passiveInheritance",
  "powerPelletMirror",
  "powerPelletChaff",
  "passiveReactiveArmor",
  "powerPelletTithe",
  "passiveMole",
  "passiveBananaShield",
  "passiveTunnelBoring",
  "passiveMartyr",
  "passivePossession",
  "passiveFloating",
];

const MAXED_LOW: UpgradeId[] = TRINKET_IDS.flatMap((id) =>
  Array.from({ length: TRINKET_MAX_COPIES }, () => id),
);
const FULL_OWNED: UpgradeId[] = [...ALL_IDS, ...MAXED_LOW];
const withoutLow = (ids: readonly BaseUpgradeId[]): BaseUpgradeId[] =>
  ids.filter((id) => !isTrinketId(id));

const STUB_IDS: BaseUpgradeId[] = [
  "fruitPowerPellet",
  "passiveDeathsHarvest",
  "passiveOvercharge",
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

  it("accepts label lowerCamel aliases in any casing, including Plus", () => {
    expect(parseUpgradeId("secondChomp")).toBe("passivePowerPelletRecharge");
    expect(parseUpgradeId("SecondChomp")).toBe("passivePowerPelletRecharge");
    expect(parseUpgradeId("secondchomp")).toBe("passivePowerPelletRecharge");
    expect(parseUpgradeId("secondChompPlus")).toBe("passivePowerPelletRechargePlus");
    expect(parseUpgradeId("SECONDCHOMPPLUS")).toBe("passivePowerPelletRechargePlus");
    expect(parseUpgradeId("deathsHarvest")).toBe("passiveDeathsHarvest");
    expect(parseUpgradeId("deathsBounty")).toBe("passiveDeathsBounty");
    expect(parseUpgradeId("freeze")).toBe("powerPelletFreeze");
    expect(parseUpgradeId("ghostProof")).toBe("powerPelletInvuln");
    expect(parseUpgradeId("pelletSurge")).toBe("passivePelletToPower");
  });

  it("resolves every base label alias and prefers canonical ids", () => {
    const aliasKeys = BASE_UPGRADE_DEFS.map((def) => upgradeLabelAlias(def.label).toLowerCase());
    expect(new Set(aliasKeys).size).toBe(aliasKeys.length);
    for (const def of BASE_UPGRADE_DEFS) {
      const alias = upgradeLabelAlias(def.label);
      expect(parseUpgradeId(alias)).toBe(def.id);
      expect(parseUpgradeId(alias.toUpperCase())).toBe(def.id);
      expect(parseUpgradeId(`${alias}Plus`)).toBe(`${def.id}Plus`);
      expect(parseUpgradeId(def.id)).toBe(def.id);
      expect(parseUpgradeId(`${def.id}Plus`)).toBe(`${def.id}Plus`);
    }
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

  it("accepts comma-separated ids under enableUpgrade and enableUpgrades", () => {
    expect(
      parseEnableUpgradeParams(
        new URLSearchParams("enableUpgrade=passiveGhostSlow,nope, passiveAfterburner"),
      ),
    ).toEqual(["passiveGhostSlow", "passiveAfterburner"]);
    expect(
      parseEnableUpgradeParams(
        new URLSearchParams("enableUpgrades=powerPelletFreeze,passiveGhostSlowPlus"),
      ),
    ).toEqual(["powerPelletFreeze", "passiveGhostSlowPlus"]);
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
  it("offers no upgrades when none are eligible", () => {
    const offer = pickUpgradeChoiceOffer(FULL_OWNED, null, () => 0);
    expect(offer.upgrades).toEqual([]);
  });

  it("returns a single upgrade option when only one eligible", () => {
    const owned = [...ALL_IDS.filter((id) => id !== "powerPelletWarpFarthest"), ...MAXED_LOW];
    const offer = pickUpgradeChoiceOffer(owned, null, () => 0);
    expect(offer.upgrades).toEqual(["powerPelletWarpFarthest"]);
  });

  it("forces an eligible upgrade into the offer, but never an owned one", () => {
    const offer = pickUpgradeChoiceOffer([], null, () => 0, 0, "passiveRemoteTransference");
    expect(offer.upgrades).toHaveLength(2);
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

  it("returns up to two distinct unowned upgrade options", () => {
    const offer = pickUpgradeChoiceOffer([], null, () => 0);
    expect(offer.upgrades).toHaveLength(2);
    expect(new Set(offer.upgrades).size).toBe(2);
    for (const id of offer.upgrades) {
      expect(ALL_IDS).toContain(id);
    }
  });

  it("excludes lastDeclined when enough eligible remain", () => {
    const offer = pickUpgradeChoiceOffer([], "passiveGhostSlow", () => 0);
    expect(offer.upgrades).not.toContain("passiveGhostSlow");
    expect(offer.upgrades).toHaveLength(2);
  });

  it("re-includes lastDeclined when needed to fill the offer", () => {
    const owned = [
      ...ALL_IDS.filter((id) => id !== "passiveGhostSlow" && id !== "powerPelletWarpFarthest"),
      ...MAXED_LOW,
    ];
    const offer = pickUpgradeChoiceOffer(owned, "passiveGhostSlow", () => 0);
    expect(offer.upgrades).toEqual(
      expect.arrayContaining(["passiveGhostSlow", "powerPelletWarpFarthest"]),
    );
    expect(offer.upgrades).toHaveLength(2);
  });

  it("marks no option enhanced at chance 0 and every option at chance 1", () => {
    expect(pickUpgradeChoiceOffer([], null, () => 0.5).enhanced).toEqual([]);
    const all = pickUpgradeChoiceOffer([], null, () => 0.5, 1);
    expect(all.enhanced).toHaveLength(2);
    expect(all.enhanced).toEqual(expect.arrayContaining(all.upgrades));
  });

  it("enhances each option independently at the given chance", () => {
    const draws = [0.9, 0.9, 0.9, 0.9, 0.1, 0.9];
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
});

describe("pickStartingUpgrade", () => {
  it("returns null when every starting-pool id is owned", () => {
    expect(pickStartingUpgrade(STARTING_UPGRADE_POOL, () => 0)).toBeNull();
    expect(pickStartingUpgrade(STARTING_UPGRADE_POOL.map(enhancedIdOf), () => 0)).toBeNull();
  });

  it("never starts a run with Fruit Feast", () => {
    expect(STARTING_UPGRADE_POOL).not.toContain("fruitFeast");
    expect(STARTING_UPGRADE_POOL).not.toContain("passiveMyogenesis");
  });

  it("picks uniformly from unowned starting-pool ids by rng", () => {
    const pool = STARTING_UPGRADE_POOL;
    expect(pickStartingUpgrade(["passiveGhostSlow"], () => 0)).toBe(pool[0]);
    expect(pickStartingUpgrade([], () => 0.9999)).toBe(pool[pool.length - 1]);
    expect(pickStartingUpgrade([pool[0]!], () => 0)).toBe(pool[1]);
  });

  it("returns preferred when that id is still eligible", () => {
    expect(pickStartingUpgrade([], () => 0.9999, "powerPelletFreeze")).toBe("powerPelletFreeze");
    expect(pickStartingUpgrade(["powerPelletInvuln"], () => 0, "powerPelletFreeze")).toBe(
      "powerPelletFreeze",
    );
  });

  it("falls back to rng when preferred is already owned", () => {
    const pool = STARTING_UPGRADE_POOL;
    expect(pickStartingUpgrade(["powerPelletFreeze"], () => 0, "powerPelletFreeze")).toBe(pool[0]);
    expect(pickStartingUpgrade(["powerPelletFreezePlus"], () => 0.9999, "powerPelletFreeze")).toBe(
      pool[pool.length - 1],
    );
  });
});

describe("eligibleUpgrades", () => {
  it("excludes owned ids", () => {
    const unlocked = ALL_IDS.filter(
      (id) => !isSpecialist(id) && !isRare(id) && getUpgradeDef(id).reactiveArmor !== true,
    );
    expect(withoutLow(eligibleUpgrades([]))).toEqual(unlocked);
    expect(withoutLow(eligibleUpgrades(["passiveAfterburner"]))).toEqual(
      unlocked.filter((id) => id !== "passiveAfterburner" && id !== "passiveMole"),
    );
    expect(eligibleUpgrades(FULL_OWNED)).toEqual([]);
  });

  it("keeps Hyperspeed and Programmer out of the pool when the other is owned", () => {
    const pad: UpgradeId[] = ["passiveAfterburner", "passiveGhostSlow"];
    expect(eligibleUpgrades(pad)).toEqual(
      expect.arrayContaining(["powerPelletHyperspeed", "powerPelletProgrammer"]),
    );
    for (const owned of ["powerPelletHyperspeed", "powerPelletHyperspeedPlus"] as const) {
      const eligible = eligibleUpgrades([...pad, owned]);
      expect(eligible).not.toContain("powerPelletProgrammer");
      expect(eligible).not.toContain("powerPelletHyperspeed");
    }
    for (const owned of ["powerPelletProgrammer", "powerPelletProgrammerPlus"] as const) {
      const eligible = eligibleUpgrades([...pad, owned]);
      expect(eligible).not.toContain("powerPelletHyperspeed");
      expect(eligible).not.toContain("powerPelletProgrammer");
    }
  });

  it("keeps Mole and Afterburner out of the pool when the other is owned", () => {
    const pad: UpgradeId[] = ["passiveGhostSlow", "fruitFeast"];
    expect(eligibleUpgrades(pad)).toEqual(
      expect.arrayContaining(["passiveMole", "passiveAfterburner"]),
    );
    for (const owned of ["passiveAfterburner", "passiveAfterburnerPlus"] as const) {
      const eligible = eligibleUpgrades([...pad, owned]);
      expect(eligible).not.toContain("passiveMole");
      expect(eligible).not.toContain("passiveAfterburner");
    }
    for (const owned of ["passiveMole", "passiveMolePlus"] as const) {
      const eligible = eligibleUpgrades([...pad, owned]);
      expect(eligible).not.toContain("passiveAfterburner");
      expect(eligible).not.toContain("passiveMole");
    }
  });
});

describe("rare upgrades", () => {
  const RARE_IDS = [
    "fruitPowerPellet",
    "passiveOvercharge",
    "passiveLazyLooper",
    "powerPelletHunter",
    "powerPelletHyperspeed",
    "passiveShieldBreak",
    "passiveEcho",
    "powerPelletProgrammer",
    "powerPelletMirror",
    "passiveMartyr",
    "passivePossession",
  ];

  it("marks the build-around upgrades rare, in both forms", () => {
    expect(ALL_UPGRADE_IDS.filter(isRare).sort()).toEqual([...RARE_IDS].sort());
    for (const id of ALL_IDS) {
      expect(isRare(enhancedIdOf(id)), id).toBe(isRare(id));
    }
  });

  it("costs 5 in the store, and every other core upgrade 4", () => {
    for (const id of ALL_IDS) {
      expect(storePriceFor(id), id).toBe(
        isRare(id) ? STORE_RARE_UPGRADE_PRICE : STORE_UPGRADE_PRICE,
      );
    }
    expect(STORE_RARE_UPGRADE_PRICE).toBe(5);
  });

  it("derives rare weight from target mass over the live pool", () => {
    expect(RARE_OFFER_MASS).toBe(1 / 15);
    expect(STORE_RARE_OFFER_MASS).toBe(RARE_OFFER_MASS / 2);
    expect(rareWeightForPool(["passiveGhostSlow", "passiveAfterburner"], RARE_OFFER_MASS)).toBe(0);
    expect(rareWeightForPool(["fruitPowerPellet", "passiveOvercharge"], RARE_OFFER_MASS)).toBe(1);
    const pool: BaseUpgradeId[] = [
      "fruitPowerPellet",
      "passiveGhostSlow",
      "passiveAfterburner",
      "fruitFeast",
    ];
    const w = rareWeightForPool(pool, RARE_OFFER_MASS);
    expect(w).toBeCloseTo((RARE_OFFER_MASS * 3) / (1 * (1 - RARE_OFFER_MASS)));
    const rareMass = w / pool.reduce((sum, id) => sum + (isRare(id) ? w : 1), 0);
    expect(rareMass).toBeCloseTo(RARE_OFFER_MASS);
  });

  it("keeps rare mass stable when the common pool doubles", () => {
    const rares: BaseUpgradeId[] = ["fruitPowerPellet", "passiveOvercharge"];
    const smallCommons: BaseUpgradeId[] = [
      "passiveGhostSlow",
      "passiveAfterburner",
      "fruitFeast",
      "powerPelletFreeze",
    ];
    const doubledCommons: BaseUpgradeId[] = [
      ...smallCommons,
      "powerPelletInvuln",
      "powerPelletSpeedBurst",
      "passiveShieldPellets",
      "passiveDefyDeath",
    ];
    const mass = (pool: BaseUpgradeId[]) => {
      const w = rareWeightForPool(pool, RARE_OFFER_MASS);
      const total = pool.reduce((sum, id) => sum + (isRare(id) ? w : 1), 0);
      return (rares.length * w) / total;
    };
    expect(mass([...rares, ...smallCommons])).toBeCloseTo(RARE_OFFER_MASS);
    expect(mass([...rares, ...doubledCommons])).toBeCloseTo(RARE_OFFER_MASS);
  });

  it("draws at the store mass by default and removes the pick from the pool", () => {
    const poolPair: BaseUpgradeId[] = ["fruitPowerPellet", "passiveGhostSlow"];
    const w = rareWeightForPool(poolPair, STORE_RARE_OFFER_MASS);
    const rareShare = w / (w + 1);
    const draw = (roll: number) => {
      const pool = [...poolPair];
      return { picked: takeWeightedUpgrade(pool, () => roll, storeUpgradeWeight(pool)), pool };
    };
    expect(draw(0)).toEqual({ picked: "fruitPowerPellet", pool: ["passiveGhostSlow"] });
    expect(draw(rareShare - 0.0001).picked).toBe("fruitPowerPellet");
    expect(draw(rareShare + 0.0001)).toEqual({
      picked: "passiveGhostSlow",
      pool: ["fruitPowerPellet"],
    });
    const commons: BaseUpgradeId[] = ["passiveGhostSlow", "passiveAfterburner", "fruitFeast"];
    expect(takeWeightedUpgrade([...commons], () => 0.5, storeUpgradeWeight(commons))).toBe(
      takeRandomFrom([...commons], () => 0.5),
    );
  });

  it("shows up in a level-clear offer at target mass times school affinity", () => {
    const left: BaseUpgradeId[] = [
      "fruitPowerPellet",
      "passiveGhostSlow",
      "passiveAfterburner",
      "fruitFeast",
    ];
    const owned = [...ALL_IDS.filter((id) => !left.includes(id)), ...MAXED_LOW];
    let x = 7;
    const rng = () => {
      x = (x * 1103515245 + 12345) % 2147483648;
      return x / 2147483648;
    };
    const draws = 4000;
    let withRare = 0;
    for (let i = 0; i < draws; i += 1) {
      const offer = pickUpgradeChoiceOffer(owned, null, rng, 0, null, RARE_MIN_CLEAR_LEVEL);
      expect(offer.upgrades).toHaveLength(2);
      withRare += offer.upgrades.includes("fruitPowerPellet") ? 1 : 0;
    }
    const commons = left.filter((id) => id !== "fruitPowerPellet");
    let pNone = 0;
    for (let i = 0; i < commons.length; i += 1) {
      for (let j = 0; j < commons.length; j += 1) {
        if (j === i) continue;
        const order = [commons[i]!, commons[j]!];
        let p = 1;
        const remaining = [...left];
        for (const pick of order) {
          const rareBase = rareWeightForPool(remaining, RARE_OFFER_MASS);
          const weight = (id: BaseUpgradeId) => upgradeOfferWeight(id, owned, rareBase);
          const total = remaining.reduce((sum, id) => sum + weight(id), 0);
          p *= weight(pick) / total;
          remaining.splice(remaining.indexOf(pick), 1);
        }
        pNone += p;
      }
    }
    const expected = 1 - pNone;
    expect(Math.abs(withRare / draws - expected)).toBeLessThan(0.03);
  });

  it("is never a starting upgrade", () => {
    expect(STARTING_UPGRADE_POOL.filter(isRare)).toEqual([]);
  });

  it("only becomes eligible once two upgrades are owned", () => {
    expect(eligibleUpgrades([]).filter(isRare)).toEqual([]);
    expect(eligibleUpgrades(["passiveAfterburner"]).filter(isRare)).toEqual([]);
    expect(eligibleUpgrades(["passiveAfterburner", "passiveGhostSlowPlus"]).filter(isRare)).toEqual(
      ALL_UPGRADE_IDS.filter(
        (id) =>
          isRare(id) && id !== "passiveShieldBreak" && getUpgradeDef(id).reactiveArmor !== true,
      ),
    );
  });

  it("stays out of the level-clear pool before RARE_MIN_CLEAR_LEVEL", () => {
    const owned: UpgradeId[] = ["passiveAfterburner", "passiveGhostSlow"];
    expect(eligibleUpgrades(owned, { clearLevelIndex: 1 }).filter(isRare)).toEqual([]);
    expect(
      eligibleUpgrades(owned, { clearLevelIndex: RARE_MIN_CLEAR_LEVEL }).filter(isRare),
    ).toEqual(
      ALL_UPGRADE_IDS.filter(
        (id) =>
          isRare(id) && id !== "passiveShieldBreak" && getUpgradeDef(id).reactiveArmor !== true,
      ),
    );
    const blocked = pickUpgradeChoiceOffer(owned, null, () => 0, 0, null, 1);
    expect(blocked.upgrades.every((id) => !isRare(id))).toBe(true);
  });
});

describe("school offer affinity", () => {
  const deathOwned: UpgradeId[] = [
    "passiveExtraLife",
    "passiveDeathsHarvest",
    "passiveDeathSpecialist",
  ];

  it("counts owned upgrades of a school including specialists and Plus forms", () => {
    expect(schoolAffinityPoints([], "death")).toBe(0);
    expect(schoolAffinityPoints(deathOwned, "death")).toBe(3);
    expect(schoolAffinityPoints(["passiveExtraLifePlus", "passiveHaunting"], "death")).toBe(2);
    expect(schoolAffinityPoints(deathOwned, "harvest")).toBe(0);
  });

  it("never awards Neutral affinity points", () => {
    expect(schoolAffinityPoints(["passiveOvercharge"], "neutral")).toBe(0);
    expect(schoolAffinityPoints(deathOwned, "neutral")).toBe(0);
  });

  it("weights matching-school commons and rares by affinity rates, times rare base weight", () => {
    const harvestOwned: UpgradeId[] = ["fruitQuarterBounty", "fruitFecundity", "fruitFeast"];
    const rareBase = rareWeightForPool(
      ["fruitPowerPellet", "passiveGhostSlow", "passiveMyogenesis"],
      RARE_OFFER_MASS,
    );
    expect(SCHOOL_AFFINITY_COMMON_RATE).toBe(0.5);
    expect(SCHOOL_AFFINITY_RARE_RATE).toBe(0.3);
    expect(upgradeOfferWeight("passiveGhostSlow", [], rareBase)).toBe(1);
    expect(upgradeOfferWeight("fruitPowerPellet", [], rareBase)).toBe(rareBase);
    expect(upgradeOfferWeight("passiveMyogenesis", deathOwned, rareBase)).toBe(
      1 + SCHOOL_AFFINITY_COMMON_RATE * 3,
    );
    expect(upgradeOfferWeight("fruitPowerPellet", harvestOwned, rareBase)).toBe(
      (1 + SCHOOL_AFFINITY_RARE_RATE * 3) * rareBase,
    );
    expect(upgradeOfferWeight("passiveGhostSlow", deathOwned, rareBase)).toBe(1);
  });

  it("never boosts Neutral candidates even when Overcharge is owned", () => {
    const rareBase = 0.2;
    expect(upgradeOfferWeight("passiveOvercharge", ["passiveOvercharge"], rareBase)).toBe(rareBase);
    expect(upgradeOfferWeight("passiveOvercharge", deathOwned, rareBase)).toBe(rareBase);
  });

  it("biases weighted draws toward matching schools; store default stays rare-mass only", () => {
    expect(
      takeWeightedUpgrade(
        ["fruitPowerPellet", "passiveGhostSlow"],
        () => 0.34,
        storeUpgradeWeight(["fruitPowerPellet", "passiveGhostSlow"]),
      ),
    ).toBe("passiveGhostSlow");

    const pool = (): BaseUpgradeId[] => [
      "passiveMyogenesis",
      "passiveGhostSlow",
      "passiveAfterburner",
    ];
    let x = 11;
    const rng = () => {
      x = (x * 1103515245 + 12345) % 2147483648;
      return x / 2147483648;
    };
    const draws = 5000;
    let deathPicks = 0;
    let flatPicks = 0;
    for (let i = 0; i < draws; i += 1) {
      deathPicks +=
        takeWeightedUpgrade(pool(), rng, (id) => upgradeOfferWeight(id, deathOwned, 1)) ===
        "passiveMyogenesis"
          ? 1
          : 0;
      flatPicks +=
        takeWeightedUpgrade(pool(), rng, (id) => upgradeOfferWeight(id, [], 1)) ===
        "passiveMyogenesis"
          ? 1
          : 0;
    }
    expect(deathPicks).toBeGreaterThan(flatPicks);
    const boosted = 1 + SCHOOL_AFFINITY_COMMON_RATE * 3;
    expect(deathPicks / draws).toBeCloseTo(boosted / (boosted + 2), 1);
    expect(flatPicks / draws).toBeCloseTo(1 / 3, 1);
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
      cornucopiaFruit: null,
      programmerStarted: false,
      mirrorStarted: false,
      tunnelBoringRecharge: false,
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
      cornucopiaFruit: null,
      programmerStarted: false,
      mirrorStarted: false,
      tunnelBoringRecharge: false,
    });
  });

  it("ghostHouseDelay sums release delay and Clyde pellet adds", () => {
    expect(ghostHouseReleaseDelayAddMs([])).toBe(0);
    expect(ghostHouseReliefPelletAdd([])).toBe(0);
    expect(ghostHouseReleaseDelayAddMs(["passiveGhostHouseDelay"])).toBe(
      GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
    );
    expect(ghostHouseReliefPelletAdd(["passiveGhostHouseDelay"])).toBe(
      GHOST_HOUSE_RELIEF_PELLET_ADD,
    );
    expect(ghostHouseReleaseDelayAddMs(["passiveGhostSlow", "passiveGhostHouseDelay"])).toBe(
      GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
    );
    expect(ghostHouseReliefPelletAdd(["passiveAfterburner"])).toBe(0);
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
      cornucopiaFruit: null,
      programmerStarted: false,
      mirrorStarted: false,
      tunnelBoringRecharge: false,
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
      cornucopiaFruit: null,
      programmerStarted: false,
      mirrorStarted: false,
      tunnelBoringRecharge: false,
    });
  });
});

describe("scatter burst / multi power-pellet effects", () => {
  it("requests a corner teleport with a short hold when Scatter Burst is owned", () => {
    expect(applyPowerPelletEffects(createRunUpgrades(), 1).cornerTeleportHoldMs).toBeNull();
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletScatterBurst");
    expect(applyPowerPelletEffects(owned, 1).cornerTeleportHoldMs).toBe(CORNER_TELEPORT_HOLD_MS);
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
    expect(result.cornerTeleportHoldMs).toBe(CORNER_TELEPORT_HOLD_MS);
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
    expect(mid.invulnRemainingMs).toBe(INVULN_MS - 1000);
    const done = tickInvuln(mid, INVULN_MS);
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
      cornucopiaFruit: null,
      programmerStarted: false,
      mirrorStarted: false,
      tunnelBoringRecharge: false,
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

describe("Reanimation", () => {
  it("respawns where you fell, or next to a power pellet when enhanced", () => {
    expect(reanimationMode([])).toBeNull();
    expect(reanimationMode(["passiveReanimation"])).toBe("fell");
    expect(reanimationMode(["passiveReanimationPlus"])).toBe("nearPowerPellet");
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
  it("earns pennies per pass, double when enhanced", () => {
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
      cornucopiaFruit: null,
      programmerStarted: false,
      mirrorStarted: false,
      tunnelBoringRecharge: false,
    });
  });
});

describe("power pellet respawns / Second Chomp", () => {
  it("claims respawns only up to the per-level cap", () => {
    const spots = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];
    expect(claimSecondChompRespawns(0, spots, 2)).toEqual({
      positions: spots.slice(0, 2),
      used: 2,
    });
    expect(claimSecondChompRespawns(2, spots, 2)).toEqual({ positions: [], used: 2 });
  });

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

describe("banana peels", () => {
  it("has no peel cap unless owned; caps at 1 base and 3 enhanced", () => {
    expect(bananaPeelCap([])).toBeNull();
    expect(bananaPeelCap(["passiveBananaShield"])).toBe(BANANA_SHIELD_CAP);
    expect(bananaPeelCap(["passiveBananaShieldPlus"])).toBe(BANANA_SHIELD_ENHANCED_CAP);
    expect(peelBankCap(["passiveBananaShieldPlus"])).toBe(3);
  });

  it("banks peels separately from shields", () => {
    const state = createRunUpgrades(["passiveBananaShield", "passiveShieldPellets"]);
    const banked = bankShields(bankPeels(state, 1), 1);
    expect(banked.peelsBanked).toBe(1);
    expect(banked.shieldsBanked).toBe(1);
    expect(bankPeels(bankPeels(createRunUpgrades(["passiveBananaShield"]), 1), 1).peelsBanked).toBe(
      1,
    );
    expect(bankPeels(createRunUpgrades(["passiveBananaShieldPlus"]), 5).peelsBanked).toBe(3);
  });

  it("spends one peel, or returns null when empty", () => {
    const plus = bankPeels(createRunUpgrades(["passiveBananaShieldPlus"]), 3);
    expect(spendPeel(plus)?.peelsBanked).toBe(2);
    expect(spendPeel(createRunUpgrades(["passiveBananaShieldPlus"]))).toBeNull();
  });

  it("counts as a shield source for Shield Break eligibility", () => {
    expect(providesShields(["passiveBananaShield"])).toBe(true);
    expect(providesShields([])).toBe(false);
  });

  it("empties peels when Banana Trail is revoked and keeps them through timer clears", () => {
    const banked = bankPeels(createRunUpgrades(["passiveBananaShieldPlus"]), 3);
    expect(revokeUpgrade(banked, "passiveBananaShieldPlus").peelsBanked).toBe(0);
    expect(clearUpgradeTimers(banked).peelsBanked).toBe(3);
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

describe("starting shield", () => {
  it("counts 1 base, 2 enhanced, 0 unowned", () => {
    expect(startingShieldCount([])).toBe(0);
    expect(startingShieldCount(["passiveStartingShield"])).toBe(STARTING_SHIELD_COUNT);
    expect(startingShieldCount(["passiveStartingShieldPlus"])).toBe(STARTING_SHIELD_ENHANCED_COUNT);
  });

  it("tops the bank up to the count without exceeding or stacking", () => {
    const base = createRunUpgrades(["passiveStartingShield"]);
    expect(grantStartingShields(base).shieldsBanked).toBe(1);
    const plus = createRunUpgrades(["passiveStartingShieldPlus"]);
    expect(grantStartingShields({ ...plus, shieldsBanked: 1 }).shieldsBanked).toBe(2);
    expect(grantStartingShields({ ...plus, shieldsBanked: 3 }).shieldsBanked).toBe(3);
    expect(grantStartingShields(createRunUpgrades()).shieldsBanked).toBe(0);
  });

  it("banks power pellets only with Shield Pellets and adds the caps", () => {
    expect(shieldPelletsCap(["passiveStartingShield"])).toBeNull();
    expect(shieldBankCap(["passiveStartingShieldPlus"])).toBe(2);
    expect(shieldBankCap(["passiveStartingShield", "passiveShieldPellets"])).toBe(2);
    expect(shieldBankCap(["passiveStartingShieldPlus", "passiveShieldPelletsPlus"])).toBe(5);
  });

  it("clamps the bank when revoked", () => {
    const plus = grantStartingShields(createRunUpgrades(["passiveStartingShieldPlus"]));
    expect(revokeUpgrade(plus, "passiveStartingShieldPlus").shieldsBanked).toBe(0);
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
    const speedDefs = UPGRADE_DEFS.filter((d) => d.school === "speed");
    const isStarting = (id: string) => (STARTING_UPGRADE_POOL as readonly string[]).includes(id);
    const speedCommons = speedDefs.filter((d) => d.rare !== true);
    expect(speed.defs.map((d) => d.id)).toEqual([
      ...speedCommons.filter((d) => isStarting(d.id)).map((d) => d.id),
      ...speedCommons.filter((d) => !isStarting(d.id)).map((d) => d.id),
      ...speedDefs.filter((d) => d.rare === true).map((d) => d.id),
    ]);

    const protection = groupUpgradesBySchool(UPGRADE_DEFS).find((g) => g.school === "protection")!;
    const startingCount = protection.defs.filter((d) => isStarting(d.id)).length;
    expect(startingCount).toBeGreaterThan(1);
    expect(protection.defs.slice(0, startingCount).every((d) => isStarting(d.id))).toBe(true);
    expect(protection.defs.slice(0, startingCount).map((d) => d.id)).toContain(
      "passiveShieldPellets",
    );

    const some = UPGRADE_DEFS.filter((d) => d.school === "neutral" || d.school === "death");
    expect(groupUpgradesBySchool(some).map((g) => g.school)).toEqual(["death", "neutral"]);
    expect(groupUpgradesBySchool([])).toEqual([]);
  });

  it("groups neutral trinkets by kind instead of by ghost", () => {
    const neutral = groupUpgradesBySchool(UPGRADE_DEFS).find((g) => g.school === "neutral")!;
    const kinds = neutral.defs.flatMap((d) => (d.trinket ? [d.trinket.kind] : []));
    const collapsed = kinds.filter((k, i) => k !== kinds[i - 1]);
    expect(new Set(collapsed).size).toBe(collapsed.length);
    expect(collapsed).toContain("slowdown");
  });

  it("lists rare upgrades last within each school", () => {
    for (const { defs } of groupUpgradesBySchool(UPGRADE_DEFS)) {
      const firstRare = defs.findIndex((d) => d.rare === true);
      if (firstRare >= 0) {
        expect(defs.slice(firstRare).every((d) => d.rare === true)).toBe(true);
      }
    }
  });

  it("uses every school at least once", () => {
    const used = new Set(UPGRADE_DEFS.map((def) => def.school));
    expect([...used].sort()).toEqual(Object.keys(UPGRADE_SCHOOL_LABELS).sort());
  });
});

describe("enhanced upgrades", () => {
  it("derives a Plus def for every base id with a + label and the same school", () => {
    for (const id of ALL_IDS) {
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
    expect(withoutLow(eligibleUpgrades([]))).toEqual(
      ALL_IDS.filter(
        (id) => !isSpecialist(id) && !isRare(id) && getUpgradeDef(id).reactiveArmor !== true,
      ),
    );
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

  it("accepts label aliases in enableUpgrade and enableUpgrades", () => {
    expect(
      parseEnableUpgradeParams(
        new URLSearchParams("enableUpgrade=secondChomp,freezePlus&enableUpgrades=GhostSlow"),
      ),
    ).toEqual(["passivePowerPelletRecharge", "powerPelletFreezePlus", "passiveGhostSlow"]);
  });

  it("returns base versus enhanced numbers from the owned list", () => {
    expect(cellSpeedMultiplier(["passiveAfterburner"], true)).toBe(1.3);
    expect(cellSpeedMultiplier(["passiveAfterburnerPlus"], true)).toBe(1.5);
    expect(cellSpeedMultiplier(["passiveAfterburner"], false)).toBe(0.8);
    expect(cellSpeedMultiplier(["passiveAfterburnerPlus"], false)).toBe(0.8);
    expect(cellSpeedMultiplier(["passiveMole"], false)).toBe(MOLE_PELLET_MUL);
    expect(cellSpeedMultiplier(["passiveMole"], true)).toBe(MOLE_EMPTY_MUL);
    expect(cellSpeedMultiplier(["passiveMolePlus"], false)).toBe(MOLE_ENHANCED_PELLET_MUL);
    expect(cellSpeedMultiplier(["passiveMolePlus"], true)).toBe(MOLE_EMPTY_MUL);
    expect(cellSpeedMultiplier([], true)).toBe(1);
    expect(AFTERBURNER_ENHANCED_MUL).toBe(1.5);
    expect(MOLE_ENHANCED_PELLET_MUL).toBe(1.3);
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
    expect(secondChompPellets(["passivePowerPelletRecharge"])).toBe(2);
    expect(secondChompPellets(["passivePowerPelletRechargePlus"])).toBe(4);
    expect(remoteTransferEvery(["passiveRemoteTransferencePlus"])).toBe(3);
    expect(turnBoostMs(["passiveTurnTuningPlus"])).toBe(750);
    expect(turnPerfectPx(["passiveTurnTuningPlus"])).toBe(12);
    expect(ghostTunnelSpeedRatio(["passiveTunnelSanctuary"])).toBe(0.9);
    expect(ghostTunnelSpeedRatio(["passiveTunnelSanctuaryPlus"])).toBeNull();
    expect(tunnelExitInvulnMs(["passiveTunnelSanctuary"])).toBe(1000);
    expect(tunnelExitInvulnMs(["passiveTunnelSanctuaryPlus"])).toBe(1000);
    expect(tunnelExitInvulnMs([])).toBe(0);
    expect(ghostsBlockedFromTunnels(["passiveTunnelSanctuary"])).toBe(false);
    expect(ghostsBlockedFromTunnels(["passiveTunnelSanctuaryPlus"])).toBe(true);
    expect(lifeFloorBonus(["passiveExtraLifePlus"])).toBe(2);
    expect(pelletSurgeCount(["passivePelletToPowerPlus"])).toBe(2);
    expect(ghostHouseReleaseDelayAddMs(["passiveGhostHouseDelayPlus"])).toBe(3000);
    expect(ghostHouseReliefPelletAdd(["passiveGhostHouseDelayPlus"])).toBe(25);
    expect(regenToFull(["passiveMyogenesisPlus"])).toBe(true);
    expect(fruitFeastThresholds(["fruitFeastPlus"])).toEqual([45, 100, 150, 200]);
    expect(fruitPersistsUntilLevelEnd(["fruitFecundityPlus"])).toBe(true);
    expect(fruitPersistsUntilLevelEnd(["fruitFecundity"])).toBe(false);
    expect(fruitPowerEffects(["fruitPowerPellet"])).toBe("one");
    expect(fruitPowerEffects(["fruitPowerPelletPlus"])).toBe("all");
    expect(fruitPowerEffects([])).toBeNull();
    expect(wallPassLoopOwned(["powerPelletWallPassPlus"])).toBe(true);
    expect(wallPassLoopOwned(["powerPelletWallPass"])).toBe(false);
  });

  it("pays Death's Bounty as a full bar that decays per prior death on the level", () => {
    const charges = (id: UpgradeId) => [0, 1, 2, 3, 4].map((n) => deathsBountyCharge([id], n));
    expect(charges("passiveDeathsBounty")).toEqual([300, 240, 192, 153, 122]);
    expect(charges("passiveDeathsBountyPlus")).toEqual([300, 270, 243, 218, 196]);
    expect(deathsBountyCharge([], 0)).toBe(0);
  });

  it("Inheritance pays per empty life slot, or per death on the level when enhanced", () => {
    expect(inheritancePayout(["passiveInheritance"], 2, 5)).toBe(2);
    expect(inheritancePayout(["passiveInheritancePlus"], 2, 5)).toBe(5);
    expect(inheritancePayout(["passiveInheritancePlus"], 3, 0)).toBe(0);
    expect(inheritancePayout([], 2, 5)).toBe(0);
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
    expect(apply("powerPelletExtraHungryPlus").collectExtraPellets).toBe(
      EXTRA_HUNGRY_ENHANCED_COUNT,
    );
    expect(apply("powerPelletWallPassPlus").state.wallPassRemainingMs).toBe(6000);
    expect(apply("passiveTunnelBoring").tunnelBoringRecharge).toBe(false);
    expect(apply("passiveTunnelBoringPlus").tunnelBoringRecharge).toBe(true);
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
    expect(proof.state.invulnRemainingMs).toBe(INVULN_MS * 2);
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
  it("is a common upgrade at the common store price", () => {
    expect(isRare("passiveStreakEngine")).toBe(false);
    expect(isRare("passiveStreakEnginePlus")).toBe(false);
    expect(storePriceFor("passiveStreakEngine")).toBe(STORE_UPGRADE_PRICE);
  });

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

describe("Fruit Power", () => {
  it("picks one random owned power-pellet upgrade, or every one when enhanced", () => {
    const owned = ["fruitPowerPellet", "powerPelletInvuln", "powerPelletFreeze"] as const;
    expect(pickFruitPowerBases(owned, () => 0)).toEqual(["powerPelletInvuln"]);
    expect(pickFruitPowerBases(owned, () => 0.99)).toEqual(["powerPelletFreeze"]);
    expect(
      pickFruitPowerBases(
        ["fruitPowerPelletPlus", "powerPelletInvuln", "powerPelletFreeze"],
        () => 0,
      ),
    ).toEqual(["powerPelletInvuln", "powerPelletFreeze"]);
  });

  it("picks nothing without Fruit Power or without power-pellet upgrades", () => {
    expect(pickFruitPowerBases(["powerPelletInvuln"], () => 0)).toEqual([]);
    expect(pickFruitPowerBases(["fruitPowerPellet", "passiveGhostSlow"], () => 0)).toEqual([]);
  });
});

describe("level-scaled Freeze / Ghost Proof / Wall Pass", () => {
  const chomp = (owned: UpgradeId[], level = 1) =>
    applyPowerPelletEffects(createRunUpgrades(owned), 1, undefined, level);

  it("shortens Freeze / Ghost Proof / Wall Pass by level; enhanced shortens from its own base", () => {
    expect(chomp(["powerPelletFreeze"]).freezeClosestMs).toBe(FREEZE_MS);
    expect(chomp(["powerPelletFreeze"], 5).freezeClosestMs).toBe(
      levelScaledDurationMs(FREEZE_MS, 5),
    );
    expect(chomp(["powerPelletFreezePlus"], 5).freezeClosestMs).toBe(
      levelScaledDurationMs(FREEZE_ENHANCED_MS, 5),
    );

    expect(chomp(["powerPelletInvuln"]).state.invulnRemainingMs).toBe(INVULN_MS);
    expect(chomp(["powerPelletInvuln"], 5).state.invulnRemainingMs).toBe(
      levelScaledDurationMs(INVULN_MS, 5, INVULN_FLOOR_RATIO),
    );
    expect(chomp(["powerPelletInvulnPlus"], 5).state.invulnRemainingMs).toBe(
      levelScaledDurationMs(INVULN_ENHANCED_MS, 5, INVULN_FLOOR_RATIO),
    );

    expect(chomp(["powerPelletWallPass"]).state.wallPassRemainingMs).toBe(WALL_PASS_MS);
    expect(chomp(["powerPelletWallPass"], 5).state.wallPassRemainingMs).toBe(
      levelScaledDurationMs(WALL_PASS_MS, 5),
    );
    expect(chomp(["powerPelletWallPassPlus"], 5).state.wallPassRemainingMs).toBe(
      levelScaledDurationMs(WALL_PASS_MS, 5),
    );
  });

  it("Ghost Proof is 4s at level 1 and holds a 3s floor from level 5", () => {
    expect([1, 5, 9].map((l) => chomp(["powerPelletInvuln"], l).state.invulnRemainingMs)).toEqual([
      4000, 3000, 3000,
    ]);
  });

  it("Overcharge doubles the already-shortened L5 duration", () => {
    expect(chomp(["powerPelletFreeze", "passiveOvercharge"], 5).freezeClosestMs).toBe(
      levelScaledDurationMs(FREEZE_MS, 5) * OVERCHARGE_MUL,
    );
    expect(chomp(["powerPelletInvuln", "passiveOvercharge"], 5).state.invulnRemainingMs).toBe(
      levelScaledDurationMs(INVULN_MS, 5, INVULN_FLOOR_RATIO) * OVERCHARGE_MUL,
    );
    expect(chomp(["powerPelletWallPass", "passiveOvercharge"], 5).state.wallPassRemainingMs).toBe(
      levelScaledDurationMs(WALL_PASS_MS, 5) * OVERCHARGE_MUL,
    );
  });

  it("does not level-scale Warp Farthest+ invuln", () => {
    expect(chomp(["powerPelletWarpFarthestPlus"], 5).state.invulnRemainingMs).toBe(2000);
    expect(
      chomp(["powerPelletWarpFarthestPlus", "powerPelletInvuln"], 5).state.invulnRemainingMs,
    ).toBe(levelScaledDurationMs(INVULN_MS, 5, INVULN_FLOOR_RATIO));
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

describe("Hyperspeed", () => {
  const chomp = (owned: UpgradeId[], level = 1) =>
    applyPowerPelletEffects(createRunUpgrades(owned), 1, undefined, level);

  it("arms 2s, or 3s plus a 2s shield with Hyperspeed+, regardless of level", () => {
    expect(chomp(["powerPelletHyperspeed"]).state.hyperspeedRemainingMs).toBe(2000);
    expect(chomp(["powerPelletHyperspeed"], 8).state.hyperspeedRemainingMs).toBe(2000);
    expect(chomp(["powerPelletHyperspeed"]).state.hyperspeedShieldRemainingMs).toBe(0);
    const plus = chomp(["powerPelletHyperspeedPlus"]).state;
    expect(plus.hyperspeedRemainingMs).toBe(3000);
    expect(plus.hyperspeedShieldRemainingMs).toBe(2000);
  });

  it("is doubled by Overcharge, shield included", () => {
    const state = chomp(["powerPelletHyperspeedPlus", "passiveOvercharge"]).state;
    expect(state.hyperspeedRemainingMs).toBe(6000);
    expect(state.hyperspeedShieldRemainingMs).toBe(4000);
  });

  it("refreshes instead of stacking on a second chomp", () => {
    const first = chomp(["powerPelletHyperspeed"]).state;
    const ticked = tickHyperspeed(first, 1500);
    const second = applyPowerPelletEffects(ticked, 1).state;
    expect(second.hyperspeedRemainingMs).toBe(2000);
  });

  it("ticks the window, the turn delay and the shield, and clears the delay with the window", () => {
    let state = startHyperspeedTurnDelay(chomp(["powerPelletHyperspeedPlus"]).state);
    expect(state.hyperspeedTurnDelayMs).toBe(200);
    state = tickHyperspeed(state, 150);
    expect(state.hyperspeedTurnDelayMs).toBe(50);
    expect(state.hyperspeedRemainingMs).toBe(2850);
    expect(state.hyperspeedShieldRemainingMs).toBe(1850);
    state = tickHyperspeed(state, 3000);
    expect(state.hyperspeedRemainingMs).toBe(0);
    expect(state.hyperspeedTurnDelayMs).toBe(0);
    expect(state.hyperspeedShieldRemainingMs).toBe(0);
  });

  it("spends the shield once into 1s of grace, and tints while it is up", () => {
    const state = chomp(["powerPelletHyperspeedPlus"]).state;
    expect(playerTintRemainingMs(state)).toBe(2000);
    const spent = spendHyperspeedShield(state)!;
    expect(spent.hyperspeedShieldRemainingMs).toBe(0);
    expect(spent.invulnRemainingMs).toBe(1000);
    expect(spendHyperspeedShield(spent)).toBeNull();
  });

  it("reads its multiplier through the def and clears with the other timers", () => {
    expect(hyperspeedMultiplier(["powerPelletHyperspeed"])).toBe(10);
    expect(hyperspeedMultiplier([])).toBe(1);
    const cleared = clearUpgradeTimers(
      startHyperspeedTurnDelay(chomp(["powerPelletHyperspeedPlus"]).state),
    );
    expect(cleared.hyperspeedRemainingMs).toBe(0);
    expect(cleared.hyperspeedTurnDelayMs).toBe(0);
    expect(cleared.hyperspeedShieldRemainingMs).toBe(0);
  });
});

describe("Shield Break", () => {
  const twoOwned: UpgradeId[] = ["passiveAfterburner", "passiveGhostSlow"];

  it("is offered only while a shield source is owned", () => {
    expect(eligibleUpgrades(twoOwned)).not.toContain("passiveShieldBreak");
    for (const source of [
      "passiveShieldPellets",
      "passiveShieldPelletsPlus",
      "passiveStartingShield",
      "powerPelletHyperspeedPlus",
    ] as const) {
      expect(eligibleUpgrades([...twoOwned, source])).toContain("passiveShieldBreak");
    }
    expect(eligibleUpgrades([...twoOwned, "powerPelletHyperspeed"])).not.toContain(
      "passiveShieldBreak",
    );
  });

  it("counts Hyperspeed as a shield source when a specialist enhances it", () => {
    const owned: UpgradeId[] = [
      "powerPelletHyperspeed",
      "passiveSpeedSpecialistPlus",
      "passiveAfterburner",
    ];
    expect(providesShields(owned)).toBe(true);
  });

  it("is never a starting upgrade", () => {
    expect(STARTING_UPGRADE_POOL).not.toContain("passiveShieldBreak");
  });

  it("moves every pickup effect to the break", () => {
    expect(powerPelletPickupFires(["passiveShieldPellets"], 2, 0)).toBe(2);
    expect(powerPelletPickupFires(["passiveShieldPellets", "passiveShieldBreak"], 2, 1)).toBe(0);
    expect(powerPelletPickupFires(["passiveStartingShield", "passiveShieldBreak"], 1, 0)).toBe(0);
    expect(shieldBreakOwned(["passiveShieldBreakPlus"])).toBe(true);
    expect(shieldBreakOwned(["passiveShieldPellets"])).toBe(false);
  });

  it("Plus fires for pellets that could not bank a shield", () => {
    const owned: UpgradeId[] = ["passiveShieldPellets", "passiveShieldBreakPlus"];
    const full = { ...createRunUpgrades(owned), shieldsBanked: 1 };
    expect(shieldOverflow(full, 1)).toBe(1);
    expect(powerPelletPickupFires(owned, 1, shieldOverflow(full, 1))).toBe(1);
    const empty = createRunUpgrades(owned);
    expect(shieldOverflow(empty, 1)).toBe(0);
    expect(powerPelletPickupFires(owned, 1, 0)).toBe(0);
  });

  it("has no overflow without a pellet shield source", () => {
    const state = { ...createRunUpgrades(["passiveStartingShield"]), shieldsBanked: 1 };
    expect(shieldOverflow(state, 3)).toBe(0);
  });
});

describe("Reactive Armor", () => {
  const twoOwned: UpgradeId[] = ["passiveAfterburner", "passiveGhostSlow"];

  it("is offered only while a shield source is owned", () => {
    expect(eligibleUpgrades(twoOwned)).not.toContain("passiveReactiveArmor");
    for (const source of [
      "passiveShieldPellets",
      "passiveShieldPelletsPlus",
      "passiveStartingShield",
      "powerPelletHyperspeedPlus",
    ] as const) {
      expect(eligibleUpgrades([...twoOwned, source])).toContain("passiveReactiveArmor");
    }
    expect(eligibleUpgrades([...twoOwned, "powerPelletHyperspeed"])).not.toContain(
      "passiveReactiveArmor",
    );
  });

  it("is never a starting upgrade and is common", () => {
    expect(STARTING_UPGRADE_POOL).not.toContain("passiveReactiveArmor");
    expect(isRare("passiveReactiveArmor")).toBe(false);
    expect(storePriceFor("passiveReactiveArmor")).toBe(STORE_UPGRADE_PRICE);
  });

  it("reports owned and radius for base vs Plus", () => {
    expect(reactiveArmorOwned([])).toBe(false);
    expect(reactiveArmorOwned(["passiveReactiveArmor"])).toBe(true);
    expect(reactiveArmorOwned(["passiveReactiveArmorPlus"])).toBe(true);
    expect(reactiveArmorRadiusTiles(["passiveReactiveArmor"])).toBeNull();
    expect(reactiveArmorRadiusTiles(["passiveReactiveArmorPlus"])).toBe(
      REACTIVE_ARMOR_RADIUS_TILES,
    );
    expect(reactiveArmorRadiusTiles([])).toBeNull();
  });
});

describe("Cornucopia", () => {
  const apply = (id: UpgradeId) => applyPowerPelletEffects(createRunUpgrades([id]), 1);

  it("asks for a solo fruit on a power pellet, and an alongside one when enhanced", () => {
    expect(apply("powerPelletCornucopia").cornucopiaFruit).toBe("solo");
    expect(apply("powerPelletCornucopiaPlus").cornucopiaFruit).toBe("alongside");
    expect(apply("powerPelletFreeze").cornucopiaFruit).toBeNull();
  });

  it("does nothing without a power pellet", () => {
    const none = applyPowerPelletEffects(createRunUpgrades(["powerPelletCornucopia"]), 0);
    expect(none.cornucopiaFruit).toBeNull();
  });

  it("is a starting upgrade and reports the alongside rule", () => {
    expect(STARTING_UPGRADE_POOL).toContain("powerPelletCornucopia");
    expect(cornucopiaAlongsideOwned(["powerPelletCornucopia"])).toBe(false);
    expect(cornucopiaAlongsideOwned(["powerPelletCornucopiaPlus"])).toBe(true);
  });
});

describe("Wall Drop", () => {
  const CELL = { col: 5, row: 7 };
  const SPOT = { ...CELL, awayStep: { dx: -1, dy: 0 } };

  function armed(id: UpgradeId) {
    return applyPowerPelletEffects(createRunUpgrades([id]), 1).state;
  }

  it("a power pellet arms one wall drop only when owned", () => {
    expect(armed("powerPelletWallDrop").wallDropArmed).toBe(true);
    expect(applyPowerPelletEffects(createRunUpgrades(), 1).state.wallDropArmed).toBe(false);
  });

  it("drops an 8s wall that blocks the player and spends the charge", () => {
    const state = dropWall(armed("powerPelletWallDrop"), SPOT, ["powerPelletWallDrop"]);
    expect(state.wallDropArmed).toBe(false);
    expect(state.droppedWall).toEqual({
      ...SPOT,
      remainingMs: WALL_DROP_MS,
      passable: false,
      vacated: false,
    });
    expect(droppedWallBlocksPlayer(state)).toBeNull();
    const vacated = trackPlayerOnWall(state, CELL.col - 1, CELL.row);
    expect(droppedWallBlocksPlayer(vacated)).toEqual(vacated.droppedWall);
    expect(trackPlayerOnWall(vacated, CELL.col, CELL.row)).toBe(vacated);
    expect(dropWall(state, { ...SPOT, col: 1 }, ["powerPelletWallDrop"])).toBe(state);
  });

  it("expires the base wall and lets Wall Pass through it", () => {
    const state = dropWall(armed("powerPelletWallDrop"), SPOT, ["powerPelletWallDrop"]);
    expect(tickWallDrop(state, WALL_DROP_MS - 1).droppedWall?.remainingMs).toBe(1);
    expect(tickWallDrop(state, WALL_DROP_MS).droppedWall).toBeNull();
    const vacated = trackPlayerOnWall(state, CELL.col - 1, CELL.row);
    expect(droppedWallBlocksPlayer({ ...vacated, wallPassRemainingMs: 100 })).toBeNull();
  });

  it("enhanced: the wall never expires, never blocks the player, and walking back through removes it", () => {
    const state = dropWall(armed("powerPelletWallDropPlus"), SPOT, ["powerPelletWallDropPlus"]);
    expect(state.droppedWall?.passable).toBe(true);
    expect(tickWallDrop(state, 1_000_000)).toBe(state);
    expect(droppedWallBlocksPlayer(state)).toBeNull();
    expect(trackPlayerOnWall(state, CELL.col, CELL.row)).toBe(state);
    const left = trackPlayerOnWall(state, CELL.col - 1, CELL.row);
    expect(left.droppedWall?.vacated).toBe(true);
    expect(trackPlayerOnWall(left, CELL.col, CELL.row).droppedWall).toBeNull();
  });

  it("a new drop replaces the old wall, and timer clears remove wall and charge", () => {
    const first = dropWall(armed("powerPelletWallDropPlus"), SPOT, ["powerPelletWallDropPlus"]);
    const rearmed = applyPowerPelletEffects(first, 1).state;
    const second = dropWall(rearmed, { ...SPOT, col: 9, row: 9 }, ["powerPelletWallDropPlus"]);
    expect(second.droppedWall).toMatchObject({ col: 9, row: 9 });
    const cleared = clearUpgradeTimers(applyPowerPelletEffects(second, 1).state);
    expect(cleared.droppedWall).toBeNull();
    expect(cleared.wallDropArmed).toBe(false);
  });
});

describe("Programmer", () => {
  it("a power pellet starts one recording set, or two with Programmer+", () => {
    const base = applyPowerPelletEffects(createRunUpgrades(["powerPelletProgrammer"]), 1);
    expect(base.programmerStarted).toBe(true);
    expect(base.state.programmer).toEqual({ phase: "recording", presses: [], setsLeft: 0 });
    const plus = applyPowerPelletEffects(createRunUpgrades(["powerPelletProgrammerPlus"]), 1);
    expect(plus.state.programmer).toEqual({ phase: "recording", presses: [], setsLeft: 1 });
    expect(applyPowerPelletEffects(createRunUpgrades(), 1).state.programmer).toBeNull();
  });

  it("a fresh power pellet restarts programming, and timer clears drop it", () => {
    const running = {
      ...createRunUpgrades(["powerPelletProgrammer"]),
      programmer: {
        phase: "running",
        program: ["up"],
        heading: "left",
        setsLeft: 0,
        col: 1,
        row: 1,
      },
    } satisfies RunUpgrades;
    expect(applyPowerPelletEffects(running, 1).state.programmer).toEqual({
      phase: "recording",
      presses: [],
      setsLeft: 0,
    });
    expect(clearUpgradeTimers(running).programmer).toBeNull();
  });

  it("is a rare automation upgrade that Overcharge leaves alone", () => {
    expect(getUpgradeDef("powerPelletProgrammer")).toMatchObject({
      school: "automation",
      rare: true,
      storePrice: STORE_RARE_UPGRADE_PRICE,
    });
    const state = applyPowerPelletEffects(
      createRunUpgrades(["powerPelletProgrammerPlus", "passiveOvercharge"]),
      1,
    ).state;
    expect(state.programmer?.setsLeft).toBe(1);
  });
});

describe("Mirror", () => {
  it("is a rare harvest upgrade that Overcharge leaves alone", () => {
    expect(getUpgradeDef("powerPelletMirror")).toMatchObject({
      school: "harvest",
      rare: true,
      storePrice: STORE_RARE_UPGRADE_PRICE,
    });
    const result = applyPowerPelletEffects(
      createRunUpgrades(["powerPelletMirror", "passiveOvercharge"]),
      1,
    );
    expect(result.state.mirrorActive).toBe(true);
    expect(result.mirrorStarted).toBe(true);
  });

  it("does nothing without the upgrade", () => {
    const result = applyPowerPelletEffects(createRunUpgrades(["passiveGhostSlow"]), 1);
    expect(result.state.mirrorActive).toBe(false);
    expect(result.mirrorStarted).toBe(false);
  });

  it("ignores a second power pellet while active", () => {
    const first = applyPowerPelletEffects(createRunUpgrades(["powerPelletMirror"]), 1).state;
    const second = applyPowerPelletEffects(first, 1);
    expect(second.mirrorStarted).toBe(false);
    expect(second.state.mirrorActive).toBe(true);
  });

  it("starts again after it ends", () => {
    const first = applyPowerPelletEffects(createRunUpgrades(["powerPelletMirror"]), 1).state;
    const ended = endMirror(first);
    expect(ended.mirrorActive).toBe(false);
    expect(applyPowerPelletEffects(ended, 1).mirrorStarted).toBe(true);
  });

  it("is cleared by clearUpgradeTimers", () => {
    const active = applyPowerPelletEffects(createRunUpgrades(["powerPelletMirror"]), 1).state;
    expect(clearUpgradeTimers(active).mirrorActive).toBe(false);
  });

  it("only the Plus form saves a life", () => {
    expect(mirrorSavesLife(["powerPelletMirror"])).toBe(false);
    expect(mirrorSavesLife(["powerPelletMirrorPlus"])).toBe(true);
  });
});

describe("Tithe", () => {
  const fire = (owned: UpgradeId[]) => applyPowerPelletEffects(createRunUpgrades(owned), 1).state;

  it("does nothing without the upgrade", () => {
    const state = fire([]);
    expect(titheActive(state)).toBe(false);
    expect(titheSpeedMultiplier(state, [])).toBe(1);
    expect(titheStreakWeight(state, [])).toBe(1);
  });

  it("lasts 5s, or 8s when enhanced", () => {
    expect(fire(["powerPelletTithe"]).titheRemainingMs).toBe(TITHE_MS);
    expect(fire(["powerPelletTithePlus"]).titheRemainingMs).toBe(TITHE_ENHANCED_MS);
  });

  it("slows to 0.9x and doubles the streak only while active, in both forms", () => {
    for (const id of ["powerPelletTithe", "powerPelletTithePlus"] as const) {
      const owned: UpgradeId[] = [id];
      const idle = createRunUpgrades(owned);
      expect(titheSpeedMultiplier(idle, owned)).toBe(1);
      expect(titheStreakWeight(idle, owned)).toBe(1);
      const active = fire(owned);
      expect(titheSpeedMultiplier(active, owned)).toBe(TITHE_SPEED_MUL);
      expect(titheStreakWeight(active, owned)).toBe(TITHE_STREAK_WEIGHT);
    }
  });

  it("refreshes on a second power pellet instead of stacking", () => {
    const first = fire(["powerPelletTithe"]);
    const again = applyPowerPelletEffects(tickTithe(first, 3000), 1).state;
    expect(again.titheRemainingMs).toBe(TITHE_MS);
  });

  it("is a power-pellet duration, so Overcharge doubles it", () => {
    expect(fire(["powerPelletTithe", "passiveOvercharge"]).titheRemainingMs).toBe(10_000);
  });

  it("ticks down, then clears with the other upgrade timers", () => {
    const fired = fire(["powerPelletTithe"]);
    expect(tickTithe(fired, 1000).titheRemainingMs).toBe(TITHE_MS - 1000);
    expect(tickTithe(fired, TITHE_MS * 2).titheRemainingMs).toBe(0);
    expect(clearUpgradeTimers(fired).titheRemainingMs).toBe(0);
  });
});

describe("Chaff", () => {
  const fire = (owned: UpgradeId[]) =>
    applyPowerPelletEffects(createRunUpgrades(owned), 1).state.chaff;

  it("does nothing without the upgrade", () => {
    expect(fire([])).toBeNull();
  });

  it("drops one decoy for 5s, or one per corner for 7s when enhanced", () => {
    expect(fire(["powerPelletChaff"])).toMatchObject({ remainingMs: 5000 });
    expect(fire(["powerPelletChaff"])?.decoys).toHaveLength(1);
    expect(fire(["powerPelletChaffPlus"])).toMatchObject({ remainingMs: 7000 });
    expect(fire(["powerPelletChaffPlus"])?.decoys).toHaveLength(4);
  });

  it("is a power-pellet duration, so Overcharge doubles it", () => {
    expect(fire(["powerPelletChaff", "passiveOvercharge"])?.remainingMs).toBe(10_000);
  });

  it("clears with the other upgrade timers", () => {
    const fired = applyPowerPelletEffects(createRunUpgrades(["powerPelletChaff"]), 1).state;
    expect(clearUpgradeTimers(fired).chaff).toBeNull();
  });
});

describe("clearStaleUpgradeTimers", () => {
  it("clears a revoked upgrade's timer and keeps an owned one's", () => {
    const live = {
      ...createRunUpgrades(["powerPelletFreeze", "powerPelletWallPass"]),
      freezeRemainingMs: 4000,
      frozenGhostEid: 3,
      wallPassRemainingMs: 2000,
    };
    const after = clearStaleUpgradeTimers(
      ["powerPelletWallPass"],
      revokeUpgrade(live, "powerPelletFreeze"),
    );
    expect(after).toMatchObject({
      freezeRemainingMs: 0,
      frozenGhostEid: null,
      wallPassRemainingMs: 2000,
    });
  });
});

describe("Trinkets and the slot cap", () => {
  const ALMOST_ALL = ALL_UPGRADE_IDS.filter((id) => !isTrinketId(id)).slice(2);

  it("never offers two Trinkets on one level-clear card", () => {
    for (let n = 0; n < 200; n += 1) {
      const offer = pickUpgradeChoiceOffer(ALMOST_ALL, null, randomFromSeed(`trinket${n}`));
      expect(offer.upgrades.filter(isTrinketId).length).toBeLessThanOrEqual(1);
    }
  });

  it("doesn't count Trinkets toward the rare gate", () => {
    const rare = "passiveOvercharge";
    expect(eligibleUpgrades(["powerPelletFreeze", "lowSpeed"])).not.toContain(rare);
    expect(eligibleUpgrades(["powerPelletFreeze", "passiveAfterburner"])).toContain(rare);
  });

  it("doesn't count Trinkets toward a Specialist", () => {
    const owned = ["powerPelletFreeze", "lowSpeed", "lowSpeed", "lowTurning"] as const;
    expect(eligibleUpgrades([...owned])).not.toContain("passiveSpeedSpecialist");
  });
});

describe("Floating", () => {
  it("floats over lava in both forms and not without it", () => {
    expect(floatsOverHazards([])).toBe(false);
    expect(floatsOverHazards(["passiveFloating"])).toBe(true);
    expect(floatsOverHazards(["passiveFloatingPlus"])).toBe(true);
  });

  it("only the enhanced form ignores the slow side of a speed zone", () => {
    for (const owned of [[], ["passiveFloating"]] as const) {
      expect(floatingZoneEffect(owned, "slow")).toBe("slow");
    }
    expect(floatingZoneEffect(["passiveFloatingPlus"], "slow")).toBeNull();
    expect(floatingZoneEffect(["passiveFloatingPlus"], "fast")).toBe("fast");
    expect(floatingZoneEffect(["passiveFloatingPlus"], null)).toBeNull();
  });
});
