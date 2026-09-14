export const RUN_HISTORY_VERSION = 1 as const;

export type RunRecord = {
  score: number;
  clearedAt: string;
};

export type RunHistory = {
  version: typeof RUN_HISTORY_VERSION;
  runs: RunRecord[];
};

export function emptyRunHistory(): RunHistory {
  return { version: RUN_HISTORY_VERSION, runs: [] };
}

function isRunRecord(value: unknown): value is RunRecord {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.score === "number" && Number.isFinite(row.score) && typeof row.clearedAt === "string"
  );
}

/** Parse stored JSON; corrupt / wrong-version payloads become an empty history. */
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
      runs: payload.runs.map((run) => ({
        score: run.score,
        clearedAt: run.clearedAt,
      })),
    };
  } catch {
    return emptyRunHistory();
  }
}

export function serializeRunHistory(history: RunHistory): string {
  return JSON.stringify(history);
}

/** Append a successful run; newest is last. */
export function appendRun(history: RunHistory, score: number, clearedAt: string): RunHistory {
  return {
    version: RUN_HISTORY_VERSION,
    runs: [...history.runs, { score, clearedAt }],
  };
}
