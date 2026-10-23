import { describe, expect, it } from "vitest";
import { pickCollapsePlan, applyCollapse } from "./collapse";
import { MAZE_POOL } from "./mazePool";
import { randomFromSeed } from "./mazeTiling";
import {
  buildSinkholeArt,
  SINKHOLE_TONE,
  sinkholeOpening,
  sinkholePalette,
  sinkholePixelVisible,
  sinkholeSettled,
  type SinkholeArt,
  type SinkholeOpening,
} from "./sinkholeArt";
import { DEFAULT_SINKHOLE_TUNING } from "./sinkholeTuning";
import { TUNING_KNOBS, type RangeKnob } from "./tuningKnobs";

const TUNING = DEFAULT_SINKHOLE_TUNING;
const TILE = TUNING.sinkholeArtTile;
const SINKHOLE_INTRO_MS = TUNING.sinkholeIntroMs;

const found = MAZE_POOL.flatMap((map) => {
  const plan = pickCollapsePlan(map.ascii, randomFromSeed(`collapse:${map.id}`));
  return plan.sinkhole === null
    ? []
    : [{ ascii: applyCollapse(map.ascii, plan.chains), chain: plan.sinkhole, seed: plan.artSeed }];
});

const sample = found[0]!;
const art = buildSinkholeArt(
  { ascii: sample.ascii, tileSize: TILE },
  sample.chain,
  sample.seed,
  TUNING,
);

const visible = (target: SinkholeArt, opening: SinkholeOpening) =>
  target.pixels.filter((pixel) => sinkholePixelVisible(pixel, opening));

const openingAt = (elapsedMs: number, fresh: boolean): SinkholeOpening =>
  sinkholeOpening({ key: "k", art, elapsedMs, fresh, tuning: TUNING });

const CLOSED: SinkholeOpening = { crackP: 0, open: 0 };
const OPEN: SinkholeOpening = { crackP: 1, open: 1 };

function paint(target: SinkholeArt, opening: SinkholeOpening, width: number, height: number) {
  const grid = new Map<number, number>();
  for (const pixel of visible(target, opening)) {
    grid.set(pixel.y * width + pixel.x, pixel.tone);
  }
  return { grid, width, height };
}

const isVoid = (tone: number | undefined): boolean =>
  tone === SINKHOLE_TONE.voidEdge || tone === SINKHOLE_TONE.voidDeep;

describe("sinkholeOpening", () => {
  it("starts closed, cracks first, then widens, and ends fully open", () => {
    expect(openingAt(0, true)).toEqual({ crackP: 0, open: 0 });
    const cracking = openingAt(SINKHOLE_INTRO_MS * TUNING.sinkholeCrackShare * 0.5, true);
    expect(cracking.crackP).toBeCloseTo(0.5);
    expect(cracking.open).toBe(0);
    const widening = openingAt(SINKHOLE_INTRO_MS * 0.7, true);
    expect(widening.crackP).toBe(1);
    expect(widening.open).toBeGreaterThan(0);
    expect(widening.open).toBeLessThan(1);
    expect(openingAt(SINKHOLE_INTRO_MS, true)).toEqual(OPEN);
    expect(openingAt(SINKHOLE_INTRO_MS * 9, true)).toEqual(OPEN);
  });

  it("shows an old sinkhole open from the first frame", () => {
    expect(openingAt(0, false)).toEqual(OPEN);
  });

  it("only advances forwards", () => {
    let previous = openingAt(0, true);
    for (let ms = 0; ms <= SINKHOLE_INTRO_MS; ms += 50) {
      const now = openingAt(ms, true);
      expect(now.crackP).toBeGreaterThanOrEqual(previous.crackP);
      expect(now.open).toBeGreaterThanOrEqual(previous.open);
      previous = now;
    }
  });

  it("is settled once the opening has run, or when it never plays", () => {
    const state = { key: "k", art, elapsedMs: 0, fresh: true, tuning: TUNING };
    expect(sinkholeSettled(state)).toBe(false);
    expect(sinkholeSettled({ ...state, elapsedMs: SINKHOLE_INTRO_MS })).toBe(true);
    expect(sinkholeSettled({ ...state, fresh: false })).toBe(true);
  });
});

describe("buildSinkholeArt", () => {
  it("is deterministic and differs between seeds", () => {
    const board = { ascii: sample.ascii, tileSize: TILE };
    expect(buildSinkholeArt(board, sample.chain, 5, TUNING)).toEqual(
      buildSinkholeArt(board, sample.chain, 5, TUNING),
    );
    expect(buildSinkholeArt(board, sample.chain, 5, TUNING)).not.toEqual(
      buildSinkholeArt(board, sample.chain, 6, TUNING),
    );
  });

  it("draws nothing before the crack starts and nothing outside the board", () => {
    const width = sample.ascii.split("\n")[0]!.length * TILE;
    const height = sample.ascii.split("\n").length * TILE;
    expect(visible(art, CLOSED).filter((p) => isVoid(p.tone))).toEqual([]);
    for (const pixel of art.pixels) {
      expect(pixel.x).toBeGreaterThanOrEqual(0);
      expect(pixel.y).toBeGreaterThanOrEqual(0);
      expect(pixel.x).toBeLessThan(width);
      expect(pixel.y).toBeLessThan(height);
    }
  });

  it("cracks out from the middle: nearer pixels appear before farther ones", () => {
    const slit = art.pixels.filter((p) => p.crackFrom > 0);
    const middle = slit.reduce((best, p) => (p.crackFrom < best.crackFrom ? p : best));
    const far = slit.reduce((best, p) => (p.crackFrom > best.crackFrom ? p : best));
    expect(middle.crackFrom).toBeLessThan(0.15);
    expect(far.crackFrom).toBeGreaterThan(0.85);
    const half = visible(art, { crackP: 0.5, open: 0 });
    expect(half.length).toBeGreaterThan(0);
    expect(half.length).toBeLessThan(visible(art, { crackP: 1, open: 0 }).length);
  });

  it("only ever adds void as it opens, and ends with the whole run open", () => {
    let previous = 0;
    for (let open = 0; open <= 1.0001; open += 0.05) {
      const count = visible(art, { crackP: 1, open: Math.min(1, open) }).filter((p) =>
        isVoid(p.tone),
      ).length;
      expect(count).toBeGreaterThanOrEqual(previous);
      previous = count;
    }
    const width = sample.ascii.split("\n")[0]!.length * TILE;
    const height = sample.ascii.split("\n").length * TILE;
    const { grid } = paint(art, OPEN, width, height);
    for (const { col, row } of sample.chain) {
      const centre = (row * TILE + TILE / 2) * width + col * TILE + TILE / 2;
      expect(isVoid(grid.get(centre)), `cell ${col},${row}`).toBe(true);
    }
  });

  it("opens the middle of the run before its ends", () => {
    const voids = art.pixels.filter((p) => isVoid(p.tone) && p.crackFrom === 0);
    const sorted = [...voids].sort((a, b) => a.openFrom - b.openFrom);
    const earliest = sorted.slice(0, 12);
    const centreX =
      sample.chain.reduce((sum, c) => sum + c.col * TILE + TILE / 2, 0) / sample.chain.length;
    const centreY =
      sample.chain.reduce((sum, c) => sum + c.row * TILE + TILE / 2, 0) / sample.chain.length;
    const spread = (list: typeof voids) =>
      list.reduce((sum, p) => sum + Math.hypot(p.x - centreX, p.y - centreY), 0) / list.length;
    expect(spread(earliest)).toBeLessThan(spread(sorted.slice(-12)));
  });

  it("covers every corridor cell of a bent run too", () => {
    const bent = found.find(
      ({ chain }) =>
        new Set(chain.map((c) => c.col)).size > 1 && new Set(chain.map((c) => c.row)).size > 1,
    );
    expect(bent).toBeDefined();
    const built = buildSinkholeArt(
      { ascii: bent!.ascii, tileSize: TILE },
      bent!.chain,
      bent!.seed,
      TUNING,
    );
    const width = bent!.ascii.split("\n")[0]!.length * TILE;
    const { grid } = paint(built, OPEN, width, 0);
    for (const { col, row } of bent!.chain) {
      expect(isVoid(grid.get((row * TILE + TILE / 2) * width + col * TILE + TILE / 2))).toBe(true);
    }
  });
});

describe("sinkholePalette", () => {
  it("rims the hole in the maze colour and darkens to a void", () => {
    const palette = sinkholePalette(0x2121ff, TUNING);
    expect(palette[SINKHOLE_TONE.rim]).toBe(0x2121ff);
    expect(palette[SINKHOLE_TONE.voidDeep]).toBe(0x000000);
    const colors = Object.values(SINKHOLE_TONE).map((tone) => palette[tone]);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("sinkhole knobs", () => {
  const sinkholeKnobs = TUNING_KNOBS.filter(
    (knob): knob is RangeKnob => knob.subgroup === "Sinkhole" && knob.kind === "range",
  );
  const board = { ascii: sample.ascii, tileSize: TILE };
  const lines = sample.ascii.split("\n");
  const settings = [
    ...sinkholeKnobs.flatMap((knob) => [{ [knob.key]: knob.min }, { [knob.key]: knob.max }]),
    Object.fromEntries(sinkholeKnobs.map((knob) => [knob.key, knob.min])),
    Object.fromEntries(sinkholeKnobs.map((knob) => [knob.key, knob.max])),
  ];

  it("builds art on the board and a sane opening at every slider extreme", () => {
    for (const setting of settings) {
      const tuning = { ...TUNING, ...setting };
      const built = buildSinkholeArt(board, sample.chain, sample.seed, tuning);
      const label = JSON.stringify(setting);
      expect(built.tile, label).toBe(tuning.sinkholeArtTile);
      for (const pixel of built.pixels) {
        expect(pixel.x >= 0 && pixel.x < lines[0]!.length * built.tile, label).toBe(true);
        expect(pixel.y >= 0 && pixel.y < lines.length * built.tile, label).toBe(true);
      }
      for (const elapsedMs of [0, tuning.sinkholeIntroMs / 2, tuning.sinkholeIntroMs]) {
        const opening = sinkholeOpening({ key: "k", art: built, elapsedMs, fresh: true, tuning });
        expect(opening.open, label).toBeGreaterThanOrEqual(0);
        expect(opening.open, label).toBeLessThanOrEqual(1);
      }
    }
  });

  it("mixes the edge band toward the void colour knob", () => {
    const palette = sinkholePalette(0x2121ff, {
      ...TUNING,
      sinkholeVoidColor: 0xff0000,
      sinkholeEdgeDarken: 1,
    });
    expect(palette[SINKHOLE_TONE.voidDeep]).toBe(0xff0000);
    expect(palette[SINKHOLE_TONE.voidEdge]).toBe(0xff0000);
  });
});

describe("opening start", () => {
  it("keeps the first widening pixels back until the crack has run", () => {
    for (const { ascii, chain, seed } of found) {
      const built = buildSinkholeArt({ ascii, tileSize: TILE }, chain, seed, TUNING);
      const early = built.pixels.filter(
        (p) => isVoid(p.tone) && p.crackFrom === 0 && p.openFrom < 0.02,
      );
      expect(early.length).toBeLessThan(4);
    }
  });
});
