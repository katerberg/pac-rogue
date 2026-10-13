import { parseRosterId } from "../../domain/ghostRoster";

export const LAST_ROSTER_STORAGE_KEY = "pac-rogue.last-roster.v1";

export function loadLastRoster(): number | null {
  try {
    return parseRosterId(localStorage.getItem(LAST_ROSTER_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveLastRoster(id: number): void {
  try {
    localStorage.setItem(LAST_ROSTER_STORAGE_KEY, String(id));
  } catch {
    return;
  }
}
