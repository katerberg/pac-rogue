import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { cellCenterX, cellCenterY, worldToCol, worldToRow } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { ghostAi } from "./ghostAi";
import { movement } from "./movement";

function spawnScatterGhostAt(col: number, row: number, facing: Direction) {
  const world = createWorld();

  const player = addEntity(world);
  addComponent(world, player, Position);
  addComponent(world, player, Player);
  Position.x[player] = cellCenterX(1);
  Position.y[player] = cellCenterY(23);

  const ghost = addEntity(world);
  addComponent(world, ghost, Position);
  addComponent(world, ghost, Velocity);
  addComponent(world, ghost, Input);
  addComponent(world, ghost, Facing);
  addComponent(world, ghost, Speed);
  addComponent(world, ghost, Ghost);
  addComponent(world, ghost, GhostPhase);
  Position.x[ghost] = cellCenterX(col);
  Position.y[ghost] = cellCenterY(row);
  Velocity.x[ghost] = 0;
  Velocity.y[ghost] = 0;
  Input.direction[ghost] = facing;
  Facing.direction[ghost] = facing;
  Speed.px[ghost] = GHOST_SPEED;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
  Ghost.decidedCol[ghost] = Number.NaN;
  Ghost.decidedRow[ghost] = Number.NaN;

  return { world, ghost };
}

describe("ghostAi NE tip decision cadence", () => {
  it("commits down out of the NE tip instead of re-picking left on the same tile", () => {
    // Small dt keeps the ghost centered long enough for a same-tile re-pick to fire
    // if AI runs every aligned frame. Scatter Euclidean then prefers left over down.
    const { world, ghost } = spawnScatterGhostAt(25, 1, DIRECTION.right);
    const dt = 8;
    let leftTip = false;
    let firstCellAfterTip: { col: number; row: number } | null = null;

    for (let i = 0; i < 500; i += 1) {
      ghostAi(world, GHOST_AI_MODE.scatter, 244);
      movement(world, dt);
      const col = worldToCol(Position.x[ghost] ?? 0);
      const row = worldToRow(Position.y[ghost] ?? 0);
      if (!leftTip) {
        if (col === 26 && row === 1) {
          leftTip = true;
        }
        continue;
      }
      if (col === 26 && row === 1) {
        continue;
      }
      firstCellAfterTip = { col, row };
      break;
    }

    expect(leftTip).toBe(true);
    expect(firstCellAfterTip).toEqual({ col: 26, row: 2 });
  });
});
