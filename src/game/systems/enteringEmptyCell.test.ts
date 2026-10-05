import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { Fruit } from "../components/Fruit";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { enteringEmptyCell } from "./enteringEmptyCell";

function setup(vx: number, vy: number) {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  Position.x[eid] = cellCenterX(5);
  Position.y[eid] = cellCenterY(5);
  Velocity.x[eid] = vx;
  Velocity.y[eid] = vy;
  return world;
}

function place(world: ReturnType<typeof createWorld>, component: object, col: number, row: number) {
  const eid = addEntity(world);
  addComponent(world, eid, component);
  addComponent(world, eid, Position);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
}

describe("enteringEmptyCell", () => {
  it("is true when the cell ahead has no pellet or fruit", () => {
    const world = setup(50, 0);
    place(world, Pellet, 5, 5);
    place(world, Pellet, 7, 5);
    expect(enteringEmptyCell(world)).toBe(true);
  });

  it("is false when a pellet or fruit is in the cell ahead", () => {
    const pellet = setup(50, 0);
    place(pellet, Pellet, 6, 5);
    expect(enteringEmptyCell(pellet)).toBe(false);
    const fruit = setup(0, -50);
    place(fruit, Fruit, 5, 4);
    expect(enteringEmptyCell(fruit)).toBe(false);
  });

  it("checks the current cell when standing still", () => {
    const world = setup(0, 0);
    place(world, Pellet, 5, 5);
    expect(enteringEmptyCell(world)).toBe(false);
  });
});
