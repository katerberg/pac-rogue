import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  PELLET_DROPPER_COUNT,
  PELLET_DROPPER_INTERVAL_MS,
  TELEGRAPH_FLASH_MS,
  createRunCorruption,
} from "../../domain/corruption";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { tickPelletDropperTrail } from "./pelletDropperTrail";

function spawnGhost(world: ReturnType<typeof createWorld>, col: number, row: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, GhostKind);
  addComponent(world, eid, GhostPhase);
  addComponent(world, eid, Position);
  GhostKind.kind[eid] = GHOST_KIND.inky;
  GhostPhase.value[eid] = GHOST_PHASE.active;
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  return eid;
}

function corrupted() {
  return {
    ...createRunCorruption({ type: null, ghostKind: null }),
    type: "pelletDropper" as const,
    ghostKind: GHOST_KIND.inky,
  };
}

describe("tickPelletDropperTrail", () => {
  it("no-ops for a different corruption type", () => {
    const world = createWorld();
    spawnGhost(world, 5, 5);
    const state = createRunCorruption({ type: "speedSurge", ghostKind: GHOST_KIND.inky });
    const result = tickPelletDropperTrail(world, state, 100, 50);
    expect(result).toEqual({ corruption: state, spawnTiles: [] });
  });

  it("tracks its tile but does not trigger before the interval elapses", () => {
    const world = createWorld();
    spawnGhost(world, 5, 5);
    const result = tickPelletDropperTrail(world, corrupted(), PELLET_DROPPER_INTERVAL_MS - 1, 50);
    expect(result.spawnTiles).toEqual([]);
    expect(result.corruption.pelletDropperFlashMs).toBe(0);
    expect(result.corruption.pelletDropperLastTile).toEqual({ col: 5, row: 5 });
  });

  it("does not trigger while no pellets remain", () => {
    const world = createWorld();
    spawnGhost(world, 5, 5);
    const result = tickPelletDropperTrail(world, corrupted(), PELLET_DROPPER_INTERVAL_MS + 1, 0);
    expect(result.spawnTiles).toEqual([]);
    expect(result.corruption.pelletDropperFlashMs).toBe(0);
  });

  it("flashes at the interval boundary, then drops one pellet behind per tile it leaves", () => {
    const world = createWorld();
    const eid = spawnGhost(world, 5, 5);
    const moveTo = (col: number) => {
      Position.x[eid] = cellCenterX(col);
    };

    const triggered = tickPelletDropperTrail(world, corrupted(), PELLET_DROPPER_INTERVAL_MS, 50);
    expect(triggered.spawnTiles).toEqual([]);
    expect(triggered.corruption.pelletDropperFlashMs).toBe(TELEGRAPH_FLASH_MS);

    const stillFlashing = tickPelletDropperTrail(
      world,
      triggered.corruption,
      TELEGRAPH_FLASH_MS - 1,
      50,
    );
    expect(stillFlashing.spawnTiles).toEqual([]);
    expect(stillFlashing.corruption.pelletDropperDropsLeft).toBe(0);

    let tick = tickPelletDropperTrail(world, stillFlashing.corruption, 2, 50);
    expect(tick.spawnTiles).toEqual([]);
    expect(tick.corruption.pelletDropperFlashMs).toBe(0);
    expect(tick.corruption.pelletDropperDropsLeft).toBe(PELLET_DROPPER_COUNT);

    tick = tickPelletDropperTrail(world, tick.corruption, 16, 50);
    expect(tick.spawnTiles).toEqual([]);

    const dropped: unknown[] = [];
    for (const col of [6, 6, 7, 8, 9]) {
      moveTo(col);
      tick = tickPelletDropperTrail(world, tick.corruption, 16, 50);
      dropped.push(...tick.spawnTiles);
    }
    expect(dropped).toEqual([
      { col: 5, row: 5 },
      { col: 6, row: 5 },
      { col: 7, row: 5 },
    ]);
    expect(tick.corruption.pelletDropperDropsLeft).toBe(0);
  });

  it("skips an inHouse ghost", () => {
    const world = createWorld();
    const eid = spawnGhost(world, 5, 5);
    GhostPhase.value[eid] = GHOST_PHASE.inHouse;
    const state = corrupted();
    const result = tickPelletDropperTrail(world, state, PELLET_DROPPER_INTERVAL_MS + 1, 50);
    expect(result).toEqual({ corruption: state, spawnTiles: [] });
  });
});
