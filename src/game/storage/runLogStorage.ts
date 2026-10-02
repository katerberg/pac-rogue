import {
  parseRunLogRecord,
  RUN_LOG_PURGE_COUNT,
  runLogOverrun,
  syntheticRunLog,
  type RunLogMeta,
  type RunLogRecord,
} from "../../domain/runLog";
import { freshId } from "../../domain/runRandom";

declare const __GAME_VERSION__: string | undefined;

export const RUN_LOG_INDEX_KEY = "pac-rogue.run-log.v1.index";
export const RUN_LOG_RUN_KEY_PREFIX = "pac-rogue.run-log.v1.run.";
export const RUN_LOG_INSTALL_ID_KEY = "pac-rogue.run-log.v1.install-id";

let quotaFailed = false;

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

function runKey(id: string): string {
  return `${RUN_LOG_RUN_KEY_PREFIX}${id}`;
}

function loadIndex(storage: Storage): string[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(RUN_LOG_INDEX_KEY) ?? "[]");
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string") ? parsed : [];
  } catch {
    return [];
  }
}

function gameVersion(): string {
  return typeof __GAME_VERSION__ === "string" ? __GAME_VERSION__ : "unknown";
}

export function getInstallId(): string {
  const storage = readStorage();
  try {
    const existing = storage?.getItem(RUN_LOG_INSTALL_ID_KEY);
    if (existing) {
      return existing;
    }
    const id = freshId();
    storage?.setItem(RUN_LOG_INSTALL_ID_KEY, id);
    return id;
  } catch {
    return "unknown";
  }
}

export function newRunLogMeta(params: URLSearchParams): RunLogMeta {
  return {
    id: freshId(),
    installId: getInstallId(),
    gameVersion: gameVersion(),
    startedAt: new Date().toISOString(),
    params: Object.fromEntries(params.entries()),
  };
}

export function saveRunLog(record: RunLogRecord): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }
  const stamped =
    record.outcome !== "inProgress" && record.endedAt === null
      ? { ...record, endedAt: new Date().toISOString() }
      : record;
  try {
    storage.setItem(runKey(record.id), JSON.stringify(stamped));
    const index = loadIndex(storage);
    if (!index.includes(record.id)) {
      storage.setItem(RUN_LOG_INDEX_KEY, JSON.stringify([...index, record.id]));
    }
  } catch {
    quotaFailed = true;
  }
}

export function relabelAbandoned(exceptId: string | null): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }
  try {
    for (const id of loadIndex(storage)) {
      if (id === exceptId) {
        continue;
      }
      const record = parseRunLogRecord(storage.getItem(runKey(id)));
      if (record?.outcome === "inProgress") {
        storage.setItem(runKey(id), JSON.stringify({ ...record, outcome: "abandoned" }));
      }
    }
  } catch {
    return;
  }
}

export function storedRunCount(): number {
  const storage = readStorage();
  return storage === null ? 0 : loadIndex(storage).length;
}

export function runLogOverrunActive(): boolean {
  return runLogOverrun(storedRunCount(), quotaFailed);
}

export function purgeOldestRuns(): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }
  try {
    const index = loadIndex(storage);
    for (const id of index.slice(0, RUN_LOG_PURGE_COUNT)) {
      storage.removeItem(runKey(id));
    }
    storage.setItem(RUN_LOG_INDEX_KEY, JSON.stringify(index.slice(RUN_LOG_PURGE_COUNT)));
    quotaFailed = false;
  } catch {
    return;
  }
}

export function fillSyntheticRuns(count: number): void {
  const params = new URLSearchParams();
  for (let i = 0; i < count; i += 1) {
    saveRunLog(syntheticRunLog(i, newRunLogMeta(params)));
  }
}
