import { query, type World } from "bitecs";
import type { GhostKindId } from "../../domain/ghostKind";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";

export function findGhostEidByKind(world: World, kind: GhostKindId | null): number | null {
  if (kind === null) {
    return null;
  }
  for (const eid of query(world, [Ghost, GhostKind])) {
    if ((GhostKind.kind[eid] ?? null) === kind) {
      return eid;
    }
  }
  return null;
}
