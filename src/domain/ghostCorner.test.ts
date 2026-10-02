import { afterEach, describe, expect, it } from "vitest";
import {
  CORNER_TELEPORT_PLAYER_SAFE_TILES,
  ghostCornerCell,
  ghostTeleportCell,
  scatterTargetForKind,
} from "./ghostCorner";
import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import {
  activateAsciiLayout,
  activateLayout,
  getActiveLayout,
  isHouse,
  isWalkable,
  type MazeTile,
} from "./maze";
import { generateMazeAsciiWithRetries } from "./mazeGenerate";

const KINDS: GhostKindId[] = [
  GHOST_KIND.blinky,
  GHOST_KIND.pinky,
  GHOST_KIND.inky,
  GHOST_KIND.clyde,
];

function expectInOwnQuadrant(kind: GhostKindId, cell: MazeTile): void {
  const { cols, rows } = getActiveLayout();
  const right = kind === GHOST_KIND.blinky || kind === GHOST_KIND.inky;
  const bottom = kind === GHOST_KIND.inky || kind === GHOST_KIND.clyde;
  expect(cell.col >= cols / 2).toBe(right);
  expect(cell.row >= rows / 2).toBe(bottom);
  expect(isWalkable(cell.col, cell.row)).toBe(true);
  expect(isHouse(cell.col, cell.row)).toBe(false);
}

describe("ghostCornerCell", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("puts each ghost on a walkable cell in its own corner of maze1", () => {
    activateLayout("maze1");
    for (const kind of KINDS) {
      expectInOwnQuadrant(kind, ghostCornerCell(scatterTargetForKind(kind)));
    }
  });

  it("finds a corner cell for every ghost on generated boards", () => {
    for (const seed of ["corner-a", "corner-b", "corner-c"]) {
      activateAsciiLayout(generateMazeAsciiWithRetries(seed)!.ascii);
      for (const kind of KINDS) {
        expectInOwnQuadrant(kind, ghostCornerCell(scatterTargetForKind(kind)));
      }
    }
  });
});

describe("ghostTeleportCell", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("sends the ghost to its corner when the player is far away", () => {
    activateLayout("maze1");
    const target = scatterTargetForKind(GHOST_KIND.pinky);
    const corner = ghostCornerCell(target);
    const { cols, rows } = getActiveLayout();
    expect(ghostTeleportCell(target, { col: cols - 2, row: rows - 2 })).toEqual(corner);
  });

  it("sends the ghost to the house exit when its corner is near the player", () => {
    activateLayout("maze1");
    const target = scatterTargetForKind(GHOST_KIND.pinky);
    const corner = ghostCornerCell(target);
    const near = { col: corner.col, row: corner.row + CORNER_TELEPORT_PLAYER_SAFE_TILES };
    expect(ghostTeleportCell(target, corner)).toEqual(getActiveLayout().ghostHouseExit);
    expect(ghostTeleportCell(target, near)).toEqual(getActiveLayout().ghostHouseExit);
    expect(ghostTeleportCell(target, { ...near, row: near.row + 1 })).toEqual(corner);
  });
});
