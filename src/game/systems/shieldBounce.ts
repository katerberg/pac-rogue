import { hasComponent, query, type World } from "bitecs";
import { circlesOverlap } from "../../domain/circles";
import { ghostMovementRules } from "../../domain/ghostMovement";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  canEnterDirection,
  clampAgainstFacingWall,
  clampToGridCenters,
  getActiveLayout,
  inBounds,
  isAlignedForTurn,
  snapPerpendicularToCenterline,
  worldToCol,
  worldToRow,
  wrapPosition,
  type SolidGrid,
} from "../../domain/maze";
import { clampPositionToPlayfield } from "../../domain/playfield";
import {
  GHOST_WALL_STUN_MS,
  SHIELD_BOUNCE_MS,
  bounceAwaySteps,
  bounceTravelPx,
  type BounceBody,
  mergeShieldBounce,
  type BounceStep,
  type ShieldBounce,
} from "../../domain/shieldBounce";
import type { DroppedWall } from "../../domain/wallDrop";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { CARDINAL_STEP } from "./heldKeys";

export type BounceMovement = {
  playerSolids: SolidGrid;
  ghostsBlockTunnels: boolean;
  blockTunnelRow: number | null;
  droppedWall: DroppedWall | null;
};

function directionOf(step: BounceStep): Direction {
  const match = Object.entries(CARDINAL_STEP).find(([, s]) => s.dx === step.dx && s.dy === step.dy);
  return match === undefined ? DIRECTION.none : (Number(match[0]) as Direction);
}

function stepOf(direction: number | undefined): BounceStep | null {
  return direction === undefined ? null : (CARDINAL_STEP[direction] ?? null);
}

function head(eid: number, step: BounceStep): void {
  const direction = directionOf(step);
  Facing.direction[eid] = direction;
  Input.direction[eid] = direction;
}

function clearGhostDecision(eid: number): void {
  Ghost.decidedCol[eid] = Number.NaN;
  Ghost.decidedRow[eid] = Number.NaN;
}

/** Bounces the player and the ghost that broke the shield apart, along with any ghosts overlapping it. */
export function startShieldBounce(world: World, ghostEid: number): ShieldBounce | null {
  const playerEid = query(world, [Player, Position])[0];
  if (playerEid === undefined) {
    return null;
  }
  const gx = Position.x[ghostEid] ?? 0;
  const gy = Position.y[ghostEid] ?? 0;
  const gr = Drawable.radius[ghostEid] ?? 0;
  const playerFacing = stepOf(Facing.direction[playerEid]);
  const fallback = stepOf(Facing.direction[ghostEid]) ??
    (playerFacing === null ? null : { dx: -playerFacing.dx, dy: -playerFacing.dy }) ?? {
      dx: 1,
      dy: 0,
    };
  const steps = bounceAwaySteps(
    { x: Position.x[playerEid] ?? 0, y: Position.y[playerEid] ?? 0 },
    { x: gx, y: gy },
    fallback,
  );
  const ghostEids = [...query(world, [Ghost, GhostPhase, Position, Drawable])].filter(
    (eid) =>
      eid === ghostEid ||
      (GhostPhase.value[eid] === GHOST_PHASE.active &&
        circlesOverlap(
          gx,
          gy,
          gr,
          Position.x[eid] ?? 0,
          Position.y[eid] ?? 0,
          Drawable.radius[eid] ?? 0,
        )),
  );
  head(playerEid, steps.player);
  for (const eid of ghostEids) {
    head(eid, steps.ghost);
    clearGhostDecision(eid);
  }
  return {
    player: { eid: playerEid, step: steps.player, elapsedMs: 0 },
    ghosts: ghostEids.map((eid) => ({ eid, step: steps.ghost, elapsedMs: 0 })),
    stunned: [],
  };
}

/** Folds a bounce started before the break's side effects into `current`, dropping bodies those effects already moved. */
export function settleShieldBounce(
  current: ShieldBounce,
  started: ShieldBounce,
  playerWarping: boolean,
  heldGhosts: ReadonlySet<number>,
): ShieldBounce {
  return mergeShieldBounce(current, {
    ...started,
    player: playerWarping ? null : started.player,
    ghosts: started.ghosts.filter(
      (body) => GhostPhase.value[body.eid] === GHOST_PHASE.active && !heldGhosts.has(body.eid),
    ),
  });
}

/** Moves `px` along the bounce; true when a wall stopped it. */
function slide(world: World, body: BounceBody, px: number, move: BounceMovement): boolean {
  const { eid, step } = body;
  const isGhost = hasComponent(world, eid, Ghost);
  let x = Position.x[eid] ?? 0;
  let y = Position.y[eid] ?? 0;
  const rules = isGhost
    ? ghostMovementRules(
        GhostPhase.value[eid] ?? GHOST_PHASE.active,
        move.ghostsBlockTunnels,
        move.blockTunnelRow,
        move.droppedWall,
        { x, y },
      )
    : null;
  const solids = rules?.solids ?? move.playerSolids;
  const canEnter = (px: number, py: number): boolean =>
    rules !== null
      ? rules.canEnter(px, py, step.dx, step.dy)
      : canEnterDirection(px, py, step.dx, step.dy, solids) &&
        !(
          worldToRow(py) === move.blockTunnelRow &&
          !inBounds(worldToCol(px) + step.dx, worldToRow(py) + step.dy)
        );
  const blocked = (): boolean => !canEnter(x, y) && isAlignedForTurn(x, y);
  if (blocked()) {
    return true;
  }
  const centered = snapPerpendicularToCenterline(
    x + step.dx * px,
    y + step.dy * px,
    step.dx,
    step.dy,
  );
  const wrapped =
    isGhost && move.ghostsBlockTunnels
      ? clampToGridCenters(centered.x, centered.y)
      : wrapPosition(centered.x, centered.y, solids, move.blockTunnelRow);
  const clamped = clampAgainstFacingWall(wrapped.x, wrapped.y, step.dx, step.dy, solids);
  const playfield = clampPositionToPlayfield(clamped.x, clamped.y);
  x = playfield.x;
  y = playfield.y;
  Position.x[eid] = x;
  Position.y[eid] = y;
  return blocked();
}

/**
 * Advances a bounce. A bouncing body holds its bounce heading; it ends after
 * SHIELD_BOUNCE_MS still heading that way, or early on a wall: the player gets
 * control back, a ghost shakes in place for GHOST_WALL_STUN_MS then re-picks
 * its direction ignoring its old facing.
 */
export function tickShieldBounce(
  world: World,
  bounce: ShieldBounce,
  deltaMs: number,
  move: BounceMovement,
): ShieldBounce {
  const tileSize = getActiveLayout().tileSize;
  const advance = (body: BounceBody): { body: BounceBody | null; crashed: boolean } => {
    const crashed = slide(world, body, bounceTravelPx(body.elapsedMs, deltaMs, tileSize), move);
    const elapsedMs = body.elapsedMs + deltaMs;
    head(body.eid, body.step);
    if (hasComponent(world, body.eid, Ghost)) {
      clearGhostDecision(body.eid);
    }
    return {
      body: crashed || elapsedMs >= SHIELD_BOUNCE_MS ? null : { ...body, elapsedMs },
      crashed,
    };
  };

  const stunned = bounce.stunned.flatMap((stun) => {
    const remainingMs = stun.remainingMs - Math.max(0, deltaMs);
    Facing.direction[stun.eid] = DIRECTION.none;
    Input.direction[stun.eid] = DIRECTION.none;
    clearGhostDecision(stun.eid);
    return remainingMs > 0 && GhostPhase.value[stun.eid] === GHOST_PHASE.active
      ? [{ ...stun, remainingMs }]
      : [];
  });

  const ghosts: BounceBody[] = [];
  for (const body of bounce.ghosts) {
    if (GhostPhase.value[body.eid] !== GHOST_PHASE.active) {
      continue;
    }
    const next = advance(body);
    if (next.body !== null) {
      ghosts.push(next.body);
    } else if (next.crashed) {
      Facing.direction[body.eid] = DIRECTION.none;
      Input.direction[body.eid] = DIRECTION.none;
      stunned.push({ eid: body.eid, remainingMs: GHOST_WALL_STUN_MS });
    }
  }

  return {
    player: bounce.player === null ? null : advance(bounce.player).body,
    ghosts,
    stunned,
  };
}
