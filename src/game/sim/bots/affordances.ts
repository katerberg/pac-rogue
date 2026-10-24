import {
  applyPowerPelletEffects,
  createRunUpgrades,
  powerPelletPickupFires,
  shieldBankCap,
  shieldBreakOwned,
  shieldPelletsCap,
  speedBurstMultiplier,
  type UpgradeId,
} from "../../../domain/upgrades";
import { WARP_GLIDE_MS } from "../../../domain/warpGlide";

export type PowerPelletEffects = {
  frightSteps: number;
  invulnSteps: number;
  freezeSteps: number;
  speedMul: number;
  speedSteps: number;
  warp: boolean;
  recall: number;
  cornerHoldSteps: number;
  extraPellets: number;
};

export type PowerPelletAffordance = PowerPelletEffects & {
  firesOnPickup: boolean;
  firesOnBreak: boolean;
  shieldGain: number;
  shieldCap: number;
};

export function powerPelletAffordance(
  owned: readonly UpgradeId[],
  level: number,
  stepMs: number,
  shields: number,
): PowerPelletAffordance | null {
  if (owned.length === 0) {
    return null;
  }
  const banks = shieldPelletsCap(owned) !== null;
  const shieldCap = shieldBankCap(owned);
  const overflow = banks ? Math.max(0, shields + 1 - shieldCap) : 0;
  const steps = (ms: number) => ms / stepMs;
  const result = applyPowerPelletEffects(createRunUpgrades(owned), 1, undefined, level);
  const after = result.state;
  return {
    frightSteps: result.frightenGhosts ? steps(after.frightenedRemainingMs) : 0,
    invulnSteps: steps(after.invulnRemainingMs),
    freezeSteps: result.freezeClosestMs === null ? 0 : steps(result.freezeClosestMs),
    speedMul: after.speedBurstRemainingMs > 0 ? speedBurstMultiplier(owned) : 1,
    speedSteps: steps(after.speedBurstRemainingMs),
    warp: result.warpPlayerFarthest,
    recall: result.recallGhostCount,
    cornerHoldSteps:
      result.cornerTeleportHoldMs === null ? 0 : steps(result.cornerTeleportHoldMs + WARP_GLIDE_MS),
    extraPellets: result.collectExtraPellets,
    firesOnPickup: powerPelletPickupFires(owned, 1, overflow) > 0,
    firesOnBreak: shieldBreakOwned(owned),
    shieldGain: banks ? 1 : 0,
    shieldCap,
  };
}
