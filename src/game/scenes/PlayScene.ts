import { addComponent, addEntity, createWorld, type World } from "bitecs";
import Phaser from "phaser";
import { PLAYER_COLOR, PLAYER_DRAWABLE_ID, PLAYER_RADIUS } from "../../domain/playfield";
import { playerSpawnCenter, solidCellCenters } from "../../domain/maze";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { Wall } from "../components/Wall";
import { movement } from "../systems/movement";
import { createPlayerInput } from "../systems/playerInput";
import { createRender } from "../systems/render";

/**
 * Wires the ECS world and runs the system pipeline.
 * Movement rules live in systems — this scene only spawns and ticks.
 */
export class PlayScene extends Phaser.Scene {
  private world!: World;
  private runPlayerInput!: (world: World) => void;
  private runRender!: (world: World) => void;

  constructor() {
    super("PlayScene");
  }

  create(): void {
    this.world = createWorld();
    this.spawnWalls();
    this.spawnPlayer();

    this.runPlayerInput = createPlayerInput(this);
    this.runRender = createRender(this);
  }

  update(_time: number, delta: number): void {
    this.runPlayerInput(this.world);
    movement(this.world, delta);
    this.runRender(this.world);
  }

  private spawnWalls(): void {
    for (const cell of solidCellCenters()) {
      const eid = addEntity(this.world);
      addComponent(this.world, eid, Wall);
      addComponent(this.world, eid, Position);
      Position.x[eid] = cell.x;
      Position.y[eid] = cell.y;
    }
  }

  private spawnPlayer(): void {
    const eid = addEntity(this.world);
    addComponent(this.world, eid, Position);
    addComponent(this.world, eid, Velocity);
    addComponent(this.world, eid, Input);
    addComponent(this.world, eid, Facing);
    addComponent(this.world, eid, Player);
    addComponent(this.world, eid, Drawable);

    const spawn = playerSpawnCenter();
    Position.x[eid] = spawn.x;
    Position.y[eid] = spawn.y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Input.direction[eid] = DIRECTION.none;
    Facing.direction[eid] = DIRECTION.none;
    Drawable.id[eid] = PLAYER_DRAWABLE_ID;
    Drawable.color[eid] = PLAYER_COLOR;
    Drawable.radius[eid] = PLAYER_RADIUS;
  }
}
