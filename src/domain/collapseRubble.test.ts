import { describe, expect, it } from "vitest";
import { pickCollapsePlan } from "./collapse";
import {
  buildRubbleArt,
  RUBBLE_INTRO_MS,
  RUBBLE_TONE,
  rubbleBlockedPixels,
  rubbleElapsedMs,
  rubbleIntroSettled,
  rubbleMotePosition,
  rubblePalette,
} from "./collapseRubble";
import { TILE_SIZE_PX } from "./maze";
import { MAZE_POOL } from "./mazePool";
import { randomFromSeed } from "./mazeTiling";
import { WALL_ART_PX } from "./pixelWall";

const ascii = MAZE_POOL[8]!.ascii;
const plan = pickCollapsePlan(ascii, randomFromSeed("rubble"));
const lines = ascii.split("\n");
const cols = lines[0]!.length;
const tile = TILE_SIZE_PX / WALL_ART_PX;
const collapsedAscii = lines
  .map((line, row) =>
    [...line]
      .map((ch, col) =>
        plan.chains.some((chain) => chain.some((c) => c.col === col && c.row === row)) ? "#" : ch,
      )
      .join(""),
  )
  .join("\n");
const pelletPixels = rubbleBlockedPixels(collapsedAscii, TILE_SIZE_PX, [], { x: 0, y: 0 });
const board = { ascii: collapsedAscii, tileSize: TILE_SIZE_PX, blockedPixels: pelletPixels };
const art = plan.chains.map((chain, i) => buildRubbleArt(board, chain, plan.artSeed + i));

describe("buildRubbleArt", () => {
  it("is deterministic", () => {
    expect(buildRubbleArt(board, plan.chains[0]!, 5)).toEqual(
      buildRubbleArt(board, plan.chains[0]!, 5),
    );
  });

  it("fills the collapsed lane and draws a cobble rim around a packed core", () => {
    for (const [i, chain] of plan.chains.entries()) {
      const tones = new Set(art[i]!.pixels.map((p) => p.tone));
      expect(tones.has(RUBBLE_TONE.outline)).toBe(true);
      expect(tones.has(RUBBLE_TONE.fill) || tones.has(RUBBLE_TONE.fillLight)).toBe(true);
      expect(tones.has(RUBBLE_TONE.light)).toBe(true);
      const covered = new Set(art[i]!.pixels.map((p) => p.y * cols * tile + p.x));
      for (const { col, row } of chain) {
        for (let y = 3; y < tile - 3; y += 1) {
          for (let x = 3; x < tile - 3; x += 1) {
            expect(covered.has((row * tile + y) * cols * tile + col * tile + x)).toBe(true);
          }
        }
      }
    }
  });

  it("never reaches into a walkable cell outside the collapsed lane, so dots stay clear", () => {
    for (const [i, chain] of plan.chains.entries()) {
      const lane = new Set(chain.map((c) => `${c.col},${c.row}`));
      for (const p of art[i]!.pixels) {
        const col = Math.floor(p.x / tile);
        const row = Math.floor(p.y / tile);
        const ch = collapsedAscii.split("\n")[row]![col]!;
        expect(ch === "#" || lane.has(`${col},${row}`), `pixel ${p.x},${p.y} in open ${ch}`).toBe(
          true,
        );
        expect(pelletPixels.has(p.y * cols * tile + p.x)).toBe(false);
      }
    }
  });

  it("lands every dust mote on open ground outside the pile and away from dots", () => {
    for (const [i, a] of art.entries()) {
      expect(a.motes.length).toBeGreaterThan(0);
      const pile = new Set(a.pixels.map((p) => p.y * cols * tile + p.x));
      for (const mote of a.motes) {
        const index = mote.y * cols * tile + mote.x;
        expect(pile.has(index), `mote ${i} on the pile`).toBe(false);
        expect(pelletPixels.has(index)).toBe(false);
      }
    }
  });
});

describe("rubbleMotePosition", () => {
  const mote = art[0]!.motes[0]!;

  it("starts on the pile and lands on its resting pixel", () => {
    const start = rubbleMotePosition(mote, 0);
    expect(start.landed).toBe(false);
    expect(Math.abs(start.x - mote.fromX) + Math.abs(start.y - mote.fromY)).toBeLessThanOrEqual(1);
    expect(rubbleMotePosition(mote, RUBBLE_INTRO_MS)).toEqual({
      x: mote.x,
      y: mote.y,
      landed: true,
    });
    expect(rubbleMotePosition(mote, Infinity).landed).toBe(true);
  });
});

describe("dust intro timing", () => {
  const state = (fresh: boolean[], introMs: number) => ({
    key: "k",
    introMs,
    arts: fresh.map((f) => ({ ...art[0]!, fresh: f })),
  });

  it("only a fresh collapse runs on the intro clock; older ones are already landed", () => {
    expect(rubbleElapsedMs({ fresh: true }, 400)).toBe(400);
    expect(rubbleElapsedMs({ fresh: false }, 400)).toBe(Infinity);
  });

  it("is settled at once with no fresh collapse, else only after the full intro", () => {
    expect(rubbleIntroSettled(state([false, false], 0))).toBe(true);
    expect(rubbleIntroSettled(state([false, true], RUBBLE_INTRO_MS - 1))).toBe(false);
    expect(rubbleIntroSettled(state([false, true], RUBBLE_INTRO_MS))).toBe(true);
  });
});

describe("rubblePalette", () => {
  it("derives the rubble shades from the wall and ground colours", () => {
    const palette = rubblePalette(0x2121ff, 0x1a1a2e);
    expect(palette[RUBBLE_TONE.outline]).toBe(0x2121ff);
    expect(palette[RUBBLE_TONE.ground]).toBe(0x1a1a2e);
    expect(new Set(palette).size).toBe(5);
  });
});
