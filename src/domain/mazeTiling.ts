export const TILING_WIDTH = 9;
export const TILING_HEIGHT = 11;
export const TILING_START_ROW = TILING_HEIGHT - 2;
export const TILING_CELL_COUNT = TILING_WIDTH * TILING_HEIGHT;

export type ShapeId = "domino" | "straight" | "t" | "c" | "l";

export type TilingPiece = {
  type: ShapeId | "center";
  cells: number[];
};

type ShapeDef = {
  id: ShapeId;
  cells: readonly (readonly [number, number])[];
};

type PlaceOption = {
  mask: bigint;
  cells: number[];
  pieces: TilingPiece[];
  type: ShapeId;
  required: number;
  bit: bigint;
  conflicts: bigint;
};

const SHAPES: readonly ShapeDef[] = [
  {
    id: "domino",
    cells: [
      [0, 0],
      [1, 0],
    ],
  },
  {
    id: "straight",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
  },
  {
    id: "t",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
  },
  {
    id: "c",
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
  },
  {
    id: "l",
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
  },
];

export const CENTER_PIECE: TilingPiece = {
  type: "center",
  cells: [48, 49, 50, 57, 58, 59],
};

// Pellet density comes from piece boundaries: every pair of touching cells that
// belong to different pieces becomes corridor, and cells inside one piece become
// wall. Small pieces therefore mean more maze, so the draw leans on dominoes.
const SHAPE_WEIGHTS: Record<ShapeId, number> = {
  domino: 8,
  straight: 2,
  t: 1,
  c: 1,
  l: 4,
};

const ALL_CELLS = (1n << BigInt(TILING_CELL_COUNT)) - 1n;

function bit(cell: number): bigint {
  return 1n << BigInt(cell);
}

function maskOf(cells: readonly number[]): bigint {
  return cells.reduce((mask, cell) => mask | bit(cell), 0n);
}

const centerMask = maskOf(CENTER_PIECE.cells);
const ledgeCells = [-1, 0, 1].map(
  (dx) => TILING_START_ROW * TILING_WIDTH + Math.floor(TILING_WIDTH / 2) + dx,
);
const ledgeMask = maskOf(ledgeCells);
const aboveLedgeMask = maskOf(ledgeCells.map((cell) => cell - TILING_WIDTH));

export function mirrorCells(cells: readonly number[]): number[] {
  return cells
    .map(
      (cell) =>
        Math.floor(cell / TILING_WIDTH) * TILING_WIDTH + (TILING_WIDTH - 1 - (cell % TILING_WIDTH)),
    )
    .sort((a, b) => a - b);
}

function cellKey(cells: readonly number[]): string {
  return [...cells].sort((a, b) => a - b).join(",");
}

type PieceBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  area: number;
};

const boundsCache = new WeakMap<object, PieceBounds>();

function bounds(piece: { cells: number[] }): PieceBounds {
  const cached = boundsCache.get(piece);
  if (cached) {
    return cached;
  }
  const xs = piece.cells.map((cell) => cell % TILING_WIDTH);
  const ys = piece.cells.map((cell) => Math.floor(cell / TILING_WIDTH));
  const next: PieceBounds = {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    area: piece.cells.length,
  };
  boundsCache.set(piece, next);
  return next;
}

export function formsRectangle(first: { cells: number[] }, second: { cells: number[] }): boolean {
  const a = bounds(first);
  const b = bounds(second);
  const width = Math.max(a.right, b.right) - Math.min(a.left, b.left) + 1;
  const height = Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top) + 1;
  return width * height === a.area + b.area;
}

export function orientations(cells: readonly (readonly [number, number])[]): [number, number][][] {
  const result = new Map<string, [number, number][]>();
  for (const flip of [1, -1] as const) {
    let rotated: [number, number][] = cells.map(([x, y]) => [x * flip, y]);
    for (let turn = 0; turn < 4; turn += 1) {
      const minX = Math.min(...rotated.map(([x]) => x));
      const minY = Math.min(...rotated.map(([, y]) => y));
      const normalized = rotated
        .map(([x, y]) => [x - minX, y - minY] as [number, number])
        .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      result.set(JSON.stringify(normalized), normalized);
      rotated = rotated.map(([x, y]) => [-y, x]);
    }
  }
  return [...result.values()];
}

function buildOptions(): PlaceOption[] {
  const unique = new Map<string, Omit<PlaceOption, "bit" | "conflicts">>();
  for (const shape of SHAPES) {
    for (const cells of orientations(shape.cells)) {
      const width = Math.max(...cells.map(([x]) => x)) + 1;
      const height = Math.max(...cells.map(([, y]) => y)) + 1;
      for (let y = 0; y <= TILING_HEIGHT - height; y += 1) {
        for (let x = 0; x <= TILING_WIDTH - width; x += 1) {
          const p = cells.map(([dx, dy]) => (y + dy) * TILING_WIDTH + x + dx).sort((a, b) => a - b);
          const m = mirrorCells(p);
          const pMask = maskOf(p);
          const mMask = maskOf(m);
          if ((pMask | mMask) & centerMask) {
            continue;
          }
          if (pMask !== mMask && pMask & mMask) {
            continue;
          }
          const pieces: TilingPiece[] = (pMask === mMask ? [p] : [p, m]).map((pieceCells) => ({
            type: shape.id,
            cells: pieceCells,
          }));
          if (
            pieces.some((piece) => {
              const mask = maskOf(piece.cells);
              return (
                (mask & ledgeMask) !== 0n &&
                ((mask & ledgeMask) !== ledgeMask || (mask & aboveLedgeMask) !== 0n)
              );
            })
          ) {
            continue;
          }
          if (pieces.some((piece) => formsRectangle(piece, CENTER_PIECE))) {
            continue;
          }
          if (pieces.length === 2 && formsRectangle(pieces[0]!, pieces[1]!)) {
            continue;
          }
          const key =
            shape.id +
            ":" +
            pieces
              .map((piece) => cellKey(piece.cells))
              .sort()
              .join("|");
          unique.set(key, {
            mask: pMask | mMask,
            cells: [...new Set(pieces.flatMap((piece) => piece.cells))],
            pieces,
            type: shape.id,
            required: shape.id === "l" ? 1 : shape.id === "t" ? 2 : 0,
          });
        }
      }
    }
  }
  return [...unique.values()].map((option) => ({
    ...option,
    bit: 0n,
    conflicts: 0n,
  }));
}

const OPTIONS = buildOptions();
for (let i = 0; i < OPTIONS.length; i += 1) {
  OPTIONS[i]!.bit = 1n << BigInt(i);
  OPTIONS[i]!.conflicts = OPTIONS[i]!.bit;
}
for (let i = 0; i < OPTIONS.length; i += 1) {
  for (let j = i + 1; j < OPTIONS.length; j += 1) {
    const a = OPTIONS[i]!;
    const b = OPTIONS[j]!;
    if (
      a.mask & b.mask ||
      a.pieces.some((first) => b.pieces.some((second) => formsRectangle(first, second)))
    ) {
      a.conflicts |= b.bit;
      b.conflicts |= a.bit;
    }
  }
}

const BY_CELL: PlaceOption[][] = Array.from({ length: TILING_CELL_COUNT }, (_, cell) =>
  OPTIONS.filter((option) => option.cells.includes(cell)),
);
const ALL_OPTIONS = (1n << BigInt(OPTIONS.length)) - 1n;
const REQUIRED_OPTIONS = [1, 2].map((required) =>
  OPTIONS.reduce((mask, option) => (option.required === required ? mask | option.bit : mask), 0n),
);

function* weightedMoves(
  choices: PlaceOption[],
  random: () => number,
): Generator<PlaceOption, void, undefined> {
  const groups = new Map<ShapeId, PlaceOption[]>();
  for (const option of choices) {
    const list = groups.get(option.type);
    if (list) {
      list.push(option);
    } else {
      groups.set(option.type, [option]);
    }
  }
  while (groups.size) {
    let draw = random() * [...groups.keys()].reduce((sum, type) => sum + SHAPE_WEIGHTS[type], 0);
    for (const [type, moves] of groups) {
      draw -= SHAPE_WEIGHTS[type];
      if (draw < 0) {
        const index = Math.floor(random() * moves.length);
        const [option] = moves.splice(index, 1);
        if (!moves.length) {
          groups.delete(type);
        }
        if (option) {
          yield option;
        }
        break;
      }
    }
  }
}

export function randomFromSeed(seed: string): () => number {
  let state = 2166136261;
  for (const char of String(seed)) {
    state = Math.imul(state ^ (char.codePointAt(0) ?? 0), 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export type TilingSolveResult = {
  seed: string;
  pieces: TilingPiece[];
  stats: { placements: number; backtracks: number };
};

export function solveTiling(seed: string): TilingSolveResult {
  const random = randomFromSeed(seed);
  const placed: PlaceOption[] = [];
  const stats = { placements: 0, backtracks: 0 };
  const deadEnds = new Set<string>();

  function search(uncovered: bigint, available: bigint, required: number): boolean {
    if (!uncovered) {
      return required === 3;
    }
    if (!(required & 1) && !(available & REQUIRED_OPTIONS[0]!)) {
      return false;
    }
    if (!(required & 2) && !(available & REQUIRED_OPTIONS[1]!)) {
      return false;
    }
    const state = `${uncovered}:${available}:${required}`;
    if (deadEnds.has(state)) {
      return false;
    }
    let choices: PlaceOption[] | null = null;
    for (let cell = 0; cell < TILING_CELL_COUNT; cell += 1) {
      if (!(uncovered & bit(cell))) {
        continue;
      }
      const candidates = BY_CELL[cell]!.filter((option) => available & option.bit);
      if (candidates.length === 0) {
        return false;
      }
      if (choices === null || candidates.length < choices.length) {
        choices = candidates;
      }
    }
    if (!choices) {
      return false;
    }
    for (const option of weightedMoves(choices, random)) {
      placed.push(option);
      stats.placements += 1;
      if (
        search(uncovered ^ option.mask, available & ~option.conflicts, required | option.required)
      ) {
        return true;
      }
      placed.pop();
      stats.backtracks += 1;
    }
    if (deadEnds.size < 20000) {
      deadEnds.add(state);
    }
    return false;
  }

  const success = search(ALL_CELLS ^ centerMask, ALL_OPTIONS, 0);
  if (!success) {
    throw new Error("No tiling was found.");
  }
  return {
    seed: String(seed),
    pieces: [CENTER_PIECE, ...placed.flatMap((move) => move.pieces)],
    stats: { ...stats },
  };
}

export function tilingOptionCount(): number {
  return OPTIONS.length;
}
