export function parseQueryParams(search: string): URLSearchParams {
  const params = new URLSearchParams(search);
  const bare = new Set<string>();
  for (const part of search.replace(/^\?/, "").split("&")) {
    if (part !== "" && !part.includes("=")) {
      bare.add(new URLSearchParams(part).keys().next().value as string);
    }
  }
  if (bare.size === 0) {
    return params;
  }
  const normalized = new URLSearchParams();
  for (const [key, value] of params) {
    normalized.append(key, bare.has(key) && value === "" ? "1" : value);
  }
  return normalized;
}
