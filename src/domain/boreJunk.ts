import { RUBBLE_TONE, type RubbleMote, type RubbleTone } from "./collapseRubble";
import type { MazeTile } from "./maze";
import { randomFromSeed } from "./mazeTiling";
import { WALL_ART_PX } from "./pixelWall";

const WALL_CHIPS = 6;
const RUBBLE_CHIPS = 11;
const MAX_DELAY_MS = 120;
const MIN_FLIGHT_MS = 220;
const FLIGHT_SPREAD_MS = 260;
const CHIP_TONES: readonly RubbleTone[] = [
  RUBBLE_TONE.fillLight,
  RUBBLE_TONE.light,
  RUBBLE_TONE.light,
  RUBBLE_TONE.outline,
];

export const BORE_JUNK_SETTLE_MS = MAX_DELAY_MS + MIN_FLIGHT_MS + FLIGHT_SPREAD_MS;

export type BoreJunkChip = RubbleMote & { tone: RubbleTone };

export type BoreJunk = { chips: readonly BoreJunkChip[]; ageMs: number };

export function boreJunk(
  cell: MazeTile,
  dx: number,
  dy: number,
  tileSize: number,
  rubble: boolean,
): BoreJunk {
  const tile = Math.round(tileSize / WALL_ART_PX);
  const next = randomFromSeed(`bore-junk:${cell.col},${cell.row}`);
  const x0 = cell.col * tile;
  const y0 = cell.row * tile;
  const faceX = x0 + (tile / 2) * (1 + dx);
  const faceY = y0 + (tile / 2) * (1 + dy);
  const chips: BoreJunkChip[] = [];
  for (let i = 0; i < (rubble ? RUBBLE_CHIPS : WALL_CHIPS); i += 1) {
    const spread = (next() - 0.5) * tile;
    chips.push({
      fromX: Math.round(faceX + (dy === 0 ? 0 : spread)),
      fromY: Math.round(faceY + (dx === 0 ? 0 : spread)),
      x: x0 + 1 + Math.floor(next() * (tile - 2)),
      y: y0 + 1 + Math.floor(next() * (tile - 2)),
      delayMs: next() * MAX_DELAY_MS,
      durationMs: MIN_FLIGHT_MS + next() * FLIGHT_SPREAD_MS,
      phase: next() * Math.PI * 2,
      amp: 0.5 + next() * 1.5,
      tone: CHIP_TONES[Math.floor(next() * CHIP_TONES.length)]!,
    });
  }
  return { chips, ageMs: 0 };
}

export function ageBoreJunk(junk: readonly BoreJunk[], deltaMs: number): readonly BoreJunk[] {
  if (junk.every((pile) => pile.ageMs >= BORE_JUNK_SETTLE_MS)) {
    return junk;
  }
  return junk.map((pile) => ({
    ...pile,
    ageMs: Math.min(BORE_JUNK_SETTLE_MS, pile.ageMs + deltaMs),
  }));
}
