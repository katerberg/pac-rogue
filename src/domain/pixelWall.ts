import type { WallPathCommand } from "./maze";

export const WALL_ART_PX = 2;

export type WallRect = { x: number; y: number; w: number; h: number };

function lineCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  visit: (cx: number, cy: number) => void,
): void {
  let cx = x0;
  let cy = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    visit(cx, cy);
    if (cx === x1 && cy === y1) {
      return;
    }
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      cx += sx;
    }
    if (e2 <= dx) {
      err += dx;
      cy += sy;
    }
  }
}

/** Snaps the wall path onto an art-pixel grid; corners become stair-steps, edges hard-aligned. */
export function pixelWallRects(
  commands: readonly WallPathCommand[],
  thicknessPx: number,
): WallRect[] {
  const span = Math.max(1, Math.round(thicknessPx / WALL_ART_PX));
  const start = -Math.floor(span / 2);
  const rows = new Map<number, Set<number>>();
  const stamp = (cx: number, cy: number): void => {
    for (let dy = 0; dy < span; dy += 1) {
      const y = cy + start + dy;
      let row = rows.get(y);
      if (row === undefined) {
        row = new Set();
        rows.set(y, row);
      }
      for (let dx = 0; dx < span; dx += 1) {
        row.add(cx + start + dx);
      }
    }
  };

  let pen: { cx: number; cy: number } | null = null;
  for (const command of commands) {
    const cx = Math.floor(command.x / WALL_ART_PX);
    const cy = Math.floor(command.y / WALL_ART_PX);
    if (command.type === "line" && pen !== null) {
      lineCells(pen.cx, pen.cy, cx, cy, stamp);
    }
    pen = { cx, cy };
  }

  const rects: WallRect[] = [];
  for (const [cy, cols] of rows) {
    const sorted = [...cols].sort((a, b) => a - b);
    let runStart = sorted[0];
    let prev = runStart;
    for (let i = 1; i <= sorted.length; i += 1) {
      const col = sorted[i];
      if (col !== undefined && col === prev! + 1) {
        prev = col;
        continue;
      }
      if (runStart !== undefined && prev !== undefined) {
        rects.push({
          x: runStart * WALL_ART_PX,
          y: cy * WALL_ART_PX,
          w: (prev - runStart + 1) * WALL_ART_PX,
          h: WALL_ART_PX,
        });
      }
      runStart = col;
      prev = col;
    }
  }
  return rects;
}
