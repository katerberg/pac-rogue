import { hasComponent, query, type World } from "bitecs";
import {
  REPLAY_MAX_SIM_MS,
  REPLAY_SAMPLE_MS,
  type ReplayData,
  type ReplayGhostLook,
  type ReplaySegment,
} from "../../domain/replay";
import { getActiveLayout, TILE_SIZE } from "../../domain/maze";
import { BossPellet } from "../components/BossPellet";
import { Facing } from "../components/Facing";
import { DIRECTION } from "../components/Input";
import { Fruit } from "../components/Fruit";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { Drawable } from "../components/Drawable";
import { OptionalPellet } from "../components/OptionalPellet";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

type Item = { art: string; optional: boolean; x: number; y: number };

export type ReplayLook = {
  mazeColorInverted: boolean;
  playerTint: number | null;
  frightened: ReadonlySet<number>;
  frozenEid: number | null;
};

const ANGLE_BY_DIRECTION: Partial<Record<number, number>> = {
  [DIRECTION.right]: 0,
  [DIRECTION.down]: Math.PI / 2,
  [DIRECTION.left]: Math.PI,
  [DIRECTION.up]: -Math.PI / 2,
};

function liveItems(world: World): Map<number, Item> {
  const items = new Map<number, Item>();
  for (const component of [Pellet, BossPellet, Fruit]) {
    for (const eid of query(world, [component, Position, Drawable])) {
      items.set(eid, {
        art: Drawable.id[eid] ?? "",
        optional: hasComponent(world, eid, OptionalPellet),
        x: Position.x[eid] ?? 0,
        y: Position.y[eid] ?? 0,
      });
    }
  }
  return items;
}

function ghostLook(eid: number, look: ReplayLook): ReplayGhostLook {
  if (look.frozenEid === eid) {
    return "frozen";
  }
  return look.frightened.has(eid) ? "frightened" : "normal";
}

export class ReplayRecorder {
  private readonly segments: ReplaySegment[] = [];
  private current: ReplaySegment | null = null;
  private known = new Map<number, Item>();
  private clockMs = 0;
  private sinceSampleMs = REPLAY_SAMPLE_MS;
  private totalMs = 0;
  private lastAngle = 0;

  beginSegment(world: World, level: number): void {
    const segment: ReplaySegment = {
      level,
      tileSize: TILE_SIZE,
      layout: getActiveLayout(),
      items: [],
      frames: [],
      deaths: [],
      durationMs: 0,
    };
    this.current = segment;
    this.segments.push(segment);
    this.known = new Map();
    this.clockMs = 0;
    this.sinceSampleMs = REPLAY_SAMPLE_MS;
    this.diffItems(world);
  }

  sample(world: World, deltaMs: number, look: () => ReplayLook): void {
    const segment = this.current;
    if (segment === null || this.totalMs >= REPLAY_MAX_SIM_MS) {
      return;
    }
    this.clockMs += deltaMs;
    this.totalMs += deltaMs;
    this.sinceSampleMs += deltaMs;
    segment.durationMs = this.clockMs;
    if (this.sinceSampleMs < REPLAY_SAMPLE_MS) {
      return;
    }
    this.sinceSampleMs = 0;
    this.diffItems(world);
    const now = look();
    const playerEid = query(world, [Player, Position])[0];
    this.lastAngle =
      ANGLE_BY_DIRECTION[Facing.direction[playerEid ?? 0] ?? DIRECTION.none] ?? this.lastAngle;
    segment.frames.push({
      t: this.clockMs,
      mazeColorInverted: now.mazeColorInverted,
      player:
        playerEid === undefined
          ? null
          : {
              x: Position.x[playerEid] ?? 0,
              y: Position.y[playerEid] ?? 0,
              angle: this.lastAngle,
              tint: now.playerTint,
            },
      ghosts: Array.from(query(world, [Ghost, Position]), (eid) => ({
        eid,
        kind: GhostKind.kind[eid] ?? 0,
        x: Position.x[eid] ?? 0,
        y: Position.y[eid] ?? 0,
        look: ghostLook(eid, now),
      })),
    });
  }

  death(world: World): void {
    const playerEid = query(world, [Player, Position])[0];
    if (this.current === null || playerEid === undefined) {
      return;
    }
    this.diffItems(world);
    this.current.deaths.push({
      t: this.clockMs,
      x: Position.x[playerEid] ?? 0,
      y: Position.y[playerEid] ?? 0,
    });
  }

  data(): ReplayData {
    return { segments: this.segments.filter((segment) => segment.frames.length > 0) };
  }

  private diffItems(world: World): void {
    const segment = this.current;
    if (segment === null) {
      return;
    }
    const now = liveItems(world);
    const unchanged = (eid: number, item: Item): boolean => {
      const before = this.known.get(eid);
      return (
        before?.art === item.art &&
        before.optional === item.optional &&
        before.x === item.x &&
        before.y === item.y
      );
    };
    for (const [eid, item] of this.known) {
      const current = now.get(eid);
      if (current === undefined || !unchanged(eid, current)) {
        segment.items.push({ t: this.clockMs, op: "remove", eid, ...item });
      }
    }
    for (const [eid, item] of now) {
      if (!unchanged(eid, item)) {
        segment.items.push({ t: this.clockMs, op: "add", eid, ...item });
      }
    }
    this.known = now;
  }
}
