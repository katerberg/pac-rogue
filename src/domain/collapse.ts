import { MAX_LEVEL } from "./levelRules";
import type { MazeTile } from "./maze";

export const COLLAPSE_LEVELS = [4, 5, 7] as const;
export const SINKHOLE_LEVEL = 6;

const PELLET_CHARS = ".@";
const MIN_RUN_CELLS = 3;
const MAX_RUN_CELLS = 5;
const KEEP_OUT_TILES = 3;
const MIN_SPACING_TILES = 5;

export type CollapseChain = readonly MazeTile[];

export type CollapsePlan = {
  chains: readonly CollapseChain[];
  sinkhole: CollapseChain | null;
  artSeed: number;
};

export function collapseCountForLevel(levelIndex: number): number {
  if (levelIndex >= MAX_LEVEL) {
    return 0;
  }
  return COLLAPSE_LEVELS.filter((level) => level <= levelIndex).length;
}

export function isFreshCollapse(chainIndex: number, levelIndex: number): boolean {
  return COLLAPSE_LEVELS[chainIndex] === levelIndex;
}

export function collapsedChainsFor(plan: CollapsePlan, levelIndex: number): CollapseChain[] {
  return plan.chains.slice(0, collapseCountForLevel(levelIndex));
}

export function sinkholeFor(plan: CollapsePlan, levelIndex: number): CollapseChain | null {
  return levelIndex >= SINKHOLE_LEVEL && levelIndex < MAX_LEVEL ? plan.sinkhole : null;
}

export function isFreshSinkhole(levelIndex: number): boolean {
  return levelIndex === SINKHOLE_LEVEL;
}

export function applySinkhole(ascii: string, chain: CollapseChain | null): string {
  if (chain === null) {
    return ascii;
  }
  const lines = ascii.split("\n").map((line) => [...line]);
  for (const cell of chain) {
    if (PELLET_CHARS.includes(lines[cell.row]![cell.col]!)) {
      lines[cell.row]![cell.col] = " ";
    }
  }
  return lines.map((line) => line.join("")).join("\n");
}

export function applyCollapse(ascii: string, chains: readonly CollapseChain[]): string {
  const lines = ascii.split("\n").map((line) => [...line]);
  for (const cell of chains.flat()) {
    lines[cell.row]![cell.col] = "#";
  }
  return lines.map((line) => line.join("")).join("\n");
}

type Graph = {
  cols: number;
  rows: number;
  lines: readonly string[];
  nodes: ReadonlySet<number>;
  wrapRows: ReadonlySet<number>;
};

const key = (graph: Pick<Graph, "cols">, col: number, row: number): number =>
  row * graph.cols + col;

function buildGraph(ascii: string): Graph {
  const lines = ascii.split("\n");
  const rows = lines.length;
  const cols = lines[0]!.length;
  const nodes = new Set<number>();
  const wrapRows = new Set<number>();
  for (let row = 0; row < rows; row += 1) {
    const line = lines[row]!;
    if (line[0] !== "#" && line[cols - 1] !== "#") {
      wrapRows.add(row);
    }
    for (let col = 0; col < cols; col += 1) {
      if (!"#H=".includes(line[col]!)) {
        nodes.add(row * cols + col);
      }
    }
  }
  return { cols, rows, lines, nodes, wrapRows };
}

function neighbours(graph: Graph, cell: number, removed: ReadonlySet<number>): number[] {
  const { cols, rows, nodes, wrapRows } = graph;
  const row = Math.floor(cell / cols);
  const col = cell % cols;
  const out: number[] = [];
  const consider = (c: number, r: number): void => {
    const k = r * cols + c;
    if (nodes.has(k) && !removed.has(k)) {
      out.push(k);
    }
  };
  if (row > 0) consider(col, row - 1);
  if (row < rows - 1) consider(col, row + 1);
  if (col > 0) consider(col - 1, row);
  if (col < cols - 1) consider(col + 1, row);
  if (wrapRows.has(row) && col === 0) consider(cols - 1, row);
  if (wrapRows.has(row) && col === cols - 1) consider(0, row);
  return out;
}

function startCell(graph: Graph): number {
  for (let row = 0; row < graph.rows; row += 1) {
    const col = graph.lines[row]!.indexOf("P");
    if (col >= 0) {
      return key(graph, col, row);
    }
  }
  return [...graph.nodes][0]!;
}

function staysOneMaze(graph: Graph, removed: ReadonlySet<number>): boolean {
  for (const cell of graph.nodes) {
    if (!removed.has(cell) && neighbours(graph, cell, removed).length < 2) {
      return false;
    }
  }
  const start = startCell(graph);
  const seen = new Set<number>([start]);
  const queue = [start];
  for (let i = 0; i < queue.length; i += 1) {
    for (const next of neighbours(graph, queue[i]!, removed)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size === graph.nodes.size - removed.size;
}

function cellOf(graph: Graph, cell: number): MazeTile {
  return { col: cell % graph.cols, row: Math.floor(cell / graph.cols) };
}

function candidateRuns(graph: Graph): number[][] {
  const none = new Set<number>();
  const degree = (cell: number): number => neighbours(graph, cell, none).length;
  const keepOut: MazeTile[] = [];
  for (let row = 0; row < graph.rows; row += 1) {
    for (let col = 0; col < graph.cols; col += 1) {
      if ("H=P".includes(graph.lines[row]![col]!)) {
        keepOut.push({ col, row });
      }
    }
  }
  const blocked = (cell: number): boolean => {
    const tile = cellOf(graph, cell);
    return (
      graph.lines[tile.row]![tile.col] === "@" ||
      graph.wrapRows.has(tile.row) ||
      keepOut.some(
        (other) =>
          Math.abs(other.col - tile.col) + Math.abs(other.row - tile.row) <= KEEP_OUT_TILES,
      )
    );
  };
  const seen = new Set<string>();
  const runs: number[][] = [];
  for (const junction of graph.nodes) {
    if (degree(junction) === 2) {
      continue;
    }
    for (const first of neighbours(graph, junction, none)) {
      if (degree(first) !== 2) {
        continue;
      }
      const cells: number[] = [];
      let previous = junction;
      let current = first;
      while (degree(current) === 2) {
        cells.push(current);
        const next = neighbours(graph, current, none).find((n) => n !== previous)!;
        previous = current;
        current = next;
      }
      const id = [cells[0]!, cells[cells.length - 1]!].sort((a, b) => a - b).join("-");
      const usable =
        current !== junction &&
        !seen.has(id) &&
        cells.length >= MIN_RUN_CELLS &&
        cells.length <= MAX_RUN_CELLS &&
        !cells.some(blocked);
      seen.add(id);
      if (usable) {
        runs.push(cells);
      }
    }
  }
  return runs;
}

function farApart(graph: Graph, a: readonly number[], b: readonly number[]): boolean {
  return a.every((x) =>
    b.every((y) => {
      const p = cellOf(graph, x);
      const q = cellOf(graph, y);
      return Math.abs(p.col - q.col) + Math.abs(p.row - q.row) >= MIN_SPACING_TILES;
    }),
  );
}

export function pickCollapsePlan(ascii: string, nextRandom: () => number): CollapsePlan {
  const graph = buildGraph(ascii);
  const runs = candidateRuns(graph);
  for (let i = runs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRandom() * (i + 1));
    [runs[i], runs[j]] = [runs[j]!, runs[i]!];
  }
  const chosen: number[][] = [];
  const removed = new Set<number>();
  for (const run of runs) {
    if (chosen.length > COLLAPSE_LEVELS.length) {
      break;
    }
    if (!chosen.every((other) => farApart(graph, other, run))) {
      continue;
    }
    const trial = new Set([...removed, ...run]);
    if (staysOneMaze(graph, trial)) {
      chosen.push(run);
      run.forEach((cell) => removed.add(cell));
    }
  }
  const chains = chosen.map((run) => run.map((cell) => cellOf(graph, cell)));
  return {
    chains: chains.slice(0, COLLAPSE_LEVELS.length),
    sinkhole: chains[COLLAPSE_LEVELS.length] ?? null,
    artSeed: Math.floor(nextRandom() * 0x7fffffff),
  };
}
