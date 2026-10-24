import { slipstreamRemainingMs } from "./slipstream";
import { sonicHitRemainingMs } from "./sonicBoom";
import type { BaseUpgradeId, RunUpgrades } from "./upgrades";

export type UpgradeTimer = { remainingMs: number; totalMs: number };
export type UpgradeTimers = Partial<Record<BaseUpgradeId, UpgradeTimer>>;

const finite = (ms: number): number => (Number.isFinite(ms) ? ms : 0);

const TIMER_READINGS: Partial<Record<BaseUpgradeId, (state: RunUpgrades) => number>> = {
  powerPelletFreeze: (s) => s.freezeRemainingMs,
  powerPelletWallPass: (s) => s.wallPassRemainingMs,
  powerPelletInvuln: (s) => s.invulnRemainingMs,
  powerPelletSpeedBurst: (s) => s.speedBurstRemainingMs,
  powerPelletHyperspeed: (s) => s.hyperspeedRemainingMs,
  powerPelletGhostHarvester: (s) => s.ghostHarvestRemainingMs,
  powerPelletHunter: (s) => s.frightenedRemainingMs,
  powerPelletChaff: (s) => s.chaff?.remainingMs ?? 0,
  powerPelletWallDrop: (s) => finite(s.droppedWall?.remainingMs ?? 0),
  passiveDefyDeath: (s) => s.defyDeathRemainingMs,
  passiveHaunting: (s) => finite(s.hauntRemainingMs),
  passivePossession: (s) => s.possessionRemainingMs,
  passiveSonicBoom: sonicHitRemainingMs,
  passiveSlipstream: slipstreamRemainingMs,
  passiveEcho: (s) => Math.max(0, ...s.pendingEchoes.map((echo) => echo.remainingMs)),
};

export function advanceUpgradeTimers(
  prev: UpgradeTimers,
  state: RunUpgrades,
  fired: readonly BaseUpgradeId[] = [],
): { timers: UpgradeTimers; pulses: BaseUpgradeId[] } {
  const timers: UpgradeTimers = {};
  const pulses = new Set(fired);
  for (const [id, read] of Object.entries(TIMER_READINGS) as [
    BaseUpgradeId,
    (state: RunUpgrades) => number,
  ][]) {
    const remainingMs = read(state);
    if (remainingMs <= 0) {
      continue;
    }
    const was = prev[id];
    if (was === undefined || remainingMs > was.remainingMs) {
      timers[id] = { remainingMs, totalMs: remainingMs };
      pulses.add(id);
    } else {
      timers[id] = { remainingMs, totalMs: was.totalMs };
    }
  }
  return { timers, pulses: [...pulses] };
}

export function upgradeTimerFractions(
  timers: UpgradeTimers,
): Partial<Record<BaseUpgradeId, number>> {
  return Object.fromEntries(
    Object.entries(timers).map(([id, timer]) => [id, timer.remainingMs / timer.totalMs]),
  );
}
