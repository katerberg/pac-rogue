import {
  appendRun,
  emptyRunHistory,
  parseRunHistory,
  serializeRunHistory,
  type RunHistory,
} from "../../domain/runHistory";

export const RUN_HISTORY_STORAGE_KEY = "pac-rogue.run-history.v2";

function readStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    return localStorage;
  } catch {
    return null;
  }
}

export function loadRunHistory(): RunHistory {
  const storage = readStorage();
  if (storage === null) {
    return emptyRunHistory();
  }

  try {
    return parseRunHistory(storage.getItem(RUN_HISTORY_STORAGE_KEY));
  } catch {
    return emptyRunHistory();
  }
}

export function saveRun(
  collectedCount: number,
  remainingTime: number,
  recordedAt: string = new Date().toISOString(),
): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }

  try {
    const next = appendRun(loadRunHistory(), collectedCount, remainingTime, recordedAt);
    storage.setItem(RUN_HISTORY_STORAGE_KEY, serializeRunHistory(next));
  } catch {
    return;
  }
}
