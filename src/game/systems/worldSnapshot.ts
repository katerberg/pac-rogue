import { hasComponent, query, type World } from "bitecs";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { worldToCol, worldToRow } from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
import { BossPellet } from "../components/BossPellet";
import { Facing } from "../components/Facing";
import { Fruit } from "../components/Fruit";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION } from "../components/Input";
import { OptionalPellet } from "../components/OptionalPellet";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";

export type ActorSnapshot = {
  x: number;
  y: number;
  col: number;
  row: number;
  facing: string;
};

export type GhostSnapshot = ActorSnapshot & {
  eid: number;
  kind: string;
  phase: string;
  boss: boolean;
};

export type WorldSnapshot = {
  player: ActorSnapshot | null;
  ghosts: GhostSnapshot[];
  pellets: number;
  powerPellets: number;
  bossPellets: number;
  optionalPellets: number;
  fruit: boolean;
};

export function nameOf(table: Record<string, number>, value: number | undefined): string {
  return Object.keys(table).find((key) => table[key] === value) ?? "unknown";
}

function actor(eid: number): ActorSnapshot {
  const x = Position.x[eid] ?? 0;
  const y = Position.y[eid] ?? 0;
  return {
    x: Math.round(x),
    y: Math.round(y),
    col: worldToCol(x),
    row: worldToRow(y),
    facing: nameOf(DIRECTION, Facing.direction[eid]),
  };
}

export function worldSnapshot(world: World): WorldSnapshot {
  const playerEid = query(world, [Player, Position])[0];
  const ghosts = [...query(world, [Ghost, Position])].map((eid) => ({
    eid,
    ...actor(eid),
    kind: nameOf(GHOST_KIND, GhostKind.kind[eid]),
    phase: nameOf(GHOST_PHASE, GhostPhase.value[eid]),
    boss: hasComponent(world, eid, BossGhost),
  }));
  const powerPellets = query(world, [PowerPellet]).length;
  return {
    player: playerEid === undefined ? null : actor(playerEid),
    ghosts,
    pellets: query(world, [Pellet]).length - powerPellets,
    powerPellets,
    bossPellets: query(world, [BossPellet]).length,
    optionalPellets: query(world, [OptionalPellet]).length,
    fruit: query(world, [Fruit]).length > 0,
  };
}
