import type { Cell } from "./bonusBar";
import type { SolidGrid } from "./maze";
import { cellCenterX, cellCenterY, worldToCol, worldToRow } from "./maze";

export type ChainSegment = { x1: number; y1: number; x2: number; y2: number };

export type ChainPoint = { x: number; y: number };

export type BossChainPath = { points: readonly ChainPoint[] };

const CHAIN_HIT_RADIUS_FRACTION = 0.5;

const LIGHTNING_STEP_PX = 10;
const LIGHTNING_FLICKER_MS = 50;

const STEPS: readonly { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 0 },
];

function isOpen(solids: SolidGrid, col: number, row: number): boolean {
  return solids[row]?.[col] === false;
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function chainPathCells(
  solids: SolidGrid,
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): Cell[] | null {
  if (!isOpen(solids, fromCol, fromRow) || !isOpen(solids, toCol, toRow)) {
    return null;
  }
  if (fromCol === toCol && fromRow === toRow) {
    return [{ col: fromCol, row: fromRow }];
  }
  const parent = new Map<string, string | null>([[cellKey(fromCol, fromRow), null]]);
  const queue: Cell[] = [{ col: fromCol, row: fromRow }];
  for (let i = 0; i < queue.length; i += 1) {
    const cell = queue[i]!;
    for (const step of STEPS) {
      const col = cell.col + step.dx;
      const row = cell.row + step.dy;
      const k = cellKey(col, row);
      if (parent.has(k) || !isOpen(solids, col, row)) {
        continue;
      }
      parent.set(k, cellKey(cell.col, cell.row));
      if (col === toCol && row === toRow) {
        const path: Cell[] = [];
        let cursor: string | null = k;
        while (cursor !== null) {
          const [c, r] = cursor.split(",").map(Number) as [number, number];
          path.push({ col: c, row: r });
          cursor = parent.get(cursor) ?? null;
        }
        path.reverse();
        return path;
      }
      queue.push({ col, row });
    }
  }
  return null;
}

export function chainPolyline(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  solids: SolidGrid,
): ChainPoint[] {
  const fromCol = worldToCol(x1);
  const fromRow = worldToRow(y1);
  const toCol = worldToCol(x2);
  const toRow = worldToRow(y2);
  const cells = chainPathCells(solids, fromCol, fromRow, toCol, toRow);
  if (cells === null) {
    return [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
  }
  const points: ChainPoint[] = [{ x: x1, y: y1 }];
  for (let i = 1; i < cells.length - 1; i += 1) {
    const cell = cells[i]!;
    points.push({ x: cellCenterX(cell.col), y: cellCenterY(cell.row) });
  }
  points.push({ x: x2, y: y2 });
  return points;
}

export function distanceToSegment(px: number, py: number, seg: ChainSegment): number {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0
      ? 0
      : Math.min(1, Math.max(0, ((px - seg.x1) * dx + (py - seg.y1) * dy) / lengthSq));
  return Math.hypot(px - (seg.x1 + t * dx), py - (seg.y1 + t * dy));
}

export function distanceToPolyline(px: number, py: number, points: readonly ChainPoint[]): number {
  if (points.length === 0) {
    return Infinity;
  }
  if (points.length === 1) {
    const p = points[0]!;
    return Math.hypot(px - p.x, py - p.y);
  }
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    best = Math.min(best, distanceToSegment(px, py, { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
  }
  return best;
}

export function chainHitsCircle(path: BossChainPath, cx: number, cy: number, r: number): boolean {
  return distanceToPolyline(cx, cy, path.points) <= r * CHAIN_HIT_RADIUS_FRACTION;
}

function jitter(index: number, frame: number, strand: number): number {
  const v = Math.sin(index * 12.9898 + frame * 78.233 + strand * 37.719) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

function lightningAlongSegment(
  seg: ChainSegment,
  frame: number,
  amplitudePx: number,
  strand: number,
  indexOffset: number,
): ChainPoint[] {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const length = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(length / LIGHTNING_STEP_PX));
  const nx = length === 0 ? 0 : -dy / length;
  const ny = length === 0 ? 0 : dx / length;
  const points: ChainPoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const offset =
      i === 0 || i === steps
        ? 0
        : jitter(indexOffset + i, frame, strand) * amplitudePx * Math.sin(Math.PI * t);
    points.push({ x: seg.x1 + dx * t + nx * offset, y: seg.y1 + dy * t + ny * offset });
  }
  return points;
}

export function lightningPoints(
  path: BossChainPath,
  nowMs: number,
  amplitudePx: number,
  strand = 0,
): ChainPoint[] {
  const vertices = path.points;
  if (vertices.length === 0) {
    return [];
  }
  if (vertices.length === 1) {
    return [{ x: vertices[0]!.x, y: vertices[0]!.y }];
  }
  const frame = Math.floor(nowMs / LIGHTNING_FLICKER_MS);
  const points: ChainPoint[] = [];
  let indexOffset = 0;
  for (let i = 0; i < vertices.length - 1; i += 1) {
    const a = vertices[i]!;
    const b = vertices[i + 1]!;
    const segPoints = lightningAlongSegment(
      { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
      frame,
      amplitudePx,
      strand,
      indexOffset,
    );
    if (points.length === 0) {
      points.push(...segPoints);
    } else {
      points.push(...segPoints.slice(1));
    }
    indexOffset += segPoints.length;
  }
  return points;
}
