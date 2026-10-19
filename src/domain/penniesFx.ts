import { PENNIES_PER_QUARTER, penniesInCharge } from "./pennies";

export const PENNY_DROP_MS = 220;
export const PENNY_COLLAPSE_STAGGER_MS = 14;
export const PENNY_COLLAPSE_TRAVEL_MS = 420;
export const PENNY_COLLAPSE_MS =
  PENNY_COLLAPSE_STAGGER_MS * (PENNIES_PER_QUARTER - 1) + PENNY_COLLAPSE_TRAVEL_MS;
const DROP_INTERVAL_MS = 40;
const FAST_DROP_INTERVAL_MS = 20;
const SLOW_DROP_INTERVAL_MS = 90;
const FAST_DROP_BACKLOG = 12;
const DROP_HEIGHT_PX = 18;
const COLLAPSE_ARC_PX = 10;
const COLLAPSE_END_SIZE_FRAC = 0.6;
const CHROME_SHAKE_TIER = 8;
const HOP_BASE_MS = 260;
const HOP_WOBBLE_MS = 130;
const SETTLED_MS = -1e9;

export type PennyBumpFx = { hopPx: number; wobbles: number; chromeShake: boolean };

export type PennyFxState = {
  nowMs: number;
  row: number[];
  dropped: number;
  wraps: number;
  lastDropMs: number;
  slowDrops: boolean;
  collapseStartMs: number | null;
  landed: number;
  hop: { startMs: number; amp: number; wobbles: number } | null;
};

export type PennyGeometry = {
  x0: number;
  y: number;
  step: number;
  size: number;
  target: { x: number; y: number };
  targetSize: number;
};

export type PennyLook = { x: number; y: number; size: number; alpha: number };

export function pennyBumpFx(tier: number): PennyBumpFx {
  return {
    hopPx: Math.min(4, 1 + Math.floor(tier / 2)),
    wobbles: Math.min(3, Math.ceil(tier / 2)),
    chromeShake: tier >= CHROME_SHAKE_TIER,
  };
}

export function createPennyFx(charge: number): PennyFxState {
  const count = penniesInCharge(charge);
  return {
    nowMs: 0,
    row: Array<number>(count).fill(SETTLED_MS),
    dropped: count,
    wraps: 0,
    lastDropMs: SETTLED_MS,
    slowDrops: false,
    collapseStartMs: null,
    landed: 0,
    hop: null,
  };
}

export function fillPennyFx(s: PennyFxState, filled: number): PennyFxState {
  return { ...s, wraps: s.wraps + Math.max(0, filled) };
}

export function slowPennyFx(s: PennyFxState): PennyFxState {
  return { ...s, slowDrops: true };
}

export function bumpPennyFx(s: PennyFxState, fx: PennyBumpFx): PennyFxState {
  return { ...s, hop: { startMs: s.nowMs, amp: fx.hopPx, wobbles: fx.wobbles } };
}

export function pennyBacklog(s: PennyFxState, charge: number): number {
  return Math.max(0, s.wraps * PENNIES_PER_QUARTER + penniesInCharge(charge) - s.dropped);
}

export function pennyCollapsing(s: PennyFxState): boolean {
  return s.collapseStartMs !== null;
}

function dropInterval(backlog: number, slow: boolean): number {
  if (slow) {
    return SLOW_DROP_INTERVAL_MS;
  }
  return backlog > FAST_DROP_BACKLOG ? FAST_DROP_INTERVAL_MS : DROP_INTERVAL_MS;
}

export function stepPennyFx(s: PennyFxState, deltaMs: number, charge: number): PennyFxState {
  const nowMs = s.nowMs + Math.max(0, deltaMs);
  let { row, dropped, lastDropMs, slowDrops, collapseStartMs, landed, hop } = s;
  if (hop !== null && nowMs > hop.startMs + HOP_BASE_MS + HOP_WOBBLE_MS * hop.wobbles) {
    hop = null;
  }
  if (collapseStartMs !== null && nowMs >= collapseStartMs + PENNY_COLLAPSE_MS) {
    row = [];
    collapseStartMs = null;
    landed += 1;
  }
  const backlog = pennyBacklog(s, charge);
  if (collapseStartMs === null) {
    if (row.length >= PENNIES_PER_QUARTER) {
      if (nowMs - row[row.length - 1]! >= PENNY_DROP_MS) {
        collapseStartMs = nowMs;
      }
    } else if (backlog > 0 && nowMs - lastDropMs >= dropInterval(backlog, slowDrops)) {
      row = [...row, nowMs];
      dropped += 1;
      lastDropMs = nowMs;
    }
  }
  if (slowDrops && backlog === 0 && collapseStartMs === null) {
    slowDrops = false;
  }
  return { ...s, nowMs, row, dropped, lastDropMs, slowDrops, collapseStartMs, landed, hop };
}

function easeOutBounce(k: number): number {
  const n = 7.5625;
  if (k < 1 / 2.75) {
    return n * k * k;
  }
  if (k < 2 / 2.75) {
    const t = k - 1.5 / 2.75;
    return n * t * t + 0.75;
  }
  if (k < 2.5 / 2.75) {
    const t = k - 2.25 / 2.75;
    return n * t * t + 0.9375;
  }
  const t = k - 2.625 / 2.75;
  return n * t * t + 0.984375;
}

export function pennyHopOffset(s: PennyFxState): number {
  if (s.hop === null) {
    return 0;
  }
  const k = (s.nowMs - s.hop.startMs) / (HOP_BASE_MS + HOP_WOBBLE_MS * s.hop.wobbles);
  if (k < 0 || k > 1) {
    return 0;
  }
  return -Math.round(s.hop.amp * Math.abs(Math.sin(Math.PI * s.hop.wobbles * k)) * (1 - k));
}

export function pennyLooks(s: PennyFxState, geo: PennyGeometry): PennyLook[] {
  const hop = pennyHopOffset(s);
  const looks: PennyLook[] = [];
  s.row.forEach((bornMs, i) => {
    const x0 = geo.x0 + i * geo.step;
    if (s.collapseStartMs === null) {
      const k = Math.min(1, (s.nowMs - bornMs) / PENNY_DROP_MS);
      const y = geo.y + hop - DROP_HEIGHT_PX * (1 - easeOutBounce(k));
      looks.push({ x: x0, y, size: geo.size, alpha: Math.min(1, k * 4) });
      return;
    }
    const k = Math.min(
      1,
      Math.max(
        0,
        (s.nowMs - s.collapseStartMs - i * PENNY_COLLAPSE_STAGGER_MS) / PENNY_COLLAPSE_TRAVEL_MS,
      ),
    );
    if (k >= 1) {
      return;
    }
    const e = k * k;
    looks.push({
      x: x0 + (geo.target.x - x0) * e,
      y: geo.y + (geo.target.y - geo.y) * e - COLLAPSE_ARC_PX * Math.sin(Math.PI * k),
      size: geo.size + (geo.targetSize * COLLAPSE_END_SIZE_FRAC - geo.size) * e,
      alpha: 1,
    });
  });
  return looks;
}
