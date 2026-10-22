import { GHOST_DIR } from "./ghostPath";
import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import {
  blinkyScatterTarget,
  clydeScatterTarget,
  inkyScatterTarget,
  pinkyScatterTarget,
  spunkyPostTarget,
  wardyScatterTarget,
  type GhostTarget,
} from "./ghostTarget";
import {
  INTERMISSION_DOT_MAN_SPEED,
  INTERMISSION_PELLET_MS,
  INTERMISSION_Y,
  beatAtMs,
  chaserX,
  dotManApproachX,
  intermissionBobPx,
  msToLeave,
  pelletActors,
  walkingDotMan,
  type IntermissionActor,
  type IntermissionCast,
  type IntermissionScript,
} from "./intermissionScript";
import { GHOST_DRAWABLE_BY_KIND } from "./playfield";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";

const FLING_SPEED = 0.5;
const FIRST_GAP_PX = 120;
const GAP_STEP_PX = 60;
const CORNER_GRID = { cols: 28, rows: 31 };

const CORNER_BY_KIND: Record<GhostKindId, GhostTarget> = {
  [GHOST_KIND.blinky]: blinkyScatterTarget(CORNER_GRID.cols),
  [GHOST_KIND.pinky]: pinkyScatterTarget(),
  [GHOST_KIND.inky]: inkyScatterTarget(CORNER_GRID.cols, CORNER_GRID.rows),
  [GHOST_KIND.clyde]: clydeScatterTarget(CORNER_GRID.rows),
  [GHOST_KIND.spunky]: spunkyPostTarget(CORNER_GRID.cols),
  [GHOST_KIND.wardy]: wardyScatterTarget(CORNER_GRID.cols, CORNER_GRID.rows),
};

type PackGhost = {
  key: string;
  drawableId: string;
  atPelletX: number;
  gapPx: number;
  vx: number;
  vy: number;
  goneMs: number;
};

function pack(cast: IntermissionCast): PackGhost[] {
  return cast.ghostKinds.map((kind, i) => {
    const gapPx = FIRST_GAP_PX + GAP_STEP_PX * i;
    const atPelletX = chaserX(INTERMISSION_PELLET_MS, gapPx, INTERMISSION_DOT_MAN_SPEED);
    const corner = CORNER_BY_KIND[kind];
    const dx = ((corner.col + 0.5) / CORNER_GRID.cols) * PLAYFIELD_WIDTH - atPelletX;
    const dy = ((corner.row + 0.5) / CORNER_GRID.rows) * PLAYFIELD_HEIGHT - INTERMISSION_Y;
    const length = Math.hypot(dx, dy);
    const vx = (dx / length) * FLING_SPEED;
    const vy = (dy / length) * FLING_SPEED;
    return {
      key: `ghost${i}`,
      drawableId: GHOST_DRAWABLE_BY_KIND[kind],
      atPelletX,
      gapPx,
      vx,
      vy,
      goneMs: INTERMISSION_PELLET_MS + msToLeave(atPelletX, INTERMISSION_Y, vx, vy),
    };
  });
}

function packGoneMs(ghosts: readonly PackGhost[]): number {
  return Math.max(INTERMISSION_PELLET_MS, ...ghosts.map((ghost) => ghost.goneMs));
}

export function scatterBurstGoneMs(cast: IntermissionCast): number {
  return packGoneMs(pack(cast));
}

function packGhost(ghost: PackGhost, elapsedMs: number, bob: number): IntermissionActor {
  const at = { kind: "ghost", key: ghost.key, drawableId: ghost.drawableId } as const;
  if (elapsedMs < INTERMISSION_PELLET_MS) {
    const x = chaserX(elapsedMs, ghost.gapPx, INTERMISSION_DOT_MAN_SPEED);
    return { ...at, facing: GHOST_DIR.right, x, y: INTERMISSION_Y + bob };
  }
  const t = elapsedMs - INTERMISSION_PELLET_MS;
  return {
    ...at,
    facing: ghost.vy < 0 ? GHOST_DIR.up : GHOST_DIR.down,
    x: ghost.atPelletX + ghost.vx * t,
    y: INTERMISSION_Y + ghost.vy * t,
  };
}

const ALL_KINDS = Object.values(GHOST_KIND);
const SLOWEST_CAST_GONE_MS = Math.max(
  ...ALL_KINDS.map((kind) => scatterBurstGoneMs({ ghostKinds: ALL_KINDS.map(() => kind) })),
);

export const scatterBurst: IntermissionScript = {
  durationMs: Math.max(
    msToLeave(dotManApproachX(0), INTERMISSION_Y, INTERMISSION_DOT_MAN_SPEED),
    SLOWEST_CAST_GONE_MS,
  ),
  beatAt(elapsedMs, cast) {
    const bob = intermissionBobPx(elapsedMs);
    const actors = pelletActors(elapsedMs);
    const ghosts = pack(cast);
    actors.push(
      ...ghosts
        .filter((ghost) => elapsedMs < ghost.goneMs)
        .map((ghost) => packGhost(ghost, elapsedMs, bob)),
      walkingDotMan(elapsedMs),
    );
    const beats = [
      ["chase", INTERMISSION_PELLET_MS],
      ["scatter", packGoneMs(ghosts)],
    ] as const;
    return { beat: beatAtMs(elapsedMs, beats, "exit"), actors };
  },
};
