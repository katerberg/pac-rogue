import { query, type World } from "bitecs";
import { circlesOverlap } from "../../domain/circles";
import { headingAngle, stepHeading, type HeadingStep } from "../../domain/dotManHeading";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import {
  bananaPeelBeadRadiusPx,
  bananaPeelLayout,
  PEEL_CATCH_MIN_OVERLAP_FRACTION,
} from "../../domain/bananaPeel";
import { resizeTail, stepTail, type TailBead } from "../../domain/charmTail";
import type { TailLayout } from "../../domain/charmTailParams";
import { DIRECTION, type Direction } from "../components/Input";
import { Drawable } from "../components/Drawable";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import type { CatchOptions } from "./catchPlayer";
import { playerPose } from "./playerDirection";

function facingToHeadingStep(facing: Direction): HeadingStep | null {
  switch (facing) {
    case DIRECTION.up:
      return "up";
    case DIRECTION.down:
      return "down";
    case DIRECTION.left:
      return "left";
    case DIRECTION.right:
      return "right";
    default:
      return null;
  }
}

export function peelTailAnchor(
  world: World,
  heading: number,
  dtMs: number,
): { x: number; y: number; heading: number } | null {
  const pose = playerPose(world);
  if (pose === null) {
    return null;
  }
  const step = facingToHeadingStep(pose.facing);
  // Keep the last heading when Dot-Man stops so peels don't snap into a wall behind a default 0°.
  const nextHeading = step === null ? heading : stepHeading(heading, headingAngle(step), dtMs);
  return {
    x: pose.x,
    y: pose.y,
    heading: nextHeading,
  };
}

export function stepBananaPeelTail(
  world: World,
  beads: readonly TailBead[],
  peelsBanked: number,
  env: {
    dtMs: number;
    nowMs: number;
    motion: number;
    blocked: (x: number, y: number) => boolean;
  },
  heading = 0,
  layout: TailLayout = bananaPeelLayout(),
): { beads: TailBead[]; dropped: TailBead[]; heading: number } {
  const pose = playerPose(world);
  if (pose === null || peelsBanked <= 0) {
    return { beads: [], dropped: beads.length > 0 ? [...beads] : [], heading };
  }
  const facingStep = facingToHeadingStep(pose.facing);
  // First bead of a fresh trail snaps to the current facing instead of swinging from 0°.
  const seedHeading =
    beads.length === 0 && facingStep !== null ? headingAngle(facingStep) : heading;
  const anchor = peelTailAnchor(world, seedHeading, env.dtMs);
  if (anchor === null) {
    return { beads: [], dropped: beads.length > 0 ? [...beads] : [], heading };
  }
  const resized = resizeTail(beads, peelsBanked, anchor, layout, env.blocked);
  return {
    beads: stepTail(resized.beads, anchor, layout, env),
    dropped: resized.dropped,
    heading: anchor.heading,
  };
}

export function ghostTouchingPeel(
  world: World,
  beads: readonly TailBead[],
  options?: CatchOptions,
  layout: TailLayout = bananaPeelLayout(),
): number | null {
  if (
    beads.length === 0 ||
    options?.playerInvulnerable === true ||
    options?.turnCatchGrace === true
  ) {
    return null;
  }
  const radius = bananaPeelBeadRadiusPx(layout);
  const frozenEid = options?.frozenGhostEid ?? null;
  for (const eid of query(world, [Ghost, GhostPhase, Position, Drawable])) {
    if (
      (frozenEid !== null && eid === frozenEid) ||
      options?.skipGhostEids?.has(eid) === true ||
      options?.edibleGhostEids?.has(eid) === true
    ) {
      continue;
    }
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (phase === GHOST_PHASE.inHouse) {
      continue;
    }
    const gx = Position.x[eid] ?? 0;
    const gy = Position.y[eid] ?? 0;
    const gr = Drawable.radius[eid] ?? 0;
    for (const bead of beads) {
      if (circlesOverlap(bead.x, bead.y, radius, gx, gy, gr, PEEL_CATCH_MIN_OVERLAP_FRACTION)) {
        return eid;
      }
    }
  }
  return null;
}
