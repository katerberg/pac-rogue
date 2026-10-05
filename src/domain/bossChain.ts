export type ChainSegment = { x1: number; y1: number; x2: number; y2: number };

export type ChainPoint = { x: number; y: number };

const CHAIN_HIT_RADIUS_FRACTION = 0.5;

const LIGHTNING_STEP_PX = 10;
const LIGHTNING_FLICKER_MS = 50;

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

export function chainHitsCircle(seg: ChainSegment, cx: number, cy: number, r: number): boolean {
  return distanceToSegment(cx, cy, seg) <= r * CHAIN_HIT_RADIUS_FRACTION;
}

function jitter(index: number, frame: number, strand: number): number {
  const v = Math.sin(index * 12.9898 + frame * 78.233 + strand * 37.719) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

export function lightningPoints(
  seg: ChainSegment,
  nowMs: number,
  amplitudePx: number,
  strand = 0,
): ChainPoint[] {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const length = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(length / LIGHTNING_STEP_PX));
  const nx = length === 0 ? 0 : -dy / length;
  const ny = length === 0 ? 0 : dx / length;
  const frame = Math.floor(nowMs / LIGHTNING_FLICKER_MS);
  const points: ChainPoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const offset =
      i === 0 || i === steps ? 0 : jitter(i, frame, strand) * amplitudePx * Math.sin(Math.PI * t);
    points.push({ x: seg.x1 + dx * t + nx * offset, y: seg.y1 + dy * t + ny * offset });
  }
  return points;
}
