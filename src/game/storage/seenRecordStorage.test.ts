import { afterEach, describe, expect, it, vi } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import { emptySeenRecord } from "../../domain/seenRecord";
import { SEEN_RECORD_STORAGE_KEY, loadSeenRecord, saveSeenRecord } from "./seenRecordStorage";

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

describe("seenRecordStorage", () => {
  it("loads empty when nothing is stored", () => {
    installMemoryStorage();
    expect(loadSeenRecord()).toEqual(emptySeenRecord());
  });

  it("saves and reloads the record", () => {
    const store = installMemoryStorage();
    const record = {
      ghosts: [GHOST_KIND.blinky, GHOST_KIND.pinky],
      corruptions: ["slimeTrail" as const],
      upgrades: ["passivePlayerSpeedUp" as const],
    };
    saveSeenRecord(record);
    expect(loadSeenRecord()).toEqual(record);
    expect(store.has(SEEN_RECORD_STORAGE_KEY)).toBe(true);
  });

  it("returns empty when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadSeenRecord()).toEqual(emptySeenRecord());
    expect(() => saveSeenRecord(emptySeenRecord())).not.toThrow();
  });

  it("tolerates corrupt stored JSON", () => {
    installMemoryStorage({ [SEEN_RECORD_STORAGE_KEY]: "{broken" });
    expect(loadSeenRecord()).toEqual(emptySeenRecord());
  });

  it("does not throw when setItem fails", () => {
    const store = installMemoryStorage();
    globalThis.localStorage.setItem = () => {
      throw new Error("quota");
    };
    expect(() => saveSeenRecord(emptySeenRecord())).not.toThrow();
    expect(store.size).toBe(0);
  });
});
