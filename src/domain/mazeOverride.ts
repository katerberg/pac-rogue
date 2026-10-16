import { MAZE_LAYOUT_IDS, type MazeLayoutId } from "./mazeLayouts";
import { mazePoolMap } from "./mazePool";

export type MazeOverride = MazeLayoutId | number;

export function parseMazeOverride(params: URLSearchParams): MazeOverride | null {
  const raw = params.get("maze");
  if (raw === null || raw === "") {
    return null;
  }
  if ((MAZE_LAYOUT_IDS as readonly string[]).includes(raw)) {
    return raw as MazeLayoutId;
  }
  if (/^\d+$/.test(raw)) {
    const index = Number(raw);
    if (mazePoolMap(index) !== null) {
      return index;
    }
  }
  return null;
}
