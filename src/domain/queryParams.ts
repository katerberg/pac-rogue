export function parseQueryParams(search: string): URLSearchParams {
  const parts = search.replace(/^\?/, "").split("&");
  return new URLSearchParams(
    parts.map((part) => (part === "" || part.includes("=") ? part : `${part}=1`)).join("&"),
  );
}
