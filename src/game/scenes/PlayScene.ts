import { addComponent, addEntity, createWorld, type World } from "bitecs";
import Phaser from "phaser";
import {
  PLAYER_COLOR,
  PLAYER_DRAWABLE_ID,
  PLAYER_RADIUS,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
} from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
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

    const eid = addEntity(this.world);
    addComponent(this.world, eid, Position);
    addComponent(this.world, eid, Velocity);
    addComponent(this.world, eid, Input);
    addComponent(this.world, eid, Player);
    addComponent(this.world, eid, Drawable);

    Position.x[eid] = PLAYFIELD_WIDTH / 2;
    Position.y[eid] = PLAYFIELD_HEIGHT / 2;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Input.direction[eid] = DIRECTION.none;
    Drawable.id[eid] = PLAYER_DRAWABLE_ID;
    Drawable.color[eid] = PLAYER_COLOR;
    Drawable.radius[eid] = PLAYER_RADIUS;

    this.runPlayerInput = createPlayerInput(this);
    this.runRender = createRender(this);
  }

  update(_time: number, delta: number): void {
    this.runPlayerInput(this.world);
    movement(this.world, delta);
    this.runRender(this.world);
  }
}
