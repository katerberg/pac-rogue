import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  cellCenterX,
  cellCenterY,
  isSolid,
  MAZE_COLS,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { PLAYER_SPEED, playerPreTurnPx } from "../../domain/playfield";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { movement } from "./movement";

function spawnPlayer(col: number, row: number, ghost = false) {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Input);
  addComponent(world, eid, Facing);
  addComponent(world, eid, Speed);
  if (ghost) {
    addComponent(world, eid, Ghost);
  }
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Input.direction[eid] = DIRECTION.none;
  Facing.direction[eid] = DIRECTION.none;
  Speed.px[eid] = PLAYER_SPEED;
  return { world, eid };
}

function tick(world: ReturnType<typeof createWorld>, ms: number, steps = 1): void {
  for (let i = 0; i < steps; i += 1) {
    movement(world, ms);
  }
}

function facingOf(eid: number): Direction {
  return Facing.direction[eid] ?? DIRECTION.none;
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
      if (facingOf(eid) === DIRECTION.up) {
        turned = true;
        break;
      }
    }

    expect(turned).toBe(true);
    expect(worldToCol(Position.x[eid] ?? 0)).toBe(junctionCol);
    expect(Position.y[eid] ?? 0).toBeLessThan(cellCenterY(startRow));
  });

  it("commits the player's turn at this junction with more distance to spare than a ghost's", () => {
    const startCol = 9;
    const startRow = 5;
    const junctionCol = 6;
    const junctionCenterX = cellCenterX(junctionCol);

    const player = spawnPlayer(startCol, startRow);
    Facing.direction[player.eid] = DIRECTION.left;
    Input.direction[player.eid] = DIRECTION.up;

    let playerTurnDistance = Number.NaN;
    for (let i = 0; i < 120; i += 1) {
      const beforeX = Position.x[player.eid] ?? 0;
      movement(player.world, 16);
      if (facingOf(player.eid) === DIRECTION.up) {
        playerTurnDistance = Math.abs(beforeX - junctionCenterX);
        break;
      }
    }

    const ghost = spawnPlayer(startCol, startRow, true);
    Facing.direction[ghost.eid] = DIRECTION.left;
    Input.direction[ghost.eid] = DIRECTION.up;

    let ghostTurnDistance = Number.NaN;
    for (let i = 0; i < 120; i += 1) {
      const beforeX = Position.x[ghost.eid] ?? 0;
      movement(ghost.world, 16);
      if (facingOf(ghost.eid) === DIRECTION.up) {
        ghostTurnDistance = Math.abs(beforeX - junctionCenterX);
        break;
      }
    }

    expect(Number.isNaN(playerTurnDistance)).toBe(false);
    expect(Number.isNaN(ghostTurnDistance)).toBe(false);
    expect(playerTurnDistance).toBeGreaterThan(ghostTurnDistance);
    expect(playerTurnDistance).toBeLessThanOrEqual(playerPreTurnPx() + 1e-6);
  });

  it("wraps left through the side tunnel without losing facing or speed", () => {
    const tunnelRow = 14;
    const { world, eid } = spawnPlayer(0, tunnelRow);
    Facing.direction[eid] = DIRECTION.left;
    Input.direction[eid] = DIRECTION.left;
    const speedBefore = PLAYER_SPEED;

    let crossed = false;
    for (let i = 0; i < 40; i += 1) {
      movement(world, 16);
      if (worldToCol(Position.x[eid] ?? 0) >= MAZE_COLS - 3) {
        crossed = true;
        break;
      }
    }

    expect(crossed).toBe(true);
    expect(Facing.direction[eid]).toBe(DIRECTION.left);
    expect(Velocity.x[eid]).toBe(-speedBefore);
    expect(Velocity.y[eid]).toBe(0);
    expect(Position.y[eid]).toBeCloseTo(cellCenterY(tunnelRow), 5);
  });

  it("wraps right through the side tunnel without losing facing or speed", () => {
    const tunnelRow = 14;
    const { world, eid } = spawnPlayer(MAZE_COLS - 1, tunnelRow);
    Facing.direction[eid] = DIRECTION.right;
    Input.direction[eid] = DIRECTION.right;

    let crossed = false;
    for (let i = 0; i < 40; i += 1) {
      movement(world, 16);
      if (worldToCol(Position.x[eid] ?? 0) <= 2) {
        crossed = true;
        break;
      }
    }

    expect(crossed).toBe(true);
    expect(Facing.direction[eid]).toBe(DIRECTION.right);
    expect(Velocity.x[eid]).toBe(PLAYER_SPEED);
    expect(Velocity.y[eid]).toBe(0);
    expect(Position.y[eid]).toBeCloseTo(cellCenterY(tunnelRow), 5);
  });
});
