import { TILE_SIZE } from "./maze";

export type UpgradeId =
  | "powerPelletFreeze"
  | "playerSpeedUp"
  | "ghostSlow"
  | "scatterBurst"
  | "ghostRecall"
  | "warpTop"
  | "pickupRange"
  | "ghostHouseDelay"
  | "extraLife"
  | "pelletToPower"
  | "powerCollectThree"
  | "powerWallPass"
  | "powerSpeedBurst"
  | "powerInvuln";

export type UpgradeDef = {
  id: UpgradeId;
  label: string;
  description: string;
  playerSpeedMul?: number;
  ghostSpeedMul?: number;
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

export const UPGRADE_DEFS: readonly UpgradeDef[] = [
  {
    id: "powerPelletFreeze",
    label: "Power Freeze",
    description: "Chomp a power pellet and the nearest ghost locks solid for a few seconds.",
    onPowerPellet: { freezeClosestGhostMs: FREEZE_MS },
  },
  {
    id: "playerSpeedUp",
    label: "Speed Up",
    description: "You run hotter. Corners feel closer.",
    playerSpeedMul: PLAYER_SPEED_UP_MUL,
  },
  {
    id: "ghostSlow",
    label: "Ghost Slow",
    description: "The hunt softens. Ghosts drag their feet.",
    ghostSpeedMul: GHOST_SLOW_MUL,
  },
  {
    id: "scatterBurst",
    label: "Scatter Burst",
    description: "Power pellet scatters every ghost into the corners.",
    onPowerPellet: { scatterBurstMs: SCATTER_BURST_MS },
  },
  {
    id: "ghostRecall",
    label: "Ghost Recall",
    description: "Power pellet yanks the nearest ghost straight home.",
    onPowerPellet: { recallClosestGhost: true },
  },
  {
    id: "warpTop",
    label: "Warp Top",
    description: "Power pellet flings you to the top of the maze.",
    onPowerPellet: { warpPlayerTopCenter: true },
  },
  {
    id: "pickupRange",
    label: "Pickup Range",
    description: "Pellets within a cell of you snap into your mouth.",
  },
  {
    id: "ghostHouseDelay",
    label: "House Delay",
    description: "Ghosts linger longer in the house before the hunt.",
    ghostHouseReleaseDelayAddMs: GHOST_HOUSE_RELEASE_DELAY_ADD_MS,
    ghostHouseClydePelletAdd: GHOST_HOUSE_CLYDE_PELLET_ADD,
  },
  {
    id: "extraLife",
    label: "Extra Life",
    description: "One more chance before the maze goes dark.",
    grantLives: 1,
  },
  {
    id: "pelletToPower",
    label: "Pellet Surge",
    description: "A quiet pellet turns hot, and another may follow.",
  },
  {
    id: "powerCollectThree",
    label: "Triple Chomp",
    description: "Power pellet gulps three more pellets with it.",
    onPowerPellet: { collectExtraPellets: POWER_COLLECT_THREE_COUNT },
  },
  {
    id: "powerWallPass",
    label: "Wall Pass",
    description: "Power pellet lets you slip through walls for a breath.",
    onPowerPellet: { wallPassMs: WALL_PASS_MS },
  },
  {
    id: "powerSpeedBurst",
    label: "Speed Burst",
    description: "Power pellet spikes your pace for a few seconds.",
    onPowerPellet: { playerSpeedBurstMs: SPEED_BURST_MS },
  },
  {
    id: "powerInvuln",
    label: "Ghost Proof",
    description: "Power pellet lets you pass through ghosts briefly.",
    onPowerPellet: { playerInvulnMs: INVULN_MS },
  },
];

const UPGRADE_BY_ID: ReadonlyMap<UpgradeId, UpgradeDef> = new Map(
  UPGRADE_DEFS.map((def) => [def.id, def]),
);

const ALL_UPGRADE_IDS: readonly UpgradeId[] = UPGRADE_DEFS.map((def) => def.id);

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
  key: "playerSpeedMul" | "ghostSpeedMul",
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

export function pelletCollectRadiusBonusPx(owned: readonly UpgradeId[]): number {
  let bonus = 0;
  for (const id of owned) {
    if (id === "pickupRange") {
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
