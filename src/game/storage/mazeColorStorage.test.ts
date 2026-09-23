import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAZE_COLOR_SETTINGS_VERSION,
  defaultMazeColorSettings,
} from "../../domain/mazeColorSettings";
import {
  MAZE_COLOR_STORAGE_KEY,
  loadMazeColorSettings,
  saveMazeColorSettings,
} from "./mazeColorStorage";

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

describe("mazeColorStorage", () => {
  it("loads defaults when storage is missing", () => {
    installMemoryStorage();
    expect(loadMazeColorSettings()).toEqual(defaultMazeColorSettings());
  });

  it("saves and reloads settings", () => {
    const store = installMemoryStorage();
    const settings = { version: MAZE_COLOR_SETTINGS_VERSION, colorIndex: 2 };
    saveMazeColorSettings(settings);
    expect(loadMazeColorSettings()).toEqual(settings);
    expect(store.get(MAZE_COLOR_STORAGE_KEY)).toContain('"colorIndex":2');
  });

  it("returns defaults when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadMazeColorSettings()).toEqual(defaultMazeColorSettings());
    expect(() => saveMazeColorSettings(defaultMazeColorSettings())).not.toThrow();
  });

  it("tolerates corrupt stored JSON", () => {
    installMemoryStorage({ [MAZE_COLOR_STORAGE_KEY]: "{broken" });
    expect(loadMazeColorSettings()).toEqual(defaultMazeColorSettings());
  });

  it("does not throw when setItem fails", () => {
    const store = installMemoryStorage();
    const memory = globalThis.localStorage;
    memory.setItem = () => {
      throw new Error("quota");
    };
    expect(() => saveMazeColorSettings(defaultMazeColorSettings())).not.toThrow();
    expect(store.size).toBe(0);
  });
});
