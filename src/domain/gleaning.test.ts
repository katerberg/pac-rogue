import { describe, expect, it } from "vitest";
import { createGleaning, stepGleaning } from "./gleaning";

const A = { col: 1, row: 1 };
const B = { col: 2, row: 1 };

describe("stepGleaning", () => {
  it("drops a crumb on a cleared tile that once held a pellet", () => {
    const state = createGleaning([A, B]);
    const step = stepGleaning(state, [A], [B], true);
    expect(step.crumbs).toEqual([A]);
  });

  it("drops no crumb on a tile that still holds a pellet or never did", () => {
    const state = createGleaning([A]);
    expect(stepGleaning(state, [A], [A], true).crumbs).toEqual([]);
    expect(stepGleaning(state, [B], [], true).crumbs).toEqual([]);
  });

  it("pays each tile once per board", () => {
    const first = stepGleaning(createGleaning([A]), [A], [], true);
    expect(stepGleaning(first.state, [A], [], true).crumbs).toEqual([]);
  });

  it("counts two ghosts on one tile once", () => {
    expect(stepGleaning(createGleaning([A]), [A, A], [], true).crumbs).toEqual([A]);
  });

  it("keeps the tile for later while no streak is running", () => {
    const idle = stepGleaning(createGleaning([A]), [A], [], false);
    expect(idle.crumbs).toEqual([]);
    expect(stepGleaning(idle.state, [A], [], true).crumbs).toEqual([A]);
  });
});
