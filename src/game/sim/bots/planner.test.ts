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
import { GHOST_AI_MODE } from "../../../domain/ghostMode";
import { PlaySim } from "../playSim";
import { bestExit, cellIndex } from "./navigate";
import { Observer, playerEid, sampleGhosts } from "./observe";
import { powerPelletAffordance } from "./affordances";
import {
  advanceGhost,
  planExits,
  SURVIVABLE_SCORE,
  type PlannerState,
  type PlannerWeights,
} from "./planner";
import type { UpgradeId } from "../../../domain/upgrades";

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

function sideJunction(): { row: number; col: number } {
  const solids = getActiveLayout().playerSolids;
  const open = (col: number, row: number) => solids[row]?.[col] === false;
  for (let row = 1; row < solids.length - 4; row += 1) {
    for (let col = 2; col < solids[row]!.length - 2; col += 1) {
      if (
        open(col, row) &&
        open(col - 1, row) &&
        open(col + 1, row) &&
        !open(col, row - 1) &&
        open(col, row + 1) &&
        open(col, row + 2) &&
        open(col, row + 3)
      ) {
        return { row, col };
      }
    }
  }
  throw new Error("no side junction");
}

function place(eid: number, col: number, row: number, facing: number): void {
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  Facing.direction[eid] = facing as never;
}

function headOn(): { state: PlannerState; pelletCell: number } {
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
  const grid = observer.grid(false).grid;
  const start = cellIndex(grid, col + 1, row);
  const state = observer.plannerState(
    sim,
    sampleGhosts(sim.world),
    { current: start, cell: start, distPx: 0, facing: DIRECTION.right },
    { depth: 12, readsGhosts: true },
  );
  return { state, pelletCell: cellIndex(grid, col + 2, row) };
}

function rightExit(state: PlannerState): number {
  return planExits(state, WEIGHTS).find((entry) => entry.direction === DIRECTION.right)!.score;
}

function withPowerPellet(state: PlannerState, cell: number, owned: UpgradeId[]): PlannerState {
  const power = new Uint8Array(state.power);
  power[cell] = 1;
  return { ...state, power, affordance: powerPelletAffordance(owned, 3, 100) };
}

describe("planExits with upgrades", () => {
  it("walks through a ghost after a power pellet that grants invulnerability", () => {
    const { state, pelletCell } = headOn();
    expect(rightExit(state)).toBeLessThan(SURVIVABLE_SCORE);
    expect(rightExit(withPowerPellet(state, pelletCell, ["powerPelletInvuln"]))).toBeGreaterThan(
      SURVIVABLE_SCORE,
    );
  });

  it("spends a shield instead of dying", () => {
    const { state } = headOn();
    expect(rightExit({ ...state, shields: 1 })).toBeGreaterThan(SURVIVABLE_SCORE);
  });

  it("treats a frozen or frightened ghost as harmless", () => {
    const { state, pelletCell } = headOn();
    expect(rightExit(withPowerPellet(state, pelletCell, ["powerPelletFreeze"]))).toBeGreaterThan(
      SURVIVABLE_SCORE,
    );
    expect(rightExit(withPowerPellet(state, pelletCell, ["powerPelletHunter"]))).toBeGreaterThan(
      SURVIVABLE_SCORE,
    );
  });

  it("is still caught when Shield Break swallows the pellet's effect", () => {
    const { state, pelletCell } = headOn();
    expect(
      rightExit(withPowerPellet(state, pelletCell, ["powerPelletInvuln", "passiveShieldBreak"])),
    ).toBeLessThan(SURVIVABLE_SCORE);
  });
});

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
      { depth: 12, readsGhosts: true },
    );
    const scores = planExits(state, WEIGHTS);
    const right = scores.find((entry) => entry.direction === DIRECTION.right)!;
    const left = scores.find((entry) => entry.direction === DIRECTION.left)!;

    expect(right.score).toBeLessThan(SURVIVABLE_SCORE);
    expect(left.score).toBeGreaterThan(SURVIVABLE_SCORE);
    expect(bestExit(scores)).toBe(DIRECTION.left);
  });

  it("keeps a ghost on its heading at a junction when the tier does not read targeting", () => {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), level: 3, maze: "maze1", disableLevelUpgrades: true },
      "planner-naive",
    );
    sim.start();
    const { row, col } = sideJunction();
    const player = playerEid(sim.world)!;
    place(player, col, row + 3, DIRECTION.up);
    const blinky = [...query(sim.world, [Ghost, GhostKind])].find(
      (eid) => GhostKind.kind[eid] === GHOST_KIND.blinky,
    )!;
    place(blinky, col - 1, row, DIRECTION.right);
    GhostPhase.value[blinky] = GHOST_PHASE.active;
    const observer = new Observer();
    const start = cellIndex(observer.grid(false).grid, col, row + 3);
    const decision = { current: start, cell: start, distPx: 0, facing: DIRECTION.up };
    const walk = (readsGhosts: boolean) => {
      const state = {
        ...observer.plannerState(sim, sampleGhosts(sim.world), decision, {
          depth: 12,
          readsGhosts,
        }),
        mode: GHOST_AI_MODE.chase,
      };
      const ghost = { ...state.ghosts.find((g) => g.blinky)! };
      const at = { col, row: row + 3, facing: DIRECTION.up };
      advanceGhost(state, ghost, 1, at, ghost);
      return ghost;
    };
    expect(walk(false)).toMatchObject({ col, row, dir: DIRECTION.right });
    expect(walk(true)).toMatchObject({ col, row, dir: DIRECTION.down });
  });
});
