import { addComponent, addEntity, createWorld, query, removeEntity, type World } from "bitecs";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
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
  baseIdOf,
  enhancedIdOf,
  hasUpgrade,
  isEnhancedId,
  ownedFormOf,
  type BaseUpgradeId,
  wallPassLoopOwned,
  ghostTunnelSpeedRatio,
  pelletSurgeCount,
  speedBurstMultiplier,
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
  speedBurstActive,
  ghostHarvestActive,
  tickGhostHarvest,
  tickFreeze,
  tickInvuln,
  tickSpeedBurst,
  tickWallPass,
  wallPassActive,
  type RunUpgrades,
  type UpgradeDef,
  type UpgradeId,
  remoteTransferEvery,
} from "../../domain/upgrades";
import { remoteTransferTriggers } from "../../domain/pelletCollectExtra";
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
import { wallPassSolids } from "../systems/wallPassSolids";
import { applyRemoteTransference } from "../systems/remoteTransference";
import { collectFruit, removeAllFruit } from "../systems/collectFruit";
import { collectPellets } from "../systems/collectPellets";
import { harvestPelletsByGhosts } from "../systems/ghostHarvest";
import {
  ghostAi,
  ghostAiContext,
  resolveGhostTarget,
  type GhostAiContext,
} from "../systems/ghostAi";
import { freezeClosestGhost } from "../systems/ghostFreeze";
import { applyGhostSpeed } from "../systems/ghostSpeed";
import { applyHeldKeys, type HeldKeys } from "../systems/heldKeys";
import { movement } from "../systems/movement";
import { applyPelletToPowerConvert } from "../systems/pelletToPower";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import { snapPlayerToNearestWalkable } from "../systems/playerWallPassSnap";
import { tickWarpGlide, type WarpGlide, warpGlideSprites } from "../../domain/warpGlide";
import { warpPlayerFarthestFromGhosts } from "../systems/playerWarp";
import {
  ghostWarpGlideSprites,
  heldGhostEids,
  mergeGhostCornerWarps,
  tickGhostCornerWarps,
  type GhostCornerWarp,
} from "../../domain/ghostCornerWarp";
import { teleportGhostsToCorners } from "../systems/ghostCornerTeleport";
import {
  applyTunnelDash,
  tickTunnelDashAnimation,
  type TunnelDashAnimation,
} from "../systems/tunnelDash";
import type { SimEvent } from "./simEvents";
import { spawnBoardPellets, spawnFruit, spawnPlayer, spawnWalls } from "./spawn";

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
  private learnUpgrades: RunUpgrades = createRunUpgrades();
  private recallHoldGhostEids: number[] = [];
  private recallHoldRemainingMs = 0;
  private tunnelDashAnim: TunnelDashAnimation | null = null;
  private warpGlide: WarpGlide | null = null;
  private ghostCornerWarps: GhostCornerWarp[] = [];
  private fruitRespawnRemainingMs: number | null = null;
  private remoteTransferCounter = 0;

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

  overlayModel(): LearnOverlayModel | null {
    const eid = this.ghost;
    if (eid === null || this.selected === null) {
      return null;
    }
    const ctx = ghostAiContext(this.world);
    const target = resolveGhostTarget(eid, GHOST_AI_MODE.chase, NO_ELROY_PELLETS, ctx);
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
    if (this.warpGlide !== null) {
      this.warpGlide = tickWarpGlide(this.warpGlide, delta);
    }
    this.ghostCornerWarps = tickGhostCornerWarps(this.ghostCornerWarps, delta);
    const warping = this.warpGlide !== null;
    if (!warping) {
      applyHeldKeys(this.world, keys, { diagonalAllowed: wallPassActive(this.learnUpgrades) });
    }
    const levelSpeedMul = speedLevelMultiplier(LEARN_LEVEL);

    this.learnUpgrades = tickFreeze(this.learnUpgrades, delta);
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
      if (this.recallHoldRemainingMs === 0) {
        for (const eid of this.recallHoldGhostEids) {
          GhostPhase.value[eid] = GHOST_PHASE.active;
        }
        this.recallHoldGhostEids = [];
      }
    }

    applyPlayerSpeed(
      this.world,
      levelSpeedMul *
        playerSpeedMultiplier(this.learnUpgrades.owned) *
        (speedBurstActive(this.learnUpgrades)
          ? speedBurstMultiplier(this.learnUpgrades.owned)
          : 1) *
        (warping ? 0 : 1),
    );
    applyGhostSpeed(this.world, NO_ELROY_PELLETS, LEARN_LEVEL, {
      ghostSpeedMul: levelSpeedMul * ghostSpeedMultiplier(this.learnUpgrades.owned),
      frozenGhostEid: frozenGhostEid(this.learnUpgrades),
      heldGhostEids: heldGhostEids(this.ghostCornerWarps),
      tunnelSpeedRatio: ghostTunnelSpeedRatio(this.learnUpgrades.owned),
    });
    movement(
      this.world,
      delta,
      wallPassActive(this.learnUpgrades) ? wallPassSolids(this.learnUpgrades.owned) : undefined,
    );

    if (this.tunnelDashAnim !== null) {
      this.tunnelDashAnim = tickTunnelDashAnimation(
        this.world,
        this.tunnelDashAnim,
        delta,
        PLAYER_SPEED * TUNNEL_DASH_SPEED_MUL,
      );
    } else if (hasUpgrade(this.learnUpgrades.owned, "passiveTunnelDash")) {
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
    this.applyRemoteTransferStep(removedEids.length);
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
      if (hasUpgrade(this.learnUpgrades.owned, "fruitPowerPellet")) {
        this.resolvePowerPelletTrigger(1);
      }
    }

    ghostAi(this.world, GHOST_AI_MODE.chase, NO_ELROY_PELLETS);

    this.events.push({
      type: "draw",
      options: {
        frozenGhostEid: frozenGhostEid(this.learnUpgrades),
        playerInvulnRemainingMs: this.learnUpgrades.invulnRemainingMs,
        wallPassActive: wallPassActive(this.learnUpgrades),
        wallPassLoopActive:
          wallPassActive(this.learnUpgrades) && wallPassLoopOwned(this.learnUpgrades.owned),
        ghostHarvestActive: ghostHarvestActive(this.learnUpgrades),
        dimGhostEid: this.helperBlinky,
        playerWarpGlide: this.warpGlide === null ? undefined : warpGlideSprites(this.warpGlide),
        ghostWarpGlides: ghostWarpGlideSprites(this.ghostCornerWarps),
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
    this.learnUpgrades = {
      ...this.learnUpgrades,
      freezeRemainingMs: 0,
      frozenGhostEid: null,
      wallPassRemainingMs: 0,
      invulnRemainingMs: 0,
      speedBurstRemainingMs: 0,
      ghostHarvestRemainingMs: 0,
      defyDeathRemainingMs: 0,
    };
    this.recallHoldGhostEids = [];
    this.recallHoldRemainingMs = 0;
    this.ghostCornerWarps = [];
    return this.takeEvents();
  }

  toggleUpgrade(id: UpgradeId): SimEvent[] {
    this.events = [];
    const turningOn = !hasUpgrade(this.learnUpgrades.owned, baseIdOf(id));
    const toggled = turningOn
      ? grantUpgrade(this.learnUpgrades, id)
      : revokeUpgrade(this.learnUpgrades, id);
    this.learnUpgrades = clearStaleUpgradeTimers(toggled.owned, toggled);
    if (turningOn && baseIdOf(id) === "passivePelletToPower") {
      this.applyPelletSurge(pelletSurgeCount([id]));
    }
    return this.takeEvents();
  }

  toggleEnhanced(baseId: BaseUpgradeId): SimEvent[] {
    this.events = [];
    const current = ownedFormOf(this.learnUpgrades.owned, baseId);
    if (current === null) {
      return this.takeEvents();
    }
    const enhancing = !isEnhancedId(current);
    const nextId = enhancing ? enhancedIdOf(baseId) : baseId;
    const toggled = {
      ...this.learnUpgrades,
      owned: this.learnUpgrades.owned.map((id) => (id === current ? nextId : id)),
    };
    this.learnUpgrades = clearStaleUpgradeTimers(toggled.owned, toggled);
    if (enhancing && baseId === "passivePelletToPower") {
      this.applyPelletSurge(pelletSurgeCount([nextId]) - pelletSurgeCount([current]));
    }
    return this.takeEvents();
  }

  private applyPelletSurge(count: number): void {
    for (let converted = 0; converted < count; converted += 1) {
      const eid = applyPelletToPowerConvert(this.world, this.random.stream("pelletToPower"));
      if (eid === null) {
        return;
      }
      this.events.push({ type: "bouncePowerPellet", eid });
    }
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
    for (let recalled = 0; recalled < powerEffects.recallGhostCount; recalled += 1) {
      this.recallClosestGhost();
    }
    if (powerEffects.cornerTeleportHoldMs !== null) {
      this.ghostCornerWarps = mergeGhostCornerWarps(
        this.ghostCornerWarps,
        teleportGhostsToCorners(this.world, powerEffects.cornerTeleportHoldMs),
      );
    }
    if (powerEffects.warpPlayerFarthest) {
      this.warpGlide = warpPlayerFarthestFromGhosts(this.world);
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
    this.recallHoldGhostEids.push(eid);
    this.recallHoldRemainingMs = LEARN_RECALL_HOLD_MS;
  }

  private applyRemoteTransferStep(removedThisFrame: number): void {
    const every = remoteTransferEvery(this.learnUpgrades.owned);
    if (every === null) {
      return;
    }
    const before = this.remoteTransferCounter;
    this.remoteTransferCounter += removedThisFrame;
    const triggers = remoteTransferTriggers(before, this.remoteTransferCounter, every);
    const eids = applyRemoteTransference(this.world, triggers);
    this.releaseAll(eids);
    this.remoteTransferCounter += eids.length;
  }

  private resetPellets(): void {
    this.remoteTransferCounter = 0;
    for (const eid of query(this.world, [Pellet])) {
      this.events.push({ type: "releaseDrawable", eid });
      removeEntity(this.world, eid);
    }
    spawnBoardPellets(this.world);
  }

  private spawnFruitEntity(): void {
    this.releaseAll(removeAllFruit(this.world));
    spawnFruit(this.world);
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
    wallPassRemainingMs: hasField("wallPassMs") ? state.wallPassRemainingMs : 0,
    invulnRemainingMs:
      hasField("playerInvulnMs") || hasField("warpInvulnMs") ? state.invulnRemainingMs : 0,
    speedBurstRemainingMs: hasField("playerSpeedBurstMs") ? state.speedBurstRemainingMs : 0,
    ghostHarvestRemainingMs: hasField("ghostHarvestMs") ? state.ghostHarvestRemainingMs : 0,
    defyDeathRemainingMs: hasField("defyDeathMs") ? state.defyDeathRemainingMs : 0,
  };
}
