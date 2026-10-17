import {
  parseRunLogRecord,
  RUN_LOG_PURGE_COUNT,
  runLogNeedsPurge,
  syntheticRunLog,
  type RunLogMeta,
  type RunLogRecord,
} from "../../domain/runLog";
import { freshId } from "../../domain/runRandom";
import { forgetUploaded } from "./runUploadStorage";

declare const __GAME_VERSION__: string | undefined;

export const RUN_LOG_INDEX_KEY = "pac-rogue.run-log.v1.index";
export const RUN_LOG_RUN_KEY_PREFIX = "pac-rogue.run-log.v1.run.";
export const RUN_LOG_INSTALL_ID_KEY = "pac-rogue.run-log.v1.install-id";

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
  const json = JSON.stringify(stamped);
  try {
    writeRun(storage, record.id, json);
  } catch {
    try {
      purgeOldest(storage, loadIndex(storage));
      writeRun(storage, record.id, json);
    } catch {
      return;
    }
  }
}

function purgeOldest(storage: Storage, index: string[]): string[] {
  const purged = index.slice(0, RUN_LOG_PURGE_COUNT);
  for (const id of purged) {
    storage.removeItem(runKey(id));
  }
  const kept = index.slice(RUN_LOG_PURGE_COUNT);
  storage.setItem(RUN_LOG_INDEX_KEY, JSON.stringify(kept));
  forgetUploaded(purged);
  return kept;
}

function writeRun(storage: Storage, id: string, json: string): void {
  let index = loadIndex(storage);
  const isNew = !index.includes(id);
  if (isNew && runLogNeedsPurge(index.length)) {
    index = purgeOldest(storage, index);
  }
  storage.setItem(runKey(id), json);
  if (isNew) {
    storage.setItem(RUN_LOG_INDEX_KEY, JSON.stringify([...index, id]));
  }
}

export function relabelAbandoned(): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }
  try {
    for (const id of loadIndex(storage)) {
      const record = parseRunLogRecord(storage.getItem(runKey(id)));
      if (record?.outcome === "inProgress") {
        storage.setItem(runKey(id), JSON.stringify({ ...record, outcome: "abandoned" }));
      }
    }
  } catch {
    return;
  }
}

function readRun(storage: Storage, id: string): RunLogRecord | null {
  try {
    return parseRunLogRecord(storage.getItem(runKey(id)));
  } catch {
    return null;
  }
}

export function loadAllRuns(): { runs: RunLogRecord[]; unreadable: number } {
  const storage = readStorage();
  const runs: RunLogRecord[] = [];
  let unreadable = 0;
  if (storage === null) {
    return { runs, unreadable };
  }
  for (const id of loadIndex(storage)) {
    const record = readRun(storage, id);
    if (record === null) {
      unreadable += 1;
    } else {
      runs.push(record);
    }
  }
  return { runs, unreadable };
}

export function* runsNewestFirst(skipId: (id: string) => boolean): Generator<RunLogRecord> {
  const storage = readStorage();
  if (storage === null) {
    return;
  }
  const index = loadIndex(storage);
  for (let i = index.length - 1; i >= 0; i -= 1) {
    const id = index[i]!;
    if (skipId(id)) {
      continue;
    }
    const record = readRun(storage, id);
    if (record !== null) {
      yield record;
    }
  }
}

export function storedRunCount(): number {
  const storage = readStorage();
  return storage === null ? 0 : loadIndex(storage).length;
}

export function fillSyntheticRuns(count: number): void {
  const params = new URLSearchParams();
  for (let i = 0; i < count; i += 1) {
    saveRunLog(syntheticRunLog(i, newRunLogMeta(params)));
  }
}
