export type DotManFacing = "right" | "down" | "left" | "up";

export const DOTMAN_TURN_MS = 90;
export const DOTMAN_REVERSE_MS = 160;

const FACING_DEGREES: Record<DotManFacing, number> = { right: 0, down: 90, left: 180, up: 270 };

export type DotManTurn = {
  facing: DotManFacing;
  fromDeg: number;
  toDeg: number;
  startMs: number;
  durationMs: number;
};

export function restingTurn(facing: DotManFacing): DotManTurn {
  const deg = FACING_DEGREES[facing];
  return { facing, fromDeg: deg, toDeg: deg, startMs: 0, durationMs: 0 };
}

export function turnAngle(turn: DotManTurn, nowMs: number): number {
  if (turn.durationMs <= 0) {
    return turn.toDeg;
  }
  const t = Math.min(1, Math.max(0, (nowMs - turn.startMs) / turn.durationMs));
  const eased = 1 - (1 - t) * (1 - t);
  return turn.fromDeg + (turn.toDeg - turn.fromDeg) * eased;
}

export function turnToward(turn: DotManTurn, facing: DotManFacing, nowMs: number): DotManTurn {
  if (facing === turn.facing) {
    return turn;
  }
  const fromDeg = turnAngle(turn, nowMs);
  let delta = (((FACING_DEGREES[facing] - fromDeg) % 360) + 360) % 360;
  if (delta > 180) {
    delta -= 360;
  }
  const reversal = Math.abs(delta) > 90;
  return {
    facing,
    fromDeg,
    toDeg: fromDeg + delta,
    startMs: nowMs,
    durationMs: reversal ? DOTMAN_REVERSE_MS : (DOTMAN_TURN_MS * Math.abs(delta)) / 90,
  };
}
