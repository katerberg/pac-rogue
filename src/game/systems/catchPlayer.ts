import { query, type World } from "bitecs";
import { circlesOverlap } from "../../domain/circles";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { Drawable } from "../components/Drawable";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

const GHOST_CATCH_MIN_OVERLAP_FRACTION = 0.35;

export type CatchOptions = {
  frozenGhostEid?: number | null;
  skipGhostEids?: ReadonlySet<number>;
  edibleGhostEids?: ReadonlySet<number>;
  playerInvulnerable?: boolean;
};

export function catchPlayer(world: World, options?: CatchOptions): number | null {
  if (options?.playerInvulnerable === true) {
    return null;
  }

  const frozenEid = options?.frozenGhostEid ?? null;

  const players = query(world, [Player, Position, Drawable]);
  const playerEid = players[0];
  if (playerEid === undefined) {
    return null;
  }

  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
  const pr = Drawable.radius[playerEid] ?? 0;

  for (const eid of query(world, [Ghost, GhostPhase, Position, Drawable])) {
    if (
      (frozenEid !== null && eid === frozenEid) ||
      options?.skipGhostEids?.has(eid) === true ||
      options?.edibleGhostEids?.has(eid) === true
    ) {
      continue;
    }
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (phase === GHOST_PHASE.inHouse) {
      continue;
    }
    const gx = Position.x[eid] ?? 0;
    const gy = Position.y[eid] ?? 0;
    const gr = Drawable.radius[eid] ?? 0;
    if (circlesOverlap(px, py, pr, gx, gy, gr, GHOST_CATCH_MIN_OVERLAP_FRACTION)) {
      return eid;
    }
  }

  return null;
}

export function edibleGhostsTouchingPlayer(
  world: World,
  edibleGhostEids: ReadonlySet<number>,
): number[] {
  const playerEid = query(world, [Player, Position, Drawable])[0];
  if (playerEid === undefined || edibleGhostEids.size === 0) {
    return [];
  }
  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
  const pr = Drawable.radius[playerEid] ?? 0;
  return [...query(world, [Ghost, GhostPhase, Position, Drawable])].filter(
    (eid) =>
      edibleGhostEids.has(eid) &&
      GhostPhase.value[eid] !== GHOST_PHASE.inHouse &&
      circlesOverlap(
        px,
        py,
        pr,
        Position.x[eid] ?? 0,
        Position.y[eid] ?? 0,
        Drawable.radius[eid] ?? 0,
        GHOST_CATCH_MIN_OVERLAP_FRACTION,
      ),
  );
}
