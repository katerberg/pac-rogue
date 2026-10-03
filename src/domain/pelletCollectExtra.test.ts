import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY } from "./maze";
import { pickFurthestPelletEids, remoteTransferTriggers } from "./pelletCollectExtra";

describe("pickFurthestPelletEids", () => {
  const py = cellCenterY(1);
  const px = cellCenterX(2);

  it("returns the farthest pellet first", () => {
    const near = { eid: 1, x: cellCenterX(3), y: py };
    const far = { eid: 2, x: cellCenterX(0), y: py };
    expect(pickFurthestPelletEids([near, far], px, py, 1)).toEqual([2]);
  });

  it("breaks equal distance ties with lowest eid", () => {
    const a = { eid: 5, x: cellCenterX(0), y: py };
    const b = { eid: 2, x: cellCenterX(4), y: py };
    expect(pickFurthestPelletEids([a, b], px, py, 1)).toEqual([2]);
  });

  it("returns all when fewer than count, and none for empty or zero count", () => {
    const only = { eid: 9, x: cellCenterX(0), y: py };
    expect(pickFurthestPelletEids([only], px, py, 3)).toEqual([9]);
    expect(pickFurthestPelletEids([], px, py, 3)).toEqual([]);
    expect(pickFurthestPelletEids([only], px, py, 0)).toEqual([]);
  });
});

describe("remoteTransferTriggers", () => {
  it("counts each multiple of `every` crossed", () => {
    expect(remoteTransferTriggers(0, 4, 5)).toBe(0);
    expect(remoteTransferTriggers(4, 5, 5)).toBe(1);
    expect(remoteTransferTriggers(4, 11, 5)).toBe(2);
    expect(remoteTransferTriggers(5, 6, 5)).toBe(0);
    expect(remoteTransferTriggers(0, 9, 0)).toBe(0);
  });
});
