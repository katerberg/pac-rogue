import { query, type World } from "bitecs";
import { tickChaff, type ChaffState } from "../../domain/chaff";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { worldToCol, worldToRow, type MazeTile } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";

function activeGhostTiles(world: World): MazeTile[] {
  return [...query(world, [Ghost, GhostPhase, Position])]
    .filter((eid) => GhostPhase.value[eid] === GHOST_PHASE.active)
    .map((eid) => ({
      col: worldToCol(Position.x[eid] ?? 0),
      row: worldToRow(Position.y[eid] ?? 0),
    }));
}

export function advanceChaff(
  world: World,
  state: ChaffState | null,
  deltaMs: number,
  random: () => number,
): { state: ChaffState | null; burst: MazeTile[] } {
  return tickChaff(state, deltaMs, random, state === null ? [] : activeGhostTiles(world));
}
