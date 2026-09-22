import { afterEach, describe, expect, it } from "vitest";
import {
  activateAsciiLayout,
  activateLayout,
  getActiveLayout,
  isTunnelMouth,
  isWalkable,
} from "./maze";
import {
  boardMazeSeed,
  GENERATE_MAX_ATTEMPTS,
  GENERATED_MAZE_COLS,
  GENERATED_MAZE_ROWS,
  generateMazeAsciiWithRetries,
  hasThinInteriorWallSeparator,
  resolveBoardSelection,
} from "./mazeGenerate";

describe("mazeGenerate", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("resolveBoardSelection prefers override, mazeSmall at level 1, generate afterward", () => {
    expect(resolveBoardSelection(1, "maze2", "run")).toEqual({ kind: "static", id: "maze2" });
    expect(resolveBoardSelection(5, "maze1", "run")).toEqual({ kind: "static", id: "maze1" });
    expect(resolveBoardSelection(1, null, "run")).toEqual({ kind: "static", id: "mazeSmall" });
    expect(resolveBoardSelection(2, null, "run")).toEqual({
      kind: "generate",
      seed: boardMazeSeed("run", 2),
    });
  });

  it("boardMazeSeed is stable and level-sensitive", () => {
    expect(boardMazeSeed("abc", 2)).toBe("abc:L2");
    expect(boardMazeSeed("abc", 2)).toBe(boardMazeSeed("abc", 2));
    expect(boardMazeSeed("abc", 3)).not.toBe(boardMazeSeed("abc", 2));
  });

  it("hasThinInteriorWallSeparator detects a lone wall between corridors", () => {
    const thin = ["-----", "--#--", "-----"].join("\n");
    expect(hasThinInteriorWallSeparator(thin)).toBe(true);
    const thick = ["------", "--##--", "--##--", "------"].join("\n");
    expect(hasThinInteriorWallSeparator(thick)).toBe(false);
  });

  it("generateMazeAsciiWithRetries succeeds for many seeds and satisfies invariants", () => {
    const seeds = Array.from({ length: 20 }, (_, i) => `batch-${i}`);
    for (const seed of seeds) {
      const result = generateMazeAsciiWithRetries(seed);
      expect(result, `seed ${seed}`).not.toBeNull();
      const ascii = result!.ascii;
      const lines = ascii.split("\n");
      expect(lines).toHaveLength(GENERATED_MAZE_ROWS);
      expect(lines[0]).toHaveLength(GENERATED_MAZE_COLS);
      expect(ascii).toContain("P");
      expect((ascii.match(/@/g) ?? []).length).toBe(4);
      expect(hasThinInteriorWallSeparator(ascii)).toBe(false);

      for (let row = 0; row < lines.length; row += 1) {
        const chars = [...lines[row]!];
        for (let col = 0; col < chars.length; col += 1) {
          const a = chars[col] === "P" ? "-" : chars[col];
          const b = chars[chars.length - 1 - col] === "P" ? "-" : chars[chars.length - 1 - col];
          expect(a, `row ${row} col ${col}`).toBe(b);
        }
      }

      const layout = activateAsciiLayout(ascii);
      expect(layout.id).toBe("generated");
      expect(layout.pelletCount).toBeGreaterThan(0);
      expect(isWalkable(layout.playerSpawn.col, layout.playerSpawn.row, layout.playerSolids)).toBe(
        true,
      );

      const tunnelRows: number[] = [];
      for (let row = 0; row < layout.rows; row += 1) {
        if (isTunnelMouth(0, row, layout.playerSolids)) {
          tunnelRows.push(row);
        }
      }
      expect(tunnelRows.length).toBeGreaterThanOrEqual(1);
      expect(tunnelRows.length).toBeLessThanOrEqual(2);
      for (let i = 0; i < tunnelRows.length - 1; i += 1) {
        expect(tunnelRows[i + 1]! - tunnelRows[i]!).toBeGreaterThan(1);
      }

      const tunnelSet = new Set(tunnelRows);
      for (let row = 0; row < layout.rows; row += 1) {
        for (let col = 0; col < layout.cols; col += 1) {
          if (!isWalkable(col, row, layout.playerSolids)) {
            continue;
          }
          let degree = 0;
          const neighbors = [
            [col, row - 1],
            [col, row + 1],
            [col - 1, row],
            [col + 1, row],
          ] as const;
          for (const [nColRaw, nRow] of neighbors) {
            let nCol = nColRaw;
            if (nCol < 0 && tunnelSet.has(row)) {
              nCol = layout.cols - 1;
            } else if (nCol >= layout.cols && tunnelSet.has(row)) {
              nCol = 0;
            }
            if (nCol < 0 || nCol >= layout.cols || nRow < 0 || nRow >= layout.rows) {
              continue;
            }
            if (isWalkable(nCol, nRow, layout.playerSolids)) {
              degree += 1;
            }
          }
          expect(degree, `dead end ${col},${row}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  }, 60_000);

  it("same seed yields identical ascii", () => {
    const a = generateMazeAsciiWithRetries("identical");
    const b = generateMazeAsciiWithRetries("identical");
    expect(a?.ascii).toBe(b?.ascii);
    expect(a?.seedUsed).toBe(b?.seedUsed);
  });

  it("generateMazeAsciiWithRetries finds a valid board for a known seed family", () => {
    expect(GENERATE_MAX_ATTEMPTS).toBe(32);
    expect(generateMazeAsciiWithRetries("ok-seed-0")).not.toBeNull();
  });

  it("activates generated layout geometry on the active board", () => {
    const result = generateMazeAsciiWithRetries("geometry-check");
    expect(result).not.toBeNull();
    activateAsciiLayout(result!.ascii);
    const layout = getActiveLayout();
    expect(layout.cols).toBe(GENERATED_MAZE_COLS);
    expect(layout.rows).toBe(GENERATED_MAZE_ROWS);
    expect(layout.ghostHouseExit).toBeTruthy();
    expect(layout.fruitSpawn).toBeTruthy();
  });
});
