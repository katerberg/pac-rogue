import {
  diffFromDefault,
  parseTuningOverrides,
  resolveTuning,
  serializeTuningOverrides,
  type Tuning,
} from "../../domain/tuning";

export const DEBUG_TUNING_STORAGE_KEY = "pac-rogue.debug-tuning.v1";

function readStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadDebugTuning(): Tuning {
  const storage = readStorage();
  if (storage === null) {
    return resolveTuning({});
  }
  try {
    const { overrides, warning } = parseTuningOverrides(storage.getItem(DEBUG_TUNING_STORAGE_KEY));
    if (warning !== null) {
      console.warn(warning);
    }
    return resolveTuning(overrides);
  } catch {
    return resolveTuning({});
  }
}

export function saveDebugTuning(tuning: Tuning): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }
  try {
    const diff = diffFromDefault(tuning);
    if (Object.keys(diff).length === 0) {
      storage.removeItem(DEBUG_TUNING_STORAGE_KEY);
    } else {
      storage.setItem(DEBUG_TUNING_STORAGE_KEY, serializeTuningOverrides(diff));
    }
  } catch {
    return;
  }
}

export function clearDebugTuning(): void {
  try {
    readStorage()?.removeItem(DEBUG_TUNING_STORAGE_KEY);
  } catch {
    return;
  }
}
