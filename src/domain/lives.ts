export const START_LIVES = 3;

export type LivesAfterCatch = {
  lives: number;
  gameOver: boolean;
};

export function livesRemainingAfterCatch(lives: number): LivesAfterCatch {
  if (lives <= 1) {
    return { lives: 0, gameOver: true };
  }
  return { lives: lives - 1, gameOver: false };
}
