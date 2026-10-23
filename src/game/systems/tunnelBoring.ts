import { query, type World } from "bitecs";
import { activateAsciiLayout, getActiveLayout, type MazeTile } from "../../domain/maze";
import { ageBoreJunk, boreJunk, type BoreJunk } from "../../domain/boreJunk";
import {
  advanceBore,
  applyTunnelBoringAscii,
  boreCellsOpened,
  boreSettled,
  boringSpeedMultiplier,
  openBoredCellsOnLayout,
  startBore,
  tunnelBoringCells,
  type BoreProgress,
} from "../../domain/tunnelBoring";
import { Facing } from "../components/Facing";
import { DIRECTION, Input, type Direction } from "../components/Input";
import { Player } from "../components/Player";
import { CARDINAL_STEP, freshKeys, KEY_FOR_DIRECTION, type HeldKeys } from "./heldKeys";
import { playerCell } from "./playerCell";
import { playerFacing } from "./playerDirection";

export type TunnelBoringAttempt = {
  cells: MazeTile[];
  direction: Direction;
  charges: number;
};

/** Bores only on a fresh key press into the wall while at rest, so held or buffered input never fires it. */
export function tryTunnelBoring(
  world: World,
  charges: number,
  prevKeys: HeldKeys,
  keys: HeldKeys,
): TunnelBoringAttempt | null {
  if (charges <= 0) {
    return null;
  }
  if (playerFacing(world) !== DIRECTION.none) {
    return null;
  }
  const players = query(world, [Player, Input, Facing]);
  const eid = players[0];
  if (eid === undefined) {
    return null;
  }
  const intent = (Input.direction[eid] ?? DIRECTION.none) as Direction;
  if (intent === DIRECTION.none) {
    return null;
  }
  const key = KEY_FOR_DIRECTION[intent];
  if (key === undefined || !freshKeys(prevKeys, keys).includes(key)) {
    return null;
  }
  const step = CARDINAL_STEP[intent];
  if (step === undefined) {
    return null;
  }
  const cell = playerCell(world);
  if (cell === null) {
    return null;
  }
  const cells = tunnelBoringCells(cell.col, cell.row, step.dx, step.dy);
  if (cells === null) {
    return null;
  }
  return {
    cells,
    direction: intent,
    charges: charges - 1,
  };
}

export function applyBoredCellsToActiveLayout(cells: readonly MazeTile[]): void {
  if (cells.length === 0) {
    return;
  }
  const layout = getActiveLayout();
  const ascii = applyTunnelBoringAscii(layout.ascii, cells);
  const next = activateAsciiLayout(ascii, layout.id === "store" ? "store" : "generated");
  openBoredCellsOnLayout(next, cells);
}

export function adoptTunnelBoringFacing(world: World, direction: Direction): void {
  for (const eid of query(world, [Player, Input, Facing])) {
    Input.direction[eid] = direction;
    Facing.direction[eid] = direction;
  }
}

export type TunnelBore = { progress: BoreProgress | null; junk: readonly BoreJunk[] };

export const NO_TUNNEL_BORE: TunnelBore = { progress: null, junk: [] };

type BoreStep = { bore: TunnelBore; opened: MazeTile[] };

function withJunk(
  bore: TunnelBore,
  progress: BoreProgress | null,
  dug: { dx: number; dy: number },
  opened: MazeTile[],
  isRubble: (cell: MazeTile) => boolean,
): BoreStep {
  const { tileSize } = getActiveLayout();
  return {
    bore: {
      progress,
      junk: [
        ...bore.junk,
        ...opened.map((cell) => boreJunk(cell, dug.dx, dug.dy, tileSize, isRubble(cell))),
      ],
    },
    opened,
  };
}

export function beginTunnelBore(
  bore: TunnelBore,
  attempt: TunnelBoringAttempt,
  isRubble: (cell: MazeTile) => boolean,
): BoreStep {
  const step = CARDINAL_STEP[attempt.direction] ?? { dx: 0, dy: 0 };
  const prior = bore.progress;
  const finished = prior === null ? [] : prior.steps.slice(prior.opened).flat();
  const progress = startBore(attempt.cells, step.dx, step.dy);
  const flushed = prior === null ? bore : withJunk(bore, null, prior, finished, isRubble).bore;
  const started = withJunk(flushed, progress, step, boreCellsOpened(progress), isRubble);
  return { bore: started.bore, opened: [...finished, ...started.opened] };
}

export function stepTunnelBore(
  world: World,
  bore: TunnelBore,
  deltaMs: number,
  isRubble: (cell: MazeTile) => boolean,
): BoreStep {
  const aged = { ...bore, junk: ageBoreJunk(bore.junk, deltaMs) };
  const prior = bore.progress;
  if (prior === null) {
    return { bore: aged, opened: [] };
  }
  const at = playerCell(world);
  const progress = advanceBore(prior, deltaMs, at);
  return withJunk(
    aged,
    boreSettled(progress, at) ? null : progress,
    progress,
    boreCellsOpened(progress, prior.opened),
    isRubble,
  );
}

export function openBoredCells(all: readonly MazeTile[], bore: TunnelBore): MazeTile[] {
  const progress = bore.progress;
  if (progress === null) {
    return [...all];
  }
  const pending = new Set(
    progress.steps
      .slice(progress.opened)
      .flat()
      .map((cell) => `${cell.col},${cell.row}`),
  );
  return all.filter((cell) => !pending.has(`${cell.col},${cell.row}`));
}

export function tunnelBoringSpeedMul(world: World, bore: TunnelBore): number {
  return boringSpeedMultiplier(bore.progress, playerCell(world));
}
