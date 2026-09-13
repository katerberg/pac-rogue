import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, isSolid, worldToCol, worldToRow } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { DIRECTION, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { movement } from "./movement";

/**
 * Integration: real maze grid + ECS movement (no Phaser).
 * Guards wall blocking and buffered corridor turns.
 */
function spawnPlayer(col: number, row: number) {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Input);
  addComponent(world, eid, Facing);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Input.direction[eid] = DIRECTION.none;
  Facing.direction[eid] = DIRECTION.none;
  return { world, eid };
}

function tick(world: ReturnType<typeof createWorld>, ms: number, steps = 1): void {
  for (let i = 0; i < steps; i += 1) {
    movement(world, ms);
  }
}

describe("movement integration (real maze)", () => {
  it("cannot move through a wall", () => {
    const startCol = 1;
    const startRow = 1;
    expect(isSolid(startCol, startRow - 1)).toBe(true);

    const { world, eid } = spawnPlayer(startCol, startRow);
    Facing.direction[eid] = DIRECTION.up;
    Input.direction[eid] = DIRECTION.up;

    tick(world, 50, 40);

    expect(worldToCol(Position.x[eid] ?? 0)).toBe(startCol);
    expect(worldToRow(Position.y[eid] ?? 0)).toBe(startRow);
    expect(isSolid(worldToCol(Position.x[eid] ?? 0), worldToRow(Position.y[eid] ?? 0))).toBe(false);
    expect(Position.y[eid]).toBeCloseTo(cellCenterY(startRow), 5);
    expect(Facing.direction[eid]).toBe(DIRECTION.none);
  });

  it("can turn at a corridor junction when next direction becomes valid", () => {
    // Row 5 corridor; col 6 is a T-junction with an opening upward.
    const startCol = 9;
    const startRow = 5;
    const junctionCol = 6;
    expect(isSolid(junctionCol, startRow)).toBe(false);
    expect(isSolid(junctionCol, startRow - 1)).toBe(false);

    const { world, eid } = spawnPlayer(startCol, startRow);
    Facing.direction[eid] = DIRECTION.left;
    Input.direction[eid] = DIRECTION.up;

    let turned = false;
    for (let i = 0; i < 120; i += 1) {
      movement(world, 16);
      // Read via Number so TS does not narrow the SoA slot to DIRECTION.left.
      if (Number(Facing.direction[eid]) === DIRECTION.up) {
        turned = true;
        break;
      }
    }

    expect(turned).toBe(true);
    expect(worldToCol(Position.x[eid] ?? 0)).toBe(junctionCol);
    expect(Position.y[eid] ?? 0).toBeLessThan(cellCenterY(startRow));
  });
});
