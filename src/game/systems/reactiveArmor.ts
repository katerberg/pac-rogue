import { query, type World } from "bitecs";
import { worldToCol, worldToRow } from "../../domain/maze";
import type { GhostReleaseAdds, GhostReleaseClock } from "../../domain/ghostRelease";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { sendGhostToHouse } from "./ghostRecall";

export type ReactiveArmorPickOpts = {
  contactEid: number | null;
  radiusTiles: number | null;
  from?: { x: number; y: number };
};

export function pickReactiveArmorGhosts(world: World, opts: ReactiveArmorPickOpts): number[] {
  if (opts.radiusTiles === null) {
    if (opts.contactEid === null) {
      return [];
    }
    const phase = GhostPhase.value[opts.contactEid];
    if (phase === undefined || phase === GHOST_PHASE.inHouse) {
      return [];
    }
    return [opts.contactEid];
  }

  const from = opts.from ?? playerPosition(world);
  if (from === null) {
    return [];
  }
  const originCol = worldToCol(from.x);
  const originRow = worldToRow(from.y);
  const radiusSq = opts.radiusTiles * opts.radiusTiles;
  const picked: number[] = [];
  for (const eid of query(world, [Ghost, GhostPhase, Position])) {
    if (GhostPhase.value[eid] === GHOST_PHASE.inHouse) {
      continue;
    }
    const dCol = worldToCol(Position.x[eid] ?? 0) - originCol;
    const dRow = worldToRow(Position.y[eid] ?? 0) - originRow;
    if (dCol * dCol + dRow * dRow <= radiusSq) {
      picked.push(eid);
    }
  }
  return picked.sort((a, b) => a - b);
}

export function applyReactiveArmor(
  world: World,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease: boolean,
  adds: GhostReleaseAdds,
  opts: ReactiveArmorPickOpts,
): number[] {
  const eids = pickReactiveArmorGhosts(world, opts);
  for (const eid of eids) {
    sendGhostToHouse(world, eid, clock, collectedCount, afterLifeRelease, adds);
  }
  return eids;
}

function playerPosition(world: World): { x: number; y: number } | null {
  const players = query(world, [Player, Position]);
  const eid = players[0];
  if (eid === undefined) {
    return null;
  }
  return { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
}
