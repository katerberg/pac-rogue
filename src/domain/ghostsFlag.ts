import { GHOST_KIND, type GhostKindId } from "./ghostKind";

export function parseGhostsParam(params: URLSearchParams): GhostKindId[] | null {
  const kinds: GhostKindId[] = [];
  for (const name of params.getAll("ghosts").flatMap((value) => value.split(","))) {
    if (!Object.hasOwn(GHOST_KIND, name)) {
      continue;
    }
    const kind = GHOST_KIND[name as keyof typeof GHOST_KIND];
    if (!kinds.includes(kind)) {
      kinds.push(kind);
    }
  }
  return kinds.length > 0 ? kinds : null;
}
