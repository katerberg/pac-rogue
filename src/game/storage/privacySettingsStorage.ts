import { parsePrivacySettings, type PrivacySettings } from "../../domain/privacySettings";

export const PRIVACY_SETTINGS_STORAGE_KEY = "pac-rogue.privacy.v1";

function readStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadPrivacySettings(): PrivacySettings {
  try {
    return parsePrivacySettings(readStorage()?.getItem(PRIVACY_SETTINGS_STORAGE_KEY) ?? null);
  } catch {
    return parsePrivacySettings(null);
  }
}

export function savePrivacySettings(settings: PrivacySettings): void {
  try {
    readStorage()?.setItem(PRIVACY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}
