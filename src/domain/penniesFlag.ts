import { QUARTER_CHARGE } from "./pennies";

export function parsePenniesParam(params: URLSearchParams): number | null {
  const raw = params.get("pennyCharge");
  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  return value < QUARTER_CHARGE ? value : null;
}
