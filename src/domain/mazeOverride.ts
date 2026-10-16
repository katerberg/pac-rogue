import { MAZE_LAYOUT_IDS, type MazeLayoutId } from "./mazeLayouts";
import { mazePoolMap } from "./mazePool";

export type MazeOverride = { kind: "static"; id: MazeLayoutId } | { kind: "pool"; index: number };

export function parseMazeOverride(params: URLSearchParams): MazeOverride | null {
  const raw = params.get("maze");
  if (raw === null || raw === "") {
    return null;
  }
  if ((MAZE_LAYOUT_IDS as readonly string[]).includes(raw)) {
    return { kind: "static", id: raw as MazeLayoutId };
  }
  if (/^\d+$/.test(raw)) {
    const index = Number(raw);
    if (mazePoolMap(index) !== null) {
      return { kind: "pool", index };
    }
  }
  return null;
}
