import { addComponent, addEntity, createWorld, query, type World } from "bitecs";
import Phaser from "phaser";
import { advanceCountdown, COUNTDOWN_START } from "../../domain/countdown";
import { pelletCellCenters, playerSpawnCenter, wallCellCenters } from "../../domain/maze";
import {
  PELLET_DRAWABLE_ID,
  PELLET_RADIUS,
  PLAYER_DRAWABLE_ID,
  PLAYER_RADIUS,
  PLAYFIELD_WIDTH,
} from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { DIRECTION, Input } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { Wall } from "../components/Wall";
import { saveSuccessfulRun } from "../storage/runHistoryStorage";
import { collectPellets, countPellets } from "../systems/collectPellets";
import { movement } from "../systems/movement";
import { createPlayerInput } from "../systems/playerInput";
import { createRender, preloadPlayArt } from "../systems/render";

const HUD_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: "monospace",
  fontSize: "16px",
  color: "#ffffff",
};

export class PlayScene extends Phaser.Scene {
  private world!: World;
  private runPlayerInput!: (world: World) => void;
  private runRender!: (world: World) => void;
  private collectedCount = 0;
  private collectedText!: Phaser.GameObjects.Text;
  private remainingTime = COUNTDOWN_START;
  private countdownStarted = false;
  private countdownCarryMs = 0;
  private runRecorded = false;
  private timerText!: Phaser.GameObjects.Text;

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
    this.remainingTime = COUNTDOWN_START;
    this.countdownStarted = false;
    this.countdownCarryMs = 0;
    this.runRecorded = false;

    this.collectedText = this.add.text(12, 8, this.collectedLabel(), HUD_TEXT_STYLE).setDepth(10);
    this.timerText = this.add
      .text(PLAYFIELD_WIDTH - 12, 8, this.timerLabel(), HUD_TEXT_STYLE)
      .setOrigin(1, 0)
      .setDepth(10);

    this.runPlayerInput = createPlayerInput(this);
    this.runRender = createRender(this);
  }

  update(_time: number, delta: number): void {
    this.runPlayerInput(this.world);

    if (!this.countdownStarted && this.playerHasDirectionInput()) {
      this.countdownStarted = true;
    }

    movement(this.world, delta);

    if (this.countdownStarted && this.remainingTime > 0) {
      const next = advanceCountdown(this.remainingTime, this.countdownCarryMs, delta);
      this.remainingTime = next.remaining;
      this.countdownCarryMs = next.carryMs;
    }

    this.timerText.setText(this.timerLabel());

    this.collectedCount += collectPellets(this.world);
    this.collectedText.setText(this.collectedLabel());

    if (!this.runRecorded && countPellets(this.world) === 0 && this.collectedCount > 0) {
      saveSuccessfulRun(this.remainingTime);
      this.runRecorded = true;
    }

    this.runRender(this.world);
  }

  private collectedLabel(): string {
    return `Collected: ${this.collectedCount}`;
  }

  private timerLabel(): string {
    return `Time: ${this.remainingTime}`;
  }

  private playerHasDirectionInput(): boolean {
    const players = query(this.world, [Player, Input]);
    if (players.length === 0) {
      return false;
    }
    const eid = players[0]!;
    return (Input.direction[eid] ?? DIRECTION.none) !== DIRECTION.none;
  }

  private spawnWalls(): void {
    for (const cell of wallCellCenters()) {
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
