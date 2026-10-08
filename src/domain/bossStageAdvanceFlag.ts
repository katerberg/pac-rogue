export function parseBossStageAdvanceFlag(params: URLSearchParams): boolean {
  return params.get("bossStageAdvance") === "1";
}
