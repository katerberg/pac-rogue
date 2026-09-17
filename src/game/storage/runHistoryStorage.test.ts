import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyRunHistory, RUN_HISTORY_VERSION } from "../../domain/runHistory";
import { loadRunHistory, RUN_HISTORY_STORAGE_KEY, saveRun } from "./runHistoryStorage";

function installMemoryStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
  vi.stubGlobal("localStorage", memory);
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runHistoryStorage", () => {
  it("loads empty history when storage is missing", () => {
    installMemoryStorage();
    expect(loadRunHistory()).toEqual(emptyRunHistory());
  });

  it("saves and reloads runs", () => {
    const store = installMemoryStorage();
    saveRun(42, 880, "2026-01-01T00:00:00.000Z");
    saveRun(0, 50, "2026-01-02T00:00:00.000Z");

    expect(loadRunHistory()).toEqual({
      version: RUN_HISTORY_VERSION,
      runs: [
        {
          collectedCount: 42,
          remainingTime: 880,
          recordedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          collectedCount: 0,
          remainingTime: 50,
          recordedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    });
    expect(store.get(RUN_HISTORY_STORAGE_KEY)).toContain('"collectedCount":42');
    expect(RUN_HISTORY_STORAGE_KEY).toBe("pac-rogue.run-history.v2");
  });

  it("returns empty history when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadRunHistory()).toEqual(emptyRunHistory());
    expect(() => saveRun(1, 1)).not.toThrow();
  });

  it("tolerates corrupt stored JSON", () => {
    installMemoryStorage({ [RUN_HISTORY_STORAGE_KEY]: "{broken" });
    expect(loadRunHistory()).toEqual(emptyRunHistory());
  });

  it("does not throw when setItem fails", () => {
    const store = installMemoryStorage();
    const memory = globalThis.localStorage;
    memory.setItem = () => {
      throw new Error("quota");
    };
    expect(() => saveRun(1, 1, "2026-01-01T00:00:00.000Z")).not.toThrow();
    expect(store.size).toBe(0);
  });
});
