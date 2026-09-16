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
import { forceGhostReverse } from "./ghostReverse";

function spawnAlignedGhost(col: number, row: number, facing: Direction) {
  const world = createWorld();
  const player = addEntity(world);
  addComponent(world, player, Position);
  addComponent(world, player, Facing);
  addComponent(world, player, Player);
  Position.x[player] = cellCenterX(1);
  Position.y[player] = cellCenterY(1);
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
  GhostKind.kind[ghost] = GHOST_KIND.blinky;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
  Ghost.decidedCol[ghost] = Number.NaN;
  Ghost.decidedRow[ghost] = Number.NaN;
  return { world, ghost };
}

describe("forceGhostReverse", () => {
  it("sets both Facing and Input to the reversed direction", () => {
    const { world, ghost } = spawnAlignedGhost(6, 5, DIRECTION.right);
    forceGhostReverse(world);
    expect(Facing.direction[ghost]).toBe(DIRECTION.left);
    expect(Input.direction[ghost]).toBe(DIRECTION.left);
  });

  it("keeps the reverse when ghostAi is skipped on a force-reverse tick", () => {
    const { world, ghost } = spawnAlignedGhost(6, 5, DIRECTION.right);
    forceGhostReverse(world);
    expect(Facing.direction[ghost]).toBe(DIRECTION.left);
    expect(Input.direction[ghost]).toBe(DIRECTION.left);
  });

  it("holds reverse on the same tile when ghostAi runs the next aligned frame", () => {
    const { world, ghost } = spawnAlignedGhost(6, 5, DIRECTION.right);
    Ghost.decidedCol[ghost] = 6;
    Ghost.decidedRow[ghost] = 5;
    forceGhostReverse(world);
    expect(Facing.direction[ghost]).toBe(DIRECTION.left);
    expect(Input.direction[ghost]).toBe(DIRECTION.left);
    expect(Ghost.decidedCol[ghost]).toBe(6);
    expect(Ghost.decidedRow[ghost]).toBe(5);

    ghostAi(world, GHOST_AI_MODE.scatter, 244);
    expect(Facing.direction[ghost]).toBe(DIRECTION.left);
    expect(Input.direction[ghost]).toBe(DIRECTION.left);
  });

  it("locks the current tile when reverse fires before a decision on that tile", () => {
    const { world, ghost } = spawnAlignedGhost(6, 5, DIRECTION.right);
    forceGhostReverse(world);
    ghostAi(world, GHOST_AI_MODE.scatter, 244);
    expect(Facing.direction[ghost]).toBe(DIRECTION.left);
    expect(Input.direction[ghost]).toBe(DIRECTION.left);
    expect(Ghost.decidedCol[ghost]).toBe(6);
    expect(Ghost.decidedRow[ghost]).toBe(5);
  });

  it("would overwrite an Input-only reverse when ghostAi runs while unlocked", () => {
    const { world, ghost } = spawnAlignedGhost(6, 5, DIRECTION.right);
    Input.direction[ghost] = DIRECTION.left;
    Facing.direction[ghost] = DIRECTION.right;
    ghostAi(world, GHOST_AI_MODE.scatter, 244);
    expect(Input.direction[ghost]).not.toBe(DIRECTION.left);
  });

  it("redirects to the open L turn when reverse would enter a wall", () => {
    const { world, ghost } = spawnAlignedGhost(1, 29, DIRECTION.right);
    forceGhostReverse(world);
    expect(Facing.direction[ghost]).toBe(DIRECTION.up);
    expect(Input.direction[ghost]).toBe(DIRECTION.up);
    expect(Ghost.decidedCol[ghost]).toBe(1);
    expect(Ghost.decidedRow[ghost]).toBe(29);
  });
});
