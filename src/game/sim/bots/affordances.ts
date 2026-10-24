import {
  applyPowerPelletEffects,
  createRunUpgrades,
  hyperspeedMultiplier,
  powerPelletPickupFires,
  shieldPelletsCap,
  speedBurstMultiplier,
  type UpgradeId,
} from "../../../domain/upgrades";

export const HYPERSPEED_PLANNING_MUL = 1;

export type PowerPelletAffordance = {
  frightSteps: number;
  invulnSteps: number;
  freezeSteps: number;
  speedMul: number;
  speedSteps: number;
  warp: boolean;
  recall: number;
  cornerTeleport: boolean;
  extraPellets: number;
  shieldGain: number;
};

export function powerPelletAffordance(
  owned: readonly UpgradeId[],
  level: number,
  stepMs: number,
): PowerPelletAffordance | null {
  if (owned.length === 0) {
    return null;
  }
  const shieldGain = shieldPelletsCap(owned) === null ? 0 : 1;
  const steps = (ms: number) => ms / stepMs;
  if (powerPelletPickupFires(owned, 1, 0) === 0) {
    return {
      frightSteps: 0,
      invulnSteps: 0,
      freezeSteps: 0,
      speedMul: 1,
      speedSteps: 0,
      warp: false,
      recall: 0,
      cornerTeleport: false,
      extraPellets: 0,
      shieldGain,
    };
  }
  const result = applyPowerPelletEffects(createRunUpgrades(owned), 1, undefined, level);
  const after = result.state;
  const hyperspeed = after.hyperspeedRemainingMs > 0;
  return {
    frightSteps: result.frightenGhosts ? steps(after.frightenedRemainingMs) : 0,
    invulnSteps: steps(after.invulnRemainingMs),
    freezeSteps: result.freezeClosestMs === null ? 0 : steps(result.freezeClosestMs),
    speedMul: hyperspeed
      ? Math.min(hyperspeedMultiplier(owned), HYPERSPEED_PLANNING_MUL)
      : after.speedBurstRemainingMs > 0
        ? speedBurstMultiplier(owned)
        : 1,
    speedSteps: steps(hyperspeed ? after.hyperspeedRemainingMs : after.speedBurstRemainingMs),
    warp: result.warpPlayerFarthest,
    recall: result.recallGhostCount,
    cornerTeleport: result.cornerTeleportHoldMs !== null,
    extraPellets: result.collectExtraPellets,
    shieldGain,
  };
}
