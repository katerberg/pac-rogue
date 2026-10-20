import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { pickReactiveArmorGhosts } from "./reactiveArmor";

function spawnPlayer(col: number, row: number) {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  return { world, eid };
}

function spawnGhost(
  world: ReturnType<typeof createWorld>,
  col: number,
  row: number,
  phase: GhostPhaseValue = GHOST_PHASE.active,
) {
  const eid = addEntity(world);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, GhostPhase);
  addComponent(world, eid, Position);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  GhostPhase.value[eid] = phase;
  return eid;
}

describe("pickReactiveArmorGhosts", () => {
  it("returns only the contact ghost when radius is null", () => {
    const { world } = spawnPlayer(10, 10);
    const contact = spawnGhost(world, 10, 10);
    spawnGhost(world, 11, 10);
    expect(pickReactiveArmorGhosts(world, { contactEid: contact, radiusTiles: null })).toEqual([
      contact,
    ]);
  });

  it("returns empty for contact-only with no contact or an in-house contact", () => {
    const { world } = spawnPlayer(10, 10);
    const house = spawnGhost(world, 10, 10, GHOST_PHASE.inHouse);
    expect(pickReactiveArmorGhosts(world, { contactEid: null, radiusTiles: null })).toEqual([]);
    expect(pickReactiveArmorGhosts(world, { contactEid: house, radiusTiles: null })).toEqual([]);
  });

  it("picks every non-in-house ghost within the tile radius", () => {
    const { world } = spawnPlayer(10, 10);
    const near = spawnGhost(world, 12, 10);
    const edge = spawnGhost(world, 14, 10);
    const far = spawnGhost(world, 15, 10);
    const house = spawnGhost(world, 11, 10, GHOST_PHASE.inHouse);
    const picked = pickReactiveArmorGhosts(world, { contactEid: near, radiusTiles: 4 });
    expect(picked).toEqual([near, edge].sort((a, b) => a - b));
    expect(picked).not.toContain(far);
    expect(picked).not.toContain(house);
  });

  it("uses an explicit from point when given", () => {
    const { world } = spawnPlayer(0, 0);
    const ghost = spawnGhost(world, 10, 10);
    expect(
      pickReactiveArmorGhosts(world, {
        contactEid: null,
        radiusTiles: 1,
        from: { x: cellCenterX(10), y: cellCenterY(10) },
      }),
    ).toEqual([ghost]);
  });
});
