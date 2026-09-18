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
import { PLAYER_SPEED } from "../../domain/playfield";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { DIRECTION, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { movement } from "./movement";

function spawnAt(col: number, row: number, ghost = false) {
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

describe("movement", () => {
  it("adopts sticky Input into Facing when aligned and path is open", () => {
    const { world, eid } = spawnAt(1, 1);
    Input.direction[eid] = DIRECTION.right;

    movement(world, 16);

    expect(Facing.direction[eid]).toBe(DIRECTION.right);
    expect(Velocity.x[eid]).toBe(PLAYER_SPEED);
    expect(Velocity.y[eid]).toBe(0);
    expect(Position.x[eid]).toBeGreaterThan(cellCenterX(1));
  });

  it("stops and clears Facing when moving into a solid neighbor", () => {
    const { world, eid } = spawnAt(1, 1);
    Facing.direction[eid] = DIRECTION.up;
    Input.direction[eid] = DIRECTION.up;

    movement(world, 100);

    expect(Facing.direction[eid]).toBe(DIRECTION.none);
    expect(Velocity.x[eid]).toBe(0);
    expect(Velocity.y[eid]).toBe(0);
    expect(Position.x[eid]).toBe(cellCenterX(1));
    expect(Position.y[eid]).toBe(cellCenterY(1));
  });

  it("enters a wall neighbor when player solids override opens walls", () => {
    const { playerSolids, wallPassPlayerSolids, walls } = getActiveLayout();
    let fromCol = -1;
    let fromRow = -1;
    for (let row = 2; row < 28 && fromCol < 0; row += 1) {
      for (let col = 2; col < 25; col += 1) {
        if (!isWalkable(col, row, playerSolids)) {
          continue;
        }
        if (walls[row]?.[col + 1] && isWalkable(col + 1, row, wallPassPlayerSolids)) {
          fromCol = col;
          fromRow = row;
          break;
        }
      }
    }
    expect(fromCol).toBeGreaterThan(0);

    const blocked = spawnAt(fromCol, fromRow);
    Facing.direction[blocked.eid] = DIRECTION.right;
    Input.direction[blocked.eid] = DIRECTION.right;
    movement(blocked.world, 100);
    expect(worldToCol(Position.x[blocked.eid] ?? 0)).toBe(fromCol);

    const open = spawnAt(fromCol, fromRow);
    Facing.direction[open.eid] = DIRECTION.right;
    Input.direction[open.eid] = DIRECTION.right;
    movement(open.world, 200, wallPassPlayerSolids);
    expect(worldToCol(Position.x[open.eid] ?? 0)).toBeGreaterThan(fromCol);
    expect(
      isWalkable(
        worldToCol(Position.x[open.eid] ?? 0),
        worldToRow(Position.y[open.eid] ?? 0),
        wallPassPlayerSolids,
      ),
    ).toBe(true);
  });

  it("keeps perimeter walls solid under the wall-pass override", () => {
    const { wallPassPlayerSolids } = getActiveLayout();
    const { world, eid } = spawnAt(1, 1);
    Facing.direction[eid] = DIRECTION.left;
    Input.direction[eid] = DIRECTION.left;
    movement(world, 100, wallPassPlayerSolids);
    expect(worldToCol(Position.x[eid] ?? 0)).toBe(1);
    expect(worldToRow(Position.y[eid] ?? 0)).toBe(1);
  });

  it("enters a house neighbor under the wall-pass override", () => {
    const { playerSolids, wallPassPlayerSolids, house } = getActiveLayout();
    let fromCol = -1;
    let fromRow = -1;
    for (let row = 2; row < 28 && fromCol < 0; row += 1) {
      for (let col = 2; col < 25; col += 1) {
        if (!isWalkable(col, row, playerSolids)) {
          continue;
        }
        if (house[row + 1]?.[col] && isWalkable(col, row + 1, wallPassPlayerSolids)) {
          fromCol = col;
          fromRow = row;
          break;
        }
      }
    }
    expect(fromCol).toBeGreaterThan(0);

    const blocked = spawnAt(fromCol, fromRow);
    Facing.direction[blocked.eid] = DIRECTION.down;
    Input.direction[blocked.eid] = DIRECTION.down;
    movement(blocked.world, 100);
    expect(worldToRow(Position.y[blocked.eid] ?? 0)).toBe(fromRow);

    const open = spawnAt(fromCol, fromRow);
    Facing.direction[open.eid] = DIRECTION.down;
    Input.direction[open.eid] = DIRECTION.down;
    movement(open.world, 200, wallPassPlayerSolids);
    expect(worldToRow(Position.y[open.eid] ?? 0)).toBeGreaterThan(fromRow);
  });

  it("keeps ghost Facing at a dead-end so reverse filtering still applies", () => {
    const { world, eid } = spawnAt(26, 1, true);
    Facing.direction[eid] = DIRECTION.right;
    Input.direction[eid] = DIRECTION.right;

    movement(world, 100);

    expect(Facing.direction[eid]).toBe(DIRECTION.right);
    expect(Velocity.x[eid]).toBe(0);
    expect(Velocity.y[eid]).toBe(0);
    expect(Position.x[eid]).toBe(cellCenterX(26));
    expect(Position.y[eid]).toBe(cellCenterY(1));
  });

  it("redirects sticky reverse Input to the turn at an L corner", () => {
    const { world, eid } = spawnAt(26, 1, true);
    Facing.direction[eid] = DIRECTION.right;
    Input.direction[eid] = DIRECTION.left;

    movement(world, 16);

    expect(Facing.direction[eid]).toBe(DIRECTION.down);
    expect(Input.direction[eid]).toBe(DIRECTION.down);
    expect(Position.y[eid]).toBeGreaterThan(cellCenterY(1));
  });

  it("still allows reverse in a straight corridor", () => {
    const { world, eid } = spawnAt(20, 1, true);
    Facing.direction[eid] = DIRECTION.right;
    Input.direction[eid] = DIRECTION.left;

    movement(world, 16);

    expect(Facing.direction[eid]).toBe(DIRECTION.left);
    expect(Input.direction[eid]).toBe(DIRECTION.left);
  });

  it("approaches a facing wall continuously instead of snapping to center", () => {
    const { world, eid } = spawnAt(1, 1);
    const startX = cellCenterX(1) + 7;
    Position.x[eid] = startX;
    Facing.direction[eid] = DIRECTION.left;
    Input.direction[eid] = DIRECTION.left;

    movement(world, 16);

    const expected = startX - PLAYER_SPEED * 0.016;
    expect(Position.x[eid]).toBeCloseTo(expected, 5);
    expect(Position.x[eid]).toBeGreaterThan(cellCenterX(1));
    expect(Facing.direction[eid]).toBe(DIRECTION.left);
  });

  it("commits a 90-degree turn at the cell center without jumping back", () => {
    const { world, eid } = spawnAt(6, 5);
    const cx = cellCenterX(6);
    const cy = cellCenterY(5);
    Position.x[eid] = cx + 2;
    Position.y[eid] = cy;
    Facing.direction[eid] = DIRECTION.left;
    Input.direction[eid] = DIRECTION.up;

    movement(world, 16);

    expect(Facing.direction[eid]).toBe(DIRECTION.up);
    expect(Position.x[eid]).toBeCloseTo(cx, 5);
    expect(Position.y[eid]).toBeLessThan(cy);
  });

  it("keeps traveling on Facing when sticky Input is blocked", () => {
    const { world, eid } = spawnAt(1, 1);
    Facing.direction[eid] = DIRECTION.right;
    Input.direction[eid] = DIRECTION.up;

    movement(world, 16);

    expect(Facing.direction[eid]).toBe(DIRECTION.right);
    expect(Velocity.x[eid]).toBe(PLAYER_SPEED);
  });

  it("does not clear sticky Input when stopped", () => {
    const { world, eid } = spawnAt(1, 1);
    Input.direction[eid] = DIRECTION.up;
    Facing.direction[eid] = DIRECTION.none;

    movement(world, 16);

    expect(Input.direction[eid]).toBe(DIRECTION.up);
    expect(Facing.direction[eid]).toBe(DIRECTION.none);
    expect(Velocity.x[eid]).toBe(0);
    expect(Velocity.y[eid]).toBe(0);
  });
});
