import { GHOST_KIND, type GhostKindId } from "./ghostKind";

export type GhostArtStyle = "pixel" | "line";

export const LINE_ART_CLYDE_LEVELS = { first: 5, last: 8 } as const;

export function ghostArtStyle(kind: GhostKindId, levelIndex: number): GhostArtStyle {
  return kind === GHOST_KIND.clyde &&
    levelIndex >= LINE_ART_CLYDE_LEVELS.first &&
    levelIndex <= LINE_ART_CLYDE_LEVELS.last
    ? "line"
    : "pixel";
}
