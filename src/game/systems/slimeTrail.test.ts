import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  SLIME_TRAIL_MAX_LEN,
  createRunCorruption,
  type RunCorruption,
} from "../../domain/corruption";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY, worldToCol, worldToRow } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { tickSlimeTrail } from "./slimeTrail";

function spawnGhost(
  world: ReturnType<typeof createWorld>,
  col: number,
  row: number,
  phase: GhostPhaseValue = GHOST_PHASE.active,
) {
  const eid = addEntity(world);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, GhostKind);
  addComponent(world, eid, GhostPhase);
  addComponent(world, eid, Position);
  GhostKind.kind[eid] = GHOST_KIND.pinky;
  GhostPhase.value[eid] = phase;
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  return eid;
}

describe("tickSlimeTrail", () => {
  it("no-ops for a different corruption type", () => {
    const world = createWorld();
    spawnGhost(world, 5, 5);
    const state = createRunCorruption({ type: "speedSurge", ghostKind: GHOST_KIND.pinky });
    expect(tickSlimeTrail(world, state)).toBe(state);
  });

  it("appends the corrupted ghost's current tile", () => {
    const world = createWorld();
    spawnGhost(world, 5, 5);
    const state = {
      ...createRunCorruption({ type: null, ghostKind: null }),
      type: "slimeTrail" as const,
      ghostKind: GHOST_KIND.pinky,
    };
    const next = tickSlimeTrail(world, state);
    expect(next.trail).toEqual([
      { col: worldToCol(cellCenterX(5)), row: worldToRow(cellCenterY(5)) },
    ]);
  });

  it("caps the trail at SLIME_TRAIL_MAX_LEN", () => {
    const world = createWorld();
    const eid = spawnGhost(world, 0, 5);
    let state: RunCorruption = {
      ...createRunCorruption({ type: null, ghostKind: null }),
      type: "slimeTrail",
      ghostKind: GHOST_KIND.pinky,
    };
    for (let col = 0; col <= SLIME_TRAIL_MAX_LEN; col += 1) {
      Position.x[eid] = cellCenterX(col);
      state = tickSlimeTrail(world, state);
    }
    expect(state.trail).toHaveLength(SLIME_TRAIL_MAX_LEN);
    expect(state.trail[0]).toEqual({ col: 1, row: 5 });
    expect(state.trail[state.trail.length - 1]).toEqual({ col: SLIME_TRAIL_MAX_LEN, row: 5 });
  });

  it("skips an inHouse ghost", () => {
    const world = createWorld();
    spawnGhost(world, 5, 5, GHOST_PHASE.inHouse);
    const state = {
      ...createRunCorruption({ type: null, ghostKind: null }),
      type: "slimeTrail" as const,
      ghostKind: GHOST_KIND.pinky,
    };
    expect(tickSlimeTrail(world, state)).toBe(state);
  });
});
