import { describe, expect, it } from "vitest";
import { DIRECTION } from "../../components/Input";
import {
  bestExit,
  bfs,
  cellIndex,
  gridFrom,
  openExits,
  scoreExits,
  type BoardView,
} from "./navigate";
import { PERSONAS } from "./profiles";

function grid(rows: string[]) {
  return gridFrom(rows.map((row) => [...row].map((ch) => ch === "#")));
}

const corridor = grid(["#######", "       ", "#######"]);

const cross = grid(["###.###", "###.###", ".......", "###.###", "###.###"]);

function view(g: ReturnType<typeof grid>, overrides: Partial<BoardView> = {}): BoardView {
  return {
    grid: g,
    pellets: [],
    powerPellets: [],
    fruit: null,
    tunnelCells: [],
    ghosts: [],
    invulnerable: false,
    ...overrides,
  };
}

describe("bfs", () => {
  it("measures walking distance and wraps through edge tunnels", () => {
    const dist = bfs(corridor, cellIndex(corridor, 0, 1));
    expect(dist[cellIndex(corridor, 3, 1)]).toBe(3);
    expect(dist[cellIndex(corridor, 6, 1)]).toBe(1);
    expect(dist[cellIndex(corridor, 3, 0)]).toBe(-1);
  });

  it("treats the blocked cell as a wall", () => {
    const from = cellIndex(corridor, 3, 1);
    const dist = bfs(corridor, from, cellIndex(corridor, 4, 1));
    expect(dist[cellIndex(corridor, 5, 1)]).toBe(5);
  });

  it("lists open exits", () => {
    expect(openExits(cross, cellIndex(cross, 3, 2)).sort()).toEqual(
      [DIRECTION.up, DIRECTION.down, DIRECTION.left, DIRECTION.right].sort(),
    );
  });
});

describe("scoreExits", () => {
  const center = cellIndex(cross, 3, 2);
  const noNoise = () => 0;

  it("steers a cautious bot away from a ghost coming up one arm", () => {
    const ghost = {
      cell: cellIndex(cross, 5, 2),
      behind: cellIndex(cross, 6, 2),
      speedRatio: 1,
      dangerous: true,
      frightened: false,
    };
    const scores = scoreExits(
      view(cross, { ghosts: [ghost], pellets: [cellIndex(cross, 6, 2)] }),
      center,
      center,
      DIRECTION.right,
      PERSONAS.cautious.weights,
      noNoise,
    );
    expect(bestExit(scores)).not.toBe(DIRECTION.right);
  });

  it("sends a disrupter toward a frightened ghost", () => {
    const ghost = {
      cell: cellIndex(cross, 3, 0),
      behind: -1,
      speedRatio: 0.6,
      dangerous: false,
      frightened: true,
    };
    const scores = scoreExits(
      view(cross, { ghosts: [ghost] }),
      center,
      center,
      DIRECTION.left,
      PERSONAS.disrupter.weights,
      noNoise,
    );
    expect(bestExit(scores)).toBe(DIRECTION.up);
  });

  it("heads for the nearest pellet when no ghost is near", () => {
    const scores = scoreExits(
      view(cross, { pellets: [cellIndex(cross, 3, 4)] }),
      center,
      center,
      DIRECTION.down,
      PERSONAS.speedrunner.weights,
      noNoise,
    );
    expect(bestExit(scores)).toBe(DIRECTION.down);
  });
});
