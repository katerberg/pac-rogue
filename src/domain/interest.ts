export const INTEREST_POP_DELAY_MS = 400;
export const INTEREST_POP_INTERVAL_MS = 120;

export type InterestPop = { count: number; elapsedMs: number };

export function interestCoinsShown(pop: InterestPop): number {
  if (pop.elapsedMs < INTEREST_POP_DELAY_MS) {
    return 0;
  }
  const shown = Math.floor((pop.elapsedMs - INTEREST_POP_DELAY_MS) / INTEREST_POP_INTERVAL_MS) + 1;
  return Math.min(pop.count, shown);
}
