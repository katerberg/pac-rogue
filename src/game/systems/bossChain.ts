import { hasComponent, query, type World } from "bitecs";
import { chainHitsCircle, type ChainSegment } from "../../domain/bossChain";
import { CHAIN_PAIR, type ChainPairId } from "../../domain/bossRules";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { ChainedGhost } from "../components/ChainedGhost";
import { Drawable } from "../components/Drawable";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import type { CatchOptions } from "./catchPlayer";

export type BossChain = ChainSegment & { a: number; b: number; pair: ChainPairId };

const CHAIN_PAIRS: readonly ChainPairId[] = [CHAIN_PAIR.blinkyClyde, CHAIN_PAIR.pinkyInky];

function chainOff(eid: number, options: CatchOptions): boolean {
  return (
    GhostPhase.value[eid] === GHOST_PHASE.inHouse ||
    eid === options.frozenGhostEid ||
    options.skipGhostEids?.has(eid) === true
  );
}

function pairEnds(world: World, pair: ChainPairId): [number, number] | null {
  const ends = [...query(world, [Ghost, ChainedGhost, GhostPhase, Position])].filter(
    (eid) => ChainedGhost.pair[eid] === pair,
  );
  return ends.length === 2 ? (ends as [number, number]) : null;
}

export function bossChains(world: World, options: CatchOptions = {}): BossChain[] {
  const chains: BossChain[] = [];
  for (const pair of CHAIN_PAIRS) {
    const ends = pairEnds(world, pair);
    if (ends === null) {
      continue;
    }
    const [a, b] = ends;
    if (chainOff(a, options) || chainOff(b, options)) {
      continue;
    }
    chains.push({
      a,
      b,
      pair,
      x1: Position.x[a] ?? 0,
      y1: Position.y[a] ?? 0,
      x2: Position.x[b] ?? 0,
      y2: Position.y[b] ?? 0,
    });
  }
  return chains;
}

export function chainPartnerEid(world: World, eid: number): number | null {
  if (!hasComponent(world, eid, ChainedGhost)) {
    return null;
  }
  const pair = ChainedGhost.pair[eid];
  if (pair === undefined) {
    return null;
  }
  const ends = pairEnds(world, pair as ChainPairId);
  if (ends === null) {
    return null;
  }
  const [a, b] = ends;
  if (a === eid) {
    return b;
  }
  if (b === eid) {
    return a;
  }
  return null;
}

export function chainCatch(world: World, options: CatchOptions = {}): number | null {
  if (options.playerInvulnerable === true) {
    return null;
  }
  const playerEid = query(world, [Player, Position, Drawable])[0];
  if (playerEid === undefined) {
    return null;
  }
  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
  const radius = Drawable.radius[playerEid] ?? 0;
  for (const chain of bossChains(world, options)) {
    if (!chainHitsCircle(chain, px, py, radius)) {
      continue;
    }
    const toA = Math.hypot(chain.x1 - px, chain.y1 - py);
    const toB = Math.hypot(chain.x2 - px, chain.y2 - py);
    return toA <= toB ? chain.a : chain.b;
  }
  return null;
}
