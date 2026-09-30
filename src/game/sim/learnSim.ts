import { addComponent, addEntity, createWorld, query, removeEntity, type World } from "bitecs";
import {
  OUTLINE_TINT_BY_CORRUPTION,
  SPEED_SURGE_MUL,
  corruptionAiOption,
  createRunCorruption,
  isSpeedSurgeActive,
  resetCorruptionTransient,
  tickSpeedSurge,
  type CorruptionId,
  type RunCorruption,
} from "../../domain/corruption";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_AI_MODE, type GhostAiMode } from "../../domain/ghostMode";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { pickClosestGhostEid } from "../../domain/ghostRecall";
import type { GhostDir } from "../../domain/ghostPath";
import type { GhostTarget } from "../../domain/ghostTarget";
import { speedLevelMultiplier } from "../../domain/levelRules";
import {
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
} from "../../domain/maze";
import { GHOST_DRAWABLE_BY_KIND, ghostRadius, PLAYER_SPEED } from "../../domain/playfield";
import { createRunRandom, type RunRandom } from "../../domain/runRandom";
import {
  PLAYER_SPEED_BURST_MUL,
  TUNNEL_DASH_SPEED_MUL,
  applyPowerPelletEffects,
  createRunUpgrades,
  frozenGhostEid,
  getUpgradeDef,
  ghostSpeedMultiplier,
  grantUpgrade,
  pelletCollectRadiusBonusPx,
  playerSpeedMultiplier,
  revokeUpgrade,
  scatterBurstActive,
  speedBurstActive,
  ghostHarvestActive,
  tickGhostHarvest,
  tickFreeze,
  tickInvuln,
  tickScatterBurst,
  tickSpeedBurst,
  tickWallPass,
  wallPassActive,
  type RunUpgrades,
  type UpgradeDef,
  type UpgradeId,
} from "../../domain/upgrades";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { collectExtraPellets } from "../systems/collectExtraPellets";
import { collectFruit, removeAllFruit } from "../systems/collectFruit";
import { collectPellets } from "../systems/collectPellets";
import { harvestPelletsByGhosts } from "../systems/ghostHarvest";
import { findGhostEidByKind } from "../systems/corruptionGhost";
import { stepCorruption } from "../systems/corruptionStep";
import {
  ghostAi,
  ghostAiContext,
  resolveGhostTarget,
  type GhostAiContext,
} from "../systems/ghostAi";
import { freezeClosestGhost } from "../systems/ghostFreeze";
import { forceGhostReverse } from "../systems/ghostReverse";
import { applyGhostSpeed } from "../systems/ghostSpeed";
import { applyHeldKeys, type HeldKeys } from "../systems/heldKeys";
import { movement } from "../systems/movement";
import { applyPelletToPowerConvert } from "../systems/pelletToPower";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import { snapPlayerToNearestWalkable } from "../systems/playerWallPassSnap";
import { warpPlayerToTopCenter } from "../systems/playerWarp";
import {
  applyTunnelDash,
  tickTunnelDashAnimation,
  type TunnelDashAnimation,
} from "../systems/tunnelDash";
import type { SimEvent } from "./simEvents";
import { spawnBoardPellets, spawnFruit, spawnPellet, spawnPlayer, spawnWalls } from "./spawn";

export type LearnOverlayModel = {
  kind: GhostKindId;
  target: GhostTarget;
  playerTile: GhostAiContext["player"];
  blinkyTile: GhostAiContext["blinky"];
  playerPx: { x: number; y: number } | null;
  blinkyPx: { x: number; y: number } | null;
  ghostPx: { x: number; y: number };
  ghostFacing: GhostDir;
};

export const NO_ELROY_PELLETS = Number.MAX_SAFE_INTEGER;
const LEARN_LEVEL = 1;
const LEARN_RECALL_HOLD_MS = 1500;
const FRUIT_RESPAWN_MS = 1000;

export class LearnSim {
  world: World = createWorld();
  readonly random: RunRandom;
  private events: SimEvent[] = [];
  private selected: GhostKindId | null = null;
  private ghost: number | null = null;
  private helperBlinky: number | null = null;
  private hiddenGhost: number | null = null;
  private flashGhost: number | null = null;
  private runCorruption: RunCorruption = createRunCorruption({ type: null, ghostKind: null });
  private learnUpgrades: RunUpgrades = createRunUpgrades();
  private recallHoldGhostEid: number | null = null;
  private recallHoldRemainingMs = 0;
  private tunnelDashAnim: TunnelDashAnimation | null = null;
  private previousEffectiveGhostMode: GhostAiMode = GHOST_AI_MODE.chase;
  private fruitRespawnRemainingMs: number | null = null;

  constructor(seed: string) {
    this.random = createRunRandom(seed);
  }

  get selectedKind(): GhostKindId | null {
    return this.selected;
  }

  get ghostEid(): number | null {
    return this.ghost;
  }

  get helperBlinkyEid(): number | null {
    return this.helperBlinky;
  }

  get hiddenGhostEid(): number | null {
    return this.hiddenGhost;
  }

  get corruption(): RunCorruption {
    return this.runCorruption;
  }

  overlayModel(): LearnOverlayModel | null {
    const eid = this.ghost;
    if (eid === null || this.selected === null || eid === this.hiddenGhost) {
      return null;
    }
    const ctx = ghostAiContext(this.world);
    const target = resolveGhostTarget(eid, GHOST_AI_MODE.chase, NO_ELROY_PELLETS, ctx, {
      corruption: corruptionAiOption(this.runCorruption),
    });
    const playerEid = query(this.world, [Player, Position])[0];
    const helper = this.helperBlinky;
    return {
      kind: this.selected,
      target,
      playerTile: ctx.player,
      blinkyTile: ctx.blinky,
      playerPx:
        playerEid === undefined
          ? null
          : { x: Position.x[playerEid] ?? 0, y: Position.y[playerEid] ?? 0 },
      blinkyPx: helper === null ? null : { x: Position.x[helper] ?? 0, y: Position.y[helper] ?? 0 },
      ghostPx: { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 },
      ghostFacing: (Facing.direction[eid] ?? DIRECTION.none) as GhostDir,
    };
  }

  get ownedUpgrades(): readonly UpgradeId[] {
    return this.learnUpgrades.owned;
  }

  start(): SimEvent[] {
    this.events = [];
    activateLayout("mazeSmall");
    spawnWalls(this.world);
    spawnPlayer(this.world);
    this.resetPellets();
    this.spawnFruitEntity();
    return this.takeEvents();
  }

  step(keys: HeldKeys, delta: number): SimEvent[] {
    this.events = [];
    applyHeldKeys(this.world, keys, { diagonalAllowed: wallPassActive(this.learnUpgrades) });
    const levelSpeedMul = speedLevelMultiplier(LEARN_LEVEL);
    this.runCorruption = tickSpeedSurge(this.runCorruption, delta);

    this.learnUpgrades = tickFreeze(this.learnUpgrades, delta);
    this.learnUpgrades = tickScatterBurst(this.learnUpgrades, delta);
    const wasWallPass = wallPassActive(this.learnUpgrades);
    this.learnUpgrades = tickWallPass(this.learnUpgrades, delta);
    if (wasWallPass && !wallPassActive(this.learnUpgrades)) {
      snapPlayerToNearestWalkable(this.world);
    }
    this.learnUpgrades = tickInvuln(this.learnUpgrades, delta);
    this.learnUpgrades = tickSpeedBurst(this.learnUpgrades, delta);
    this.learnUpgrades = tickGhostHarvest(this.learnUpgrades, delta);

    if (this.recallHoldRemainingMs > 0) {
      this.recallHoldRemainingMs = Math.max(0, this.recallHoldRemainingMs - delta);
      if (this.recallHoldRemainingMs === 0 && this.recallHoldGhostEid !== null) {
        GhostPhase.value[this.recallHoldGhostEid] = GHOST_PHASE.active;
        this.recallHoldGhostEid = null;
      }
    }

    applyPlayerSpeed(
      this.world,
      levelSpeedMul *
        playerSpeedMultiplier(this.learnUpgrades.owned) *
        (speedBurstActive(this.learnUpgrades) ? PLAYER_SPEED_BURST_MUL : 1),
    );
    applyGhostSpeed(this.world, NO_ELROY_PELLETS, LEARN_LEVEL, {
      ghostSpeedMul: levelSpeedMul * ghostSpeedMultiplier(this.learnUpgrades.owned),
      frozenGhostEid: frozenGhostEid(this.learnUpgrades),
      speedSurge:
        this.runCorruption.ghostKind !== null && isSpeedSurgeActive(this.runCorruption)
          ? { ghostKind: this.runCorruption.ghostKind, mul: SPEED_SURGE_MUL }
          : undefined,
    });
    movement(
      this.world,
      delta,
      wallPassActive(this.learnUpgrades) ? getActiveLayout().wallPassPlayerSolids : undefined,
    );

    if (this.tunnelDashAnim !== null) {
      this.tunnelDashAnim = tickTunnelDashAnimation(
        this.world,
        this.tunnelDashAnim,
        delta,
        PLAYER_SPEED * TUNNEL_DASH_SPEED_MUL,
      );
    } else if (this.learnUpgrades.owned.includes("passiveTunnelDash")) {
      const dash = applyTunnelDash(this.world);
      if (dash !== null) {
        if (dash.sweptPelletEids.length > 0) {
          this.releaseAll(dash.sweptPelletEids);
          if (dash.sweptPowerRemoved > 0) {
            this.resolvePowerPelletTrigger(dash.sweptPowerRemoved);
          }
        }
        this.tunnelDashAnim = { targetX: dash.animateToX, wrapToX: dash.wrapToX, y: dash.y };
      }
    }

    const pelletsOnBoard = query(this.world, [Pellet]).length;
    const corruptionStep = stepCorruption(
      this.world,
      this.runCorruption,
      delta,
      Math.max(1, pelletsOnBoard),
    );
    this.runCorruption = corruptionStep.corruption;
    this.hiddenGhost = corruptionStep.hiddenGhostEid;
    this.flashGhost = corruptionStep.flashGhostEid;
    this.spawnDroppedPellets(corruptionStep.dropSpawnTiles);

    const playerFrame = collectPellets(this.world, {
      radiusBonusPx: pelletCollectRadiusBonusPx(this.learnUpgrades.owned),
      solids: getActiveLayout().playerSolids,
    });
    const ghostFrame = ghostHarvestActive(this.learnUpgrades)
      ? harvestPelletsByGhosts(this.world)
      : { powerRemoved: 0, removedEids: [] };
    const removedEids = [...playerFrame.removedEids, ...ghostFrame.removedEids];
    const powerRemoved = playerFrame.powerRemoved + ghostFrame.powerRemoved;
    this.releaseAll(removedEids);
    if (powerRemoved > 0) {
      this.resolvePowerPelletTrigger(powerRemoved);
    }
    if (query(this.world, [Pellet]).length === 0) {
      spawnBoardPellets(this.world);
    }

    if (this.fruitRespawnRemainingMs !== null) {
      this.fruitRespawnRemainingMs -= delta;
      if (this.fruitRespawnRemainingMs <= 0) {
        this.fruitRespawnRemainingMs = null;
        this.spawnFruitEntity();
      }
    }

    const removedFruitEids = collectFruit(this.world);
    if (removedFruitEids.length > 0) {
      this.releaseAll(removedFruitEids);
      this.fruitRespawnRemainingMs = FRUIT_RESPAWN_MS;
      if (this.learnUpgrades.owned.includes("fruitPowerPellet")) {
        this.resolvePowerPelletTrigger(1);
      }
    }

    const effectiveMode = scatterBurstActive(this.learnUpgrades)
      ? GHOST_AI_MODE.scatter
      : GHOST_AI_MODE.chase;
    if (effectiveMode !== this.previousEffectiveGhostMode) {
      forceGhostReverse(this.world, this.runCorruption);
    } else {
      ghostAi(this.world, effectiveMode, NO_ELROY_PELLETS, {
        corruption: corruptionAiOption(this.runCorruption),
      });
    }
    this.previousEffectiveGhostMode = effectiveMode;

    const type = this.runCorruption.type;
    this.events.push({
      type: "draw",
      options: {
        frozenGhostEid: frozenGhostEid(this.learnUpgrades),
        playerInvulnRemainingMs: this.learnUpgrades.invulnRemainingMs,
        wallPassActive: wallPassActive(this.learnUpgrades),
        ghostHarvestActive: ghostHarvestActive(this.learnUpgrades),
        corruptedGhostEid:
          type !== null ? findGhostEidByKind(this.world, this.runCorruption.ghostKind) : null,
        corruptedTint: type !== null ? OUTLINE_TINT_BY_CORRUPTION[type] : undefined,
        flashGhostEid: this.flashGhost,
        hiddenGhostEid: this.hiddenGhost,
        dimGhostEid: this.helperBlinky,
        slimeTrailTiles: this.runCorruption.trail,
      },
    });
    return this.takeEvents();
  }

  selectGhost(kind: GhostKindId): SimEvent[] {
    this.events = [];
    for (const eid of [this.ghost, this.helperBlinky]) {
      if (eid !== null) {
        this.events.push({ type: "releaseDrawable", eid });
        removeEntity(this.world, eid);
      }
    }
    this.resetPellets();

    const exit = getActiveLayout().ghostHouseExit;
    this.selected = kind;
    this.ghost = this.spawnActiveGhost(kind, exit);
    this.helperBlinky = null;
    if (kind === GHOST_KIND.inky) {
      const beside = { col: exit.col + 1, row: exit.row };
      this.helperBlinky = this.spawnActiveGhost(
        GHOST_KIND.blinky,
        isWalkable(beside.col, beside.row) ? beside : exit,
        DIRECTION.right,
      );
    }
    this.runCorruption = resetCorruptionTransient({ ...this.runCorruption, ghostKind: kind });
    this.hiddenGhost = null;
    this.flashGhost = null;
    this.learnUpgrades = {
      ...this.learnUpgrades,
      freezeRemainingMs: 0,
      frozenGhostEid: null,
      scatterBurstRemainingMs: 0,
      wallPassRemainingMs: 0,
      invulnRemainingMs: 0,
      speedBurstRemainingMs: 0,
      ghostHarvestRemainingMs: 0,
      defyDeathRemainingMs: 0,
    };
    this.recallHoldGhostEid = null;
    this.recallHoldRemainingMs = 0;
    return this.takeEvents();
  }

  toggleCorruption(id: CorruptionId): SimEvent[] {
    this.events = [];
    const type = this.runCorruption.type === id ? null : id;
    this.runCorruption = resetCorruptionTransient({
      ...this.runCorruption,
      type,
      ghostKind: this.selected,
    });
    this.hiddenGhost = null;
    this.flashGhost = null;
    this.resetPellets();
    return this.takeEvents();
  }

  toggleUpgrade(id: UpgradeId): SimEvent[] {
    this.events = [];
    const turningOn = !this.learnUpgrades.owned.includes(id);
    const toggled = turningOn
      ? grantUpgrade(this.learnUpgrades, id)
      : revokeUpgrade(this.learnUpgrades, id);
    this.learnUpgrades = clearStaleUpgradeTimers(toggled.owned, toggled);
    if (turningOn && id === "passivePelletToPower") {
      const eid = applyPelletToPowerConvert(this.world, this.random.stream("pelletToPower"));
      if (eid !== null) {
        this.events.push({ type: "bouncePowerPellet", eid });
      }
    }
    return this.takeEvents();
  }

  private takeEvents(): SimEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  private releaseAll(eids: readonly number[]): void {
    for (const eid of eids) {
      this.events.push({ type: "releaseDrawable", eid });
    }
  }

  private resolvePowerPelletTrigger(powerRemoved: number): void {
    const powerEffects = applyPowerPelletEffects(this.learnUpgrades, powerRemoved);
    this.learnUpgrades = powerEffects.state;
    if (powerEffects.freezeClosestMs !== null) {
      this.learnUpgrades = freezeClosestGhost(
        this.world,
        this.learnUpgrades,
        powerEffects.freezeClosestMs,
      );
    }
    if (powerEffects.collectExtraPellets > 0) {
      this.releaseAll(
        collectExtraPellets(
          this.world,
          powerEffects.collectExtraPellets,
          getActiveLayout().playerSolids,
        ),
      );
    }
    if (powerEffects.recallClosestGhost) {
      this.recallClosestGhost();
    }
    if (powerEffects.warpPlayerTopCenter) {
      warpPlayerToTopCenter(this.world);
    }
  }

  private recallClosestGhost(): void {
    const playerEid = query(this.world, [Player, Position])[0];
    if (playerEid === undefined) {
      return;
    }
    const fromX = Position.x[playerEid] ?? 0;
    const fromY = Position.y[playerEid] ?? 0;
    const candidates = [];
    for (const candidateEid of query(this.world, [Ghost, GhostPhase, Position])) {
      candidates.push({
        eid: candidateEid,
        x: Position.x[candidateEid] ?? 0,
        y: Position.y[candidateEid] ?? 0,
        phase: (GhostPhase.value[candidateEid] ?? GHOST_PHASE.inHouse) as GhostPhaseValue,
      });
    }
    const eid = pickClosestGhostEid(candidates, fromX, fromY);
    if (eid === null) {
      return;
    }
    const exit = getActiveLayout().ghostHouseExit;
    Position.x[eid] = cellCenterX(exit.col);
    Position.y[eid] = cellCenterY(exit.row);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Speed.px[eid] = 0;
    GhostPhase.value[eid] = GHOST_PHASE.inHouse;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
    this.recallHoldGhostEid = eid;
    this.recallHoldRemainingMs = LEARN_RECALL_HOLD_MS;
  }

  private resetPellets(): void {
    for (const eid of query(this.world, [Pellet])) {
      this.events.push({ type: "releaseDrawable", eid });
      removeEntity(this.world, eid);
    }
    spawnBoardPellets(this.world);
  }

  private isPelletCellOccupied(x: number, y: number): boolean {
    return query(this.world, [Pellet, Position]).some(
      (eid) => Position.x[eid] === x && Position.y[eid] === y,
    );
  }

  private spawnFruitEntity(): void {
    this.releaseAll(removeAllFruit(this.world));
    spawnFruit(this.world);
  }

  private spawnDroppedPellets(tiles: readonly GhostTarget[]): void {
    const { playerSolids } = getActiveLayout();
    for (const tile of tiles) {
      if (!isWalkable(tile.col, tile.row, playerSolids)) {
        continue;
      }
      const x = cellCenterX(tile.col);
      const y = cellCenterY(tile.row);
      if (this.isPelletCellOccupied(x, y)) {
        continue;
      }
      spawnPellet(this.world, x, y, "dot");
    }
  }

  private spawnActiveGhost(
    kind: GhostKindId,
    tile: GhostTarget,
    facing: Direction = DIRECTION.left,
  ): number {
    const eid = addEntity(this.world);
    addComponent(this.world, eid, Position);
    addComponent(this.world, eid, Velocity);
    addComponent(this.world, eid, Input);
    addComponent(this.world, eid, Facing);
    addComponent(this.world, eid, Speed);
    addComponent(this.world, eid, Ghost);
    addComponent(this.world, eid, GhostKind);
    addComponent(this.world, eid, GhostPhase);
    addComponent(this.world, eid, Drawable);

    Position.x[eid] = cellCenterX(tile.col);
    Position.y[eid] = cellCenterY(tile.row);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Input.direction[eid] = facing;
    Facing.direction[eid] = facing;
    Speed.px[eid] = 0;
    GhostKind.kind[eid] = kind;
    GhostPhase.value[eid] = GHOST_PHASE.active;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
    Drawable.id[eid] = GHOST_DRAWABLE_BY_KIND[kind];
    Drawable.radius[eid] = ghostRadius();
    return eid;
  }
}

function clearStaleUpgradeTimers(owned: readonly UpgradeId[], state: RunUpgrades): RunUpgrades {
  const hasField = (key: keyof NonNullable<UpgradeDef["onPowerPellet"]>): boolean =>
    owned.some((id) => getUpgradeDef(id).onPowerPellet?.[key] !== undefined);
  return {
    ...state,
    freezeRemainingMs: hasField("freezeClosestGhostMs") ? state.freezeRemainingMs : 0,
    frozenGhostEid: hasField("freezeClosestGhostMs") ? state.frozenGhostEid : null,
    scatterBurstRemainingMs: hasField("scatterBurstMs") ? state.scatterBurstRemainingMs : 0,
    wallPassRemainingMs: hasField("wallPassMs") ? state.wallPassRemainingMs : 0,
    invulnRemainingMs: hasField("playerInvulnMs") ? state.invulnRemainingMs : 0,
    speedBurstRemainingMs: hasField("playerSpeedBurstMs") ? state.speedBurstRemainingMs : 0,
    ghostHarvestRemainingMs: hasField("ghostHarvestMs") ? state.ghostHarvestRemainingMs : 0,
    defyDeathRemainingMs: hasField("defyDeathMs") ? state.defyDeathRemainingMs : 0,
  };
}
