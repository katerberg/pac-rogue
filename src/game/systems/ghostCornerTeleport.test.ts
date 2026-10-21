import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { ghostTeleportCell, scatterTargetForKind } from "../../domain/ghostCorner";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY, getActiveLayout } from "../../domain/maze";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { teleportGhostsToCorners } from "./ghostCornerTeleport";

function spawnGhost(world: ReturnType<typeof createWorld>, col: number, row: number, kind: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, GhostKind);
  addComponent(world, eid, GhostPhase);
  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Speed);
  addComponent(world, eid, Input);
  addComponent(world, eid, Facing);
  addComponent(world, eid, Drawable);
  GhostKind.kind[eid] = kind;
  GhostPhase.value[eid] = GHOST_PHASE.active;
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Speed.px[eid] = 0;
  Input.direction[eid] = DIRECTION.none;
  Facing.direction[eid] = DIRECTION.none;
  Drawable.radius[eid] = 8;
  return eid;
}

describe("teleportGhostsToCorners", () => {
  it("onlyOnCell flings matching active ghosts and leaves others put", () => {
    const world = createWorld();
    const spawn = getActiveLayout().playerSpawn;
    const player = addEntity(world);
    addComponent(world, player, Player);
    addComponent(world, player, Position);
    Position.x[player] = cellCenterX(spawn.col);
    Position.y[player] = cellCenterY(spawn.row);

    const onCell = spawnGhost(world, spawn.col, spawn.row, GHOST_KIND.blinky);
    const elsewhere = spawnGhost(world, spawn.col + 3, spawn.row, GHOST_KIND.pinky);
    const elsewhereAt = { x: Position.x[elsewhere]!, y: Position.y[elsewhere]! };
    const expected = ghostTeleportCell(scatterTargetForKind(GHOST_KIND.blinky), spawn);

    const warps = teleportGhostsToCorners(world, 0, { onlyOnCell: spawn });
    expect(warps.map((warp) => warp.eid)).toEqual([onCell]);
    expect({ x: Position.x[onCell], y: Position.y[onCell] }).toEqual({
      x: cellCenterX(expected.col),
      y: cellCenterY(expected.row),
    });
    expect({ x: Position.x[elsewhere], y: Position.y[elsewhere] }).toEqual(elsewhereAt);
    expect(query(world, [Ghost])).toHaveLength(2);
  });
});
