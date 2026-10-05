import { query, type World } from "bitecs";
import { chainHitsCircle, chainPolyline, type BossChainPath } from "../../domain/bossChain";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { getActiveLayout } from "../../domain/maze";
import { ChainedGhost } from "../components/ChainedGhost";
import { Drawable } from "../components/Drawable";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import type { CatchOptions } from "./catchPlayer";

type BossChain = BossChainPath & { a: number; b: number };

export function bossChain(world: World, options: CatchOptions = {}): BossChain | null {
  const ends = [...query(world, [Ghost, ChainedGhost, GhostPhase, Position])];
  if (ends.length !== 2) {
    return null;
  }
  const [a, b] = ends as [number, number];
  const off = (eid: number) =>
    GhostPhase.value[eid] !== GHOST_PHASE.active ||
    eid === options.frozenGhostEid ||
    options.skipGhostEids?.has(eid) === true;
  if (off(a) || off(b)) {
    return null;
  }
  const x1 = Position.x[a] ?? 0;
  const y1 = Position.y[a] ?? 0;
  const x2 = Position.x[b] ?? 0;
  const y2 = Position.y[b] ?? 0;
  return {
    a,
    b,
    points: chainPolyline(x1, y1, x2, y2, getActiveLayout().playerSolids),
  };
}

export function chainCatch(world: World, options: CatchOptions = {}): number | null {
  if (options.playerInvulnerable === true) {
    return null;
  }
  const chain = bossChain(world, options);
  const playerEid = query(world, [Player, Position, Drawable])[0];
  if (chain === null || playerEid === undefined) {
    return null;
  }
  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
  if (!chainHitsCircle(chain, px, py, Drawable.radius[playerEid] ?? 0)) {
    return null;
  }
  const start = chain.points[0]!;
  const end = chain.points.at(-1)!;
  const toA = Math.hypot(start.x - px, start.y - py);
  const toB = Math.hypot(end.x - px, end.y - py);
  return toA <= toB ? chain.a : chain.b;
}
