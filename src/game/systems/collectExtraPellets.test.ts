import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, type SolidGrid } from "../../domain/maze";
import { PELLET_RADIUS } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { collectExtraPellets } from "./collectExtraPellets";

function grid(rows: string[]): SolidGrid {
  return rows.map((line) => [...line].map((ch) => ch === "#"));
}

function spawnPellet(world: ReturnType<typeof createWorld>, x: number, y: number, power = false) {
  const eid = addEntity(world);
  addComponent(world, eid, Pellet);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  if (power) {
    addComponent(world, eid, PowerPellet);
  }
  Position.x[eid] = x;
  Position.y[eid] = y;
  Drawable.radius[eid] = PELLET_RADIUS;
  return eid;
}

const openRow = grid(["#####", ".....", "#####"]);

describe("collectExtraPellets", () => {
  it("no-ops when count is zero", () => {
    const world = createWorld();
    spawnPellet(world, cellCenterX(0), cellCenterY(1));
    expect(
      collectExtraPellets(world, 0, cellCenterX(2), cellCenterY(1), { col: 0, row: 0 }, openRow),
    ).toEqual([]);
    expect(query(world, [Pellet])).toHaveLength(1);
  });

  it("removes only regular pellets and leaves energizers", () => {
    const world = createWorld();
    const py = cellCenterY(1);
    const near = spawnPellet(world, cellCenterX(1), py);
    const mid = spawnPellet(world, cellCenterX(0), py);
    const power = spawnPellet(world, cellCenterX(3), py, true);
    spawnPellet(world, cellCenterX(4), py);

    const removedEids = collectExtraPellets(
      world,
      2,
      cellCenterX(2),
      py,
      { col: 0, row: 0 },
      openRow,
    );
    expect(removedEids).toEqual([near, mid]);
    expect(query(world, [Pellet])).toHaveLength(2);
    expect(query(world, [PowerPellet])).toEqual([power]);
  });

  it("returns empty when only energizers remain", () => {
    const world = createWorld();
    const power = spawnPellet(world, cellCenterX(0), cellCenterY(1), true);
    expect(
      collectExtraPellets(world, 3, cellCenterX(2), cellCenterY(1), { col: 0, row: 0 }, openRow),
    ).toEqual([]);
    expect(query(world, [Pellet])).toEqual([power]);
  });

  it("collects all remaining regulars when fewer than count", () => {
    const world = createWorld();
    const only = spawnPellet(world, cellCenterX(0), cellCenterY(1));
    expect(
      collectExtraPellets(world, 3, cellCenterX(2), cellCenterY(1), { col: 1, row: 0 }, openRow),
    ).toEqual([only]);
    expect(query(world, [Pellet])).toHaveLength(0);
  });

  it("skips pellets on the open forward corridor", () => {
    const world = createWorld();
    const py = cellCenterY(1);
    const ahead = spawnPellet(world, cellCenterX(3), py);
    const behind = spawnPellet(world, cellCenterX(1), py);
    const removed = collectExtraPellets(world, 3, cellCenterX(2), py, { col: 1, row: 0 }, openRow);
    expect(removed).toEqual([behind]);
    expect(query(world, [Pellet])).toEqual([ahead]);
  });
});
