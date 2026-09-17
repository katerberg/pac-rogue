export type UpgradeId =
  "powerPelletFreeze" | "playerSpeedUp" | "ghostSlow" | "scatterBurst" | "ghostRecall" | "warpTop";

export type UpgradeDef = {
  id: UpgradeId;
  label: string;
  playerSpeedMul?: number;
  ghostSpeedMul?: number;
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
    onPowerPellet: { freezeGhostsMs: FREEZE_MS },
  },
  { id: "playerSpeedUp", label: "Speed Up", playerSpeedMul: PLAYER_SPEED_UP_MUL },
  { id: "ghostSlow", label: "Ghost Slow", ghostSpeedMul: GHOST_SLOW_MUL },
  {
    id: "scatterBurst",
    label: "Scatter Burst",
    onPowerPellet: { scatterBurstMs: SCATTER_BURST_MS },
  },
  {
    id: "ghostRecall",
    label: "Ghost Recall",
    onPowerPellet: { recallClosestGhost: true },
  },
  {
    id: "warpTop",
    label: "Warp Top",
    onPowerPellet: { warpPlayerTopCenter: true },
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

export function eligibleUpgrades(owned: readonly UpgradeId[]): UpgradeId[] {
  const ownedSet = new Set(owned);
  return ALL_UPGRADE_IDS.filter((id) => !ownedSet.has(id));
}

export function pickUpgrade(
  owned: readonly UpgradeId[],
  rng: () => number,
  forceNext: UpgradeId | null,
): UpgradeId | null {
  if (forceNext !== null && !owned.includes(forceNext)) {
    return forceNext;
  }
  const eligible = eligibleUpgrades(owned);
  if (eligible.length === 0) {
    return null;
  }
  const index = Math.min(eligible.length - 1, Math.floor(rng() * eligible.length));
  return eligible[index] ?? null;
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

export function grantRandomUpgrade(state: RunUpgrades, rng: () => number): RunUpgrades {
  const picked = pickUpgrade(state.owned, rng, state.forceNextId);
  const cleared: RunUpgrades = { ...state, forceNextId: null };
  if (picked === null) {
    return cleared;
  }
  return grantUpgrade(cleared, picked);
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
