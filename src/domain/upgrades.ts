import { BONUS_BAR_MAX } from "./bonusBar";
import type { LazyLooperRings } from "./lazyLooper";
import { BASE_FEAST_FRUIT_SPAWN_THRESHOLDS, TILE_SIZE } from "./maze";
import { TURN_TUNING_BOOST_MS, TURN_TUNING_PERFECT_PX } from "./turnTuning";

export type BaseUpgradeId =
  | "powerPelletFreeze"
  | "passivePlayerSpeedUp"
  | "passiveGhostSlow"
  | "powerPelletScatterBurst"
  | "powerPelletGhostRecall"
  | "powerPelletWarpFarthest"
  | "passivePickupRange"
  | "passiveGhostHouseDelay"
  | "passiveExtraLife"
  | "passivePelletToPower"
  | "powerPelletCollectThree"
  | "powerPelletWallPass"
  | "powerPelletSpeedBurst"
  | "powerPelletInvuln"
  | "powerPelletGhostHarvester"
  | "fruitPowerPellet"
  | "fruitQuarterBounty"
  | "fruitFecundity"
  | "fruitFeast"
  | "passiveDeathsHarvest"
  | "passiveOvercharge"
  | "passiveTunnelDash"
  | "passivePowerPelletRecharge"
  | "passiveRemoteTransference"
  | "passiveMyogenesis"
  | "passiveDefyDeath"
  | "passiveTurnTuning"
  | "passiveDeathsBounty"
  | "passiveMoneyTalks"
  | "passiveLazyLooper";

export type EnhancedUpgradeId = `${BaseUpgradeId}Plus`;
export type UpgradeId = BaseUpgradeId | EnhancedUpgradeId;

export type UpgradeSchool = "death" | "harvest" | "speed" | "protection" | "disruption" | "neutral";

export const UPGRADE_SCHOOL_LABELS: Record<UpgradeSchool, string> = {
  death: "Death",
  harvest: "Harvest",
  speed: "Speed",
  protection: "Protection",
  disruption: "Disruption",
  neutral: "Neutral",
};

export const UPGRADE_SCHOOL_ORDER: readonly UpgradeSchool[] = [
  "death",
  "harvest",
  "speed",
  "protection",
  "disruption",
  "neutral",
];

export type UpgradeEffects = {
  playerSpeedMul?: number;
  ghostSpeedMul?: number;
  fruitLifetimeMul?: number;
  fruitQuarters?: number;
  fruitPersistsUntilLevelEnd?: true;
  fruitStacksSideBySide?: true;
  fruitPowerConvertsPellet?: true;
  fruitFeastThresholds?: readonly number[];
  pelletCollectRadiusBonusPx?: number;
  grantLives?: number;
  lifeFloorBonus?: number;
  regenToFull?: true;
  pelletSurgeCount?: number;
  ghostHouseReleaseDelayAddMs?: number;
  ghostHouseClydePelletAdd?: number;
  remoteTransferEveryPellets?: number;
  deathsHarvestRadiusTiles?: number;
  deathsBountyDecay?: number;
  overchargeMul?: number;
  ghostTunnelSpeedRatio?: number;
  secondChompMs?: number;
  speedBurstMul?: number;
  turnBoostMs?: number;
  turnPerfectPx?: number;
  deathQuarterCost?: number;
  lazyLooperRings?: LazyLooperRings;
  onPowerPellet?: {
    freezeClosestGhostMs?: number;
    cornerTeleportHoldMs?: number;
    wallPassMs?: number;
    wallPassLoop?: true;
    playerInvulnMs?: number;
    warpInvulnMs?: number;
    playerSpeedBurstMs?: number;
    ghostHarvestMs?: number;
    defyDeathMs?: number;
    recallClosestGhosts?: number;
    warpPlayerFarthest?: true;
    collectExtraPellets?: number;
  };
};

export type EnhancedOverride = UpgradeEffects & { description: string; enhanceNote: string };

export type BaseUpgradeDef = UpgradeEffects & {
  id: BaseUpgradeId;
  label: string;
  school: UpgradeSchool;
  description: string;
  storePrice: number;
  enhanced: EnhancedOverride;
};

export type UpgradeDef = UpgradeEffects & {
  id: UpgradeId;
  enhanceNote?: string;
  baseId: BaseUpgradeId;
  isEnhanced: boolean;
  label: string;
  school: UpgradeSchool;
  description: string;
  storePrice: number;
};

export const REMOTE_TRANSFER_EVERY_PELLETS = 5;
export const FREEZE_MS = 3000;
export const WALL_PASS_MS = 6000;
export const INVULN_MS = 3000;
export const SPEED_BURST_MS = 3000;
export const GHOST_HARVEST_MS = 5000;
export const DEFY_DEATH_MS = 5000;
export const MONEY_TALKS_QUARTERS = 3;
export const MONEY_TALKS_ENHANCED_QUARTERS = 1;
export const PLAYER_SPEED_UP_MUL = 1.25;
export const PLAYER_SPEED_BURST_MUL = 1.25;
export const GHOST_SLOW_MUL = 0.8;

export const GHOST_HOUSE_RELEASE_DELAY_ADD_MS = 2000;
export const GHOST_HOUSE_CLYDE_PELLET_ADD = 15;
export const POWER_COLLECT_THREE_COUNT = 3;
export const QUARTERS_CHOICE_AMOUNT = 2;
export const STORE_UPGRADE_PRICE = 3;
export const UPGRADE_CHOICE_MAX_UPGRADE_OPTIONS = 3;
export const FRUIT_FECUNDITY_MUL = 2;
export const DEATHS_HARVEST_RADIUS_TILES = 6;
export const DEATHS_BOUNTY_DECAY = 0.8;
export const OVERCHARGE_MUL = 2;
export const SECOND_CHOMP_MS = 10_000;
export const TUNNEL_DASH_SPEED_MUL = 10;

export const FREEZE_ENHANCED_MS = 5000;
export const CORNER_TELEPORT_HOLD_ENHANCED_MS = 2000;
export const INVULN_ENHANCED_MS = 5000;
export const GHOST_HARVEST_ENHANCED_MS = 8000;
export const DEFY_DEATH_ENHANCED_MS = 8000;
export const WARP_TOP_INVULN_MS = 2000;
export const PLAYER_SPEED_UP_ENHANCED_MUL = 1.5;
export const PLAYER_SPEED_BURST_ENHANCED_MUL = 1.5;
export const GHOST_SLOW_ENHANCED_MUL = 0.65;
export const PICKUP_RANGE_ENHANCED_TILES = 2;
export const GHOST_HOUSE_RELEASE_DELAY_ADD_ENHANCED_MS = 3000;
export const GHOST_HOUSE_CLYDE_PELLET_ADD_ENHANCED = 25;
export const EXTRA_LIFE_ENHANCED_LIVES = 2;
export const POWER_COLLECT_FIVE_COUNT = 5;
export const PELLET_SURGE_COUNT = 1;
export const PELLET_SURGE_ENHANCED_COUNT = 2;
export const FRUIT_QUARTERS = 1;
export const FRUIT_QUARTERS_ENHANCED = 2;
export const FRUIT_FEAST_ENHANCED_THRESHOLDS = [45, 100, 150, 200] as const;
export const DEATHS_HARVEST_ENHANCED_RADIUS_TILES = 10;
export const DEATHS_BOUNTY_ENHANCED_DECAY = 0.9;
export const OVERCHARGE_ENHANCED_MUL = 3;
export const GHOST_TUNNEL_ENHANCED_SPEED_RATIO = 0.3;
export const SECOND_CHOMP_ENHANCED_MS = 7000;
export const REMOTE_TRANSFER_ENHANCED_EVERY_PELLETS = 3;
export const TURN_TUNING_ENHANCED_BOOST_MS = 750;
export const TURN_TUNING_ENHANCED_PERFECT_PX = 12;

export const BASE_UPGRADE_DEFS: readonly BaseUpgradeDef[] = [
  {
    id: "powerPelletFreeze",
    label: "Power Freeze",
    school: "disruption",
    description: "Chomp a power pellet and the nearest ghost locks solid for a few seconds.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Power Freeze locks for 5 seconds instead of 3.",
      description: "Chomp a power pellet and the nearest ghost locks solid for five seconds.",
      onPowerPellet: { freezeClosestGhostMs: FREEZE_ENHANCED_MS },
    },
    onPowerPellet: { freezeClosestGhostMs: FREEZE_MS },
  },
  {
    id: "passivePlayerSpeedUp",
    label: "Speed Up",
    school: "speed",
    description: "You run hotter. Corners feel closer.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Speed Up makes you 50% faster instead of 25%.",
      description: "You run white-hot. Corners come to you.",
      playerSpeedMul: PLAYER_SPEED_UP_ENHANCED_MUL,
    },
    playerSpeedMul: PLAYER_SPEED_UP_MUL,
  },
  {
    id: "passiveGhostSlow",
    label: "Ghost Slow",
    school: "disruption",
    description: "The hunt softens. Ghosts drag their feet.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Ghost Slow cuts ghost speed by 35% instead of 20%.",
      description: "The hunt crawls. Ghosts wade through syrup.",
      ghostSpeedMul: GHOST_SLOW_ENHANCED_MUL,
    },
    ghostSpeedMul: GHOST_SLOW_MUL,
  },
  {
    id: "powerPelletScatterBurst",
    label: "Scatter Burst",
    school: "disruption",
    description: "Power pellet flings every ghost into its corner.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Scatter Burst also pins ghosts in their corners for 2 seconds.",
      description: "Power pellet flings every ghost into its corner and pins it there.",
      onPowerPellet: { cornerTeleportHoldMs: CORNER_TELEPORT_HOLD_ENHANCED_MS },
    },
    onPowerPellet: { cornerTeleportHoldMs: 0 },
  },
  {
    id: "powerPelletGhostRecall",
    label: "Ghost Recall",
    school: "disruption",
    description: "Power pellet yanks the nearest ghost straight home.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Ghost Recall sends the 2 nearest ghosts home instead of 1.",
      description: "Power pellet yanks the two nearest ghosts straight home.",
      onPowerPellet: { recallClosestGhosts: 2 },
    },
    onPowerPellet: { recallClosestGhosts: 1 },
  },
  {
    id: "powerPelletWarpFarthest",
    label: "Warp Farthest",
    school: "protection",
    description: "Power pellet flings you to the spot farthest from the ghosts.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Warp Farthest also makes you invulnerable for 2 seconds.",
      description:
        "Power pellet flings you to the spot farthest from the ghosts, shielded for a moment.",
      onPowerPellet: { warpPlayerFarthest: true, warpInvulnMs: WARP_TOP_INVULN_MS },
    },
    onPowerPellet: { warpPlayerFarthest: true },
  },
  {
    id: "passivePickupRange",
    label: "Pickup Range",
    school: "speed",
    description: "Pellets within a cell of you snap into your mouth.",
    storePrice: STORE_UPGRADE_PRICE,
    pelletCollectRadiusBonusPx: TILE_SIZE,
    enhanced: {
      enhanceNote: "Pickup Range reaches 2 tiles instead of 1.",
      description: "Pellets two cells away snap into your mouth.",
      pelletCollectRadiusBonusPx: PICKUP_RANGE_ENHANCED_TILES * TILE_SIZE,
    },
  },
  {
    id: "passiveGhostHouseDelay",
    label: "House Delay",
    school: "disruption",
    description: "Ghosts linger longer in the house before the hunt.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote:
        "House Delay holds ghosts 3 seconds instead of 2, and Clyde 25 dots instead of 15.",
      description: "Ghosts sulk in the house far longer before the hunt.",
      ghostHouseReleaseDelayAddMs: GHOST_HOUSE_RELEASE_DELAY_ADD_ENHANCED_MS,
      ghostHouseClydePelletAdd: GHOST_HOUSE_CLYDE_PELLET_ADD_ENHANCED,
    },
    ghostHouseReleaseDelayAddMs: GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
    ghostHouseClydePelletAdd: GHOST_HOUSE_CLYDE_PELLET_ADD,
  },
  {
    id: "passiveExtraLife",
    label: "Extra Life",
    school: "death",
    description: "One more chance, and lives regenerate up to 4.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Extra Life gives 2 lives instead of 1, and regenerates up to 5.",
      description: "Two more chances, and lives regenerate up to 5.",
      grantLives: EXTRA_LIFE_ENHANCED_LIVES,
      lifeFloorBonus: 2,
    },
    grantLives: 1,
    lifeFloorBonus: 1,
  },
  {
    id: "passivePelletToPower",
    label: "Pellet Surge",
    school: "neutral",
    description: "A quiet pellet turns hot, and another may follow.",
    storePrice: STORE_UPGRADE_PRICE,
    pelletSurgeCount: PELLET_SURGE_COUNT,
    enhanced: {
      enhanceNote: "Pellet Surge turns 2 pellets hot per board instead of 1.",
      description: "Two quiet pellets turn hot.",
      pelletSurgeCount: PELLET_SURGE_ENHANCED_COUNT,
    },
  },
  {
    id: "powerPelletCollectThree",
    label: "Triple Chomp",
    school: "speed",
    description: "Power pellet gulps three more pellets with it.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Triple Chomp eats 5 more pellets instead of 3.",
      description: "Power pellet gulps five more pellets with it.",
      onPowerPellet: { collectExtraPellets: POWER_COLLECT_FIVE_COUNT },
    },
    onPowerPellet: { collectExtraPellets: POWER_COLLECT_THREE_COUNT },
  },
  {
    id: "powerPelletWallPass",
    label: "Wall Pass",
    school: "speed",
    description: "Power pellet lets you slip through walls for a breath.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Wall Pass also lets you loop around every edge of the maze.",
      description: "Power pellet lets you slip through walls and loop around the maze edges.",
      onPowerPellet: { wallPassMs: WALL_PASS_MS, wallPassLoop: true },
    },
    onPowerPellet: { wallPassMs: WALL_PASS_MS },
  },
  {
    id: "powerPelletSpeedBurst",
    label: "Speed Burst",
    school: "speed",
    description: "Power pellet spikes your pace for a few seconds.",
    storePrice: STORE_UPGRADE_PRICE,
    speedBurstMul: PLAYER_SPEED_BURST_MUL,
    enhanced: {
      enhanceNote: "Speed Burst gives 50% more speed instead of 25%.",
      description: "Power pellet spikes your pace hard for a few seconds.",
      speedBurstMul: PLAYER_SPEED_BURST_ENHANCED_MUL,
    },
    onPowerPellet: { playerSpeedBurstMs: SPEED_BURST_MS },
  },
  {
    id: "powerPelletInvuln",
    label: "Ghost Proof",
    school: "protection",
    description: "Power pellet lets you pass through ghosts briefly.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Ghost Proof lasts 5 seconds instead of 3.",
      description: "Power pellet lets you pass through ghosts for five seconds.",
      onPowerPellet: { playerInvulnMs: INVULN_ENHANCED_MS },
    },
    onPowerPellet: { playerInvulnMs: INVULN_MS },
  },
  {
    id: "powerPelletGhostHarvester",
    label: "Ghost Harvester",
    school: "speed",
    description: "Power pellet sends ghosts to gobble pellets for you.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Ghost Harvester lasts 8 seconds instead of 5.",
      description: "Power pellet sends ghosts to gobble pellets for you, for longer.",
      onPowerPellet: { ghostHarvestMs: GHOST_HARVEST_ENHANCED_MS },
    },
    onPowerPellet: { ghostHarvestMs: GHOST_HARVEST_MS },
  },
  {
    id: "fruitPowerPellet",
    label: "Fruit Power",
    school: "harvest",
    description: "Bonus fruit hits like a power pellet, triggering every effect you own.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Fruit Power also turns a random pellet into a power pellet.",
      description: "Bonus fruit hits like a power pellet and turns a pellet hot.",
      fruitPowerConvertsPellet: true,
    },
  },
  {
    id: "fruitQuarterBounty",
    label: "Quarter Bounty",
    school: "harvest",
    description: "Bonus fruit pays a Quarter instead of charging the bonus bar.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Quarter Bounty pays 2 Quarters per fruit instead of 1.",
      description: "Bonus fruit pays two Quarters.",
      fruitQuarters: FRUIT_QUARTERS_ENHANCED,
    },
    fruitQuarters: FRUIT_QUARTERS,
  },
  {
    id: "fruitFecundity",
    label: "Fruit Fecundity",
    school: "harvest",
    description: "Bonus fruit lingers twice as long.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote:
        "Fruit Fecundity keeps fruit until the level ends, and extra fruit sit side by side.",
      description:
        "Bonus fruit waits until the level ends, and uncollected ones pile up side by side.",
      fruitPersistsUntilLevelEnd: true,
      fruitStacksSideBySide: true,
    },
    fruitLifetimeMul: FRUIT_FECUNDITY_MUL,
  },
  {
    id: "fruitFeast",
    label: "Fruit Feast",
    school: "harvest",
    description: "Bonus fruit appears three times per level, each after the last is gone.",
    storePrice: STORE_UPGRADE_PRICE,
    fruitFeastThresholds: BASE_FEAST_FRUIT_SPAWN_THRESHOLDS,
    enhanced: {
      enhanceNote: "Fruit Feast spawns 4 fruit per level instead of 3.",
      description: "Bonus fruit appears four times per level, each after the last is gone.",
      fruitFeastThresholds: FRUIT_FEAST_ENHANCED_THRESHOLDS,
    },
  },
  {
    id: "passiveDeathsHarvest",
    label: "Death's Harvest",
    school: "death",
    description: "Dying harvests nearby pellets.",
    storePrice: STORE_UPGRADE_PRICE,
    deathsHarvestRadiusTiles: DEATHS_HARVEST_RADIUS_TILES,
    enhanced: {
      enhanceNote: "Death's Harvest reaches 10 tiles instead of 6.",
      description: "Dying harvests every pellet within ten tiles.",
      deathsHarvestRadiusTiles: DEATHS_HARVEST_ENHANCED_RADIUS_TILES,
    },
  },
  {
    id: "passiveOvercharge",
    label: "Overcharge",
    school: "neutral",
    description: "Doubles the duration of every other power pellet timer you're running.",
    storePrice: STORE_UPGRADE_PRICE,
    overchargeMul: OVERCHARGE_MUL,
    enhanced: {
      enhanceNote: "Overcharge triples power pellet timers instead of doubling them.",
      description: "Triples the duration of every other power pellet timer you're running.",
      overchargeMul: OVERCHARGE_ENHANCED_MUL,
    },
  },
  {
    id: "passiveTunnelDash",
    label: "Tunnel Dash",
    school: "speed",
    description: "Tunnels move you the instant you touch them.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Tunnel Dash also slows ghosts in tunnels to 0.3x speed.",
      description: "Tunnels move you the instant you touch them, and ghosts crawl through them.",
      ghostTunnelSpeedRatio: GHOST_TUNNEL_ENHANCED_SPEED_RATIO,
    },
  },
  {
    id: "passivePowerPelletRecharge",
    label: "Second Chomp",
    school: "harvest",
    description: "Eaten power pellets regenerate after ten seconds.",
    storePrice: STORE_UPGRADE_PRICE,
    secondChompMs: SECOND_CHOMP_MS,
    enhanced: {
      enhanceNote: "Second Chomp respawns power pellets after 7 seconds instead of 10.",
      description: "Eaten power pellets regenerate after seven seconds.",
      secondChompMs: SECOND_CHOMP_ENHANCED_MS,
    },
  },
  {
    id: "passiveRemoteTransference",
    label: "Remote Transference",
    school: "speed",
    description: "Every fifth pellet also eats the farthest one.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Remote Transference triggers every 3rd pellet instead of every 5th.",
      description: "Every third pellet also eats the farthest one.",
      remoteTransferEveryPellets: REMOTE_TRANSFER_ENHANCED_EVERY_PELLETS,
    },
    remoteTransferEveryPellets: REMOTE_TRANSFER_EVERY_PELLETS,
  },
  {
    id: "passiveMyogenesis",
    label: "Myogenesis",
    school: "death",
    description: "Regenerate two lives on level clear.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Myogenesis refills every empty life slot instead of 2 per level.",
      description: "Refill every empty life slot on level clear.",
      regenToFull: true,
    },
  },
  {
    id: "passiveDefyDeath",
    label: "Defy Death",
    school: "death",
    description: "Eat a power pellet: die within 5s and keep your life.",
    storePrice: STORE_UPGRADE_PRICE,
    enhanced: {
      enhanceNote: "Defy Death's save window lasts 8 seconds instead of 5.",
      description: "Eat a power pellet: die within 8s and keep your life.",
      onPowerPellet: { defyDeathMs: DEFY_DEATH_ENHANCED_MS },
    },
    onPowerPellet: { defyDeathMs: DEFY_DEATH_MS },
  },
  {
    id: "passiveTurnTuning",
    label: "Turn Tuning",
    school: "speed",
    description: "Tap turns up to two tiles early. Nail the beat for a speed kick.",
    storePrice: STORE_UPGRADE_PRICE,
    turnBoostMs: TURN_TUNING_BOOST_MS,
    turnPerfectPx: TURN_TUNING_PERFECT_PX,
    enhanced: {
      enhanceNote:
        "Turn Tuning's perfect tap is 12px wide instead of 8, and the boost lasts 0.75s instead of 0.5s.",
      description: "Tap turns early, wider beat, longer speed kick.",
      turnBoostMs: TURN_TUNING_ENHANCED_BOOST_MS,
      turnPerfectPx: TURN_TUNING_ENHANCED_PERFECT_PX,
    },
  },
  {
    id: "passiveDeathsBounty",
    label: "Death's Bounty",
    school: "death",
    description: "Dying pays a Quarter, a little less for each death on a level.",
    storePrice: STORE_UPGRADE_PRICE,
    deathsBountyDecay: DEATHS_BOUNTY_DECAY,
    enhanced: {
      enhanceNote: "Death's Bounty drops 10% per extra death on a level instead of 20%.",
      description: "Dying pays a Quarter, barely less for each death on a level.",
      deathsBountyDecay: DEATHS_BOUNTY_ENHANCED_DECAY,
    },
  },
  {
    id: "passiveMoneyTalks",
    label: "Money Talks",
    school: "death",
    description: "Die on your last life: pay 3 Quarters to keep it.",
    storePrice: STORE_UPGRADE_PRICE,
    deathQuarterCost: MONEY_TALKS_QUARTERS,
    enhanced: {
      enhanceNote: "Money Talks costs 1 Quarter instead of 3.",
      description: "Die on your last life: pay 1 Quarter to keep it.",
      deathQuarterCost: MONEY_TALKS_ENHANCED_QUARTERS,
    },
  },
  {
    id: "passiveLazyLooper",
    label: "Lazy Looper",
    school: "speed",
    description: "Only the outer and inner pellet rings must be eaten to clear the board.",
    storePrice: STORE_UPGRADE_PRICE,
    lazyLooperRings: "outerInner",
    enhanced: {
      enhanceNote: "Lazy Looper needs only the outer ring instead of the outer and inner rings.",
      description: "Only the outer pellet ring must be eaten to clear the board.",
      lazyLooperRings: "outer",
    },
  },
];

function toBaseDef(def: BaseUpgradeDef): UpgradeDef {
  const { enhanced: _enhanced, ...rest } = def;
  return { ...rest, baseId: def.id, isEnhanced: false };
}

function toEnhancedDef(def: BaseUpgradeDef): UpgradeDef {
  const { enhanced, ...rest } = def;
  return {
    ...rest,
    ...enhanced,
    id: `${def.id}Plus`,
    baseId: def.id,
    isEnhanced: true,
    label: `${def.label}+`,
  };
}

export const UPGRADE_DEFS: readonly UpgradeDef[] = [
  ...BASE_UPGRADE_DEFS.map(toBaseDef),
  ...BASE_UPGRADE_DEFS.map(toEnhancedDef),
];

const UPGRADE_BY_ID: ReadonlyMap<UpgradeId, UpgradeDef> = new Map(
  UPGRADE_DEFS.map((def) => [def.id, def]),
);

export const ALL_UPGRADE_IDS: readonly BaseUpgradeId[] = BASE_UPGRADE_DEFS.map((def) => def.id);

export function baseIdOf(id: UpgradeId): BaseUpgradeId {
  return UPGRADE_BY_ID.get(id)!.baseId;
}

export function enhancedIdOf(id: BaseUpgradeId): EnhancedUpgradeId {
  return `${id}Plus`;
}

export function isEnhancedId(id: UpgradeId): id is EnhancedUpgradeId {
  return UPGRADE_BY_ID.get(id)!.isEnhanced;
}

export function hasUpgrade(owned: readonly UpgradeId[], baseId: BaseUpgradeId): boolean {
  return owned.some((id) => baseIdOf(id) === baseId);
}

export function ownedFormOf(owned: readonly UpgradeId[], baseId: BaseUpgradeId): UpgradeId | null {
  return owned.find((id) => baseIdOf(id) === baseId) ?? null;
}

export type LearnEnhanceToggleState = "hidden" | "off" | "on";

export function learnEnhanceToggleState(
  owned: readonly UpgradeId[],
  baseId: BaseUpgradeId,
): LearnEnhanceToggleState {
  const form = ownedFormOf(owned, baseId);
  if (form === null) {
    return "hidden";
  }
  return isEnhancedId(form) ? "on" : "off";
}

export function enhanceableUpgrades(owned: readonly UpgradeId[]): BaseUpgradeId[] {
  return owned.filter((id): id is BaseUpgradeId => !isEnhancedId(id));
}

export function carryEnhancement(outgoingId: UpgradeId, incomingBaseId: BaseUpgradeId): UpgradeId {
  return isEnhancedId(outgoingId) ? enhancedIdOf(incomingBaseId) : incomingBaseId;
}

export function enhanceGrantLives(baseId: BaseUpgradeId): number {
  return grantLivesForUpgrade(enhancedIdOf(baseId)) - grantLivesForUpgrade(baseId);
}

export type PendingPowerPelletRespawn = { x: number; y: number; remainingMs: number };

export function queuePowerPelletRespawns(
  pending: PendingPowerPelletRespawn[],
  positions: readonly { x: number; y: number }[],
  respawnMs: number = SECOND_CHOMP_MS,
): PendingPowerPelletRespawn[] {
  if (positions.length === 0) {
    return pending;
  }
  return [...pending, ...positions.map((pos) => ({ x: pos.x, y: pos.y, remainingMs: respawnMs }))];
}

export function tickPowerPelletRespawns(
  pending: readonly PendingPowerPelletRespawn[],
  deltaMs: number,
): { pending: PendingPowerPelletRespawn[]; ready: { x: number; y: number }[] } {
  const remaining: PendingPowerPelletRespawn[] = [];
  const ready: { x: number; y: number }[] = [];
  for (const entry of pending) {
    const remainingMs = entry.remainingMs - Math.max(0, deltaMs);
    if (remainingMs > 0) {
      remaining.push({ ...entry, remainingMs });
    } else {
      ready.push({ x: entry.x, y: entry.y });
    }
  }
  return { pending: remaining, ready };
}

export type RunUpgrades = {
  owned: UpgradeId[];
  freezeRemainingMs: number;
  frozenGhostEid: number | null;
  wallPassRemainingMs: number;
  invulnRemainingMs: number;
  speedBurstRemainingMs: number;
  ghostHarvestRemainingMs: number;
  defyDeathRemainingMs: number;
  lastDeclinedUpgradeId: BaseUpgradeId | null;
};

export type PowerPelletApplyResult = {
  state: RunUpgrades;
  freezeClosestMs: number | null;
  recallGhostCount: number;
  cornerTeleportHoldMs: number | null;
  warpPlayerFarthest: boolean;
  collectExtraPellets: number;
};

export function createRunUpgrades(enabled: readonly UpgradeId[] = []): RunUpgrades {
  let state: RunUpgrades = {
    owned: [],
    freezeRemainingMs: 0,
    frozenGhostEid: null,
    wallPassRemainingMs: 0,
    invulnRemainingMs: 0,
    speedBurstRemainingMs: 0,
    ghostHarvestRemainingMs: 0,
    defyDeathRemainingMs: 0,
    lastDeclinedUpgradeId: null,
  };
  for (const id of enabled) {
    state = grantUpgrade(state, id);
  }
  return state;
}

export function parseUpgradeId(raw: string | null): UpgradeId | null {
  if (raw === null) {
    return null;
  }
  return UPGRADE_BY_ID.has(raw as UpgradeId) ? (raw as UpgradeId) : null;
}

export function parseEnableUpgradeParams(params: URLSearchParams): UpgradeId[] {
  const ids: UpgradeId[] = [];
  for (const raw of params.getAll("enableUpgrade")) {
    const id = parseUpgradeId(raw);
    if (id !== null) {
      ids.push(id);
    }
  }
  return ids;
}

export function parseDisableLevelUpgradesFlag(params: URLSearchParams): boolean {
  return params.get("disableLevelUpgrades") === "1";
}

export function getUpgradeDef(id: UpgradeId): UpgradeDef {
  return UPGRADE_BY_ID.get(id)!;
}

export function storePriceFor(id: UpgradeId): number {
  return getUpgradeDef(id).storePrice;
}

export function grantLivesForUpgrade(id: UpgradeId): number {
  return UPGRADE_BY_ID.get(id)?.grantLives ?? 0;
}

export function eligibleUpgrades(owned: readonly UpgradeId[]): BaseUpgradeId[] {
  const ownedBases = new Set(owned.map(baseIdOf));
  return ALL_UPGRADE_IDS.filter((id) => !ownedBases.has(id));
}

export function takeRandomFrom<T>(pool: T[], rng: () => number): T {
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  const picked = pool[index]!;
  pool.splice(index, 1);
  return picked;
}

function shuffleInPlace<T>(ids: T[], rng: () => number): void {
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    const tmp = ids[i]!;
    ids[i] = ids[j]!;
    ids[j] = tmp;
  }
}

export type UpgradeChoiceOption =
  { kind: "upgrade"; id: BaseUpgradeId } | { kind: "quarters"; amount: number };

export type UpgradeChoiceOffer = {
  quarters: number;
  upgrades: BaseUpgradeId[];
};

export function pickUpgradeChoiceOffer(
  owned: readonly UpgradeId[],
  lastDeclined: BaseUpgradeId | null,
  rng: () => number,
): UpgradeChoiceOffer {
  const eligible = eligibleUpgrades(owned);
  const desiredCount = Math.min(UPGRADE_CHOICE_MAX_UPGRADE_OPTIONS, eligible.length);

  const preferred = eligible.filter((id) => id !== lastDeclined);
  const picked: BaseUpgradeId[] = [];
  const drawPool = [...preferred];
  while (picked.length < desiredCount && drawPool.length > 0) {
    picked.push(takeRandomFrom(drawPool, rng));
  }

  if (
    picked.length < desiredCount &&
    lastDeclined !== null &&
    eligible.includes(lastDeclined) &&
    !picked.includes(lastDeclined)
  ) {
    picked.push(lastDeclined);
  }

  const upgrades = picked.slice(0, desiredCount);
  shuffleInPlace(upgrades, rng);
  return { quarters: QUARTERS_CHOICE_AMOUNT, upgrades };
}

export const STARTING_UPGRADE_POOL: readonly BaseUpgradeId[] = [
  "powerPelletInvuln",
  "powerPelletFreeze",
  "fruitFeast",
  "powerPelletCollectThree",
  "powerPelletSpeedBurst",
  "powerPelletGhostHarvester",
  "powerPelletScatterBurst",
];

export function pickStartingUpgrade(
  owned: readonly UpgradeId[],
  rng: () => number,
): BaseUpgradeId | null {
  const eligible = STARTING_UPGRADE_POOL.filter((id) => !hasUpgrade(owned, id));
  if (eligible.length === 0) {
    return null;
  }
  return takeRandomFrom(eligible, rng);
}

function withDeclined(state: RunUpgrades, declined: readonly BaseUpgradeId[]): RunUpgrades {
  if (declined.length !== 1) {
    return state;
  }
  return {
    ...state,
    lastDeclinedUpgradeId: declined[0]!,
  };
}

export function confirmUpgradeChoice(
  state: RunUpgrades,
  options: readonly BaseUpgradeId[],
  chosenId: BaseUpgradeId,
): RunUpgrades {
  const next = grantUpgrade(state, chosenId);
  return withDeclined(
    next,
    options.filter((id) => id !== chosenId),
  );
}

export function declineUpgrades(
  state: RunUpgrades,
  declinedIds: readonly BaseUpgradeId[],
): RunUpgrades {
  return withDeclined(state, declinedIds);
}

export function grantUpgrade(state: RunUpgrades, id: UpgradeId): RunUpgrades {
  if (hasUpgrade(state.owned, baseIdOf(id))) {
    return state;
  }
  return {
    ...state,
    owned: [...state.owned, id],
  };
}

export function revokeUpgrade(state: RunUpgrades, id: UpgradeId): RunUpgrades {
  const baseId = baseIdOf(id);
  if (!hasUpgrade(state.owned, baseId)) {
    return state;
  }
  return {
    ...state,
    owned: state.owned.filter((owned) => baseIdOf(owned) !== baseId),
  };
}

export function enhanceUpgrade(state: RunUpgrades, baseId: BaseUpgradeId): RunUpgrades {
  if (!state.owned.includes(baseId)) {
    return state;
  }
  return {
    ...state,
    owned: state.owned.map((id) => (id === baseId ? enhancedIdOf(baseId) : id)),
  };
}

export function clearUpgradeTimers(state: RunUpgrades): RunUpgrades {
  return {
    ...state,
    freezeRemainingMs: 0,
    frozenGhostEid: null,
    wallPassRemainingMs: 0,
    invulnRemainingMs: 0,
    speedBurstRemainingMs: 0,
    ghostHarvestRemainingMs: 0,
    defyDeathRemainingMs: 0,
  };
}

export function tickFreeze(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.freezeRemainingMs <= 0) {
    return state;
  }
  const remaining = Math.max(0, state.freezeRemainingMs - Math.max(0, deltaMs));
  return {
    ...state,
    freezeRemainingMs: remaining,
    frozenGhostEid: remaining > 0 ? state.frozenGhostEid : null,
  };
}

export function tickWallPass(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.wallPassRemainingMs <= 0) {
    return state;
  }
  return {
    ...state,
    wallPassRemainingMs: Math.max(0, state.wallPassRemainingMs - Math.max(0, deltaMs)),
  };
}

export function tickInvuln(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.invulnRemainingMs <= 0) {
    return state;
  }
  return {
    ...state,
    invulnRemainingMs: Math.max(0, state.invulnRemainingMs - Math.max(0, deltaMs)),
  };
}

export function tickSpeedBurst(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.speedBurstRemainingMs <= 0) {
    return state;
  }
  return {
    ...state,
    speedBurstRemainingMs: Math.max(0, state.speedBurstRemainingMs - Math.max(0, deltaMs)),
  };
}

export function tickGhostHarvest(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.ghostHarvestRemainingMs <= 0) {
    return state;
  }
  return {
    ...state,
    ghostHarvestRemainingMs: Math.max(0, state.ghostHarvestRemainingMs - Math.max(0, deltaMs)),
  };
}

export function tickDefyDeath(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.defyDeathRemainingMs <= 0) {
    return state;
  }
  return {
    ...state,
    defyDeathRemainingMs: Math.max(0, state.defyDeathRemainingMs - Math.max(0, deltaMs)),
  };
}

export function applyPowerPelletEffects(
  state: RunUpgrades,
  powerRemoved: number,
): PowerPelletApplyResult {
  if (powerRemoved <= 0) {
    return {
      state,
      freezeClosestMs: null,
      recallGhostCount: 0,
      cornerTeleportHoldMs: null,
      warpPlayerFarthest: false,
      collectExtraPellets: 0,
    };
  }

  let freezeClosestMs: number | null = null;
  let cornerTeleportHoldMs: number | null = null;
  let wallPassMs: number | null = null;
  let invulnMs: number | null = null;
  let speedBurstMs: number | null = null;
  let ghostHarvestMs: number | null = null;
  let defyDeathMs: number | null = null;
  let recallGhostCount = 0;
  let warpInvulnMs = 0;
  let warpPlayerFarthest = false;
  let collectExtraPellets = 0;

  for (const id of state.owned) {
    const onPower = UPGRADE_BY_ID.get(id)?.onPowerPellet;
    if (!onPower) {
      continue;
    }
    if (onPower.freezeClosestGhostMs !== undefined) {
      freezeClosestMs =
        freezeClosestMs === null
          ? onPower.freezeClosestGhostMs
          : Math.max(freezeClosestMs, onPower.freezeClosestGhostMs);
    }
    if (onPower.cornerTeleportHoldMs !== undefined) {
      cornerTeleportHoldMs =
        cornerTeleportHoldMs === null
          ? onPower.cornerTeleportHoldMs
          : Math.max(cornerTeleportHoldMs, onPower.cornerTeleportHoldMs);
    }
    if (onPower.wallPassMs !== undefined) {
      wallPassMs =
        wallPassMs === null ? onPower.wallPassMs : Math.max(wallPassMs, onPower.wallPassMs);
    }
    if (onPower.playerInvulnMs !== undefined) {
      invulnMs =
        invulnMs === null ? onPower.playerInvulnMs : Math.max(invulnMs, onPower.playerInvulnMs);
    }
    if (onPower.playerSpeedBurstMs !== undefined) {
      speedBurstMs =
        speedBurstMs === null
          ? onPower.playerSpeedBurstMs
          : Math.max(speedBurstMs, onPower.playerSpeedBurstMs);
    }
    if (onPower.ghostHarvestMs !== undefined) {
      ghostHarvestMs =
        ghostHarvestMs === null
          ? onPower.ghostHarvestMs
          : Math.max(ghostHarvestMs, onPower.ghostHarvestMs);
    }
    if (onPower.defyDeathMs !== undefined) {
      defyDeathMs =
        defyDeathMs === null ? onPower.defyDeathMs : Math.max(defyDeathMs, onPower.defyDeathMs);
    }
    if (onPower.recallClosestGhosts !== undefined) {
      recallGhostCount = Math.max(recallGhostCount, onPower.recallClosestGhosts);
    }
    if (onPower.warpInvulnMs !== undefined) {
      warpInvulnMs = Math.max(warpInvulnMs, onPower.warpInvulnMs);
    }
    if (onPower.warpPlayerFarthest) {
      warpPlayerFarthest = true;
    }
    if (onPower.collectExtraPellets !== undefined) {
      collectExtraPellets = Math.max(collectExtraPellets, onPower.collectExtraPellets);
    }
  }

  const overcharge = overchargeMultiplier(state.owned);
  const scaled = (ms: number | null): number | null => (ms === null ? null : ms * overcharge);
  freezeClosestMs = scaled(freezeClosestMs);
  cornerTeleportHoldMs = scaled(cornerTeleportHoldMs);
  wallPassMs = scaled(wallPassMs);
  invulnMs = scaled(invulnMs);
  speedBurstMs = scaled(speedBurstMs);
  ghostHarvestMs = scaled(ghostHarvestMs);
  if (warpInvulnMs > 0) {
    invulnMs = Math.max(invulnMs ?? 0, warpInvulnMs);
  }

  let next = state;
  if (wallPassMs !== null) {
    next = { ...next, wallPassRemainingMs: wallPassMs };
  }
  if (invulnMs !== null) {
    next = { ...next, invulnRemainingMs: invulnMs };
  }
  if (speedBurstMs !== null) {
    next = { ...next, speedBurstRemainingMs: speedBurstMs };
  }
  if (ghostHarvestMs !== null) {
    next = { ...next, ghostHarvestRemainingMs: ghostHarvestMs };
  }
  if (defyDeathMs !== null) {
    next = { ...next, defyDeathRemainingMs: defyDeathMs };
  }

  return {
    state: next,
    freezeClosestMs,
    recallGhostCount,
    cornerTeleportHoldMs,
    warpPlayerFarthest,
    collectExtraPellets,
  };
}

function speedMultiplier(
  owned: readonly UpgradeId[],
  key: "playerSpeedMul" | "ghostSpeedMul" | "fruitLifetimeMul",
): number {
  let mul = 1;
  for (const id of owned) {
    const defMul = UPGRADE_BY_ID.get(id)?.[key];
    if (defMul !== undefined) {
      mul *= defMul;
    }
  }
  return mul;
}

export function playerSpeedMultiplier(owned: readonly UpgradeId[]): number {
  return speedMultiplier(owned, "playerSpeedMul");
}

export function ghostSpeedMultiplier(owned: readonly UpgradeId[]): number {
  return speedMultiplier(owned, "ghostSpeedMul");
}

function ownedValue<K extends Exclude<keyof UpgradeEffects, "onPowerPellet">>(
  owned: readonly UpgradeId[],
  key: K,
): UpgradeEffects[K] | undefined {
  for (const id of owned) {
    const value = UPGRADE_BY_ID.get(id)?.[key];
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

export function fruitQuartersPerFruit(owned: readonly UpgradeId[]): number | null {
  return ownedValue(owned, "fruitQuarters") ?? null;
}

export function fruitPersistsUntilLevelEnd(owned: readonly UpgradeId[]): boolean {
  return ownedValue(owned, "fruitPersistsUntilLevelEnd") === true;
}

export function fruitStacksSideBySide(owned: readonly UpgradeId[]): boolean {
  return ownedValue(owned, "fruitStacksSideBySide") === true;
}

export function fruitPowerConvertsPellet(owned: readonly UpgradeId[]): boolean {
  return ownedValue(owned, "fruitPowerConvertsPellet") === true;
}

export function fruitFeastThresholds(owned: readonly UpgradeId[]): readonly number[] | null {
  return ownedValue(owned, "fruitFeastThresholds") ?? null;
}

export function moneyTalksCost(owned: readonly UpgradeId[]): number | null {
  return ownedValue(owned, "deathQuarterCost") ?? null;
}

export function lifeFloorBonus(owned: readonly UpgradeId[]): number {
  return ownedValue(owned, "lifeFloorBonus") ?? 0;
}

export function regenToFull(owned: readonly UpgradeId[]): boolean {
  return ownedValue(owned, "regenToFull") === true;
}

export function pelletSurgeCount(owned: readonly UpgradeId[]): number {
  return ownedValue(owned, "pelletSurgeCount") ?? 0;
}

export function lazyLooperRings(owned: readonly UpgradeId[]): LazyLooperRings | null {
  return ownedValue(owned, "lazyLooperRings") ?? null;
}

export function deathsHarvestRadiusTiles(owned: readonly UpgradeId[]): number {
  return ownedValue(owned, "deathsHarvestRadiusTiles") ?? DEATHS_HARVEST_RADIUS_TILES;
}

export function deathsBountyCharge(owned: readonly UpgradeId[], priorDeaths: number): number {
  const decay = ownedValue(owned, "deathsBountyDecay");
  return decay === undefined ? 0 : Math.floor(BONUS_BAR_MAX * decay ** priorDeaths);
}

export function overchargeMultiplier(owned: readonly UpgradeId[]): number {
  return ownedValue(owned, "overchargeMul") ?? 1;
}

export function ghostTunnelSpeedRatio(owned: readonly UpgradeId[]): number | null {
  return ownedValue(owned, "ghostTunnelSpeedRatio") ?? null;
}

export function secondChompMs(owned: readonly UpgradeId[]): number {
  return ownedValue(owned, "secondChompMs") ?? SECOND_CHOMP_MS;
}

export function speedBurstMultiplier(owned: readonly UpgradeId[]): number {
  return ownedValue(owned, "speedBurstMul") ?? 1;
}

export function turnBoostMs(owned: readonly UpgradeId[]): number {
  return ownedValue(owned, "turnBoostMs") ?? TURN_TUNING_BOOST_MS;
}

export function turnPerfectPx(owned: readonly UpgradeId[]): number {
  return ownedValue(owned, "turnPerfectPx") ?? TURN_TUNING_PERFECT_PX;
}

export function wallPassLoopOwned(owned: readonly UpgradeId[]): boolean {
  return owned.some((id) => UPGRADE_BY_ID.get(id)?.onPowerPellet?.wallPassLoop === true);
}

export function fruitLifetimeMultiplier(owned: readonly UpgradeId[]): number {
  return speedMultiplier(owned, "fruitLifetimeMul");
}

export function pelletCollectRadiusBonusPx(owned: readonly UpgradeId[]): number {
  let bonus = 0;
  for (const id of owned) {
    const defBonus = UPGRADE_BY_ID.get(id)?.pelletCollectRadiusBonusPx;
    if (defBonus !== undefined) {
      bonus = Math.max(bonus, defBonus);
    }
  }
  return bonus;
}

function sumOwnedField(
  owned: readonly UpgradeId[],
  key: "ghostHouseReleaseDelayAddMs" | "ghostHouseClydePelletAdd",
): number {
  let sum = 0;
  for (const id of owned) {
    const add = UPGRADE_BY_ID.get(id)?.[key];
    if (add !== undefined) {
      sum += add;
    }
  }
  return sum;
}

export function ghostHouseReleaseDelayAddMs(owned: readonly UpgradeId[]): number {
  return sumOwnedField(owned, "ghostHouseReleaseDelayAddMs");
}

export function remoteTransferEvery(owned: readonly UpgradeId[]): number | null {
  for (const id of owned) {
    const every = getUpgradeDef(id).remoteTransferEveryPellets;
    if (every !== undefined) {
      return every;
    }
  }
  return null;
}

export function ghostHouseClydePelletAdd(owned: readonly UpgradeId[]): number {
  return sumOwnedField(owned, "ghostHouseClydePelletAdd");
}

export function frozenGhostEid(state: RunUpgrades): number | null {
  return state.freezeRemainingMs > 0 ? state.frozenGhostEid : null;
}

export function playerIsInvulnerable(state: RunUpgrades): boolean {
  return state.invulnRemainingMs > 0;
}

export function playerTintRemainingMs(state: RunUpgrades): number {
  return Math.max(state.invulnRemainingMs, state.defyDeathRemainingMs);
}

export function wallPassActive(state: RunUpgrades): boolean {
  return state.wallPassRemainingMs > 0;
}

export function speedBurstActive(state: RunUpgrades): boolean {
  return state.speedBurstRemainingMs > 0;
}

export function ghostHarvestActive(state: RunUpgrades): boolean {
  return state.ghostHarvestRemainingMs > 0;
}

export function defyDeathActive(state: RunUpgrades): boolean {
  return state.defyDeathRemainingMs > 0;
}

export function groupUpgradesBySchool(
  defs: readonly UpgradeDef[],
): { school: UpgradeSchool; defs: UpgradeDef[] }[] {
  return UPGRADE_SCHOOL_ORDER.map((school) => ({
    school,
    defs: defs.filter((def) => def.school === school),
  })).filter((group) => group.defs.length > 0);
}

export function upgradeLabels(owned: readonly UpgradeId[]): string[] {
  return owned.map((id) => UPGRADE_BY_ID.get(id)?.label ?? id);
}
