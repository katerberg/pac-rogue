import { TILE_SIZE } from "./maze";

export type UpgradeId =
  | "powerPelletFreeze"
  | "passivePlayerSpeedUp"
  | "passiveGhostSlow"
  | "powerPelletScatterBurst"
  | "powerPelletGhostRecall"
  | "powerPelletWarpTop"
  | "passivePickupRange"
  | "passiveGhostHouseDelay"
  | "passiveExtraLife"
  | "passivePelletToPower"
  | "powerPelletCollectThree"
  | "powerPelletWallPass"
  | "powerPelletSpeedBurst"
  | "powerPelletInvuln"
  | "fruitPowerPellet"
  | "fruitQuarterBounty"
  | "passiveDeathsHarvest"
  | "passiveOvercharge"
  | "passiveTunnelDash"
  | "powerPelletSecondChomp";

export type UpgradeDef = {
  id: UpgradeId;
  label: string;
  description: string;
  playerSpeedMul?: number;
  ghostSpeedMul?: number;
  fruitQuarterMul?: number;
  pelletCollectRadiusBonusPx?: number;
  grantLives?: number;
  ghostHouseReleaseDelayAddMs?: number;
  ghostHouseClydePelletAdd?: number;
  onPowerPellet?: {
    freezeClosestGhostMs?: number;
    scatterBurstMs?: number;
    wallPassMs?: number;
    playerInvulnMs?: number;
    playerSpeedBurstMs?: number;
    recallClosestGhost?: true;
    warpPlayerTopCenter?: true;
    collectExtraPellets?: number;
  };
};

export const FREEZE_MS = 3000;
export const SCATTER_BURST_MS = 3000;
export const WALL_PASS_MS = 6000;
export const INVULN_MS = 3000;
export const SPEED_BURST_MS = 3000;
export const PLAYER_SPEED_UP_MUL = 1.25;
export const PLAYER_SPEED_BURST_MUL = 1.25;
export const GHOST_SLOW_MUL = 0.75;
export function pickupRangeBonusPx(): number {
  return TILE_SIZE;
}

export const GHOST_HOUSE_RELEASE_DELAY_ADD_MS = 2000;
export const GHOST_HOUSE_CLYDE_PELLET_ADD = 15;
export const POWER_COLLECT_THREE_COUNT = 3;
export const QUARTERS_CHOICE_AMOUNT = 2;
export const UPGRADE_CHOICE_MAX_UPGRADE_OPTIONS = 3;
export const QUARTER_BOUNTY_MUL = 2;
export const DEATHS_HARVEST_RADIUS_TILES = 6;
export const OVERCHARGE_MUL = 2;
export const SECOND_CHOMP_MS = 10_000;
export const TUNNEL_DASH_SPEED_MUL = 10;

export const UPGRADE_DEFS: readonly UpgradeDef[] = [
  {
    id: "powerPelletFreeze",
    label: "Power Freeze",
    description: "Chomp a power pellet and the nearest ghost locks solid for a few seconds.",
    onPowerPellet: { freezeClosestGhostMs: FREEZE_MS },
  },
  {
    id: "passivePlayerSpeedUp",
    label: "Speed Up",
    description: "You run hotter. Corners feel closer.",
    playerSpeedMul: PLAYER_SPEED_UP_MUL,
  },
  {
    id: "passiveGhostSlow",
    label: "Ghost Slow",
    description: "The hunt softens. Ghosts drag their feet.",
    ghostSpeedMul: GHOST_SLOW_MUL,
  },
  {
    id: "powerPelletScatterBurst",
    label: "Scatter Burst",
    description: "Power pellet scatters every ghost into the corners.",
    onPowerPellet: { scatterBurstMs: SCATTER_BURST_MS },
  },
  {
    id: "powerPelletGhostRecall",
    label: "Ghost Recall",
    description: "Power pellet yanks the nearest ghost straight home.",
    onPowerPellet: { recallClosestGhost: true },
  },
  {
    id: "powerPelletWarpTop",
    label: "Warp Top",
    description: "Power pellet flings you to the top of the maze.",
    onPowerPellet: { warpPlayerTopCenter: true },
  },
  {
    id: "passivePickupRange",
    label: "Pickup Range",
    description: "Pellets within a cell of you snap into your mouth.",
  },
  {
    id: "passiveGhostHouseDelay",
    label: "House Delay",
    description: "Ghosts linger longer in the house before the hunt.",
    ghostHouseReleaseDelayAddMs: GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
    ghostHouseClydePelletAdd: GHOST_HOUSE_CLYDE_PELLET_ADD,
  },
  {
    id: "passiveExtraLife",
    label: "Extra Life",
    description: "One more chance before the maze goes dark.",
    grantLives: 1,
  },
  {
    id: "passivePelletToPower",
    label: "Pellet Surge",
    description: "A quiet pellet turns hot, and another may follow.",
  },
  {
    id: "powerPelletCollectThree",
    label: "Triple Chomp",
    description: "Power pellet gulps three more pellets with it.",
    onPowerPellet: { collectExtraPellets: POWER_COLLECT_THREE_COUNT },
  },
  {
    id: "powerPelletWallPass",
    label: "Wall Pass",
    description: "Power pellet lets you slip through walls for a breath.",
    onPowerPellet: { wallPassMs: WALL_PASS_MS },
  },
  {
    id: "powerPelletSpeedBurst",
    label: "Speed Burst",
    description: "Power pellet spikes your pace for a few seconds.",
    onPowerPellet: { playerSpeedBurstMs: SPEED_BURST_MS },
  },
  {
    id: "powerPelletInvuln",
    label: "Ghost Proof",
    description: "Power pellet lets you pass through ghosts briefly.",
    onPowerPellet: { playerInvulnMs: INVULN_MS },
  },
  {
    id: "fruitPowerPellet",
    label: "Fruit Power",
    description: "Bonus fruit hits like a power pellet, triggering every effect you own.",
  },
  {
    id: "fruitQuarterBounty",
    label: "Quarter Bounty",
    description: "Bonus fruit pays out double quarters.",
    fruitQuarterMul: QUARTER_BOUNTY_MUL,
  },
  {
    id: "passiveDeathsHarvest",
    label: "Death's Harvest",
    description: "Dying harvests nearby pellets — clear the board this way and it counts as a win.",
  },
  {
    id: "passiveOvercharge",
    label: "Overcharge",
    description: "Doubles the duration of every other power pellet timer you're running.",
  },
  {
    id: "passiveTunnelDash",
    label: "Tunnel Dash",
    description: "Tunnels move you the instant you touch them.",
  },
  {
    id: "powerPelletSecondChomp",
    label: "Second Chomp",
    description: "Eaten power pellets regenerate after ten seconds.",
  },
];

const UPGRADE_BY_ID: ReadonlyMap<UpgradeId, UpgradeDef> = new Map(
  UPGRADE_DEFS.map((def) => [def.id, def]),
);

export const ALL_UPGRADE_IDS: readonly UpgradeId[] = UPGRADE_DEFS.map((def) => def.id);

/** Pre-prefix rename ids → current ids (URL flags + seen-record migration). */
const LEGACY_UPGRADE_IDS: Readonly<Record<string, UpgradeId>> = {
  playerSpeedUp: "passivePlayerSpeedUp",
  ghostSlow: "passiveGhostSlow",
  scatterBurst: "powerPelletScatterBurst",
  ghostRecall: "powerPelletGhostRecall",
  warpTop: "powerPelletWarpTop",
  pickupRange: "passivePickupRange",
  ghostHouseDelay: "passiveGhostHouseDelay",
  extraLife: "passiveExtraLife",
  pelletToPower: "passivePelletToPower",
  powerCollectThree: "powerPelletCollectThree",
  powerWallPass: "powerPelletWallPass",
  powerSpeedBurst: "powerPelletSpeedBurst",
  powerInvuln: "powerPelletInvuln",
  fruitPower: "fruitPowerPellet",
  quarterBounty: "fruitQuarterBounty",
  deathsHarvest: "passiveDeathsHarvest",
  overcharge: "passiveOvercharge",
  tunnelDash: "passiveTunnelDash",
  secondChomp: "powerPelletSecondChomp",
  unknownUpgradeFruitPower: "fruitPowerPellet",
  passiveQuarterBounty: "fruitQuarterBounty",
  unknownUpgradeOvercharge: "passiveOvercharge",
};

export type PendingPowerPelletRespawn = { x: number; y: number; remainingMs: number };

export function queuePowerPelletRespawns(
  pending: PendingPowerPelletRespawn[],
  positions: readonly { x: number; y: number }[],
): PendingPowerPelletRespawn[] {
  if (positions.length === 0) {
    return pending;
  }
  return [
    ...pending,
    ...positions.map((pos) => ({ x: pos.x, y: pos.y, remainingMs: SECOND_CHOMP_MS })),
  ];
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
  scatterBurstRemainingMs: number;
  wallPassRemainingMs: number;
  invulnRemainingMs: number;
  speedBurstRemainingMs: number;
  lastDeclinedUpgradeId: UpgradeId | null;
};

export type PowerPelletApplyResult = {
  state: RunUpgrades;
  freezeClosestMs: number | null;
  recallClosestGhost: boolean;
  warpPlayerTopCenter: boolean;
  collectExtraPellets: number;
};

export function createRunUpgrades(enabled: readonly UpgradeId[] = []): RunUpgrades {
  let state: RunUpgrades = {
    owned: [],
    freezeRemainingMs: 0,
    frozenGhostEid: null,
    scatterBurstRemainingMs: 0,
    wallPassRemainingMs: 0,
    invulnRemainingMs: 0,
    speedBurstRemainingMs: 0,
    lastDeclinedUpgradeId: null,
  };
  for (const id of enabled) {
    state = grantUpgrade(state, id);
  }
  return state;
}

export function parseUpgradeId(raw: string | null): UpgradeId | null {
  if (raw === null || raw === "") {
    return null;
  }
  if (UPGRADE_BY_ID.has(raw as UpgradeId)) {
    return raw as UpgradeId;
  }
  return LEGACY_UPGRADE_IDS[raw] ?? null;
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

export function grantLivesForUpgrade(id: UpgradeId): number {
  return UPGRADE_BY_ID.get(id)?.grantLives ?? 0;
}

export function eligibleUpgrades(owned: readonly UpgradeId[]): UpgradeId[] {
  const ownedSet = new Set(owned);
  return ALL_UPGRADE_IDS.filter((id) => !ownedSet.has(id));
}

function takeRandomFrom(pool: UpgradeId[], rng: () => number): UpgradeId {
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  const picked = pool[index]!;
  pool.splice(index, 1);
  return picked;
}

function shuffleInPlace(ids: UpgradeId[], rng: () => number): void {
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    const tmp = ids[i]!;
    ids[i] = ids[j]!;
    ids[j] = tmp;
  }
}

export type UpgradeChoiceOption =
  { kind: "upgrade"; id: UpgradeId } | { kind: "quarters"; amount: number };

export type UpgradeChoiceOffer = {
  quarters: number;
  upgrades: UpgradeId[];
};

export function pickUpgradeChoiceOffer(
  owned: readonly UpgradeId[],
  lastDeclined: UpgradeId | null,
  rng: () => number,
): UpgradeChoiceOffer {
  const eligible = eligibleUpgrades(owned);
  const desiredCount = Math.min(UPGRADE_CHOICE_MAX_UPGRADE_OPTIONS, eligible.length);

  const preferred = eligible.filter((id) => id !== lastDeclined);
  const picked: UpgradeId[] = [];
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

export function pickStartingUpgrade(
  owned: readonly UpgradeId[],
  rng: () => number,
): UpgradeId | null {
  const eligible = eligibleUpgrades(owned);
  if (eligible.length === 0) {
    return null;
  }
  return takeRandomFrom(eligible, rng);
}

function withDeclined(state: RunUpgrades, declined: readonly UpgradeId[]): RunUpgrades {
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
  options: readonly UpgradeId[],
  chosenId: UpgradeId,
): RunUpgrades {
  const next = grantUpgrade(state, chosenId);
  return withDeclined(
    next,
    options.filter((id) => id !== chosenId),
  );
}

export function declineUpgrades(
  state: RunUpgrades,
  declinedIds: readonly UpgradeId[],
): RunUpgrades {
  return withDeclined(state, declinedIds);
}

export function grantUpgrade(state: RunUpgrades, id: UpgradeId): RunUpgrades {
  if (state.owned.includes(id)) {
    return state;
  }
  return {
    ...state,
    owned: [...state.owned, id],
  };
}

export function revokeUpgrade(state: RunUpgrades, id: UpgradeId): RunUpgrades {
  if (!state.owned.includes(id)) {
    return state;
  }
  return {
    ...state,
    owned: state.owned.filter((owned) => owned !== id),
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

export function tickScatterBurst(state: RunUpgrades, deltaMs: number): RunUpgrades {
  if (state.scatterBurstRemainingMs <= 0) {
    return state;
  }
  return {
    ...state,
    scatterBurstRemainingMs: Math.max(0, state.scatterBurstRemainingMs - Math.max(0, deltaMs)),
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

export function applyPowerPelletEffects(
  state: RunUpgrades,
  powerRemoved: number,
): PowerPelletApplyResult {
  if (powerRemoved <= 0) {
    return {
      state,
      freezeClosestMs: null,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
      collectExtraPellets: 0,
    };
  }

  let freezeClosestMs: number | null = null;
  let scatterMs: number | null = null;
  let wallPassMs: number | null = null;
  let invulnMs: number | null = null;
  let speedBurstMs: number | null = null;
  let recallClosestGhost = false;
  let warpPlayerTopCenter = false;
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
    if (onPower.scatterBurstMs !== undefined) {
      scatterMs =
        scatterMs === null ? onPower.scatterBurstMs : Math.max(scatterMs, onPower.scatterBurstMs);
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
    if (onPower.recallClosestGhost) {
      recallClosestGhost = true;
    }
    if (onPower.warpPlayerTopCenter) {
      warpPlayerTopCenter = true;
    }
    if (onPower.collectExtraPellets !== undefined) {
      collectExtraPellets = Math.max(collectExtraPellets, onPower.collectExtraPellets);
    }
  }

  if (state.owned.includes("passiveOvercharge")) {
    if (freezeClosestMs !== null) {
      freezeClosestMs *= OVERCHARGE_MUL;
    }
    if (scatterMs !== null) {
      scatterMs *= OVERCHARGE_MUL;
    }
    if (wallPassMs !== null) {
      wallPassMs *= OVERCHARGE_MUL;
    }
    if (invulnMs !== null) {
      invulnMs *= OVERCHARGE_MUL;
    }
    if (speedBurstMs !== null) {
      speedBurstMs *= OVERCHARGE_MUL;
    }
  }

  let next = state;
  if (scatterMs !== null) {
    next = { ...next, scatterBurstRemainingMs: scatterMs };
  }
  if (wallPassMs !== null) {
    next = { ...next, wallPassRemainingMs: wallPassMs };
  }
  if (invulnMs !== null) {
    next = { ...next, invulnRemainingMs: invulnMs };
  }
  if (speedBurstMs !== null) {
    next = { ...next, speedBurstRemainingMs: speedBurstMs };
  }

  return {
    state: next,
    freezeClosestMs,
    recallClosestGhost,
    warpPlayerTopCenter,
    collectExtraPellets,
  };
}

function speedMultiplier(
  owned: readonly UpgradeId[],
  key: "playerSpeedMul" | "ghostSpeedMul" | "fruitQuarterMul",
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

export function fruitQuarterMultiplier(owned: readonly UpgradeId[]): number {
  return speedMultiplier(owned, "fruitQuarterMul");
}

export function pelletCollectRadiusBonusPx(owned: readonly UpgradeId[]): number {
  let bonus = 0;
  for (const id of owned) {
    if (id === "passivePickupRange") {
      bonus = Math.max(bonus, pickupRangeBonusPx());
      continue;
    }
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

export function ghostHouseClydePelletAdd(owned: readonly UpgradeId[]): number {
  return sumOwnedField(owned, "ghostHouseClydePelletAdd");
}

export function frozenGhostEid(state: RunUpgrades): number | null {
  return state.freezeRemainingMs > 0 ? state.frozenGhostEid : null;
}

export function playerIsInvulnerable(state: RunUpgrades): boolean {
  return state.invulnRemainingMs > 0;
}

export function scatterBurstActive(state: RunUpgrades): boolean {
  return state.scatterBurstRemainingMs > 0;
}

export function wallPassActive(state: RunUpgrades): boolean {
  return state.wallPassRemainingMs > 0;
}

export function speedBurstActive(state: RunUpgrades): boolean {
  return state.speedBurstRemainingMs > 0;
}

export function upgradeLabels(owned: readonly UpgradeId[]): string[] {
  return owned.map((id) => UPGRADE_BY_ID.get(id)?.label ?? id);
}
