import { query, type World } from "bitecs";
import { pickClosestGhostEid } from "../../domain/ghostRecall";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { beginClosestGhostFreeze, type RunUpgrades } from "../../domain/upgrades";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function freezeClosestGhost(
  world: World,
  state: RunUpgrades,
  freezeMs: number,
): RunUpgrades {
  const players = query(world, [Player, Position]);
  const playerEid = players[0];
  if (playerEid === undefined) {
    return state;
  }
  const fromX = Position.x[playerEid] ?? 0;
  const fromY = Position.y[playerEid] ?? 0;

  const candidates = [];
  for (const eid of query(world, [Ghost, GhostPhase, Position])) {
    candidates.push({
      eid,
      x: Position.x[eid] ?? 0,
      y: Position.y[eid] ?? 0,
      phase: (GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) as GhostPhaseValue,
    });
  }

  return beginClosestGhostFreeze(state, pickClosestGhostEid(candidates, fromX, fromY), freezeMs);
}
