import { addComponent, addEntity, createWorld, type World } from "bitecs";
import Phaser from "phaser";
import {
  createPelletProgress,
  applyPelletCollect,
  type PelletProgress,
} from "../../domain/pelletProgress";
import { createRunClock, tickRunClock, type RunClock } from "../../domain/runClock";
import { pelletCellCenters, playerSpawnCenter, wallCellCenters } from "../../domain/maze";
import {
  PELLET_DRAWABLE_ID,
  PELLET_RADIUS,
  PLAYER_DRAWABLE_ID,
  PLAYER_RADIUS,
  PLAYFIELD_WIDTH,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { DIRECTION, Input } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { Wall } from "../components/Wall";
import {
  playPelletCollectSfx,
  playSfx,
  preloadSfx,
  startLoopingSfx,
  stopLoopingSfx,
} from "../audio/sfx";
import { saveSuccessfulRun } from "../storage/runHistoryStorage";
import { collectPellets, countPellets } from "../systems/collectPellets";
import { movement } from "../systems/movement";
import { hasPlayerDirectionInput } from "../systems/playerDirection";
import { createPlayerInput } from "../systems/playerInput";
import { createRender, preloadPlayArt } from "../systems/render";
import { bindDisplayTextResolution } from "./textResolution";
import { hudTextStyle } from "../ui/textStyles";

export class PlayScene extends Phaser.Scene {
  private world!: World;
  private runPlayerInput!: (world: World) => void;
  private runRender!: (world: World) => void;
  private clock: RunClock = createRunClock();
  private pelletProgress: PelletProgress = createPelletProgress(0);
  private collectedText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  constructor() {
    super("PlayScene");
  }

  preload(): void {
    preloadPlayArt(this);
    preloadSfx(this);
  }

  create(): void {
    this.world = createWorld();
    this.spawnWalls();
    this.spawnPellets();
    this.spawnPlayer();

    this.clock = createRunClock();
    this.pelletProgress = createPelletProgress(countPellets(this.world));

    this.collectedText = this.add.text(12, 8, this.collectedLabel(), hudTextStyle).setDepth(10);
    this.timerText = this.add
      .text(PLAYFIELD_WIDTH - 12, 8, this.timerLabel(), hudTextStyle)
      .setOrigin(1, 0)
      .setDepth(10);
    bindDisplayTextResolution(this, () => [this.collectedText, this.timerText]);

    this.runPlayerInput = createPlayerInput(this);
    this.runRender = createRender(this);

    startLoopingSfx(this, "siren");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopLoopingSfx(this, "siren");
    });
  }

  update(_time: number, delta: number): void {
    this.runPlayerInput(this.world);
    movement(this.world, delta);

    this.clock = tickRunClock(this.clock, hasPlayerDirectionInput(this.world), delta);
    this.timerText.setText(this.timerLabel());

    const { removed, powerRemoved } = collectPellets(this.world);
    if (removed > 0) {
      playPelletCollectSfx(this, this.pelletProgress.collectedCount, removed, powerRemoved);
    }
    const collectResult = applyPelletCollect(this.pelletProgress, removed);
    this.pelletProgress = collectResult.progress;
    this.collectedText.setText(this.collectedLabel());

    if (collectResult.shouldRecordClear) {
      stopLoopingSfx(this, "siren");
      playSfx(this, "levelComplete");
      saveSuccessfulRun(this.clock.remaining);
    }

    this.runRender(this.world);
  }

  private collectedLabel(): string {
    return `Collected: ${this.pelletProgress.collectedCount}`;
  }

  private timerLabel(): string {
    return `Time: ${this.clock.remaining}`;
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
      Drawable.id[eid] = cell.kind === "power" ? POWER_PELLET_DRAWABLE_ID : PELLET_DRAWABLE_ID;
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
