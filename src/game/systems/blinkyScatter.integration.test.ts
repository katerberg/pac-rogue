import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  createGhostModeClock,
  GHOST_AI_MODE,
  startGhostModeClock,
  tickGhostMode,
} from "../../domain/ghostMode";
import { createGhostReleaseClock, tickGhostRelease } from "../../domain/ghostRelease";
import {
  BLINKY_SCATTER_COL,
  BLINKY_SCATTER_ROW,
  blinkyTarget,
  GHOST_PHASE,
} from "../../domain/ghostTarget";
import {
  ghostHouseSpawnCenter,
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

  return { world, player, ghost };
}

describe("blinky scatter integration", () => {
  it("keeps scatter mode and NE scatter target for the first 7s after exit", () => {
    const { world, player, ghost } = spawnActors();
    Input.direction[player] = DIRECTION.left;
    Speed.px[player] = PLAYER_SPEED;

    let release = createGhostReleaseClock();
    let mode = createGhostModeClock();
    const pelletsRemaining = 244;
    const dt = 16;
    const modes: number[] = [];
    const targets: { col: number; row: number }[] = [];
    let exitedAt = -1;

    for (let i = 0; i < 600; i += 1) {
      release = tickGhostRelease(release, true, dt);
      ghostRelease(world, release);
      const modeTick = tickGhostMode(mode, dt);
      mode = modeTick.clock;
      if (modeTick.forceReverse) {
        forceGhostReverse(world);
      }
      ghostAi(world, mode.mode, pelletsRemaining);
      applyGhostSpeed(world, pelletsRemaining);
      movement(world, dt);
      if (ghostExitHouse(world)) {
        mode = startGhostModeClock();
        exitedAt = i;
      }

      if ((GhostPhase.value[ghost] ?? 0) === GHOST_PHASE.active) {
        modes.push(mode.mode);
        targets.push(
          blinkyTarget({
            phase: GHOST_PHASE.active,
            mode: mode.mode,
            pelletsRemaining,
            playerCol: worldToCol(Position.x[player] ?? 0),
            playerRow: worldToRow(Position.y[player] ?? 0),
          }),
        );
      }
    }

    expect(exitedAt).toBeGreaterThanOrEqual(0);
    const scatterFrames = Math.floor(7000 / dt) - 5;
    expect(modes.slice(0, scatterFrames).every((m) => m === GHOST_AI_MODE.scatter)).toBe(true);
    expect(
      targets
        .slice(0, scatterFrames)
        .every((t) => t.col === BLINKY_SCATTER_COL && t.row === BLINKY_SCATTER_ROW),
    ).toBe(true);
  });

  it("reaches the NE quadrant in scatter without row-1 ping-pong", () => {
    const { world, ghost } = spawnActors();

    let release = createGhostReleaseClock();
    let mode = createGhostModeClock();
    const pelletsRemaining = 244;
    const dt = 16;

    let exited = false;
    let framesAfterExit = 0;
    let midScatterCol = -1;
    let midScatterRow = -1;
    const row1Cols: number[] = [];

    for (let i = 0; i < 800; i += 1) {
      release = tickGhostRelease(release, true, dt);
      ghostRelease(world, release);
      const modeTick = tickGhostMode(mode, dt);
      mode = modeTick.clock;
      if (modeTick.forceReverse) {
        forceGhostReverse(world);
      }
      ghostAi(world, mode.mode, pelletsRemaining);
      applyGhostSpeed(world, pelletsRemaining);
      movement(world, dt);
      if (ghostExitHouse(world)) {
        mode = startGhostModeClock();
        exited = true;
      }

      if (!exited || (GhostPhase.value[ghost] ?? 0) !== GHOST_PHASE.active) {
        continue;
      }

      framesAfterExit += 1;
      const gCol = worldToCol(Position.x[ghost] ?? 0);
      const gRow = worldToRow(Position.y[ghost] ?? 0);

      if (framesAfterExit === Math.floor(4000 / dt)) {
        midScatterCol = gCol;
        midScatterRow = gRow;
      }
      if (framesAfterExit < Math.floor(6500 / dt) && gRow === 1) {
        row1Cols.push(gCol);
      }
      if (framesAfterExit > Math.floor(6500 / dt)) {
        break;
      }
    }

    expect(exited).toBe(true);
    expect(midScatterRow).toBeGreaterThanOrEqual(0);
    expect(midScatterRow).toBeLessThan(10);
    expect(midScatterCol).toBeGreaterThan(14);

    let directionChanges = 0;
    for (let i = 2; i < row1Cols.length; i += 1) {
      const a = row1Cols[i - 2]!;
      const b = row1Cols[i - 1]!;
      const c = row1Cols[i]!;
      if ((b - a) * (c - b) < 0) {
        directionChanges += 1;
      }
    }
    expect(directionChanges).toBeLessThan(8);
  });
});
