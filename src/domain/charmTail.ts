import { getUpgradeDef, type UpgradeId, type UpgradeSchool } from "./upgrades";

export type Charm = { school: UpgradeSchool; enhanced: boolean };

export type TailBead = { x: number; y: number; vx: number; vy: number };

export type TailAnchor = { x: number; y: number; heading: number };

export type TailLayout = { linkPx: number; anchorBackPx: number };

const SPRING = 0.00028;
const DAMPING = 0.012;
const MAX_STRETCH = 1.3;
const MIN_STRETCH = 0.8;
const SNAP_LINKS = 4;
const MAX_STEP_MS = 40;
const BOBBLE_PX_PER_LINK = 0.12;
const BOBBLE_PERIOD_MS = 700;
const BOBBLE_PHASE = 1.1;

export function charmsFor(owned: readonly UpgradeId[]): Charm[] {
  return owned.map((id) => {
    const def = getUpgradeDef(id);
    return { school: def.school, enhanced: def.isEnhanced };
  });
}

export const CHARM_SIZE_WORLD_PX = 14;

export const CHARM_TAIL_LAYOUT: TailLayout = {
  linkPx: CHARM_SIZE_WORLD_PX * 1.1,
  anchorBackPx: 11,
};

export function charmArtPath(school: UpgradeSchool): string {
  return `art/schools/${school}.png`;
}

export function charmTextureKey(school: UpgradeSchool): string {
  return `charm-${school}`;
}

function behind(anchor: TailAnchor, backPx: number): { x: number; y: number } {
  return {
    x: anchor.x - Math.cos(anchor.heading) * backPx,
    y: anchor.y - Math.sin(anchor.heading) * backPx,
  };
}

export function layoutTail(count: number, anchor: TailAnchor, layout: TailLayout): TailBead[] {
  return Array.from({ length: count }, (_, i) => {
    const pos = behind(anchor, layout.anchorBackPx + layout.linkPx * (i + 1));
    return { ...pos, vx: 0, vy: 0 };
  });
}

export function stepTail(
  beads: readonly TailBead[],
  anchor: TailAnchor,
  layout: TailLayout,
  dtMs: number,
): TailBead[] {
  const hook = behind(anchor, layout.anchorBackPx);
  const first = beads[0];
  if (
    first !== undefined &&
    Math.hypot(first.x - hook.x, first.y - hook.y) > layout.linkPx * SNAP_LINKS
  ) {
    return layoutTail(beads.length, anchor, layout);
  }
  const dt = Math.min(Math.max(dtMs, 0), MAX_STEP_MS);
  const next: TailBead[] = [];
  let leader = hook;
  for (const bead of beads) {
    let dx = bead.x - leader.x;
    let dy = bead.y - leader.y;
    let dist = Math.hypot(dx, dy);
    if (dist < 1e-6) {
      dx = -Math.cos(anchor.heading);
      dy = -Math.sin(anchor.heading);
      dist = 1;
    }
    const wantX = leader.x + (dx / dist) * layout.linkPx;
    const wantY = leader.y + (dy / dist) * layout.linkPx;
    let vx = (bead.vx + (wantX - bead.x) * SPRING * dt) * Math.exp(-DAMPING * dt);
    let vy = (bead.vy + (wantY - bead.y) * SPRING * dt) * Math.exp(-DAMPING * dt);
    let x = bead.x + vx * dt;
    let y = bead.y + vy * dt;
    const stretch = Math.hypot(x - leader.x, y - leader.y);
    const clamped = Math.min(
      Math.max(stretch, layout.linkPx * MIN_STRETCH),
      layout.linkPx * MAX_STRETCH,
    );
    if (clamped !== stretch) {
      const ux = stretch < 1e-6 ? dx / dist : (x - leader.x) / stretch;
      const uy = stretch < 1e-6 ? dy / dist : (y - leader.y) / stretch;
      x = leader.x + ux * clamped;
      y = leader.y + uy * clamped;
      vx = (x - bead.x) / Math.max(dt, 1);
      vy = (y - bead.y) / Math.max(dt, 1);
    }
    const moved = { x, y, vx, vy };
    next.push(moved);
    leader = moved;
  }
  return next;
}

export function bobbleOffset(
  index: number,
  nowMs: number,
  linkPx: number,
  speedFactor: number,
): number {
  const phase = (nowMs / BOBBLE_PERIOD_MS) * 2 * Math.PI + index * BOBBLE_PHASE;
  return Math.sin(phase) * linkPx * BOBBLE_PX_PER_LINK * Math.min(Math.max(speedFactor, 0), 1);
}
