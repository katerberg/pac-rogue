import {
  defaultMazeColorSettings,
  parseMazeColorSettings,
  serializeMazeColorSettings,
  type MazeColorSettings,
} from "../../domain/mazeColorSettings";

export const MAZE_COLOR_STORAGE_KEY = "pac-rogue.maze-color.v1";

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

export function loadMazeColorSettings(): MazeColorSettings {
  const storage = readStorage();
  if (storage === null) {
    return defaultMazeColorSettings();
  }

  try {
    return parseMazeColorSettings(storage.getItem(MAZE_COLOR_STORAGE_KEY));
  } catch {
    return defaultMazeColorSettings();
  }
}

export function saveMazeColorSettings(settings: MazeColorSettings): void {
  const storage = readStorage();
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(MAZE_COLOR_STORAGE_KEY, serializeMazeColorSettings(settings));
  } catch {
    return;
  }
}
