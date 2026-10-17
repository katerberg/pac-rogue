import { DEATH_HOLD_MS, READY_PAUSE_MS } from "./deathSequence";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";

export const MONEY_TALKS_WINDOW_MS = DEATH_HOLD_MS + READY_PAUSE_MS;
export const MONEY_TALKS_COIN_FLY_MS = 1000;
export const MONEY_TALKS_END_SIZE_FRAC = 1.5;
export const MONEY_TALKS_FADE_START = 0.6;

export const QUARTER_HUD_LEFT = 12;
const QUARTER_HUD_TOP = 8;
const QUARTER_HUD_GAP = 4;
const DOLLAR_QUARTERS = 4;
const DOLLAR_MIN_QUARTERS = 10;

export type Point = { x: number; y: number };
export type CoinLook = Point & { size: number; alpha: number };

export function lastLifeSaveCost(
  lives: number,
  quarters: number,
  cost: number | null,
): number | null {
  return cost !== null && lives <= 1 && quarters >= cost ? cost : null;
}

export type QuarterIconKind = "quarter" | "dollar";

function dollarCount(quarters: number): number {
  return quarters >= DOLLAR_MIN_QUARTERS ? Math.floor(quarters / DOLLAR_QUARTERS) : 0;
}

/** From `DOLLAR_MIN_QUARTERS` up, every 4 Quarters collapse into a dollar, drawn first. */
export function quarterHudIcons(quarters: number): QuarterIconKind[] {
  const dollars = dollarCount(quarters);
  return [
    ...Array<QuarterIconKind>(dollars).fill("dollar"),
    ...Array<QuarterIconKind>(quarters - dollars * DOLLAR_QUARTERS).fill("quarter"),
  ];
}

/** HUD slot drawing the `index`-th Quarter of `quarters` (a dollar covers four). */
function quarterHudSlot(index: number, quarters: number): number {
  const dollars = dollarCount(quarters);
  const inDollars = dollars * DOLLAR_QUARTERS;
  return index < inDollars ? Math.floor(index / DOLLAR_QUARTERS) : dollars + index - inDollars;
}

/** `left` is the row's left edge (default gutter); knobs mode shifts into the maze column. */
export function quarterHudIconPosition(
  slot: number,
  size: number,
  left: number = QUARTER_HUD_LEFT,
): Point {
  return {
    x: left + size / 2 + slot * (size + QUARTER_HUD_GAP),
    y: QUARTER_HUD_TOP + size / 2,
  };
}

function coinFlyMs(count: number): number {
  return count <= 1 ? MONEY_TALKS_WINDOW_MS : MONEY_TALKS_COIN_FLY_MS;
}

function coinLaunchMs(index: number, count: number): number {
  if (count <= 1) {
    return 0;
  }
  return (index * (MONEY_TALKS_WINDOW_MS - MONEY_TALKS_COIN_FLY_MS)) / (count - 1);
}

export function moneyTalksLaunchedCount(elapsedMs: number, count: number): number {
  let launched = 0;
  for (let i = 0; i < count; i += 1) {
    if (coinLaunchMs(i, count) <= elapsedMs) {
      launched += 1;
    }
  }
  return launched;
}

export function moneyTalksCoinLook(
  elapsedMs: number,
  index: number,
  count: number,
  quartersBefore: number,
  baseSize: number,
): CoinLook | null {
  const t = (elapsedMs - coinLaunchMs(index, count)) / coinFlyMs(count);
  if (t < 0 || t >= 1) {
    return null;
  }
  const from = quarterHudIconPosition(
    quarterHudSlot(quartersBefore - 1 - index, quartersBefore),
    baseSize,
  );
  const eased = 1 - (1 - t) ** 3;
  const endSize = PLAYFIELD_WIDTH * MONEY_TALKS_END_SIZE_FRAC;
  return {
    x: from.x + (PLAYFIELD_WIDTH / 2 - from.x) * eased,
    y: from.y + (PLAYFIELD_HEIGHT / 2 - from.y) * eased,
    size: baseSize + (endSize - baseSize) * t * t,
    alpha:
      t < MONEY_TALKS_FADE_START
        ? 1
        : 1 - (t - MONEY_TALKS_FADE_START) / (1 - MONEY_TALKS_FADE_START),
  };
}
