export type StoreIndex = 1 | 2 | 3;

export function parseStoreFlag(params: URLSearchParams): StoreIndex | null {
  const value = params.get("store");
  return value === "1" || value === "2" || value === "3" ? (Number(value) as StoreIndex) : null;
}
