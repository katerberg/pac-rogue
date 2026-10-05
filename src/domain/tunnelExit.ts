import { getActiveLayout } from "./maze";
import { didWrap } from "./runLog";

type Point = { x: number; y: number };

export function playerExitedTunnel(before: Point | null, after: Point | null): boolean {
  if (before === null || after === null) {
    return false;
  }
  const { cols, rows, tileSize } = getActiveLayout();
  return didWrap(before.x, after.x, cols * tileSize) || didWrap(before.y, after.y, rows * tileSize);
}
