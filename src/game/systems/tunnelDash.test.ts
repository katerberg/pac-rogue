import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, MAZE_COLS } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { applyTunnelDash } from "./tunnelDash";

const TUNNEL_ROW = 14;
// Classic 28-col geometry: leftBand = floor(28*5/28) = 5 (cols 0-5), rightBand = floor(28*6/28) = 6 (cols 22-27).
const LEFT_BAND_COL = 3;
const RIGHT_BAND_COL = MAZE_COLS - 1 - 3;
const OUTSIDE_BAND_COL = 10;

function spawnPlayerAt(x: number, y: number, facing: Direction) {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  addComponent(world, eid, Facing);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Facing.direction[eid] = facing;
  return { world, eid };
}

describe("applyTunnelDash", () => {
  it("relocates from anywhere in the left band (not just the boundary cell) when facing left", () => {
    const { world, eid } = spawnPlayerAt(
      cellCenterX(LEFT_BAND_COL),
      cellCenterY(TUNNEL_ROW),
      DIRECTION.left,
    );

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(MAZE_COLS - 1 - LEFT_BAND_COL));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("relocates from anywhere in the right band when facing right", () => {
    const { world, eid } = spawnPlayerAt(
      cellCenterX(RIGHT_BAND_COL),
      cellCenterY(TUNNEL_ROW),
      DIRECTION.right,
    );

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(MAZE_COLS - 1 - RIGHT_BAND_COL));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("relocates from the literal boundary cell (band edge case)", () => {
    const { world, eid } = spawnPlayerAt(cellCenterX(0), cellCenterY(TUNNEL_ROW), DIRECTION.left);

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(MAZE_COLS - 1));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("does not fire immediately after dashing (no ping-pong)", () => {
    const { world, eid } = spawnPlayerAt(
      cellCenterX(LEFT_BAND_COL),
      cellCenterY(TUNNEL_ROW),
      DIRECTION.left,
    );

    applyTunnelDash(world);
    const afterFirstDash = { x: Position.x[eid], y: Position.y[eid] };
    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(afterFirstDash.x);
    expect(Position.y[eid]).toBe(afterFirstDash.y);
  });

  it("does not fire when facing inward inside a band", () => {
    const { world, eid } = spawnPlayerAt(
      cellCenterX(LEFT_BAND_COL),
      cellCenterY(TUNNEL_ROW),
      DIRECTION.right,
    );

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(LEFT_BAND_COL));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("does not fire outside either band", () => {
    const { world, eid } = spawnPlayerAt(
      cellCenterX(OUTSIDE_BAND_COL),
      cellCenterY(TUNNEL_ROW),
      DIRECTION.left,
    );

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(OUTSIDE_BAND_COL));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("does not fire on a non-tunnel row even within the same columns", () => {
    const { world, eid } = spawnPlayerAt(cellCenterX(0), cellCenterY(1), DIRECTION.left);

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(0));
    expect(Position.y[eid]).toBe(cellCenterY(1));
  });

  it("no-ops without a player", () => {
    const world = createWorld();
    expect(() => applyTunnelDash(world)).not.toThrow();
  });
});
