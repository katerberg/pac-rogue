import type { UpgradeId } from "./upgrades";
import {
  hasUpgrade,
  martyrFiresOnSave,
  POSSESSION_HAUNT_MS,
  POSSESSION_MS,
  possessionDurationMs,
} from "./upgrades";

export { POSSESSION_HAUNT_MS, POSSESSION_MS };

export function martyrOwned(owned: readonly UpgradeId[]): boolean {
  return hasUpgrade(owned, "passiveMartyr");
}

/** Martyr fires on a real life loss, and on soft saves when enhanced. Skipped for infiniteLives. */
export function shouldFireMartyr(
  owned: readonly UpgradeId[],
  opts: { infiniteLives: boolean; lifeLost: boolean; saved: boolean },
): boolean {
  if (opts.infiniteLives || !martyrOwned(owned)) {
    return false;
  }
  return opts.lifeLost || (opts.saved && martyrFiresOnSave(owned));
}

/** Possession needs a catching ghost, a real life loss, and no lava / infiniteLives. */
export function shouldStartPossession(
  owned: readonly UpgradeId[],
  opts: {
    infiniteLives: boolean;
    lifeLost: boolean;
    lava: boolean;
    caughtBy: number | null;
  },
): boolean {
  return (
    !opts.infiniteLives &&
    opts.lifeLost &&
    !opts.lava &&
    opts.caughtBy !== null &&
    possessionDurationMs(owned) !== null
  );
}

/** Undo the life lost when Martyr/Possession clears the board. */
export function lifeAfterDeathClear(livesBeforeCatch: number): number {
  return Math.max(1, livesBeforeCatch);
}
