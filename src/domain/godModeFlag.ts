export function parseGodModeFlag(params: URLSearchParams): boolean {
  return params.get("godMode") === "1";
}
