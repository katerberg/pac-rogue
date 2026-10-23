import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import type { UpgradeDef, UpgradeId } from "./upgrades";

export const TRINKET_MAX_COPIES = 10;
export const TRINKET_STORE_PRICE = 2;
export const TRINKET_OFFER_WEIGHT = 0.25;

export const TRINKET_SPEED_ADD = 0.06;
export const TRINKET_TUNNEL_SPEED_ADD = 0.16;
export const TRINKET_VORTEX_CUT = 0.16;
export const TRINKET_TURN_PX_ADD = 1.2;
export const TRINKET_SLOWDOWN_CUT = 0.08;
export const TRINKET_HOUSE_DELAY_MS = 1500;
export const TRINKET_HOUSE_PELLETS = 2;
export const TRINKET_TRACTION_CUT = 0.16;
export const TRINKET_TRACTION_DRAG_MS = 300;
export const TRINKET_MIN_SPEED_MUL = 0.3;

const GHOST_NAMES = ["blinky", "pinky", "inky", "clyde", "spunky", "wardy"] as const;
type GhostName = (typeof GHOST_NAMES)[number];

export type TrinketKind =
  "speed" | "tunnelSpeed" | "vortex" | "turning" | "slowdown" | "houseDelay" | "traction";

export const TRINKET_KIND_ORDER: readonly TrinketKind[] = [
  "speed",
  "tunnelSpeed",
  "vortex",
  "turning",
  "slowdown",
  "houseDelay",
  "traction",
];

export type TrinketEffect = { kind: TrinketKind; ghost?: GhostKindId };

export type TrinketUpgradeId =
  | "lowSpeed"
  | "lowTunnelSpeed"
  | "lowTunnelVortex"
  | "lowTurning"
  | `lowSlowdown${Capitalize<GhostName>}`
  | `lowHouseDelay${Capitalize<GhostName>}`
  | `lowTraction${Capitalize<GhostName>}`;

const pct = (fraction: number): number => Math.round(fraction * 100);

function lowDef(
  id: TrinketUpgradeId,
  label: string,
  description: string,
  trinket: TrinketEffect,
): UpgradeDef {
  return {
    id,
    baseId: id,
    isEnhanced: false,
    label,
    school: "neutral",
    description,
    storePrice: TRINKET_STORE_PRICE,
    trinket,
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
        `${Name} moves ${pct(TRINKET_SLOWDOWN_CUT)}% slower. Stacks.`,
        { kind: "slowdown", ghost },
      ),
      lowDef(
        `lowHouseDelay${Name}`,
        `Delay: ${Name}`,
        `${Name} leaves the ghost house ${TRINKET_HOUSE_DELAY_MS / 1000}s (or ${TRINKET_HOUSE_PELLETS} pellets) later. Stacks.`,
        { kind: "houseDelay", ghost },
      ),
      lowDef(
        `lowTraction${Name}`,
        `Traction: ${Name}`,
        `${Name} loses ${pct(TRINKET_TRACTION_CUT)}% speed after each turn. Stacks.`,
        { kind: "traction", ghost },
      ),
    ];
  });
}

export const TRINKET_DEFS: readonly UpgradeDef[] = [
  lowDef("lowSpeed", "Speed", `+${pct(TRINKET_SPEED_ADD)}% Dot-Man speed. Stacks.`, {
    kind: "speed",
  }),
  lowDef(
    "lowTunnelSpeed",
    "Tunnel Speed",
    `+${pct(TRINKET_TUNNEL_SPEED_ADD)}% Dot-Man speed inside tunnels. Stacks.`,
    { kind: "tunnelSpeed" },
  ),
  lowDef(
    "lowTunnelVortex",
    "Tunnel Vortex",
    `Ghosts are ${pct(TRINKET_VORTEX_CUT)}% slower inside tunnels. Stacks.`,
    { kind: "vortex" },
  ),
  lowDef("lowTurning", "Traction", `Dot-Man corners ${TRINKET_TURN_PX_ADD}px earlier. Stacks.`, {
    kind: "turning",
  }),
  ...perGhostDefs(),
];

const LOW_BY_ID: ReadonlyMap<string, UpgradeDef> = new Map(
  TRINKET_DEFS.map((def) => [def.id, def]),
);

export const TRINKET_IDS: readonly TrinketUpgradeId[] = TRINKET_DEFS.map(
  (def) => def.id as TrinketUpgradeId,
);

export function isTrinketId(id: string): id is TrinketUpgradeId {
  return LOW_BY_ID.has(id);
}

export function slotCount(owned: readonly UpgradeId[]): number {
  return owned.filter((id) => !isTrinketId(id)).length;
}

export function trinketCounts(
  owned: readonly UpgradeId[],
): Partial<Record<TrinketUpgradeId, number>> {
  const counts: Partial<Record<TrinketUpgradeId, number>> = {};
  for (const id of owned) {
    if (isTrinketId(id)) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

export function trinketGhostOf(id: TrinketUpgradeId): GhostKindId | null {
  return LOW_BY_ID.get(id)?.trinket?.ghost ?? null;
}

export function trinketCopies(owned: readonly UpgradeId[], id: TrinketUpgradeId): number {
  return owned.filter((owner) => owner === id).length;
}

function kindCopies(owned: readonly UpgradeId[], kind: TrinketKind, ghost?: GhostKindId): number {
  let count = 0;
  for (const id of owned) {
    const effect = LOW_BY_ID.get(id)?.trinket;
    if (effect?.kind === kind && (ghost === undefined || effect.ghost === ghost)) {
      count += 1;
    }
  }
  return count;
}

export function withTrinketCopies(
  owned: readonly UpgradeId[],
  id: TrinketUpgradeId,
  copies: number,
): UpgradeId[] {
  const clamped = Math.min(TRINKET_MAX_COPIES, Math.max(1, copies));
  return [...owned.filter((other) => other !== id), ...Array.from({ length: clamped }, () => id)];
}

export function trinketCopyControls(copies: number): { down: boolean; up: boolean } {
  return { down: copies > 1, up: copies < TRINKET_MAX_COPIES };
}

export function trinketEligible(
  owned: readonly UpgradeId[],
  id: TrinketUpgradeId,
  roster: readonly GhostKindId[] | undefined,
): boolean {
  const ghost = trinketGhostOf(id);
  if (ghost !== null && (roster === undefined || !roster.includes(ghost))) {
    return false;
  }
  return trinketCopies(owned, id) < TRINKET_MAX_COPIES;
}

export function trinketPlayerSpeedMul(owned: readonly UpgradeId[], inTunnel: boolean): number {
  const base = 1 + TRINKET_SPEED_ADD * kindCopies(owned, "speed");
  const tunnel = inTunnel ? 1 + TRINKET_TUNNEL_SPEED_ADD * kindCopies(owned, "tunnelSpeed") : 1;
  return base * tunnel;
}

export function trinketPreTurnBonusPx(owned: readonly UpgradeId[]): number {
  return TRINKET_TURN_PX_ADD * kindCopies(owned, "turning");
}

export function trinketVortexMul(owned: readonly UpgradeId[]): number {
  return Math.max(TRINKET_MIN_SPEED_MUL, 1 - TRINKET_VORTEX_CUT * kindCopies(owned, "vortex"));
}

export function trinketGhostSpeedMul(owned: readonly UpgradeId[], ghost: GhostKindId): number {
  return Math.max(
    TRINKET_MIN_SPEED_MUL,
    1 - TRINKET_SLOWDOWN_CUT * kindCopies(owned, "slowdown", ghost),
  );
}

export function trinketTractionCopies(owned: readonly UpgradeId[], ghost: GhostKindId): number {
  return kindCopies(owned, "traction", ghost);
}

export function trinketTractionMul(copies: number): number {
  return Math.max(TRINKET_MIN_SPEED_MUL, 1 - TRINKET_TRACTION_CUT * copies);
}

export function trinketHouseDelayMs(owned: readonly UpgradeId[], ghost: GhostKindId): number {
  return TRINKET_HOUSE_DELAY_MS * kindCopies(owned, "houseDelay", ghost);
}

export function trinketKindReleaseAdds(
  owned: readonly UpgradeId[],
): (ghost: GhostKindId) => { delayMs: number; pellets: number } {
  return (ghost) => ({
    delayMs: trinketHouseDelayMs(owned, ghost),
    pellets: trinketHousePellets(owned, ghost),
  });
}

export function trinketHousePellets(owned: readonly UpgradeId[], ghost: GhostKindId): number {
  return TRINKET_HOUSE_PELLETS * kindCopies(owned, "houseDelay", ghost);
}
