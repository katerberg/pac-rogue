import { describe, expect, it } from "vitest";
import { nearestWalkableBesidePowerPellet, respawnCenter } from "./reanimation";
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

  it("respawns at spawn without Reanimation", () => {
    expect(respawnCenter([], fell)).toEqual(playerSpawnCenter());
  });

  it("respawns at the center of the cell the player fell in with Reanimation", () => {
    const center = { x: cellCenterX(cell.col), y: cellCenterY(cell.row) };
    expect(respawnCenter(["passiveReanimation"], fell)).toEqual(center);
  });

  it("respawns beside a power pellet when enhanced and one remains", () => {
    const { playerSolids } = getActiveLayout();
    let pellet: { col: number; row: number } | null = null;
    for (let row = 1; row < playerSolids.length && pellet === null; row += 1) {
      for (let col = 1; col < (playerSolids[row]?.length ?? 0); col += 1) {
        if (!isWalkable(col, row, playerSolids)) {
          continue;
        }
        const hasNeighbor = [
          { col: col - 1, row },
          { col: col + 1, row },
          { col, row: row - 1 },
          { col, row: row + 1 },
        ].some((n) => isWalkable(n.col, n.row, playerSolids));
        if (hasNeighbor) {
          pellet = { col, row };
        }
      }
    }
    expect(pellet).not.toBeNull();
    const power = { x: cellCenterX(pellet!.col), y: cellCenterY(pellet!.row) };
    const center = respawnCenter(["passiveReanimationPlus"], fell, [power]);
    expect(isWalkable(worldToCol(center.x), worldToRow(center.y), playerSolids)).toBe(true);
    const dCol = Math.abs(worldToCol(center.x) - pellet!.col);
    const dRow = Math.abs(worldToRow(center.y) - pellet!.row);
    expect(dCol + dRow).toBe(1);
  });

  it("falls back to where the player fell when enhanced and no power pellet remains", () => {
    const center = { x: cellCenterX(cell.col), y: cellCenterY(cell.row) };
    expect(respawnCenter(["passiveReanimationPlus"], fell, [])).toEqual(center);
  });

  it("snaps a fall inside a wall to the nearest walkable cell", () => {
    const { playerSolids } = getActiveLayout();
    const wall = { x: cellCenterX(0), y: cellCenterY(0) };
    expect(isWalkable(0, 0, playerSolids)).toBe(false);
    const center = respawnCenter(["passiveReanimation"], wall);
    expect(isWalkable(worldToCol(center.x), worldToRow(center.y), playerSolids)).toBe(true);
  });

  it("falls back to spawn with no fall position", () => {
    expect(respawnCenter(["passiveReanimation"], null)).toEqual(playerSpawnCenter());
  });
});

describe("nearestWalkableBesidePowerPellet", () => {
  it("returns null when there are no power pellets", () => {
    expect(nearestWalkableBesidePowerPellet({ x: 0, y: 0 }, [])).toBeNull();
  });
});
