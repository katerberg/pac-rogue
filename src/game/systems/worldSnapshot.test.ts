import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { worldSnapshot } from "./worldSnapshot";

function spawnAt(world: ReturnType<typeof createWorld>, col: number, row: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Facing);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  return eid;
}

describe("worldSnapshot", () => {
  it("reports an empty world", () => {
    expect(worldSnapshot(createWorld())).toEqual({
      player: null,
      ghosts: [],
      pellets: 0,
      powerPellets: 0,
      bossPellets: 0,
      fruit: false,
    });
  });

  it("names the player's cell and facing", () => {
    const world = createWorld();
    const eid = spawnAt(world, 3, 5);
    addComponent(world, eid, Player);
    Facing.direction[eid] = DIRECTION.upLeft;

    expect(worldSnapshot(world).player).toMatchObject({ col: 3, row: 5, facing: "upLeft" });
  });

  it("names ghost kind and phase and flags boss ghosts", () => {
    const world = createWorld();
    const eid = spawnAt(world, 4, 6);
    addComponent(world, eid, Ghost);
    addComponent(world, eid, BossGhost);
    GhostKind.kind[eid] = GHOST_KIND.inky;
    GhostPhase.value[eid] = GHOST_PHASE.leaving;
    Facing.direction[eid] = DIRECTION.none;

    expect(worldSnapshot(world).ghosts).toEqual([
      expect.objectContaining({
        eid,
        col: 4,
        row: 6,
        kind: "inky",
        phase: "leaving",
        facing: "none",
        boss: true,
      }),
    ]);
  });

  it("counts power pellets separately from regular pellets", () => {
    const world = createWorld();
    for (let i = 0; i < 3; i += 1) {
      addComponent(world, addEntity(world), Pellet);
    }
    const power = addEntity(world);
    addComponent(world, power, Pellet);
    addComponent(world, power, PowerPellet);

    expect(worldSnapshot(world)).toMatchObject({ pellets: 3, powerPellets: 1 });
  });
});
