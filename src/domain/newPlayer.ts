import type { BaseUpgradeId } from "./upgrades";

export const FIRST_PLAY_STARTING_UPGRADE: BaseUpgradeId = "powerPelletFreeze";

export function preferredStartingUpgrade(storedRunCount: number): BaseUpgradeId | null {
  return storedRunCount === 0 ? FIRST_PLAY_STARTING_UPGRADE : null;
}
