import { addComponent, addEntity, createWorld, query, removeEntity, type World } from "bitecs";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { RELEASE_SLOT_BY_KIND } from "../../domain/ghostRoster";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  PENNIES_PER_QUARTER,
  formatPennies,
  penniesInCharge,
  FRUIT_BONUS_CHARGE,
  applyStreakCrumbs,
  applyStreakPellets,
  createPennyPurse,
  tickStreakIdle,
  type PennyPurse,
  type Cell,
} from "../../domain/pennies";
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
import { FRUIT_KINDS } from "../fruitArt";
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
  isSolid,
  isWalkable,
  pelletCellCenters,
  worldToCol,
  worldToRow,
  type MazeTile,
} from "../../domain/maze";
import {
  GRAVE_FRUIT_KIND,
  GRAVE_LILIES_CHARGES_PER_LEVEL,
  takeGraveLiliesCharge,
} from "../../domain/graveLilies";
import { mergeBoredCells, TUNNEL_BORING_CHARGES_PER_LEVEL } from "../../domain/tunnelBoring";
import { bananaPeelSprites } from "../../domain/bananaPeel";
import type { TailBead } from "../../domain/charmTail";
import { ghostTouchingPeel, stepBananaPeelTail } from "../systems/bananaPeel";
import { playerExitedHorizontalTunnel, playerExitedTunnel } from "../../domain/tunnelExit";
import { GHOST_DRAWABLE_BY_KIND, ghostRadius, playerPreTurnPx } from "../../domain/playfield";
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
  tickTithe,
  titheSpeedMultiplier,
  titheStreakWeight,
  applyPowerPelletEffects,
  firingPowerUpgrades,
  applyShieldBreakInvuln,
  applyStreakEngineInvuln,
  streakEngineEvery,
  gleaningCharge,
  gleaningStreakSteps,
  bankShields,
  bankPeels,
  bananaPeelCap,
  grantStartingShields,
  powerPelletPickupFires,
  shieldBreakOwned,
  reactiveArmorOwned,
  reactiveArmorRadiusTiles,
  shieldOverflow,
  shieldPelletsCap,
  spendShield,
  spendPeel,
  HYPERSPEED_MUL,
  hyperspeedActive,
  hyperspeedMultiplier,
  spendHyperspeedShield,
  startHyperspeedTurnDelay,
  tickHyperspeed,
  createRunUpgrades,
  clearUpgradeTimers,
  clearStaleUpgradeTimers,
  pickFruitPowerBases,
  queueEcho,
  armHaunt,
  armPossession,
  endPossession,
  hauntedGhost,
  hauntedGhostEid,
  possessionActive,
  possessedGhostEid,
  possessionDurationMs,
  possessionHauntMs,
  tickHaunt,
  tickPossession,
  tickWallDrop,
  HAUNTING_MS,
  frozenGhostEid,
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
  type UpgradeId,
  remoteTransferEvery,
  eatFrightenedGhost,
  frightenedGhostEids,
  frightenedGhosts,
  hunterHoldsEaten,
  tickFrightened,
  type CornucopiaMode,
  endMirror,
  mirrorSavesLife,
} from "../../domain/upgrades";
import { shouldFireMartyr, shouldStartPossession } from "../../domain/possession";
import {
  advanceUpgradeTimers,
  upgradeTimerFractions,
  type UpgradeTimers,
} from "../../domain/upgradeTimers";
import {
  mirrorFacing,
  nearestBody,
  mirrorPopRender,
  tickMirrorPop,
  twinBeads,
  twinDesynced,
  twinTouchesPlayer,
  twinPoint,
  type BodyTile,
  type MirrorPop,
} from "../../domain/mirror";
import { remoteTransferTriggers } from "../../domain/pelletCollectExtra";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Crumb } from "../components/Crumb";
import { Pellet } from "../components/Pellet";
import { PowerPellet } from "../components/PowerPellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { wallPassSolids } from "../systems/wallPassSolids";
import { chaffSprites, decoyFacing, decoyPx, decoyTile, nearestDecoy } from "../../domain/chaff";
import { advanceChaff } from "../systems/chaff";
import { dropWallOnReversal, playerSolidsWithWall, trackWallOccupancy } from "../systems/wallDrop";
import {
  adoptTunnelBoringFacing,
  applyBoredCellsToActiveLayout,
  beginTunnelBore,
  NO_TUNNEL_BORE,
  openBoredCells,
  stepTunnelBore,
  tryTunnelBoring,
  tunnelBoringSpeedMul,
  type TunnelBore,
} from "../systems/tunnelBoring";
import {
  followProgrammer,
  holdPlayerForProgramming,
  programmerPath,
  recordProgrammerKeys,
} from "../systems/programmer";
import { programmerQueueSlots, type ProgrammerQueueSlot } from "../../domain/programmer";
import type { SolidGrid } from "../../domain/maze";
import { applyRemoteTransference } from "../systems/remoteTransference";
import {
  fruitKindsOnBoard,
  fruitPositions,
  fruitTiles,
  removeAllFruit,
} from "../systems/collectFruit";
import { leaveScent, scentFieldFor, scentSprites, tickScarecrow } from "../systems/scarecrow";
import {
  collectExtraForBodies,
  collectFruitForBodies,
  collectPelletsForBodies,
} from "../systems/collectBodies";
import { harvestPelletsByGhosts } from "../systems/ghostHarvest";
import { harvestPelletsByGhost } from "../systems/possessionHarvest";
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
  applyHeldKeysToEid,
  isPerpendicularTurn,
  type HeldKeys,
  type TurnTap,
} from "../systems/heldKeys";
import { settleShieldBounce, startShieldBounce, tickShieldBounce } from "../systems/shieldBounce";
import {
  NO_SHIELD_BOUNCE,
  maskStaleKeys,
  shieldBounceCatchSkips,
  shieldBounceHeldGhosts,
  shieldBounceSpriteOffsets,
  type ShieldBounce,
} from "../../domain/shieldBounce";
import { TURN_CATCH_GRACE_MS, tickTurnCatchGrace } from "../../domain/turnCatchGrace";
import { LearnHouseHold } from "./learnHouseHold";
import { LearnRecall } from "./learnRecall";
import { LearnRunState } from "./learnRunState";
import { playerFacing, playerPose } from "../systems/playerDirection";
import {
  startPowerPelletBreaks,
  tickPowerPelletBreaks,
  type ActivePowerPelletBreak,
} from "./powerPelletBreaks";
import {
  catchPlayer,
  edibleGhostsTouchingEid,
  edibleGhostsTouchingPlayer,
  type CatchOptions,
} from "../systems/catchPlayer";
import { frightenedGhostAi, frightenGhosts } from "../systems/ghostFrightened";
import { stepNearMisses } from "../systems/nearMiss";
import { crumbGhostCells, pelletCells, takeCrumbsAt } from "../systems/gleaning";
import { createGleaning, stepGleaning, type Gleaning } from "../../domain/gleaning";
import { createNearMissPasses, type NearMissPasses } from "../../domain/nearMiss";
import { harvestNearbyPellets } from "../systems/deathsHarvest";
import { pickReactiveArmorGhosts } from "../systems/reactiveArmor";
import { TurnTuningState, type TurnSparksBurst } from "../systems/turnTuningState";
import { movement } from "../systems/movement";
import { applyPelletToPowerConvert } from "../systems/pelletToPower";
import { enteringEmptyCell } from "../systems/enteringEmptyCell";
import {
  atTopSpeed,
  sonicStunnedEids,
  sonicStunSpriteOffsets,
  tickSonicHits,
} from "../../domain/sonicBoom";
import { forceGhostReverse } from "../systems/ghostReverse";
import { SonicBoomEchoes, movingOverClearedTile, stepSonicBoom } from "../systems/sonicBoom";
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
  isTrinketId,
  trinketCopies,
  trinketHouseDelayMs,
  type TrinketUpgradeId,
  withTrinketCopies,
  trinketPlayerSpeedMul,
  trinketPreTurnBonusPx,
} from "../../domain/trinkets";
import { GhostTractionState, playerInTunnel } from "../systems/trinketGhosts";
import type { SimEvent, SimRenderOptions } from "./simEvents";
import { playerCell } from "../systems/playerCell";
import { tagOptionalPellets } from "../systems/lazyLooper";
import {
  spawnBoardPellets,
  spawnCrumb,
  spawnFruit,
  spawnPellet,
  spawnPlayer,
  spawnWalls,
} from "./spawn";

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
  "powerPelletMirror",
  "passiveBananaShield",
  "passiveMartyr",
  "passivePossession",
  "passiveGraveLilies",
];

export class LearnSim {
  world: World = createWorld();
  readonly random: RunRandom;
  private events: SimEvent[] = [];
  private readonly ghostTraction = new GhostTractionState();
  private readonly sonicEchoes = new SonicBoomEchoes();
  private hyperspeedDirection: Direction | null = null;
  private turnCatchGraceMs = 0;
  private hyperspeedPellets: PlayerPelletFrame = emptyPlayerPelletFrame();
  private hyperspeedFruit: number[] = [];
  private selected: GhostKindId | null = null;
  private ghost: number | null = null;
  private helperBlinky: number | null = null;
  private learnUpgrades: RunUpgrades = createRunUpgrades();
  private upgradeTimers: UpgradeTimers = {};
  private firedUpgrades: BaseUpgradeId[] = [];
  private pulseCause: BaseUpgradeId | undefined;
  private eatenHoldGhostEids: number[] = [];
  private eatenHoldRemainingMs = 0;
  private tunnelBoringCharges = 0;
  private graveLiliesCharges = 0;
  private graveFruit = new Set<number>();
  private tunnelBoredCells: MazeTile[] = [];
  private tunnelBore: TunnelBore = NO_TUNNEL_BORE;
  private powerPelletBreaks: ActivePowerPelletBreak[] = [];
  private nextPowerPelletBreakId = 1;
  private warpGlide: WarpGlide | null = null;
  private speedTrail: SpeedTrail = [];
  private ghostCornerWarps: GhostCornerWarp[] = [];
  private shieldBounce: ShieldBounce = NO_SHIELD_BOUNCE;
  private peelTail: TailBead[] = [];
  private peelHeading = 0;
  private peelClockMs = 0;
  private bounceStaleKeys: HeldKeys | null = null;
  private fruitRespawnRemainingMs: number | null = null;
  private cornucopiaFruit = new Map<number, number>();
  private msSinceFruitSpawn = Infinity;
  private pendingCornucopia: CornucopiaMode | null = null;
  private remoteTransferCounter = 0;
  private readonly turnTuning = new TurnTuningState();
  private prevKeys: HeldKeys = NO_KEYS_HELD;
  private pendingPowerRespawns: PendingPowerPelletRespawn[] = [];
  private readonly runState = new LearnRunState();
  private mirrorPop: MirrorPop | null = null;
  private readonly houseHold = new LearnHouseHold();
  private readonly recalled = new LearnRecall();
  private houseHoldEaten = 0;
  private catchGraceMs = 0;
  private nearMissPasses: NearMissPasses = createNearMissPasses();
  private streakBar: PennyPurse = createPennyPurse();
  private gleaning: Gleaning = createGleaning();
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
    const chaff = this.learnUpgrades.chaff;
    const baseCtx = ghostAiContext(this.world, undefined, chaff?.decoys);
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
    const decoy = nearestDecoy(chaff?.decoys ?? [], worldToCol(ghostX), worldToRow(ghostY));
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
      playerTile: decoy === null ? ctx.player : { ...decoyTile(decoy), facing: decoyFacing(decoy) },
      blinkyTile: ctx.blinky,
      playerPx:
        decoy !== null
          ? decoyPx(decoy)
          : (twinPosition ??
            (playerEid === undefined
              ? null
              : { x: Position.x[playerEid] ?? 0, y: Position.y[playerEid] ?? 0 })),
      blinkyPx: helper === null ? null : { x: Position.x[helper] ?? 0, y: Position.y[helper] ?? 0 },
      ghostPx: { x: ghostX, y: ghostY },
      ghostFacing,
    };
  }

  get ownedUpgrades(): readonly UpgradeId[] {
    return this.learnUpgrades.owned;
  }

  upgradeTimerFractions(): Partial<Record<BaseUpgradeId, number>> {
    return upgradeTimerFractions(this.upgradeTimers);
  }

  start(): SimEvent[] {
    this.events = [];
    activateLayout("mazeLearn");
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
    const bouncing = this.shieldBounce.player !== null;
    const diagonalAllowed = wallPassActive(this.learnUpgrades);
    const programming = this.learnUpgrades.programmer !== null;
    const possessing = possessionActive(this.learnUpgrades);
    const possessedEid = possessedGhostEid(this.learnUpgrades);
    const turnTuningOpts =
      !diagonalAllowed &&
      !programming &&
      !possessing &&
      hasUpgrade(this.learnUpgrades.owned, "passiveTurnTuning")
        ? { prevKeys: this.prevKeys, solids: getActiveLayout().playerSolids }
        : undefined;
    let turnTap: TurnTap | null = null;
    if (possessing && possessedEid !== null) {
      applyHeldKeysToEid(possessedEid, keys);
      for (const eid of query(this.world, [Player, Input])) {
        Input.direction[eid] = DIRECTION.none;
      }
    } else if (programming) {
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
    } else if (!warping && !bouncing) {
      turnTap = applyHeldKeys(this.world, maskStaleKeys(keys, this.bounceStaleKeys), {
        diagonalAllowed,
        turnTuning: turnTuningOpts,
      });
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
    const prevKeys = this.prevKeys;
    this.prevKeys = keys;
    const levelSpeedMul = speedLevelMultiplier(LEARN_LEVEL);

    this.learnUpgrades = tickFreeze(this.learnUpgrades, delta);
    this.learnUpgrades = tickSonicHits(this.learnUpgrades, delta);
    const wasWallPass = wallPassActive(this.learnUpgrades);
    this.learnUpgrades = tickWallPass(this.learnUpgrades, delta);
    if (wasWallPass && !wallPassActive(this.learnUpgrades)) {
      snapPlayerToNearestWalkable(this.world);
    }
    this.learnUpgrades = tickInvuln(this.learnUpgrades, delta);
    this.turnCatchGraceMs = tickTurnCatchGrace(this.turnCatchGraceMs, delta);
    this.learnUpgrades = tickSpeedBurst(this.learnUpgrades, delta);
    this.learnUpgrades = tickHyperspeed(this.learnUpgrades, delta);
    if (!hyperspeedActive(this.learnUpgrades)) {
      this.hyperspeedDirection = null;
    }
    this.learnUpgrades = tickGhostHarvest(this.learnUpgrades, delta);
    this.learnUpgrades = tickTithe(this.learnUpgrades, delta);
    this.learnUpgrades = tickDefyDeath(this.learnUpgrades, delta);
    this.learnUpgrades = tickWallDrop(this.learnUpgrades, delta);
    this.tickChaff(delta);
    this.fireDueEchoes(delta);
    this.tickHaunt(delta);
    if (possessionActive(this.learnUpgrades)) {
      const possessed = this.learnUpgrades.possessedGhostEid;
      this.learnUpgrades = tickPossession(this.learnUpgrades, delta);
      if (!possessionActive(this.learnUpgrades)) {
        this.finishLearnPossession(possessed);
      }
    } else {
      this.tickFright(delta);
    }
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
    const rawPlayerSpeedMul =
      programmerPhase === "recording" || warping || bouncing || possessing
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
              this.turnTuning.speedMultiplier(this.learnUpgrades.owned) *
              trinketPlayerSpeedMul(this.learnUpgrades.owned, playerInTunnel(this.world));
    applyPlayerSpeed(
      this.world,
      rawPlayerSpeedMul *
        titheSpeedMultiplier(this.learnUpgrades, this.learnUpgrades.owned) *
        tunnelBoringSpeedMul(this.world, this.tunnelBore),
    );
    this.ghostTraction.tick(this.world, this.learnUpgrades.owned, delta);
    applyGhostSpeed(this.world, NO_ELROY_PELLETS, LEARN_LEVEL, {
      extraSpeedMul: this.ghostTraction.speedMultiplier(this.learnUpgrades.owned),
      ghostSpeedMul: levelSpeedMul * ghostSpeedMultiplier(this.learnUpgrades.owned),
      frozenGhostEid: frozenGhostEid(this.learnUpgrades),
      heldGhostEids: new Set([
        ...heldGhostEids(this.ghostCornerWarps),
        ...shieldBounceHeldGhosts(this.shieldBounce),
        ...sonicStunnedEids(this.learnUpgrades, this.learnUpgrades.owned),
      ]),
      frightenedGhostEids: frightenedGhostEids(this.learnUpgrades),
      tunnelSpeedRatio: ghostTunnelSpeedRatio(this.learnUpgrades.owned),
    });
    this.stepTunnelBoring(prevKeys, keys, delta);
    const facingBeforeMove = playerFacing(this.world);
    const positionBeforeMove = this.playerPosition();
    const playerSolids = this.playerSolids();
    this.shieldBounce = tickShieldBounce(this.world, this.shieldBounce, delta, {
      playerSolids,
      ghostsBlockTunnels: ghostsBlockedFromTunnels(this.learnUpgrades.owned),
      blockTunnelRow: null,
      droppedWall: this.learnUpgrades.droppedWall,
    });
    const moveFrame = (frameDelta: number): void => {
      movement(
        this.world,
        frameDelta,
        playerSolids,
        playerPreTurnPx() + trinketPreTurnBonusPx(this.learnUpgrades.owned),
        ghostsBlockedFromTunnels(this.learnUpgrades.owned),
        null,
        this.learnUpgrades.droppedWall,
      );
      this.learnUpgrades = trackWallOccupancy(this.world, this.learnUpgrades);
    };
    if (bouncing) {
      moveFrame(delta);
    } else if (programmerPhase === "running") {
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
    const facingAfterMove = playerFacing(this.world);
    this.noteTurnCatchGrace(facingBeforeMove, facingAfterMove);
    this.pushTurnSparks(
      this.turnTuning.afterMove(
        this.world,
        this.learnUpgrades.owned,
        facingBeforeMove,
        facingAfterMove,
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
    const owned = this.learnUpgrades.owned;
    const atSpeed = atTopSpeed(
      owned,
      this.speedTrailActive(),
      movingOverClearedTile(this.world),
      false,
    );
    const boom = stepSonicBoom(this.world, this.sonicEchoes, this.learnUpgrades, owned, atSpeed);
    this.learnUpgrades = boom.state;
    if (boom.reversed.length > 0) {
      forceGhostReverse(this.world, false, new Set(boom.reversed));
    }
    for (const echo of boom.echoes) {
      this.events.push({ type: "sonicBoomEcho", ...echo });
    }

    this.tickMirror(delta);
    const playerFrame = possessionActive(this.learnUpgrades)
      ? emptyPlayerPelletFrame()
      : mergePlayerPelletFrames(this.hyperspeedPellets, this.collectBodyPellets());
    this.hyperspeedPellets = emptyPlayerPelletFrame();
    const ghostFrame = ghostHarvestActive(this.learnUpgrades)
      ? harvestPelletsByGhosts(this.world)
      : { powerRemoved: 0, removedEids: [], removedPowerPositions: [] };
    const possessed = possessedGhostEid(this.learnUpgrades);
    const possessionFrame =
      possessed === null
        ? { powerRemoved: 0, removedEids: [] as number[], removedPowerPositions: [] }
        : harvestPelletsByGhost(this.world, possessed);
    const removedEids = [
      ...playerFrame.removedEids,
      ...ghostFrame.removedEids,
      ...possessionFrame.removedEids,
    ];
    const powerRemoved =
      playerFrame.powerRemoved + ghostFrame.powerRemoved + possessionFrame.powerRemoved;
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
    this.learnUpgrades = tickScarecrow(this.learnUpgrades, this.learnUpgrades.owned, delta);

    ghostAi(
      this.world,
      GHOST_AI_MODE.chase,
      NO_ELROY_PELLETS,
      undefined,
      ghostsBlockedFromTunnels(this.learnUpgrades.owned),
      new Set([
        ...frightenedGhostEids(this.learnUpgrades),
        ...(possessedGhostEid(this.learnUpgrades) === null
          ? []
          : [possessedGhostEid(this.learnUpgrades)!]),
      ]),
      null,
      this.learnUpgrades.droppedWall,
      this.twinBody(),
      this.learnUpgrades.chaff?.decoys,
      scentFieldFor(this.learnUpgrades.owned, this.world, this.learnUpgrades.scentLingers),
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
    this.stepPeelTail(delta);
    if (!this.tryBreakPeel(catchOptions)) {
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
        this.resolveDemoCatch(caught, playerCaught === null ? twinAt : null, keys);
      }
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
        possessedGhostEid: possessedGhostEid(this.learnUpgrades),
        ...(possessionActive(this.learnUpgrades) ? { playerAlpha: 0 } : {}),
        playerWarpGlide: this.warpGlide === null ? undefined : warpGlideSprites(this.warpGlide),
        playerSpeedTrail: this.speedTrailActive()
          ? speedTrailSprites(this.speedTrail, getActiveLayout().tileSize)
          : undefined,
        ghostWarpGlides: ghostWarpGlideSprites(this.ghostCornerWarps),
        spriteOffsets: sonicStunSpriteOffsets(
          this.learnUpgrades,
          this.learnUpgrades.owned,
          shieldBounceSpriteOffsets(this.shieldBounce, getActiveLayout().tileSize),
        ),
        boreJunk: this.tunnelBore.junk,
        scent: scentSprites(this.learnUpgrades.owned, this.world, this.learnUpgrades.scentLingers),
        hauntedGhost: hauntedGhost(this.learnUpgrades),
        frightenedGhosts: frightenedGhosts(this.learnUpgrades),
        droppedWall: this.learnUpgrades.droppedWall,
        chaff: chaffSprites(this.learnUpgrades.chaff),
        shields: this.learnUpgrades.shieldsBanked,
        peels: bananaPeelSprites(this.peelBeads()),
        programmerQueue: this.programmerQueue(),
        programmerPath: programmerPath(
          this.world,
          this.learnUpgrades.programmer,
          this.playerSolids(),
        ),
        mirror: this.twinRenderBody(),
        mirrorPop: mirrorPopRender(this.mirrorPop),
      },
    });
    const { timers, pulses } = advanceUpgradeTimers(
      this.upgradeTimers,
      this.learnUpgrades,
      this.firedUpgrades,
    );
    this.upgradeTimers = timers;
    this.firedUpgrades = [];
    const cause = this.pulseCause;
    this.pulseCause = undefined;
    if (pulses.length > 0 || cause !== undefined) {
      this.events.push({ type: "upgradePulse", ids: pulses, cause });
    }
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
    this.streakBar = createPennyPurse();
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
    this.mirrorPop = null;
    this.hyperspeedDirection = null;
    this.turnCatchGraceMs = 0;
    this.hyperspeedPellets = emptyPlayerPelletFrame();
    this.hyperspeedFruit = [];
    this.eatenHoldGhostEids = [];
    this.eatenHoldRemainingMs = 0;
    this.ghostCornerWarps = [];
    this.shieldBounce = NO_SHIELD_BOUNCE;
    if (this.houseHoldWanted(this.learnUpgrades.owned)) {
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
    if (turningOn && baseIdOf(id) === "passiveTunnelBoring") {
      this.tunnelBoringCharges = TUNNEL_BORING_CHARGES_PER_LEVEL;
    }
    if (!turningOn && baseIdOf(id) === "passiveTunnelBoring") {
      this.tunnelBoringCharges = 0;
    }
    if (baseIdOf(id) === "passiveGraveLilies") {
      this.graveLiliesCharges = turningOn ? GRAVE_LILIES_CHARGES_PER_LEVEL : 0;
    }
    if (baseIdOf(id) === "passiveLazyLooper") {
      this.tagOptionalPellets();
    }
    return this.takeEvents();
  }

  upgradeCopies(id: TrinketUpgradeId): number {
    return trinketCopies(this.learnUpgrades.owned, id);
  }

  adjustUpgradeCopies(id: TrinketUpgradeId, delta: number): SimEvent[] {
    this.events = [];
    const current = this.upgradeCopies(id);
    if (current > 0) {
      this.applyToggled({
        ...this.learnUpgrades,
        owned: withTrinketCopies(this.learnUpgrades.owned, id, current + delta),
      });
    }
    return this.takeEvents();
  }

  toggleEnhanced(baseId: BaseUpgradeId): SimEvent[] {
    this.events = [];
    const current = ownedFormOf(this.learnUpgrades.owned, baseId);
    if (current === null || isTrinketId(baseId)) {
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
    this.syncHouseHold(this.houseHoldWanted(before));
    this.syncFruitMode(wasScheduled, fruitLifetimeMultiplier(after) / lifetimeBefore);
  }

  private houseHoldWanted(owned: readonly UpgradeId[]): boolean {
    return (
      hasUpgrade(owned, "passiveGhostHouseDelay") ||
      (this.selected !== null && trinketHouseDelayMs(owned, this.selected) > 0)
    );
  }

  private syncHouseHold(wasOwned: boolean): void {
    const owned = this.houseHoldWanted(this.learnUpgrades.owned);
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

  tunnelBoringDebug(): { charges: number; openCells: number; junkCells: number; slowed: boolean } {
    return {
      charges: this.tunnelBoringCharges,
      openCells: openBoredCells(this.tunnelBoredCells, this.tunnelBore).length,
      junkCells: this.tunnelBore.junk.length,
      slowed: tunnelBoringSpeedMul(this.world, this.tunnelBore) < 1,
    };
  }

  hauntDebug(): { caged: boolean; inHouse: boolean } {
    const eid = hauntedGhostEid(this.learnUpgrades);
    return {
      caged: eid !== null,
      inHouse: eid !== null && GhostPhase.value[eid] === GHOST_PHASE.inHouse,
    };
  }

  playerWorldPosition(): { x: number; y: number } | null {
    return this.playerPosition();
  }

  private playerPosition(): { x: number; y: number } | null {
    const eid = query(this.world, [Player, Position])[0];
    return eid === undefined ? null : { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
  }

  private noteTunnelExit(before: { x: number; y: number } | null): void {
    const after = this.playerPosition();
    if (this.learnUpgrades.mirrorActive && playerExitedHorizontalTunnel(before, after)) {
      this.popMirror();
    }
    if (playerExitedTunnel(before, after)) {
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
    if (bananaPeelCap(owned) !== null) {
      this.learnUpgrades = bankPeels(this.learnUpgrades, powerRemoved);
    }
    const fires = powerPelletPickupFires(owned, powerRemoved, overflow);
    if (fires > 0) {
      this.firePowerPelletEffects(fires);
    }
  }

  private peelBeads(): TailBead[] {
    return this.learnUpgrades.mirrorActive
      ? [...this.peelTail, ...twinBeads(this.peelTail, getActiveLayout())]
      : this.peelTail;
  }

  private stepPeelTail(delta: number): void {
    this.peelClockMs += Math.max(0, delta);
    const solids = this.playerSolids();
    const stepped = stepBananaPeelTail(
      this.world,
      this.peelTail,
      this.learnUpgrades.peelsBanked,
      {
        dtMs: delta,
        nowMs: this.peelClockMs,
        motion: 1,
        blocked: (x, y) => isSolid(worldToCol(x), worldToRow(y), solids),
      },
      this.peelHeading,
    );
    this.peelTail = stepped.beads;
    this.peelHeading = stepped.heading;
  }

  private tryBreakPeel(catchOptions: CatchOptions): boolean {
    if (this.learnUpgrades.peelsBanked <= 0) {
      return false;
    }
    const ghostEid = ghostTouchingPeel(this.world, this.peelBeads(), catchOptions);
    if (ghostEid === null) {
      return false;
    }
    return this.breakPeel(ghostEid);
  }

  private breakPeel(ghostEid: number): boolean {
    const spent = spendPeel(this.learnUpgrades);
    if (spent === null) {
      return false;
    }
    this.learnUpgrades = spent;
    this.streakBar = createPennyPurse();
    const solids = this.playerSolids();
    const resized = stepBananaPeelTail(
      this.world,
      this.peelTail,
      this.learnUpgrades.peelsBanked,
      {
        dtMs: 0,
        nowMs: this.peelClockMs,
        motion: 0,
        blocked: (x, y) => isSolid(worldToCol(x), worldToRow(y), solids),
      },
      this.peelHeading,
    );
    this.peelTail = resized.beads;
    this.peelHeading = resized.heading;
    for (const bead of resized.dropped) {
      this.events.push({ type: "peelCrack", x: bead.x, y: bead.y });
    }
    const bounce = startShieldBounce(this.world, ghostEid, { bouncePlayer: false });
    this.fireReactiveArmor(ghostEid);
    if (shieldBreakOwned(this.learnUpgrades.owned)) {
      this.firePowerPelletEffects(1);
    }
    if (bounce === null) {
      this.learnUpgrades = applyShieldBreakInvuln(this.learnUpgrades);
    } else {
      this.shieldBounce = settleShieldBounce(
        this.shieldBounce,
        bounce,
        this.warpGlide !== null,
        heldGhostEids(this.ghostCornerWarps),
      );
    }
    return true;
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

  private tickChaff(delta: number): void {
    const result = advanceChaff(
      this.world,
      this.learnUpgrades.chaff,
      delta,
      this.random.stream("chaff"),
    );
    this.learnUpgrades = { ...this.learnUpgrades, chaff: result.state };
    for (const tile of result.burst) {
      this.events.push({ type: "chaffBurst", x: cellCenterX(tile.col), y: cellCenterY(tile.row) });
    }
  }

  private firePowerPelletEffects(powerRemoved: number, echoBases?: readonly BaseUpgradeId[]): void {
    if (powerRemoved > 0) {
      this.firedUpgrades.push(
        ...firingPowerUpgrades(this.learnUpgrades.owned, echoBases).map(baseIdOf),
      );
    }
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
        frightenedGhostEids: frightenGhosts(this.world, null),
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
      this.releaseAll(
        collectExtraForBodies(this.world, powerEffects.collectExtraPellets, this.twinPosition()),
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
    if (powerEffects.cornucopiaFruit !== null) {
      this.spawnCornucopiaFruit(powerEffects.cornucopiaFruit);
    }
    if (powerEffects.tunnelBoringRecharge) {
      this.tunnelBoringCharges = TUNNEL_BORING_CHARGES_PER_LEVEL;
    }
    if (powerEffects.graveLiliesRecharge) {
      this.graveLiliesCharges = GRAVE_LILIES_CHARGES_PER_LEVEL;
    }
  }

  private openBoredSteps(opened: readonly MazeTile[]): void {
    if (opened.length > 0) {
      applyBoredCellsToActiveLayout(openBoredCells(this.tunnelBoredCells, this.tunnelBore));
    }
  }

  private stepTunnelBoring(prevKeys: HeldKeys, keys: HeldKeys, delta: number): void {
    const stepped = stepTunnelBore(this.world, this.tunnelBore, delta, () => false);
    this.tunnelBore = stepped.bore;
    this.openBoredSteps(stepped.opened);
    if (!hasUpgrade(this.learnUpgrades.owned, "passiveTunnelBoring")) {
      return;
    }
    const attempt = tryTunnelBoring(this.world, this.tunnelBoringCharges, prevKeys, keys);
    if (attempt === null) {
      return;
    }
    this.tunnelBoredCells = mergeBoredCells(this.tunnelBoredCells, attempt.cells);
    this.tunnelBoringCharges = attempt.charges;
    const begun = beginTunnelBore(this.tunnelBore, attempt, () => false);
    this.tunnelBore = begun.bore;
    this.openBoredSteps(begun.opened);
    adoptTunnelBoringFacing(this.world, attempt.direction);
  }

  private stepStreakEngine(cells: readonly Cell[], delta: number): void {
    const every = streakEngineEvery(this.learnUpgrades.owned);
    if (every === null) {
      this.streakBar = createPennyPurse();
      return;
    }
    let fires = 0;
    if (cells.length === 0) {
      this.streakBar = tickStreakIdle(this.streakBar, delta);
    } else {
      const prevStreak = this.streakBar.streak;
      const weight = titheStreakWeight(this.learnUpgrades, this.learnUpgrades.owned);
      this.streakBar = applyStreakPellets(this.streakBar, cells, weight).bar;
      for (const pop of streakPops(prevStreak, this.streakBar.streak, every, weight)) {
        const cell = cells[pop.cellIndex]!;
        this.events.push({
          type: "streakPop",
          value: pop.value,
          x: cellCenterX(cell.col),
          y: cellCenterY(cell.row),
        });
      }
      fires = streakEngineFires(prevStreak, this.streakBar.streak, every);
    }
    fires += this.gleanCrumbs(every);
    for (let fired = 0; fired < fires; fired += 1) {
      this.resolvePowerPelletTrigger(1);
      this.learnUpgrades = applyStreakEngineInvuln(this.learnUpgrades, this.learnUpgrades.owned);
    }
  }

  private gleanCrumbs(every: number): number {
    for (const eid of takeCrumbsAt(this.world, playerCell(this.world))) {
      this.events.push({ type: "releaseDrawable", eid });
    }
    const steps = gleaningStreakSteps(this.learnUpgrades.owned);
    if (steps === 0) {
      return 0;
    }
    const step = stepGleaning(
      this.gleaning,
      crumbGhostCells(this.world, frightenedGhostEids(this.learnUpgrades)),
      pelletCells(this.world),
      this.streakBar.streak > 0,
    );
    this.gleaning = step.state;
    if (step.crumbs.length === 0) {
      return 0;
    }
    const paid = gleaningCharge(this.learnUpgrades.owned) > 0;
    for (const cell of step.crumbs) {
      spawnCrumb(this.world, cellCenterX(cell.col), cellCenterY(cell.row), paid);
    }
    const prevStreak = this.streakBar.streak;
    this.streakBar = applyStreakCrumbs(this.streakBar, step.crumbs.length * steps).bar;
    return streakEngineFires(prevStreak, this.streakBar.streak, every);
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
    const edible = new Set(
      [...frightenedGhostEids(this.learnUpgrades)].filter((eid) => !gliding.has(eid)),
    );
    const possessed = possessedGhostEid(this.learnUpgrades);
    const eaten =
      possessed === null
        ? edibleGhostsTouchingPlayer(this.world, edible)
        : edibleGhostsTouchingEid(this.world, possessed, edible);
    for (const eid of eaten) {
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
      this.runState.addPennyCharge(ate.charge);
      this.popup(`+${formatPennies(ate.charge)}`);
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
    const player = this.learnUpgrades.mirrorActive ? this.playerPosition() : null;
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

  private popMirror(): void {
    const position = this.twinPosition();
    this.learnUpgrades = endMirror(this.learnUpgrades);
    if (position !== null) {
      this.mirrorPop = { ...position, elapsedMs: 0 };
    }
  }

  private tickMirror(delta: number): void {
    this.mirrorPop = tickMirrorPop(this.mirrorPop, delta);
    const cell = playerCell(this.world);
    const player = this.playerPosition();
    if (
      this.learnUpgrades.mirrorActive &&
      cell !== null &&
      player !== null &&
      (twinDesynced(this.playerSolids(), cell) || twinTouchesPlayer(player, getActiveLayout()))
    ) {
      this.popMirror();
    }
  }

  private twinRenderBody(): NonNullable<SimRenderOptions["mirror"]> | null {
    const position = this.twinPosition();
    return position === null
      ? null
      : { ...position, facing: mirrorFacing(playerFacing(this.world)) };
  }

  private collectBodyPellets(): PlayerPelletFrame {
    return collectPelletsForBodies(
      this.world,
      {
        radiusBonusPx: pelletCollectRadiusBonusPx(this.learnUpgrades.owned),
        solids: getActiveLayout().playerSolids,
      },
      this.twinPosition(),
    );
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
    let facingBefore = playerFacing(this.world);
    runHyperspeedSubsteps(this.world, delta, {
      moveFrame: (frameDelta) => {
        facingBefore = playerFacing(this.world);
        moveFrame(frameDelta);
      },
      afterStep: () => {
        afterStep();
        this.noteTurnCatchGrace(facingBefore, playerFacing(this.world));
      },
      collect: () => {
        this.hyperspeedPellets = mergePlayerPelletFrames(
          this.hyperspeedPellets,
          this.collectBodyPellets(),
        );
        this.hyperspeedFruit.push(...collectFruitForBodies(this.world, this.twinPosition()));
        this.eatFrightenedGhosts();
        const options = this.catchOptions();
        if (this.tryBreakPeel(options)) {
          return false;
        }
        const twinAt = this.twinPosition();
        const hit =
          catchPlayer(this.world, options) ??
          (twinAt === null ? null : catchPlayer(this.world, { ...options, at: twinAt }));
        return (
          hit !== null && (defyDeathActive(this.learnUpgrades) || !this.breakHyperspeedShield(hit))
        );
      },
      halt: () => applyPlayerSpeed(this.world, 0),
    });
  }

  private noteHyperspeedTurn(): void {
    const facing = playerFacing(this.world);
    const previous = this.hyperspeedDirection;
    const turn = noteHyperspeedFacing(
      previous,
      facing,
      this.learnUpgrades.hyperspeedTurnDelayMs > 0,
    );
    this.hyperspeedDirection = turn.lastDirection;
    if (turn.turned) {
      this.learnUpgrades = startHyperspeedTurnDelay(this.learnUpgrades);
      applyPlayerSpeed(this.world, 0);
      if (previous !== null) {
        this.noteTurnCatchGrace(previous, facing);
      }
    }
  }

  private noteTurnCatchGrace(facingBefore: Direction, facingAfter: Direction): void {
    if (!isPerpendicularTurn(facingBefore, facingAfter)) {
      return;
    }
    this.turnCatchGraceMs = Math.max(this.turnCatchGraceMs, TURN_CATCH_GRACE_MS);
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
      skipGhostEids: new Set([
        ...glidingGhostEids(this.ghostCornerWarps),
        ...shieldBounceCatchSkips(this.shieldBounce),
        ...sonicStunnedEids(this.learnUpgrades, this.learnUpgrades.owned),
        ...(possessedGhostEid(this.learnUpgrades) === null
          ? []
          : [possessedGhostEid(this.learnUpgrades)!]),
      ]),
      edibleGhostEids: frightenedGhostEids(this.learnUpgrades),
      playerInvulnerable:
        playerIsInvulnerable(this.learnUpgrades) ||
        this.catchGraceMs > 0 ||
        possessionActive(this.learnUpgrades),
      turnCatchGrace: this.turnCatchGraceMs > 0,
    };
  }

  private breakHyperspeedShield(caughtBy: number | null): boolean {
    const spent = spendHyperspeedShield(this.learnUpgrades);
    if (spent === null) {
      return false;
    }
    this.learnUpgrades = spent;
    this.fireReactiveArmor(caughtBy);
    if (shieldBreakOwned(this.learnUpgrades.owned)) {
      this.firePowerPelletEffects(1);
      this.learnUpgrades = { ...this.learnUpgrades, hyperspeedShieldRemainingMs: 0 };
    }
    return true;
  }

  private fireReactiveArmor(caughtBy: number | null): void {
    const owned = this.learnUpgrades.owned;
    if (!reactiveArmorOwned(owned)) {
      return;
    }
    const eids = pickReactiveArmorGhosts(this.world, {
      contactEid: caughtBy,
      radiusTiles: reactiveArmorRadiusTiles(owned),
    });
    this.recalled.sendHome(this.world, eids, owned, this.houseHoldEaten);
  }

  private resolveDemoCatch(
    caughtBy: number,
    twinAt: { x: number; y: number } | null,
    keys: HeldKeys,
  ): void {
    this.streakBar = createPennyPurse();
    const defied = defyDeathActive(this.learnUpgrades);
    if (!defied && this.breakHyperspeedShield(caughtBy)) {
      return;
    }
    const spent = defied ? null : spendShield(this.learnUpgrades);
    if (spent !== null) {
      this.learnUpgrades = spent;
      const bounce = twinAt === null ? startShieldBounce(this.world, caughtBy) : null;
      this.fireReactiveArmor(caughtBy);
      if (shieldBreakOwned(this.learnUpgrades.owned)) {
        this.firePowerPelletEffects(1);
      }
      if (bounce === null) {
        this.learnUpgrades = applyShieldBreakInvuln(this.learnUpgrades);
      } else {
        this.shieldBounce = settleShieldBounce(
          this.shieldBounce,
          bounce,
          this.warpGlide !== null,
          heldGhostEids(this.ghostCornerWarps),
        );
        this.bounceStaleKeys = keys;
      }
      return;
    }
    const owned = this.learnUpgrades.owned;
    if (this.learnUpgrades.mirrorActive && mirrorSavesLife(owned)) {
      this.popMirror();
      if (twinAt === null) {
        this.learnUpgrades = applyShieldBreakInvuln(this.learnUpgrades);
      }
      this.popup("TWIN POPPED");
      return;
    }
    this.learnUpgrades = endMirror(this.learnUpgrades);
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
    const saved = outcome.kind === "saved";
    const lifeLost = outcome.kind === "lost" || outcome.kind === "reset";
    const fellAt = twinAt ?? this.playerPosition();
    if (!saved && fellAt !== null) {
      this.dropGraveFruit(fellAt);
    }
    lines.push(
      outcome.kind === "saved" ? "SAVED" : outcome.kind === "reset" ? "LIVES RESET" : "LIFE LOST",
    );
    if (
      shouldFireMartyr(owned, {
        infiniteLives: false,
        lifeLost,
        saved,
      })
    ) {
      this.pulseCause = "passiveMartyr";
      this.firePowerPelletEffects(1);
      lines.push("MARTYR");
    }
    if (
      shouldStartPossession(owned, {
        infiniteLives: false,
        lifeLost,
        lava: false,
        caughtBy,
      })
    ) {
      const duration = possessionDurationMs(owned) ?? 0;
      const others = [...query(this.world, [Ghost, GhostPhase])].filter(
        (eid) => eid !== caughtBy && GhostPhase.value[eid] !== GHOST_PHASE.inHouse,
      );
      this.learnUpgrades = armPossession(this.learnUpgrades, caughtBy, duration, others);
      lines.push("POSSESSING");
      this.popup(lines.join("\n"));
      return;
    }
    const hauntCatcher = hasUpgrade(owned, "passiveHaunting") ? caughtBy : null;
    if (hauntCatcher !== null) {
      this.releaseHauntedGhost();
      this.seatGhostInHouse(hauntCatcher);
      this.learnUpgrades = armHaunt(this.learnUpgrades, hauntCatcher, HAUNTING_MS);
      lines.push("HAUNTED");
    }
    if (outcome.kind === "saved") {
      const player = this.playerPosition();
      if (player !== null) {
        const warps = teleportGhostsToCorners(this.world, 0, {
          onlyOnCell: { col: worldToCol(player.x), row: worldToRow(player.y) },
          excludeEid: hauntCatcher,
        });
        this.ghostCornerWarps = mergeGhostCornerWarps(this.ghostCornerWarps, warps);
      }
    }
    if (outcome.quartersPaid > 0) {
      lines.push(`-${outcome.quartersPaid} Q`);
    }
    if (outcome.bountyCharge > 0) {
      lines.push(`+${formatPennies(outcome.bountyCharge)}`);
    }
    this.catchGraceMs = LEARN_CATCH_GRACE_MS;
    this.popup(lines.join("\n"));
  }

  private finishLearnPossession(possessedEid: number | null): void {
    const hauntMs = possessionHauntMs(this.learnUpgrades.owned);
    this.learnUpgrades = endPossession(this.learnUpgrades);
    if (possessedEid !== null && hauntMs !== null) {
      this.releaseHauntedGhost();
      this.seatGhostInHouse(possessedEid);
      this.learnUpgrades = armHaunt(this.learnUpgrades, possessedEid, hauntMs);
      this.popup("POSSESSED\nHAUNTED");
    } else {
      this.popup("POSSESSED");
    }
    this.catchGraceMs = LEARN_CATCH_GRACE_MS;
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
        this.releaseAll(removeAllFruit(this.world, this.sideFruit()));
      }
    } else if (this.fruitRespawnRemainingMs !== null) {
      this.fruitRespawnRemainingMs -= delta;
      if (this.fruitRespawnRemainingMs <= 0) {
        this.fruitRespawnRemainingMs = null;
        this.spawnFruitEntity();
      }
    }

    const fruitTilesBefore = fruitTiles(this.world);
    const removedFruitEids = [
      ...this.hyperspeedFruit,
      ...collectFruitForBodies(this.world, this.twinPosition()),
    ];
    this.hyperspeedFruit = [];
    if (removedFruitEids.length === 0) {
      return;
    }
    this.releaseAll(removedFruitEids);
    this.learnUpgrades = leaveScent(this.learnUpgrades, owned, removedFruitEids, fruitTilesBefore);
    this.events.push({ type: "sfx", id: "pelletMunch" }, { type: "sfx", id: "pelletMunch2" });
    const regularEaten = removedFruitEids.some(
      (eid) => !this.cornucopiaFruit.has(eid) && !this.graveFruit.has(eid),
    );
    for (const eid of removedFruitEids) {
      this.cornucopiaFruit.delete(eid);
      this.graveFruit.delete(eid);
    }
    const fruitLeft = fruitPositions(this.world).length;
    if (scheduled) {
      if (regularEaten) {
        this.fruitPresence = markFruitCollected(
          this.fruitPresence,
          fruitLeft > this.cornucopiaFruit.size + this.graveFruit.size,
        );
      }
    } else if (regularEaten || fruitLeft === 0) {
      this.fruitRespawnRemainingMs = FRUIT_RESPAWN_MS;
    }
    this.payFruit(removedFruitEids.length);
    if (hasUpgrade(owned, "fruitPowerPellet")) {
      const overflow = shieldOverflow(this.learnUpgrades, 1);
      if (shieldPelletsCap(owned) !== null) {
        this.learnUpgrades = bankShields(this.learnUpgrades, 1);
      }
      if (bananaPeelCap(owned) !== null) {
        this.learnUpgrades = bankPeels(this.learnUpgrades, 1);
      }
      const fires = powerPelletPickupFires(owned, 1, overflow);
      if (fires > 0) {
        const bases = pickFruitPowerBases(owned, this.random.stream("fruitPower"));
        if (bases.length > 0) {
          this.firePowerPelletEffects(fires, bases);
        }
      }
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
      this.runState.addPennyCharge(step.completed * charge);
      this.popup(`+${formatPennies(step.completed * charge)}`);
    }
  }

  private payFruit(count: number): void {
    const quarters = fruitQuartersPerFruit(this.learnUpgrades.owned);
    if (quarters !== null) {
      this.runState.addQuarters(count * quarters);
      this.popup(`+${count * quarters} Q`);
    } else {
      this.runState.addPennyCharge(count * FRUIT_BONUS_CHARGE);
      if (this.bonusDemoOwned()) {
        this.popup(`+${formatPennies(count * FRUIT_BONUS_CHARGE)}`);
      }
    }
  }

  statusText(): string {
    const owned = this.learnUpgrades.owned;
    const lines: string[] = [];
    if (this.catchDemoOwned()) {
      lines.push(`LIVES ${this.runState.lives}`);
    }
    if (this.bonusDemoOwned()) {
      lines.push(
        `PENNIES ${penniesInCharge(this.runState.pennies.charge)}/${PENNIES_PER_QUARTER}  QUARTERS ${this.runState.quarters}`,
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
    for (const eid of query(this.world, [Crumb])) {
      this.events.push({ type: "releaseDrawable", eid });
      removeEntity(this.world, eid);
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
    this.gleaning = createGleaning(pelletCells(this.world));
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
      FRUIT_KINDS,
    );
    this.fruitSequence = rolled.state;
    return rolled.kind;
  }

  private spawnFruitEntity(stack = false): void {
    if (!stack) {
      this.releaseAll(removeAllFruit(this.world, this.sideFruit()));
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
    this.graveFruit.clear();
    this.pendingCornucopia = null;
  }

  private sideFruit(): ReadonlySet<number> {
    return new Set([...this.cornucopiaFruit.keys(), ...this.graveFruit]);
  }

  private dropGraveFruit(at: { x: number; y: number }): void {
    if (!hasUpgrade(this.learnUpgrades.owned, "passiveGraveLilies")) {
      return;
    }
    if (this.graveFruit.size === 0) {
      const taken = takeGraveLiliesCharge(this.graveLiliesCharges);
      this.graveLiliesCharges = taken.charges;
      if (!taken.drop) {
        return;
      }
    }
    for (const eid of this.graveFruit) {
      removeEntity(this.world, eid);
    }
    this.releaseAll([...this.graveFruit]);
    this.graveFruit = new Set([spawnFruit(this.world, GRAVE_FRUIT_KIND, at)]);
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
