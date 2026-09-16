/**
 * Debug reproduction for Clyde scatter L-corner freeze.
 * Run: npx vitest run src/game/systems/clydeScatterLFreeze.debug.test.ts
 *
 * Confirms forceGhostReverse at SW L tip (1,29) locks decided + facing into wall
 * so movement zeros velocity and ghostAi never re-picks.
 */
import { appendFileSync } from "node:fs";
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
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { applyGhostSpeed } from "./ghostSpeed";
import { forceGhostReverse } from "./ghostReverse";
import { ghostAi } from "./ghostAi";
import { movement } from "./movement";

const LOG = "/opt/cursor/logs/debug.log";

describe("clyde scatter L freeze debug repro", () => {
  it("freezes after mode reverse into wall at SW L tip (1,29)", () => {
    appendFileSync(
      LOG,
      JSON.stringify({
        hypothesisId: "B",
        location: "clydeScatterLFreeze.debug.test.ts",
        message: "repro start",
        data: { tip: [1, 29] },
        timestamp: Date.now(),
      }) + "\n",
    );

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
    // Valid facing at tip; reverse becomes left into the wall.
    Position.x[ghost] = cellCenterX(1);
    Position.y[ghost] = cellCenterY(29);
    Input.direction[ghost] = DIRECTION.right;
    Facing.direction[ghost] = DIRECTION.right;
    Speed.px[ghost] = GHOST_SPEED;
    GhostKind.kind[ghost] = GHOST_KIND.clyde;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    Ghost.decidedCol[ghost] = Number.NaN;
    Ghost.decidedRow[ghost] = Number.NaN;

    forceGhostReverse(world);

    let zeroFrames = 0;
    for (let i = 0; i < 120; i += 1) {
      ghostAi(world, GHOST_AI_MODE.scatter, 200);
      applyGhostSpeed(world, 200);
      movement(world, 16);
      const vx = Velocity.x[ghost] ?? 0;
      const vy = Velocity.y[ghost] ?? 0;
      if (Math.abs(vx) < 1e-9 && Math.abs(vy) < 1e-9) {
        zeroFrames += 1;
      }
    }

    appendFileSync(
      LOG,
      JSON.stringify({
        hypothesisId: "B",
        location: "clydeScatterLFreeze.debug.test.ts",
        message: "repro end",
        data: {
          zeroFrames,
          col: worldToCol(Position.x[ghost] ?? 0),
          row: worldToRow(Position.y[ghost] ?? 0),
          facing: Facing.direction[ghost],
          intent: Input.direction[ghost],
          decidedCol: Ghost.decidedCol[ghost],
          decidedRow: Ghost.decidedRow[ghost],
        },
        timestamp: Date.now(),
      }) + "\n",
    );

    // Documents current buggy freeze so logs are collected; do not treat as a product assert.
    expect(zeroFrames).toBeGreaterThan(60);
    expect(Facing.direction[ghost]).toBe(DIRECTION.left);
    expect(Ghost.decidedCol[ghost]).toBe(1);
    expect(Ghost.decidedRow[ghost]).toBe(29);
  });
});
