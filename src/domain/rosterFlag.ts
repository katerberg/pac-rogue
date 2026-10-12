import { parseRosterId } from "./ghostRoster";

export function parseRosterParam(params: URLSearchParams): number | null {
  return parseRosterId(params.get("roster"));
}
