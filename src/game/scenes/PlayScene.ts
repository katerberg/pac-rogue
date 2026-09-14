import { addComponent, addEntity, createWorld, type World } from "bitecs";
import Phaser from "phaser";
import { pelletCellCenters, playerSpawnCenter, solidCellCenters } from "../../domain/maze";
import {
  PELLET_DRAWABLE_ID,
  PELLET_RADIUS,
  PLAYER_DRAWABLE_ID,
  PLAYER_RADIUS,
} from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { DIRECTION, Input } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { Wall } from "../components/Wall";
import { collectPellets } from "../systems/collectPellets";
import { movement } from "../systems/movement";
import { createPlayerInput } from "../systems/playerInput";
import { createRender, preloadPlayArt } from "../systems/render";

export class PlayScene extends Phaser.Scene {
  private world!: World;
  private runPlayerInput!: (world: World) => void;
  private runRender!: (world: World) => void;
  private collectedCount = 0;
  private collectedText!: Phaser.GameObjects.Text;

  constructor() {
    super("PlayScene");
  }

  preload(): void {
    preloadPlayArt(this);
  }

  create(): void {
    this.world = createWorld();
    this.spawnWalls();
    this.spawnPellets();
    this.spawnPlayer();

    this.collectedCount = 0;
    this.collectedText = this.add
      .text(12, 8, this.collectedLabel(), {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setDepth(10);

    this.runPlayerInput = createPlayerInput(this);
    this.runRender = createRender(this);
  }

  update(_time: number, delta: number): void {
    this.runPlayerInput(this.world);
    movement(this.world, delta);
    this.collectedCount += collectPellets(this.world);
    this.collectedText.setText(this.collectedLabel());
    this.runRender(this.world);
  }

  private collectedLabel(): string {
    return `Collected: ${this.collectedCount}`;
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

  private spawnPellets(): void {
    for (const cell of pelletCellCenters()) {
      const eid = addEntity(this.world);
      addComponent(this.world, eid, Pellet);
      addComponent(this.world, eid, Position);
      addComponent(this.world, eid, Drawable);
      Position.x[eid] = cell.x;
      Position.y[eid] = cell.y;
      Drawable.id[eid] = PELLET_DRAWABLE_ID;
      Drawable.radius[eid] = PELLET_RADIUS;
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
    Drawable.radius[eid] = PLAYER_RADIUS;
  }
}
