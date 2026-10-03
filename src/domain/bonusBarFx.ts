import { BONUS_BAR_MAX } from "./bonusBar";

export const BONUS_ART_SCALE = 2;
export const BONUS_BAR_ART_W = 75;
const BONUS_BAR_ART_H = 8;
export const BONUS_SLOTS = 12;
const BONUS_PUNCH_TIER = 6;
const BONUS_CHROME_SHAKE_TIER = 8;
export const BONUS_COLORS = {
  frame: 0x2121de,
  fill: 0xffd800,
  highlight: 0xfff4a3,
  flash: 0xffffff,
} as const;

const POINTS_PER_SLOT = BONUS_BAR_MAX / BONUS_SLOTS;
const SLOT_W = 5;
const SLOT_H = 4;
const SLOT_STEP = 6;
const SLOT_INSET = 2;
const STEP_MS = 1000 / 60;
const SPRING_PULL = 0.09;
const SPRING_DAMP = 0.74;
const FRUIT_FILL_SLOWDOWN = 1.5;
const SLOW_SPRING_PULL = SPRING_PULL / FRUIT_FILL_SLOWDOWN ** 2;
const SLOW_SPRING_DAMP = SPRING_DAMP ** (1 / FRUIT_FILL_SLOWDOWN);
const SETTLE_DIST = 0.5;
const SETTLE_VEL = 0.05;
const NEAR_FULL = 0.75;
const BLINK_MS = 260;

export type BumpFx =
  | { kind: "bounce"; hopPx: number; wobbles: number; wave: boolean }
  | { kind: "punch"; shakePx: number; flashMs: number; chromeShake: boolean };

type BarEffect = {
  kind: "bounce" | "shake";
  startMs: number;
  durMs: number;
  amp: number;
  wobbles: number;
};

type SlotPop = { slot: number; startMs: number; durMs: number; px: number };

export type BarFxState = {
  nowMs: number;
  carryMs: number;
  shown: number;
  vel: number;
  pendingWraps: number;
  slowFill: boolean;
  lit: number;
  flashUntilMs: number;
  effects: BarEffect[];
  pops: SlotPop[];
};

export type BarRect = { x: number; y: number; w: number; h: number; color: number };

export function bonusBumpFx(tier: number): BumpFx {
  if (tier < BONUS_PUNCH_TIER) {
    const step = Math.min(3, Math.ceil(tier / 2));
    return { kind: "bounce", hopPx: step, wobbles: step, wave: tier >= 4 };
  }
  const over = tier - BONUS_PUNCH_TIER;
  return {
    kind: "punch",
    shakePx: Math.min(3, 1 + Math.floor(over / 2)),
    flashMs: Math.min(240, 90 + 30 * over),
    chromeShake: tier >= BONUS_CHROME_SHAKE_TIER,
  };
}

function litSlots(shown: number): number {
  return Math.min(BONUS_SLOTS, Math.floor(Math.max(0, shown) / POINTS_PER_SLOT + 0.001));
}

export function createBarFx(charge: number): BarFxState {
  return {
    nowMs: 0,
    carryMs: 0,
    shown: charge,
    vel: 0,
    pendingWraps: 0,
    slowFill: false,
    lit: litSlots(charge),
    flashUntilMs: 0,
    effects: [],
    pops: [],
  };
}

function slotPops(
  fromSlot: number,
  toSlot: number,
  startMs: number,
  staggerMs: number,
  durMs: number,
  px: number,
): SlotPop[] {
  const pops: SlotPop[] = [];
  for (let slot = fromSlot; slot < toSlot; slot += 1) {
    pops.push({ slot, startMs: startMs + staggerMs * (slot - fromSlot), durMs, px });
  }
  return pops;
}

export function stepBarFx(s: BarFxState, deltaMs: number, charge: number): BarFxState {
  let { nowMs, shown, vel, pendingWraps, slowFill, lit } = s;
  let carryMs = s.carryMs + Math.max(0, deltaMs);
  const pops = [...s.pops];
  while (carryMs >= STEP_MS) {
    carryMs -= STEP_MS;
    nowMs += STEP_MS;
    const target = pendingWraps > 0 ? BONUS_BAR_MAX : charge;
    const pull = slowFill ? SLOW_SPRING_PULL : SPRING_PULL;
    const damp = slowFill ? SLOW_SPRING_DAMP : SPRING_DAMP;
    vel = (vel + (target - shown) * pull) * damp;
    shown += vel;
    if (pendingWraps > 0 && shown >= BONUS_BAR_MAX - 0.5) {
      pendingWraps -= 1;
      shown = 0;
      vel = 0;
      lit = 0;
      pops.push(...slotPops(0, BONUS_SLOTS, nowMs, 30, 220, 3));
    }
    const nowLit = litSlots(shown);
    pops.push(...slotPops(lit, nowLit, nowMs, 0, 200, 2));
    lit = nowLit;
    if (
      slowFill &&
      pendingWraps === 0 &&
      Math.abs(charge - shown) < SETTLE_DIST &&
      Math.abs(vel) < SETTLE_VEL
    ) {
      slowFill = false;
    }
  }
  return {
    nowMs,
    carryMs,
    shown,
    vel,
    pendingWraps,
    slowFill,
    lit,
    flashUntilMs: s.flashUntilMs,
    effects: s.effects.filter((e) => e.startMs + e.durMs >= nowMs),
    pops: pops.filter((p) => p.startMs + p.durMs >= nowMs),
  };
}

export function bumpBarFx(s: BarFxState, fx: BumpFx): BarFxState {
  if (fx.kind === "bounce") {
    const bounce: BarEffect = {
      kind: "bounce",
      startMs: s.nowMs,
      durMs: 260 + 130 * fx.wobbles,
      amp: fx.hopPx,
      wobbles: fx.wobbles,
    };
    const wave = fx.wave ? slotPops(0, Math.max(s.lit, 1), s.nowMs, 35, 200, 1) : [];
    return { ...s, effects: [...s.effects, bounce], pops: [...s.pops, ...wave] };
  }
  const shake: BarEffect = {
    kind: "shake",
    startMs: s.nowMs,
    durMs: 260,
    amp: fx.shakePx,
    wobbles: 0,
  };
  return {
    ...s,
    flashUntilMs: s.nowMs + fx.flashMs,
    effects: [...s.effects, shake],
    pops: [...s.pops, ...slotPops(0, BONUS_SLOTS, s.nowMs, 0, 140, 2)],
  };
}

export function fillBarFx(s: BarFxState, filled: number): BarFxState {
  return { ...s, pendingWraps: s.pendingWraps + Math.max(0, filled) };
}

export function slowFillBarFx(s: BarFxState): BarFxState {
  return { ...s, slowFill: true };
}

function progress(startMs: number, durMs: number, nowMs: number): number | null {
  const k = (nowMs - startMs) / durMs;
  return k < 0 || k > 1 ? null : k;
}

function barOffset(s: BarFxState): { gx: number; gy: number } {
  let gx = 0;
  let gy = 0;
  for (const e of s.effects) {
    const k = progress(e.startMs, e.durMs, s.nowMs);
    if (k === null) {
      continue;
    }
    if (e.kind === "bounce") {
      gy -= Math.round(e.amp * Math.abs(Math.sin(Math.PI * e.wobbles * k)) * (1 - k));
    } else {
      gx += Math.round(e.amp * Math.sin(Math.PI * 10 * k) * (1 - k));
    }
  }
  return { gx, gy };
}

function slotOffset(s: BarFxState, slot: number): number {
  let dy = 0;
  for (const p of s.pops) {
    const k = p.slot === slot ? progress(p.startMs, p.durMs, s.nowMs) : null;
    if (k !== null) {
      dy = Math.min(dy, -Math.round(p.px * Math.sin(Math.PI * k)));
    }
  }
  return dy;
}

export function barRects(s: BarFxState): BarRect[] {
  const { gx, gy } = barOffset(s);
  const { frame, fill, highlight, flash } = BONUS_COLORS;
  const rects: BarRect[] = [
    { x: gx, y: gy, w: BONUS_BAR_ART_W, h: 1, color: frame },
    { x: gx, y: gy + BONUS_BAR_ART_H - 1, w: BONUS_BAR_ART_W, h: 1, color: frame },
    { x: gx, y: gy, w: 1, h: BONUS_BAR_ART_H, color: frame },
    { x: gx + BONUS_BAR_ART_W - 1, y: gy, w: 1, h: BONUS_BAR_ART_H, color: frame },
  ];
  const shown = Math.max(0, Math.min(BONUS_BAR_MAX, s.shown));
  const flashing = s.nowMs < s.flashUntilMs;
  const blink = shown / BONUS_BAR_MAX >= NEAR_FULL && Math.floor(s.nowMs / BLINK_MS) % 2 === 1;
  const body = flashing ? flash : blink ? highlight : fill;
  const top = flashing ? flash : highlight;
  for (let slot = 0; slot < BONUS_SLOTS; slot += 1) {
    const x = gx + SLOT_INSET + slot * SLOT_STEP;
    const y = gy + SLOT_INSET + slotOffset(s, slot);
    const f = Math.max(0, Math.min(1, (shown - slot * POINTS_PER_SLOT) / POINTS_PER_SLOT));
    const w = f > 0 ? Math.max(1, Math.round(SLOT_W * f)) : 0;
    if (w < SLOT_W) {
      rects.push({ x: x + w, y: y + SLOT_H - 1, w: SLOT_W - w, h: 1, color: frame });
    }
    if (w > 0) {
      rects.push({ x, y, w, h: SLOT_H, color: body });
      rects.push({ x, y, w, h: 1, color: top });
    }
  }
  return rects;
}
