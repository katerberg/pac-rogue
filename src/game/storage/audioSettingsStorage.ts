import {
  defaultAudioSettings,
  parseAudioSettings,
  serializeAudioSettings,
  type AudioSettings,
} from "../../domain/audioSettings";

export const AUDIO_SETTINGS_STORAGE_KEY = "pac-rogue.audio-settings.v1";

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

export function loadAudioSettings(): AudioSettings {
  const storage = readStorage();
  if (storage === null) {
    return defaultAudioSettings();
  }

  try {
    return parseAudioSettings(storage.getItem(AUDIO_SETTINGS_STORAGE_KEY));
  } catch {
    return defaultAudioSettings();
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(AUDIO_SETTINGS_STORAGE_KEY, serializeAudioSettings(settings));
  } catch {
    return;
  }
}
