import { addComponent, addEntity, createWorld, type World } from "bitecs";
import { beforeEach, describe, expect, it } from "vitest";
import { GHOST_DIR } from "../../domain/ghostPath";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { createGhostReleaseClock, tickGhostRelease } from "../../domain/ghostRelease";
import { BOSS_GHOST_SPEED, GHOST_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostTarget";
import { activateLayout, cellCenterX, cellCenterY, ghostHouseSpawnCenter } from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
import { BossPellet } from "../components/BossPellet";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input, type Direction } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { bossGhostBlock, countBossPellets, pickFreeBossMouth } from "./bossGhosts";
import { ghostAi } from "./ghostAi";
import { ghostRelease } from "./ghostRelease";
import { applyGhostSpeed } from "./ghostSpeed";

function spawnBossGhost(
  world: World,
  col: number,
  row: number,
  facing: Direction,
  phase: GhostPhaseValue = GHOST_PHASE.active,
): number {
  const eid = addEntity(world);
  for (const component of [
    Position,
    Velocity,
    Input,
    Facing,
    Speed,
    Ghost,
    GhostKind,
    GhostPhase,
    BossGhost,
  ]) {
    addComponent(world, eid, component);
  }
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  Input.direction[eid] = facing;
  Facing.direction[eid] = facing;
  Speed.px[eid] = GHOST_SPEED;
  GhostKind.kind[eid] = GHOST_KIND.blinky;
  GhostPhase.value[eid] = phase;
  Ghost.decidedCol[eid] = Number.NaN;
  Ghost.decidedRow[eid] = Number.NaN;
  BossGhost.scatterCol[eid] = 0;
  BossGhost.scatterRow[eid] = 0;
  BossGhost.releaseDelayMs[eid] = 0;
  return eid;
}

function spawnPlayer(world: World, col: number, row: number): void {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Facing);
  addComponent(world, eid, Player);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  Facing.direction[eid] = DIRECTION.none;
}

const MOUTHS = [
  { col: 0, row: 14, facing: GHOST_DIR.right },
  { col: 27, row: 14, facing: GHOST_DIR.left },
];

describe("boss ghosts", () => {
  beforeEach(() => {
    activateLayout("maze1");
  });

  it("picks the next tunnel mouth in rotation, skipping one a ghost is near", () => {
    const world = createWorld();
    expect(pickFreeBossMouth(world, MOUTHS, 1)).toBe(1);
    spawnBossGhost(world, 26, 14, DIRECTION.left);
    expect(pickFreeBossMouth(world, MOUTHS, 1)).toBe(0);
    spawnBossGhost(world, 1, 14, DIRECTION.right);
    expect(pickFreeBossMouth(world, MOUTHS, 0)).toBeNull();
  });

  it("never spawns from a tunnel on the player's row", () => {
    const world = createWorld();
    spawnPlayer(world, 13, 14);
    expect(pickFreeBossMouth(world, MOUTHS, 0)).toBeNull();
    const mouths = [...MOUTHS, { col: 0, row: 20, facing: GHOST_DIR.right }];
    expect(pickFreeBossMouth(world, mouths, 0)).toBe(2);
  });

  it("ignores ghosts still in the house when checking mouths", () => {
    const world = createWorld();
    spawnBossGhost(world, 1, 14, DIRECTION.none, GHOST_PHASE.inHouse);
    expect(pickFreeBossMouth(world, MOUTHS, 0)).toBe(0);
  });

  it("turns both ghosts around when they meet head-on", () => {
    const world = createWorld();
    const a = spawnBossGhost(world, 6, 5, DIRECTION.right);
    const b = spawnBossGhost(world, 7, 5, DIRECTION.left);
    bossGhostBlock(world);
    expect(Facing.direction[a]).toBe(DIRECTION.left);
    expect(Input.direction[a]).toBe(DIRECTION.left);
    expect(Facing.direction[b]).toBe(DIRECTION.right);
  });

  it("leaves ghosts on separate lines alone", () => {
    const world = createWorld();
    const a = spawnBossGhost(world, 6, 5, DIRECTION.right);
    spawnBossGhost(world, 7, 6, DIRECTION.left);
    bossGhostBlock(world);
    expect(Facing.direction[a]).toBe(DIRECTION.right);
  });

  it("counts boss pellets left on the board", () => {
    const world = createWorld();
    for (let i = 0; i < 3; i += 1) {
      const eid = addEntity(world);
      addComponent(world, eid, Pellet);
      if (i > 0) {
        addComponent(world, eid, BossPellet);
      }
    }
    expect(countBossPellets(world)).toBe(2);
  });

  it("avoids a corridor another boss ghost is in when choosing a direction", () => {
    const world = createWorld();
    spawnPlayer(world, 20, 5);
    const chooser = spawnBossGhost(world, 6, 5, DIRECTION.right);
    ghostAi(world, GHOST_AI_MODE.chase, 244, { ignoreElroy: true });
    expect(Input.direction[chooser]).toBe(DIRECTION.right);

    Ghost.decidedCol[chooser] = Number.NaN;
    spawnBossGhost(world, 7, 5, DIRECTION.none);
    ghostAi(world, GHOST_AI_MODE.chase, 244, { ignoreElroy: true });
    expect(Input.direction[chooser]).not.toBe(DIRECTION.right);
  });

  it("scatters toward its own assigned corner", () => {
    const world = createWorld();
    spawnPlayer(world, 20, 5);
    const ghost = spawnBossGhost(world, 6, 5, DIRECTION.right);
    BossGhost.scatterCol[ghost] = 0;
    BossGhost.scatterRow[ghost] = 40;
    ghostAi(world, GHOST_AI_MODE.scatter, 244, { ignoreElroy: true });
    expect(Input.direction[ghost]).toBe(DIRECTION.down);
  });

  it("releases house boss ghosts on their own staggered delays", () => {
    const world = createWorld();
    const spawn = ghostHouseSpawnCenter();
    const first = spawnBossGhost(world, 0, 0, DIRECTION.none, GHOST_PHASE.inHouse);
    const second = spawnBossGhost(world, 0, 0, DIRECTION.none, GHOST_PHASE.inHouse);
    for (const eid of [first, second]) {
      Position.x[eid] = spawn.x;
      Position.y[eid] = spawn.y;
    }
    BossGhost.releaseDelayMs[first] = 100;
    BossGhost.releaseDelayMs[second] = 700;
    let clock = tickGhostRelease(createGhostReleaseClock(), true, 100);
    ghostRelease(world, clock, 0);
    expect(GhostPhase.value[first]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[second]).toBe(GHOST_PHASE.inHouse);
    clock = tickGhostRelease(clock, true, 600);
    ghostRelease(world, clock, 0);
    expect(GhostPhase.value[second]).toBe(GHOST_PHASE.leaving);
  });

  it("moves at a flat base speed with no level ramp or Cruise Elroy", () => {
    const world = createWorld();
    const ghost = spawnBossGhost(world, 6, 5, DIRECTION.right);
    applyGhostSpeed(world, 1, 9);
    expect(Speed.px[ghost]).toBe(BOSS_GHOST_SPEED);
  });
});
