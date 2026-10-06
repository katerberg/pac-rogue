import { addComponent, addEntity, createWorld, query, removeEntity, type World } from "bitecs";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import {
  BONUS_BAR_MAX,
  FRUIT_BONUS_CHARGE,
  applyStreakPellets,
  createBonusBar,
  tickStreakIdle,
  type BonusBar,
  type Cell,
} from "../../domain/bonusBar";
import { streakEngineFires, streakPops } from "../../domain/streakEngine";
import { tickEchoes } from "../../domain/echo";
import {
  createFruitPresence,
  extendFruitLifetime,
  markFruitCollected,
  tickFruitPresence,
  type FruitPresence,
} from "../../domain/fruit";
import { pickClosestGhostEid } from "../../domain/ghostRecall";
import type { GhostDir } from "../../domain/ghostPath";
import type { GhostTarget } from "../../domain/ghostTarget";
import { speedLevelMultiplier } from "../../domain/levelRules";
import {
  BASE_FRUIT_SPAWN_THRESHOLDS,
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  pelletCellCenters,
} from "../../domain/maze";
import { playerExitedTunnel } from "../../domain/tunnelExit";
import { GHOST_DRAWABLE_BY_KIND, ghostRadius, PLAYER_SPEED } from "../../domain/playfield";
import { createRunRandom, type RunRandom } from "../../domain/runRandom";
import {
  baseIdOf,
  cellSpeedMultiplier,
  enhancedIdOf,
  deathsHarvestRadiusTiles,
  defyDeathActive,
  fruitFeastThresholds,
  fruitLifetimeMultiplier,
  fruitPersistsUntilLevelEnd,
  fruitQuartersPerFruit,
  grantLivesForUpgrade,
  hasUpgrade,
  isEnhancedId,
  nearMissCharge,
  playerIsInvulnerable,
  playerTintRemainingMs,
  queuePowerPelletRespawns,
  secondChompMs,
  tickDefyDeath,
  tickPowerPelletRespawns,
  type PendingPowerPelletRespawn,
  ownedFormOf,
  type BaseUpgradeId,
  wallPassLoopOwned,
  ghostTunnelSpeedRatio,
  ghostsBlockedFromTunnels,
  applyTunnelExitInvuln,
  pelletSurgeCount,
  lazyLooperRings,
  speedBurstMultiplier,
  TUNNEL_DASH_SPEED_MUL,
  applyPowerPelletEffects,
  applyShieldBreakInvuln,
  applyStreakEngineInvuln,
  streakEngineEvery,
  streakEngineInvulnMs,
  bankShields,
  shieldPelletsCap,
  spendShield,
  createRunUpgrades,
  clearUpgradeTimers,
  echoEffects,
  queueEcho,
  armHaunt,
  hauntedGhost,
  hauntedGhostEid,
  tickHaunt,
  HAUNTING_MS,
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
import { PowerPellet } from "../components/PowerPellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { collectExtraPellets } from "../systems/collectExtraPellets";
import { wallPassSolids } from "../systems/wallPassSolids";
import { applyRemoteTransference } from "../systems/remoteTransference";
import { anyKeyHeld } from "../systems/heldKeys";
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
import { NO_KEYS_HELD, applyHeldKeys, type HeldKeys, type TurnTap } from "../systems/heldKeys";
import { LearnHouseHold } from "./learnHouseHold";
import { LearnRunState } from "./learnRunState";
import { playerFacing, playerPose } from "../systems/playerDirection";
import { catchPlayer, type CatchOptions } from "../systems/catchPlayer";
import { stepNearMisses } from "../systems/nearMiss";
import { createNearMissPasses, type NearMissPasses } from "../../domain/nearMiss";
import { harvestNearbyPellets } from "../systems/deathsHarvest";
import { TurnTuningState, type TurnSparksBurst } from "../systems/turnTuningState";
import { movement } from "../systems/movement";
import { applyPelletToPowerConvert } from "../systems/pelletToPower";
import { enteringEmptyCell } from "../systems/enteringEmptyCell";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import { snapPlayerToNearestWalkable } from "../systems/playerWallPassSnap";
import { tickWarpGlide, type WarpGlide, warpGlideSprites } from "../../domain/warpGlide";
import { speedTrailSprites, tickSpeedTrail, type SpeedTrail } from "../../domain/speedTrail";
import { warpPlayerFarthestFromGhosts } from "../systems/playerWarp";
import {
  ghostWarpGlideSprites,
  glidingGhostEids,
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
import { tagOptionalPellets } from "../systems/lazyLooper";
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
const LEARN_CATCH_GRACE_MS = 1500;
const LEARN_CATCH_DEMO_UPGRADES: readonly BaseUpgradeId[] = [
  "passiveDeathsHarvest",
  "passiveDeathsBounty",
  "passiveDefyDeath",
  "passiveExtraLife",
  "passiveMyogenesis",
  "passiveMoneyTalks",
  "passiveShieldPellets",
  "passiveHaunting",
];

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
  private speedTrail: SpeedTrail = [];
  private ghostCornerWarps: GhostCornerWarp[] = [];
  private fruitRespawnRemainingMs: number | null = null;
  private remoteTransferCounter = 0;
  private readonly turnTuning = new TurnTuningState();
  private prevKeys: HeldKeys = NO_KEYS_HELD;
  private pendingPowerRespawns: PendingPowerPelletRespawn[] = [];
  private readonly runState = new LearnRunState();
  private readonly houseHold = new LearnHouseHold();
  private houseHoldEaten = 0;
  private catchGraceMs = 0;
  private nearMissPasses: NearMissPasses = createNearMissPasses();
  private streakBar: BonusBar = createBonusBar();
  private fruitPresence: FruitPresence = createFruitPresence();
  private boardCollected = 0;

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
    if (!this.fruitScheduled()) {
      this.spawnFruitEntity();
    }
    return this.takeEvents();
  }

  step(keys: HeldKeys, delta: number): SimEvent[] {
    this.events = [];
    if (this.warpGlide !== null) {
      this.warpGlide = tickWarpGlide(this.warpGlide, delta);
    }
    this.ghostCornerWarps = tickGhostCornerWarps(this.ghostCornerWarps, delta);
    const warping = this.warpGlide !== null;
    const diagonalAllowed = wallPassActive(this.learnUpgrades);
    const turnTuningOpts =
      !diagonalAllowed && hasUpgrade(this.learnUpgrades.owned, "passiveTurnTuning")
        ? { prevKeys: this.prevKeys, solids: getActiveLayout().playerSolids }
        : undefined;
    let turnTap: TurnTap | null = null;
    if (!warping) {
      turnTap = applyHeldKeys(this.world, keys, { diagonalAllowed, turnTuning: turnTuningOpts });
    }
    if (turnTuningOpts) {
      this.pushTurnSparks(
        this.turnTuning.noteKeys(
          this.world,
          this.learnUpgrades.owned,
          this.prevKeys,
          keys,
          turnTap,
          delta,
        ),
      );
    }
    this.prevKeys = keys;
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
    this.learnUpgrades = tickDefyDeath(this.learnUpgrades, delta);
    this.fireDueEchoes(delta);
    this.tickHaunt(delta);
    this.turnTuning.tick(delta);
    this.catchGraceMs = Math.max(0, this.catchGraceMs - delta);
    this.releaseHeldGhost(delta, anyKeyHeld(keys));

    if (this.recallHoldRemainingMs > 0) {
      this.recallHoldRemainingMs = Math.max(0, this.recallHoldRemainingMs - delta);
      if (this.recallHoldRemainingMs === 0) {
        for (const eid of this.recallHoldGhostEids) {
          if (eid !== this.houseHold.eid) {
            GhostPhase.value[eid] = GHOST_PHASE.active;
          }
        }
        this.recallHoldGhostEids = [];
      }
    }

    applyPlayerSpeed(
      this.world,
      levelSpeedMul *
        playerSpeedMultiplier(this.learnUpgrades.owned) *
        cellSpeedMultiplier(this.learnUpgrades.owned, enteringEmptyCell(this.world)) *
        (speedBurstActive(this.learnUpgrades)
          ? speedBurstMultiplier(this.learnUpgrades.owned)
          : 1) *
        this.turnTuning.speedMultiplier(this.learnUpgrades.owned) *
        (warping ? 0 : 1),
    );
    applyGhostSpeed(this.world, NO_ELROY_PELLETS, LEARN_LEVEL, {
      ghostSpeedMul: levelSpeedMul * ghostSpeedMultiplier(this.learnUpgrades.owned),
      frozenGhostEid: frozenGhostEid(this.learnUpgrades),
      heldGhostEids: heldGhostEids(this.ghostCornerWarps),
      tunnelSpeedRatio: ghostTunnelSpeedRatio(this.learnUpgrades.owned),
    });
    const facingBeforeMove = playerFacing(this.world);
    const positionBeforeMove = this.playerPosition();
    movement(
      this.world,
      delta,
      wallPassActive(this.learnUpgrades) ? wallPassSolids(this.learnUpgrades.owned) : undefined,
      false,
      undefined,
      ghostsBlockedFromTunnels(this.learnUpgrades.owned),
    );
    this.noteTunnelExit(positionBeforeMove);
    this.pushTurnSparks(
      this.turnTuning.afterMove(
        this.world,
        this.learnUpgrades.owned,
        facingBeforeMove,
        playerFacing(this.world),
      ),
    );
    const trailEid = query(this.world, [Player, Position])[0];
    this.speedTrail =
      trailEid !== undefined && speedBurstActive(this.learnUpgrades)
        ? tickSpeedTrail(
            this.speedTrail,
            { x: Position.x[trailEid] ?? 0, y: Position.y[trailEid] ?? 0 },
            delta,
          )
        : [];

    if (this.tunnelDashAnim !== null) {
      const positionBeforeDash = this.playerPosition();
      this.tunnelDashAnim = tickTunnelDashAnimation(
        this.world,
        this.tunnelDashAnim,
        delta,
        PLAYER_SPEED * TUNNEL_DASH_SPEED_MUL,
      );
      this.noteTunnelExit(positionBeforeDash);
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
      : { powerRemoved: 0, removedEids: [], removedPowerPositions: [] };
    const removedEids = [...playerFrame.removedEids, ...ghostFrame.removedEids];
    const powerRemoved = playerFrame.powerRemoved + ghostFrame.powerRemoved;
    this.releaseAll(removedEids);
    this.countCollected(removedEids.length);
    this.stepStreakEngine(playerFrame.removedCells, delta);
    if (hasUpgrade(this.learnUpgrades.owned, "passivePowerPelletRecharge")) {
      this.pendingPowerRespawns = queuePowerPelletRespawns(
        this.pendingPowerRespawns,
        [...playerFrame.removedPowerPositions, ...ghostFrame.removedPowerPositions],
        secondChompMs(this.learnUpgrades.owned),
      );
    }
    const respawnTick = tickPowerPelletRespawns(this.pendingPowerRespawns, delta);
    this.pendingPowerRespawns = respawnTick.pending;
    for (const pos of respawnTick.ready) {
      spawnPellet(this.world, pos.x, pos.y, "power");
    }
    if (powerRemoved > 0) {
      this.resolvePowerPelletTrigger(powerRemoved);
    }
    this.applyRemoteTransferStep(removedEids.length);
    if (query(this.world, [Pellet]).length === 0) {
      this.spawnPellets();
      this.onBoardRefill();
    } else {
      this.regenPowerPellets();
    }

    this.tickFruit(delta);

    ghostAi(
      this.world,
      GHOST_AI_MODE.chase,
      NO_ELROY_PELLETS,
      undefined,
      ghostsBlockedFromTunnels(this.learnUpgrades.owned),
    );

    const catchOptions = {
      frozenGhostEid: frozenGhostEid(this.learnUpgrades),
      skipGhostEids: glidingGhostEids(this.ghostCornerWarps),
      playerInvulnerable: playerIsInvulnerable(this.learnUpgrades) || this.catchGraceMs > 0,
    };
    const caught = this.catchDemoOwned() ? catchPlayer(this.world, catchOptions) : null;
    if (caught === null) {
      this.payNearMisses(catchOptions);
    } else {
      this.nearMissPasses = createNearMissPasses();
      this.resolveDemoCatch(caught);
    }

    this.events.push({
      type: "draw",
      options: {
        frozenGhostEid: frozenGhostEid(this.learnUpgrades),
        frozenGhostRemainingMs: this.learnUpgrades.freezeRemainingMs,
        playerInvulnRemainingMs: Math.max(
          playerTintRemainingMs(this.learnUpgrades),
          this.catchGraceMs,
        ),
        turnFlashRemainingMs: this.turnTuning.flashMs,
        wallPassActive: wallPassActive(this.learnUpgrades),
        wallPassLoopActive:
          wallPassActive(this.learnUpgrades) && wallPassLoopOwned(this.learnUpgrades.owned),
        dimGhostEid: this.helperBlinky,
        playerWarpGlide: this.warpGlide === null ? undefined : warpGlideSprites(this.warpGlide),
        playerSpeedTrail: speedBurstActive(this.learnUpgrades)
          ? speedTrailSprites(this.speedTrail, getActiveLayout().tileSize)
          : undefined,
        ghostWarpGlides: ghostWarpGlideSprites(this.ghostCornerWarps),
        hauntedGhost: hauntedGhost(this.learnUpgrades),
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
    this.houseHold.clear();
    this.streakBar = createBonusBar();
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
    this.learnUpgrades = clearUpgradeTimers(this.learnUpgrades);
    this.recallHoldGhostEids = [];
    this.recallHoldRemainingMs = 0;
    this.ghostCornerWarps = [];
    if (hasUpgrade(this.learnUpgrades.owned, "passiveGhostHouseDelay")) {
      this.beginHouseHold();
    }
    return this.takeEvents();
  }

  toggleUpgrade(id: UpgradeId): SimEvent[] {
    this.events = [];
    const turningOn = !hasUpgrade(this.learnUpgrades.owned, baseIdOf(id));
    const toggled = turningOn
      ? grantUpgrade(this.learnUpgrades, id)
      : revokeUpgrade(this.learnUpgrades, id);
    this.applyToggled(toggled);
    if (turningOn && baseIdOf(id) === "passivePelletToPower") {
      this.applyPelletSurge(pelletSurgeCount([id]));
    }
    if (baseIdOf(id) === "passiveLazyLooper") {
      this.tagOptionalPellets();
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
    this.applyToggled(toggled);
    if (enhancing && baseId === "passivePelletToPower") {
      this.applyPelletSurge(pelletSurgeCount([nextId]) - pelletSurgeCount([current]));
    }
    if (baseId === "passiveLazyLooper") {
      this.tagOptionalPellets();
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

  private applyToggled(toggled: RunUpgrades): void {
    const before = this.learnUpgrades.owned;
    const wasScheduled = this.fruitScheduled();
    const lifetimeBefore = fruitLifetimeMultiplier(before);
    this.learnUpgrades = clearStaleUpgradeTimers(toggled.owned, toggled);
    const after = this.learnUpgrades.owned;
    if (!hasUpgrade(after, "passiveHaunting")) {
      this.releaseHauntedGhost();
    }
    if (!hasUpgrade(after, "passiveTurnTuning")) {
      this.turnTuning.reset();
    }
    this.runState.addLives(sumGrantedLives(after) - sumGrantedLives(before));
    this.syncHouseHold(hasUpgrade(before, "passiveGhostHouseDelay"));
    this.syncFruitMode(wasScheduled, fruitLifetimeMultiplier(after) / lifetimeBefore);
  }

  private syncHouseHold(wasOwned: boolean): void {
    const owned = hasUpgrade(this.learnUpgrades.owned, "passiveGhostHouseDelay");
    if (owned && !wasOwned) {
      this.beginHouseHold();
    } else if (!owned && this.houseHold.eid !== null) {
      GhostPhase.value[this.houseHold.eid] = GHOST_PHASE.active;
      this.houseHold.clear();
    }
  }

  private syncFruitMode(wasScheduled: boolean, lifetimeRatio: number): void {
    const scheduled = this.fruitScheduled();
    if (scheduled && !wasScheduled) {
      this.releaseAll(removeAllFruit(this.world));
      this.fruitPresence = createFruitPresence();
      this.boardCollected = 0;
      this.fruitRespawnRemainingMs = null;
    } else if (!scheduled && wasScheduled) {
      this.fruitPresence = createFruitPresence();
      this.spawnFruitEntity();
    } else if (scheduled && lifetimeRatio > 1) {
      this.fruitPresence = extendFruitLifetime(this.fruitPresence, lifetimeRatio);
    }
  }

  private playerPosition(): { x: number; y: number } | null {
    const eid = query(this.world, [Player, Position])[0];
    return eid === undefined ? null : { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
  }

  private noteTunnelExit(before: { x: number; y: number } | null): void {
    if (playerExitedTunnel(before, this.playerPosition())) {
      this.learnUpgrades = applyTunnelExitInvuln(this.learnUpgrades, this.learnUpgrades.owned);
    }
  }

  private pushTurnSparks(bursts: readonly TurnSparksBurst[]): void {
    for (const burst of bursts) {
      this.events.push({ type: "turnSparks", ...burst });
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
    if (shieldPelletsCap(this.learnUpgrades.owned) !== null) {
      this.learnUpgrades = bankShields(this.learnUpgrades, powerRemoved);
      return;
    }
    this.firePowerPelletEffects(powerRemoved);
  }

  private fireDueEchoes(delta: number): void {
    if (this.learnUpgrades.pendingEchoes.length === 0) {
      return;
    }
    const echoTick = tickEchoes(this.learnUpgrades.pendingEchoes, delta);
    this.learnUpgrades = { ...this.learnUpgrades, pendingEchoes: echoTick.pending };
    for (const bases of echoTick.ready) {
      this.firePowerPelletEffects(1, bases);
    }
  }

  private firePowerPelletEffects(powerRemoved: number, echoBases?: readonly BaseUpgradeId[]): void {
    const powerEffects = applyPowerPelletEffects(this.learnUpgrades, powerRemoved, echoBases);
    this.learnUpgrades = powerEffects.state;
    if (echoBases === undefined && powerRemoved > 0) {
      this.learnUpgrades = queueEcho(this.learnUpgrades, this.random.stream("echo"));
    }
    if (powerEffects.freezeClosestMs !== null) {
      this.learnUpgrades = freezeClosestGhost(
        this.world,
        this.learnUpgrades,
        powerEffects.freezeClosestMs,
      );
    }
    if (powerEffects.collectExtraPellets > 0) {
      this.releaseAll(collectExtraPellets(this.world, powerEffects.collectExtraPellets));
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

  private stepStreakEngine(cells: readonly Cell[], delta: number): void {
    const every = streakEngineEvery(this.learnUpgrades.owned);
    if (every === null) {
      this.streakBar = createBonusBar();
      return;
    }
    if (cells.length === 0) {
      this.streakBar = tickStreakIdle(this.streakBar, delta);
      return;
    }
    const prevStreak = this.streakBar.streak;
    this.streakBar = applyStreakPellets(this.streakBar, cells).bar;
    for (const pop of streakPops(prevStreak, this.streakBar.streak, every)) {
      const cell = cells[pop.cellIndex]!;
      this.events.push({
        type: "streakPop",
        value: pop.value,
        x: cellCenterX(cell.col),
        y: cellCenterY(cell.row),
      });
    }
    const fires = streakEngineFires(prevStreak, this.streakBar.streak, every);
    for (let fired = 0; fired < fires; fired += 1) {
      this.resolvePowerPelletTrigger(1);
      this.learnUpgrades = applyStreakEngineInvuln(this.learnUpgrades, this.learnUpgrades.owned);
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
    const eid = pickClosestGhostEid(candidates, fromX, fromY, frozenGhostEid(this.learnUpgrades));
    if (eid === null) {
      return;
    }
    this.seatGhostAtExit(eid);
    this.recallHoldGhostEids.push(eid);
    this.recallHoldRemainingMs = LEARN_RECALL_HOLD_MS;
  }

  private tickHaunt(delta: number): void {
    const haunted = hauntedGhostEid(this.learnUpgrades);
    this.learnUpgrades = tickHaunt(this.learnUpgrades, delta);
    if (haunted !== null && hauntedGhostEid(this.learnUpgrades) === null) {
      this.freeGhost(haunted);
    }
  }

  private releaseHauntedGhost(): void {
    const haunted = hauntedGhostEid(this.learnUpgrades);
    this.learnUpgrades = { ...this.learnUpgrades, hauntRemainingMs: 0, hauntedGhostEid: null };
    if (haunted !== null) {
      this.freeGhost(haunted);
    }
  }

  private freeGhost(eid: number): void {
    if (eid !== this.houseHold.eid) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
  }

  private seatGhostAtExit(eid: number): void {
    const exit = getActiveLayout().ghostHouseExit;
    Position.x[eid] = cellCenterX(exit.col);
    Position.y[eid] = cellCenterY(exit.row);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Speed.px[eid] = 0;
    GhostPhase.value[eid] = GHOST_PHASE.inHouse;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
  }

  private beginHouseHold(): void {
    if (this.ghost === null || this.selected === null) {
      return;
    }
    this.seatGhostAtExit(this.ghost);
    this.houseHold.begin(this.ghost, this.selected);
    this.houseHoldEaten = 0;
  }

  private releaseHeldGhost(delta: number, hasInput: boolean): void {
    const released = this.houseHold.tick(
      this.learnUpgrades.owned,
      hasInput,
      delta,
      this.houseHoldEaten,
    );
    if (released !== null) {
      GhostPhase.value[released] = GHOST_PHASE.active;
    }
  }

  private countCollected(count: number): void {
    this.houseHoldEaten += count;
    this.boardCollected += count;
  }

  private regenPowerPellets(): void {
    if (this.pendingPowerRespawns.length > 0 || query(this.world, [PowerPellet]).length > 0) {
      return;
    }
    for (const cell of pelletCellCenters()) {
      if (cell.kind === "power") {
        spawnPellet(this.world, cell.x, cell.y, "power");
      }
    }
  }

  private onBoardRefill(): void {
    this.pendingPowerRespawns = [];
    this.boardCollected = 0;
    this.fruitPresence = createFruitPresence();
    this.runState.levelClear(this.learnUpgrades.owned);
  }

  private catchDemoOwned(): boolean {
    return LEARN_CATCH_DEMO_UPGRADES.some((id) => hasUpgrade(this.learnUpgrades.owned, id));
  }

  private bonusDemoOwned(): boolean {
    return (
      hasUpgrade(this.learnUpgrades.owned, "fruitQuarterBounty") ||
      hasUpgrade(this.learnUpgrades.owned, "passiveDeathsBounty") ||
      hasUpgrade(this.learnUpgrades.owned, "passiveMoneyTalks") ||
      hasUpgrade(this.learnUpgrades.owned, "passiveNearMiss")
    );
  }

  private fruitScheduled(): boolean {
    return (
      hasUpgrade(this.learnUpgrades.owned, "fruitFecundity") ||
      hasUpgrade(this.learnUpgrades.owned, "fruitFeast")
    );
  }

  private popup(text: string): void {
    const pose = playerPose(this.world);
    if (pose !== null) {
      this.events.push({ type: "learnPopup", text, x: pose.x, y: pose.y - 14 });
    }
  }

  private resolveDemoCatch(caughtBy: number): void {
    this.streakBar = createBonusBar();
    const spent = spendShield(this.learnUpgrades);
    if (spent !== null) {
      this.learnUpgrades = spent;
      this.firePowerPelletEffects(1);
      this.learnUpgrades = applyShieldBreakInvuln(this.learnUpgrades);
      this.popup("SHIELD BROKEN");
      return;
    }
    const owned = this.learnUpgrades.owned;
    const lines: string[] = [];
    if (hasUpgrade(owned, "passiveDeathsHarvest")) {
      const harvested = harvestNearbyPellets(this.world, deathsHarvestRadiusTiles(owned));
      this.releaseAll(harvested);
      this.countCollected(harvested.length);
      lines.push(`HARVEST ${harvested.length}`);
    }
    const defied = defyDeathActive(this.learnUpgrades);
    if (defied) {
      this.learnUpgrades = { ...this.learnUpgrades, defyDeathRemainingMs: 0 };
    }
    const outcome = this.runState.caught(owned, defied);
    lines.push(
      outcome.kind === "saved" ? "SAVED" : outcome.kind === "reset" ? "LIVES RESET" : "LIFE LOST",
    );
    if (hasUpgrade(owned, "passiveHaunting")) {
      this.releaseHauntedGhost();
      this.seatGhostAtExit(caughtBy);
      this.learnUpgrades = armHaunt(this.learnUpgrades, caughtBy, HAUNTING_MS);
      lines.push("HAUNTED");
    }
    if (outcome.quartersPaid > 0) {
      lines.push(`-${outcome.quartersPaid} Q`);
    }
    if (outcome.bountyCharge > 0) {
      lines.push(`+${outcome.bountyCharge} BONUS`);
    }
    this.catchGraceMs = LEARN_CATCH_GRACE_MS;
    this.popup(lines.join("\n"));
  }

  private tickFruit(delta: number): void {
    const owned = this.learnUpgrades.owned;
    const scheduled = this.fruitScheduled();
    if (scheduled) {
      const tick = tickFruitPresence(this.fruitPresence, this.boardCollected, delta, LEARN_LEVEL, {
        feastBase: fruitFeastThresholds(owned),
        lifetimeMul: fruitLifetimeMultiplier(owned),
        persist: fruitPersistsUntilLevelEnd(owned),
      });
      this.fruitPresence = tick.state;
      if (tick.action === "spawn" || tick.action === "replace") {
        this.spawnFruitEntity();
      } else if (tick.action === "despawn") {
        this.releaseAll(removeAllFruit(this.world));
      }
    } else if (this.fruitRespawnRemainingMs !== null) {
      this.fruitRespawnRemainingMs -= delta;
      if (this.fruitRespawnRemainingMs <= 0) {
        this.fruitRespawnRemainingMs = null;
        this.spawnFruitEntity();
      }
    }

    const removedFruitEids = collectFruit(this.world);
    if (removedFruitEids.length === 0) {
      return;
    }
    this.releaseAll(removedFruitEids);
    if (scheduled) {
      this.fruitPresence = markFruitCollected(this.fruitPresence);
    } else {
      this.fruitRespawnRemainingMs = FRUIT_RESPAWN_MS;
    }
    this.payFruit(removedFruitEids.length);
    if (hasUpgrade(owned, "fruitPowerPellet")) {
      this.resolvePowerPelletTrigger(1);
    }
  }

  private payNearMisses(catchOptions: CatchOptions): void {
    const charge = nearMissCharge(this.learnUpgrades.owned);
    if (charge === 0) {
      this.nearMissPasses = createNearMissPasses();
      return;
    }
    const step = stepNearMisses(
      this.world,
      this.nearMissPasses,
      getActiveLayout().tileSize,
      catchOptions,
    );
    this.nearMissPasses = step.passes;
    if (step.completed > 0) {
      this.runState.addBonusCharge(step.completed * charge);
      this.popup(`+${step.completed * charge} BONUS`);
    }
  }

  private payFruit(count: number): void {
    const quarters = fruitQuartersPerFruit(this.learnUpgrades.owned);
    if (quarters !== null) {
      this.runState.addQuarters(count * quarters);
      this.popup(`+${count * quarters} Q`);
    } else {
      this.runState.addBonusCharge(count * FRUIT_BONUS_CHARGE);
      if (this.bonusDemoOwned()) {
        this.popup(`+${count * FRUIT_BONUS_CHARGE} BONUS`);
      }
    }
  }

  statusText(): string {
    const owned = this.learnUpgrades.owned;
    const lines: string[] = [];
    if (this.catchDemoOwned()) {
      lines.push(`LIVES ${this.runState.lives}`);
    }
    const shieldCap = shieldPelletsCap(owned);
    if (shieldCap !== null) {
      lines.push(`SHIELDS ${this.learnUpgrades.shieldsBanked}/${shieldCap}`);
    }
    if (this.bonusDemoOwned()) {
      lines.push(
        `BONUS ${Math.floor(this.runState.bonus.charge)}/${BONUS_BAR_MAX}  QUARTERS ${this.runState.quarters}`,
      );
    }
    const house = this.houseHold.status(owned, this.houseHoldEaten);
    if (house !== null) {
      lines.push(house);
    }
    if (this.fruitScheduled()) {
      lines.push(this.fruitStatus());
    }
    return lines.join("\n");
  }

  private fruitStatus(): string {
    if (this.fruitPresence.active) {
      return `FRUIT LEAVES IN ${(this.fruitPresence.remainingMs / 1000).toFixed(1)}S`;
    }
    const thresholds = fruitFeastThresholds(this.learnUpgrades.owned) ?? [
      BASE_FRUIT_SPAWN_THRESHOLDS[0],
    ];
    const next = thresholds[this.fruitPresence.nextThresholdIndex];
    return next === undefined
      ? "NO MORE FRUIT THIS BOARD"
      : `NEXT FRUIT AT ${next} PELLETS (${this.boardCollected})`;
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
    this.boardCollected = 0;
    this.pendingPowerRespawns = [];
    this.fruitPresence = createFruitPresence();
    if (this.fruitScheduled()) {
      this.releaseAll(removeAllFruit(this.world));
    }
    for (const eid of query(this.world, [Pellet])) {
      this.events.push({ type: "releaseDrawable", eid });
      removeEntity(this.world, eid);
    }
    this.spawnPellets();
  }

  private spawnPellets(): void {
    spawnBoardPellets(this.world);
    this.tagOptionalPellets();
  }

  private tagOptionalPellets(): void {
    tagOptionalPellets(this.world, lazyLooperRings(this.learnUpgrades.owned));
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

function sumGrantedLives(owned: readonly UpgradeId[]): number {
  return owned.reduce((sum, id) => sum + grantLivesForUpgrade(id), 0);
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
      hasField("playerInvulnMs") ||
      hasField("warpInvulnMs") ||
      owned.some((id) => getUpgradeDef(id).tunnelExitInvulnMs !== undefined) ||
      streakEngineInvulnMs(owned) > 0
        ? state.invulnRemainingMs
        : 0,
    speedBurstRemainingMs: hasField("playerSpeedBurstMs") ? state.speedBurstRemainingMs : 0,
    ghostHarvestRemainingMs: hasField("ghostHarvestMs") ? state.ghostHarvestRemainingMs : 0,
    defyDeathRemainingMs: hasField("defyDeathMs") ? state.defyDeathRemainingMs : 0,
    shieldsBanked: Math.min(state.shieldsBanked, shieldPelletsCap(owned) ?? 0),
    pendingEchoes: echoEffects(owned) !== null ? state.pendingEchoes : [],
  };
}
