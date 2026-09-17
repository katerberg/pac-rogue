import { afterEach, describe, expect, it, vi } from "vitest";
import { AUDIO_SETTINGS_VERSION, defaultAudioSettings } from "../../domain/audioSettings";
import {
  AUDIO_SETTINGS_STORAGE_KEY,
  loadAudioSettings,
  saveAudioSettings,
} from "./audioSettingsStorage";

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

describe("audioSettingsStorage", () => {
  it("loads defaults when storage is missing", () => {
    installMemoryStorage();
    expect(loadAudioSettings()).toEqual(defaultAudioSettings());
  });

  it("saves and reloads settings", () => {
    const store = installMemoryStorage();
    const settings = {
      version: AUDIO_SETTINGS_VERSION,
      musicEnabled: false,
      musicLevel: 4,
      sfxEnabled: true,
      sfxLevel: 8,
    };
    saveAudioSettings(settings);
    expect(loadAudioSettings()).toEqual(settings);
    expect(store.get(AUDIO_SETTINGS_STORAGE_KEY)).toContain('"musicLevel":4');
  });

  it("returns defaults when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadAudioSettings()).toEqual(defaultAudioSettings());
    expect(() => saveAudioSettings(defaultAudioSettings())).not.toThrow();
  });

  it("tolerates corrupt stored JSON", () => {
    installMemoryStorage({ [AUDIO_SETTINGS_STORAGE_KEY]: "{broken" });
    expect(loadAudioSettings()).toEqual(defaultAudioSettings());
  });

  it("does not throw when setItem fails", () => {
    const store = installMemoryStorage();
    const memory = globalThis.localStorage;
    memory.setItem = () => {
      throw new Error("quota");
    };
    expect(() => saveAudioSettings(defaultAudioSettings())).not.toThrow();
    expect(store.size).toBe(0);
  });
});
