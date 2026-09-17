export const AUDIO_SETTINGS_VERSION = 1 as const;
export const AUDIO_LEVEL_MIN = 0;
export const AUDIO_LEVEL_MAX = 10;

export type AudioCategory = "music" | "sfx";

export type AudioSettings = {
  version: typeof AUDIO_SETTINGS_VERSION;
  musicEnabled: boolean;
  musicLevel: number;
  sfxEnabled: boolean;
  sfxLevel: number;
};

export function defaultAudioSettings(): AudioSettings {
  return {
    version: AUDIO_SETTINGS_VERSION,
    musicEnabled: true,
    musicLevel: AUDIO_LEVEL_MAX,
    sfxEnabled: true,
    sfxLevel: AUDIO_LEVEL_MAX,
  };
}

export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return AUDIO_LEVEL_MAX;
  }
  return Math.min(AUDIO_LEVEL_MAX, Math.max(AUDIO_LEVEL_MIN, Math.round(level)));
}

export function effectiveVolume(manifestVolume: number, enabled: boolean, level: number): number {
  if (!enabled) {
    return 0;
  }
  return manifestVolume * (clampLevel(level) / AUDIO_LEVEL_MAX);
}

export function categoryForSfx(id: string): AudioCategory {
  return id === "siren" ? "music" : "sfx";
}

export function parseAudioSettings(raw: string | null): AudioSettings {
  const defaults = defaultAudioSettings();
  if (raw === null) {
    return defaults;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return defaults;
    }
    const record = parsed as Record<string, unknown>;
    if (record.version !== AUDIO_SETTINGS_VERSION) {
      return defaults;
    }
    return {
      version: AUDIO_SETTINGS_VERSION,
      musicEnabled:
        typeof record.musicEnabled === "boolean" ? record.musicEnabled : defaults.musicEnabled,
      musicLevel:
        typeof record.musicLevel === "number" ? clampLevel(record.musicLevel) : defaults.musicLevel,
      sfxEnabled: typeof record.sfxEnabled === "boolean" ? record.sfxEnabled : defaults.sfxEnabled,
      sfxLevel:
        typeof record.sfxLevel === "number" ? clampLevel(record.sfxLevel) : defaults.sfxLevel,
    };
  } catch {
    return defaults;
  }
}

export function serializeAudioSettings(settings: AudioSettings): string {
  return JSON.stringify({
    version: AUDIO_SETTINGS_VERSION,
    musicEnabled: settings.musicEnabled,
    musicLevel: clampLevel(settings.musicLevel),
    sfxEnabled: settings.sfxEnabled,
    sfxLevel: clampLevel(settings.sfxLevel),
  });
}
