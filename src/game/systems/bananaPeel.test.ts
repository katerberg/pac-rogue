import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { ghostRadius } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { ghostTouchingPeel, peelTailAnchor, stepBananaPeelTail } from "./bananaPeel";

function spawnPlayer(world: ReturnType<typeof createWorld>, x: number, y: number): number {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Player);
  addComponent(world, eid, Facing);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Facing.direction[eid] = DIRECTION.right;
  return eid;
}

function spawnGhost(
  world: ReturnType<typeof createWorld>,
  x: number,
  y: number,
  phase = GHOST_PHASE.active,
): number {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, GhostPhase);
  addComponent(world, eid, Drawable);
  Position.x[eid] = x;
  Position.y[eid] = y;
  GhostPhase.value[eid] = phase;
  Drawable.radius[eid] = ghostRadius();
  return eid;
}

describe("bananaPeel system", () => {
  it("anchors the peel trail behind the player facing", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 50);
    expect(peelTailAnchor(world, 0, 16)).toMatchObject({ x: 100, y: 50, heading: 0 });
  });

  it("turns the peel heading smoothly on reverse instead of flipping instantly", () => {
    const world = createWorld();
    const player = spawnPlayer(world, 100, 50);
    const first = peelTailAnchor(world, 0, 16)!;
    expect(first.heading).toBe(0);
    Facing.direction[player] = DIRECTION.left;
    const turned = peelTailAnchor(world, first.heading, 16)!;
    // Shortest turn from right→left goes through up (negative heading).
    expect(turned.heading).toBeLessThan(0);
    expect(Math.abs(turned.heading)).toBeLessThan(Math.PI);
  });

  it("keeps the last peel heading when Dot-Man stops", () => {
    const world = createWorld();
    const player = spawnPlayer(world, 100, 50);
    Facing.direction[player] = DIRECTION.left;
    let heading = 0;
    for (let i = 0; i < 20; i += 1) {
      heading = peelTailAnchor(world, heading, 16)!.heading;
    }
    expect(Math.cos(heading)).toBeCloseTo(-1, 5);
    Facing.direction[player] = DIRECTION.none;
    expect(peelTailAnchor(world, heading, 16)!.heading).toBe(heading);
  });

  it("steps peels to match the banked count", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 50);
    const stepped = stepBananaPeelTail(world, [], 2, {
      dtMs: 16,
      nowMs: 0,
      motion: 1,
      blocked: () => false,
    });
    expect(stepped.beads).toHaveLength(2);
    expect(stepped.dropped).toEqual([]);
  });

  it("drops beads when the bank shrinks", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 50);
    const full = stepBananaPeelTail(world, [], 2, {
      dtMs: 16,
      nowMs: 0,
      motion: 0,
      blocked: () => false,
    });
    const shrunk = stepBananaPeelTail(world, full.beads, 1, {
      dtMs: 16,
      nowMs: 16,
      motion: 0,
      blocked: () => false,
    });
    expect(shrunk.beads).toHaveLength(1);
    expect(shrunk.dropped).toHaveLength(1);
  });

  it("detects a ghost overlapping a peel bead", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 50);
    const beads = stepBananaPeelTail(world, [], 1, {
      dtMs: 16,
      nowMs: 0,
      motion: 0,
      blocked: () => false,
    }).beads;
    const bead = beads[0]!;
    const ghost = spawnGhost(world, bead.x, bead.y);
    expect(ghostTouchingPeel(world, beads)).toBe(ghost);
  });

  it("ignores ghosts that are far from every peel", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 50);
    const beads = stepBananaPeelTail(world, [], 1, {
      dtMs: 16,
      nowMs: 0,
      motion: 0,
      blocked: () => false,
    }).beads;
    spawnGhost(world, 400, 400);
    expect(ghostTouchingPeel(world, beads)).toBeNull();
  });

  it("skips frozen and house ghosts", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 50);
    const beads = stepBananaPeelTail(world, [], 1, {
      dtMs: 16,
      nowMs: 0,
      motion: 0,
      blocked: () => false,
    }).beads;
    const bead = beads[0]!;
    const frozen = spawnGhost(world, bead.x, bead.y);
    expect(ghostTouchingPeel(world, beads, { frozenGhostEid: frozen })).toBeNull();
    GhostPhase.value[frozen] = GHOST_PHASE.inHouse;
    expect(ghostTouchingPeel(world, beads)).toBeNull();
  });
});
