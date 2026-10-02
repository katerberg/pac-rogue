const RUN_LOG_FILL_MAX = 600;

export function parseRunLogFillFlag(params: URLSearchParams): number | null {
  const raw = params.get("runLogFill");
  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }
  const count = Number(raw);
  return count <= RUN_LOG_FILL_MAX ? count : null;
}
