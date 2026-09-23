import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { ghostAi } from "./ghostAi";

function spawnAlignedGhost(kind: number, col: number, row: number, facing: Direction) {
  const world = createWorld();
  const player = addEntity(world);
  addComponent(world, player, Position);
  addComponent(world, player, Facing);
  addComponent(world, player, Player);
  Facing.direction[player] = DIRECTION.none;

  const ghost = addEntity(world);
  addComponent(world, ghost, Position);
  addComponent(world, ghost, Input);
  addComponent(world, ghost, Facing);
  addComponent(world, ghost, Ghost);
  addComponent(world, ghost, GhostKind);
  addComponent(world, ghost, GhostPhase);
  Position.x[ghost] = cellCenterX(col);
  Position.y[ghost] = cellCenterY(row);
  Facing.direction[ghost] = facing;
  Input.direction[ghost] = facing;
  GhostKind.kind[ghost] = kind;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
  Ghost.decidedCol[ghost] = Number.NaN;
  Ghost.decidedRow[ghost] = Number.NaN;

  return { world, player, ghost };
}

describe("ghostAi freeRetargetReverse corruption", () => {
  it("never voluntarily reverses without the corruption", () => {
    const { world, player, ghost } = spawnAlignedGhost(GHOST_KIND.pinky, 6, 5, DIRECTION.right);
    Position.x[player] = cellCenterX(1);
    Position.y[player] = cellCenterY(5);

    ghostAi(world, GHOST_AI_MODE.chase, 244);
    expect(Input.direction[ghost]).not.toBe(DIRECTION.left);
    expect(Input.direction[ghost]).toBe(DIRECTION.up);
  });

  it("reverses mid-corridor toward a closer target when corrupted", () => {
    const { world, player, ghost } = spawnAlignedGhost(GHOST_KIND.pinky, 6, 5, DIRECTION.right);
    Position.x[player] = cellCenterX(1);
    Position.y[player] = cellCenterY(5);

    ghostAi(world, GHOST_AI_MODE.chase, 244, {
      corruption: { ghostKind: GHOST_KIND.pinky, type: "freeRetargetReverse" },
    });
    expect(Input.direction[ghost]).toBe(DIRECTION.left);
  });

  it("leaves a non-matching ghost kind unaffected", () => {
    const { world, player, ghost } = spawnAlignedGhost(GHOST_KIND.pinky, 6, 5, DIRECTION.right);
    Position.x[player] = cellCenterX(1);
    Position.y[player] = cellCenterY(5);

    ghostAi(world, GHOST_AI_MODE.chase, 244, {
      corruption: { ghostKind: GHOST_KIND.inky, type: "freeRetargetReverse" },
    });
    expect(Input.direction[ghost]).not.toBe(DIRECTION.left);
    expect(Input.direction[ghost]).toBe(DIRECTION.up);
  });
});

describe("ghostAi falseScatter corruption", () => {
  it("uses the scatter corner without the corruption", () => {
    const { world, player, ghost } = spawnAlignedGhost(GHOST_KIND.clyde, 6, 5, DIRECTION.right);
    Position.x[player] = cellCenterX(20);
    Position.y[player] = cellCenterY(5);

    ghostAi(world, GHOST_AI_MODE.scatter, 244);
    expect(Input.direction[ghost]).not.toBe(DIRECTION.right);
  });

  it("chases the player instead of scattering when corrupted", () => {
    const { world, player, ghost } = spawnAlignedGhost(GHOST_KIND.clyde, 6, 5, DIRECTION.right);
    Position.x[player] = cellCenterX(20);
    Position.y[player] = cellCenterY(5);

    ghostAi(world, GHOST_AI_MODE.scatter, 244, {
      corruption: { ghostKind: GHOST_KIND.clyde, type: "falseScatter" },
    });
    expect(Input.direction[ghost]).toBe(DIRECTION.right);
  });
});
