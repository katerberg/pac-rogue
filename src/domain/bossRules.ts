import { GHOST_KIND, type GhostKindId } from "./ghostKind";

export type BossId = "doubleBlinky";

export type BossDef = {
  id: BossId;
  ghostKind: GhostKindId;
  startGhosts: number;
  spawnPellets: number;
  maxHouseGhosts: number;
  tunnelCount: number;
  houseReleaseStaggerMs: number;
};

export const BOSS_DEFS: Record<BossId, BossDef> = {
  doubleBlinky: {
    id: "doubleBlinky",
    ghostKind: GHOST_KIND.blinky,
    startGhosts: 2,
    spawnPellets: 8,
    maxHouseGhosts: 4,
    tunnelCount: 3,
    houseReleaseStaggerMs: 600,
  },
};

const BOSS_BY_LEVEL: Partial<Record<number, BossId>> = { 9: "doubleBlinky" };

export function bossForLevel(levelIndex: number): BossDef | null {
  const id = BOSS_BY_LEVEL[levelIndex];
  return id === undefined ? null : BOSS_DEFS[id];
}

export function maxBossGhosts(def: BossDef): number {
  return def.startGhosts + def.spawnPellets;
}

export type BossState = {
  def: BossDef;
  ghostCount: number;
  pendingSpawns: number;
  nextMouthIndex: number;
  bossPelletsRemaining: number;
};

export function createBossState(def: BossDef, ghostCount: number): BossState {
  return { def, ghostCount, pendingSpawns: 0, nextMouthIndex: 0, bossPelletsRemaining: 0 };
}

// Returns how many ghosts go into the house (seat order) and how many queue for tunnels.
export function splitBossGhosts(def: BossDef, total: number): { house: number; tunnel: number } {
  const house = Math.min(total, def.maxHouseGhosts);
  return { house, tunnel: total - house };
}

export function parseBossGhostsParam(params: URLSearchParams, def: BossDef): number | null {
  const raw = params.get("bossGhosts");
  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  if (value < def.startGhosts || value > maxBossGhosts(def)) {
    return null;
  }
  return value;
}
