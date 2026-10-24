import { query, type World } from "bitecs";
import {
  getActiveLayout,
  isWalkable,
  nearestWalkableCellCenter,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Simulacrum } from "../components/Simulacrum";
import { Velocity } from "../components/Velocity";

export function snapBodiesToNearestWalkable(world: World): void {
  const solids = getActiveLayout().playerSolids;
  const bodies = [
    ...query(world, [Player, Position, Velocity]).slice(0, 1),
    ...query(world, [Simulacrum, Position, Velocity]),
  ];
  for (const eid of bodies) {
    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    if (isWalkable(worldToCol(x), worldToRow(y), solids)) {
      continue;
    }
    const center = nearestWalkableCellCenter(x, y, solids);
    Position.x[eid] = center.x;
    Position.y[eid] = center.y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
  }
}
