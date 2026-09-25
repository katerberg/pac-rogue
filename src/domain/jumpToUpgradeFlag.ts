export function parseJumpToUpgradeFlag(params: URLSearchParams): boolean {
  return params.get("jumpToUpgrade") === "1";
}
