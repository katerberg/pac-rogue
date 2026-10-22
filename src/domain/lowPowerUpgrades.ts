import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import type { UpgradeDef, UpgradeId } from "./upgrades";

export const LOW_POWER_MAX_COPIES = 10;
export const LOW_POWER_STORE_PRICE = 2;
export const LOW_POWER_OFFER_WEIGHT = 0.25;

export const LOW_POWER_SPEED_ADD = 0.03;
export const LOW_POWER_TUNNEL_SPEED_ADD = 0.08;
export const LOW_POWER_VORTEX_CUT = 0.08;
export const LOW_POWER_TURN_PX_ADD = 0.6;
export const LOW_POWER_SLOWDOWN_CUT = 0.04;
export const LOW_POWER_HOUSE_DELAY_MS = 750;
export const LOW_POWER_HOUSE_PELLETS = 1;
export const LOW_POWER_TRACTION_CUT = 0.08;
export const LOW_POWER_TRACTION_DRAG_MS = 300;
export const LOW_POWER_MIN_SPEED_MUL = 0.3;

const GHOST_NAMES = ["blinky", "pinky", "inky", "clyde", "spunky", "wardy"] as const;
type GhostName = (typeof GHOST_NAMES)[number];

export type LowPowerKind =
  "speed" | "tunnelSpeed" | "vortex" | "turning" | "slowdown" | "houseDelay" | "traction";

export type LowPowerEffect = { kind: LowPowerKind; ghost?: GhostKindId };

export type LowPowerUpgradeId =
  | "lowSpeed"
  | "lowTunnelSpeed"
  | "lowTunnelVortex"
  | "lowTurning"
  | `lowSlowdown${Capitalize<GhostName>}`
  | `lowHouseDelay${Capitalize<GhostName>}`
  | `lowTraction${Capitalize<GhostName>}`;

const pct = (fraction: number): number => Math.round(fraction * 100);

function lowDef(
  id: LowPowerUpgradeId,
  label: string,
  description: string,
  lowPower: LowPowerEffect,
): UpgradeDef {
  return {
    id,
    baseId: id,
    isEnhanced: false,
    label,
    school: "neutral",
    description,
    storePrice: LOW_POWER_STORE_PRICE,
    lowPower,
  };
}

function perGhostDefs(): UpgradeDef[] {
  return GHOST_NAMES.flatMap((name) => {
    const Name = (name.charAt(0).toUpperCase() + name.slice(1)) as Capitalize<GhostName>;
    const ghost = GHOST_KIND[name];
    return [
      lowDef(
        `lowSlowdown${Name}`,
        `Slowdown: ${Name}`,
        `${Name} moves ${pct(LOW_POWER_SLOWDOWN_CUT)}% slower. Stacks.`,
        { kind: "slowdown", ghost },
      ),
      lowDef(
        `lowHouseDelay${Name}`,
        `Delay: ${Name}`,
        `${Name} leaves the ghost house ${LOW_POWER_HOUSE_DELAY_MS / 1000}s (or ${LOW_POWER_HOUSE_PELLETS} pellet) later. Stacks.`,
        { kind: "houseDelay", ghost },
      ),
      lowDef(
        `lowTraction${Name}`,
        `Traction: ${Name}`,
        `${Name} loses ${pct(LOW_POWER_TRACTION_CUT)}% speed after each turn. Stacks.`,
        { kind: "traction", ghost },
      ),
    ];
  });
}

export const LOW_POWER_DEFS: readonly UpgradeDef[] = [
  lowDef("lowSpeed", "Speed", `+${pct(LOW_POWER_SPEED_ADD)}% Dot-Man speed. Stacks.`, {
    kind: "speed",
  }),
  lowDef(
    "lowTunnelSpeed",
    "Tunnel Speed",
    `+${pct(LOW_POWER_TUNNEL_SPEED_ADD)}% Dot-Man speed inside tunnels. Stacks.`,
    { kind: "tunnelSpeed" },
  ),
  lowDef(
    "lowTunnelVortex",
    "Tunnel Vortex",
    `Ghosts are ${pct(LOW_POWER_VORTEX_CUT)}% slower inside tunnels. Stacks.`,
    { kind: "vortex" },
  ),
  lowDef(
    "lowTurning",
    "Turning Speed",
    `Dot-Man corners ${LOW_POWER_TURN_PX_ADD}px earlier. Stacks.`,
    {
      kind: "turning",
    },
  ),
  ...perGhostDefs(),
];

const LOW_BY_ID: ReadonlyMap<string, UpgradeDef> = new Map(
  LOW_POWER_DEFS.map((def) => [def.id, def]),
);

export const LOW_POWER_IDS: readonly LowPowerUpgradeId[] = LOW_POWER_DEFS.map(
  (def) => def.id as LowPowerUpgradeId,
);

export function isLowPowerId(id: string): id is LowPowerUpgradeId {
  return LOW_BY_ID.has(id);
}

export function lowPowerGhostOf(id: LowPowerUpgradeId): GhostKindId | null {
  return LOW_BY_ID.get(id)?.lowPower?.ghost ?? null;
}

export function lowPowerCopies(owned: readonly UpgradeId[], id: LowPowerUpgradeId): number {
  return owned.filter((owner) => owner === id).length;
}

function kindCopies(owned: readonly UpgradeId[], kind: LowPowerKind, ghost?: GhostKindId): number {
  let count = 0;
  for (const id of owned) {
    const effect = LOW_BY_ID.get(id)?.lowPower;
    if (effect?.kind === kind && (ghost === undefined || effect.ghost === ghost)) {
      count += 1;
    }
  }
  return count;
}

export function withLowPowerCopies(
  owned: readonly UpgradeId[],
  id: LowPowerUpgradeId,
  copies: number,
): UpgradeId[] {
  const clamped = Math.min(LOW_POWER_MAX_COPIES, Math.max(1, copies));
  return [...owned.filter((other) => other !== id), ...Array.from({ length: clamped }, () => id)];
}

export function lowPowerCopyControls(copies: number): { down: boolean; up: boolean } {
  return { down: copies > 1, up: copies < LOW_POWER_MAX_COPIES };
}

export function lowPowerEligible(
  owned: readonly UpgradeId[],
  id: LowPowerUpgradeId,
  roster: readonly GhostKindId[] | undefined,
): boolean {
  const ghost = lowPowerGhostOf(id);
  if (ghost !== null && (roster === undefined || !roster.includes(ghost))) {
    return false;
  }
  return lowPowerCopies(owned, id) < LOW_POWER_MAX_COPIES;
}

export function lowPowerPlayerSpeedMul(owned: readonly UpgradeId[], inTunnel: boolean): number {
  const base = 1 + LOW_POWER_SPEED_ADD * kindCopies(owned, "speed");
  const tunnel = inTunnel ? 1 + LOW_POWER_TUNNEL_SPEED_ADD * kindCopies(owned, "tunnelSpeed") : 1;
  return base * tunnel;
}

export function lowPowerPreTurnBonusPx(owned: readonly UpgradeId[]): number {
  return LOW_POWER_TURN_PX_ADD * kindCopies(owned, "turning");
}

export function lowPowerVortexMul(owned: readonly UpgradeId[]): number {
  return Math.max(LOW_POWER_MIN_SPEED_MUL, 1 - LOW_POWER_VORTEX_CUT * kindCopies(owned, "vortex"));
}

export function lowPowerGhostSpeedMul(owned: readonly UpgradeId[], ghost: GhostKindId): number {
  return Math.max(
    LOW_POWER_MIN_SPEED_MUL,
    1 - LOW_POWER_SLOWDOWN_CUT * kindCopies(owned, "slowdown", ghost),
  );
}

export function lowPowerTractionCopies(owned: readonly UpgradeId[], ghost: GhostKindId): number {
  return kindCopies(owned, "traction", ghost);
}

export function lowPowerTractionMul(copies: number): number {
  return Math.max(LOW_POWER_MIN_SPEED_MUL, 1 - LOW_POWER_TRACTION_CUT * copies);
}

export function lowPowerHouseDelayMs(owned: readonly UpgradeId[], ghost: GhostKindId): number {
  return LOW_POWER_HOUSE_DELAY_MS * kindCopies(owned, "houseDelay", ghost);
}

export function lowPowerKindReleaseAdds(
  owned: readonly UpgradeId[],
): (ghost: GhostKindId) => { delayMs: number; pellets: number } {
  return (ghost) => ({
    delayMs: lowPowerHouseDelayMs(owned, ghost),
    pellets: lowPowerHousePellets(owned, ghost),
  });
}

export function lowPowerHousePellets(owned: readonly UpgradeId[], ghost: GhostKindId): number {
  return LOW_POWER_HOUSE_PELLETS * kindCopies(owned, "houseDelay", ghost);
}
