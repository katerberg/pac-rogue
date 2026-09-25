import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, MAZE_COLS } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { applyTunnelDash } from "./tunnelDash";

const TUNNEL_ROW = 14;
// Classic 28-col geometry: leftBand = floor(28*5/28) = 5 (cols 0-5), rightBand = floor(28*6/28) = 6 (cols 22-27).
const LEFT_BAND_COL = 3;
const RIGHT_BAND_COL = MAZE_COLS - 1 - 3;
const OUTSIDE_BAND_COL = 10;

function spawnWorld(playerCol: number, row: number, facing: Direction) {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  addComponent(world, eid, Facing);
  Position.x[eid] = cellCenterX(playerCol);
  Position.y[eid] = cellCenterY(row);
  Facing.direction[eid] = facing;
  return { world, eid };
}

function spawnPellet(
  world: ReturnType<typeof createWorld>,
  col: number,
  row: number,
  power = false,
) {
  const eid = addEntity(world);
  addComponent(world, eid, Pellet);
  addComponent(world, eid, Position);
  if (power) {
    addComponent(world, eid, PowerPellet);
  }
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  return eid;
}

describe("applyTunnelDash", () => {
  it("lands at the literal opposite tunnel mouth, not a mirrored band position", () => {
    const { world, eid } = spawnWorld(LEFT_BAND_COL, TUNNEL_ROW, DIRECTION.left);

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(MAZE_COLS - 1));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("lands at the literal left mouth when dashing from the right band", () => {
    const { world, eid } = spawnWorld(RIGHT_BAND_COL, TUNNEL_ROW, DIRECTION.right);

    applyTunnelDash(world);

    expect(Position.x[eid]).toBe(cellCenterX(0));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("sweeps and removes pellets between the trigger point and the near edge, leaving none behind", () => {
    const { world } = spawnWorld(LEFT_BAND_COL, TUNNEL_ROW, DIRECTION.left);
    const swept1 = spawnPellet(world, 0, TUNNEL_ROW);
    const swept2 = spawnPellet(world, 2, TUNNEL_ROW);
    const beyond = spawnPellet(world, 5, TUNNEL_ROW);
    const otherRow = spawnPellet(world, 1, TUNNEL_ROW + 1);

    const result = applyTunnelDash(world);

    expect(result.sweptPelletEids.sort()).toEqual([swept1, swept2].sort());
    expect([...query(world, [Pellet])].sort()).toEqual([beyond, otherRow].sort());
  });

  it("reports swept power pellets separately for onPowerPellet effects and Second Chomp", () => {
    const { world } = spawnWorld(LEFT_BAND_COL, TUNNEL_ROW, DIRECTION.left);
    spawnPellet(world, 1, TUNNEL_ROW, true);

    const result = applyTunnelDash(world);

    expect(result.sweptPowerRemoved).toBe(1);
    expect(result.sweptPowerPositions).toEqual([{ x: cellCenterX(1), y: cellCenterY(TUNNEL_ROW) }]);
  });

  it("does not fire immediately after dashing (no ping-pong)", () => {
    const { world, eid } = spawnWorld(LEFT_BAND_COL, TUNNEL_ROW, DIRECTION.left);

    const first = applyTunnelDash(world);
    const second = applyTunnelDash(world);

    expect(first.sweptPelletEids).toEqual([]);
    expect(second.sweptPelletEids).toEqual([]);
    expect(Position.x[eid]).toBe(cellCenterX(MAZE_COLS - 1));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("does not fire when facing inward inside a band", () => {
    const { world, eid } = spawnWorld(LEFT_BAND_COL, TUNNEL_ROW, DIRECTION.right);

    const result = applyTunnelDash(world);

    expect(result.sweptPelletEids).toEqual([]);
    expect(Position.x[eid]).toBe(cellCenterX(LEFT_BAND_COL));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("does not fire outside either band", () => {
    const { world, eid } = spawnWorld(OUTSIDE_BAND_COL, TUNNEL_ROW, DIRECTION.left);

    const result = applyTunnelDash(world);

    expect(result.sweptPelletEids).toEqual([]);
    expect(Position.x[eid]).toBe(cellCenterX(OUTSIDE_BAND_COL));
    expect(Position.y[eid]).toBe(cellCenterY(TUNNEL_ROW));
  });

  it("does not fire on a non-tunnel row even within the same columns", () => {
    const { world, eid } = spawnWorld(0, 1, DIRECTION.left);

    const result = applyTunnelDash(world);

    expect(result.sweptPelletEids).toEqual([]);
    expect(Position.x[eid]).toBe(cellCenterX(0));
    expect(Position.y[eid]).toBe(cellCenterY(1));
  });

  it("no-ops without a player", () => {
    const world = createWorld();
    expect(() => applyTunnelDash(world)).not.toThrow();
  });
});
