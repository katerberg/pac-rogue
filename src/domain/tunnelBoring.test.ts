import { beforeEach, describe, expect, it } from "vitest";
import {
  activateAsciiLayout,
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  layoutFromAscii,
  wrapPosition,
} from "./maze";
import {
  applyTunnelBoringAscii,
  mergeBoredCells,
  openBoredCellsOnLayout,
  TUNNEL_BORING_CHARGES_PER_LEVEL,
  tunnelBoringChargesForBoard,
  tunnelBoringCells,
  tunnelBoringTarget,
} from "./tunnelBoring";

describe("tunnelBoringTarget", () => {
  beforeEach(() => {
    activateLayout("mazeSmall");
  });

  it("returns the adjacent solid cell when pressing into a wall", () => {
    const layout = getActiveLayout();
    let found: { col: number; row: number; dx: number; dy: number } | null = null;
    for (let row = 0; row < layout.rows && found === null; row += 1) {
      for (let col = 0; col < layout.cols && found === null; col += 1) {
        if (!isWalkable(col, row, layout.playerSolids)) {
          continue;
        }
        if (!isWalkable(col + 1, row, layout.playerSolids)) {
          found = { col, row, dx: 1, dy: 0 };
        }
      }
    }
    expect(found).not.toBeNull();
    const target = tunnelBoringTarget(found!.col, found!.row, found!.dx, found!.dy, layout);
    expect(target).toEqual({ col: found!.col + found!.dx, row: found!.row + found!.dy });
  });

  it("rejects already-open cells and zero steps", () => {
    const layout = getActiveLayout();
    const spawn = layout.playerSpawn;
    expect(tunnelBoringTarget(spawn.col, spawn.row, 0, 0, layout)).toBeNull();
    expect(tunnelBoringTarget(spawn.col, spawn.row, 1, 0, layout)).toBeNull();
  });

  it("rejects walls that neighbor the ghost house or door", () => {
    const layout = getActiveLayout();
    let found: { col: number; row: number; dx: number; dy: number } | null = null;
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (let row = 1; row < layout.rows - 1 && found === null; row += 1) {
      for (let col = 1; col < layout.cols - 1 && found === null; col += 1) {
        if (!isWalkable(col, row, layout.playerSolids)) {
          continue;
        }
        for (const step of dirs) {
          const target = { col: col + step.dx, row: row + step.dy };
          if (isWalkable(target.col, target.row, layout.playerSolids)) {
            continue;
          }
          const nearHouse = dirs.some(
            ({ dx, dy }) =>
              layout.house[target.row + dy]?.[target.col + dx] ||
              layout.door[target.row + dy]?.[target.col + dx],
          );
          if (nearHouse) {
            found = { col, row, ...step };
            break;
          }
        }
      }
    }
    expect(found).not.toBeNull();
    expect(tunnelBoringTarget(found!.col, found!.row, found!.dx, found!.dy, layout)).toBeNull();
  });

  it("allows edge walls outside the ghost house", () => {
    const layout = getActiveLayout();
    let found: { col: number; row: number } | null = null;
    for (let col = 1; col < layout.cols - 1 && found === null; col += 1) {
      if (isWalkable(col, 1, layout.playerSolids) && !isWalkable(col, 0, layout.playerSolids)) {
        const target = tunnelBoringTarget(col, 1, 0, -1, layout);
        if (target !== null) {
          found = { col, row: 1 };
        }
      }
    }
    expect(found).not.toBeNull();
    expect(tunnelBoringTarget(found!.col, found!.row, 0, -1, layout)).toEqual({
      col: found!.col,
      row: 0,
    });
  });
});

describe("tunnelBoringCells", () => {
  beforeEach(() => {
    activateLayout("mazeSmall");
  });

  it("punches every solid cell until the far corridor", () => {
    const layout = getActiveLayout();
    // mazeSmall row 2: ##########.######.########## — six-wall span between corridors
    expect(isWalkable(10, 2, layout.playerSolids)).toBe(true);
    expect(isWalkable(17, 2, layout.playerSolids)).toBe(true);
    const cells = tunnelBoringCells(10, 2, 1, 0, layout);
    expect(cells).toEqual([
      { col: 11, row: 2 },
      { col: 12, row: 2 },
      { col: 13, row: 2 },
      { col: 14, row: 2 },
      { col: 15, row: 2 },
      { col: 16, row: 2 },
    ]);
  });

  it("opens both edges into a wrap tunnel when boring out the exterior", () => {
    const layout = getActiveLayout();
    expect(isWalkable(10, 1, layout.playerSolids)).toBe(true);
    expect(isWalkable(10, 0, layout.playerSolids)).toBe(false);
    const cells = tunnelBoringCells(10, 1, 0, -1, layout);
    expect(cells).not.toBeNull();
    expect(cells![0]).toEqual({ col: 10, row: 0 });
    expect(cells!.some((c) => c.col === 10 && c.row === layout.rows - 1)).toBe(true);

    const boredAscii = applyTunnelBoringAscii(layout.ascii, cells!);
    const rebuilt = activateAsciiLayout(boredAscii, "generated");
    openBoredCellsOnLayout(rebuilt, cells!);
    expect(isWalkable(10, 0, rebuilt.playerSolids)).toBe(true);
    expect(isWalkable(10, rebuilt.rows - 1, rebuilt.playerSolids)).toBe(true);
    const pastTop = cellCenterY(0) - rebuilt.tileSize;
    const wrapped = wrapPosition(cellCenterX(10), pastTop, rebuilt.playerSolids);
    expect(wrapped.y).toBeCloseTo(cellCenterY(rebuilt.rows - 1));
  });

  it("refuses a wrap that would sit next to an existing horizontal tunnel", () => {
    const layout = getActiveLayout();
    // Row 10 is the side tunnel; row 9 is adjacent — left exterior bore must refuse.
    expect(isWalkable(0, 10, layout.playerSolids)).toBe(true);
    expect(isWalkable(layout.cols - 1, 10, layout.playerSolids)).toBe(true);
    expect(isWalkable(4, 9, layout.playerSolids)).toBe(true);
    expect(isWalkable(3, 9, layout.playerSolids)).toBe(false);
    expect(tunnelBoringCells(4, 9, -1, 0, layout)).toBeNull();
  });
});

describe("mergeBoredCells", () => {
  it("appends without duplicating", () => {
    expect(
      mergeBoredCells(
        [
          { col: 1, row: 2 },
          { col: 2, row: 2 },
        ],
        [
          { col: 2, row: 2 },
          { col: 3, row: 2 },
        ],
      ),
    ).toEqual([
      { col: 1, row: 2 },
      { col: 2, row: 2 },
      { col: 3, row: 2 },
    ]);
  });
});

describe("applyTunnelBoringAscii / openBoredCellsOnLayout", () => {
  it("turns wall chars into empty corridors", () => {
    const ascii = ["####", "#--#", "####"].join("\n");
    const next = applyTunnelBoringAscii(ascii, [{ col: 1, row: 0 }]);
    expect(next.split("\n")[0]).toBe("#-##");
  });

  it("keeps edge bored cells open after opposite-edge safety", () => {
    activateLayout("mazeSmall");
    const layout = getActiveLayout();
    let from: { col: number; row: number } | null = null;
    for (let col = 1; col < layout.cols - 1; col += 1) {
      if (layout.walls[0]?.[col] && tunnelBoringTarget(col, 1, 0, -1, layout) !== null) {
        from = { col, row: 1 };
        break;
      }
    }
    expect(from).not.toBeNull();
    const cells = tunnelBoringCells(from!.col, from!.row, 0, -1, layout);
    expect(cells).not.toBeNull();
    const boredAscii = applyTunnelBoringAscii(layout.ascii, cells!);
    const rebuilt = layoutFromAscii(boredAscii, "generated");
    openBoredCellsOnLayout(rebuilt, cells!);
    expect(isWalkable(from!.col, 0, rebuilt.playerSolids)).toBe(true);
    expect(isWalkable(from!.col, 0, rebuilt.ghostSolids)).toBe(true);
  });
});

describe("tunnel boring charges", () => {
  it("refills to the per-level cap when owned", () => {
    expect(TUNNEL_BORING_CHARGES_PER_LEVEL).toBe(1);
    expect(tunnelBoringChargesForBoard(true)).toBe(1);
    expect(tunnelBoringChargesForBoard(false)).toBe(0);
  });
});
