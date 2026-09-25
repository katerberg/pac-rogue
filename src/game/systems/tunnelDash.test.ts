import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, MAZE_COLS } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { applyTunnelDash } from "./tunnelDash";

const TUNNEL_ROW = 14;

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
  it("relocates the player to the mirrored tunnel mouth when entering the left mouth facing left", () => {
    const { world, eid } = spawnPlayerAt(cellCenterX(0), cellCenterY(TUNNEL_ROW), DIRECTION.left);

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(MAZE_COLS - 1));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("relocates the player to the mirrored tunnel mouth when entering the right mouth facing right", () => {
    const { world, eid } = spawnPlayerAt(
      cellCenterX(MAZE_COLS - 1),
      cellCenterY(TUNNEL_ROW),
      DIRECTION.right,
    );

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(0));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("does not fire immediately after dashing (no ping-pong)", () => {
    const { world, eid } = spawnPlayerAt(cellCenterX(0), cellCenterY(TUNNEL_ROW), DIRECTION.left);

    applyTunnelDash(world);
    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(MAZE_COLS - 1));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("does not fire when facing inward at a tunnel mouth", () => {
    const { world, eid } = spawnPlayerAt(cellCenterX(0), cellCenterY(TUNNEL_ROW), DIRECTION.right);

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(0));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("does not fire away from a tunnel mouth", () => {
    const { world, eid } = spawnPlayerAt(cellCenterX(5), cellCenterY(TUNNEL_ROW), DIRECTION.left);

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(5));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("no-ops without a player", () => {
    const world = createWorld();
    expect(() => applyTunnelDash(world)).not.toThrow();
  });
});
