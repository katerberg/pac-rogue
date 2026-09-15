import {
  appendRun,
  emptyRunHistory,
  parseRunHistory,
  serializeRunHistory,
  type RunHistory,
} from "../../domain/runHistory";

export const RUN_HISTORY_STORAGE_KEY = "pac-rogue.run-history.v1";

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

export function saveSuccessfulRun(
  score: number,
  clearedAt: string = new Date().toISOString(),
): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }

  try {
    const next = appendRun(loadRunHistory(), score, clearedAt);
    storage.setItem(RUN_HISTORY_STORAGE_KEY, serializeRunHistory(next));
  } catch {
    return;
  }
}
