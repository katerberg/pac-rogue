export function parseLevelParam(params: URLSearchParams): number | null {
  const raw = params.get("level");
  if (raw === null || raw === "") {
    return null;
  }
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

export function ghostSpeedLevelMul(levelIndex: number): number {
  const level = Math.max(1, levelIndex);
  return 1 + 0.1 * (level - 1);
}
