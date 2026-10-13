import { describe, expect, it } from "vitest";
import { DIRECTION } from "../../components/Input";
import { bestExit, bfs, cellIndex, gridFrom, openExits } from "./navigate";

function grid(rows: string[]) {
  return gridFrom(rows.map((row) => [...row].map((ch) => ch === "#")));
}

const corridor = grid(["#######", "       ", "#######"]);

const cross = grid(["###.###", "###.###", ".......", "###.###", "###.###"]);

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

describe("bestExit", () => {
  it("picks the highest score", () => {
    expect(
      bestExit([
        { direction: DIRECTION.left, score: -1000 },
        { direction: DIRECTION.up, score: 2 },
        { direction: DIRECTION.down, score: 1 },
      ]),
    ).toBe(DIRECTION.up);
    expect(bestExit([])).toBeNull();
  });
});
