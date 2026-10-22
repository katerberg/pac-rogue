export function parseFruitFlag(params: URLSearchParams): boolean {
  return params.get("fruit") === "1";
}
