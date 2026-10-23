import { describe, expect, it } from "vitest";
import { pickCollapsePlan, applyCollapse } from "./collapse";
import { MAZE_POOL } from "./mazePool";
import { randomFromSeed } from "./mazeTiling";
import {
  buildSinkholeArt,
  SINKHOLE_ART_TILE,
  SINKHOLE_INTRO_MS,
  SINKHOLE_STYLE,
  SINKHOLE_TONE,
  sinkholeOpening,
  sinkholePalette,
  sinkholePixelVisible,
  sinkholeSettled,
  type SinkholeArt,
  type SinkholeOpening,
} from "./sinkholeArt";

const TILE = SINKHOLE_ART_TILE;

const found = MAZE_POOL.flatMap((map) => {
  const plan = pickCollapsePlan(map.ascii, randomFromSeed(`collapse:${map.id}`));
  return plan.sinkhole === null
    ? []
    : [{ ascii: applyCollapse(map.ascii, plan.chains), chain: plan.sinkhole, seed: plan.artSeed }];
});

const sample = found[0]!;
const art = buildSinkholeArt({ ascii: sample.ascii, tileSize: TILE }, sample.chain, sample.seed);

const visible = (target: SinkholeArt, opening: SinkholeOpening) =>
  target.pixels.filter((pixel) => sinkholePixelVisible(pixel, opening));

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
    expect(sinkholeOpening(0, true)).toEqual({ crackP: 0, open: 0 });
    const cracking = sinkholeOpening(SINKHOLE_INTRO_MS * SINKHOLE_STYLE.crackShare * 0.5, true);
    expect(cracking.crackP).toBeCloseTo(0.5);
    expect(cracking.open).toBe(0);
    const widening = sinkholeOpening(SINKHOLE_INTRO_MS * 0.7, true);
    expect(widening.crackP).toBe(1);
    expect(widening.open).toBeGreaterThan(0);
    expect(widening.open).toBeLessThan(1);
    expect(sinkholeOpening(SINKHOLE_INTRO_MS, true)).toEqual(OPEN);
    expect(sinkholeOpening(SINKHOLE_INTRO_MS * 9, true)).toEqual(OPEN);
  });

  it("shows an old sinkhole open from the first frame", () => {
    expect(sinkholeOpening(0, false)).toEqual(OPEN);
  });

  it("only advances forwards", () => {
    let previous = sinkholeOpening(0, true);
    for (let ms = 0; ms <= SINKHOLE_INTRO_MS; ms += 50) {
      const now = sinkholeOpening(ms, true);
      expect(now.crackP).toBeGreaterThanOrEqual(previous.crackP);
      expect(now.open).toBeGreaterThanOrEqual(previous.open);
      previous = now;
    }
  });

  it("is settled once the opening has run, or when it never plays", () => {
    const state = { key: "k", art, elapsedMs: 0, fresh: true };
    expect(sinkholeSettled(state)).toBe(false);
    expect(sinkholeSettled({ ...state, elapsedMs: SINKHOLE_INTRO_MS })).toBe(true);
    expect(sinkholeSettled({ ...state, fresh: false })).toBe(true);
  });
});

describe("buildSinkholeArt", () => {
  it("is deterministic and differs between seeds", () => {
    const board = { ascii: sample.ascii, tileSize: TILE };
    expect(buildSinkholeArt(board, sample.chain, 5)).toEqual(
      buildSinkholeArt(board, sample.chain, 5),
    );
    expect(buildSinkholeArt(board, sample.chain, 5)).not.toEqual(
      buildSinkholeArt(board, sample.chain, 6),
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
    const built = buildSinkholeArt({ ascii: bent!.ascii, tileSize: TILE }, bent!.chain, bent!.seed);
    const width = bent!.ascii.split("\n")[0]!.length * TILE;
    const { grid } = paint(built, OPEN, width, 0);
    for (const { col, row } of bent!.chain) {
      expect(isVoid(grid.get((row * TILE + TILE / 2) * width + col * TILE + TILE / 2))).toBe(true);
    }
  });
});

describe("sinkholePalette", () => {
  it("has a colour for every tone", () => {
    const palette = sinkholePalette(0x000000);
    for (const tone of Object.values(SINKHOLE_TONE)) {
      expect(palette[tone]).toBeTypeOf("number");
    }
    expect(new Set(palette).size).toBe(palette.length);
  });
});

describe("opening start", () => {
  it("keeps the first widening pixels back until the crack has run", () => {
    for (const { ascii, chain, seed } of found) {
      const built = buildSinkholeArt({ ascii, tileSize: TILE }, chain, seed);
      const early = built.pixels.filter(
        (p) => isVoid(p.tone) && p.crackFrom === 0 && p.openFrom < 0.02,
      );
      expect(early.length).toBeLessThan(4);
    }
  });
});
