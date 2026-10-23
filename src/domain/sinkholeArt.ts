import type { CollapseChain } from "./collapse";
import { randomFromSeed } from "./mazeTiling";

export const SINKHOLE_ART_TILE = 16;

export const SINKHOLE_STYLE = {
  bulge: 1,
  jag: 1,
  lumps: 0.15,
  taper: 0.85,
  bandWidth: 2.5,
  rimWidth: 1,
  litAmount: 0.45,
  slump: 0.2,
  cracks: 8,
  crackLen: 5,
  crackWobble: 0.4,
  branch: 0.55,
  introMs: 4000,
  crackShare: 0.4,
  spread: 0.4,
} as const;

export const SINKHOLE_TONE = {
  earth: 0,
  litSoft: 1,
  litHard: 2,
  slump: 3,
  crack: 4,
  crackLip: 5,
  voidEdge: 6,
  voidDeep: 7,
} as const;

export type SinkholeTone = (typeof SINKHOLE_TONE)[keyof typeof SINKHOLE_TONE];

const EARTH = 0x6a5846;
const LIT = 0xa69078;
const CRACK = 0x3e3026;
const CRACK_LIP = 0x8a7660;
const VOID_EDGE = 0x2e2018;
const VOID_DEEP = 0x040206;

function mixColor(from: number, to: number, amount: number): number {
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * amount) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

export function sinkholePalette(ground: number): readonly number[] {
  const palette: number[] = [];
  palette[SINKHOLE_TONE.earth] = EARTH;
  palette[SINKHOLE_TONE.litSoft] = mixColor(EARTH, LIT, SINKHOLE_STYLE.litAmount * 0.55);
  palette[SINKHOLE_TONE.litHard] = mixColor(EARTH, LIT, SINKHOLE_STYLE.litAmount);
  palette[SINKHOLE_TONE.slump] = mixColor(EARTH, ground, 0.55);
  palette[SINKHOLE_TONE.crack] = CRACK;
  palette[SINKHOLE_TONE.crackLip] = mixColor(ground, CRACK_LIP, 0.55);
  palette[SINKHOLE_TONE.voidEdge] = VOID_EDGE;
  palette[SINKHOLE_TONE.voidDeep] = VOID_DEEP;
  return palette;
}

export type SinkholePixel = {
  x: number;
  y: number;
  tone: SinkholeTone;
  crackFrom: number;
  openFrom: number;
  openUntil: number;
};

export type SinkholeArt = { pixels: readonly SinkholePixel[] };

export type SinkholeRenderState = {
  key: string;
  art: SinkholeArt;
  elapsedMs: number;
  fresh: boolean;
};

export type SinkholeBoard = { ascii: string; tileSize: number };

export type SinkholeOpening = { crackP: number; open: number };

const T = SINKHOLE_ART_TILE;
const NEVER = 2;
const SEAL_END_PX = 3;
const OPEN_DEPTH_PAD = 4;
const OPEN_DEPTH_FLOOR = 1.5;
const MID_SLIT_SHARE = 0.5;
const SLIT_OVERSHOOT_PX = 2;

const SIDES = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
] as const;
const DIRS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
] as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const SINKHOLE_INTRO_MS = SINKHOLE_STYLE.introMs;

export function sinkholeOpening(elapsedMs: number, fresh: boolean): SinkholeOpening {
  if (!fresh) {
    return { crackP: 1, open: 1 };
  }
  const { introMs, crackShare } = SINKHOLE_STYLE;
  const progress = clamp01(elapsedMs / introMs);
  const raw = clamp01((progress - crackShare * 0.7) / (1 - crackShare * 0.7));
  return { crackP: clamp01(progress / crackShare), open: raw * raw * (3 - 2 * raw) };
}

export function sinkholeSettled(state: SinkholeRenderState): boolean {
  return !state.fresh || state.elapsedMs >= SINKHOLE_INTRO_MS;
}

export function sinkholePixelVisible(pixel: SinkholePixel, opening: SinkholeOpening): boolean {
  return (
    opening.crackP >= pixel.crackFrom &&
    opening.open >= pixel.openFrom &&
    opening.open < pixel.openUntil
  );
}

function hash3(a: number, b: number, c: number): number {
  let h =
    (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash3(ix, iy, seed);
  const b = hash3(ix + 1, iy, seed);
  const c = hash3(ix, iy + 1, seed);
  const d = hash3(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

type CellBox = { left: number; right: number; top: number; bottom: number };

type Hole = {
  field: (x: number, y: number) => number;
  mid: { x: number; y: number };
  halfLength: number;
  path: { x: number; y: number; along: boolean }[];
};

function buildHole(board: SinkholeBoard, chain: CollapseChain, seed: number): Hole {
  const lines = board.ascii.split("\n");
  const inChain = new Set(chain.map((c) => `${c.col},${c.row}`));
  const isWall = (col: number, row: number): boolean => "#H=".includes(lines[row]?.[col] ?? "#");
  const { bulge, jag, lumps, taper } = SINKHOLE_STYLE;
  const rc = (T / 2 + bulge) * taper;
  const boxes: CellBox[] = [];
  const ends = new Map<string, { x0: number; y0: number; sides: number[] }>();
  for (const { col, row } of chain) {
    const x0 = col * T;
    const y0 = row * T;
    const kinds = SIDES.map(({ dx, dy }) => {
      if (inChain.has(`${col + dx},${row + dy}`)) return "chain";
      return isWall(col + dx, row + dy) ? "wall" : "end";
    });
    const edge = (kind: string, outward: number, base: number): number =>
      kind === "chain"
        ? base + outward * rc
        : kind === "wall"
          ? base + outward * (bulge - rc)
          : base - outward * rc;
    boxes.push({
      top: edge(kinds[0]!, -1, y0),
      bottom: edge(kinds[1]!, 1, y0 + T),
      left: edge(kinds[2]!, -1, x0),
      right: edge(kinds[3]!, 1, x0 + T),
    });
    const endSides = kinds.flatMap((kind, side) => (kind === "end" ? [side] : []));
    if (endSides.length > 0) {
      ends.set(`${col},${row}`, { x0, y0, sides: endSides });
    }
  }
  const boxDistance = (box: CellBox, x: number, y: number): number => {
    const dx = Math.max(box.left - x, x - box.right);
    const dy = Math.max(box.top - y, y - box.bottom);
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
  };
  const sealed = (x: number, y: number): boolean => {
    const col = Math.floor(x / T);
    const row = Math.floor(y / T);
    if (!inChain.has(`${col},${row}`)) return false;
    const end = ends.get(`${col},${row}`);
    if (end === undefined) return true;
    return end.sides.every((side) => {
      const local =
        side === 0
          ? y - end.y0
          : side === 1
            ? end.y0 + T - y
            : side === 2
              ? x - end.x0
              : end.x0 + T - x;
      return local >= SEAL_END_PX;
    });
  };
  const field = (x: number, y: number): number => {
    const px = x + 0.5;
    const py = y + 0.5;
    let sd = Infinity;
    for (const box of boxes) {
      sd = Math.min(sd, boxDistance(box, px, py));
    }
    const fine = (noise2(x / 2.6, y / 2.6, seed) - 0.5) * 2 * jag * 2.6;
    const lump = (noise2(x / 8, y / 8, seed + 40) - 0.5) * 2 * lumps * 4.2;
    const value = sd - rc + fine + lump;
    return sealed(x, y) ? Math.min(value, -0.5) : value;
  };

  const centres = chain.map((c) => ({ x: c.col * T + T / 2, y: c.row * T + T / 2 }));
  const first = centres[0]!;
  const second = centres[1]!;
  const last = centres[centres.length - 1]!;
  const before = centres[centres.length - 2]!;
  const unit = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: Math.sign(b.x - a.x),
    y: Math.sign(b.y - a.y),
  });
  const head = unit(second, first);
  const tail = unit(before, last);
  const lead = T / 2 + SLIT_OVERSHOOT_PX;
  const waypoints = [
    { x: first.x + head.x * lead, y: first.y + head.y * lead },
    ...centres,
    { x: last.x + tail.x * lead, y: last.y + tail.y * lead },
  ];
  const path: Hole["path"] = [];
  for (let i = 0; i + 1 < waypoints.length; i += 1) {
    const a = waypoints[i]!;
    const b = waypoints[i + 1]!;
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    const along = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    for (let s = 0; s < steps; s += 1) {
      path.push({
        x: Math.floor(a.x + (steps === 0 ? 0 : ((b.x - a.x) * s) / steps)),
        y: Math.floor(a.y + (steps === 0 ? 0 : ((b.y - a.y) * s) / steps)),
        along,
      });
    }
  }
  const mid = path[Math.floor(path.length / 2)]!;
  return { field, mid, halfLength: Math.max(1, path.length / 2), path };
}

export function buildSinkholeArt(
  board: SinkholeBoard,
  chain: CollapseChain,
  seed: number,
): SinkholeArt {
  const hole = buildHole(board, chain, seed);
  const { field } = hole;
  const style = SINKHOLE_STYLE;
  const lines = board.ascii.split("\n");
  const width = lines[0]!.length * T;
  const height = lines.length * T;
  const cols = chain.map((c) => c.col);
  const rows = chain.map((c) => c.row);
  const reach = Math.ceil(T / 2 + style.bulge + style.crackLen + 8);
  const x0 = Math.max(0, Math.min(...cols) * T - reach);
  const x1 = Math.min(width - 1, (Math.max(...cols) + 1) * T + reach);
  const y0 = Math.max(0, Math.min(...rows) * T - reach);
  const y1 = Math.min(height - 1, (Math.max(...rows) + 1) * T + reach);
  const inArt = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height;
  let depth = T / 2 + style.bulge + OPEN_DEPTH_PAD;
  const lagOf = (x: number, y: number): number =>
    Math.min(1.2, Math.hypot(x + 0.5 - hole.mid.x, y + 0.5 - hole.mid.y) / hole.halfLength);
  const openAt = (value: number, x: number, y: number): number =>
    clamp01((1 + value / depth + style.spread * lagOf(x, y)) / (1 + style.spread));
  const rimAt = (value: number, x: number, y: number): number =>
    clamp01(
      (1 - (style.rimWidth - value) / depth + style.spread * lagOf(x, y)) / (1 + style.spread),
    );
  const crackReach = hole.halfLength + style.crackLen + SLIT_OVERSHOOT_PX;
  const crackFrom = (x: number, y: number): number =>
    clamp01(Math.hypot(x + 0.5 - hole.mid.x, y + 0.5 - hole.mid.y) / crackReach);

  const pixels: SinkholePixel[] = [];
  const values = new Map<number, number>();
  const valueAt = (x: number, y: number): number => {
    const key = y * width + x;
    let value = values.get(key);
    if (value === undefined) {
      value = field(x, y);
      values.set(key, value);
    }
    return value;
  };

  let deepest = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      deepest = Math.min(deepest, valueAt(x, y));
    }
  }
  depth = Math.max(depth, OPEN_DEPTH_FLOOR - deepest);

  const rimTone = (x: number, y: number): SinkholeTone => {
    const gx = valueAt(Math.min(width - 1, x + 1), y) - valueAt(Math.max(0, x - 1), y);
    const gy = valueAt(x, Math.min(height - 1, y + 1)) - valueAt(x, Math.max(0, y - 1));
    const length = Math.hypot(gx, gy) || 1;
    const facing = (gx / length) * 0.7 + (gy / length) * 0.7;
    if (hash3(x, y, seed + 9) < style.slump * 0.4) return SINKHOLE_TONE.slump;
    if (facing > 0.6) return SINKHOLE_TONE.litHard;
    return facing > 0.1 ? SINKHOLE_TONE.litSoft : SINKHOLE_TONE.earth;
  };

  const starts: { x: number; y: number }[] = [];
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const value = valueAt(x, y);
      if (value > style.rimWidth) {
        continue;
      }
      pixels.push({
        x,
        y,
        tone: rimTone(x, y),
        crackFrom: 0,
        openFrom: rimAt(value, x, y),
        openUntil: value < 0 ? openAt(value, x, y) : NEVER,
      });
    }
  }
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const value = valueAt(x, y);
      if (value > 0.4 && value < style.rimWidth + 1.2) {
        starts.push({ x, y });
      }
    }
  }

  const next = randomFromSeed(`sinkhole-cracks:${seed}`);
  const gradientDir = (x: number, y: number): number => {
    const gx = valueAt(Math.min(width - 1, x + 1), y) - valueAt(Math.max(0, x - 1), y);
    const gy = valueAt(x, Math.min(height - 1, y + 1)) - valueAt(x, Math.max(0, y - 1));
    const angle = Math.atan2(gy, gx);
    return ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  };
  const crackCells = new Set<number>();
  const stack: { x: number; y: number; dir: number; len: number }[] = [];
  for (let i = 0; i < style.cracks && starts.length > 0; i += 1) {
    const start = starts[Math.floor(next() * starts.length)]!;
    stack.push({
      ...start,
      dir: gradientDir(start.x, start.y),
      len: Math.max(2, Math.round(style.crackLen * (0.5 + next() * 0.9))),
    });
  }
  const turn = (dir: number): number => (dir + (next() < 0.5 ? 1 : 7)) % 8;
  while (stack.length > 0) {
    const crack = stack.pop()!;
    let { x, y, dir } = crack;
    for (let step = 0; step < crack.len; step += 1) {
      if (next() < style.crackWobble) {
        dir = turn(dir);
      }
      x += DIRS[dir]![0];
      y += DIRS[dir]![1];
      if (inArt(x, y) && valueAt(x, y) > 0) {
        crackCells.add(y * width + x);
      }
      if (step > 2 && crack.len - step > 3 && next() < style.branch * 0.12) {
        stack.push({ x, y, dir: turn(dir), len: Math.round((crack.len - step) * 0.6) });
      }
    }
  }
  for (const key of crackCells) {
    const x = key % width;
    const y = Math.floor(key / width);
    pixels.push({
      x,
      y,
      tone: SINKHOLE_TONE.crack,
      crackFrom: crackFrom(x, y),
      openFrom: 0,
      openUntil: NEVER,
    });
  }

  const slit = new Set<number>();
  hole.path.forEach((point, index) => {
    const offset = Math.round((noise2(index / 2.4, 0, seed + 90) - 0.5) * 3.4);
    const x = point.along ? point.x : point.x + offset;
    const y = point.along ? point.y + offset : point.y;
    const from = clamp01(Math.abs(index + 0.5 - hole.halfLength) / hole.halfLength);
    const thick = from < MID_SLIT_SHARE || hash3(index, 1, seed + 91) < 0.35;
    const entries: [number, number, SinkholeTone][] = [[x, y, SINKHOLE_TONE.crack]];
    if (thick) {
      entries.push(
        point.along ? [x, y + 1, SINKHOLE_TONE.crackLip] : [x + 1, y, SINKHOLE_TONE.crackLip],
      );
    }
    if (hash3(index, 2, seed + 92) < 0.12) {
      entries.push(point.along ? [x, y - 1, SINKHOLE_TONE.crack] : [x - 1, y, SINKHOLE_TONE.crack]);
    }
    for (const [px, py, tone] of entries) {
      if (inArt(px, py) && !slit.has(py * width + px)) {
        slit.add(py * width + px);
        pixels.push({ x: px, y: py, tone, crackFrom: from, openFrom: 0, openUntil: NEVER });
      }
    }
  });

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const value = valueAt(x, y);
      if (value >= 0) {
        continue;
      }
      pixels.push({
        x,
        y,
        tone: -value >= style.bandWidth ? SINKHOLE_TONE.voidDeep : SINKHOLE_TONE.voidEdge,
        crackFrom: 0,
        openFrom: openAt(value, x, y),
        openUntil: NEVER,
      });
    }
  }
  return { pixels };
}
