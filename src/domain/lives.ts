export const START_LIVES = 4;
export const LEVEL_LIVES_ICON_FLOOR = 3;
export const DEFAULT_MAX_LIVES = LEVEL_LIVES_ICON_FLOOR + 1;
export const MAX_LIVES_FLAG = 99;
export const STORE_REGEN_AMOUNT = 1;

export function livesRemainingAfterCatch(lives: number): { lives: number; gameOver: boolean } {
  if (lives <= 1) {
    return { lives: 0, gameOver: true };
  }
  return { lives: lives - 1, gameOver: false };
}

export function livesHudIconCount(lives: number): number {
  return Math.max(0, lives - 1);
}

export function parseInfiniteLivesFlag(params: URLSearchParams): boolean {
  return params.get("infiniteLives") === "1";
}

export function parseLivesCountParam(
  params: URLSearchParams,
  flag: "lives" | "maxLives",
): number | null {
  const raw = params.get(flag);
  if (raw === null || !/^\d+$/.test(raw) || Number(raw) < 1) {
    return null;
  }
  return Math.min(Number(raw), MAX_LIVES_FLAG);
}

export function levelLivesIconFloor(floorBonus: number, maxLives = DEFAULT_MAX_LIVES): number {
  return livesHudIconCount(maxLives) + floorBonus;
}

export function levelRegenAmount(hasMyogenesis: boolean, toFull = false): number {
  if (!hasMyogenesis) {
    return 0;
  }
  if (toFull) {
    return Number.POSITIVE_INFINITY;
  }
  return 1;
}

export function livesAfterLevelRegen(
  lives: number,
  iconFloor = LEVEL_LIVES_ICON_FLOOR,
  regenAmount = 1,
): number {
  if (regenAmount <= 0) {
    return lives;
  }
  const missing = iconFloor - livesHudIconCount(lives);
  return missing > 0 ? lives + Math.min(regenAmount, missing) : lives;
}

export function storeLifeRoom(
  lives: number,
  floorBonus: number,
  maxLives = DEFAULT_MAX_LIVES,
): number {
  return Math.max(0, levelLivesIconFloor(floorBonus, maxLives) + 1 - lives);
}
