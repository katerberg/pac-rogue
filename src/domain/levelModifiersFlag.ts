export function parseLevelModifiersFlag(params: URLSearchParams): boolean {
  return params.get("levelModifiers") !== "0";
}
