import { query, type World } from "bitecs";
import { PLAYER_SPEED, speedTileScale } from "../../domain/playfield";
import { Player } from "../components/Player";
import { Speed } from "../components/Speed";

export function applyPlayerSpeed(world: World, mul: number): void {
  for (const eid of query(world, [Player, Speed])) {
    Speed.px[eid] = PLAYER_SPEED * mul * speedTileScale();
  }
}
