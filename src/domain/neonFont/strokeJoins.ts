type Vec = { readonly x: number; readonly y: number };

/** Radians; tessellated r=1 arc samples (step 0.15) turn well under this. */
const ROUND_JOIN_MIN_TURN = 0.3;

/**
 * Polyline vertices that need a round fill: strand ends and real corners. Interior arc
 * samples are tangent-continuous, and stacking fills there brightens curves under alpha.
 */
export function neonRoundJoinIndices(points: readonly Vec[]): number[] {
  const last = points.length - 1;
  const indices: number[] = [];
  for (let i = 0; i <= last; i++) {
    if (i === 0 || i === last) {
      indices.push(i);
      continue;
    }
    const a = points[i - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const ux = b.x - a.x;
    const uy = b.y - a.y;
    const vx = c.x - b.x;
    const vy = c.y - b.y;
    const turn = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
    if (turn > ROUND_JOIN_MIN_TURN) {
      indices.push(i);
    }
  }
  return indices;
}
