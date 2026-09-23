import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  blinkyTarget,
  clydeScatterTarget,
  clydeTarget,
  inkyTarget,
  pinkyTarget,
} from "../../domain/ghostTarget";
import { activateLayout, cellCenterX, cellCenterY } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { ghostAiContext, resolveGhostTarget } from "./ghostAi";

const PLAYER = { col: 10, row: 20 };
const BLINKY = { col: 3, row: 5 };

function buildWorld() {
  activateLayout("maze1");
  const world = createWorld();
  const player = addEntity(world);
  addComponent(world, player, Position);
  addComponent(world, player, Facing);
  addComponent(world, player, Player);
  Position.x[player] = cellCenterX(PLAYER.col);
  Position.y[player] = cellCenterY(PLAYER.row);
  Facing.direction[player] = DIRECTION.up;

  const spawn = (kind: GhostKindId, col: number, row: number) => {
    const eid = addEntity(world);
    for (const c of [Position, Input, Facing, Ghost, GhostKind, GhostPhase]) {
      addComponent(world, eid, c);
    }
    Position.x[eid] = cellCenterX(col);
    Position.y[eid] = cellCenterY(row);
    GhostKind.kind[eid] = kind;
    GhostPhase.value[eid] = GHOST_PHASE.active;
    return eid;
  };

  const blinky = spawn(GHOST_KIND.blinky, BLINKY.col, BLINKY.row);
  const pinky = spawn(GHOST_KIND.pinky, 20, 5);
  const inky = spawn(GHOST_KIND.inky, 20, 25);
  const clyde = spawn(GHOST_KIND.clyde, 12, 21);
  return { world, blinky, pinky, inky, clyde };
}

describe("resolveGhostTarget", () => {
  it("matches the per-kind domain target functions", () => {
    const { world, blinky, pinky, inky, clyde } = buildWorld();
    const ctx = ghostAiContext(world);
    const mode = GHOST_AI_MODE.chase;
    const base = { phase: GHOST_PHASE.active, mode, playerCol: PLAYER.col, playerRow: PLAYER.row };

    expect(resolveGhostTarget(blinky, mode, 200, ctx)).toEqual(
      blinkyTarget({ ...base, pelletsRemaining: 200 }),
    );
    expect(resolveGhostTarget(pinky, mode, 200, ctx)).toEqual(
      pinkyTarget({ ...base, playerFacing: DIRECTION.up }),
    );
    expect(resolveGhostTarget(inky, mode, 200, ctx)).toEqual(
      inkyTarget({
        ...base,
        playerFacing: DIRECTION.up,
        blinkyCol: BLINKY.col,
        blinkyRow: BLINKY.row,
      }),
    );
    const clydeResult = resolveGhostTarget(clyde, mode, 200, ctx);
    expect(clydeResult).toEqual(clydeTarget({ ...base, ghostCol: 12, ghostRow: 21 }));
    expect(clydeResult).toEqual(clydeScatterTarget());
  });

  it("applies falseScatter only to the corrupted kind", () => {
    const { world, pinky, inky } = buildWorld();
    const ctx = ghostAiContext(world);
    const corruption = { ghostKind: GHOST_KIND.pinky, type: "falseScatter" as const };
    const scatter = GHOST_AI_MODE.scatter;

    expect(resolveGhostTarget(pinky, scatter, 200, ctx, { corruption })).toEqual(
      resolveGhostTarget(pinky, GHOST_AI_MODE.chase, 200, ctx),
    );
    expect(resolveGhostTarget(inky, scatter, 200, ctx, { corruption })).not.toEqual(
      resolveGhostTarget(inky, GHOST_AI_MODE.chase, 200, ctx),
    );
  });
});
