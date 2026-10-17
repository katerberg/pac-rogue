import { query, type World } from "bitecs";
import { snapToCellCenter } from "../../domain/maze";
import type { ProgramDir } from "../../domain/programmer";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { freshKeys, type HeldKeys } from "./heldKeys";

const DIRECTION_FOR_PROGRAM: Record<ProgramDir, Direction> = {
  up: DIRECTION.up,
  down: DIRECTION.down,
  left: DIRECTION.left,
  right: DIRECTION.right,
};

export function freshPressesInOrder(prev: HeldKeys, keys: HeldKeys): ProgramDir[] {
  return freshKeys(prev, keys).sort((a, b) => (keys[a] ?? 0) - (keys[b] ?? 0));
}

export function holdPlayerForProgramming(world: World): void {
  for (const eid of query(world, [Player, Position, Facing, Input])) {
    const center = snapToCellCenter(Position.x[eid] ?? 0, Position.y[eid] ?? 0);
    Position.x[eid] = center.x;
    Position.y[eid] = center.y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Facing.direction[eid] = DIRECTION.none;
    Input.direction[eid] = DIRECTION.none;
  }
}

export function steerPlayerProgram(world: World, dir: ProgramDir): void {
  for (const eid of query(world, [Player, Input])) {
    Input.direction[eid] = DIRECTION_FOR_PROGRAM[dir];
  }
}
