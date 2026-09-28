export function parseStoreFlag(params: URLSearchParams): boolean {
  return params.get("store") === "1";
}
