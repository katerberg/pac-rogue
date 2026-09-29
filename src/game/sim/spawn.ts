import { addComponent, addEntity, type World } from "bitecs";
import { fruitSpawnCenter } from "../../domain/fruit";
import {
  pelletCellCenters,
  playerSpawnCenter,
  wallCellCenters,
  type PelletKind,
} from "../../domain/maze";
import {
  FRUIT_DRAWABLE_ID,
  FRUIT_RADIUS,
  PELLET_DRAWABLE_ID,
  PELLET_RADIUS,
  PLAYER_DRAWABLE_ID,
  playerRadius,
  PLAYER_SPEED,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Fruit } from "../components/Fruit";
import { DIRECTION, Input } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { Wall } from "../components/Wall";

export function spawnWalls(world: World): void {
  for (const cell of wallCellCenters()) {
    const eid = addEntity(world);
    addComponent(world, eid, Wall);
    addComponent(world, eid, Position);
    Position.x[eid] = cell.x;
    Position.y[eid] = cell.y;
  }
}

export function spawnPellet(world: World, x: number, y: number, kind: PelletKind): number {
  const eid = addEntity(world);
  addComponent(world, eid, Pellet);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  if (kind === "power") {
    addComponent(world, eid, PowerPellet);
  }
  Position.x[eid] = x;
  Position.y[eid] = y;
  Drawable.id[eid] = kind === "power" ? POWER_PELLET_DRAWABLE_ID : PELLET_DRAWABLE_ID;
  Drawable.radius[eid] = PELLET_RADIUS;
  return eid;
}

export function spawnBoardPellets(world: World): void {
  for (const cell of pelletCellCenters()) {
    spawnPellet(world, cell.x, cell.y, cell.kind);
  }
}

export function spawnPlayer(world: World): void {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Input);
  addComponent(world, eid, Facing);
  addComponent(world, eid, Speed);
  addComponent(world, eid, Player);
  addComponent(world, eid, Drawable);

  const spawn = playerSpawnCenter();
  Position.x[eid] = spawn.x;
  Position.y[eid] = spawn.y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Input.direction[eid] = DIRECTION.none;
  Facing.direction[eid] = DIRECTION.none;
  Speed.px[eid] = PLAYER_SPEED;
  Drawable.id[eid] = PLAYER_DRAWABLE_ID;
  Drawable.radius[eid] = playerRadius();
}

export function spawnFruit(world: World): void {
  const eid = addEntity(world);
  addComponent(world, eid, Fruit);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  const spawn = fruitSpawnCenter();
  Position.x[eid] = spawn.x;
  Position.y[eid] = spawn.y;
  Drawable.id[eid] = FRUIT_DRAWABLE_ID;
  Drawable.radius[eid] = FRUIT_RADIUS;
}
