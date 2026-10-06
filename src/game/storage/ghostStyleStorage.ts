import { DEFAULT_GHOST_STYLE, parseGhostStyle, type GhostStyle } from "../../domain/ghostArt";

export const GHOST_STYLE_STORAGE_KEY = "pac-rogue.ghost-style.v1";

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

export function loadGhostStyle(): GhostStyle {
  const storage = readStorage();
  if (storage === null) {
    return DEFAULT_GHOST_STYLE;
  }
  try {
    return parseGhostStyle(storage.getItem(GHOST_STYLE_STORAGE_KEY));
  } catch {
    return DEFAULT_GHOST_STYLE;
  }
}

export function saveGhostStyle(style: GhostStyle): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }
  try {
    storage.setItem(GHOST_STYLE_STORAGE_KEY, style);
  } catch {
    return;
  }
}
