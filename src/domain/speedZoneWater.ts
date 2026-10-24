import type { MazeLayout } from "./maze";
import { speedZoneFastVector, type SpeedZone, type SpeedZoneEffect } from "./speedZones";

export const SPEED_ZONE_WATER_ART_TILE = 16;
const ART = SPEED_ZONE_WATER_ART_TILE;
const CANVAS_PAD_TILES = 3;

export type SpeedZoneFlowSpeeds = { entryTilesPerSec: number; exitTilesPerSec: number };

export const DEFAULT_SPEED_ZONE_FLOW_SPEEDS: SpeedZoneFlowSpeeds = {
  entryTilesPerSec: 1.4,
  exitTilesPerSec: 12,
};

export const SPEED_ZONE_WATER_STYLE = {
  widthPx: 13,
  deep: 0x0163c6,
  mid: 0x64a5ff,
  light: 0xb2d2ff,
  foam: 0xb8cfff,
  rippleHz: 3,
  rippleDuty: 0.25,
  chevron: 0.6,
  sparkle: 0.1,
  swell: 0.15,
  streaksPerTile: 0.5,
  streakBlurSec: 0.015,
  sprayPerSec: 57,
  sprayReachTiles: 1.8,
  spraySpreadDeg: 35,
  sprayLifeMs: 340,
  foamCap: 0.55,
  sideSpray: 0.45,
  wakePerSec: 90,
  wakeLifeMs: 300,
} as const;

const S = SPEED_ZONE_WATER_STYLE;
const SPRAY_DRAG = 4;
const WAKE_DRAG = 5;

export type WaterCanvas = {
  x: number;
  y: number;
  width: number;
  height: number;
  rgba: Uint8ClampedArray<ArrayBuffer>;
};

export function waterCellOpen(
  board: Pick<MazeLayout, "walls" | "house" | "door">,
  col: number,
  row: number,
): boolean {
  return (
    board.walls[row]?.[col] === false &&
    board.house[row]?.[col] !== true &&
    board.door[row]?.[col] !== true
  );
}

function hash3(a: number, b: number, c: number): number {
  let h =
    (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function noise1(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash3(i, seed, 7);
  return a + (hash3(i + 1, seed, 7) - a) * f * f * (3 - 2 * f);
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

function mix(a: number, b: number, t: number): number {
  const ch = (shift: number) => {
    const x = (a >> shift) & 0xff;
    return Math.round(x + (((b >> shift) & 0xff) - x) * t) << shift;
  };
  return ch(16) | ch(8) | ch(0);
}

export function flowProfile(length: number, entry: number, exit: number) {
  const growth = (exit - entry) / length;
  const flat = Math.abs(growth) < 1e-9;
  const timeTo = (along: number) =>
    flat ? along / entry : Math.log1p((growth * along) / entry) / growth;
  return {
    speed: (along: number) => entry + growth * along,
    timeTo,
    alongAt: (seconds: number) =>
      flat ? entry * seconds : (entry / growth) * Math.expm1(growth * seconds),
    crossingSec: timeTo(length),
  };
}

type LaneFrame = { ox: number; oy: number; fx: number; fy: number; sx: number; sy: number };

function laneFrame(zone: SpeedZone): LaneFrame {
  const { dx: fx, dy: fy } = speedZoneFastVector(zone);
  const end = zone.length * ART;
  if (zone.axis === "horizontal") {
    return {
      ox: zone.col * ART + (fx < 0 ? end : 0),
      oy: (zone.row + 0.5) * ART,
      fx,
      fy,
      sx: 0,
      sy: 1,
    };
  }
  return {
    ox: (zone.col + 0.5) * ART,
    oy: zone.row * ART + (fy < 0 ? end : 0),
    fx,
    fy,
    sx: 1,
    sy: 0,
  };
}

function lanePoint(frame: LaneFrame, along: number, across: number): [number, number] {
  return [
    frame.ox + (frame.fx * along + frame.sx * across) * ART,
    frame.oy + (frame.fy * along + frame.sy * across) * ART,
  ];
}

function laneCoords(frame: LaneFrame, x: number, y: number): [number, number] {
  const dx = x + 0.5 - frame.ox;
  const dy = y + 0.5 - frame.oy;
  return [(dx * frame.fx + dy * frame.fy) / ART, (dx * frame.sx + dy * frame.sy) / ART];
}

export function speedZoneWaterCanvas(zone: SpeedZone): WaterCanvas {
  const cols = (zone.axis === "horizontal" ? zone.length : 1) + CANVAS_PAD_TILES * 2;
  const rows = (zone.axis === "vertical" ? zone.length : 1) + CANVAS_PAD_TILES * 2;
  return {
    x: (zone.col - CANVAS_PAD_TILES) * ART,
    y: (zone.row - CANVAS_PAD_TILES) * ART,
    width: cols * ART,
    height: rows * ART,
    rgba: new Uint8ClampedArray(cols * rows * ART * ART * 4),
  };
}

export function paintSpeedZoneWater(
  canvas: WaterCanvas,
  zone: SpeedZone,
  nowMs: number,
  flow: SpeedZoneFlowSpeeds,
  isOpen: (col: number, row: number) => boolean,
): void {
  canvas.rgba.fill(0);
  const plot = (bx: number, by: number, color: number, alpha: number): void => {
    const x = Math.floor(bx) - canvas.x;
    const y = Math.floor(by) - canvas.y;
    if (alpha <= 0 || x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
      return;
    }
    if (!isOpen(Math.floor(bx / ART), Math.floor(by / ART))) {
      return;
    }
    const a = Math.min(1, alpha);
    const i = (y * canvas.width + x) * 4;
    const below = canvas.rgba[i + 3]! / 255;
    const out = a + below * (1 - a);
    for (let k = 0; k < 3; k += 1) {
      const c = (color >> (16 - k * 8)) & 0xff;
      canvas.rgba[i + k] = (c * a + canvas.rgba[i + k]! * below * (1 - a)) / out;
    }
    canvas.rgba[i + 3] = out * 255;
  };

  const s = nowMs / 1000;
  const length = zone.length;
  const frame = laneFrame(zone);
  const profile = flowProfile(length, flow.entryTilesPerSec, flow.exitTilesPerSec);
  const halfW = S.widthPx / 2 / ART;
  const seed = zone.col * 31 + zone.row * 17;
  const horizontal = zone.axis === "horizontal";
  const x0 = zone.col * ART;
  const y0 = zone.row * ART;
  const x1 = x0 + (horizontal ? length : 1) * ART;
  const y1 = y0 + (horizontal ? 1 : length) * ART;

  const swell = S.swell * 0.35 * (0.5 + 0.5 * Math.sin(s * Math.PI * 2 * 1.1));
  const glintTick = Math.floor(nowMs / 110);
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const [along, across] = laneCoords(frame, x, y);
      if (along < 0 || along > length || Math.abs(across) > halfW) {
        continue;
      }
      const progress = along / length;
      const centred = Math.abs(across) / halfW;
      let color: number = S.deep;
      let alpha = (1 + swell * Math.max(0, 1 - along / 2.2)) * clamp01(along / 0.35 + 0.35);
      const lead = S.chevron * (1 - centred * centred) * 0.22;
      const phase =
        (s - profile.timeTo(along) + lead) * S.rippleHz +
        (noise1((across * ART) / 3.5, seed + 3) - 0.5) * 0.5;
      if (phase - Math.floor(phase) < S.rippleDuty) {
        color = mix(S.mid, S.light, clamp01(progress * 1.2 - 0.1));
        alpha = Math.max(alpha, 0.55 + 0.45 * progress);
      }
      if (hash3(x, y, glintTick) < S.sparkle * 0.025 * (0.3 + progress)) {
        color = S.foam;
        alpha = 1;
      }
      plot(x, y, color, alpha);
    }
  }

  const streaks = Math.round(S.streaksPerTile * length);
  for (let i = 0; i < streaks; i += 1) {
    const scale = 1 + hash3(seed, i, 1) * 0.15;
    const own = flowProfile(length, flow.entryTilesPerSec * scale, flow.exitTilesPerSec * scale);
    const along = own.alongAt((hash3(seed, i, 2) * own.crossingSec + s) % own.crossingSec);
    const progress = along / length;
    const across = (hash3(seed, i, 3) - 0.5) * 2 * halfW * 0.78 + Math.sin(s * 3 + i) * 0.02;
    const trail = Math.max(1, own.speed(along) * S.streakBlurSec * ART);
    const color =
      progress < 0.5
        ? mix(S.mid, S.light, progress * 2)
        : mix(S.light, S.foam, (progress - 0.5) * 2);
    const fade = clamp01(along / 0.6);
    for (let q = 0; q < trail && along - q / ART >= 0; q += 1) {
      const [px, py] = lanePoint(frame, along - q / ART, across);
      plot(px, py, color, fade * (1 - (q / trail) * 0.65));
    }
  }

  const [ex, ey] = lanePoint(frame, length, 0);
  const capRadius = halfW * ART * 1.15;
  const foamTick = Math.floor(nowMs / 70);
  for (let y = Math.floor(ey - capRadius); y <= ey + capRadius; y += 1) {
    for (let x = Math.floor(ex - capRadius); x <= ex + capRadius; x += 1) {
      const [along] = laneCoords(frame, x, y);
      const d = Math.hypot(x + 0.5 - ex, y + 0.5 - ey) / capRadius;
      if (along < length - 0.55 || d > 1) {
        continue;
      }
      if (hash3(x, y, foamTick) < S.foamCap * (1 - d) * 1.6) {
        plot(x, y, S.foam, 1);
      } else if (along <= length && d < 0.8) {
        plot(x, y, S.light, S.foamCap * 0.6);
      }
    }
  }

  const burst = (
    perSec: number,
    lifeSec: number,
    emit: (k: number, f: number, age: number) => void,
  ): void => {
    for (let k = Math.ceil((s - lifeSec) * perSec); k <= Math.floor(s * perSec); k += 1) {
      const age = s - k / perSec;
      if (age >= 0 && age <= lifeSec) {
        emit(k, age / lifeSec, age);
      }
    }
  };

  const spread = (S.spraySpreadDeg * Math.PI) / 180;
  const sprayLife = S.sprayLifeMs / 1000;
  const sprayTravel = 1 - Math.exp(-SPRAY_DRAG * sprayLife);
  burst(S.sprayPerSec, sprayLife, (k, f, age) => {
    const angle = (hash3(seed, k, 21) - 0.5) * 2 * spread;
    const reach = S.sprayReachTiles * (0.35 + 0.65 * hash3(seed, k, 22));
    const dist = (reach * (1 - Math.exp(-SPRAY_DRAG * age))) / sprayTravel;
    const start = (hash3(seed, k, 23) - 0.5) * 2 * halfW * 0.7;
    const [px, py] = lanePoint(
      frame,
      length + Math.cos(angle) * dist,
      start + Math.sin(angle) * dist,
    );
    const color = mix(S.foam, S.light, f);
    const size = f < 0.35 && hash3(seed, k, 24) < 0.6 ? 2 : 1;
    for (let oy = 0; oy < size; oy += 1) {
      for (let ox = 0; ox < size; ox += 1) {
        plot(px + ox, py + oy, color, 1 - f * f);
      }
    }
  });

  burst(S.sideSpray * 40, 0.35, (k, f, age) => {
    const start = length * Math.sqrt(0.05 + 0.95 * hash3(seed, k, 31));
    const side = hash3(seed, k, 32) < 0.5 ? -1 : 1;
    const out = (1.6 * (0.5 + hash3(seed, k, 33)) * (1 - Math.exp(-5 * age))) / 5;
    const [px, py] = lanePoint(
      frame,
      start + profile.speed(start) * 0.25 * age,
      side * (halfW + out),
    );
    plot(px, py, f < 0.4 ? S.foam : S.light, 1 - f);
  });
}

export type WakeRider = { x: number; y: number; dx: number; dy: number; effect: SpeedZoneEffect };

export type WakeDroplet = {
  bornMs: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  big: boolean;
};

export type WakePixel = { x: number; y: number; size: number; color: number; alpha: number };

function spawnWakeDroplet(k: number, bornMs: number, rider: WakeRider): WakeDroplet {
  const side = hash3(k, 1, 41) < 0.5 ? -1 : 1;
  const withFlow = rider.effect === "fast";
  const angle = (withFlow ? 0.15 + hash3(k, 2, 41) * 0.3 : 1.5 + hash3(k, 2, 41) * 0.8) * side;
  const perpX = -rider.dy;
  const perpY = rider.dx;
  const dirX = -rider.dx * Math.cos(angle) + perpX * Math.sin(angle);
  const dirY = -rider.dy * Math.cos(angle) + perpY * Math.sin(angle);
  const speed = withFlow ? 50 + hash3(k, 3, 41) * 40 : 22 + hash3(k, 3, 41) * 18;
  const lead = withFlow ? -6 : 5;
  const offset = withFlow ? 0 : 2;
  return {
    bornMs,
    x: rider.x + rider.dx * lead + dirX * offset,
    y: rider.y + rider.dy * lead + dirY * offset,
    vx: dirX * speed,
    vy: dirY * speed,
    big: hash3(k, 4, 41) < 0.7,
  };
}

export function stepWakeDroplets(
  droplets: readonly WakeDroplet[],
  rider: WakeRider | null,
  previousMs: number,
  nowMs: number,
): WakeDroplet[] {
  const kept = droplets.filter((d) => d.bornMs <= nowMs && nowMs - d.bornMs < S.wakeLifeMs);
  if (rider === null || nowMs <= previousMs) {
    return kept;
  }
  const slot = (ms: number) => Math.floor((ms * S.wakePerSec) / 1000);
  const first = slot(Math.max(previousMs, nowMs - S.wakeLifeMs)) + 1;
  for (let k = first; k <= slot(nowMs); k += 1) {
    kept.push(spawnWakeDroplet(k, Math.min(nowMs, (k * 1000) / S.wakePerSec), rider));
  }
  return kept;
}

export function wakePixels(
  droplets: readonly WakeDroplet[],
  nowMs: number,
  isOpen: (col: number, row: number) => boolean,
): WakePixel[] {
  return droplets.flatMap((d) => {
    const age = (nowMs - d.bornMs) / 1000;
    const f = (nowMs - d.bornMs) / S.wakeLifeMs;
    const travel = (1 - Math.exp(-WAKE_DRAG * age)) / WAKE_DRAG;
    const x = Math.floor(d.x + d.vx * travel);
    const y = Math.floor(d.y + d.vy * travel);
    if (f < 0 || f >= 1 || !isOpen(Math.floor(x / ART), Math.floor(y / ART))) {
      return [];
    }
    return [
      { x, y, size: f < 0.6 && d.big ? 2 : 1, color: mix(S.foam, S.light, f), alpha: 1 - f * f },
    ];
  });
}
