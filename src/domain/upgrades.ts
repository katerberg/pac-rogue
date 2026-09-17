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
  grantLives?: number;
  onPowerPellet?: {
    freezeGhostsMs?: number;
    scatterBurstMs?: number;
    recallClosestGhost?: true;
    warpPlayerTopCenter?: true;
  };
};

export const FREEZE_MS = 3000;
export const SCATTER_BURST_MS = 3000;
export const PLAYER_SPEED_UP_MUL = 1.25;
export const GHOST_SLOW_MUL = 0.75;

export const UPGRADE_DEFS: readonly UpgradeDef[] = [
  {
    id: "powerPelletFreeze",
    label: "Power Freeze",
    description: "Chomp a power pellet and ghosts lock solid for a few seconds.",
    onPowerPellet: { freezeGhostsMs: FREEZE_MS },
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
  },
  {
    id: "powerWallPass",
    label: "Wall Pass",
    description: "Power pellet lets you slip through walls for a breath.",
  },
  {
    id: "powerSpeedBurst",
    label: "Speed Burst",
    description: "Power pellet spikes your pace for a few seconds.",
  },
  {
    id: "powerInvuln",
    label: "Ghost Proof",
    description: "Power pellet lets you pass through ghosts briefly.",
  },
];

const UPGRADE_BY_ID: ReadonlyMap<UpgradeId, UpgradeDef> = new Map(
  UPGRADE_DEFS.map((def) => [def.id, def]),
);

const ALL_UPGRADE_IDS: readonly UpgradeId[] = UPGRADE_DEFS.map((def) => def.id);

export type RunUpgrades = {
  owned: UpgradeId[];
  freezeRemainingMs: number;
  scatterBurstRemainingMs: number;
  forceNextId: UpgradeId | null;
  lastDeclinedUpgradeId: UpgradeId | null;
};

export type PowerPelletApplyResult = {
  state: RunUpgrades;
  recallClosestGhost: boolean;
  warpPlayerTopCenter: boolean;
};

export function createRunUpgrades(
  forceNextId: UpgradeId | null = null,
  enabled: readonly UpgradeId[] = [],
): RunUpgrades {
  let state: RunUpgrades = {
    owned: [],
    freezeRemainingMs: 0,
    scatterBurstRemainingMs: 0,
    forceNextId,
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

export function pickUpgradeChoiceOffer(
  owned: readonly UpgradeId[],
  lastDeclined: UpgradeId | null,
  rng: () => number,
  forceNext: UpgradeId | null,
): UpgradeId[] | null {
  const eligible = eligibleUpgrades(owned);
  if (eligible.length === 0) {
    return null;
  }
  if (eligible.length === 1) {
    return [eligible[0]!];
  }

  const reservedForce = forceNext !== null && eligible.includes(forceNext) ? forceNext : null;
  const pool = eligible.filter((id) => id !== reservedForce);
  const needed = reservedForce === null ? 2 : 1;

  const preferred = pool.filter((id) => id !== lastDeclined);
  const picked: UpgradeId[] = [];
  const drawPool = [...preferred];
  while (picked.length < needed && drawPool.length > 0) {
    picked.push(takeRandomFrom(drawPool, rng));
  }

  if (
    picked.length < needed &&
    lastDeclined !== null &&
    pool.includes(lastDeclined) &&
    !picked.includes(lastDeclined)
  ) {
    picked.push(lastDeclined);
  }

  const options: UpgradeId[] =
    reservedForce === null ? picked.slice(0, 2) : [reservedForce, ...picked].slice(0, 2);
  shuffleInPlace(options, rng);
  return options;
}

export function confirmUpgradeChoice(
  state: RunUpgrades,
  options: readonly UpgradeId[],
  chosenId: UpgradeId,
): RunUpgrades {
  const next = { ...grantUpgrade(state, chosenId), forceNextId: null };
  if (options.length !== 2) {
    return next;
  }
  return {
    ...next,
    lastDeclinedUpgradeId: options.find((id) => id !== chosenId) ?? null,
  };
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
  return {
    ...state,
    freezeRemainingMs: Math.max(0, state.freezeRemainingMs - Math.max(0, deltaMs)),
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

export function applyPowerPelletEffects(
  state: RunUpgrades,
  powerRemoved: number,
): PowerPelletApplyResult {
  if (powerRemoved <= 0) {
    return {
      state,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
    };
  }

  let freezeMs: number | null = null;
  let scatterMs: number | null = null;
  let recallClosestGhost = false;
  let warpPlayerTopCenter = false;

  for (const id of state.owned) {
    const onPower = UPGRADE_BY_ID.get(id)?.onPowerPellet;
    if (!onPower) {
      continue;
    }
    if (onPower.freezeGhostsMs !== undefined) {
      freezeMs =
        freezeMs === null ? onPower.freezeGhostsMs : Math.max(freezeMs, onPower.freezeGhostsMs);
    }
    if (onPower.scatterBurstMs !== undefined) {
      scatterMs =
        scatterMs === null ? onPower.scatterBurstMs : Math.max(scatterMs, onPower.scatterBurstMs);
    }
    if (onPower.recallClosestGhost) {
      recallClosestGhost = true;
    }
    if (onPower.warpPlayerTopCenter) {
      warpPlayerTopCenter = true;
    }
  }

  let next = state;
  if (freezeMs !== null) {
    next = { ...next, freezeRemainingMs: freezeMs };
  }
  if (scatterMs !== null) {
    next = { ...next, scatterBurstRemainingMs: scatterMs };
  }

  return {
    state: next,
    recallClosestGhost,
    warpPlayerTopCenter,
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

export function ghostsAreFrozen(state: RunUpgrades): boolean {
  return state.freezeRemainingMs > 0;
}

export function scatterBurstActive(state: RunUpgrades): boolean {
  return state.scatterBurstRemainingMs > 0;
}

export function upgradeLabels(owned: readonly UpgradeId[]): string[] {
  return owned.map((id) => UPGRADE_BY_ID.get(id)?.label ?? id);
}
