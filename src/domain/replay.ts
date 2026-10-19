import type { SolidGrid } from "./maze";

export const REPLAY_MAX_SPEED = 8;
export const REPLAY_MIN_LOOP_MS = 30_000;
export const REPLAY_SAMPLE_MS = 1000 / 15;
export const REPLAY_MAX_SIM_MS = 60 * 60 * 1000;
export const REPLAY_LABEL_MS = 700;
export const REPLAY_SNAP_TILES = 2;

export type ReplayItemKind = "pellet" | "power" | "fruit" | "boss" | "optional";

export type ReplayPlayer = { x: number; y: number; angle: number };
export type ReplayGhost = { eid: number; kind: number; x: number; y: number };
export type ReplayFrame = {
  t: number;
  player: ReplayPlayer | null;
  ghosts: ReplayGhost[];
  mazeColorInverted: boolean;
};
export type ReplayItemEvent = {
  t: number;
  op: "add" | "remove";
  eid: number;
  kind: ReplayItemKind;
  x: number;
  y: number;
};
export type ReplayDeath = { t: number; x: number; y: number };

export type ReplaySegment = {
  level: number;
  tileSize: number;
  maze: { walls: SolidGrid; exterior: SolidGrid; door: SolidGrid };
  items: ReplayItemEvent[];
  frames: ReplayFrame[];
  deaths: ReplayDeath[];
  durationMs: number;
};

export type ReplayData = { segments: ReplaySegment[] };

export type ReplayCursor = {
  segmentIndex: number;
  labelVisible: boolean;
  simMs: number;
  loops: number;
};

export type ReplayView = {
  player: ReplayPlayer | null;
  ghosts: ReplayGhost[];
  mazeColorInverted: boolean;
};

function segmentRealMs(segment: ReplaySegment, speed: number): number {
  return REPLAY_LABEL_MS + segment.durationMs / speed;
}

export function replaySpeed(data: ReplayData): number {
  const simMs = data.segments.reduce((sum, segment) => sum + segment.durationMs, 0);
  const labelMs = data.segments.length * REPLAY_LABEL_MS;
  const playMs = Math.max(1, REPLAY_MIN_LOOP_MS - labelMs);
  return Math.min(REPLAY_MAX_SPEED, Math.max(simMs, 1) / playMs);
}

export function replayCursor(data: ReplayData, realElapsedMs: number): ReplayCursor {
  const speed = replaySpeed(data);
  const total = data.segments.reduce((sum, segment) => sum + segmentRealMs(segment, speed), 0);
  if (data.segments.length === 0 || total <= 0) {
    return { segmentIndex: 0, labelVisible: false, simMs: 0, loops: 0 };
  }
  const elapsed = Math.max(0, realElapsedMs);
  const loops = Math.floor(elapsed / total);
  let remaining = elapsed - loops * total;
  for (let index = 0; index < data.segments.length; index += 1) {
    const segment = data.segments[index]!;
    const length = segmentRealMs(segment, speed);
    if (remaining < length || index === data.segments.length - 1) {
      if (remaining < REPLAY_LABEL_MS) {
        return { segmentIndex: index, labelVisible: true, simMs: 0, loops };
      }
      const simMs = Math.min(segment.durationMs, (remaining - REPLAY_LABEL_MS) * speed);
      return { segmentIndex: index, labelVisible: false, simMs, loops };
    }
    remaining -= length;
  }
  return { segmentIndex: 0, labelVisible: false, simMs: 0, loops };
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

function lerpPoint<T extends { x: number; y: number }>(a: T, b: T, k: number, snapPx: number): T {
  if (Math.hypot(b.x - a.x, b.y - a.y) > snapPx) {
    return a;
  }
  return { ...a, x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
}

export function frameAt(segment: ReplaySegment, simMs: number): ReplayView {
  const { frames } = segment;
  if (frames.length === 0) {
    return { player: null, ghosts: [], mazeColorInverted: false };
  }
  let low = 0;
  let high = frames.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (frames[mid]!.t <= simMs) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  const from = frames[low]!;
  const to = frames[low + 1];
  if (to === undefined || to.t <= from.t) {
    return { player: from.player, ghosts: from.ghosts, mazeColorInverted: from.mazeColorInverted };
  }
  const k = Math.min(1, Math.max(0, (simMs - from.t) / (to.t - from.t)));
  const snapPx = REPLAY_SNAP_TILES * segment.tileSize;
  const toGhosts = new Map(to.ghosts.map((ghost) => [ghost.eid, ghost]));
  return {
    mazeColorInverted: from.mazeColorInverted,
    player:
      from.player !== null && to.player !== null
        ? lerpPoint(from.player, to.player, k, snapPx)
        : from.player,
    ghosts: from.ghosts.map((ghost) => {
      const next = toGhosts.get(ghost.eid);
      return next === undefined ? ghost : lerpPoint(ghost, next, k, snapPx);
    }),
  };
}

export function itemsAt(segment: ReplaySegment, simMs: number): ReplayItemEvent[] {
  const live = new Map<number, ReplayItemEvent>();
  for (const event of segment.items) {
    if (event.t > simMs) {
      break;
    }
    if (event.op === "add") {
      live.set(event.eid, event);
    } else {
      live.delete(event.eid);
    }
  }
  return [...live.values()];
}
