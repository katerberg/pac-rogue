import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  worldToCol,
  worldToRow,
  type MazeTile,
} from "./maze";

export const SLIME_ART = {
  halfWidthPx: 7,
  roughPx: 3.4,
  grain: 0.22,
  wobble: 0.4,
  taper: 0.65,
  artPx: 2,
  rim: 0x008300,
  body: 0x51ff00,
  light: 0x7bff30,
  shine: 0xffffa5,
  glint: 0xffffff,
  sparklesPerTile: 2,
} as const;

const REFERENCE_TILE_PX = 16;

export type SlimeTrailView = {
  head: { x: number; y: number } | null;
  tiles: readonly MazeTile[];
  maxTiles: number;
};

export type SlimePixel = { x: number; y: number; size: number; color: number };

type Point = { x: number; y: number };
type Cell = { dist: number; age: number };

function hash(x: number, y: number): number {
  let h = (Math.round(x) * 374761393 + Math.round(y) * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const sx = (x - xi) * (x - xi) * (3 - 2 * (x - xi));
  const sy = (y - yi) * (y - yi) * (3 - 2 * (y - yi));
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function edgeNoise(x: number, y: number): number {
  return (valueNoise(x, y) * 0.65 + valueNoise(x * 2.3 + 17, y * 2.3 - 9) * 0.35) * 2 - 1;
}

function adjacent(a: MazeTile, b: MazeTile): boolean {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
}

function trailRuns(trail: SlimeTrailView): Point[][] {
  const center = (tile: MazeTile): Point => ({
    x: cellCenterX(tile.col),
    y: cellCenterY(tile.row),
  });
  const newestFirst = [...trail.tiles].reverse();
  const runs: Point[][] = [];
  let run: Point[] = trail.head === null ? [] : [trail.head];
  newestFirst.forEach((tile, i) => {
    const prev = newestFirst[i - 1];
    if (prev !== undefined && !adjacent(prev, tile)) {
      runs.push(run);
      run = [];
    }
    run.push(center(tile));
  });
  runs.push(run);
  return runs.filter((points) => points.length > 0);
}

export function slimePixels(trails: readonly SlimeTrailView[], nowMs: number): SlimePixel[] {
  const layout = getActiveLayout();
  const scale = layout.tileSize / REFERENCE_TILE_PX;
  const art = Math.max(1, Math.round(SLIME_ART.artPx * scale));
  const halfWidth = SLIME_ART.halfWidthPx * scale;
  const rough = SLIME_ART.roughPx * scale;
  const reach = halfWidth + rough + art;
  const time = nowMs / 1000;
  const cells = new Map<string, Cell & { ax: number; ay: number }>();

  for (const trail of trails) {
    const maxLen = Math.max(1, trail.maxTiles) * layout.tileSize;
    let travelled = 0;
    for (const points of trailRuns(trail)) {
      if (points.length === 1) {
        points.push(points[0]!);
      }
      for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i]!;
        const b = points[i + 1]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        const len = Math.sqrt(len2);
        const ax0 = Math.floor((Math.min(a.x, b.x) - reach - layout.offsetX) / art);
        const ax1 = Math.ceil((Math.max(a.x, b.x) + reach - layout.offsetX) / art);
        const ay0 = Math.floor((Math.min(a.y, b.y) - reach - layout.offsetY) / art);
        const ay1 = Math.ceil((Math.max(a.y, b.y) + reach - layout.offsetY) / art);
        for (let ay = ay0; ay <= ay1; ay += 1) {
          for (let ax = ax0; ax <= ax1; ax += 1) {
            const px = layout.offsetX + (ax + 0.5) * art;
            const py = layout.offsetY + (ay + 0.5) * art;
            const u =
              len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
            const dist = Math.hypot(a.x + dx * u - px, a.y + dy * u - py);
            const key = `${ax},${ay}`;
            const held = cells.get(key);
            if (held === undefined || dist < held.dist) {
              cells.set(key, { ax, ay, dist, age: Math.min(1, (travelled + u * len) / maxLen) });
            }
          }
        }
        travelled += len;
      }
      travelled += layout.tileSize;
    }
  }

  const wobble = time * 0.9 * SLIME_ART.wobble;
  const slimed = new Map<string, SlimePixel>();
  for (const [key, cell] of cells) {
    const x = layout.offsetX + cell.ax * art;
    const y = layout.offsetY + cell.ay * art;
    const cx = x + art / 2;
    const cy = y + art / 2;
    const col = worldToCol(cx);
    const row = worldToRow(cy);
    if (layout.walls[row]?.[col] !== false) {
      continue;
    }
    const lx = (cx - layout.offsetX) / scale;
    const ly = (cy - layout.offsetY) / scale;
    const radius =
      halfWidth * (1 - SLIME_ART.taper * cell.age) +
      rough * edgeNoise(lx * SLIME_ART.grain + wobble, ly * SLIME_ART.grain - wobble * 0.7);
    const depth = (radius - cell.dist) / scale;
    if (depth <= 0) {
      continue;
    }
    const speck = valueNoise(lx * 0.45 + 31, ly * 0.45 + 7);
    const color =
      depth < 1.3
        ? SLIME_ART.rim
        : depth > 3 && speck > 0.8 - (1 - cell.age) * 0.15
          ? SLIME_ART.shine
          : depth > 2.4 && speck > 0.62
            ? SLIME_ART.light
            : SLIME_ART.body;
    slimed.set(key, { x, y, size: art, color });
  }

  for (const trail of trails) {
    const newestFirst = [...trail.tiles].reverse();
    newestFirst.forEach((tile, k) => {
      const age = newestFirst.length > 1 ? k / (newestFirst.length - 1) : 0;
      const bx = cellCenterX(tile.col);
      const by = cellCenterY(tile.row);
      for (let s = 0; s < SLIME_ART.sparklesPerTile; s += 1) {
        const seed = hash(tile.col * 31 + s * 97, tile.row * 17 - s * 53);
        const cycle = (time * (0.45 + seed * 0.5) + seed * 7) % 1;
        const window = 0.3 * (1 - age * 0.7);
        if (cycle > window) {
          continue;
        }
        const sx = bx + (seed - 0.5) * halfWidth * 1.4;
        const sy = by + (hash(tile.row + s, tile.col) - 0.5) * halfWidth * 1.4;
        const ax = Math.floor((sx - layout.offsetX) / art);
        const ay = Math.floor((sy - layout.offsetY) / art);
        if (!slimed.has(`${ax},${ay}`)) {
          continue;
        }
        const phase = cycle / window;
        const put = (gx: number, gy: number, color: number): void => {
          const pixel = slimed.get(`${gx},${gy}`);
          if (pixel !== undefined) {
            pixel.color = color;
          }
        };
        if (phase < 0.3 || phase > 0.75) {
          put(ax, ay, phase > 0.75 ? SLIME_ART.light : SLIME_ART.shine);
          continue;
        }
        put(ax, ay, SLIME_ART.glint);
        for (const [ox, oy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          put(ax + ox, ay + oy, SLIME_ART.shine);
        }
      }
    });
  }

  return [...slimed.values()];
}
