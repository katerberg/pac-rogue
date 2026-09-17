import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { ghostAi } from "./ghostAi";

function spawnInkyChaseSetup(blinkyCol: number, blinkyRow: number) {
  const world = createWorld();

  const player = addEntity(world);
  addComponent(world, player, Position);
  addComponent(world, player, Facing);
  addComponent(world, player, Player);
  Position.x[player] = cellCenterX(14);
  Position.y[player] = cellCenterY(5);
  Facing.direction[player] = DIRECTION.right;

  const blinky = addEntity(world);
  addComponent(world, blinky, Position);
  addComponent(world, blinky, Velocity);
  addComponent(world, blinky, Input);
  addComponent(world, blinky, Facing);
  addComponent(world, blinky, Speed);
  addComponent(world, blinky, Ghost);
  addComponent(world, blinky, GhostKind);
  addComponent(world, blinky, GhostPhase);
  Position.x[blinky] = cellCenterX(blinkyCol);
  Position.y[blinky] = cellCenterY(blinkyRow);
  Input.direction[blinky] = DIRECTION.none;
  Facing.direction[blinky] = DIRECTION.none;
  Speed.px[blinky] = 0;
  GhostKind.kind[blinky] = GHOST_KIND.blinky;
  GhostPhase.value[blinky] = GHOST_PHASE.inHouse;

  const inky = addEntity(world);
  addComponent(world, inky, Position);
  addComponent(world, inky, Velocity);
  addComponent(world, inky, Input);
  addComponent(world, inky, Facing);
  addComponent(world, inky, Speed);
  addComponent(world, inky, Ghost);
  addComponent(world, inky, GhostKind);
  addComponent(world, inky, GhostPhase);
  Position.x[inky] = cellCenterX(6);
  Position.y[inky] = cellCenterY(5);
  Velocity.x[inky] = 0;
  Velocity.y[inky] = 0;
  Input.direction[inky] = DIRECTION.right;
  Facing.direction[inky] = DIRECTION.right;
  Speed.px[inky] = GHOST_SPEED;
  GhostKind.kind[inky] = GHOST_KIND.inky;
  GhostPhase.value[inky] = GHOST_PHASE.active;
  Ghost.decidedCol[inky] = Number.NaN;
  Ghost.decidedRow[inky] = Number.NaN;

  return { world, inky };
}

describe("ghostAi Inky Blinky vector", () => {
  it("changes turn choice when Blinky's tile changes the doubled target", () => {
    const towardRight = spawnInkyChaseSetup(10, 5);
    ghostAi(towardRight.world, GHOST_AI_MODE.chase, 244);
    expect(Input.direction[towardRight.inky]).toBe(DIRECTION.right);

    const towardLeft = spawnInkyChaseSetup(28, 5);
    ghostAi(towardLeft.world, GHOST_AI_MODE.chase, 244);
    expect(Input.direction[towardLeft.inky]).toBe(DIRECTION.up);
  });
});
