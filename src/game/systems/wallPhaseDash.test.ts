import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  TELEGRAPH_FLASH_MS,
  WALL_PHASE_CYCLE_MS,
  createRunCorruption,
} from "../../domain/corruption";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { tickWallPhaseDash } from "./wallPhaseDash";

function buildWorld(ghostCol: number, ghostRow: number, playerCol: number, playerRow: number) {
  const world = createWorld();

  const player = addEntity(world);
  addComponent(world, player, Player);
  addComponent(world, player, Position);
  Position.x[player] = cellCenterX(playerCol);
  Position.y[player] = cellCenterY(playerRow);

  const ghost = addEntity(world);
  addComponent(world, ghost, Ghost);
  addComponent(world, ghost, GhostKind);
  addComponent(world, ghost, GhostPhase);
  addComponent(world, ghost, Position);
  GhostKind.kind[ghost] = GHOST_KIND.clyde;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
  Position.x[ghost] = cellCenterX(ghostCol);
  Position.y[ghost] = cellCenterY(ghostRow);
  Ghost.decidedCol[ghost] = ghostCol;
  Ghost.decidedRow[ghost] = ghostRow;

  return { world, ghost, player };
}

function corrupted() {
  return {
    ...createRunCorruption({ type: null, ghostKind: null }),
    type: "wallPhaseDash" as const,
    ghostKind: GHOST_KIND.clyde,
  };
}

describe("tickWallPhaseDash", () => {
  it("no-ops for a different corruption type", () => {
    const { world } = buildWorld(3, 1, 3, 3);
    const state = createRunCorruption({ type: "speedSurge", ghostKind: GHOST_KIND.clyde });
    expect(tickWallPhaseDash(world, state, 100)).toBe(state);
  });

  it("does nothing before the cycle elapses", () => {
    const { world } = buildWorld(12, 2, 15, 2);
    const result = tickWallPhaseDash(world, corrupted(), WALL_PHASE_CYCLE_MS - 1);
    expect(result.wallPhasePendingTarget).toBeNull();
    expect(result.wallPhaseCycleMs).toBe(WALL_PHASE_CYCLE_MS - 1);
  });

  it("starts a flash, then relocates the ghost past the 2-thick wall once the flash completes", () => {
    // Classic maze1: (12,2) is walkable with a wall exactly 2 tiles thick to its right
    // (cols 13-14), landing on the verified walkable tile at (15,2).
    const { world, ghost } = buildWorld(12, 2, 15, 2);

    const triggered = tickWallPhaseDash(world, corrupted(), WALL_PHASE_CYCLE_MS);
    expect(triggered.wallPhasePendingTarget).toEqual({ col: 15, row: 2 });
    expect(Position.x[ghost]).toBe(cellCenterX(12));
    expect(Position.y[ghost]).toBe(cellCenterY(2));

    const stillFlashing = tickWallPhaseDash(world, triggered, TELEGRAPH_FLASH_MS - 1);
    expect(stillFlashing.wallPhasePendingTarget).toEqual({ col: 15, row: 2 });
    expect(Position.x[ghost]).toBe(cellCenterX(12));

    const fired = tickWallPhaseDash(world, stillFlashing, 2);
    expect(fired.wallPhasePendingTarget).toBeNull();
    expect(Position.x[ghost]).toBe(cellCenterX(15));
    expect(Position.y[ghost]).toBe(cellCenterY(2));
    expect(Number.isNaN(Ghost.decidedCol[ghost])).toBe(true);
    expect(Number.isNaN(Ghost.decidedRow[ghost])).toBe(true);
  });

  it("resets the cycle without a target when no orthogonal lunge is available", () => {
    // (6,5) is open on all four sides in classic maze1 — no adjacent wall to lunge through.
    const { world } = buildWorld(6, 5, 6, 5);
    const result = tickWallPhaseDash(world, corrupted(), WALL_PHASE_CYCLE_MS);
    expect(result.wallPhaseCycleMs).toBe(0);
    expect(result.wallPhasePendingTarget).toBeNull();
  });

  it("does not relocate a ghost that was recalled to the house mid-flash", () => {
    const { world, ghost } = buildWorld(12, 2, 15, 2);

    const triggered = tickWallPhaseDash(world, corrupted(), WALL_PHASE_CYCLE_MS);
    expect(triggered.wallPhasePendingTarget).toEqual({ col: 15, row: 2 });

    GhostPhase.value[ghost] = GHOST_PHASE.inHouse;
    const fired = tickWallPhaseDash(world, triggered, TELEGRAPH_FLASH_MS + 1);
    expect(fired.wallPhasePendingTarget).toBeNull();
    expect(Position.x[ghost]).toBe(cellCenterX(12));
    expect(Position.y[ghost]).toBe(cellCenterY(2));
  });
});
