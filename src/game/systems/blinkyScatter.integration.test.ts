import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  createGhostModeClock,
  GHOST_AI_MODE,
  startGhostModeClock,
  tickGhostMode,
} from "../../domain/ghostMode";
import { createGhostReleaseClock, tickGhostRelease } from "../../domain/ghostRelease";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import {
  GHOST_HOUSE_EXIT_COL,
  GHOST_HOUSE_EXIT_ROW,
  cellCenterX,
  cellCenterY,
  ghostHouseSpawnCenter,
  isHouse,
  playerSpawnCenter,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { PLAYER_SPEED } from "../../domain/playfield";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { applyGhostSpeed } from "./ghostSpeed";
import { ghostAi } from "./ghostAi";
import { ghostExitHouse } from "./ghostExitHouse";
import { ghostRelease } from "./ghostRelease";
import { forceGhostReverse } from "./ghostReverse";
import { movement } from "./movement";

function spawnActors() {
  const world = createWorld();

  const player = addEntity(world);
  addComponent(world, player, Position);
  addComponent(world, player, Velocity);
  addComponent(world, player, Input);
  addComponent(world, player, Facing);
  addComponent(world, player, Speed);
  addComponent(world, player, Player);
  const pSpawn = playerSpawnCenter();
  Position.x[player] = pSpawn.x;
  Position.y[player] = pSpawn.y;
  Input.direction[player] = DIRECTION.none;
  Facing.direction[player] = DIRECTION.none;
  Speed.px[player] = 0;

  const ghost = addEntity(world);
  addComponent(world, ghost, Position);
  addComponent(world, ghost, Velocity);
  addComponent(world, ghost, Input);
  addComponent(world, ghost, Facing);
  addComponent(world, ghost, Speed);
  addComponent(world, ghost, Ghost);
  addComponent(world, ghost, GhostPhase);
  const gSpawn = ghostHouseSpawnCenter();
  Position.x[ghost] = gSpawn.x;
  Position.y[ghost] = gSpawn.y;
  Velocity.x[ghost] = 0;
  Velocity.y[ghost] = 0;
  Input.direction[ghost] = DIRECTION.none;
  Facing.direction[ghost] = DIRECTION.none;
  Speed.px[ghost] = 0;
  GhostPhase.value[ghost] = GHOST_PHASE.inHouse;
  Ghost.decidedCol[ghost] = Number.NaN;
  Ghost.decidedRow[ghost] = Number.NaN;

  return { world, player, ghost };
}

function tickPipeline(
  world: ReturnType<typeof createWorld>,
  release: ReturnType<typeof createGhostReleaseClock>,
  mode: ReturnType<typeof createGhostModeClock>,
  pelletsRemaining: number,
  dt: number,
) {
  const nextRelease = tickGhostRelease(release, true, dt);
  ghostRelease(world, nextRelease);
  let nextMode = mode;
  if (ghostExitHouse(world)) {
    nextMode = startGhostModeClock();
  }
  const modeTick = tickGhostMode(nextMode, dt);
  nextMode = modeTick.clock;
  if (modeTick.forceReverse) {
    forceGhostReverse(world);
  } else {
    ghostAi(world, nextMode.mode, pelletsRemaining);
  }
  applyGhostSpeed(world, pelletsRemaining);
  movement(world, dt);
  if (ghostExitHouse(world)) {
    nextMode = startGhostModeClock();
  }
  return { release: nextRelease, mode: nextMode };
}

describe("blinky chase start integration", () => {
  it("keeps chase mode and player targeting for the first 20s after exit", () => {
    const { world, player, ghost } = spawnActors();
    Input.direction[player] = DIRECTION.left;
    Speed.px[player] = PLAYER_SPEED;

    let release = createGhostReleaseClock();
    let mode = createGhostModeClock();
    const pelletsRemaining = 244;
    const dt = 16;
    const modes: number[] = [];
    let exitedAt = -1;

    for (let i = 0; i < 600; i += 1) {
      const beforeExit = (GhostPhase.value[ghost] ?? 0) === GHOST_PHASE.active;
      const stepped = tickPipeline(world, release, mode, pelletsRemaining, dt);
      release = stepped.release;
      mode = stepped.mode;
      if (!beforeExit && (GhostPhase.value[ghost] ?? 0) === GHOST_PHASE.active && exitedAt < 0) {
        exitedAt = i;
      }
      if ((GhostPhase.value[ghost] ?? 0) === GHOST_PHASE.active) {
        modes.push(mode.mode);
      }
    }

    expect(exitedAt).toBeGreaterThanOrEqual(0);
    const chaseFrames = Math.floor(20_000 / dt) - 5;
    expect(modes.slice(0, chaseFrames).every((m) => m === GHOST_AI_MODE.chase)).toBe(true);
  });

  it("enters arcade scatter after the opening chase window", () => {
    const { world, ghost } = spawnActors();

    let release = createGhostReleaseClock();
    let mode = createGhostModeClock();
    const pelletsRemaining = 244;
    const dt = 16;

    let exited = false;
    let framesAfterExit = 0;
    let sawScatter = false;

    for (let i = 0; i < 2500; i += 1) {
      const stepped = tickPipeline(world, release, mode, pelletsRemaining, dt);
      release = stepped.release;
      mode = stepped.mode;

      if ((GhostPhase.value[ghost] ?? 0) === GHOST_PHASE.active) {
        if (!exited) {
          exited = true;
        }
        framesAfterExit += 1;
        if (framesAfterExit > Math.floor(20_000 / dt) && mode.mode === GHOST_AI_MODE.scatter) {
          sawScatter = true;
          break;
        }
      }
    }

    expect(exited).toBe(true);
    expect(sawScatter).toBe(true);
    expect(mode.mode).toBe(GHOST_AI_MODE.scatter);
  });

  it("leaves through the middle door and never re-enters the house", () => {
    const { world, player, ghost } = spawnActors();
    Input.direction[player] = DIRECTION.left;
    Speed.px[player] = PLAYER_SPEED;

    let release = createGhostReleaseClock();
    let mode = createGhostModeClock();
    const pelletsRemaining = 244;
    const dt = 16;
    let exitedAt = -1;
    let houseAfterExit = 0;

    for (let i = 0; i < 900; i += 1) {
      const stepped = tickPipeline(world, release, mode, pelletsRemaining, dt);
      release = stepped.release;
      mode = stepped.mode;

      const col = worldToCol(Position.x[ghost] ?? 0);
      const row = worldToRow(Position.y[ghost] ?? 0);
      const active = (GhostPhase.value[ghost] ?? 0) === GHOST_PHASE.active;
      if (active && exitedAt < 0) {
        exitedAt = i;
        expect(isHouse(col, row)).toBe(false);
        expect(row).toBeLessThanOrEqual(GHOST_HOUSE_EXIT_ROW);
      }
      if (active && isHouse(col, row)) {
        houseAfterExit += 1;
      }
    }

    expect(exitedAt).toBeGreaterThanOrEqual(0);
    expect(houseAfterExit).toBe(0);

    Position.x[ghost] = cellCenterX(GHOST_HOUSE_EXIT_COL);
    Position.y[ghost] = cellCenterY(GHOST_HOUSE_EXIT_ROW);
    Facing.direction[ghost] = DIRECTION.down;
    Input.direction[ghost] = DIRECTION.down;
    Position.x[player] = cellCenterX(13);
    Position.y[player] = cellCenterY(14);

    for (let i = 0; i < 120; i += 1) {
      ghostAi(world, GHOST_AI_MODE.chase, pelletsRemaining);
      applyGhostSpeed(world, pelletsRemaining);
      movement(world, dt);
      const col = worldToCol(Position.x[ghost] ?? 0);
      const row = worldToRow(Position.y[ghost] ?? 0);
      expect(isHouse(col, row)).toBe(false);
    }
  });
});
