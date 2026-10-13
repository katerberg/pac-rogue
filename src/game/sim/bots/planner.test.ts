import { query } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../../domain/ghostKind";
import { GHOST_PHASE } from "../../../domain/ghostPhase";
import { cellCenterX, cellCenterY, getActiveLayout } from "../../../domain/maze";
import { defaultPlayOptions } from "../../../domain/playOptions";
import { Facing } from "../../components/Facing";
import { Ghost } from "../../components/Ghost";
import { GhostKind } from "../../components/GhostKind";
import { GhostPhase } from "../../components/GhostPhase";
import { DIRECTION } from "../../components/Input";
import { Position } from "../../components/Position";
import { PlaySim } from "../playSim";
import { bestExit, cellIndex } from "./navigate";
import { Observer, playerEid, sampleGhosts } from "./observe";
import { planExits, SURVIVABLE_SCORE, type PlannerWeights } from "./planner";

const WEIGHTS: PlannerWeights = {
  pellet: 1,
  power: 0.3,
  fruit: 1,
  frightChase: 1,
  safety: 0.1,
  margin: 0.2,
};

function corridorRun(length: number): { row: number; col: number } {
  const solids = getActiveLayout().playerSolids;
  for (let row = 1; row < solids.length - 1; row += 1) {
    let run = 0;
    for (let col = 1; col < solids[row]!.length - 1; col += 1) {
      const open = !solids[row]![col];
      const sealed = solids[row - 1]![col] && solids[row + 1]![col];
      run = open && sealed ? run + 1 : 0;
      if (run === length) {
        return { row, col: col - length + 1 };
      }
    }
  }
  throw new Error("no corridor");
}

function place(eid: number, col: number, row: number, facing: number): void {
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  Facing.direction[eid] = facing as never;
}

describe("planExits", () => {
  it("refuses to walk into a ghost coming head-on and turns back instead", () => {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), level: 3, maze: "maze1", disableLevelUpgrades: true },
      "planner",
    );
    sim.start();
    const { row, col } = corridorRun(6);
    const player = playerEid(sim.world)!;
    place(player, col + 1, row, DIRECTION.right);
    const blinky = [...query(sim.world, [Ghost, GhostKind])].find(
      (eid) => GhostKind.kind[eid] === GHOST_KIND.blinky,
    )!;
    place(blinky, col + 5, row, DIRECTION.left);
    GhostPhase.value[blinky] = GHOST_PHASE.active;

    const observer = new Observer();
    const start = cellIndex(observer.grid(false).grid, col + 1, row);
    const state = observer.plannerState(
      sim,
      sampleGhosts(sim.world),
      { current: start, cell: start, distPx: 0, facing: DIRECTION.right },
      12,
    );
    const scores = planExits(state, WEIGHTS);
    const right = scores.find((entry) => entry.direction === DIRECTION.right)!;
    const left = scores.find((entry) => entry.direction === DIRECTION.left)!;

    expect(right.score).toBeLessThan(SURVIVABLE_SCORE);
    expect(left.score).toBeGreaterThan(SURVIVABLE_SCORE);
    expect(bestExit(scores)).toBe(DIRECTION.left);
  });
});
