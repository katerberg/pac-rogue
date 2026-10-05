export const PLAYER_WALL_PASS_TINT = 0xd3d333;
export const PLAYER_INVULN_TINT = 0xc48a00;
const PLAYER_INVULN_BLINK_MS = 100;
const PLAYER_INVULN_URGENCY_MS = 1000;

export type PlayerTint = { color: number; mode: "multiply" | "add" };

export type PlayerTintInput = {
  wallPassOn: boolean;
  invulnRemainingMs: number;
  nowMs: number;
  flashBrighten: number;
};

export function brightenColor(color: number, towardWhite: number): number {
  const channel = (shift: number) => {
    const value = (color >> shift) & 0xff;
    return Math.round(value + (0xff - value) * towardWhite) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

function baseTint(input: PlayerTintInput): number | null {
  if (input.wallPassOn) {
    return PLAYER_WALL_PASS_TINT;
  }
  const invulnOn =
    input.invulnRemainingMs > 0 &&
    (input.invulnRemainingMs > PLAYER_INVULN_URGENCY_MS ||
      Math.floor(input.nowMs / PLAYER_INVULN_BLINK_MS) % 2 === 0);
  return invulnOn ? PLAYER_INVULN_TINT : null;
}

export function playerTint(input: PlayerTintInput): PlayerTint | null {
  const base = baseTint(input);
  if (base !== null) {
    return { color: brightenColor(base, input.flashBrighten), mode: "multiply" };
  }
  if (input.flashBrighten > 0) {
    return { color: brightenColor(0, input.flashBrighten), mode: "add" };
  }
  return null;
}
