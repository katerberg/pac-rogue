export type UpgradeId = "powerPelletFreeze" | "playerSpeedUp" | "ghostSlow";

export type UpgradeDef = {
  id: UpgradeId;
  label: string;
  playerSpeedMul?: number;
  ghostSpeedMul?: number;
  onPowerPellet?: { freezeGhostsMs: number };
};

export const FREEZE_MS = 3000;
export const PLAYER_SPEED_UP_MUL = 1.25;
export const GHOST_SLOW_MUL = 0.75;
export const GHOST_FROZEN_TINT = 0x7ec8ff;

export const UPGRADE_DEFS: readonly UpgradeDef[] = [
  {
    id: "powerPelletFreeze",
    label: "Power Freeze",
    onPowerPellet: { freezeGhostsMs: FREEZE_MS },
  },
  { id: "playerSpeedUp", label: "Speed Up", playerSpeedMul: PLAYER_SPEED_UP_MUL },
  { id: "ghostSlow", label: "Ghost Slow", ghostSpeedMul: GHOST_SLOW_MUL },
];

const UPGRADE_BY_ID: ReadonlyMap<UpgradeId, UpgradeDef> = new Map(
  UPGRADE_DEFS.map((def) => [def.id, def]),
);

const ALL_UPGRADE_IDS: readonly UpgradeId[] = UPGRADE_DEFS.map((def) => def.id);

export type RunUpgrades = {
  owned: UpgradeId[];
  freezeRemainingMs: number;
  forceNextId: UpgradeId | null;
};

export function createRunUpgrades(forceNextId: UpgradeId | null = null): RunUpgrades {
  return {
    owned: [],
    freezeRemainingMs: 0,
    forceNextId,
  };
}

export function parseForceUpgradeParam(raw: string | null): UpgradeId | null {
  if (raw === null) {
    return null;
  }
  return UPGRADE_BY_ID.has(raw as UpgradeId) ? (raw as UpgradeId) : null;
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

export function applyPowerPelletEffects(state: RunUpgrades, powerRemoved: number): RunUpgrades {
  if (powerRemoved <= 0) {
    return state;
  }
  let freezeMs: number | null = null;
  for (const id of state.owned) {
    const def = UPGRADE_BY_ID.get(id);
    const ms = def?.onPowerPellet?.freezeGhostsMs;
    if (ms !== undefined) {
      freezeMs = ms;
      break;
    }
  }
  if (freezeMs === null) {
    return state;
  }
  return { ...state, freezeRemainingMs: freezeMs };
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

export function upgradeLabels(owned: readonly UpgradeId[]): string[] {
  return owned.map((id) => UPGRADE_BY_ID.get(id)?.label ?? id);
}
