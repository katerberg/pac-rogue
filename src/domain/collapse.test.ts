import { describe, expect, it } from "vitest";
import {
  applyCollapse,
  collapseCountForLevel,
  collapsedChainsFor,
  COLLAPSE_LEVELS,
  isFreshCollapse,
  pickCollapsePlan,
} from "./collapse";
import { layoutFromAscii } from "./maze";
import { MAZE_POOL } from "./mazePool";
import { MAX_LEVEL } from "./levelRules";
import { randomFromSeed } from "./mazeTiling";

const plans = MAZE_POOL.map((map) => ({
  map,
  plan: pickCollapsePlan(map.ascii, randomFromSeed(`collapse:${map.id}`)),
}));

function openNeighbours(lines: string[], col: number, row: number): number {
  const wrap = lines[row]![0] !== "#" && lines[row]![lines[0]!.length - 1] !== "#";
  const cells = [
    [col, row - 1],
    [col, row + 1],
    [col - 1, row],
    [col + 1, row],
  ];
  if (wrap && col === 0) cells.push([lines[0]!.length - 1, row]);
  if (wrap && col === lines[0]!.length - 1) cells.push([0, row]);
  return cells.filter(([c, r]) => !"#H=".includes(lines[r!]?.[c!] ?? "#")).length;
}

describe("collapse schedule", () => {
  it("adds one collapse on levels 4, 5 and 7, keeps them, and skips the boss", () => {
    const counts = Array.from({ length: MAX_LEVEL }, (_, i) => collapseCountForLevel(i + 1));
    expect(counts).toEqual([0, 0, 0, 1, 2, 2, 3, 3, 0]);
  });

  it("marks only the collapse that arrives on the current level as fresh", () => {
    const fresh = (level: number): boolean[] =>
      Array.from({ length: collapseCountForLevel(level) }, (_, i) => isFreshCollapse(i, level));
    expect(fresh(4)).toEqual([true]);
    expect(fresh(5)).toEqual([false, true]);
    expect(fresh(6)).toEqual([false, false]);
    expect(fresh(7)).toEqual([false, false, true]);
    expect(fresh(8)).toEqual([false, false, false]);
  });
});

describe("pickCollapsePlan", () => {
  it("is deterministic for one stream", () => {
    const ascii = MAZE_POOL[8]!.ascii;
    expect(pickCollapsePlan(ascii, randomFromSeed("same"))).toEqual(
      pickCollapsePlan(ascii, randomFromSeed("same")),
    );
  });

  it("finds all three collapses on most pool maps", () => {
    const full = plans.filter(({ plan }) => plan.chains.length === COLLAPSE_LEVELS.length);
    expect(full.length / plans.length).toBeGreaterThan(0.9);
  });

  it.each(plans.map((entry) => [entry.map.id, entry] as const))(
    "pool %i never traps or cuts off any tile",
    (_id, { map, plan }) => {
      const collapsed = applyCollapse(map.ascii, plan.chains);
      const lines = collapsed.split("\n");
      const cells = new Set(plan.chains.flat().map((c) => `${c.col},${c.row}`));
      expect(cells.size).toBe(plan.chains.flat().length);
      for (const chain of plan.chains) {
        for (const { col, row } of chain) {
          expect(map.ascii.split("\n")[row]![col]).not.toBe("@");
          expect(lines[row]![col]).toBe("#");
        }
      }
      for (let row = 0; row < lines.length; row += 1) {
        for (let col = 0; col < lines[0]!.length; col += 1) {
          if ("#H=".includes(lines[row]![col]!)) continue;
          expect(
            openNeighbours(lines, col, row),
            `dead end at ${col},${row}`,
          ).toBeGreaterThanOrEqual(2);
        }
      }
      const layout = layoutFromAscii(collapsed);
      expect(layout.exterior.flat().some(Boolean)).toBe(false);
    },
  );

  it("keeps collapses five tiles apart and away from the ghost house and spawn", () => {
    for (const { map, plan } of plans) {
      const lines = map.ascii.split("\n");
      const protectedCells: [number, number][] = [];
      lines.forEach((line, row) =>
        [...line].forEach((ch, col) => {
          if ("H=P".includes(ch)) protectedCells.push([col, row]);
        }),
      );
      const all = plan.chains.flatMap((chain, i) => chain.map((cell) => ({ cell, i })));
      for (const { cell } of all) {
        for (const [col, row] of protectedCells) {
          expect(Math.abs(col - cell.col) + Math.abs(row - cell.row)).toBeGreaterThan(3);
        }
      }
      for (const a of all) {
        for (const b of all) {
          if (a.i !== b.i) {
            expect(
              Math.abs(a.cell.col - b.cell.col) + Math.abs(a.cell.row - b.cell.row),
            ).toBeGreaterThanOrEqual(5);
          }
        }
      }
    }
  });
});

describe("collapse helpers", () => {
  it("takes the first chains for a level", () => {
    const { plan } = plans[8]!;
    expect(collapsedChainsFor(plan, 4)).toEqual(plan.chains.slice(0, 1));
    expect(collapsedChainsFor(plan, 9)).toEqual([]);
  });
});
