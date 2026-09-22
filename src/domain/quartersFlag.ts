export function parseQuartersParam(params: URLSearchParams): number | null {
  const raw = params.get("quarters");
  if (raw === null || raw === "" || !/^\d+$/.test(raw)) {
    return null;
  }
  return Number(raw);
}
