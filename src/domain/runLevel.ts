import { MAX_LEVEL } from "./levelRules";

export function parseLevelParam(params: URLSearchParams): number | null {
  const raw = params.get("level");
  if (raw === null || raw === "" || !/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  if (value < 1) {
    return null;
  }
  return Math.min(value, MAX_LEVEL);
}
