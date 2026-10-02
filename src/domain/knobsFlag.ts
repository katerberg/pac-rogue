export function parseKnobsFlag(params: URLSearchParams): boolean {
  return params.get("knobs") === "1";
}
