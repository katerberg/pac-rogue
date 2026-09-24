export const START_LIVES = 3;

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
