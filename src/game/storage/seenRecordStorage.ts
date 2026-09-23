import {
  emptySeenRecord,
  parseSeenRecord,
  serializeSeenRecord,
  type SeenRecord,
} from "../../domain/seenRecord";

export const SEEN_RECORD_STORAGE_KEY = "pac-rogue.seen.v1";

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

export function loadSeenRecord(): SeenRecord {
  const storage = readStorage();
  if (storage === null) {
    return emptySeenRecord();
  }

  try {
    return parseSeenRecord(storage.getItem(SEEN_RECORD_STORAGE_KEY));
  } catch {
    return emptySeenRecord();
  }
}

export function saveSeenRecord(record: SeenRecord): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(SEEN_RECORD_STORAGE_KEY, serializeSeenRecord(record));
  } catch {
    return;
  }
}
