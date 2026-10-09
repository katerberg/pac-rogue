import type { FruitKind } from "./fruit";
import type { GHOST_KIND } from "./ghostKind";
import type { StorePurchase } from "./store";
import { ALL_UPGRADE_IDS, type BaseUpgradeId, type UpgradeId } from "./upgrades";

export const RUN_LOG_VERSION = 1 as const;
export const RUN_LOG_SOFT_CAP = 500;
export const RUN_LOG_PURGE_COUNT = 10;
export const NEAR_MISS_COOLDOWN_MS = 1000;
export const HITCH_FRAME_MS = 50;
export const HITCH_WINDOW_MS = 1000;
export const LAST_PELLETS_COUNT = 10;

export type RunOutcome = "inProgress" | "death" | "complete" | "quit" | "abandoned";
export type UpgradeSource = "start" | "offer" | "store" | "enhance" | "flag";
export type PowerPelletSource = "player" | "tunnelDash" | "ghostHarvest" | "fruit";
export type ActivationKind =
  | "freeze"
  | "recall"
  | "scatterBurst"
  | "warp"
  | "wallPass"
  | "invuln"
  | "speedBurst"
  | "ghostHarvest"
  | "defyDeath"
  | "collectExtra"
  | "pelletSurge"
  | "shieldBreak"
  | "streakEngine"
  | "echo"
  | "frighten"
  | "ghostEaten";
export type TimedEffect = "freeze" | "invuln" | "wallPass" | "speedBurst" | "ghostHarvest";
export type QuarterSource =
  "fruit" | "bonusBar" | "deathsBounty" | "nearMiss" | "offer" | "interest" | "hunter";
export type GhostName = keyof typeof GHOST_KIND;

export type RunLogMeta = {
  id: string;
  installId: string;
  gameVersion: string;
  startedAt: string;
  params: Record<string, string>;
};

export const TEST_RUN_LOG_META: RunLogMeta = {
  id: "test",
  installId: "test",
  gameVersion: "test",
  startedAt: "1970-01-01T00:00:00.000Z",
  params: {},
};

export type PaceMark = { simMs: number; countdown: number };
export type PaceKey = "p25" | "p50" | "p75" | "p100";

export type DeathLog = {
  simMs: number;
  col: number;
  row: number;
  ghost: GhostName | null;
  bossGhost: boolean;
  countdown: number;
  pelletsLeft: number;
  ghostMode: string;
  elroyTier: number;
  ghostsOut: number;
  livesAfter: number;
  defied: boolean;
  moneyTalks: boolean;
  bountyPaid: boolean;
  harvested: number;
  maxFrameMsLastSecond: number;
};

export type FruitLog = { kind: FruitKind; spawnedMs: number; eatenMs: number | null };

export type OfferLog = {
  upgrades: BaseUpgradeId[];
  quarters: number;
  picked: BaseUpgradeId | "quarters" | null;
  choiceMs: number | null;
};

export type LevelLog = {
  level: number;
  layout: string;
  inverted: boolean;
  boss: boolean;
  cleared: boolean;
  simMs: number;
  firstMoveMs: number | null;
  countdownStart: number;
  countdownEnd: number | null;
  timeBonusPoints: number;
  pelletsCollected: number;
  lastPelletsMs: number | null;
  pace: Record<PaceKey, PaceMark | null>;
  livesStart: number;
  livesEnd: number | null;
  livesRegenerated: number;
  livesMax: number;
  deaths: DeathLog[];
  tunnelWraps: number;
  tunnelDashes: number;
  nearMisses: number;
  tilesTraveled: number;
  idleMs: number;
  pausedMs: number;
  pauseCount: number;
  hiddenMs: number;
  maxFrameMs: number;
  hitchFrames: number;
  powerPellets: Record<PowerPelletSource, number>;
  activations: Partial<Record<ActivationKind, number>>;
  activeMs: Partial<Record<TimedEffect, number>>;
  targets: {
    freeze: GhostName[];
    recall: GhostName[];
    warpTiles: number[];
    scatterGhosts: number[];
  };
  fruit: FruitLog[];
  quartersEarned: Partial<Record<QuarterSource, number>>;
  bonusMaxTier: number;
  bonusFills: number;
  turnTuning: { perfect: number; close: number };
  offer: OfferLog | null;
};

export type StoreVisitLog = {
  afterLevel: number;
  quartersIn: number;
  quartersOut: number | null;
  stock: string[];
  purchases: StorePurchase[];
  simMs: number;
};

export type LoadoutEntry = {
  id: UpgradeId;
  source: UpgradeSource;
  level: number;
  removedLevel?: number;
};

export type RunLogRecord = RunLogMeta & {
  version: typeof RUN_LOG_VERSION;
  endedAt: string | null;
  outcome: RunOutcome;
  debug: boolean;
  seed: string;
  finalLevel: number;
  pelletsCollected: number;
  quartersUnspent: number;
  livesMax: number;
  loadout: LoadoutEntry[];
  levels: LevelLog[];
  storeVisits: StoreVisitLog[];
};

export type LevelLogInit = Pick<
  LevelLog,
  "level" | "layout" | "inverted" | "boss" | "countdownStart" | "livesStart"
>;

export function createRunLog(meta: RunLogMeta, seed: string, debug: boolean): RunLogRecord {
  return {
    ...meta,
    params: { ...meta.params },
    version: RUN_LOG_VERSION,
    endedAt: null,
    outcome: "inProgress",
    debug,
    seed,
    finalLevel: 0,
    pelletsCollected: 0,
    quartersUnspent: 0,
    livesMax: 0,
    loadout: [],
    levels: [],
    storeVisits: [],
  };
}

export function beginLevelLog(record: RunLogRecord, init: LevelLogInit): LevelLog {
  const level: LevelLog = {
    ...init,
    cleared: false,
    simMs: 0,
    firstMoveMs: null,
    countdownEnd: null,
    timeBonusPoints: 0,
    pelletsCollected: 0,
    lastPelletsMs: null,
    pace: { p25: null, p50: null, p75: null, p100: null },
    livesEnd: null,
    livesRegenerated: 0,
    livesMax: init.livesStart,
    deaths: [],
    tunnelWraps: 0,
    tunnelDashes: 0,
    nearMisses: 0,
    tilesTraveled: 0,
    idleMs: 0,
    pausedMs: 0,
    pauseCount: 0,
    hiddenMs: 0,
    maxFrameMs: 0,
    hitchFrames: 0,
    powerPellets: { player: 0, tunnelDash: 0, ghostHarvest: 0, fruit: 0 },
    activations: {},
    activeMs: {},
    targets: { freeze: [], recall: [], warpTiles: [], scatterGhosts: [] },
    fruit: [],
    quartersEarned: {},
    bonusMaxTier: 0,
    bonusFills: 0,
    turnTuning: { perfect: 0, close: 0 },
    offer: null,
  };
  record.levels.push(level);
  record.finalLevel = init.level;
  return level;
}

const PACE_STEPS: readonly (readonly [PaceKey, number])[] = [
  ["p25", 0.25],
  ["p50", 0.5],
  ["p75", 0.75],
  ["p100", 1],
];

export function notePace(
  level: LevelLog,
  collected: number,
  total: number,
  simMs: number,
  countdown: number,
): void {
  if (total <= 0) {
    return;
  }
  for (const [key, fraction] of PACE_STEPS) {
    if (level.pace[key] === null && collected / total >= fraction) {
      level.pace[key] = { simMs, countdown };
    }
  }
}

export function addCount<K extends string>(
  counts: Partial<Record<K, number>>,
  key: K,
  amount = 1,
): void {
  counts[key] = (counts[key] ?? 0) + amount;
}

export function addLoadout(
  record: RunLogRecord,
  id: UpgradeId,
  source: UpgradeSource,
  level: number,
): void {
  record.loadout.push({ id, source, level });
}

export function removeLoadout(record: RunLogRecord, id: UpgradeId, level: number): void {
  for (let i = record.loadout.length - 1; i >= 0; i -= 1) {
    const entry = record.loadout[i]!;
    if (entry.id === id && entry.removedLevel === undefined) {
      entry.removedLevel = level;
      return;
    }
  }
}

export function finishRun(
  record: RunLogRecord,
  outcome: Exclude<RunOutcome, "inProgress">,
): boolean {
  if (record.outcome !== "inProgress") {
    return false;
  }
  record.outcome = outcome;
  return true;
}

export function didWrap(prev: number, next: number, span: number): boolean {
  return Math.abs(next - prev) > span / 2;
}

export function isNearMiss(distancePx: number, tileSize: number): boolean {
  return distancePx <= tileSize;
}

export function runLogOverrun(storedCount: number, quotaFailed: boolean): boolean {
  return storedCount >= RUN_LOG_SOFT_CAP || quotaFailed;
}

const OUTCOMES: readonly RunOutcome[] = ["inProgress", "death", "complete", "quit", "abandoned"];

export function parseRunLogRecord(raw: string | null): RunLogRecord | null {
  if (raw === null || raw === "") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    const row = parsed as Record<string, unknown>;
    const valid =
      row.version === RUN_LOG_VERSION &&
      typeof row.id === "string" &&
      typeof row.startedAt === "string" &&
      typeof row.outcome === "string" &&
      OUTCOMES.includes(row.outcome as RunOutcome) &&
      typeof row.debug === "boolean" &&
      Array.isArray(row.levels) &&
      Array.isArray(row.loadout) &&
      Array.isArray(row.storeVisits);
    return valid ? (parsed as RunLogRecord) : null;
  } catch {
    return null;
  }
}

export function syntheticRunLog(index: number, meta: RunLogMeta): RunLogRecord {
  const record = createRunLog(meta, `fill${index}`, true);
  const ids = ALL_UPGRADE_IDS;
  const first = index % ids.length;
  const finalLevel = 1 + (((first % 7) + Math.floor(index / ids.length) * 2 + (index % 3)) % 9);
  for (let level = 1; level <= finalLevel; level += 1) {
    const log = beginLevelLog(record, {
      level,
      layout: "maze1",
      inverted: false,
      boss: false,
      countdownStart: 0,
      livesStart: 0,
    });
    const offered = [0, 1, 2].map((k) => ids[(first + level * 3 + k) % ids.length]!);
    log.offer = { upgrades: offered, quarters: 1, picked: offered[0]!, choiceMs: 0 };
  }
  for (const [k, id] of [ids[first]!, ids[(first + 11) % ids.length]!].entries()) {
    addLoadout(record, id, k === 0 ? "start" : "offer", 1 + k);
  }
  record.outcome = finalLevel === 9 && index % 2 === 0 ? "complete" : "death";
  return record;
}
