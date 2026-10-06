import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GHOST_STYLE } from "../../domain/ghostArt";
import { GHOST_STYLE_STORAGE_KEY, loadGhostStyle, saveGhostStyle } from "./ghostStyleStorage";

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

describe("ghostStyleStorage", () => {
  it("defaults to neon when nothing is stored", () => {
    installMemoryStorage();
    expect(loadGhostStyle()).toBe(DEFAULT_GHOST_STYLE);
  });

  it("saves and reloads the style", () => {
    const store = installMemoryStorage();
    saveGhostStyle("pixel");
    expect(store.get(GHOST_STYLE_STORAGE_KEY)).toBe("pixel");
    expect(loadGhostStyle()).toBe("pixel");
  });

  it("falls back to the default for unknown values or missing storage", () => {
    installMemoryStorage({ [GHOST_STYLE_STORAGE_KEY]: "sparkly" });
    expect(loadGhostStyle()).toBe(DEFAULT_GHOST_STYLE);
    vi.stubGlobal("localStorage", undefined);
    expect(loadGhostStyle()).toBe(DEFAULT_GHOST_STYLE);
    expect(() => saveGhostStyle("pixel")).not.toThrow();
  });
});
