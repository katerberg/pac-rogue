import { expiryTintOn } from "./expiryBlink";

export const PLAYER_WALL_PASS_TINT = 0xd3d333;
export const PLAYER_INVULN_TINT = 0xc48a00;

export type PlayerTint = { color: number; mode: "multiply" | "add" };

type PlayerTintInput = {
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
  return expiryTintOn(input.invulnRemainingMs, input.nowMs) ? PLAYER_INVULN_TINT : null;
}

export function tintedColor(color: number, tint: PlayerTint | null): number {
  if (tint === null) {
    return color;
  }
  const channel = (shift: number) => {
    const a = (color >> shift) & 0xff;
    const b = (tint.color >> shift) & 0xff;
    return (tint.mode === "add" ? Math.min(0xff, a + b) : Math.round((a * b) / 0xff)) << shift;
  };
  return channel(16) | channel(8) | channel(0);
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
