import { addComponent, addEntity, createWorld, query, removeEntity, type World } from "bitecs";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { RELEASE_SLOT_BY_KIND } from "../../domain/ghostRoster";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { GHOST_PHASE } from "../../domain/ghostPhase";
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
import type { PlayerPelletFrame } from "../systems/collectPellets";
import {
  emptyPlayerPelletFrame,
  runHyperspeedSubsteps,
  mergePlayerPelletFrames,
  noteHyperspeedFacing,
} from "../systems/hyperspeed";
import { tickEchoes } from "../../domain/echo";
import {
  createFruitPresence,
  FRUIT_LIFETIME_MS,
  cornucopiaSpawnDecision,
  mergeCornucopiaMode,
  fruitStackCenter,
  extendFruitLifetime,
  markFruitCollected,
  takeFruitKind,
  tickFruitPresence,
  type FruitKind,
  type FruitPresence,
  type FruitSequenceState,
} from "../../domain/fruit";
import type { GhostDir } from "../../domain/ghostPath";
import type { GhostTarget } from "../../domain/ghostTarget";
import { predictGhostPath } from "../../domain/learnOverlay";
import { speedLevelMultiplier } from "../../domain/levelRules";
import {
  BASE_FRUIT_SPAWN_THRESHOLDS,
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  ghostHouseSpawnCenter,
  isWalkable,
  pelletCellCenters,
  worldToCol,
  worldToRow,
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
  cornucopiaAlongsideOwned,
  fruitFeastThresholds,
  fruitLifetimeMultiplier,
  fruitPersistsUntilLevelEnd,
  fruitStacksSideBySide,
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
  grantStartingShields,
  shieldBankCap,
  powerPelletPickupFires,
  shieldBreakOwned,
  shieldOverflow,
  shieldPelletsCap,
  spendShield,
  HYPERSPEED_MUL,
  hyperspeedActive,
  hyperspeedMultiplier,
  spendHyperspeedShield,
  startHyperspeedTurnDelay,
  tickHyperspeed,
  createRunUpgrades,
  clearUpgradeTimers,
  echoEffects,
  queueEcho,
  armHaunt,
  hauntedGhost,
  hauntedGhostEid,
  tickHaunt,
  tickWallDrop,
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
  eatFrightenedGhost,
  NO_FRIGHT,
  frightenedGhostEids,
  frightenedGhosts,
  hunterHoldsEaten,
  tickFrightened,
  type CornucopiaMode,
  endSimulacrum,
  simulacrumSavesLife,
} from "../../domain/upgrades";
import {
  mirrorFacing,
  nearestBody,
  SIMULACRUM_POP_MS,
  simulacrumPopProgress,
  twinDesynced,
  twinPoint,
  type BodyTile,
} from "../../domain/simulacrum";
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
import { dropWallOnReversal, playerSolidsWithWall, trackWallOccupancy } from "../systems/wallDrop";
import {
  followProgrammer,
  holdPlayerForProgramming,
  recordProgrammerKeys,
} from "../systems/programmer";
import { programmerQueueSlots, type ProgrammerQueueSlot } from "../../domain/programmer";
import type { SolidGrid } from "../../domain/maze";
import { applyRemoteTransference } from "../systems/remoteTransference";
import {
  collectFruit,
  fruitKindsOnBoard,
  fruitPositions,
  removeAllFruit,
} from "../systems/collectFruit";
import { collectPellets } from "../systems/collectPellets";
import { harvestPelletsByGhosts } from "../systems/ghostHarvest";
import {
  ghostAi,
  ghostAiContext,
  resolveGhostTarget,
  type GhostAiContext,
} from "../systems/ghostAi";
import { freezeClosestGhost } from "../systems/ghostFreeze";
import { ghostExitHouse } from "../systems/ghostExitHouse";
import { applyGhostSpeed } from "../systems/ghostSpeed";
import { sendGhostOutOfHouse } from "../systems/ghostRelease";
import {
  NO_KEYS_HELD,
  anyKeyHeld,
  applyHeldKeys,
  type HeldKeys,
  type TurnTap,
} from "../systems/heldKeys";
import { LearnHouseHold } from "./learnHouseHold";
import { LearnRecall } from "./learnRecall";
import { LearnRunState } from "./learnRunState";
import { playerFacing, playerPose } from "../systems/playerDirection";
import {
  startPowerPelletBreaks,
  tickPowerPelletBreaks,
  type ActivePowerPelletBreak,
} from "./powerPelletBreaks";
import { catchPlayer, edibleGhostsTouchingPlayer, type CatchOptions } from "../systems/catchPlayer";
import { frightenedGhostAi, frightenGhosts } from "../systems/ghostFrightened";
import { stepNearMisses } from "../systems/nearMiss";
import { createNearMissPasses, type NearMissPasses } from "../../domain/nearMiss";
import { harvestNearbyPellets } from "../systems/deathsHarvest";
import { TurnTuningState, type TurnSparksBurst } from "../systems/turnTuningState";
import { movement } from "../systems/movement";
import { applyPelletToPowerConvert } from "../systems/pelletToPower";
import { enteringEmptyCell } from "../systems/enteringEmptyCell";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import { snapPlayerToNearestWalkable } from "../systems/playerWallPassSnap";
import {
  startWarpGlide,
  tickWarpGlide,
  type WarpGlide,
  warpGlideSprites,
} from "../../domain/warpGlide";
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
import type { SimEvent, SimRenderOptions } from "./simEvents";
import { playerCell } from "../systems/playerCell";
import { tagOptionalPellets } from "../systems/lazyLooper";
import { spawnBoardPellets, spawnFruit, spawnPellet, spawnPlayer, spawnWalls } from "./spawn";

export type LearnOverlayModel = {
  kind: GhostKindId;
  target: GhostTarget;
  path: GhostTarget[];
  playerTile: GhostAiContext["player"];
  blinkyTile: GhostAiContext["blinky"];
  playerPx: { x: number; y: number } | null;
  blinkyPx: { x: number; y: number } | null;
  ghostPx: { x: number; y: number };
  ghostFacing: GhostDir;
};

export const NO_ELROY_PELLETS = Number.MAX_SAFE_INTEGER;
const LEARN_LEVEL = 1;
const LEARN_EATEN_HOLD_MS = 1500;
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
  "passiveStartingShield",
  "passiveHaunting",
  "powerPelletHyperspeed",
  "passiveShieldBreak",
  "passiveInheritance",
  "powerPelletSimulacrum",
];

export class LearnSim {
  world: World = createWorld();
  readonly random: RunRandom;
  private events: SimEvent[] = [];
  private hyperspeedDirection: Direction | null = null;
  private hyperspeedPellets: PlayerPelletFrame = emptyPlayerPelletFrame();
  private hyperspeedFruit: number[] = [];
  private selected: GhostKindId | null = null;
  private ghost: number | null = null;
  private helperBlinky: number | null = null;
  private learnUpgrades: RunUpgrades = createRunUpgrades();
  private eatenHoldGhostEids: number[] = [];
  private eatenHoldRemainingMs = 0;
  private tunnelDashAnim: TunnelDashAnimation | null = null;
  private powerPelletBreaks: ActivePowerPelletBreak[] = [];
  private nextPowerPelletBreakId = 1;
  private warpGlide: WarpGlide | null = null;
  private speedTrail: SpeedTrail = [];
  private ghostCornerWarps: GhostCornerWarp[] = [];
  private fruitRespawnRemainingMs: number | null = null;
  private cornucopiaFruit = new Map<number, number>();
  private msSinceFruitSpawn = Infinity;
  private pendingCornucopia: CornucopiaMode | null = null;
  private remoteTransferCounter = 0;
  private readonly turnTuning = new TurnTuningState();
  private prevKeys: HeldKeys = NO_KEYS_HELD;
  private pendingPowerRespawns: PendingPowerPelletRespawn[] = [];
  private readonly runState = new LearnRunState();
  private simulacrumPop: { x: number; y: number; elapsedMs: number } | null = null;
  private readonly houseHold = new LearnHouseHold();
  private readonly recalled = new LearnRecall();
  private houseHoldEaten = 0;
  private catchGraceMs = 0;
  private nearMissPasses: NearMissPasses = createNearMissPasses();
  private streakBar: BonusBar = createBonusBar();
  private fruitPresence: FruitPresence = createFruitPresence();
  private fruitSequence: FruitSequenceState = {
    sequence: [],
    spawnIndex: 0,
    previousLevelFirstKind: null,
  };
  private boardCollected = 0;
  private lifetimeCollected = 0;

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
    const baseCtx = ghostAiContext(this.world);
    const twin = this.twinBody();
    const ghostX = Position.x[eid] ?? 0;
    const ghostY = Position.y[eid] ?? 0;
    const ctx =
      twin === null
        ? baseCtx
        : {
            ...baseCtx,
            player: nearestBody(
              { col: worldToCol(ghostX), row: worldToRow(ghostY) },
              baseCtx.player,
              twin,
              getActiveLayout().playerSolids,
            ),
          };
    const target = resolveGhostTarget(eid, GHOST_AI_MODE.chase, NO_ELROY_PELLETS, ctx);
    const playerEid = query(this.world, [Player, Position])[0];
    const helper = this.helperBlinky;
    const twinPosition = ctx.player === twin ? this.twinPosition() : null;
    const ghostFacing = (Facing.direction[eid] ?? DIRECTION.none) as GhostDir;
    return {
      kind: this.selected,
      target,
      path: predictGhostPath({
        start: { col: worldToCol(ghostX), row: worldToRow(ghostY) },
        facing: ghostFacing,
        targetAt: (tile) =>
          resolveGhostTarget(eid, GHOST_AI_MODE.chase, NO_ELROY_PELLETS, ctx, tile),
      }),
      playerTile: ctx.player,
      blinkyTile: ctx.blinky,
      playerPx:
        twinPosition ??
        (playerEid === undefined
          ? null
          : { x: Position.x[playerEid] ?? 0, y: Position.y[playerEid] ?? 0 }),
      blinkyPx: helper === null ? null : { x: Position.x[helper] ?? 0, y: Position.y[helper] ?? 0 },
      ghostPx: { x: ghostX, y: ghostY },
      ghostFacing,
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
    this.powerPelletBreaks = tickPowerPelletBreaks(this.powerPelletBreaks, delta, (event) =>
      this.events.push(event),
    );
    if (this.warpGlide !== null) {
      this.warpGlide = tickWarpGlide(this.warpGlide, delta);
    }
    this.ghostCornerWarps = tickGhostCornerWarps(this.ghostCornerWarps, delta);
    const warping = this.warpGlide !== null;
    const diagonalAllowed = wallPassActive(this.learnUpgrades);
    const programming = this.learnUpgrades.programmer !== null;
    const turnTuningOpts =
      !diagonalAllowed && !programming && hasUpgrade(this.learnUpgrades.owned, "passiveTurnTuning")
        ? { prevKeys: this.prevKeys, solids: getActiveLayout().playerSolids }
        : undefined;
    let turnTap: TurnTap | null = null;
    if (programming) {
      this.learnUpgrades = {
        ...this.learnUpgrades,
        programmer: recordProgrammerKeys(
          this.world,
          this.learnUpgrades.programmer,
          this.prevKeys,
          keys,
          this.playerSolids(),
        ).state,
      };
    } else if (!warping) {
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
    this.learnUpgrades = tickHyperspeed(this.learnUpgrades, delta);
    if (!hyperspeedActive(this.learnUpgrades)) {
      this.hyperspeedDirection = null;
    }
    this.learnUpgrades = tickGhostHarvest(this.learnUpgrades, delta);
    this.learnUpgrades = tickDefyDeath(this.learnUpgrades, delta);
    this.learnUpgrades = tickWallDrop(this.learnUpgrades, delta);
    this.fireDueEchoes(delta);
    this.tickHaunt(delta);
    this.tickFright(delta);
    this.turnTuning.tick(delta);
    this.catchGraceMs = Math.max(0, this.catchGraceMs - delta);
    this.releaseHeldGhost(delta, anyKeyHeld(keys));
    this.recalled.tick(
      this.world,
      this.learnUpgrades.owned,
      anyKeyHeld(keys),
      delta,
      this.houseHoldEaten,
      [
        ...this.learnUpgrades.hunterHeldEids,
        ...[hauntedGhostEid(this.learnUpgrades), this.houseHold.eid].filter((eid) => eid !== null),
      ],
    );

    if (this.eatenHoldRemainingMs > 0) {
      this.eatenHoldRemainingMs = Math.max(0, this.eatenHoldRemainingMs - delta);
      if (this.eatenHoldRemainingMs === 0) {
        for (const eid of this.eatenHoldGhostEids) {
          this.releaseGhostFromHouse(eid);
        }
        this.eatenHoldGhostEids = [];
      }
    }

    const hyperspeedMul =
      this.learnUpgrades.hyperspeedTurnDelayMs > 0
        ? 0
        : levelSpeedMul * hyperspeedMultiplier(this.learnUpgrades.owned);
    const programmerPhase = this.learnUpgrades.programmer?.phase ?? null;
    applyPlayerSpeed(
      this.world,
      programmerPhase === "recording" || warping
        ? 0
        : programmerPhase === "running"
          ? levelSpeedMul * HYPERSPEED_MUL
          : hyperspeedActive(this.learnUpgrades)
            ? hyperspeedMul
            : levelSpeedMul *
              playerSpeedMultiplier(this.learnUpgrades.owned) *
              cellSpeedMultiplier(this.learnUpgrades.owned, enteringEmptyCell(this.world)) *
              (speedBurstActive(this.learnUpgrades)
                ? speedBurstMultiplier(this.learnUpgrades.owned)
                : 1) *
              this.turnTuning.speedMultiplier(this.learnUpgrades.owned),
    );
    applyGhostSpeed(this.world, NO_ELROY_PELLETS, LEARN_LEVEL, {
      ghostSpeedMul: levelSpeedMul * ghostSpeedMultiplier(this.learnUpgrades.owned),
      frozenGhostEid: frozenGhostEid(this.learnUpgrades),
      heldGhostEids: heldGhostEids(this.ghostCornerWarps),
      frightenedGhostEids: frightenedGhostEids(this.learnUpgrades),
      tunnelSpeedRatio: ghostTunnelSpeedRatio(this.learnUpgrades.owned),
    });
    const facingBeforeMove = playerFacing(this.world);
    const positionBeforeMove = this.playerPosition();
    const playerSolids = this.playerSolids();
    const moveFrame = (frameDelta: number): void => {
      movement(
        this.world,
        frameDelta,
        playerSolids,
        undefined,
        ghostsBlockedFromTunnels(this.learnUpgrades.owned),
        null,
        this.learnUpgrades.droppedWall,
      );
      this.learnUpgrades = trackWallOccupancy(this.world, this.learnUpgrades);
    };
    if (programmerPhase === "running") {
      this.moveHyperspeed(delta, moveFrame, () => {
        this.learnUpgrades = {
          ...this.learnUpgrades,
          programmer: followProgrammer(
            this.world,
            this.learnUpgrades.programmer,
            this.playerSolids(),
          ),
        };
      });
    } else if (hyperspeedActive(this.learnUpgrades)) {
      this.moveHyperspeed(delta, moveFrame, () => this.noteHyperspeedTurn());
    } else {
      moveFrame(delta);
    }
    ghostExitHouse(this.world);
    this.learnUpgrades = dropWallOnReversal(
      this.world,
      this.learnUpgrades,
      this.learnUpgrades.owned,
      facingBeforeMove,
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
      trailEid !== undefined && this.speedTrailActive()
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
          this.emitPelletSfx(dash.sweptPelletEids.length, dash.sweptPowerRemoved);
          this.nextPowerPelletBreakId = startPowerPelletBreaks(
            this.world,
            this.powerPelletBreaks,
            this.nextPowerPelletBreakId,
            dash.sweptPowerPositions,
            (event) => this.events.push(event),
          );
          if (dash.sweptPowerRemoved > 0) {
            this.resolvePowerPelletTrigger(dash.sweptPowerRemoved);
          }
        }
        this.tunnelDashAnim = { targetX: dash.animateToX, wrapToX: dash.wrapToX, y: dash.y };
      }
    }

    this.tickSimulacrum(delta);
    const twinPosition = this.twinPosition();
    const playerFrame = mergePlayerPelletFrames(
      mergePlayerPelletFrames(
        this.hyperspeedPellets,
        collectPellets(this.world, {
          radiusBonusPx: pelletCollectRadiusBonusPx(this.learnUpgrades.owned),
          solids: getActiveLayout().playerSolids,
        }),
      ),
      twinPosition === null
        ? emptyPlayerPelletFrame()
        : collectPellets(this.world, { at: twinPosition }),
    );
    this.hyperspeedPellets = emptyPlayerPelletFrame();
    const ghostFrame = ghostHarvestActive(this.learnUpgrades)
      ? harvestPelletsByGhosts(this.world)
      : { powerRemoved: 0, removedEids: [], removedPowerPositions: [] };
    const removedEids = [...playerFrame.removedEids, ...ghostFrame.removedEids];
    const powerRemoved = playerFrame.powerRemoved + ghostFrame.powerRemoved;
    this.nextPowerPelletBreakId = startPowerPelletBreaks(
      this.world,
      this.powerPelletBreaks,
      this.nextPowerPelletBreakId,
      playerFrame.removedPowerPositions,
      (event) => this.events.push(event),
    );
    this.releaseAll(removedEids);
    this.countCollected(removedEids.length);
    this.emitPelletSfx(removedEids.length, powerRemoved);
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
      frightenedGhostEids(this.learnUpgrades),
      null,
      this.learnUpgrades.droppedWall,
      this.twinBody(),
    );
    frightenedGhostAi(
      this.world,
      frightenedGhostEids(this.learnUpgrades),
      this.random.stream("frightened"),
      ghostsBlockedFromTunnels(this.learnUpgrades.owned),
      null,
      this.learnUpgrades.droppedWall,
    );
    this.eatFrightenedGhosts();

    const catchOptions = this.catchOptions();
    const demo = this.catchDemoOwned();
    const playerCaught = demo ? catchPlayer(this.world, catchOptions) : null;
    const twinAt = this.twinPosition();
    const twinCaught =
      demo && playerCaught === null && twinAt !== null
        ? catchPlayer(this.world, { ...catchOptions, at: twinAt })
        : null;
    const caught = playerCaught ?? twinCaught;
    if (caught === null) {
      this.payNearMisses(catchOptions);
    } else {
      this.nearMissPasses = createNearMissPasses();
      this.resolveDemoCatch(caught, playerCaught === null ? twinAt : null);
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
        playerSpeedTrail: this.speedTrailActive()
          ? speedTrailSprites(this.speedTrail, getActiveLayout().tileSize)
          : undefined,
        ghostWarpGlides: ghostWarpGlideSprites(this.ghostCornerWarps),
        hauntedGhost: hauntedGhost(this.learnUpgrades),
        frightenedGhosts: frightenedGhosts(this.learnUpgrades),
        droppedWall: this.learnUpgrades.droppedWall,
        shields: this.learnUpgrades.shieldsBanked,
        programmerQueue: this.programmerQueue(),
        simulacrum: this.simulacrumRender(),
        simulacrumPop: this.simulacrumPopRender(),
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
    this.recalled.clear();
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
    this.simulacrumPop = null;
    this.hyperspeedDirection = null;
    this.hyperspeedPellets = emptyPlayerPelletFrame();
    this.hyperspeedFruit = [];
    this.eatenHoldGhostEids = [];
    this.eatenHoldRemainingMs = 0;
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
    const hunterHeld = this.learnUpgrades.hunterHeldEids;
    this.learnUpgrades = grantStartingShields(clearStaleUpgradeTimers(toggled.owned, toggled));
    this.freeHunterHeld(hunterHeld);
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
      this.clearAllFruit();
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

  playerWorldPosition(): { x: number; y: number } | null {
    return this.playerPosition();
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
    const owned = this.learnUpgrades.owned;
    const overflow = shieldOverflow(this.learnUpgrades, powerRemoved);
    if (shieldPelletsCap(owned) !== null) {
      this.learnUpgrades = bankShields(this.learnUpgrades, powerRemoved);
    }
    const fires = powerPelletPickupFires(owned, powerRemoved, overflow);
    if (fires > 0) {
      this.firePowerPelletEffects(fires);
    }
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
    if (powerEffects.programmerStarted) {
      holdPlayerForProgramming(this.world);
    }
    if (echoBases === undefined && powerRemoved > 0) {
      this.learnUpgrades = queueEcho(this.learnUpgrades, this.random.stream("echo"));
    }
    if (powerEffects.frightenGhosts) {
      this.learnUpgrades = {
        ...this.learnUpgrades,
        frightenedGhostEids: frightenGhosts(
          this.world,
          null,
          ghostsBlockedFromTunnels(this.learnUpgrades.owned),
        ),
      };
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
    if (powerEffects.cornucopiaFruit !== null) {
      this.spawnCornucopiaFruit(powerEffects.cornucopiaFruit);
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
    this.recalled.recall(
      this.world,
      this.learnUpgrades.owned,
      this.houseHoldEaten,
      frozenGhostEid(this.learnUpgrades),
    );
  }

  private tickHaunt(delta: number): void {
    const haunted = hauntedGhostEid(this.learnUpgrades);
    this.learnUpgrades = tickHaunt(this.learnUpgrades, delta);
    if (haunted !== null && hauntedGhostEid(this.learnUpgrades) === null) {
      this.freeGhost(haunted);
    }
  }

  private tickFright(delta: number): void {
    const held = this.learnUpgrades.hunterHeldEids;
    this.learnUpgrades = tickFrightened(this.learnUpgrades, delta);
    this.freeHunterHeld(held);
  }

  private freeHunterHeld(wasHeld: readonly number[]): void {
    for (const eid of wasHeld) {
      if (!this.learnUpgrades.hunterHeldEids.includes(eid)) {
        this.releaseGhostFromHouse(eid);
      }
    }
  }

  private eatFrightenedGhosts(): void {
    const gliding = glidingGhostEids(this.ghostCornerWarps);
    for (const eid of edibleGhostsTouchingPlayer(
      this.world,
      new Set([...frightenedGhostEids(this.learnUpgrades)].filter((eid) => !gliding.has(eid))),
    )) {
      if (eid === frozenGhostEid(this.learnUpgrades)) {
        this.learnUpgrades = { ...this.learnUpgrades, freezeRemainingMs: 0, frozenGhostEid: null };
      }
      const from = { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
      const holds = hunterHoldsEaten(this.learnUpgrades.owned);
      const ate = eatFrightenedGhost(this.learnUpgrades, eid, holds);
      this.learnUpgrades = ate.state;
      this.seatGhostInHouse(eid);
      this.ghostCornerWarps = mergeGhostCornerWarps(this.ghostCornerWarps, [
        {
          eid,
          glide: startWarpGlide(from, { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 }),
          holdMs: 0,
        },
      ]);
      if (!holds) {
        this.eatenHoldGhostEids.push(eid);
        this.eatenHoldRemainingMs = LEARN_EATEN_HOLD_MS;
      }
      this.runState.addBonusCharge(ate.charge);
      this.popup(`+${ate.charge} BONUS`);
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
      this.seatGhostAtExit(eid);
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
  }

  private releaseGhostFromHouse(eid: number): void {
    if (eid !== this.houseHold.eid) {
      sendGhostOutOfHouse(this.world, eid);
    }
  }

  private seatGhostInHouse(eid: number): void {
    const spawn = ghostHouseSpawnCenter();
    this.parkGhost(eid, spawn.x, spawn.y);
  }

  private seatGhostAtExit(eid: number): void {
    const exit = getActiveLayout().ghostHouseExit;
    this.parkGhost(eid, cellCenterX(exit.col), cellCenterY(exit.row));
  }

  private parkGhost(eid: number, x: number, y: number): void {
    Position.x[eid] = x;
    Position.y[eid] = y;
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
      this.seatGhostAtExit(released);
      GhostPhase.value[released] = GHOST_PHASE.active;
    }
  }

  private countCollected(count: number): void {
    this.houseHoldEaten += count;
    this.boardCollected += count;
  }

  private emitPelletSfx(removed: number, powerRemoved: number): void {
    if (removed <= 0) {
      return;
    }
    this.events.push({
      type: "pelletSfx",
      previousCollected: this.lifetimeCollected,
      removed,
      powerRemoved,
    });
    this.lifetimeCollected += removed - powerRemoved;
  }

  private regenPowerPellets(): void {
    if (this.pendingPowerRespawns.length > 0 || query(this.world, [PowerPellet]).length > 0) {
      return;
    }
    const powerCells = pelletCellCenters().filter((cell) => cell.kind === "power");
    const at = this.playerPosition();
    const clearance =
      getActiveLayout().tileSize + pelletCollectRadiusBonusPx(this.learnUpgrades.owned);
    if (
      at !== null &&
      powerCells.some((cell) => Math.hypot(cell.x - at.x, cell.y - at.y) < clearance)
    ) {
      return;
    }
    for (const cell of powerCells) {
      spawnPellet(this.world, cell.x, cell.y, "power");
    }
  }

  private onBoardRefill(): void {
    this.pendingPowerRespawns = [];
    this.boardCollected = 0;
    this.fruitPresence = createFruitPresence();
    const inherited = this.runState.levelClear(this.learnUpgrades.owned);
    if (inherited > 0) {
      this.popup(`+${inherited} Q`);
    }
  }

  private twinPosition(): { x: number; y: number } | null {
    const player = this.learnUpgrades.simulacrumActive ? this.playerPosition() : null;
    return player === null ? null : twinPoint(player, getActiveLayout());
  }

  private twinBody(): BodyTile | null {
    const position = this.twinPosition();
    return position === null
      ? null
      : {
          col: worldToCol(position.x),
          row: worldToRow(position.y),
          facing: mirrorFacing(playerFacing(this.world)) as GhostDir,
        };
  }

  private popSimulacrum(): void {
    const position = this.twinPosition();
    this.learnUpgrades = endSimulacrum(this.learnUpgrades);
    if (position !== null) {
      this.simulacrumPop = { ...position, elapsedMs: 0 };
    }
  }

  private tickSimulacrum(delta: number): void {
    if (this.simulacrumPop !== null) {
      this.simulacrumPop.elapsedMs += delta;
      if (this.simulacrumPop.elapsedMs >= SIMULACRUM_POP_MS) {
        this.simulacrumPop = null;
      }
    }
    const cell = playerCell(this.world);
    if (
      this.learnUpgrades.simulacrumActive &&
      cell !== null &&
      twinDesynced(this.playerSolids(), cell)
    ) {
      this.popSimulacrum();
    }
  }

  private simulacrumRender(): SimRenderOptions["simulacrum"] {
    const position = this.twinPosition();
    return position === null
      ? null
      : { ...position, facing: mirrorFacing(playerFacing(this.world)) };
  }

  private simulacrumPopRender(): SimRenderOptions["simulacrumPop"] {
    return this.simulacrumPop === null
      ? null
      : {
          x: this.simulacrumPop.x,
          y: this.simulacrumPop.y,
          progress: simulacrumPopProgress(this.simulacrumPop.elapsedMs),
        };
  }

  private catchDemoOwned(): boolean {
    return LEARN_CATCH_DEMO_UPGRADES.some((id) => hasUpgrade(this.learnUpgrades.owned, id));
  }

  private bonusDemoOwned(): boolean {
    return (
      hasUpgrade(this.learnUpgrades.owned, "fruitQuarterBounty") ||
      hasUpgrade(this.learnUpgrades.owned, "passiveDeathsBounty") ||
      hasUpgrade(this.learnUpgrades.owned, "passiveMoneyTalks") ||
      hasUpgrade(this.learnUpgrades.owned, "passiveInheritance") ||
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

  private moveHyperspeed(
    delta: number,
    moveFrame: (frameDelta: number) => void,
    afterStep: () => void,
  ): void {
    runHyperspeedSubsteps(this.world, delta, {
      moveFrame,
      afterStep,
      collect: () => {
        this.hyperspeedPellets = mergePlayerPelletFrames(
          this.hyperspeedPellets,
          collectPellets(this.world, {
            radiusBonusPx: pelletCollectRadiusBonusPx(this.learnUpgrades.owned),
            solids: getActiveLayout().playerSolids,
          }),
        );
        this.hyperspeedFruit.push(...collectFruit(this.world));
        this.eatFrightenedGhosts();
        const hit = catchPlayer(this.world, this.catchOptions());
        return (
          hit !== null && (defyDeathActive(this.learnUpgrades) || !this.breakHyperspeedShield())
        );
      },
      halt: () => applyPlayerSpeed(this.world, 0),
    });
  }

  private noteHyperspeedTurn(): void {
    const turn = noteHyperspeedFacing(
      this.hyperspeedDirection,
      playerFacing(this.world),
      this.learnUpgrades.hyperspeedTurnDelayMs > 0,
    );
    this.hyperspeedDirection = turn.lastDirection;
    if (turn.turned) {
      this.learnUpgrades = startHyperspeedTurnDelay(this.learnUpgrades);
      applyPlayerSpeed(this.world, 0);
    }
  }

  private playerSolids(): SolidGrid {
    return (
      playerSolidsWithWall(
        this.learnUpgrades,
        wallPassActive(this.learnUpgrades) ? wallPassSolids(this.learnUpgrades.owned) : undefined,
      ) ?? getActiveLayout().playerSolids
    );
  }

  private speedTrailActive(): boolean {
    return (
      speedBurstActive(this.learnUpgrades) ||
      hyperspeedActive(this.learnUpgrades) ||
      this.learnUpgrades.programmer?.phase === "running"
    );
  }

  private programmerQueue(): ProgrammerQueueSlot[] | null {
    const state = this.learnUpgrades.programmer;
    const player = this.playerPosition();
    return state?.phase === "recording" && player !== null
      ? programmerQueueSlots(state.presses, player.x, player.y, getActiveLayout().tileSize)
      : null;
  }

  private catchOptions(): CatchOptions {
    return {
      frozenGhostEid: frozenGhostEid(this.learnUpgrades),
      skipGhostEids: glidingGhostEids(this.ghostCornerWarps),
      edibleGhostEids: frightenedGhostEids(this.learnUpgrades),
      playerInvulnerable: playerIsInvulnerable(this.learnUpgrades) || this.catchGraceMs > 0,
    };
  }

  private breakHyperspeedShield(): boolean {
    const spent = spendHyperspeedShield(this.learnUpgrades);
    if (spent === null) {
      return false;
    }
    this.learnUpgrades = spent;
    if (shieldBreakOwned(this.learnUpgrades.owned)) {
      this.firePowerPelletEffects(1);
      this.learnUpgrades = { ...this.learnUpgrades, hyperspeedShieldRemainingMs: 0 };
    }
    this.popup("SHIELD BROKEN");
    return true;
  }

  private resolveDemoCatch(caughtBy: number, twinAt: { x: number; y: number } | null): void {
    this.streakBar = createBonusBar();
    const defied = defyDeathActive(this.learnUpgrades);
    if (!defied && this.breakHyperspeedShield()) {
      return;
    }
    const spent = defied ? null : spendShield(this.learnUpgrades);
    if (spent !== null) {
      this.learnUpgrades = spent;
      if (shieldBreakOwned(this.learnUpgrades.owned)) {
        this.firePowerPelletEffects(1);
      }
      this.learnUpgrades = applyShieldBreakInvuln(this.learnUpgrades);
      this.popup("SHIELD BROKEN");
      return;
    }
    const owned = this.learnUpgrades.owned;
    if (this.learnUpgrades.simulacrumActive && simulacrumSavesLife(owned)) {
      this.popSimulacrum();
      if (twinAt === null) {
        this.learnUpgrades = applyShieldBreakInvuln(this.learnUpgrades);
      }
      this.popup("TWIN POPPED");
      return;
    }
    this.learnUpgrades = endSimulacrum(this.learnUpgrades);
    const lines: string[] = [];
    if (hasUpgrade(owned, "passiveDeathsHarvest")) {
      const harvested = harvestNearbyPellets(
        this.world,
        deathsHarvestRadiusTiles(owned),
        twinAt ?? undefined,
      );
      this.releaseAll(harvested);
      this.countCollected(harvested.length);
      lines.push(`HARVEST ${harvested.length}`);
    }
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

  private tickCornucopiaFruit(delta: number): void {
    if (fruitPersistsUntilLevelEnd(this.learnUpgrades.owned)) {
      return;
    }
    let expired = false;
    for (const [eid, ms] of this.cornucopiaFruit) {
      if (ms > delta) {
        this.cornucopiaFruit.set(eid, ms - delta);
        continue;
      }
      removeEntity(this.world, eid);
      this.releaseAll([eid]);
      this.cornucopiaFruit.delete(eid);
      expired = true;
    }
    if (expired && !this.fruitScheduled() && fruitPositions(this.world).length === 0) {
      this.fruitRespawnRemainingMs ??= FRUIT_RESPAWN_MS;
    }
  }

  private tickFruit(delta: number): void {
    const owned = this.learnUpgrades.owned;
    const scheduled = this.fruitScheduled();
    const stacksFruit = fruitStacksSideBySide(owned);
    this.msSinceFruitSpawn += Math.max(0, delta);
    this.flushPendingCornucopia();
    this.tickCornucopiaFruit(delta);
    if (scheduled) {
      const tick = tickFruitPresence(this.fruitPresence, this.boardCollected, delta, LEARN_LEVEL, {
        feastBase: fruitFeastThresholds(owned),
        lifetimeMul: fruitLifetimeMultiplier(owned),
        persist: fruitPersistsUntilLevelEnd(owned),
        stack: stacksFruit,
        blocked: this.cornucopiaFruit.size > 0 && !cornucopiaAlongsideOwned(owned),
      });
      this.fruitPresence = tick.state;
      if (tick.action === "spawn" || tick.action === "replace") {
        this.spawnFruitEntity(stacksFruit);
        this.boardCollected = 0;
        this.fruitPresence = { ...this.fruitPresence, nextThresholdIndex: 0 };
      } else if (tick.action === "despawn") {
        this.releaseAll(removeAllFruit(this.world, this.cornucopiaFruit));
      }
    } else if (this.fruitRespawnRemainingMs !== null) {
      this.fruitRespawnRemainingMs -= delta;
      if (this.fruitRespawnRemainingMs <= 0) {
        this.fruitRespawnRemainingMs = null;
        this.spawnFruitEntity();
      }
    }

    const twinAt = this.twinPosition();
    const removedFruitEids = [
      ...this.hyperspeedFruit,
      ...collectFruit(this.world),
      ...(twinAt === null ? [] : collectFruit(this.world, twinAt)),
    ];
    this.hyperspeedFruit = [];
    if (removedFruitEids.length === 0) {
      return;
    }
    this.releaseAll(removedFruitEids);
    this.events.push({ type: "sfx", id: "pelletMunch" }, { type: "sfx", id: "pelletMunch2" });
    const regularEaten = removedFruitEids.some((eid) => !this.cornucopiaFruit.has(eid));
    for (const eid of removedFruitEids) {
      this.cornucopiaFruit.delete(eid);
    }
    const fruitLeft = fruitPositions(this.world).length;
    if (scheduled) {
      if (regularEaten) {
        this.fruitPresence = markFruitCollected(
          this.fruitPresence,
          fruitLeft > this.cornucopiaFruit.size,
        );
      }
    } else if (regularEaten || fruitLeft === 0) {
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
    const step = stepNearMisses(this.world, this.nearMissPasses, catchOptions);
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
    const shieldCap = shieldBankCap(owned);
    if (shieldCap > 0) {
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
    const transferredEids = applyRemoteTransference(this.world, triggers);
    this.releaseAll(transferredEids);
    this.emitPelletSfx(transferredEids.length, 0);
    this.remoteTransferCounter += transferredEids.length;
  }

  private resetPellets(): void {
    this.remoteTransferCounter = 0;
    this.boardCollected = 0;
    this.pendingPowerRespawns = [];
    this.fruitPresence = createFruitPresence();
    if (this.fruitScheduled()) {
      this.clearAllFruit();
    }
    for (const eid of query(this.world, [Pellet])) {
      this.events.push({ type: "releaseDrawable", eid });
      removeEntity(this.world, eid);
    }
    this.spawnPellets();
  }

  private spawnPellets(): void {
    this.learnUpgrades = grantStartingShields(this.learnUpgrades);
    spawnBoardPellets(this.world);
    this.tagOptionalPellets();
  }

  private tagOptionalPellets(): void {
    tagOptionalPellets(this.world, lazyLooperRings(this.learnUpgrades.owned));
  }

  private rollFruitKind(): FruitKind {
    const rolled = takeFruitKind(
      this.fruitSequence,
      this.random.seed,
      LEARN_LEVEL,
      fruitKindsOnBoard(this.world),
    );
    this.fruitSequence = rolled.state;
    return rolled.kind;
  }

  private spawnFruitEntity(stack = false): void {
    if (!stack) {
      this.releaseAll(removeAllFruit(this.world, this.cornucopiaFruit));
      const kind = this.rollFruitKind();
      this.msSinceFruitSpawn = 0;
      spawnFruit(this.world, kind, fruitStackCenter(fruitPositions(this.world)) ?? undefined);
      return;
    }
    const center = fruitStackCenter(fruitPositions(this.world));
    if (center !== null) {
      const kind = this.rollFruitKind();
      this.msSinceFruitSpawn = 0;
      spawnFruit(this.world, kind, center);
    } else if (fruitPositions(this.world).length === 0) {
      this.fruitPresence = markFruitCollected(this.fruitPresence);
    }
  }

  private clearAllFruit(): void {
    this.releaseAll(removeAllFruit(this.world));
    this.cornucopiaFruit.clear();
    this.pendingCornucopia = null;
  }

  private flushPendingCornucopia(): void {
    if (this.pendingCornucopia === null) {
      return;
    }
    const mode = this.pendingCornucopia;
    this.pendingCornucopia = null;
    this.spawnCornucopiaFruit(mode);
  }

  private spawnCornucopiaFruit(mode: CornucopiaMode): void {
    const onBoard = fruitPositions(this.world);
    const decision = cornucopiaSpawnDecision(mode, onBoard.length, this.msSinceFruitSpawn);
    if (decision === "defer") {
      this.pendingCornucopia = mergeCornucopiaMode(this.pendingCornucopia, mode);
      return;
    }
    const at = fruitStackCenter(onBoard);
    if (decision === "skip" || at === null) {
      return;
    }
    const kind = this.rollFruitKind();
    this.msSinceFruitSpawn = 0;
    this.cornucopiaFruit.set(
      spawnFruit(this.world, kind, at),
      FRUIT_LIFETIME_MS * fruitLifetimeMultiplier(this.learnUpgrades.owned),
    );
    if (mode === "solo") {
      this.fruitRespawnRemainingMs = null;
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
    Ghost.releaseSlot[eid] = RELEASE_SLOT_BY_KIND[kind];
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
    hyperspeedRemainingMs: hasField("hyperspeedMs") ? state.hyperspeedRemainingMs : 0,
    hyperspeedTurnDelayMs: hasField("hyperspeedMs") ? state.hyperspeedTurnDelayMs : 0,
    hyperspeedShieldRemainingMs: hasField("hyperspeedShieldMs")
      ? state.hyperspeedShieldRemainingMs
      : 0,
    ghostHarvestRemainingMs: hasField("ghostHarvestMs") ? state.ghostHarvestRemainingMs : 0,
    defyDeathRemainingMs: hasField("defyDeathMs") ? state.defyDeathRemainingMs : 0,
    shieldsBanked: Math.min(state.shieldsBanked, shieldBankCap(owned)),
    pendingEchoes: echoEffects(owned) !== null ? state.pendingEchoes : [],
    wallDropArmed: hasField("armWallDrop") && state.wallDropArmed,
    simulacrumActive: hasField("simulacrum") && state.simulacrumActive,
    programmer: hasField("programmerSets") ? state.programmer : null,
    droppedWall: hasField("armWallDrop") ? state.droppedWall : null,
    ...(hasField("frightenGhostsMs")
      ? { hunterHeldEids: hunterHoldsEaten(owned) ? state.hunterHeldEids : [] }
      : NO_FRIGHT),
  };
}
