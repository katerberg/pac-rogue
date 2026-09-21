import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, type SolidGrid } from "./maze";
import { pickClosestOffForwardPelletEids } from "./pelletCollectExtra";

function grid(rows: string[]): SolidGrid {
  return rows.map((line) => [...line].map((ch) => ch === "#"));
}

const openRow = grid(["#####", ".....", "#####"]);

describe("pickClosestOffForwardPelletEids", () => {
  it("returns empty when count is non-positive or candidates empty", () => {
    const solids = openRow;
    const px = cellCenterX(2);
    const py = cellCenterY(1);
    expect(
      pickClosestOffForwardPelletEids(
        [{ eid: 1, x: cellCenterX(0), y: py }],
        px,
        py,
        { col: 0, row: 0 },
        solids,
        0,
      ),
    ).toEqual([]);
    expect(pickClosestOffForwardPelletEids([], px, py, { col: 1, row: 0 }, solids, 3)).toEqual([]);
  });

  it("with facing none excludes nothing and picks closest by Euclidean distance", () => {
    const py = cellCenterY(1);
    const px = cellCenterX(2);
    const far = { eid: 10, x: cellCenterX(0), y: py };
    const near = { eid: 20, x: cellCenterX(3), y: py };
    const mid = { eid: 30, x: cellCenterX(4), y: py };
    expect(
      pickClosestOffForwardPelletEids([far, mid, near], px, py, { col: 0, row: 0 }, openRow, 2),
    ).toEqual([20, 10]);
  });

  it("excludes pellets on the open forward corridor and keeps behind eligible", () => {
    const py = cellCenterY(1);
    const px = cellCenterX(2);
    const aheadNear = { eid: 1, x: cellCenterX(3), y: py };
    const aheadFar = { eid: 2, x: cellCenterX(4), y: py };
    const behind = { eid: 3, x: cellCenterX(1), y: py };
    const side = { eid: 4, x: cellCenterX(2), y: cellCenterY(0) };
    expect(
      pickClosestOffForwardPelletEids(
        [aheadNear, aheadFar, behind, side],
        px,
        py,
        { col: 1, row: 0 },
        openRow,
        3,
      ),
    ).toEqual([3, 4]);
  });

  it("stops the corridor at the first solid so pellets past a wall stay eligible", () => {
    const solids = grid(["#####", "...#.", "#####"]);
    const py = cellCenterY(1);
    const px = cellCenterX(1);
    const beforeWall = { eid: 1, x: cellCenterX(2), y: py };
    const pastWall = { eid: 2, x: cellCenterX(4), y: py };
    const behind = { eid: 3, x: cellCenterX(0), y: py };
    expect(
      pickClosestOffForwardPelletEids(
        [beforeWall, pastWall, behind],
        px,
        py,
        { col: 1, row: 0 },
        solids,
        2,
      ),
    ).toEqual([3, 2]);
  });

  it("breaks equal distance ties with lowest eid", () => {
    const px = cellCenterX(2);
    const py = cellCenterY(1);
    const a = { eid: 5, x: cellCenterX(1), y: py };
    const b = { eid: 2, x: cellCenterX(3), y: py };
    expect(pickClosestOffForwardPelletEids([a, b], px, py, { col: 0, row: 0 }, openRow, 1)).toEqual(
      [2],
    );
  });

  it("returns all eligible when fewer than count remain", () => {
    const px = cellCenterX(2);
    const py = cellCenterY(1);
    const only = { eid: 9, x: cellCenterX(0), y: py };
    expect(pickClosestOffForwardPelletEids([only], px, py, { col: 1, row: 0 }, openRow, 3)).toEqual(
      [9],
    );
  });

  it("does not exclude the player cell itself", () => {
    const px = cellCenterX(2);
    const py = cellCenterY(1);
    const sameCell = { eid: 7, x: px, y: py };
    expect(
      pickClosestOffForwardPelletEids([sameCell], px, py, { col: 1, row: 0 }, openRow, 1),
    ).toEqual([7]);
  });
});
