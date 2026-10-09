import { MAX_LEVEL } from "./levelRules";
import type { RunLogRecord } from "./runLog";
import {
  BASE_UPGRADE_DEFS,
  UPGRADE_DEFS,
  type BaseUpgradeId,
  type UpgradeId,
  type UpgradeSchool,
} from "./upgrades";

export const COMPLETE_REACH = MAX_LEVEL + 1;
const LOW_SAMPLE_RUNS = 5;

export type RunScope = { includeUnfinished: boolean; includeDebug: boolean };
export type SortKey = "medianReach" | "runs" | "completeRate" | "pickRate";

type Summary = {
  runs: number;
  completeRate: number | null;
  medianReach: number | null;
  reach: number[];
  versions: string[];
  debugRuns: number;
};

export type UpgradeRow = {
  id: BaseUpgradeId;
  label: string;
  school: UpgradeSchool;
  runs: number;
  plusRuns: number;
  completeRate: number | null;
  medianReach: number | null;
  medianLevelTaken: number | null;
  reach: number[];
  offered: number;
  picked: number;
  pickRate: number | null;
  lowSample: boolean;
};

const BASE_ID_BY_ID = new Map<UpgradeId, BaseUpgradeId>(
  UPGRADE_DEFS.map((def) => [def.id, def.baseId]),
);

export function reachOf(run: RunLogRecord): number {
  if (run.outcome === "complete") {
    return COMPLETE_REACH;
  }
  return Math.min(MAX_LEVEL, Math.max(1, run.finalLevel));
}

export function formatReach(reach: number | null): string {
  if (reach === null) {
    return "—";
  }
  return reach >= COMPLETE_REACH ? "WIN" : `L${Number.isInteger(reach) ? reach : reach.toFixed(1)}`;
}

export function formatPercent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function scopedRuns(runs: readonly RunLogRecord[], scope: RunScope): RunLogRecord[] {
  return runs.filter(
    (run) =>
      (scope.includeDebug || !run.debug) &&
      (run.outcome === "death" ||
        run.outcome === "complete" ||
        (scope.includeUnfinished && (run.outcome === "quit" || run.outcome === "abandoned"))),
  );
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function reachCounts(runs: readonly RunLogRecord[]): number[] {
  const counts = new Array<number>(COMPLETE_REACH).fill(0);
  for (const run of runs) {
    counts[reachOf(run) - 1]! += 1;
  }
  return counts;
}

function completeRate(runs: readonly RunLogRecord[]): number | null {
  return runs.length === 0
    ? null
    : runs.filter((run) => run.outcome === "complete").length / runs.length;
}

export function summarize(all: readonly RunLogRecord[], scope: RunScope): Summary {
  const runs = scopedRuns(all, scope);
  return {
    runs: runs.length,
    completeRate: completeRate(runs),
    medianReach: median(runs.map(reachOf)),
    reach: reachCounts(runs),
    versions: [...new Set(runs.map((run) => run.gameVersion))].sort(),
    debugRuns: all.filter((run) => run.debug).length,
  };
}

function firstTakenLevel(run: RunLogRecord, id: BaseUpgradeId): number | null {
  const levels = run.loadout
    .filter((entry) => BASE_ID_BY_ID.get(entry.id) === id)
    .map((entry) => entry.level);
  return levels.length === 0 ? null : Math.min(...levels);
}

export function upgradeRows(all: readonly RunLogRecord[], scope: RunScope): UpgradeRow[] {
  const runs = scopedRuns(all, scope);
  return BASE_UPGRADE_DEFS.map((def) => {
    const owning = runs.filter((run) => firstTakenLevel(run, def.id) !== null);
    const plusId = `${def.id}Plus` as UpgradeId;
    let offered = 0;
    let picked = 0;
    for (const run of runs) {
      for (const level of run.levels) {
        if (level.offer?.upgrades.includes(def.id)) {
          offered += 1;
          if (level.offer.picked === def.id) {
            picked += 1;
          }
        }
      }
    }
    return {
      id: def.id,
      label: def.label,
      school: def.school,
      runs: owning.length,
      plusRuns: owning.filter((run) => run.loadout.some((entry) => entry.id === plusId)).length,
      completeRate: completeRate(owning),
      medianReach: median(owning.map(reachOf)),
      medianLevelTaken: median(owning.map((run) => firstTakenLevel(run, def.id)!)),
      reach: reachCounts(owning),
      offered,
      picked,
      pickRate: offered === 0 ? null : picked / offered,
      lowSample: owning.length < LOW_SAMPLE_RUNS,
    };
  });
}

export function sortUpgradeRows(rows: readonly UpgradeRow[], key: SortKey): UpgradeRow[] {
  const tier = (row: UpgradeRow): number => (row.runs === 0 ? 2 : row.lowSample ? 1 : 0);
  return [...rows].sort(
    (a, b) =>
      tier(a) - tier(b) ||
      (b[key] ?? -1) - (a[key] ?? -1) ||
      b.runs - a.runs ||
      a.label.localeCompare(b.label),
  );
}
