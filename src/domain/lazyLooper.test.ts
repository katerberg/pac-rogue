import { describe, expect, it } from "vitest";
import {
  LAZY_LOOPER_OPTIONAL_TINT,
  lazyLooperRequiredCells,
  pelletTint,
  type LazyLooperRings,
} from "./lazyLooper";
import { getLayout, layoutFromAscii, type MazeLayout } from "./maze";
import { generateMazeAsciiWithRetries, invertMazeAscii } from "./mazeGenerate";
import { PELLET_DRAWABLE_ID, POWER_PELLET_DRAWABLE_ID } from "./playfield";

function render(layout: MazeLayout, rings: LazyLooperRings): string {
  const required = new Set(
    lazyLooperRequiredCells(layout, rings).map(({ col, row }) => `${col},${row}`),
  );
  return layout.ascii
    .split("\n")
    .map((line, row) =>
      [...line].map((ch, col) => (ch === "." && required.has(`${col},${row}`) ? "o" : ch)).join(""),
    )
    .join("\n");
}

function pieceCount(layout: MazeLayout, rings: LazyLooperRings): number {
  const required = new Set(
    lazyLooperRequiredCells(layout, rings).map(({ col, row }) => `${col},${row}`),
  );
  const lines = layout.ascii.split("\n");
  const passable = (col: number, row: number): boolean =>
    !(layout.playerSolids[row]?.[col] ?? true) &&
    (lines[row]?.[col] !== "." || required.has(`${col},${row}`));
  const seen = new Set<string>();
  let pieces = 0;
  for (const start of required) {
    if (seen.has(start)) {
      continue;
    }
    pieces += 1;
    const queue = [start];
    seen.add(start);
    while (queue.length > 0) {
      const [col, row] = queue.pop()!.split(",").map(Number) as [number, number];
      for (const [dc, dr] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const key = `${col + dc},${row + dr}`;
        if (!seen.has(key) && passable(col + dc, row + dr)) {
          seen.add(key);
          queue.push(key);
        }
      }
    }
  }
  return pieces;
}

describe("lazyLooperRequiredCells", () => {
  it("rings the small maze: outer edge plus the loop around the ghost house", () => {
    expect(render(getLayout("mazeSmall"), "outerInner")).toBe(`######################
#oooooooooooooooooooo#
#@#####o######o#####@#
#o#####o######o#####o#
#ooooo----------ooooo#
#o####-###==###-####o#
#-####-#HHHHHH#-####-#
--####-#HHHHHH#-####--
#-####-#HHHHHH#-####-#
#o####-########-####o#
#ooooo----------ooooo#
#o####o########o####o#
#o####o########o####o#
#oooooooooooooooooooo#
###o##############o###
###o##############o###
#ooo...---P----...ooo#
#o####.########.####o#
#o####.########.####o#
#o@oooooooooooooooo@o#
######################`);
  });

  it("Plus keeps only the outer edge of the small maze", () => {
    expect(render(getLayout("mazeSmall"), "outer")).toBe(`######################
#oooooooooooooooooooo#
#@#####.######.#####@#
#o#####.######.#####o#
#o....----------....o#
#o####-###==###-####o#
#-####-#HHHHHH#-####-#
--####-#HHHHHH#-####--
#-####-#HHHHHH#-####-#
#o####-########-####o#
#o....----------....o#
#o####.########.####o#
#o####.########.####o#
#ooo..............ooo#
###o##############o###
###o##############o###
#ooo...---P----...ooo#
#o####.########.####o#
#o####.########.####o#
#o@oooooooooooooooo@o#
######################`);
  });

  const boards: [string, MazeLayout][] = [
    ["maze1", getLayout("maze1")],
    ["maze2", getLayout("maze2")],
    ["mazeSmall", getLayout("mazeSmall")],
    ...["a", "b", "c", "d", "e"].flatMap((seed): [string, MazeLayout][] => {
      const { ascii } = generateMazeAsciiWithRetries(seed)!;
      return [
        [`generated ${seed}`, layoutFromAscii(ascii)],
        [`inverted ${seed}`, layoutFromAscii(invertMazeAscii(ascii))],
      ];
    }),
  ];

  it.each(boards)(
    "%s: each form is one gap-free piece and Plus is a strict subset",
    (_, layout) => {
      const base = lazyLooperRequiredCells(layout, "outerInner");
      const plus = lazyLooperRequiredCells(layout, "outer");
      expect(pieceCount(layout, "outerInner")).toBe(1);
      expect(pieceCount(layout, "outer")).toBe(1);
      const baseKeys = new Set(base.map(({ col, row }) => `${col},${row}`));
      expect(plus.every(({ col, row }) => baseKeys.has(`${col},${row}`))).toBe(true);
      expect(plus.length).toBeLessThan(base.length);
      expect(base.length).toBeLessThan(layout.pelletCount);
    },
  );

  it.each(boards)("%s: the required set is left-right symmetric", (_, layout) => {
    const keys = new Set(
      lazyLooperRequiredCells(layout, "outerInner").map(({ col, row }) => `${col},${row}`),
    );
    for (const key of keys) {
      const [col, row] = key.split(",").map(Number) as [number, number];
      expect(keys.has(`${layout.cols - 1 - col},${row}`)).toBe(true);
    }
  });
});

describe("pelletTint", () => {
  it("greys only optional regular pellets", () => {
    expect(pelletTint(PELLET_DRAWABLE_ID, true)).toBe(LAZY_LOOPER_OPTIONAL_TINT);
    expect(pelletTint(PELLET_DRAWABLE_ID, false)).toBeNull();
    expect(pelletTint(POWER_PELLET_DRAWABLE_ID, true)).toBeNull();
  });
});
