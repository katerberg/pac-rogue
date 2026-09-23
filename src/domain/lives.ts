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

export function livesAfterLevelRegen(lives: number): number {
  return livesHudIconCount(lives) < LEVEL_LIVES_ICON_FLOOR ? lives + 1 : lives;
}
