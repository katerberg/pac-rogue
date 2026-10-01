import { BONUS_BAR_MAX } from "./bonusBar";

export function parseBonusParam(params: URLSearchParams): number | null {
  const raw = params.get("bonus");
  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  return value < BONUS_BAR_MAX ? value : null;
}
