import { query, type World } from "bitecs";
import { playerSpeed } from "../../domain/playfield";
import { DEFAULT_TUNING, type Tuning } from "../../domain/tuning";
import { Player } from "../components/Player";
import { Speed } from "../components/Speed";

export function applyPlayerSpeed(world: World, mul: number, tuning: Tuning = DEFAULT_TUNING): void {
  for (const eid of query(world, [Player, Speed])) {
    Speed.px[eid] = playerSpeed(tuning) * mul;
  }
}
