export const SCARECROW_RADIUS_TILES = 4;
export const SCARECROW_LINGER_MS = 5000;
export const SCARECROW_LINGER_BLINK_MS = 1000;
export const SCARECROW_COLOR = 0xa8b860;
export const SCARECROW_PIXEL_PX = 2;
export const SCARECROW_WAVE_AMPLITUDE_PX = 3;
export const SCARECROW_WAVE_LENGTH_PX = 24;
export const SCARECROW_WAFT_PX_PER_MS = 0.02;
export const SCARECROW_BASE_ALPHA = 0.28;
export const SCARECROW_FAR_ALPHA_MUL = 0.3;

export type ScentZone = { col: number; row: number };
export type ScentLinger = ScentZone & { remainingMs: number };

export type ScentCell = { col: number; row: number; dist: number };
export type ScentPixel = { x: number; y: number; size: number; alpha: number };

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

export function scentCells(
  zone: ScentZone,
  radiusTiles: number,
  walkable: (col: number, row: number) => boolean,
): ScentCell[] {
  const limit = radiusTiles * radiusTiles;
  const seen = new Set<string>([`${zone.col},${zone.row}`]);
  const cells: ScentCell[] = [];
  const queue: ScentZone[] = [zone];
  while (queue.length > 0) {
    const cell = queue.shift()!;
    cells.push({ ...cell, dist: Math.sqrt(distSq(zone, cell.col, cell.row)) });
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const next = { col: cell.col + dc, row: cell.row + dr };
      const key = `${next.col},${next.row}`;
      if (
        !seen.has(key) &&
        distSq(zone, next.col, next.row) <= limit &&
        walkable(next.col, next.row)
      ) {
        seen.add(key);
        queue.push(next);
      }
    }
  }
  return cells;
}

export function scentPixels(
  zone: ScentZone,
  cells: readonly ScentCell[],
  radiusTiles: number,
  tileSize: number,
  originX: number,
  originY: number,
  timeMs: number,
  walkable: (col: number, row: number) => boolean,
): ScentPixel[] {
  const pixels: ScentPixel[] = [];
  const steps = Math.floor(tileSize / SCARECROW_PIXEL_PX);
  const half = SCARECROW_PIXEL_PX / 2;
  const waft = timeMs * SCARECROW_WAFT_PX_PER_MS;
  const wave = (alongPx: number): number =>
    Math.round(
      (Math.sin(((alongPx - waft) * Math.PI * 2) / SCARECROW_WAVE_LENGTH_PX) *
        SCARECROW_WAVE_AMPLITUDE_PX) /
        SCARECROW_PIXEL_PX,
    ) * SCARECROW_PIXEL_PX;
  for (const cell of cells) {
    const alpha =
      SCARECROW_BASE_ALPHA * (1 - (1 - SCARECROW_FAR_ALPHA_MUL) * (cell.dist / radiusTiles));
    const cx = originX + cell.col * tileSize + tileSize / 2;
    const cy = originY + cell.row * tileSize + tileSize / 2;
    const zx = originX + zone.col * tileSize + tileSize / 2;
    const zy = originY + zone.row * tileSize + tileSize / 2;
    const horizontal = walkable(cell.col - 1, cell.row) || walkable(cell.col + 1, cell.row);
    const vertical = walkable(cell.col, cell.row - 1) || walkable(cell.col, cell.row + 1);
    for (let i = 0; i < steps; i += 1) {
      const along = (i - steps / 2) * SCARECROW_PIXEL_PX + half;
      if (horizontal) {
        const x = cx + along;
        pixels.push({
          x: x - half,
          y: cy + wave(Math.abs(x - zx)) - half,
          size: SCARECROW_PIXEL_PX,
          alpha,
        });
      }
      if (vertical) {
        const y = cy + along;
        pixels.push({
          x: cx + wave(Math.abs(y - zy)) - half,
          y: y - half,
          size: SCARECROW_PIXEL_PX,
          alpha,
        });
      }
    }
  }
  return pixels;
}
