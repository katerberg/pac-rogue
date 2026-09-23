import { WALL_STROKE_COLOR } from "./maze";

export const MAZE_COLOR_SETTINGS_VERSION = 1 as const;

export type MazeColorOption = {
  id: string;
  color: number;
};

export const MAZE_COLOR_OPTIONS: readonly MazeColorOption[] = [
  { id: "blue", color: WALL_STROKE_COLOR },
  { id: "red", color: 0xff3b3b },
  { id: "green", color: 0x39ff6a },
  { id: "purple", color: 0xb83bff },
];

export const MAZE_COLOR_INDEX_MIN = 0;
export const MAZE_COLOR_INDEX_MAX = MAZE_COLOR_OPTIONS.length - 1;

export type MazeColorSettings = {
  version: typeof MAZE_COLOR_SETTINGS_VERSION;
  colorIndex: number;
};

export function defaultMazeColorSettings(): MazeColorSettings {
  return { version: MAZE_COLOR_SETTINGS_VERSION, colorIndex: MAZE_COLOR_INDEX_MIN };
}

export function clampMazeColorIndex(index: number): number {
  if (!Number.isFinite(index)) {
    return MAZE_COLOR_INDEX_MIN;
  }
  return Math.min(MAZE_COLOR_INDEX_MAX, Math.max(MAZE_COLOR_INDEX_MIN, Math.round(index)));
}

export function mazeColorForIndex(index: number): number {
  const option = MAZE_COLOR_OPTIONS[clampMazeColorIndex(index)];
  return option ? option.color : WALL_STROKE_COLOR;
}

export function parseMazeColorSettings(raw: string | null): MazeColorSettings {
  const defaults = defaultMazeColorSettings();
  if (raw === null) {
    return defaults;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return defaults;
    }
    const record = parsed as Record<string, unknown>;
    if (record.version !== MAZE_COLOR_SETTINGS_VERSION) {
      return defaults;
    }
    return {
      version: MAZE_COLOR_SETTINGS_VERSION,
      colorIndex:
        typeof record.colorIndex === "number"
          ? clampMazeColorIndex(record.colorIndex)
          : defaults.colorIndex,
    };
  } catch {
    return defaults;
  }
}

export function serializeMazeColorSettings(settings: MazeColorSettings): string {
  return JSON.stringify({
    version: MAZE_COLOR_SETTINGS_VERSION,
    colorIndex: clampMazeColorIndex(settings.colorIndex),
  });
}
