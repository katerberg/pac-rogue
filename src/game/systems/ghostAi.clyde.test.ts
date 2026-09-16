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

function spawnClydeAtIntersection(playerCol: number, playerRow: number) {
  const world = createWorld();

  const player = addEntity(world);
  addComponent(world, player, Position);
  addComponent(world, player, Facing);
  addComponent(world, player, Player);
  Position.x[player] = cellCenterX(playerCol);
  Position.y[player] = cellCenterY(playerRow);
  Facing.direction[player] = DIRECTION.none;

  const ghost = addEntity(world);
  addComponent(world, ghost, Position);
  addComponent(world, ghost, Velocity);
  addComponent(world, ghost, Input);
  addComponent(world, ghost, Facing);
  addComponent(world, ghost, Speed);
  addComponent(world, ghost, Ghost);
  addComponent(world, ghost, GhostKind);
  addComponent(world, ghost, GhostPhase);
  Position.x[ghost] = cellCenterX(6);
  Position.y[ghost] = cellCenterY(5);
  Velocity.x[ghost] = 0;
  Velocity.y[ghost] = 0;
  Input.direction[ghost] = DIRECTION.right;
  Facing.direction[ghost] = DIRECTION.right;
  Speed.px[ghost] = GHOST_SPEED;
  GhostKind.kind[ghost] = GHOST_KIND.clyde;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
  Ghost.decidedCol[ghost] = Number.NaN;
  Ghost.decidedRow[ghost] = Number.NaN;

  return { world, ghost };
}

describe("ghostAi Clyde shy chase", () => {
  it("steers toward the player when far away", () => {
    const { world, ghost } = spawnClydeAtIntersection(20, 5);
    ghostAi(world, GHOST_AI_MODE.chase, 244);
    expect(Input.direction[ghost]).toBe(DIRECTION.right);
  });

  it("steers toward the SW scatter corner when close", () => {
    const { world, ghost } = spawnClydeAtIntersection(8, 5);
    ghostAi(world, GHOST_AI_MODE.chase, 244);
    expect(Input.direction[ghost]).toBe(DIRECTION.down);
  });
});
