import type { CollapseChain } from "./collapse";
import { clampedWallInset, pelletDisplaySize, powerPelletDisplaySize } from "./maze";
import { randomFromSeed } from "./mazeTiling";
import { WALL_ART_PX, type WallRect } from "./pixelWall";

export const RUBBLE_STYLE = {
  reach: 8,
  spill: 3,
  stable: 3,
  cobble: 9,
  grain: 4,
  ragged: 4,
  shine: 0.5,
  dust: 1,
} as const;

export const RUBBLE_TONE = { outline: 0, fill: 1, fillLight: 2, light: 3, ground: 4 } as const;

export type RubbleTone = (typeof RUBBLE_TONE)[keyof typeof RUBBLE_TONE];

const FILL_MIX = 0.35;
const FILL_LIGHT_MIX = 0.58;
const LIGHT_MIX = 0.23;

export function mixColor(from: number, to: number, amount: number): number {
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * amount) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

export function rubblePalette(wallColor: number, ground: number): readonly number[] {
  const palette: number[] = [];
  palette[RUBBLE_TONE.outline] = wallColor;
  palette[RUBBLE_TONE.fill] = mixColor(ground, wallColor, FILL_MIX);
  palette[RUBBLE_TONE.fillLight] = mixColor(ground, wallColor, FILL_LIGHT_MIX);
  palette[RUBBLE_TONE.light] = mixColor(wallColor, 0xffffff, LIGHT_MIX);
  palette[RUBBLE_TONE.ground] = ground;
  return palette;
}

export type RubblePixel = { x: number; y: number; tone: RubbleTone };

export type RubbleMote = {
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  delayMs: number;
  durationMs: number;
  phase: number;
  amp: number;
};

export type RubbleArt = { pixels: readonly RubblePixel[]; motes: readonly RubbleMote[] };

export type CollapseArt = RubbleArt & { fresh: boolean };

export type CollapseRenderState = {
  key: string;
  arts: readonly CollapseArt[];
  introMs: number;
};

export type RubbleBoard = {
  ascii: string;
  tileSize: number;
  blockedPixels: ReadonlySet<number>;
};

const SIDES = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
] as const;

const NOISE_SPAN = 3.6;
const MOTE_NEAR_PX = 4;
const MOTE_PILE_DIVISOR = 16;
const MOTE_MAX_DELAY_MS = 1100;
const MOTE_MIN_FLIGHT_MS = 900;
const MOTE_FLIGHT_SPREAD_MS = 1100;
const MOTE_WOBBLE_MIN = 1.5;
const MOTE_WOBBLE_SPREAD = 2.5;

export const RUBBLE_INTRO_MS = MOTE_MAX_DELAY_MS + MOTE_MIN_FLIGHT_MS + MOTE_FLIGHT_SPREAD_MS;

function hash3(a: number, b: number, c: number): number {
  let h =
    (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function valueNoise(channel: number, t: number, seed: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const a = hash3(channel, i, seed);
  const b = hash3(channel, i + 1, seed);
  return a + (b - a) * f * f * (3 - 2 * f);
}

function chunkAt(x: number, y: number, size: number, seed: number): { id: number; gap: number } {
  const gx = Math.floor(x / size);
  const gy = Math.floor(y / size);
  let nearest = Infinity;
  let second = Infinity;
  let id = 0;
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      const sx = (gx + ox) * size + 0.5 + hash3(gx + ox, gy + oy, seed + 1) * (size - 1);
      const sy = (gy + oy) * size + 0.5 + hash3(gx + ox, gy + oy, seed + 2) * (size - 1);
      const dist = Math.hypot(x + 0.5 - sx, y + 0.5 - sy);
      if (dist < nearest) {
        second = nearest;
        nearest = dist;
        id = (gx + ox) * 977 + (gy + oy);
      } else if (dist < second) {
        second = dist;
      }
    }
  }
  return { id, gap: second - nearest };
}

export function rubbleElapsedMs(art: Pick<CollapseArt, "fresh">, introMs: number): number {
  return art.fresh ? introMs : Infinity;
}

export function rubbleIntroSettled(state: CollapseRenderState): boolean {
  return state.arts.every((art) => !art.fresh) || state.introMs >= RUBBLE_INTRO_MS;
}

export function rubbleMotePosition(
  mote: RubbleMote,
  elapsedMs: number,
): { x: number; y: number; landed: boolean } {
  const u = Math.min(1, Math.max(0, (elapsedMs - mote.delayMs) / mote.durationMs));
  if (u >= 1) {
    return { x: mote.x, y: mote.y, landed: true };
  }
  const eased = u * u * (3 - 2 * u);
  const dx = mote.x - mote.fromX;
  const dy = mote.y - mote.fromY;
  const length = Math.hypot(dx, dy) || 1;
  const wobble = Math.sin(u * 9 + mote.phase) * mote.amp * (1 - u);
  return {
    x: Math.round(mote.fromX + dx * eased - (dy / length) * wobble),
    y: Math.round(mote.fromY + dy * eased + (dx / length) * wobble),
    landed: false,
  };
}

export function buildRubbleArt(board: RubbleBoard, chain: CollapseChain, seed: number): RubbleArt {
  const style = RUBBLE_STYLE;
  const lines = board.ascii.split("\n");
  const rows = lines.length;
  const cols = lines[0]!.length;
  const tile = Math.round(board.tileSize / WALL_ART_PX);
  const width = cols * tile;
  const height = rows * tile;
  const wallEnd = Math.round(clampedWallInset() / WALL_ART_PX);
  const region = new Uint8Array(width * height);
  const chainPixels = new Uint8Array(width * height);
  const cells = new Set(chain.map((c) => c.row * cols + c.col));
  const inBounds = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height;
  const mark = (x: number, y: number): void => {
    if (inBounds(x, y)) {
      region[y * width + x] = 1;
    }
  };
  const cut = (x: number, y: number): void => {
    if (inBounds(x, y)) {
      region[y * width + x] = 0;
    }
  };
  const isWall = (col: number, row: number): boolean => lines[row]?.[col] === "#";

  const wallHigh = style.reach;
  const wallLow = Math.max(3, style.reach - style.ragged);
  const endHigh = Math.max(0, style.spill - wallEnd);
  const endLow = Math.max(0, endHigh - style.ragged);
  const lateral = style.reach + 2;
  const ends: { x0: number; y0: number; dx: number; dy: number; kinds: string[] }[] = [];

  for (const { col, row } of chain) {
    const x0 = col * tile;
    const y0 = row * tile;
    for (let y = 0; y < tile; y += 1) {
      for (let x = 0; x < tile; x += 1) {
        mark(x0 + x, y0 + y);
        chainPixels[(y0 + y) * width + x0 + x] = 1;
      }
    }
    const kinds = SIDES.map(({ dx, dy }) => {
      const nc = col + dx;
      const nr = row + dy;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) return "wall";
      if (cells.has(nr * cols + nc)) return "chain";
      return isWall(nc, nr) ? "wall" : "end";
    });
    SIDES.forEach(({ dx, dy }, side) => {
      const kind = kinds[side]!;
      if (kind === "chain") {
        return;
      }
      if (kind === "end") {
        ends.push({ x0, y0, dx, dy, kinds });
      }
      const high = kind === "wall" ? wallHigh : endHigh;
      const low = kind === "wall" ? wallLow : endLow;
      const edge = dy === -1 ? y0 : dy === 1 ? y0 + tile : dx === -1 ? x0 : x0 + tile;
      for (let s = 0; s < tile; s += 1) {
        const along = dy !== 0 ? x0 + s : y0 + s;
        const noise = valueNoise(side * 10000 + edge, along / NOISE_SPAN, seed);
        const depth = Math.min(high, Math.round(low + (high - low + 0.49) * noise));
        for (let q = 0; q < depth; q += 1) {
          if (dy === -1) mark(x0 + s, y0 - 1 - q);
          else if (dy === 1) mark(x0 + s, y0 + tile + q);
          else if (dx === -1) mark(x0 - 1 - q, y0 + s);
          else mark(x0 + tile + q, y0 + s);
        }
      }
    });
    const corner = Math.max(0, style.reach - 2);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        if (kinds[sx < 0 ? 2 : 3] !== "wall" || kinds[sy < 0 ? 0 : 1] !== "wall") {
          continue;
        }
        for (let a = 0; a < corner; a += 1) {
          for (let b = 0; b < corner - a + 1 && b < corner; b += 1) {
            mark(sx < 0 ? x0 - 1 - a : x0 + tile + a, sy < 0 ? y0 - 1 - b : y0 + tile + b);
          }
        }
      }
    }
  }

  const lead = wallEnd - style.spill;
  const ragged = Math.min(style.ragged, 2);
  for (const { x0, y0, dx, dy, kinds } of ends) {
    const left = kinds[2] === "wall" ? lateral : 0;
    const right = kinds[3] === "wall" ? lateral : 0;
    const top = kinds[0] === "wall" ? lateral : 0;
    const bottom = kinds[1] === "wall" ? lateral : 0;
    if (dy !== 0) {
      for (let x = x0 - left; x < x0 + tile + right; x += 1) {
        const off = Math.round(valueNoise(77000 + dy * 5 + y0, x / NOISE_SPAN, seed) * ragged);
        if (dy < 0) {
          for (let y = y0 - 14; y < y0 + lead + off; y += 1) cut(x, y);
        } else {
          for (let y = y0 + tile - lead - off; y < y0 + tile + 14; y += 1) cut(x, y);
        }
      }
    } else {
      for (let y = y0 - top; y < y0 + tile + bottom; y += 1) {
        const off = Math.round(valueNoise(88000 + dx * 5 + x0, y / NOISE_SPAN, seed) * ragged);
        if (dx < 0) {
          for (let x = x0 - 14; x < x0 + lead + off; x += 1) cut(x, y);
        } else {
          for (let x = x0 + tile - lead - off; x < x0 + tile + 14; x += 1) cut(x, y);
        }
      }
    }
  }

  const reach = Math.max(0, style.spill - wallEnd);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      if (!region[p] || chainPixels[p] || isWall(Math.floor(x / tile), Math.floor(y / tile))) {
        continue;
      }
      let near = false;
      for (let dy = -reach; dy <= reach && !near; dy += 1) {
        for (let dx = -reach; dx <= reach; dx += 1) {
          if (inBounds(x + dx, y + dy) && chainPixels[(y + dy) * width + x + dx]) {
            near = true;
            break;
          }
        }
      }
      if (!near) {
        region[p] = 0;
      }
    }
  }

  const inRegion = (x: number, y: number): boolean => inBounds(x, y) && region[y * width + x] === 1;
  const isEdge = (x: number, y: number): boolean =>
    inRegion(x, y) &&
    !(inRegion(x - 1, y) && inRegion(x + 1, y) && inRegion(x, y - 1) && inRegion(x, y + 1));
  const depthAt = (x: number, y: number): number => {
    const limit = style.stable + 2;
    let best = limit;
    for (let dy = -limit; dy <= limit; dy += 1) {
      for (let dx = -limit; dx <= limit; dx += 1) {
        if (!inRegion(x + dx, y + dy)) {
          best = Math.min(best, Math.hypot(dx, dy));
        }
      }
    }
    return best;
  };

  const pixels: RubblePixel[] = [];
  const pile: { x: number; y: number }[] = [];
  const stableSeed = seed + 11;
  const grainSeed = seed + 21;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!inRegion(x, y)) {
        continue;
      }
      if (isEdge(x, y)) {
        pixels.push({ x, y, tone: RUBBLE_TONE.outline });
        continue;
      }
      pile.push({ x, y });
      const rim = (hash3(x >> 1, y >> 1, seed + 4) - 0.5) * 2;
      let tone: RubbleTone;
      if (style.stable > 0 && depthAt(x, y) <= style.stable + 1 + rim) {
        const chunk = chunkAt(x, y, style.cobble, stableSeed);
        if (chunk.gap < 0.9) {
          tone = RUBBLE_TONE.outline;
        } else if (
          chunkAt(x, y - 1, style.cobble, stableSeed).id !== chunk.id &&
          hash3(x, y, seed + 12) < style.shine
        ) {
          tone = RUBBLE_TONE.light;
        } else {
          tone = RUBBLE_TONE.ground;
        }
      } else {
        const chunk = chunkAt(x, y, style.grain, grainSeed);
        if (chunk.gap < 0.75) {
          tone = RUBBLE_TONE.ground;
        } else if (
          chunkAt(x, y - 1, style.grain, grainSeed).id !== chunk.id &&
          hash3(x, y, seed + 22) < style.shine * 0.7
        ) {
          tone = RUBBLE_TONE.light;
        } else {
          tone = hash3(chunk.id, 3, seed) < 0.5 ? RUBBLE_TONE.fill : RUBBLE_TONE.fillLight;
        }
      }
      pixels.push({ x, y, tone });
    }
  }

  return { pixels, motes: buildMotes(board, region, pile, width, height, seed, inRegion) };
}

function buildMotes(
  board: RubbleBoard,
  region: Uint8Array,
  pile: readonly { x: number; y: number }[],
  width: number,
  height: number,
  seed: number,
  inRegion: (x: number, y: number) => boolean,
): RubbleMote[] {
  const want = Math.round((pile.length / MOTE_PILE_DIVISOR) * RUBBLE_STYLE.dust);
  const motes: RubbleMote[] = [];
  if (pile.length === 0 || want === 0) {
    return motes;
  }
  const next = randomFromSeed(`rubble-motes:${seed}`);
  const taken = new Set<number>();
  for (let tries = 0; tries < want * 40 && motes.length < want; tries += 1) {
    const from = pile[Math.floor(next() * pile.length)]!;
    const angle = next() * Math.PI * 2;
    const distance = 3 + next() * 7;
    const x = Math.round(from.x + Math.cos(angle) * distance);
    const y = Math.round(from.y + Math.sin(angle) * distance);
    const index = y * width + x;
    if (
      x < 0 ||
      y < 0 ||
      x >= width ||
      y >= height ||
      region[index] === 1 ||
      board.blockedPixels.has(index) ||
      taken.has(index)
    ) {
      continue;
    }
    let near = false;
    for (let dy = -MOTE_NEAR_PX; dy <= MOTE_NEAR_PX && !near; dy += 1) {
      for (let dx = -MOTE_NEAR_PX; dx <= MOTE_NEAR_PX; dx += 1) {
        if (inRegion(x + dx, y + dy)) {
          near = true;
          break;
        }
      }
    }
    if (!near) {
      continue;
    }
    taken.add(index);
    motes.push({
      fromX: from.x,
      fromY: from.y,
      x,
      y,
      delayMs: next() * MOTE_MAX_DELAY_MS,
      durationMs: MOTE_MIN_FLIGHT_MS + next() * MOTE_FLIGHT_SPREAD_MS,
      phase: next() * Math.PI * 2,
      amp: MOTE_WOBBLE_MIN + next() * MOTE_WOBBLE_SPREAD,
    });
  }
  return motes;
}

export function rubbleBlockedPixels(
  ascii: string,
  tileSize: number,
  wallRects: readonly WallRect[],
  origin: { x: number; y: number },
): Set<number> {
  const lines = ascii.split("\n");
  const cols = lines[0]!.length;
  const tile = Math.round(tileSize / WALL_ART_PX);
  const width = cols * tile;
  const height = lines.length * tile;
  const blocked = new Set<number>();
  const block = (x0: number, y0: number, x1: number, y1: number): void => {
    for (let y = Math.max(0, y0); y < Math.min(height, y1); y += 1) {
      for (let x = Math.max(0, x0); x < Math.min(width, x1); x += 1) {
        blocked.add(y * width + x);
      }
    }
  };
  for (const rect of wallRects) {
    block(
      Math.floor((rect.x - origin.x) / WALL_ART_PX),
      Math.floor((rect.y - origin.y) / WALL_ART_PX),
      Math.ceil((rect.x + rect.w - origin.x) / WALL_ART_PX),
      Math.ceil((rect.y + rect.h - origin.y) / WALL_ART_PX),
    );
  }
  lines.forEach((line, row) => {
    for (let col = 0; col < cols; col += 1) {
      const ch = line[col];
      if (ch !== "." && ch !== "@") {
        continue;
      }
      const size = ch === "." ? pelletDisplaySize(tileSize) : powerPelletDisplaySize(tileSize);
      const half = Math.ceil(size / 2 / WALL_ART_PX) + 1;
      const cx = col * tile + Math.floor(tile / 2);
      const cy = row * tile + Math.floor(tile / 2);
      block(cx - half, cy - half, cx + half, cy + half);
    }
  });
  return blocked;
}
