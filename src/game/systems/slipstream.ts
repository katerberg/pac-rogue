import { query, type World } from "bitecs";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  applySlipstreams,
  slipstreamEcho,
  slipstreamTargets,
  type SlipstreamEcho,
  type SlipstreamGhost,
} from "../../domain/slipstream";
import type { RunUpgrades, UpgradeId } from "../../domain/upgrades";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function stepSlipstream(
  world: World,
  state: RunUpgrades,
  owned: readonly UpgradeId[],
): { state: RunUpgrades; echoes: SlipstreamEcho[] } {
  const playerEid = query(world, [Player, Position])[0];
  if (playerEid === undefined) {
    return { state, echoes: [] };
  }
  const ghosts: SlipstreamGhost[] = [];
  for (const eid of query(world, [Ghost, GhostPhase, Position])) {
    if ((GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse) {
      ghosts.push({ eid, x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 });
    }
  }
  const player = { x: Position.x[playerEid] ?? 0, y: Position.y[playerEid] ?? 0 };
  const hit = slipstreamTargets(state, owned, player, ghosts);
  return {
    state: applySlipstreams(state, hit),
    echoes: ghosts
      .filter((ghost) => hit.includes(ghost.eid))
      .flatMap((ghost) => slipstreamEcho(player, ghost) ?? []),
  };
}
