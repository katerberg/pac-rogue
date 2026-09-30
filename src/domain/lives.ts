export const START_LIVES = 3;
export const LEVEL_LIVES_ICON_FLOOR = 3;

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

export const EXTRA_LIFE_LEVEL_LIVES_ICON_FLOOR = 4;

export function levelLivesIconFloor(hasExtraLife: boolean): number {
  return hasExtraLife ? EXTRA_LIFE_LEVEL_LIVES_ICON_FLOOR : LEVEL_LIVES_ICON_FLOOR;
}

export function livesAfterLevelRegen(lives: number, iconFloor = LEVEL_LIVES_ICON_FLOOR): number {
  return livesHudIconCount(lives) < iconFloor ? lives + 1 : lives;
}
