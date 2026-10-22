import type { GhostKindId } from "./ghostKind";
import { TRINKET_IDS, isTrinketId, slotCount, trinketEligible } from "./trinkets";
import {
  MAX_RUN_UPGRADES,
  baseIdOf,
  clearStaleUpgradeTimers,
  grantUpgrade,
  hasUpgrade,
  revokeUpgrade,
  takeRandomFrom,
  type RunUpgrades,
  type UpgradeId,
} from "./upgrades";

export type SalvageResult = {
  state: RunUpgrades;
  gained: UpgradeId | null;
  quarters: 0 | 1;
};

export function isAtCap(owned: readonly UpgradeId[]): boolean {
  return slotCount(owned) >= MAX_RUN_UPGRADES;
}

export function needsSalvage(owned: readonly UpgradeId[], incoming: UpgradeId): boolean {
  return !isTrinketId(incoming) && isAtCap(owned);
}

export function canSalvage(owned: readonly UpgradeId[], id: UpgradeId): boolean {
  return !isTrinketId(id) && hasUpgrade(owned, baseIdOf(id));
}

export function rollTrinket(
  owned: readonly UpgradeId[],
  roster: readonly GhostKindId[] | undefined,
  rng: () => number,
): UpgradeId | null {
  const pool = TRINKET_IDS.filter((id) => trinketEligible(owned, id, roster));
  return pool.length === 0 ? null : takeRandomFrom(pool, rng);
}

export function salvageNew(
  state: RunUpgrades,
  roster: readonly GhostKindId[] | undefined,
  rng: () => number,
): SalvageResult {
  const gained = rollTrinket(state.owned, roster, rng);
  return gained === null
    ? { state, gained: null, quarters: 1 }
    : { state: grantUpgrade(state, gained), gained, quarters: 0 };
}

export function salvageUpgrade(
  state: RunUpgrades,
  id: UpgradeId,
  roster: readonly GhostKindId[] | undefined,
  rng: () => number,
): SalvageResult {
  if (!canSalvage(state.owned, id)) {
    return { state, gained: null, quarters: 0 };
  }
  const revoked = revokeUpgrade(state, id);
  return salvageNew(clearStaleUpgradeTimers(revoked.owned, revoked), roster, rng);
}
