import type { TailLayout } from "./charmTailParams";
export type TailBead = { x: number; y: number; vx: number; vy: number };

export type TailAnchor = { x: number; y: number; heading: number };

export type TailEnv = {
  dtMs: number;
  nowMs: number;
  motion: number;
  blocked: (x: number, y: number) => boolean;
};

const SNAP_LINKS = 4;
const MAX_STEP_MS = 40;
const BOBBLE_PHASE = 1.1;
const RING_POINTS = 8;
/** Cap how far a stretch correction may move a bead in one step (avoids reverse/turn teleports). */
const MAX_CORRECT_LINKS = 0.4;
const RAY_PLACE_STEPS = 10;

function behind(anchor: TailAnchor, backPx: number): { x: number; y: number } {
  return {
    x: anchor.x - Math.cos(anchor.heading) * backPx,
    y: anchor.y - Math.sin(anchor.heading) * backPx,
  };
}

function hitsWall(x: number, y: number, radiusPx: number, blocked: TailEnv["blocked"]): boolean {
  if (blocked(x, y)) {
    return true;
  }
  for (let i = 0; i < RING_POINTS; i++) {
    const angle = (i / RING_POINTS) * 2 * Math.PI;
    if (blocked(x + Math.cos(angle) * radiusPx, y + Math.sin(angle) * radiusPx)) {
      return true;
    }
  }
  return false;
}

function placeBehind(
  anchor: TailAnchor,
  backPx: number,
  radiusPx: number,
  blocked: TailEnv["blocked"],
): { x: number; y: number } {
  const target = behind(anchor, backPx);
  if (!hitsWall(target.x, target.y, radiusPx, blocked)) {
    return target;
  }
  for (let i = RAY_PLACE_STEPS - 1; i >= 1; i -= 1) {
    const t = i / RAY_PLACE_STEPS;
    const x = anchor.x + (target.x - anchor.x) * t;
    const y = anchor.y + (target.y - anchor.y) * t;
    if (!hitsWall(x, y, radiusPx, blocked)) {
      return { x, y };
    }
  }
  return { x: anchor.x, y: anchor.y };
}

export function layoutTail(
  count: number,
  anchor: TailAnchor,
  layout: TailLayout,
  blocked: TailEnv["blocked"] = () => false,
): TailBead[] {
  const beads: TailBead[] = [];
  for (let i = 0; i < count; i++) {
    const pos = placeBehind(
      anchor,
      layout.anchorBackPx + layout.linkPx * (i + 1),
      layout.radiusPx,
      blocked,
    );
    beads.push({ x: pos.x, y: pos.y, vx: 0, vy: 0 });
  }
  return beads;
}

export function resizeTail(
  beads: readonly TailBead[],
  count: number,
  anchor: TailAnchor,
  layout: TailLayout,
  blocked: TailEnv["blocked"] = () => false,
): { beads: TailBead[]; dropped: TailBead[] } {
  if (count >= beads.length) {
    const grown = layoutTail(count, anchor, layout, blocked).slice(beads.length);
    return { beads: [...beads, ...grown], dropped: [] };
  }
  return { beads: beads.slice(0, count), dropped: beads.slice(count) };
}

export function stepTail(
  beads: readonly TailBead[],
  anchor: TailAnchor,
  layout: TailLayout,
  env: TailEnv,
): TailBead[] {
  const hook = behind(anchor, layout.anchorBackPx);
  const first = beads[0];
  // Resnap only on a true teleport: far from the hook *and* the anchor. A reverse
  // flips the hook to the far side while beads stay next to Dot-Man — let them slide.
  if (
    first !== undefined &&
    Math.hypot(first.x - hook.x, first.y - hook.y) > layout.linkPx * SNAP_LINKS &&
    Math.hypot(first.x - anchor.x, first.y - anchor.y) > layout.linkPx * SNAP_LINKS
  ) {
    return layoutTail(beads.length, anchor, layout, env.blocked);
  }
  const dt = Math.min(Math.max(env.dtMs, 0), MAX_STEP_MS);
  const damp = Math.exp(-layout.damping * dt);
  const maxCorrect = layout.linkPx * MAX_CORRECT_LINKS;
  const next: TailBead[] = [];
  let leader = hook;
  beads.forEach((bead, index) => {
    let dx = bead.x - leader.x;
    let dy = bead.y - leader.y;
    let dist = Math.hypot(dx, dy);
    if (dist < 1e-6) {
      dx = -Math.cos(anchor.heading);
      dy = -Math.sin(anchor.heading);
      dist = 1;
    }
    const sway = bobbleOffset(index, env.nowMs, layout, env.motion);
    const wantX = leader.x + (dx / dist) * layout.linkPx - (dy / dist) * sway;
    const wantY = leader.y + (dy / dist) * layout.linkPx + (dx / dist) * sway;
    let vx = (bead.vx + (wantX - bead.x) * layout.spring * dt) * damp;
    let vy = (bead.vy + (wantY - bead.y) * layout.spring * dt) * damp;
    let x = bead.x;
    let y = bead.y;
    if (hitsWall(x + vx * dt, y, layout.radiusPx, env.blocked)) {
      vx = -vx * layout.bounce;
    } else {
      x += vx * dt;
    }
    if (hitsWall(x, y + vy * dt, layout.radiusPx, env.blocked)) {
      vy = -vy * layout.bounce;
    } else {
      y += vy * dt;
    }
    const stretch = Math.hypot(x - leader.x, y - leader.y);
    const clamped = Math.min(
      Math.max(stretch, layout.linkPx * layout.minStretch),
      layout.linkPx * layout.maxStretch,
    );
    if (clamped !== stretch) {
      const ux = stretch < 1e-6 ? dx / dist : (x - leader.x) / stretch;
      const uy = stretch < 1e-6 ? dy / dist : (y - leader.y) / stretch;
      const cx = leader.x + ux * clamped;
      const cy = leader.y + uy * clamped;
      const corrDx = cx - x;
      const corrDy = cy - y;
      const corr = Math.hypot(corrDx, corrDy);
      if (corr > 1e-9) {
        const scale = Math.min(1, maxCorrect / corr);
        const nx = x + corrDx * scale;
        const ny = y + corrDy * scale;
        if (!hitsWall(nx, ny, layout.radiusPx, env.blocked)) {
          x = nx;
          y = ny;
        }
      }
    }
    const moved = { x, y, vx, vy };
    next.push(moved);
    leader = moved;
  });
  return next;
}

export function bobbleOffset(
  index: number,
  nowMs: number,
  layout: Pick<TailLayout, "bobblePx" | "bobblePeriodMs">,
  motion: number,
): number {
  const phase = (nowMs / layout.bobblePeriodMs) * 2 * Math.PI + index * BOBBLE_PHASE;
  return Math.sin(phase) * layout.bobblePx * Math.min(Math.max(motion, 0), 1);
}
