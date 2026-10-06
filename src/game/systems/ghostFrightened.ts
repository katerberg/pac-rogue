import { hasComponent, query, type World } from "bitecs";
import { openGhostDirsAt, type GhostDir } from "../../domain/ghostPath";
import { ghostMovementRules } from "../../domain/ghostMovement";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { pickFrightenedDirection, pickFrightenTargets } from "../../domain/hunter";
import { TURN_ALIGN_EPS, isAlignedForTurn, worldToCol, worldToRow } from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { bossAwareCanEnter } from "./ghostAi";
import { forceGhostReverse } from "./ghostReverse";

export function frightenGhosts(world: World, limit: number | null, blockTunnels = false): number[] {
  const playerEid = query(world, [Player, Position])[0];
  if (playerEid === undefined) {
    return [];
  }
  const candidates = [...query(world, [Ghost, GhostPhase, Position])]
    .filter((eid) => GhostPhase.value[eid] !== GHOST_PHASE.inHouse)
    .map((eid) => ({ eid, x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 }));
  const targets = pickFrightenTargets(
    candidates,
    { x: Position.x[playerEid] ?? 0, y: Position.y[playerEid] ?? 0 },
    limit,
  );
  forceGhostReverse(world, blockTunnels, new Set(targets));
  return targets;
}

export function frightenedGhostAi(
  world: World,
  frightenedEids: ReadonlySet<number>,
  roll: () => number,
  blockTunnels = false,
): void {
  for (const eid of query(world, [Ghost, GhostPhase, Position, Input, Facing])) {
    if (!frightenedEids.has(eid) || GhostPhase.value[eid] !== GHOST_PHASE.active) {
      continue;
    }
    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    if (!isAlignedForTurn(x, y, TURN_ALIGN_EPS)) {
      continue;
    }
    const col = worldToCol(x);
    const row = worldToRow(y);
    const rules = ghostMovementRules(GHOST_PHASE.active, blockTunnels);
    const canEnter = hasComponent(world, eid, BossGhost)
      ? bossAwareCanEnter(world, eid, x, y, rules)
      : rules.canEnter;
    const opens = openGhostDirsAt(x, y, rules.solids, canEnter);
    const facingNow = (Facing.direction[eid] ?? DIRECTION.none) as GhostDir;
    if (
      Ghost.decidedCol[eid] === col &&
      Ghost.decidedRow[eid] === row &&
      (facingNow === DIRECTION.none || opens.includes(facingNow))
    ) {
      continue;
    }
    const facing =
      facingNow !== DIRECTION.none ? facingNow : ((Input.direction[eid] ?? 0) as GhostDir);
    const next = pickFrightenedDirection(opens, facing, roll) as Direction;
    if (next !== DIRECTION.none) {
      Input.direction[eid] = next;
      Ghost.decidedCol[eid] = col;
      Ghost.decidedRow[eid] = row;
    }
  }
}
