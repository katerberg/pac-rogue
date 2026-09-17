import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import {
  getActiveLayout,
  TILE_SIZE,
  TURN_ALIGN_EPS,
  cellCenterX,
  cellCenterY,
  hasLeftGhostHouse,
  isAlignedForTurn,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { ghostExitHouse } from "./ghostExitHouse";
import { movement } from "./movement";

function spawnLeavingGhost(col: number, row: number) {
  const world = createWorld();
  const ghost = addEntity(world);
  addComponent(world, ghost, Position);
  addComponent(world, ghost, Velocity);
  addComponent(world, ghost, Input);
  addComponent(world, ghost, Facing);
  addComponent(world, ghost, Speed);
  addComponent(world, ghost, Ghost);
  addComponent(world, ghost, GhostPhase);
  Position.x[ghost] = cellCenterX(col);
  Position.y[ghost] = cellCenterY(row);
  Velocity.x[ghost] = 0;
  Velocity.y[ghost] = 0;
  Input.direction[ghost] = DIRECTION.up;
  Facing.direction[ghost] = DIRECTION.up;
  Speed.px[ghost] = GHOST_SPEED;
  GhostPhase.value[ghost] = GHOST_PHASE.leaving;
  Ghost.decidedCol[ghost] = Number.NaN;
  Ghost.decidedRow[ghost] = Number.NaN;
  return { world, ghost };
}

describe("ghostExitHouse", () => {
  it("stays leaving while still on house or door tiles", () => {
    const { world, ghost } = spawnLeavingGhost(13, 12);
    expect(hasLeftGhostHouse(13, 12)).toBe(false);
    expect(ghostExitHouse(world)).toBe(false);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.leaving);
  });

  it("becomes active on the exit corridor tile above the door", () => {
    const { col, row } = getActiveLayout().ghostHouseExit;
    const { world, ghost } = spawnLeavingGhost(col, row);
    expect(hasLeftGhostHouse(col, row)).toBe(true);
    expect(ghostExitHouse(world)).toBe(true);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.active);
  });

  it("becomes active when a hitch lands on the exit cell off-center", () => {
    const { world, ghost } = spawnLeavingGhost(13, 12);
    const travel = TILE_SIZE / 2 + TURN_ALIGN_EPS + 2;
    const hitchDtMs = (travel / GHOST_SPEED) * 1000;
    movement(world, hitchDtMs);

    const x = Position.x[ghost] ?? 0;
    const y = Position.y[ghost] ?? 0;
    const exit = getActiveLayout().ghostHouseExit;
    expect(worldToCol(x)).toBe(exit.col);
    expect(worldToRow(y)).toBe(exit.row);
    expect(isAlignedForTurn(x, y, TURN_ALIGN_EPS)).toBe(false);
    expect(hasLeftGhostHouse(worldToCol(x), worldToRow(y))).toBe(true);

    expect(ghostExitHouse(world)).toBe(true);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.active);
  });

  it("becomes active when a hitch skips the exit cell entirely", () => {
    const { world, ghost } = spawnLeavingGhost(13, 12);
    const exitRow = getActiveLayout().ghostHouseExit.row;
    Position.x[ghost] = cellCenterX(12);
    Position.y[ghost] = cellCenterY(exitRow);
    expect(hasLeftGhostHouse(12, exitRow)).toBe(true);
    expect(ghostExitHouse(world)).toBe(true);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.active);
  });
});
