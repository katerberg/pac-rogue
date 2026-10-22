import { query, type World } from "bitecs";
import { activateAsciiLayout, getActiveLayout, type MazeTile } from "../../domain/maze";
import {
  applyTunnelBoringAscii,
  openBoredCellsOnLayout,
  tunnelBoringCells,
} from "../../domain/tunnelBoring";
import { Facing } from "../components/Facing";
import { DIRECTION, Input, type Direction } from "../components/Input";
import { Player } from "../components/Player";
import { CARDINAL_STEP } from "./heldKeys";
import { playerCell } from "./playerCell";
import { playerFacing } from "./playerDirection";

export type TunnelBoringAttempt = {
  cells: MazeTile[];
  direction: Direction;
  charges: number;
};

export function tryTunnelBoring(world: World, charges: number): TunnelBoringAttempt | null {
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
  const step = CARDINAL_STEP[intent];
  if (step === undefined) {
    return null;
  }
  const cell = playerCell(world);
  if (cell === null) {
    return null;
  }
  const cells = tunnelBoringCells(cell.col, cell.row, step.dx, step.dy);
  if (cells === null || cells.length === 0) {
    return null;
  }
  return {
    cells,
    direction: intent,
    charges: Math.max(0, charges - 1),
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
