import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRunLog,
  RUN_LOG_PURGE_COUNT,
  TEST_RUN_LOG_META,
  type RunLogRecord,
} from "../../domain/runLog";
import {
  fillSyntheticRuns,
  getInstallId,
  loadAllRuns,
  newRunLogMeta,
  purgeOldestRuns,
  relabelAbandoned,
  RUN_LOG_INDEX_KEY,
  RUN_LOG_INSTALL_ID_KEY,
  RUN_LOG_RUN_KEY_PREFIX,
  runLogOverrunActive,
  saveRunLog,
  storedRunCount,
} from "./runLogStorage";

function installMemoryStorage(options: { failWrites?: boolean } = {}) {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      if (options.failWrites === true) {
        throw new DOMException("full", "QuotaExceededError");
      }
      store.set(key, value);
    },
  };
  vi.stubGlobal("localStorage", memory);
  return store;
}

function recordWith(id: string, outcome: RunLogRecord["outcome"] = "inProgress"): RunLogRecord {
  return { ...createRunLog({ ...TEST_RUN_LOG_META, id }, "seed", false), outcome };
}

function stored(store: Map<string, string>, id: string): RunLogRecord {
  return JSON.parse(store.get(`${RUN_LOG_RUN_KEY_PREFIX}${id}`)!) as RunLogRecord;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runLogStorage", () => {
  it("saves each run under its own key and indexes it once", () => {
    const store = installMemoryStorage();
    saveRunLog(recordWith("a"));
    saveRunLog(recordWith("a"));
    saveRunLog(recordWith("b"));
    expect(JSON.parse(store.get(RUN_LOG_INDEX_KEY)!)).toEqual(["a", "b"]);
    expect(stored(store, "a").id).toBe("a");
    expect(storedRunCount()).toBe(2);
  });

  it("stamps endedAt only once the run has an outcome", () => {
    const store = installMemoryStorage();
    saveRunLog(recordWith("a"));
    expect(stored(store, "a").endedAt).toBeNull();
    saveRunLog(recordWith("a", "death"));
    expect(stored(store, "a").endedAt).toEqual(expect.any(String));
  });

  it("relabels in-progress runs as abandoned and leaves finished and corrupt ones alone", () => {
    const store = installMemoryStorage();
    saveRunLog(recordWith("old"));
    saveRunLog(recordWith("done", "quit"));
    store.set(RUN_LOG_INDEX_KEY, JSON.stringify(["old", "done", "corrupt"]));
    store.set(`${RUN_LOG_RUN_KEY_PREFIX}corrupt`, "{oops");
    relabelAbandoned();
    expect(stored(store, "old").outcome).toBe("abandoned");
    expect(stored(store, "done").outcome).toBe("quit");
    expect(store.get(`${RUN_LOG_RUN_KEY_PREFIX}corrupt`)).toBe("{oops");
  });

  it("overruns at 500 runs and purges exactly the oldest ten", () => {
    const store = installMemoryStorage();
    fillSyntheticRuns(505);
    expect(runLogOverrunActive()).toBe(true);
    const index = JSON.parse(store.get(RUN_LOG_INDEX_KEY)!) as string[];
    purgeOldestRuns();
    expect(storedRunCount()).toBe(505 - RUN_LOG_PURGE_COUNT);
    expect(runLogOverrunActive()).toBe(false);
    for (const id of index.slice(0, RUN_LOG_PURGE_COUNT)) {
      expect(store.has(`${RUN_LOG_RUN_KEY_PREFIX}${id}`)).toBe(false);
    }
    expect(store.has(`${RUN_LOG_RUN_KEY_PREFIX}${index[RUN_LOG_PURGE_COUNT]}`)).toBe(true);
  });

  it("overruns after a failed save until a purge", () => {
    installMemoryStorage({ failWrites: true });
    saveRunLog(recordWith("a"));
    expect(runLogOverrunActive()).toBe(true);
    installMemoryStorage();
    purgeOldestRuns();
    expect(runLogOverrunActive()).toBe(false);
  });

  it("keeps one install id and fills meta from the URL params", () => {
    const store = installMemoryStorage();
    const id = getInstallId();
    expect(getInstallId()).toBe(id);
    expect(store.get(RUN_LOG_INSTALL_ID_KEY)).toBe(id);
    const meta = newRunLogMeta(new URLSearchParams("seed=abc&godMode=1"));
    expect(meta).toMatchObject({
      installId: id,
      gameVersion: "unknown",
      params: { seed: "abc", godMode: "1" },
    });
    expect(meta.id).not.toBe(newRunLogMeta(new URLSearchParams()).id);
  });

  it("loads every readable run in index order and counts the unreadable ones", () => {
    const store = installMemoryStorage();
    saveRunLog(recordWith("a", "death"));
    saveRunLog(recordWith("b", "complete"));
    store.set(RUN_LOG_INDEX_KEY, JSON.stringify(["a", "corrupt", "b", "missing"]));
    store.set(`${RUN_LOG_RUN_KEY_PREFIX}corrupt`, "{oops");
    const { runs, unreadable } = loadAllRuns();
    expect(runs.map((run) => run.id)).toEqual(["a", "b"]);
    expect(unreadable).toBe(2);
  });

  it("does nothing without localStorage", () => {
    vi.stubGlobal("localStorage", undefined);
    saveRunLog(recordWith("a"));
    purgeOldestRuns();
    expect(storedRunCount()).toBe(0);
    expect(loadAllRuns()).toEqual({ runs: [], unreadable: 0 });
  });
});
