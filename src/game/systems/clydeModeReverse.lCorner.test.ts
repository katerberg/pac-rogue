import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { cellCenterX, cellCenterY, worldToCol, worldToRow } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { applyGhostSpeed } from "./ghostSpeed";
import { forceGhostReverse } from "./ghostReverse";
import { ghostAi } from "./ghostAi";
import { movement } from "./movement";

function spawnClyde(col: number, row: number, facing: Direction) {
  const world = createWorld();
  const player = addEntity(world);
  addComponent(world, player, Position);
  addComponent(world, player, Facing);
  addComponent(world, player, Player);
  Position.x[player] = cellCenterX(14);
  Position.y[player] = cellCenterY(23);
  Facing.direction[player] = DIRECTION.none;

  const ghost = addEntity(world);
  for (const c of [Position, Velocity, Input, Facing, Speed, Ghost, GhostKind, GhostPhase]) {
    addComponent(world, ghost, c);
  }
  Position.x[ghost] = cellCenterX(col);
  Position.y[ghost] = cellCenterY(row);
  Input.direction[ghost] = facing;
  Facing.direction[ghost] = facing;
  Speed.px[ghost] = GHOST_SPEED;
  GhostKind.kind[ghost] = GHOST_KIND.clyde;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
  Ghost.decidedCol[ghost] = Number.NaN;
  Ghost.decidedRow[ghost] = Number.NaN;
  return { world, ghost };
}

describe("Clyde mode reverse at SW L tip", () => {
  it("takes the open L turn instead of freezing into the wall", () => {
    const { world, ghost } = spawnClyde(1, 29, DIRECTION.right);

    forceGhostReverse(world);
    expect(Facing.direction[ghost]).toBe(DIRECTION.up);
    expect(Input.direction[ghost]).toBe(DIRECTION.up);

    let zeroFrames = 0;
    let leftTip = false;
    for (let i = 0; i < 120; i += 1) {
      ghostAi(world, GHOST_AI_MODE.scatter, 200);
      applyGhostSpeed(world, 200);
      movement(world, 16);
      const vx = Velocity.x[ghost] ?? 0;
      const vy = Velocity.y[ghost] ?? 0;
      if (Math.abs(vx) < 1e-9 && Math.abs(vy) < 1e-9) {
        zeroFrames += 1;
      }
      const col = worldToCol(Position.x[ghost] ?? 0);
      const row = worldToRow(Position.y[ghost] ?? 0);
      if (col !== 1 || row !== 29) {
        leftTip = true;
      }
    }

    expect(zeroFrames).toBeLessThan(5);
    expect(leftTip).toBe(true);
  });

  it("still reverses on an open corridor tile", () => {
    const { world, ghost } = spawnClyde(6, 5, DIRECTION.right);
    forceGhostReverse(world);
    expect(Facing.direction[ghost]).toBe(DIRECTION.left);
    expect(Input.direction[ghost]).toBe(DIRECTION.left);
    expect(Ghost.decidedCol[ghost]).toBe(6);
    expect(Ghost.decidedRow[ghost]).toBe(5);
  });
});
