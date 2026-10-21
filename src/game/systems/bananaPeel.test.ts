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
    expect(peelTailAnchor(world)).toMatchObject({ x: 100, y: 50, heading: 0 });
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
