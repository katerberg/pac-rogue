export const RUN_HISTORY_VERSION = 2 as const;
export const RUN_HISTORY_MAX_RUNS = 100;

export type RunRecord = {
  collectedCount: number;
  remainingTime: number;
  recordedAt: string;
};

export type RunHistory = {
  version: typeof RUN_HISTORY_VERSION;
  runs: RunRecord[];
};

export function emptyRunHistory(): RunHistory {
  return { version: RUN_HISTORY_VERSION, runs: [] };
}

function trimRuns(runs: RunRecord[]): RunRecord[] {
  if (runs.length <= RUN_HISTORY_MAX_RUNS) {
    return runs;
  }
  return runs.slice(runs.length - RUN_HISTORY_MAX_RUNS);
}

function isRunRecord(value: unknown): value is RunRecord {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.collectedCount === "number" &&
    Number.isFinite(row.collectedCount) &&
    typeof row.remainingTime === "number" &&
    Number.isFinite(row.remainingTime) &&
    typeof row.recordedAt === "string"
  );
}

export function parseRunHistory(raw: string | null): RunHistory {
  if (raw === null || raw === "") {
    return emptyRunHistory();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return emptyRunHistory();
    }
    const payload = parsed as Record<string, unknown>;
    if (payload.version !== RUN_HISTORY_VERSION || !Array.isArray(payload.runs)) {
      return emptyRunHistory();
    }
    if (!payload.runs.every(isRunRecord)) {
      return emptyRunHistory();
    }
    return {
      version: RUN_HISTORY_VERSION,
      runs: trimRuns(
        payload.runs.map((run) => ({
          collectedCount: run.collectedCount,
          remainingTime: run.remainingTime,
          recordedAt: run.recordedAt,
        })),
      ),
    };
  } catch {
    return emptyRunHistory();
  }
}

export function serializeRunHistory(history: RunHistory): string {
  return JSON.stringify(history);
}

export function appendRun(
  history: RunHistory,
  collectedCount: number,
  remainingTime: number,
  recordedAt: string,
): RunHistory {
  return {
    version: RUN_HISTORY_VERSION,
    runs: trimRuns([...history.runs, { collectedCount, remainingTime, recordedAt }]),
  };
}
