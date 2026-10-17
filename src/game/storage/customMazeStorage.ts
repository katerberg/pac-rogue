export const CUSTOM_MAZE_STORAGE_KEY = "pac-rogue.custom-maze.v1";

export function loadCustomMaze(): string | null {
  try {
    return localStorage.getItem(CUSTOM_MAZE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveCustomMaze(ascii: string): void {
  try {
    localStorage.setItem(CUSTOM_MAZE_STORAGE_KEY, ascii);
  } catch {
    return;
  }
}
