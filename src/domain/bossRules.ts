import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export const BOSS_IDS = ["blinkySwarm", "chainedGhosts"] as const;

export type BossId = (typeof BOSS_IDS)[number];

export type BossDef = {
  id: BossId;
  ghostKinds: readonly GhostKindId[];
  startGhosts: number;
  spawnPellets: number;
  maxHouseGhosts: number;
  tunnelCount: number | null;
  houseReleaseStaggerMs: number;
  ghostsBlock: boolean;
  chained: boolean;
};

export const BOSS_DEFS: Record<BossId, BossDef> = {
  blinkySwarm: {
    id: "blinkySwarm",
    ghostKinds: [GHOST_KIND.blinky],
    startGhosts: 2,
    spawnPellets: 8,
    maxHouseGhosts: 4,
    tunnelCount: 3,
    houseReleaseStaggerMs: 600,
    ghostsBlock: true,
    chained: false,
  },
  chainedGhosts: {
    id: "chainedGhosts",
    ghostKinds: [GHOST_KIND.blinky, GHOST_KIND.clyde],
    startGhosts: 2,
    spawnPellets: 0,
    maxHouseGhosts: 2,
    tunnelCount: null,
    houseReleaseStaggerMs: 1500,
    ghostsBlock: false,
    chained: true,
  },
};

export const BOSS_LEVEL = 9;

export function isBossLevel(levelIndex: number): boolean {
  return levelIndex === BOSS_LEVEL;
}

export function pickBoss(forced: BossId | null, roll: () => number): BossDef {
  const id = forced ?? BOSS_IDS[Math.floor(roll() * BOSS_IDS.length)]!;
  return BOSS_DEFS[id];
}

export function parseBossParam(params: URLSearchParams): BossId | null {
  const raw = params.get("boss");
  return BOSS_IDS.find((id) => id === raw) ?? null;
}

export function bossGhostKind(def: BossDef, index: number): GhostKindId {
  return def.ghostKinds[Math.min(index, def.ghostKinds.length - 1)]!;
}

export function maxBossGhosts(def: BossDef): number {
  return def.startGhosts + def.spawnPellets;
}

export function bossStartGhosts(def: BossDef, tuning: Tuning = DEFAULT_TUNING): number {
  if (def.id !== "blinkySwarm") {
    return def.startGhosts;
  }
  return Math.min(maxBossGhosts(def), Math.max(def.startGhosts, tuning.bossSwarmStartGhosts));
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

export function recordBossPelletsEaten(state: BossState, remaining: number): BossState {
  const eaten = state.bossPelletsRemaining - remaining;
  if (eaten <= 0) {
    return state;
  }
  const added = Math.max(0, Math.min(eaten, maxBossGhosts(state.def) - state.ghostCount));
  return {
    ...state,
    bossPelletsRemaining: remaining,
    ghostCount: state.ghostCount + added,
    pendingSpawns: state.pendingSpawns + added,
  };
}

export function splitBossGhosts(def: BossDef, total: number): { house: number; tunnel: number } {
  const house = Math.min(total, def.maxHouseGhosts);
  return { house, tunnel: total - house };
}
