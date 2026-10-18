import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_DIR } from "../../domain/ghostPath";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import type { BodyTile } from "../../domain/simulacrum";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { ghostAi } from "./ghostAi";

function setup() {
  const world = createWorld();
  const player = addEntity(world);
  addComponent(world, player, Position);
  addComponent(world, player, Facing);
  addComponent(world, player, Player);
  Position.x[player] = cellCenterX(25);
  Position.y[player] = cellCenterY(5);
  Facing.direction[player] = DIRECTION.left;

  const ghost = addEntity(world);
  for (const component of [
    Position,
    Velocity,
    Input,
    Facing,
    Speed,
    Ghost,
    GhostKind,
    GhostPhase,
  ]) {
    addComponent(world, ghost, component);
  }
  Position.x[ghost] = cellCenterX(6);
  Position.y[ghost] = cellCenterY(5);
  Velocity.x[ghost] = 0;
  Velocity.y[ghost] = 0;
  Input.direction[ghost] = DIRECTION.right;
  Facing.direction[ghost] = DIRECTION.right;
  Speed.px[ghost] = GHOST_SPEED;
  GhostKind.kind[ghost] = GHOST_KIND.blinky;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
  Ghost.decidedCol[ghost] = Number.NaN;
  Ghost.decidedRow[ghost] = Number.NaN;
  return { world, ghost };
}

const twinNearGhost: BodyTile = { col: 2, row: 5, facing: GHOST_DIR.right };

describe("ghostAi with a simulacrum", () => {
  it("chases the player when there is no twin", () => {
    const { world, ghost } = setup();
    ghostAi(world, GHOST_AI_MODE.chase, 244);
    expect(Input.direction[ghost]).toBe(DIRECTION.right);
  });

  it("turns toward a twin that is nearer by path than the player", () => {
    const { world, ghost } = setup();
    ghostAi(
      world,
      GHOST_AI_MODE.chase,
      244,
      undefined,
      false,
      new Set(),
      null,
      null,
      twinNearGhost,
    );
    expect(Input.direction[ghost]).not.toBe(DIRECTION.right);
  });

  it("keeps chasing the player when the twin is farther by path", () => {
    const { world, ghost } = setup();
    const farTwin: BodyTile = { col: 26, row: 29, facing: GHOST_DIR.right };
    ghostAi(world, GHOST_AI_MODE.chase, 244, undefined, false, new Set(), null, null, farTwin);
    expect(Input.direction[ghost]).toBe(DIRECTION.right);
  });
});
