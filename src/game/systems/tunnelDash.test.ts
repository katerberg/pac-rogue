import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, MAZE_COLS } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { applyTunnelDash, tickTunnelDashAnimation } from "./tunnelDash";

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
  it("triggers from the left band, targeting the near mouth with a far-mouth wrap destination", () => {
    const { world, eid } = spawnWorld(LEFT_BAND_COL, TUNNEL_ROW, DIRECTION.left);

    const result = applyTunnelDash(world);

    expect(result).not.toBeNull();
    expect(result!.animateToX).toBe(cellCenterX(0));
    expect(result!.wrapToX).toBe(cellCenterX(MAZE_COLS - 1));
    expect(result!.y).toBe(cellCenterY(TUNNEL_ROW));
    // Position is left untouched — the caller animates it via tickTunnelDashAnimation.
    expect(Position.x[eid]).toBe(cellCenterX(LEFT_BAND_COL));
  });

  it("triggers from the right band, targeting the near mouth with a far-mouth wrap destination", () => {
    const { world, eid } = spawnWorld(RIGHT_BAND_COL, TUNNEL_ROW, DIRECTION.right);

    const result = applyTunnelDash(world);

    expect(result).not.toBeNull();
    expect(result!.animateToX).toBe(cellCenterX(MAZE_COLS - 1));
    expect(result!.wrapToX).toBe(cellCenterX(0));
    expect(Position.x[eid]).toBe(cellCenterX(RIGHT_BAND_COL));
  });

  it("sweeps and removes pellets between the trigger point and the near edge, leaving none behind", () => {
    const { world } = spawnWorld(LEFT_BAND_COL, TUNNEL_ROW, DIRECTION.left);
    const swept1 = spawnPellet(world, 0, TUNNEL_ROW);
    const swept2 = spawnPellet(world, 2, TUNNEL_ROW);
    const beyond = spawnPellet(world, 5, TUNNEL_ROW);
    const otherRow = spawnPellet(world, 1, TUNNEL_ROW + 1);

    const result = applyTunnelDash(world);

    expect(result!.sweptPelletEids.sort()).toEqual([swept1, swept2].sort());
    expect([...query(world, [Pellet])].sort()).toEqual([beyond, otherRow].sort());
  });

  it("reports swept power pellets separately for onPowerPellet effects and Second Chomp", () => {
    const { world } = spawnWorld(LEFT_BAND_COL, TUNNEL_ROW, DIRECTION.left);
    spawnPellet(world, 1, TUNNEL_ROW, true);

    const result = applyTunnelDash(world);

    expect(result!.sweptPowerRemoved).toBe(1);
    expect(result!.sweptPowerPositions).toEqual([
      { x: cellCenterX(1), y: cellCenterY(TUNNEL_ROW) },
    ]);
  });

  it("does not fire when facing inward inside a band", () => {
    const { world, eid } = spawnWorld(LEFT_BAND_COL, TUNNEL_ROW, DIRECTION.right);

    const result = applyTunnelDash(world);

    expect(result).toBeNull();
    expect(Position.x[eid]).toBe(cellCenterX(LEFT_BAND_COL));
  });

  it("does not fire outside either band", () => {
    const { world } = spawnWorld(OUTSIDE_BAND_COL, TUNNEL_ROW, DIRECTION.left);

    expect(applyTunnelDash(world)).toBeNull();
  });

  it("does not fire on a non-tunnel row even within the same columns", () => {
    const { world } = spawnWorld(0, 1, DIRECTION.left);

    expect(applyTunnelDash(world)).toBeNull();
  });

  it("returns null without a player", () => {
    const world = createWorld();
    expect(applyTunnelDash(world)).toBeNull();
  });
});

describe("tickTunnelDashAnimation", () => {
  it("moves the player toward targetX at the given speed", () => {
    const { world, eid } = spawnWorld(LEFT_BAND_COL, TUNNEL_ROW, DIRECTION.left);
    const anim = {
      targetX: cellCenterX(0),
      wrapToX: cellCenterX(MAZE_COLS - 1),
      y: cellCenterY(TUNNEL_ROW),
    };
    const startX = Position.x[eid]!;

    const next = tickTunnelDashAnimation(world, anim, 16, 100);

    expect(next).not.toBeNull();
    expect(Position.x[eid]).toBeCloseTo(startX - 100 * (16 / 1000), 5);
  });

  it("snaps to wrapToX and returns null once the target is reached", () => {
    const { world, eid } = spawnWorld(0, TUNNEL_ROW, DIRECTION.left);
    const anim = {
      targetX: cellCenterX(0),
      wrapToX: cellCenterX(MAZE_COLS - 1),
      y: cellCenterY(TUNNEL_ROW),
    };

    const next = tickTunnelDashAnimation(world, anim, 16, 100);

    expect(next).toBeNull();
    expect(Position.x[eid]).toBe(cellCenterX(MAZE_COLS - 1));
  });

  it("returns null without a player", () => {
    const world = createWorld();
    const anim = { targetX: 0, wrapToX: 0, y: 0 };
    expect(tickTunnelDashAnimation(world, anim, 16, 100)).toBeNull();
  });
});
