import { query, type World } from "bitecs";
import { snapToCellCenter, type SolidGrid } from "../../domain/maze";
import {
  programmerEnterCell,
  programmerPathMarks,
  recordProgrammerPress,
  type ProgramDir,
  type ProgrammerPathMark,
  type ProgrammerState,
  type ProgrammerStep,
} from "../../domain/programmer";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { freshKeys, type HeldKeys } from "./heldKeys";
import { playerCell } from "./playerCell";

const DIRECTION_FOR_PROGRAM: Record<ProgramDir, Direction> = {
  up: DIRECTION.up,
  down: DIRECTION.down,
  left: DIRECTION.left,
  right: DIRECTION.right,
};

function freshPressesInOrder(prev: HeldKeys, keys: HeldKeys): ProgramDir[] {
  return freshKeys(prev, keys).sort((a, b) => (keys[a] ?? 0) - (keys[b] ?? 0));
}

function stopPlayer(world: World): void {
  for (const eid of query(world, [Player, Speed, Velocity])) {
    Speed.px[eid] = 0;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
  }
}

export function holdPlayerForProgramming(world: World): void {
  stopPlayer(world);
  for (const eid of query(world, [Player, Position, Facing, Input])) {
    const center = snapToCellCenter(Position.x[eid] ?? 0, Position.y[eid] ?? 0);
    Position.x[eid] = center.x;
    Position.y[eid] = center.y;
    Facing.direction[eid] = DIRECTION.none;
    Input.direction[eid] = DIRECTION.none;
  }
}

function applyProgrammerStep(world: World, step: ProgrammerStep): ProgrammerState | null {
  if (step.state?.phase === "recording") {
    holdPlayerForProgramming(world);
    return step.state;
  }
  if (step.heading !== null) {
    for (const eid of query(world, [Player, Input])) {
      Input.direction[eid] = DIRECTION_FOR_PROGRAM[step.heading];
    }
  }
  if (step.state === null) {
    stopPlayer(world);
  }
  return step.state;
}

export type ProgrammerKeys = { state: ProgrammerState | null; recorded: number; launched: boolean };

export function recordProgrammerKeys(
  world: World,
  state: ProgrammerState | null,
  prev: HeldKeys,
  keys: HeldKeys,
  solids: SolidGrid,
): ProgrammerKeys {
  let next = state;
  let recorded = 0;
  let launched = false;
  for (const dir of freshPressesInOrder(prev, keys)) {
    const cell = playerCell(world);
    if (next?.phase !== "recording" || cell === null) {
      break;
    }
    recorded += 1;
    const step = recordProgrammerPress(next, dir, solids, cell.col, cell.row);
    launched ||= step.state?.phase === "running";
    next = applyProgrammerStep(world, step);
  }
  return { state: next, recorded, launched };
}

export function followProgrammer(
  world: World,
  state: ProgrammerState | null,
  solids: SolidGrid,
): ProgrammerState | null {
  const cell = playerCell(world);
  if (state?.phase !== "running" || cell === null) {
    return state;
  }
  return applyProgrammerStep(world, programmerEnterCell(state, solids, cell.col, cell.row));
}

export function programmerPath(
  world: World,
  state: ProgrammerState | null,
  solids: SolidGrid,
): ProgrammerPathMark[] {
  const cell = playerCell(world);
  return state?.phase === "recording" && cell !== null
    ? programmerPathMarks(state.presses, solids, cell.col, cell.row)
    : [];
}
