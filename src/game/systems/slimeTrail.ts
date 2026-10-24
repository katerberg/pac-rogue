import { query, type World } from "bitecs";
import type { SlimeScope } from "../../domain/bossRules";
import type { GhostKindId } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { worldToCol, worldToRow, type MazeTile } from "../../domain/maze";
import { pushSlimeTile, slimesInScope, type SlimeTrails } from "../../domain/slimeTrail";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";

/** Active, in-scope ghosts lay slime on their tile; `skipEids` (frightened, gliding) lay none. */
export function tickSlimeTrails(
  world: World,
  trails: SlimeTrails,
  scope: SlimeScope,
  skipEids: ReadonlySet<number>,
): SlimeTrails {
  if (scope === "none") {
    return trails;
  }
  let next: Map<number, readonly MazeTile[]> | null = null;
  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Position])) {
    if (
      GhostPhase.value[eid] !== GHOST_PHASE.active ||
      skipEids.has(eid) ||
      !slimesInScope(scope, GhostKind.kind[eid] as GhostKindId)
    ) {
      continue;
    }
    const before = trails.get(eid) ?? [];
    const after = pushSlimeTile(before, {
      col: worldToCol(Position.x[eid] ?? 0),
      row: worldToRow(Position.y[eid] ?? 0),
    });
    if (after !== before) {
      next ??= new Map(trails);
      next.set(eid, after);
    }
  }
  return next ?? trails;
}
