export const SCARECROW_RADIUS_TILES = 4;
export const SCARECROW_LINGER_MS = 5000;
export const SCARECROW_LINGER_BLINK_MS = 1000;
export const SCARECROW_COLOR = 0xc8d85a;
export const SCARECROW_RING_COUNT = 3;
export const SCARECROW_WAVE_POINTS = 48;
export const SCARECROW_WAVE_LOBES = 6;
export const SCARECROW_WAVE_AMPLITUDE_PX = 2;
export const SCARECROW_WAVE_SPEED = 0.003;
export const SCARECROW_RING_ALPHA = 0.85;
export const SCARECROW_RING_FADE_PER_RING = 0.2;

export type ScentZone = { col: number; row: number };
export type ScentLinger = ScentZone & { remainingMs: number };

export type ScentWavePoint = { x: number; y: number };

function distSq(a: ScentZone, col: number, row: number): number {
  return (a.col - col) ** 2 + (a.row - row) ** 2;
}

export function scentBlocksStep(
  zones: readonly ScentZone[],
  from: ScentZone,
  to: ScentZone,
  radiusTiles: number,
): boolean {
  const limit = radiusTiles * radiusTiles;
  return zones.some((zone) => {
    const dTo = distSq(zone, to.col, to.row);
    if (dTo > limit) {
      return false;
    }
    const dFrom = distSq(zone, from.col, from.row);
    return dFrom > limit || dTo < dFrom;
  });
}

export function addScentLingers(
  lingers: readonly ScentLinger[],
  picked: readonly ScentZone[],
  durationMs: number,
): ScentLinger[] {
  return [...lingers, ...picked.map((zone) => ({ ...zone, remainingMs: durationMs }))];
}

export function tickScentLingers(lingers: readonly ScentLinger[], deltaMs: number): ScentLinger[] {
  return lingers
    .map((linger) => ({ ...linger, remainingMs: linger.remainingMs - deltaMs }))
    .filter((linger) => linger.remainingMs > 0);
}

export function scentLingerAlphaMul(remainingMs: number, timeMs: number): number {
  if (remainingMs > SCARECROW_LINGER_BLINK_MS) {
    return 1;
  }
  return Math.floor(timeMs / 100) % 2 === 0 ? 1 : 0.35;
}

export function scentWavePoints(
  cx: number,
  cy: number,
  radiusPx: number,
  ring: number,
  timeMs: number,
): ScentWavePoint[] {
  const ringRadius = radiusPx * (1 - ring * 0.18);
  const phase = timeMs * SCARECROW_WAVE_SPEED * (ring % 2 === 0 ? 1 : -1) + ring;
  const points: ScentWavePoint[] = [];
  for (let i = 0; i < SCARECROW_WAVE_POINTS; i += 1) {
    const angle = (i / SCARECROW_WAVE_POINTS) * Math.PI * 2;
    const r =
      ringRadius + Math.sin(angle * SCARECROW_WAVE_LOBES + phase) * SCARECROW_WAVE_AMPLITUDE_PX;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return points;
}

export function scentRingAlpha(ring: number): number {
  return Math.max(0, SCARECROW_RING_ALPHA - ring * SCARECROW_RING_FADE_PER_RING);
}
