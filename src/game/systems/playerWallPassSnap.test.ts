import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { snapPlayerToNearestWalkable } from "./playerWallPassSnap";

describe("snapPlayerToNearestWalkable", () => {
  it("no-ops when there is no player", () => {
    const world = createWorld();
    expect(() => snapPlayerToNearestWalkable(world)).not.toThrow();
  });

  it("leaves a walkable player in place", () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Player);
    addComponent(world, eid, Position);
    addComponent(world, eid, Velocity);
    const { playerSpawn } = getActiveLayout();
    Position.x[eid] = cellCenterX(playerSpawn.col);
    Position.y[eid] = cellCenterY(playerSpawn.row);
    Velocity.x[eid] = 10;
    snapPlayerToNearestWalkable(world);
    expect(Position.x[eid]).toBe(cellCenterX(playerSpawn.col));
    expect(Position.y[eid]).toBe(cellCenterY(playerSpawn.row));
    expect(Velocity.x[eid]).toBe(10);
  });

  it("snaps out of a solid cell onto nearest playerSolids walkable center", () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Player);
    addComponent(world, eid, Position);
    addComponent(world, eid, Velocity);
    const { walls, exterior, house, playerSolids } = getActiveLayout();
    let wallCol = -1;
    let wallRow = -1;
    for (let row = 0; row < 31 && wallCol < 0; row += 1) {
      for (let col = 0; col < 28; col += 1) {
        if (walls[row]![col] && !exterior[row]![col] && !house[row]![col]) {
          wallCol = col;
          wallRow = row;
          break;
        }
      }
    }
    expect(wallCol).toBeGreaterThanOrEqual(0);
    expect(isWalkable(wallCol, wallRow, playerSolids)).toBe(false);

    Position.x[eid] = cellCenterX(wallCol);
    Position.y[eid] = cellCenterY(wallRow);
    Velocity.x[eid] = 5;
    Velocity.y[eid] = 5;
    snapPlayerToNearestWalkable(world);

    const col = worldToCol(Position.x[eid] ?? 0);
    const row = worldToRow(Position.y[eid] ?? 0);
    expect(isWalkable(col, row, playerSolids)).toBe(true);
    expect(Position.x[eid]).toBe(cellCenterX(col));
    expect(Position.y[eid]).toBe(cellCenterY(row));
    expect(Velocity.x[eid]).toBe(0);
    expect(Velocity.y[eid]).toBe(0);
  });
});
