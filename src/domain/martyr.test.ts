import { describe, expect, it } from "vitest";
import { respawnCenter } from "./martyr";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  playerSpawnCenter,
  worldToCol,
  worldToRow,
} from "./maze";

function walkableCellAwayFromSpawn(): { col: number; row: number } {
  const { playerSolids, playerSpawn } = getActiveLayout();
  for (let row = 1; row < playerSolids.length; row += 1) {
    for (let col = 1; col < (playerSolids[row]?.length ?? 0); col += 1) {
      if (isWalkable(col, row, playerSolids) && row !== playerSpawn.row) {
        return { col, row };
      }
    }
  }
  throw new Error("no walkable cell");
}

describe("respawnCenter", () => {
  const cell = walkableCellAwayFromSpawn();
  const fell = { x: cellCenterX(cell.col) + 3, y: cellCenterY(cell.row) - 2 };

  it("respawns at spawn without Martyr", () => {
    expect(respawnCenter([], fell)).toEqual(playerSpawnCenter());
  });

  it("respawns at the center of the cell the player fell in with Martyr or Martyr+", () => {
    const center = { x: cellCenterX(cell.col), y: cellCenterY(cell.row) };
    expect(respawnCenter(["passiveMartyr"], fell)).toEqual(center);
    expect(respawnCenter(["passiveMartyrPlus"], fell)).toEqual(center);
  });

  it("snaps a fall inside a wall to the nearest walkable cell", () => {
    const { playerSolids } = getActiveLayout();
    const wall = { x: cellCenterX(0), y: cellCenterY(0) };
    expect(isWalkable(0, 0, playerSolids)).toBe(false);
    const center = respawnCenter(["passiveMartyr"], wall);
    expect(isWalkable(worldToCol(center.x), worldToRow(center.y), playerSolids)).toBe(true);
  });

  it("falls back to spawn with no fall position", () => {
    expect(respawnCenter(["passiveMartyr"], null)).toEqual(playerSpawnCenter());
  });
});
