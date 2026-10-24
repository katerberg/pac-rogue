import type { RandomStream } from "../../domain/runRandom";
import {
  addComponent,
  addEntity,
  createWorld,
  hasComponent,
  query,
  removeEntity,
  type World,
} from "bitecs";
import {
  addPennyCharge,
  applyStreakCrumbs,
  applyStreakPellets,
  QUARTER_CHARGE,
  penniesInCharge,
  breakStreak,
  createPennyPurse,
  enterCell,
  FRUIT_BONUS_CHARGE,
  tickStreakIdle,
  type PennyPurse,
  type PennyResult,
  type Cell,
} from "../../domain/pennies";
import {
  createTimePennyDrain,
  timePennyCharge,
  tickTimePennyDrain,
  type TimePennyDrain,
} from "../../domain/timePennies";
import {
  bossTunnelMouths,
  pickBossPelletCells,
  type BossTunnelMouth,
} from "../../domain/bossBoard";
import {
  advanceBossStage,
  bossGhostKind,
  bossStage,
  bossStartGhosts,
  chainPairForKind,
  createBossState,
  isBossLevel,
  isFinalBossStage,
  pickBoss,
  recordBossPelletsEaten,
  splitBossGhosts,
  type BossDef,
  type BossState,
} from "../../domain/bossRules";
import {
  createBossStageTransition,
  tickBossStageTransition,
  type BossStageTransition,
} from "../../domain/bossStageTransition";
import {
  hasIntermissionAfter,
  intermissionFrame,
  pickIntermission,
  type IntermissionId,
} from "../../domain/intermission";
import type { IntermissionCast } from "../../domain/intermissionScript";

import {
  beginDeathSequence,
  tickDeathSequence,
  type DeathSequenceEvent,
  type DeathSequenceState,
} from "../../domain/deathSequence";
import { dotManDeathFrame } from "../../domain/dotManDeath";
import { reviveSplashProgress } from "../../domain/reviveSplash";
import { respawnCenter } from "../../domain/reanimation";
import { lastLifeSaveCost, moneyTalksLaunchedCount } from "../../domain/moneyTalks";
import { interestCoinsShown, type InterestPop } from "../../domain/interest";
import {
  createFruitPresence,
  cornucopiaSpawnDecision,
  mergeCornucopiaMode,
  extendFruitLifetime,
  fruitStackCenter,
  markFruitCollected,
  takeFruitKind,
  tickFruitPresence,
  type FruitKind,
  type FruitPresence,
  type FruitSequenceState,
} from "../../domain/fruit";
import { FRUIT_KINDS } from "../fruitArt";
import { ghostHouseSeatCenters, houseSeatCount } from "../../domain/ghostHouseSeats";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { blinkyEyesTrackPlayer } from "../../domain/ghostPupils";
import type { GhostDir } from "../../domain/ghostPath";
import { pickRosterId, RELEASE_SLOT_BY_KIND, type ReleaseSlot } from "../../domain/ghostRoster";
import {
  createGhostModeClock,
  GHOST_AI_MODE,
  effectiveGhostMode,
  resolveGhostModeStep,
  startGhostModeClock,
  type GhostAiMode,
  type GhostModeClock,
} from "../../domain/ghostMode";
import {
  ANCHOR_RELEASE_DELAY_MS,
  createGhostReleaseClock,
  resetIdle,
  tickGhostRelease,
  type GhostReleaseAdds,
  type GhostReleaseClock,
} from "../../domain/ghostRelease";
import {
  blinkyScatterTarget,
  clydeScatterTarget,
  GHOST_PHASE,
  inkyScatterTarget,
  pinkyScatterTarget,
} from "../../domain/ghostTarget";
import {
  enhancedOfferChance,
  ghostKindsForLevel,
  isTimedTunnelLevel,
  MAX_LEVEL,
  offersUpgradeAfterLevel,
  speedLevelMultiplier,
} from "../../domain/levelRules";
import {
  DEFAULT_MAX_LIVES,
  emptyLifeSlots,
  START_LIVES,
  levelLivesIconFloor,
  levelRegenAmount,
  livesAfterLevelRegen,
  livesRemainingAfterCatch,
} from "../../domain/lives";
import {
  activateAsciiLayout,
  setActiveLayout,
  withSinkholes,
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  horizontalTunnelRows,
  isSolid,
  layoutFromAscii,
  wallPathCommands,
  type MazeLayout,
  type MazeTile,
  worldToCol,
  worldToRow,
  playerSpawnCenter,
  type SolidGrid,
} from "../../domain/maze";
import { bananaPeelSprites } from "../../domain/bananaPeel";
import type { TailBead } from "../../domain/charmTail";
import { ghostTouchingPeel, stepBananaPeelTail } from "../systems/bananaPeel";
import {
  pickTimedTunnelRow,
  timedTunnelGateVisible,
  timedTunnelPhase,
  timedTunnelPhaseRemainingMs,
  type TimedTunnelPhase,
} from "../../domain/timedTunnel";
import {
  applyCollapse,
  applySinkhole,
  collapsedChainsFor,
  isFreshCollapse,
  isFreshSinkhole,
  pickCollapsePlan,
  sinkholeFor,
  type CollapseChain,
  type CollapsePlan,
} from "../../domain/collapse";
import {
  buildSinkholeArt,
  type SinkholeBoard,
  type SinkholeArt,
  type SinkholeRenderState,
} from "../../domain/sinkholeArt";
import {
  applyTunnelBoringAscii,
  mergeBoredCells,
  openBoredCellsOnLayout,
  TUNNEL_BORING_CHARGES_PER_LEVEL,
} from "../../domain/tunnelBoring";
import {
  buildRubbleArt,
  RUBBLE_INTRO_MS,
  rubbleBlockedPixels,
  type CollapseArt,
  type CollapseRenderState,
} from "../../domain/collapseRubble";
import { pixelWallRects } from "../../domain/pixelWall";
import {
  isLavaZoneLevel,
  lavaFlashOn,
  lavaPhase,
  lavaReachTiles,
  lavaTouchesCircle,
  pickLavaZone,
  type LavaRenderState,
  type LavaZone,
} from "../../domain/lavaZone";
import {
  SPEED_ZONE_SHIFT_STEP_MS,
  speedZoneAt,
  speedZoneCells,
  speedZoneEffect,
  speedZoneMultiplier,
  speedZoneShift,
  speedZoneShiftFrame,
  speedZoneShiftSteps,
  speedZonesByLevel,
  type SpeedZone,
  type SpeedZoneEffect,
  type SpeedZoneShift,
} from "../../domain/speedZones";
import {
  type BoardOverride,
  GENERATE_MAX_ATTEMPTS,
  generateMazeAsciiWithRetries,
  resolveBoardSelection,
} from "../../domain/mazeGenerate";
import { STORE_MAZE_ASCII } from "../../domain/mazeLayouts";
import { mazePoolMap } from "../../domain/mazePool";
import {
  addPelletsToProgress,
  applyPelletCollect,
  createPelletProgress,
  type PelletProgress,
} from "../../domain/pelletProgress";
import type { PlayOptions } from "../../domain/playOptions";
import {
  BOSS_PELLET_DRAWABLE_ID,
  GHOST_DRAWABLE_BY_KIND,
  ghostRadius,
  PELLET_DRAWABLE_ID,
  playerPreTurnPx,
  playerSpeed,
} from "../../domain/playfield";
import {
  pickSlotPickupCell,
  remapSlotPickupCell,
  tickSlotPickupProgress,
  type SlotPickupCell,
} from "../../domain/slotPickup";
import { createRunClock, tickRunClock, type RunClock } from "../../domain/runClock";
import {
  pickSlotUpgrade,
  rollSlotOutcome,
  SLOT_MEGA_BONUS_DELAY_MS,
  SLOT_MEGA_BONUS_WINS,
  SLOT_REELS,
  slotHeld,
  slotResultSfx,
  slotSchoolWeights,
  slotTimeline,
  spinSlot,
  type SlotSpin,
  type SlotTimeline,
  type SlotWin,
} from "../../domain/slotMachine";
import {
  TEST_RUN_LOG_META,
  type QuarterSource,
  type RunLogMeta,
  type UpgradeSource,
} from "../../domain/runLog";
import {
  canSalvage,
  isAtCap,
  needsSalvage,
  salvageNew,
  salvageUpgrade,
  type SalvageResult,
} from "../../domain/salvage";
import { playerExitedHorizontalTunnel, playerExitedTunnel } from "../../domain/tunnelExit";
import { ELROY_TIER, elroyTier } from "../../domain/ghostSpeed";
import { DEFAULT_TUNING, type Tuning } from "../../domain/tuning";
import { sameSinkholeTuning } from "../../domain/sinkholeTuning";
import { storeExitCellAt, storeRouteStep } from "../../domain/storeRoute";
import { createRunRandom, type RunRandom } from "../../domain/runRandom";
import {
  storeLevelFor,
  STORE_FIRST_LEVEL,
  STORE_EXIT_SLIDE_TILES,
  createStoreState,
  offeredUpgradeIds,
  parseStoreLayout,
  pickMidStoreLevel,
  promptView,
  purchaseSchool,
  slotIndexAtCell,
  storeAfterLevel,
  storeExitAlpha,
  storeExitDirection,
  storeSlotLabel,
  storeStep,
  type StoreExitDirection,
  type StoreFreebie,
  type StorePurchase,
  type StoreState,
} from "../../domain/store";
import {
  advanceUpgradeTimers,
  upgradeTimerFractions,
  type UpgradeTimers,
} from "../../domain/upgradeTimers";
import {
  cellSpeedMultiplier,
  applyPowerPelletEffects,
  firingPowerUpgrades,
  applyShieldBreakInvuln,
  applyStreakEngineInvuln,
  bankShields,
  bankPeels,
  bananaPeelCap,
  grantStartingShields,
  clearUpgradeTimers,
  clearStaleUpgradeTimers,
  isEnhancedId,
  withDeclined,
  queueEcho,
  powerPelletPickupFires,
  shieldBreakOwned,
  reactiveArmorOwned,
  reactiveArmorRadiusTiles,
  shieldOverflow,
  shieldPelletsCap,
  spendShield,
  spendPeel,
  deathsBountyCharge,
  inheritancePayout,
  defyDeathActive,
  confirmUpgradeChoice,
  createRunUpgrades,
  FRUIT_FECUNDITY_MUL,
  cornucopiaAlongsideOwned,
  fruitLifetimeMultiplier,
  fruitQuartersPerFruit,
  hauntDurationMs,
  armHaunt,
  armPossession,
  tickHaunt,
  tickPossession,
  tickWallDrop,
  endPossession,
  hauntedGhost,
  hauntedGhostEid,
  possessionActive,
  possessedGhostEid,
  possessionDurationMs,
  possessionHauntMs,
  eatFrightenedGhost,
  frightenedGhostEids,
  frightenedGhosts,
  hunterHoldsEaten,
  tickFrightened,
  nearMissCharge,
  streakEngineEvery,
  gleaningCharge,
  gleaningStreakSteps,
  moneyTalksCost,
  interestPayout,
  deathsHarvestRadiusTiles,
  speedBurstMultiplier,
  tickTithe,
  titheSpeedMultiplier,
  titheStreakWeight,
  HYPERSPEED_MUL,
  hyperspeedActive,
  hyperspeedMultiplier,
  spendHyperspeedShield,
  startHyperspeedTurnDelay,
  tickHyperspeed,
  secondChompMs,
  secondChompPellets,
  lifeFloorBonus,
  hasUpgrade,
  effectiveOwned,
  enhanceGrantLives,
  enhanceUpgrade,
  enhancedIdOf,
  wallPassLoopOwned,
  floatingZoneEffect,
  floatsOverHazards,
  fruitFeastThresholds,
  pickFruitPowerBases,
  fruitPersistsUntilLevelEnd,
  fruitStacksSideBySide,
  ghostTunnelSpeedRatio,
  ghostsBlockedFromTunnels,
  applyTunnelExitInvuln,
  baseIdOf,
  pelletSurgeCount,
  specialistEnhancedBases,
  lazyLooperRings,
  regenToFull,
  frozenGhostEid,
  ghostHouseReliefPelletAdd,
  ghostHouseReleaseDelayAddMs,
  ghostSpeedMultiplier,
  grantLivesForUpgrade,
  grantUpgrade,
  pelletCollectRadiusBonusPx,
  pickStartingUpgrade,
  pickUpgradeChoiceOffer,
  playerIsInvulnerable,
  playerTintRemainingMs,
  playerSpeedMultiplier,
  claimSecondChompRespawns,
  queuePowerPelletRespawns,
  revokeUpgrade,
  speedBurstActive,
  ghostHarvestActive,
  tickDefyDeath,
  tickGhostHarvest,
  tickFreeze,
  tickInvuln,
  tickPowerPelletRespawns,
  tickSpeedBurst,
  tickWallPass,
  wallPassActive,
  type PendingPowerPelletRespawn,
  type RunUpgrades,
  type UpgradeChoiceOffer,
  type UpgradeChoiceOption,
  type BaseUpgradeId,
  type UpgradeId,
  type UpgradeSchool,
  remoteTransferEvery,
  type CornucopiaMode,
  endMirror,
  mirrorSavesLife,
} from "../../domain/upgrades";
import {
  mirrorFacing,
  sharedZoneEffect,
  mirrorPopRender,
  tickMirrorPop,
  twinBeads,
  twinDesynced,
  twinTouchesPlayer,
  twinPoint,
  twinZoneEffect,
  type BodyTile,
  type MirrorPop,
} from "../../domain/mirror";
import { remoteTransferTriggers } from "../../domain/pelletCollectExtra";
import { BossGhost } from "../components/BossGhost";
import { BossPellet } from "../components/BossPellet";
import { ChainedGhost } from "../components/ChainedGhost";
import { tagOptionalPellets } from "../systems/lazyLooper";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { bossChains, chainCatch } from "../systems/bossChain";
import { bossGhostBlock, countBossPellets, pickFreeBossMouth } from "../systems/bossGhosts";
import {
  catchPlayer,
  edibleGhostsTouchingEid,
  edibleGhostsTouchingPlayer,
  type CatchOptions,
} from "../systems/catchPlayer";
import { harvestPelletsByGhost } from "../systems/possessionHarvest";
import {
  lifeAfterDeathClear,
  shouldFireMartyr,
  shouldStartPossession,
} from "../../domain/possession";
import { stepNearMisses } from "../systems/nearMiss";
import { streakEngineFires, streakPops } from "../../domain/streakEngine";
import { createGleaning, stepGleaning, type Gleaning } from "../../domain/gleaning";
import { crumbGhostCells, pelletCells, takeCrumbsAt } from "../systems/gleaning";
import { tickEchoes } from "../../domain/echo";
import { createNearMissPasses, type NearMissPasses } from "../../domain/nearMiss";
import {
  collectExtraForBodies,
  collectFruitForBodies,
  collectPelletsForBodies,
} from "../systems/collectBodies";
import { applyRemoteTransference } from "../systems/remoteTransference";
import { wallPassSolids } from "../systems/wallPassSolids";
import {
  fruitKindsOnBoard,
  fruitPositions,
  fruitTiles,
  removeAllFruit,
} from "../systems/collectFruit";
import { leaveScent, scentFieldFor, scentSprites, tickScarecrow } from "../systems/scarecrow";
import {
  countPellets,
  noRequiredPelletsLeft,
  type PlayerPelletFrame,
} from "../systems/collectPellets";
import {
  emptyPlayerPelletFrame,
  runHyperspeedSubsteps,
  mergePlayerPelletFrames,
  noteHyperspeedFacing,
} from "../systems/hyperspeed";
import type { Direction } from "../components/Input";
import { harvestNearbyPellets } from "../systems/deathsHarvest";
import { powerPelletBreakProgress } from "../../domain/powerPelletBreak";
import {
  startPowerPelletBreaks,
  tickPowerPelletBreaks,
  type ActivePowerPelletBreak,
} from "./powerPelletBreaks";
import { ghostAi } from "../systems/ghostAi";
import { ghostExitHouse } from "../systems/ghostExitHouse";
import { freezeClosestGhost } from "../systems/ghostFreeze";
import { harvestPelletsByGhosts } from "../systems/ghostHarvest";
import {
  ghostHouseSeating,
  placeInHouseGhostsAtPredictedSeats,
} from "../systems/ghostHouseSeating";
import { recallClosestGhostToHouse, sendGhostToHouse } from "../systems/ghostRecall";
import { applyReactiveArmor } from "../systems/reactiveArmor";
import { ghostRelease } from "../systems/ghostRelease";
import { forceGhostReverse } from "../systems/ghostReverse";
import { applyGhostSpeed } from "../systems/ghostSpeed";
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
import { TurnTuningState, type TurnSparksBurst } from "../systems/turnTuningState";
import { movement } from "../systems/movement";
import { applyPelletToPowerConvert } from "../systems/pelletToPower";
import { enteringEmptyCell } from "../systems/enteringEmptyCell";
import {
  atTopSpeed,
  sonicStunnedEids,
  sonicStunSpriteOffsets,
  sonicHitRemainingMs,
  tickSonicHits,
} from "../../domain/sonicBoom";
import { SonicBoomEchoes, movingOverClearedTile, stepSonicBoom } from "../systems/sonicBoom";
import { pelletAtCell } from "../systems/pelletAtCell";
import { playerCell } from "../systems/playerCell";
import { programmerQueueSlots } from "../../domain/programmer";
import {
  followProgrammer,
  holdPlayerForProgramming,
  programmerPath,
  recordProgrammerKeys,
} from "../systems/programmer";
import {
  clearPlayerDirectionInput,
  hasPlayerDirectionInput,
  playerFacing,
  steerPlayer,
} from "../systems/playerDirection";
import { chaffSprites } from "../../domain/chaff";
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
import { slidePlayer } from "../systems/playerSlide";
import { eatDragAfterCollect, eatDragMultiplier, tickEatDrag } from "../../domain/eatDrag";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import { snapPlayerToNearestWalkable } from "../systems/playerWallPassSnap";
import {
  startWarpGlide,
  tickWarpGlide,
  type Point,
  type WarpGlide,
  warpGlideRemainingMs,
  warpGlideSprites,
} from "../../domain/warpGlide";
import { speedTrailSprites, tickSpeedTrail, type SpeedTrail } from "../../domain/speedTrail";
import { warpPlayerFarthestFromGhosts } from "../systems/playerWarp";
import {
  ghostWarpGlideRemainingMs,
  ghostWarpGlideSprites,
  glidingGhostEids,
  heldGhostEids,
  mergeGhostCornerWarps,
  tickGhostCornerWarps,
  type GhostCornerWarp,
} from "../../domain/ghostCornerWarp";
import { teleportGhostsToCorners } from "../systems/ghostCornerTeleport";
import { frightenedGhostAi, frightenGhosts } from "../systems/ghostFrightened";
import { hunterFrightenLimit } from "../../domain/hunter";
import {
  isTrinketId,
  slotCount,
  trinketCounts,
  trinketKindReleaseAdds,
  trinketPlayerSpeedMul,
  trinketPreTurnBonusPx,
} from "../../domain/trinkets";
import { GhostTractionState, playerInTunnel } from "../systems/trinketGhosts";
import { nameOf, worldSnapshot } from "../systems/worldSnapshot";
import type { MoneyTalksSpend, SimEvent, SimRenderOptions } from "./simEvents";
import {
  spawnBoardPellets,
  spawnFruit,
  spawnCrumb,
  spawnPellet,
  spawnPlayer,
  spawnSlotMachine,
  spawnWalls,
} from "./spawn";
import { collectSlotMachinesForBodies } from "../systems/collectSlotMachines";
import type { SimInput } from "./simInput";
import { replayPlayerTint, type ReplayData } from "../../domain/replay";
import { ReplayRecorder, type ReplayLook } from "./replayRecorder";
import { ghostName, RunRecorder } from "./runRecorder";

export const LEVEL_TRANSITION_MS = 1000;
export const RUN_END_MENU_ARM_MS = 1000;

export type RunEndChoice = "newGame" | "menu";

type IntermissionRun = { id: IntermissionId; elapsedMs: number; cast: IntermissionCast };

export type SlotView = {
  spin: SlotSpin;
  timeline: SlotTimeline;
  elapsedMs: number;
  paid: number;
  won: UpgradeId[];
};

export type PlayHud = {
  time: number;
  timerVisible: boolean;
  lives: number;
  quarters: number;
  penniesCharge: number;
  upgrades: readonly UpgradeId[];
  upgradeTimers: Partial<Record<BaseUpgradeId, number>>;
  collected: number;
  shields: number;
};

type SinkholeSource = {
  board: SinkholeBoard;
  chain: CollapseChain;
  seed: number;
  tuning: Tuning;
};

export class PlaySim {
  world: World = createWorld();
  readonly random: RunRandom;
  private events: SimEvent[] = [];
  private readonly options: PlayOptions;
  private suppressInputUntilKeyRelease = false;
  private awaitingStartingCard = false;
  private customMazeError: string | null = null;
  private awaitingChoice = false;
  private pendingChoice: UpgradeChoiceOffer | null = null;
  private clock: RunClock = createRunClock();
  private ghostReleaseClock: GhostReleaseClock = createGhostReleaseClock();
  private ghostModeClock: GhostModeClock = createGhostModeClock(1);
  private previousEffectiveGhostMode: GhostAiMode = createGhostModeClock(1).mode;
  private pelletProgress: PelletProgress = createPelletProgress(0);
  private lifetimeCollected = 0;
  private remoteTransferCounter = 0;
  private deathsThisBoard = 0;
  private elroySuppressed = false;
  private nearMissPasses: NearMissPasses = createNearMissPasses();
  private nearMissesPaid = 0;
  private gleaning: Gleaning = createGleaning();
  private crumbCount = 0;
  private streakPopCount = 0;
  private lastStreakPop: number | null = null;
  private upgradeTimers: UpgradeTimers = {};
  private firedUpgrades: BaseUpgradeId[] = [];
  private pulseCause: BaseUpgradeId | undefined;
  private upgradePulseCount = 0;
  private lastUpgradePulse: BaseUpgradeId[] = [];
  private lastUpgradePulseCause: BaseUpgradeId | null = null;
  private quarters = 0;
  private pennies: PennyPurse;
  private slotPickupProgress = 0;
  private slotPickupCells: SlotPickupCell[] = [];
  private slotPickupsAwaitingPlacement = 0;
  private lastPlayerCell: Cell | null = null;
  private timePennyDrain: TimePennyDrain | null = null;
  private slotQueue: QuarterSource[] = [];
  private salvageQueue: { incoming: UpgradeId; source: UpgradeSource }[] = [];
  private awaitingSalvageClose = false;
  private slot:
    (SlotView & { source: QuarterSource; resultSounded: boolean; megaSounded: boolean }) | null =
    null;
  private slotSpins = 0;
  private levelClearAwaitsSlots = false;
  private levelIndex = 1;
  private boardLayoutLabel = "maze2";
  private rosterId = 0;
  private bossState: BossState | null = null;
  private bossMouths: BossTunnelMouth[] = [];
  private bossStageTransition: BossStageTransition | null = null;
  private bossStageDraw: { entityAlpha: number; wallAlpha: number } | null = null;
  private intermission: IntermissionRun | null = null;
  private lastIntermission: IntermissionId | null = null;
  private levelTransitionRemainingMs = 0;
  private pendingLevelClear = false;
  private runEndElapsedMs: number | null = null;
  private fruitPresence: FruitPresence = createFruitPresence();
  private fruitSequence: FruitSequenceState = {
    sequence: [],
    spawnIndex: 0,
    previousLevelFirstKind: null,
  };
  private cornucopiaFruit: { eid: number; ms: number }[] = [];
  private msSinceFruitSpawn = Infinity;
  private pendingCornucopia: CornucopiaMode | null = null;
  private pendingPowerPelletRespawns: PendingPowerPelletRespawn[] = [];
  private secondChompUsed = 0;
  private tunnelBoringCharges = 0;
  private tunnelBored: { mapKey: string; cells: MazeTile[] } | null = null;
  private tunnelBore: TunnelBore = NO_TUNNEL_BORE;
  private timedTunnelGatedRow: number | null = null;
  private timedTunnelElapsedMs = 0;
  private readonly ghostTraction = new GhostTractionState();
  private readonly sonicEchoes = new SonicBoomEchoes();
  private lavaZone: LavaZone | null = null;
  private lavaElapsedMs = 0;
  private lavaStarted = false;
  private speedZones: SpeedZone[] = [];
  private speedZoneShift: SpeedZoneShift | null = null;
  private speedZoneShiftMs = 0;
  private collapsePlan: { poolIndex: number; plan: CollapsePlan; baseAscii: string } | null = null;
  private collapseBoardCount = 0;
  private collapseChains: CollapseChain[] = [];
  private collapseArts: CollapseArt[] = [];
  private collapseSpeedBoard: MazeLayout | null = null;
  private collapseIntroMs = 0;
  private sinkholeChain: CollapseChain | null = null;
  private sinkholeLayouts: { open: MazeLayout; blocked: MazeLayout } | null = null;
  private sinkholeArt: SinkholeArt | null = null;
  private sinkholeSource: SinkholeSource | null = null;
  private sinkholeBoardCount = 0;
  private sinkholeIntroMs = 0;
  private warpGlide: WarpGlide | null = null;
  private speedTrail: SpeedTrail = [];
  private hyperspeedDirection: Direction | null = null;
  private turnCatchGraceMs = 0;
  private hyperspeedPellets: PlayerPelletFrame = emptyPlayerPelletFrame();
  private hyperspeedFruitEaten = 0;
  private ghostCornerWarps: GhostCornerWarp[] = [];
  private shieldBounce: ShieldBounce = NO_SHIELD_BOUNCE;
  private peelTail: TailBead[] = [];
  private peelHeading = 0;
  private peelClockMs = 0;
  private bounceStaleKeys: HeldKeys | null = null;
  private frameKeys: HeldKeys = NO_KEYS_HELD;
  private runUpgrades: RunUpgrades = createRunUpgrades();
  private effectiveCache: { owned: readonly UpgradeId[]; effective: readonly UpgradeId[] } | null =
    null;
  private enhanceLivesPaid = new Set<BaseUpgradeId>();
  private midStoreLevel = 5;
  private store: StoreState | null = null;
  private nextStoreSchool: UpgradeSchool | null = null;
  private storeOffered: BaseUpgradeId[] = [];
  private storeExitSlide: (StoreExitDirection & { traveledPx: number }) | null = null;
  private storeRoute: Cell | null = null;
  private storeEntrySlidePx: number | null = null;
  private storeSolids: SolidGrid = [];
  private timerVisible = true;
  private death: DeathSequenceState | null = null;
  private fellAt: Point | null = null;
  private caughtByEid: number | null = null;
  private possessionPendingGameOver = false;
  private possessionLivesBefore = 0;
  private possessionHauntAfterMs: number | null = null;
  private lastReactiveArmorSent = 0;
  private reviveSplashPending = false;
  private reviveSplashElapsedMs: number | null = null;
  private mirrorPop: MirrorPop | null = null;
  private powerPelletBreaks: ActivePowerPelletBreak[] = [];
  private nextPowerPelletBreakId = 1;
  private moneyTalksSpend: MoneyTalksSpend | null = null;
  private interestPop: InterestPop | null = null;
  private lives: number;
  private afterLifeRelease = false;
  private eatDragMs = 0;
  private readonly turnTuning = new TurnTuningState();
  private prevKeys: HeldKeys = NO_KEYS_HELD;

  private currentTuning: Tuning;
  private readonly recorder: RunRecorder;
  private readonly replayRecorder = new ReplayRecorder();

  constructor(
    options: PlayOptions,
    seed: string,
    tuning: Tuning = DEFAULT_TUNING,
    runLogMeta: RunLogMeta = TEST_RUN_LOG_META,
  ) {
    this.options = options;
    this.currentTuning = tuning;
    this.random = createRunRandom(seed);
    this.recorder = new RunRecorder(runLogMeta, seed, options.highScoresDisabled);
    this.quarters = options.quarters ?? 0;
    this.pennies = createPennyPurse(options.pennyCharge ?? 0);
    this.lives = options.lives ?? START_LIVES;
  }

  get tuning(): Tuning {
    return this.currentTuning;
  }

  setTuning(tuning: Tuning): void {
    this.currentTuning = tuning;
    if (this.sinkholeSource !== null && !sameSinkholeTuning(this.sinkholeSource.tuning, tuning)) {
      this.buildSinkhole({ ...this.sinkholeSource, tuning });
    }
  }

  start(): SimEvent[] {
    this.events = [];
    const options = this.options;
    this.midStoreLevel = pickMidStoreLevel(this.random.stream("midStore"));
    this.levelIndex =
      options.level ??
      (options.jumpToUpgrade || options.jumpToSpinner
        ? 2
        : options.store !== null
          ? storeLevelFor(options.store, this.midStoreLevel)
          : 1);
    this.rosterId = options.roster ?? pickRosterId(this.random);
    this.runUpgrades = createRunUpgrades(options.enableUpgrades);
    for (const id of this.runUpgrades.owned) {
      this.lives += grantLivesForUpgrade(id);
      this.recorder.gained(id, "flag", this.levelIndex);
    }
    this.grantSpecialistLives();
    this.recordSeenUpgrades();

    this.startBoard(options.mazeAscii !== null ? { ascii: options.mazeAscii } : options.maze);

    const startingUpgrade =
      this.customMazeError === null &&
      this.levelIndex === 1 &&
      !options.jumpToUpgrade &&
      options.store === null &&
      !options.disableLevelUpgrades
        ? pickStartingUpgrade(
            this.runUpgrades.owned,
            this.random.stream("startingUpgrade"),
            options.forceStartingUpgrade,
          )
        : null;
    if (startingUpgrade !== null) {
      this.recorder.gained(startingUpgrade, "start", this.levelIndex);
      this.runUpgrades = grantUpgrade(this.runUpgrades, startingUpgrade);
      this.applyGrantEffects(startingUpgrade);
      this.grantSpecialistLives();
      this.recordSeenUpgrades();
    }
    const introIntermission =
      options.intermission !== null &&
      !options.jumpToUpgrade &&
      this.customMazeError === null &&
      options.store === null &&
      hasIntermissionAfter(this.levelIndex);
    this.emit({ type: "upgrades" });
    this.recorder.livesStart(this.lives);
    this.emit({ type: "lives", pulse: false });
    this.emitRunLog();
    if (this.customMazeError !== null) {
      this.emitDraw({ frozenGhostEid: null, playerInvulnRemainingMs: 0, wallPassActive: false });
      this.awaitingStartingCard = true;
      this.emit({
        type: "startingNotice",
        title: "CUSTOM MAZE FAILED",
        body: `${this.customMazeError.slice(0, 80)}\nFalling back to maze2. Press any key.`,
      });
    } else if (introIntermission) {
      this.beginIntermission();
    } else if (startingUpgrade === null) {
      this.showLevelBanner();
    } else {
      this.emitDraw({ frozenGhostEid: null, playerInvulnRemainingMs: 0, wallPassActive: false });
      this.awaitingStartingCard = true;
      this.emit({ type: "startingUpgrade", id: startingUpgrade });
    }
    if (!introIntermission) {
      this.emit({ type: "loopStart", id: "gameplayMusic" });
    }
    if (options.jumpToSpinner) {
      this.emitDraw({ frozenGhostEid: null, playerInvulnRemainingMs: 0, wallPassActive: false });
      this.slotQueue.push("pennyBar");
    }
    if (options.jumpToUpgrade) {
      this.jumpToLevelClear();
    } else if (options.bossStageAdvance && this.bossState !== null) {
      this.beginBossStageTransition();
    } else if (options.store !== null) {
      this.enterStore();
    }
    return this.takeEvents();
  }

  step(input: SimInput, delta: number): SimEvent[] {
    this.events = [];
    this.recorder.advance(delta);
    this.tick(input, delta);
    this.prevKeys = input.keys;
    this.advanceUpgradeTimers();
    return this.takeEvents();
  }

  private advanceUpgradeTimers(): void {
    const { timers, pulses } = advanceUpgradeTimers(
      this.upgradeTimers,
      this.runUpgrades,
      this.firedUpgrades,
    );
    this.upgradeTimers = timers;
    this.firedUpgrades = [];
    const cause = this.pulseCause;
    this.pulseCause = undefined;
    if (pulses.length > 0 || cause !== undefined) {
      this.upgradePulseCount += 1;
      this.lastUpgradePulse = pulses;
      this.lastUpgradePulseCause = cause ?? null;
      this.emit({ type: "upgradePulse", ids: pulses, cause });
    }
  }

  private replayLook(): ReplayLook {
    const opts = this.renderOptions();
    return {
      mazeColorInverted: opts.mazeColorInverted === true,
      playerTint: replayPlayerTint({
        wallPass: opts.wallPassActive === true,
        programming: (opts.programmerQueue ?? null) !== null,
        invulnRemainingMs: opts.playerInvulnRemainingMs ?? 0,
      }),
      frightened: new Set(opts.frightenedGhosts?.eids ?? []),
      frozenEid: (opts.frozenGhostRemainingMs ?? 0) > 0 ? (opts.frozenGhostEid ?? null) : null,
    };
  }

  replay(): ReplayData {
    return this.replayRecorder.data();
  }

  runEndMenuArmed(): boolean {
    return this.runEndElapsedMs !== null && this.runEndElapsedMs >= RUN_END_MENU_ARM_MS;
  }

  chooseRunEnd(choice: RunEndChoice): SimEvent[] {
    if (!this.runEndMenuArmed()) {
      return [];
    }
    this.emit({ type: choice === "newGame" ? "newGame" : "goToMenu" });
    return this.takeEvents();
  }

  chooseUpgrade(chosen: UpgradeChoiceOption): SimEvent[] {
    this.events = [];
    const offer = this.pendingChoice;
    if (offer === null) {
      return [];
    }
    this.pendingChoice = null;
    const alreadyOwned = !isTrinketId(chosen.id) && hasUpgrade(this.runUpgrades.owned, chosen.id);
    const grantedId = chosen.enhanced === true ? enhancedIdOf(chosen.id) : chosen.id;
    this.recorder.picked(chosen.id);
    if (!alreadyOwned && needsSalvage(this.runUpgrades.owned, grantedId)) {
      this.runUpgrades = withDeclined(
        this.runUpgrades,
        offer.upgrades.filter((id) => id !== chosen.id),
      );
      this.salvageQueue.push({ incoming: grantedId, source: "offer" });
      return this.takeEvents();
    }
    this.runUpgrades = confirmUpgradeChoice(this.runUpgrades, offer.upgrades, chosen.id, grantedId);
    if (!alreadyOwned) {
      this.recorder.gained(grantedId, "offer", this.levelIndex);
      if (chosen.enhanced === true) {
        this.enhanceLivesPaid.add(chosen.id);
      }
      this.applyGrantEffects(grantedId);
      this.grantSpecialistLives();
      this.emit({ type: "lives", pulse: false });
      this.recordSeenUpgrades();
    }
    this.emit({ type: "upgrades" });
    return this.takeEvents();
  }

  salvagePrompt(): { incoming: UpgradeId; source: UpgradeSource } | null {
    return this.slot === null ? (this.salvageQueue[0] ?? null) : null;
  }

  canSalvageNow(): boolean {
    return (
      this.salvageQueue.length === 0 &&
      this.death === null &&
      !possessionActive(this.runUpgrades) &&
      this.runEndElapsedMs === null &&
      this.bossStageTransition === null &&
      this.intermission === null &&
      this.levelTransitionRemainingMs === 0
    );
  }

  salvageNew(): SimEvent[] {
    this.events = [];
    const prompt = this.salvagePrompt();
    if (prompt === null) {
      return [];
    }
    this.salvageQueue.shift();
    this.applySalvage(
      salvageNew(this.runUpgrades, this.rosterKinds(), this.random.stream("salvage")),
      null,
    );
    return this.takeEvents();
  }

  salvageReplace(outgoingId: UpgradeId): SimEvent[] {
    this.events = [];
    const prompt = this.salvagePrompt();
    if (prompt === null || !canSalvage(this.runUpgrades.owned, outgoingId)) {
      return [];
    }
    this.salvageQueue.shift();
    this.applySalvage(
      salvageUpgrade(
        this.runUpgrades,
        outgoingId,
        this.rosterKinds(),
        this.random.stream("salvage"),
      ),
      outgoingId,
    );
    this.grantNow(prompt.incoming, prompt.source);
    this.emit({ type: "lives", pulse: false });
    return this.takeEvents();
  }

  salvagePick(id: UpgradeId): SimEvent[] {
    const prompt = this.salvagePrompt();
    if (prompt === null) {
      return [];
    }
    return id === prompt.incoming ? this.salvageNew() : this.salvageReplace(id);
  }

  salvageOwned(id: UpgradeId): SimEvent[] {
    this.events = [];
    if (!this.canSalvageNow() || !canSalvage(this.runUpgrades.owned, id)) {
      return [];
    }
    this.applySalvage(
      salvageUpgrade(this.runUpgrades, id, this.rosterKinds(), this.random.stream("salvage")),
      id,
    );
    return this.takeEvents();
  }

  private applySalvage(result: SalvageResult, outgoingId: UpgradeId | null): void {
    const lost = this.runUpgrades.owned.find(
      (id) => outgoingId !== null && baseIdOf(id) === baseIdOf(outgoingId),
    );
    if (lost !== undefined) {
      this.recorder.lost(lost, this.levelIndex);
    }
    this.runUpgrades = result.state;
    if (result.gained !== null) {
      this.recorder.gained(result.gained, "salvage", this.levelIndex);
    }
    this.grantQuarters(result.quarters, "salvage", true);
    this.awaitingSalvageClose = true;
    this.recordSeenUpgrades();
    this.emit({ type: "salvage", gained: result.gained, quarters: result.quarters });
    this.emit({ type: "upgrades" });
  }

  private grantNow(id: UpgradeId, source: UpgradeSource): void {
    this.recorder.gained(id, source, this.levelIndex);
    this.runUpgrades = grantUpgrade(this.runUpgrades, id);
    if (isEnhancedId(id)) {
      this.enhanceLivesPaid.add(baseIdOf(id));
    }
    this.applyGrantEffects(id);
    this.grantSpecialistLives();
  }

  finishRun(outcome: "quit"): SimEvent[] {
    if (!this.recorder.finish(outcome)) {
      return [];
    }
    this.emitRunLog();
    return this.takeEvents();
  }

  notePause(ms: number): void {
    this.recorder.paused(ms);
  }

  noteHidden(ms: number): void {
    this.recorder.hidden(ms);
  }

  runLogRecord() {
    return this.recorder.snapshotRecord(this.runTotals());
  }

  deathCount(): number {
    return this.recorder.deathCount();
  }

  suppressInputUntilRelease(): void {
    this.suppressInputUntilKeyRelease = true;
  }

  inputSuppressed(): boolean {
    return this.suppressInputUntilKeyRelease;
  }

  storeRouting(): boolean {
    return this.storeRoute !== null;
  }

  storeExitUnder(x: number, y: number): boolean {
    return (
      this.readsStoreKeys() &&
      !this.storeConfirmOpen() &&
      storeExitCellAt(this.storeSolids, worldToCol(x), worldToRow(y)) !== null
    );
  }

  readsStoreKeys(): boolean {
    return this.store !== null && this.storeExitSlide === null && this.storeEntrySlidePx === null;
  }

  intermissionActive(): boolean {
    return this.intermission !== null;
  }

  storeState(): StoreState | null {
    return this.store;
  }

  offer(): UpgradeChoiceOffer | null {
    return this.pendingChoice;
  }

  slotView(): Readonly<SlotView> | null {
    return this.slot;
  }

  currentLevel(): number {
    return this.levelIndex;
  }

  hud(): PlayHud {
    return {
      time: this.clock.remaining,
      timerVisible: this.timerVisible,
      lives: this.lives,
      quarters:
        this.quarters -
        (this.interestPop === null
          ? 0
          : this.interestPop.count - interestCoinsShown(this.interestPop)),
      penniesCharge: this.pennies.charge,
      upgrades: this.effectiveUpgrades(),
      upgradeTimers: upgradeTimerFractions(this.upgradeTimers),
      collected: this.lifetimeCollected,
      shields: this.runUpgrades.shieldsBanked,
    };
  }

  renderOptions(): SimRenderOptions {
    return {
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      frozenGhostRemainingMs: this.runUpgrades.freezeRemainingMs,
      possessedGhostEid: possessedGhostEid(this.runUpgrades),
      ...(possessionActive(this.runUpgrades) ? { playerAlpha: 0 } : {}),
      playerDeathFrame: this.deathFrame(),
      playerInvulnRemainingMs: playerTintRemainingMs(this.runUpgrades),
      fruitRemainingMs: this.flickerFruitMs(),
      wallPassActive: wallPassActive(this.runUpgrades),
      wallPassLoopActive:
        wallPassActive(this.runUpgrades) && wallPassLoopOwned(this.effectiveUpgrades()),
      turnFlashRemainingMs: this.turnTuning.flashMs,
      playerWarpGlide: this.warpGlide === null ? undefined : warpGlideSprites(this.warpGlide),
      playerSpeedTrail:
        this.death === null && this.speedTrailActive()
          ? speedTrailSprites(this.speedTrail, getActiveLayout().tileSize)
          : undefined,
      ghostWarpGlides: ghostWarpGlideSprites(this.ghostCornerWarps),
      spriteOffsets: sonicStunSpriteOffsets(
        this.runUpgrades,
        this.effectiveUpgrades(),
        shieldBounceSpriteOffsets(this.shieldBounce, getActiveLayout().tileSize),
      ),
      hauntedGhost: hauntedGhost(this.runUpgrades),
      frightenedGhosts: frightenedGhosts(this.runUpgrades),
      bossChains: bossChains(this.world, this.catchOptions()),
      entityAlpha: this.bossStageDraw?.entityAlpha,
      wallAlpha: this.bossStageDraw?.wallAlpha,
      mazeColorInverted: this.bossState?.mazeColorInverted === true,
      timedTunnel: this.timedTunnelRenderState(),
      lava: this.lavaRenderState(),
      collapse: this.collapseRenderState(),
      sinkhole: this.sinkholeRenderState(),
      boreJunk: this.tunnelBore.junk,
      speedZones: this.speedZones,
      speedZoneRider: this.speedZoneRider(),
      droppedWall: this.runUpgrades.droppedWall,
      chaff: chaffSprites(this.runUpgrades.chaff),
      scent: scentSprites(this.effectiveUpgrades(), this.world, this.runUpgrades.scentLingers),
      pupilTarget: this.blinkyPupilTarget(),
      shields: this.deathFrame() === undefined ? this.runUpgrades.shieldsBanked : 0,
      peels: bananaPeelSprites(this.peelBeads()),
      programmerQueue: this.programmerQueue(),
      programmerPath:
        this.death === null
          ? programmerPath(this.world, this.runUpgrades.programmer, this.playerSolids())
          : [],
      mirror: this.death === null ? this.twinRenderBody() : null,
      mirrorPop: mirrorPopRender(this.mirrorPop),
    };
  }

  private programmerQueue(): SimRenderOptions["programmerQueue"] {
    const state = this.runUpgrades.programmer;
    const player = this.playerPosition();
    return state?.phase === "recording" && player !== null && this.death === null
      ? programmerQueueSlots(state.presses, player.x, player.y, getActiveLayout().tileSize)
      : null;
  }

  private blinkyPupilTarget(): SimRenderOptions["pupilTarget"] {
    const player = this.playerPosition();
    if (player === null || !blinkyEyesTrackPlayer(this.levelIndex)) {
      return null;
    }
    const eids = [...query(this.world, [Ghost, GhostKind])].filter(
      (eid) => GhostKind.kind[eid] === GHOST_KIND.blinky,
    );
    return { eids, x: player.x, y: player.y };
  }

  currentRoster(): number {
    return this.rosterId;
  }

  snapshot() {
    const upgrades = this.runUpgrades;
    const twinPosition = this.twinPosition();
    const twinBody = this.twinBody();
    return {
      seed: this.random.seed,
      roster: this.rosterId,
      knobs: this.options.knobs,
      tuning: this.currentTuning,
      level: this.levelIndex,
      layout: this.boardLayoutLabel,
      lives: this.lives,
      quarters: this.quarters,
      timeRemaining: this.clock.remaining,
      pennies: {
        charge: this.pennies.charge,
        streak: this.pennies.streak,
        max: QUARTER_CHARGE,
        count: penniesInCharge(this.pennies.charge),
        draining: this.timePennyDrain !== null,
      },
      slot: {
        spins: this.slotSpins,
        queued: this.slotQueue.length,
        active: this.slot !== null,
        elapsedMs: this.slot?.elapsedMs ?? null,
        grid: this.slot?.spin.grid ?? null,
        wins: this.slot?.spin.wins ?? null,
        paid: this.slot?.paid ?? null,
        held: this.slot !== null && slotHeld(this.slot.timeline, this.slot.elapsedMs),
        won: this.slot?.won ?? null,
      },
      salvage: {
        open: this.salvagePrompt() !== null,
        incoming: this.salvagePrompt()?.incoming ?? null,
        queued: this.salvageQueue.length,
        slotCount: slotCount(upgrades.owned),
        cap: isAtCap(upgrades.owned),
        trinketCount: upgrades.owned.length - slotCount(upgrades.owned),
        canSalvage: this.canSalvageNow(),
      },
      trinkets: trinketCounts(upgrades.owned),
      slotPickup: {
        progress: this.slotPickupProgress,
        cells: this.slotPickupCells.map((cell) => ({ ...cell })),
        awaitingPlacement: this.slotPickupsAwaitingPlacement,
        count: this.slotPickupCells.length,
      },
      deathsThisBoard: this.deathsThisBoard,
      lastReactiveArmorSent: this.lastReactiveArmorSent,
      hauntedGhost: ghostName(this.world, hauntedGhostEid(upgrades)),
      possessedGhost: ghostName(this.world, possessedGhostEid(upgrades)),
      possessing: possessionActive(upgrades),
      nearMissesPaid: this.nearMissesPaid,
      frightenedGhosts: [...frightenedGhostEids(upgrades)].map((eid) => ghostName(this.world, eid)),
      hunterHeld: upgrades.hunterHeldEids.map((eid) => ghostName(this.world, eid)),
      ghostsEatenThisFright: upgrades.ghostsEatenThisFright,
      streakPops: { count: this.streakPopCount, last: this.lastStreakPop },
      crumbs: this.crumbCount,
      upgradePulses: {
        count: this.upgradePulseCount,
        last: this.lastUpgradePulse,
        cause: this.lastUpgradePulseCause,
      },
      upgradeTimers: upgradeTimerFractions(this.upgradeTimers),
      boardCollected: this.pelletProgress.boardCollected,
      pelletsRemaining: this.pelletProgress.pelletsRemaining,
      elroySuppressed: this.elroySuppressed,
      elroyTier: elroyTier(this.pelletsForElroy(), this.currentTuning),
      ghostMode: nameOf(GHOST_AI_MODE, this.settledGhostMode()),
      shieldBounce: this.shieldBounce,
      upgrades: upgrades.owned,
      effectiveUpgrades: this.effectiveUpgrades(),
      timers: {
        freezeMs: upgrades.freezeRemainingMs,
        sonicBoomHitMs: sonicHitRemainingMs(upgrades),
        wallPassMs: upgrades.wallPassRemainingMs,
        invulnMs: upgrades.invulnRemainingMs,
        speedBurstMs: upgrades.speedBurstRemainingMs,
        hyperspeedMs: upgrades.hyperspeedRemainingMs,
        hyperspeedTurnDelayMs: upgrades.hyperspeedTurnDelayMs,
        hyperspeedShieldMs: upgrades.hyperspeedShieldRemainingMs,
        ghostHarvestMs: upgrades.ghostHarvestRemainingMs,
        titheMs: upgrades.titheRemainingMs,
        defyDeathMs: upgrades.defyDeathRemainingMs,
        chaffMs: upgrades.chaff?.remainingMs ?? 0,
        scarecrowScentMs: Math.max(0, ...upgrades.scentLingers.map((linger) => linger.remainingMs)),
        hauntMs: Number.isFinite(upgrades.hauntRemainingMs) ? upgrades.hauntRemainingMs : -1,
        possessionMs: upgrades.possessionRemainingMs,
        wallDropMs:
          upgrades.droppedWall === null
            ? 0
            : Number.isFinite(upgrades.droppedWall.remainingMs)
              ? upgrades.droppedWall.remainingMs
              : -1,
        shieldsBanked: upgrades.shieldsBanked,
        peelsBanked: upgrades.peelsBanked,
        echoesMs: upgrades.pendingEchoes.map((echo) => echo.remainingMs),
        frightenedMs: upgrades.frightenedRemainingMs,
        eatDragMs: this.eatDragMs,
        fruitMs: this.fruitPresence.remainingMs,
        cornucopiaFruitMs: Math.max(0, ...this.cornucopiaFruit.map((fruit) => fruit.ms)),
        turnBoostMs: this.turnTuning.boostMs,
        turnFlashMs: this.turnTuning.flashMs,
        turnCatchGraceMs: this.turnCatchGraceMs,
        warpGlideMs: warpGlideRemainingMs(this.warpGlide),
        programmer: upgrades.programmer,
        ghostWarpGlideMs: ghostWarpGlideRemainingMs(this.ghostCornerWarps),
      },
      timedTunnel: this.timedTunnelSnapshot(),
      lava: this.lavaSnapshot(),
      collapse: {
        chains: this.collapseChains,
        fresh: this.collapseArts.map((art) => art.fresh),
        introMs: this.collapseIntroMs,
      },
      sinkhole: {
        cells: this.sinkholeChain,
        fresh: this.sinkholeChain !== null && isFreshSinkhole(this.levelIndex),
        introMs: this.sinkholeIntroMs,
      },
      mirror: {
        active: upgrades.mirrorActive,
        x: twinPosition?.x ?? null,
        y: twinPosition?.y ?? null,
        col: twinBody?.col ?? null,
        row: twinBody?.row ?? null,
        popProgress: mirrorPopRender(this.mirrorPop)?.progress ?? null,
      },
      speedZones: this.speedZones,
      speedZonesShifting: this.speedZoneShift !== null,
      playerSpeedZone: floatingZoneEffect(this.effectiveUpgrades(), this.playerSpeedZone()),
      chaff: chaffSprites(upgrades.chaff).map(({ x, y }) => ({ x, y })),
      peels: bananaPeelSprites(this.peelBeads()),
      wallDrop: {
        armed: upgrades.wallDropArmed,
        wall:
          upgrades.droppedWall === null
            ? null
            : {
                col: upgrades.droppedWall.col,
                row: upgrades.droppedWall.row,
                passable: upgrades.droppedWall.passable,
              },
      },
      tunnelBoring: {
        charges: this.tunnelBoringCharges,
        cells: this.tunnelBored?.cells.map((cell) => ({ ...cell })) ?? [],
        openCells:
          this.tunnelBored === null
            ? 0
            : openBoredCells(this.tunnelBored.cells, this.tunnelBore).length,
        junkCells: this.tunnelBore.junk.length,
        slowed: tunnelBoringSpeedMul(this.world, this.tunnelBore) < 1,
      },
      inputSuppressed: this.suppressInputUntilKeyRelease,
      dying: this.death !== null,
      deathFrame: this.deathFrame() ?? null,
      reviveProgress:
        this.reviveSplashElapsedMs === null
          ? null
          : reviveSplashProgress(this.reviveSplashElapsedMs),
      moneyTalksElapsedMs: this.moneyTalksSpend?.elapsedMs ?? null,
      interestPop:
        this.interestPop === null
          ? null
          : { count: this.interestPop.count, shown: interestCoinsShown(this.interestPop) },
      powerPelletBreaks: this.powerPelletBreaks.map((brk) => ({
        id: brk.id,
        progress: powerPelletBreakProgress(brk.elapsedMs),
        intensity: brk.intensity,
      })),
      levelTransition: this.levelTransitionRemainingMs > 0,
      bossStageTransition: this.bossStageTransition !== null,
      intermission:
        this.intermission === null
          ? null
          : intermissionFrame(
              this.intermission.id,
              this.intermission.elapsedMs,
              this.intermission.cast,
            ),
      runComplete: this.runEndElapsedMs !== null && this.recorder.outcome === "complete",
      runEnd: this.runEndElapsedMs !== null,
      runEndMenuArmed: this.runEndMenuArmed(),
      highScoresDisabled: this.options.highScoresDisabled,
      inStore: this.store !== null,
      storeStock: this.store?.slots.filter((slot) => !slot.sold).map(storeSlotLabel) ?? null,
      storeFreebie: this.store?.freebie.taken === false ? this.store.freebie.kind : null,
      storeDots: this.store?.dots.length ?? null,
      storeSacrifice: this.store?.sacrifice ?? null,
      storeRoute: this.storeRoute,
      storeEntering: this.storeEntrySlidePx !== null,
      storePrompt:
        this.store === null
          ? null
          : (promptView(this.store, this.quarters, this.runUpgrades.owned)?.kind ?? null),
      boss:
        this.bossState === null
          ? null
          : {
              id: this.bossState.def.id,
              ghostCount: this.bossState.ghostCount,
              chainLive: bossChains(this.world, this.catchOptions()).length > 0,
              stage: this.bossState.stageIndex + 1,
              chainPairs: [...bossStage(this.bossState.def, this.bossState.stageIndex).chainPairs],
              mazeColorInverted: this.bossState.mazeColorInverted,
            },
      runLog: {
        id: this.recorder.record.id,
        outcome: this.recorder.outcome,
        levels: this.recorder.record.levels.length,
        deaths: this.recorder.record.levels.reduce((sum, level) => sum + level.deaths.length, 0),
        tunnelWraps: this.recorder.record.levels.reduce((sum, level) => sum + level.tunnelWraps, 0),
      },
      ...worldSnapshot(this.world),
    };
  }

  private emitTurnSparks(bursts: readonly TurnSparksBurst[]): void {
    for (const burst of bursts) {
      this.recorder.turnSpark(burst.kind);
      this.emit({ type: "turnSparks", ...burst });
    }
  }

  private emit(event: SimEvent): void {
    this.events.push(event);
  }

  private takeEvents(): SimEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  private teleportGhostsToCorners(holdMs: number): void {
    const warps = teleportGhostsToCorners(this.world, holdMs);
    this.recorder.scatterBurst(warps.length);
    this.ghostCornerWarps = mergeGhostCornerWarps(this.ghostCornerWarps, warps);
  }

  private deathFrame(): number | undefined {
    return this.death === null
      ? undefined
      : dotManDeathFrame(this.death, this.currentTuning.deathHoldMs);
  }

  private emitDraw(overrides: Partial<SimRenderOptions> = {}): void {
    this.emit({ type: "draw", options: { ...this.renderOptions(), ...overrides } });
  }

  private releaseDrawable(eid: number): void {
    this.emit({ type: "releaseDrawable", eid });
  }

  private tick(input: SimInput, delta: number): void {
    this.frameKeys = input.keys;
    if (this.warpGlide !== null) {
      this.warpGlide = tickWarpGlide(this.warpGlide, delta);
    }
    this.ghostCornerWarps = tickGhostCornerWarps(this.ghostCornerWarps, delta);
    this.powerPelletBreaks = tickPowerPelletBreaks(this.powerPelletBreaks, delta, (event) =>
      this.emit(event),
    );
    if (this.awaitingStartingCard) {
      if (input.uiOpen) {
        return;
      }
      this.awaitingStartingCard = false;
      this.suppressInputUntilKeyRelease = true;
    }

    if (this.death !== null) {
      const tick = tickDeathSequence(this.death, delta, this.currentTuning);
      this.death = tick.state;
      for (const event of tick.events) {
        this.handleDeathEvent(event);
      }
      if (this.death?.phase === "hold" || this.death?.phase === "fadeToGameOver") {
        this.emitDraw();
      }
      this.tickReviveSplash(delta);
      this.tickMoneyTalks(delta);
      this.tickDeathEffects(delta);
      if (this.runEndElapsedMs !== null) {
        this.runEndElapsedMs += delta;
      }
      return;
    }

    if (this.runEndElapsedMs !== null) {
      this.runEndElapsedMs += delta;
      return;
    }

    if (this.bossStageTransition !== null) {
      this.tickBossStageTransitionFrame(delta);
      return;
    }

    if (this.intermission !== null) {
      this.tickIntermission(this.intermission, delta);
      return;
    }

    if (this.levelTransitionRemainingMs > 0) {
      this.levelTransitionRemainingMs = Math.max(0, this.levelTransitionRemainingMs - delta);
      if (this.levelTransitionRemainingMs === 0) {
        if (hasIntermissionAfter(this.levelIndex)) {
          this.beginIntermission();
        } else if (this.store === null && storeAfterLevel(this.levelIndex, this.midStoreLevel)) {
          this.enterStore();
        } else if (this.levelIndex >= MAX_LEVEL) {
          this.beginRunComplete();
        } else {
          this.advanceToNextLevel();
        }
      }
      return;
    }

    if (this.salvagePrompt() !== null) {
      return;
    }

    if (this.awaitingSalvageClose) {
      if (input.uiOpen) {
        return;
      }
      this.awaitingSalvageClose = false;
      this.suppressInputUntilKeyRelease = true;
    }

    if (this.store !== null) {
      this.tickStore(input, delta);
      return;
    }

    if (this.tickSlot(input, delta)) {
      return;
    }

    if (this.timePennyDrain !== null) {
      this.tickTimePennies(this.timePennyDrain, delta);
      return;
    }

    if (this.awaitingChoice) {
      if (this.pendingChoice !== null || input.uiOpen) {
        return;
      }
      this.awaitingChoice = false;
      this.suppressInputUntilKeyRelease = true;
    }

    if (this.pendingLevelClear) {
      this.pendingLevelClear = false;
      this.beginLevelTransition();
      return;
    }

    this.replayRecorder.sample(this.world, delta, () => this.replayLook());
    this.recorder.playFrame(delta, {
      freeze: frozenGhostEid(this.runUpgrades) !== null,
      invuln: playerIsInvulnerable(this.runUpgrades),
      wallPass: wallPassActive(this.runUpgrades),
      speedBurst: speedBurstActive(this.runUpgrades),
      ghostHarvest: ghostHarvestActive(this.runUpgrades),
    });
    this.tickTimedTunnel(delta);
    this.tickSpeedZoneShift(delta);
    this.collapseIntroMs = Math.min(RUBBLE_INTRO_MS, this.collapseIntroMs + delta);
    this.sinkholeIntroMs = Math.min(
      this.currentTuning.sinkholeIntroMs,
      this.sinkholeIntroMs + delta,
    );
    this.syncSinkholeFloat();
    this.recorder.lives(this.lives);
    const diagonalAllowed = wallPassActive(this.runUpgrades);
    const programming = this.runUpgrades.programmer !== null;
    const possessing = possessionActive(this.runUpgrades);
    const possessedEid = possessedGhostEid(this.runUpgrades);
    const turnTuningOpts =
      !diagonalAllowed &&
      !programming &&
      !possessing &&
      hasUpgrade(this.effectiveUpgrades(), "passiveTurnTuning")
        ? { prevKeys: this.prevKeys, solids: getActiveLayout().playerSolids }
        : undefined;
    let turnTap: TurnTap | null = null;
    const warping = this.warpGlide !== null;
    const bouncing = this.shieldBounce.player !== null;
    if (possessing && possessedEid !== null) {
      applyHeldKeysToEid(possessedEid, input.keys);
      for (const eid of query(this.world, [Player, Input])) {
        Input.direction[eid] = DIRECTION.none;
      }
    } else if (programming) {
      this.recordProgrammerPresses(input.keys);
    } else if (this.suppressInputUntilKeyRelease) {
      if (!warping && !anyKeyHeld(input.keys)) {
        this.suppressInputUntilKeyRelease = false;
        applyHeldKeys(this.world, input.keys, { diagonalAllowed });
      }
    } else if (!warping && !bouncing) {
      turnTap = applyHeldKeys(this.world, maskStaleKeys(input.keys, this.bounceStaleKeys), {
        diagonalAllowed,
        turnTuning: turnTuningOpts,
      });
    }
    if (turnTuningOpts) {
      this.emitTurnSparks(
        this.turnTuning.noteKeys(
          this.world,
          this.effectiveUpgrades(),
          this.prevKeys,
          input.keys,
          turnTap,
          delta,
        ),
      );
    }
    const hasInput = hasPlayerDirectionInput(this.world);
    this.lavaStarted = this.lavaStarted || hasInput;
    if (this.lavaStarted) {
      this.lavaElapsedMs += delta;
    }

    this.ghostReleaseClock = tickGhostRelease(
      this.ghostReleaseClock,
      hasInput,
      delta,
      this.pelletProgress.boardCollected,
    );
    const releaseAdds = this.releaseAdds();
    ghostHouseSeating(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
      releaseAdds,
    );
    if (
      ghostRelease(
        this.world,
        this.ghostReleaseClock,
        this.pelletProgress.boardCollected,
        this.afterLifeRelease,
        releaseAdds,
      )
    ) {
      this.ghostReleaseClock = resetIdle(this.ghostReleaseClock);
    }

    this.runUpgrades = tickFreeze(this.runUpgrades, delta);
    this.runUpgrades = tickSonicHits(this.runUpgrades, delta);
    const wasWallPass = wallPassActive(this.runUpgrades);
    this.runUpgrades = tickWallPass(this.runUpgrades, delta);
    if (wasWallPass && !wallPassActive(this.runUpgrades)) {
      snapPlayerToNearestWalkable(this.world);
    }
    this.runUpgrades = tickInvuln(this.runUpgrades, delta);
    this.turnCatchGraceMs = tickTurnCatchGrace(this.turnCatchGraceMs, delta);
    this.runUpgrades = tickSpeedBurst(this.runUpgrades, delta);
    this.runUpgrades = tickHyperspeed(this.runUpgrades, delta);
    if (!hyperspeedActive(this.runUpgrades)) {
      this.hyperspeedDirection = null;
    }
    this.runUpgrades = tickGhostHarvest(this.runUpgrades, delta);
    this.runUpgrades = tickTithe(this.runUpgrades, delta);
    this.runUpgrades = tickDefyDeath(this.runUpgrades, delta);
    this.runUpgrades = tickHaunt(this.runUpgrades, delta);
    this.runUpgrades = tickWallDrop(this.runUpgrades, delta);
    this.tickChaff(delta);
    if (possessionActive(this.runUpgrades)) {
      const possessionBefore = true;
      this.runUpgrades = tickPossession(this.runUpgrades, delta);
      if (possessionBefore && !possessionActive(this.runUpgrades)) {
        this.finishPossession();
        return;
      }
    } else {
      this.runUpgrades = tickFrightened(this.runUpgrades, delta);
    }
    const respawnTick = tickPowerPelletRespawns(this.pendingPowerPelletRespawns, delta);
    this.pendingPowerPelletRespawns = respawnTick.pending;
    for (const pos of respawnTick.ready) {
      this.spawnRespawnedPowerPellet(pos.x, pos.y);
    }
    if (this.fireDueEchoes(delta)) {
      return;
    }
    this.eatDragMs = tickEatDrag(this.eatDragMs, delta);
    this.turnTuning.tick(delta);
    this.mirrorPop = tickMirrorPop(this.mirrorPop, delta);
    this.checkMirrorPop();
    const levelSpeedMul = speedLevelMultiplier(this.levelIndex, this.currentTuning);
    const hyperspeedMul =
      this.runUpgrades.hyperspeedTurnDelayMs > 0
        ? 0
        : levelSpeedMul * hyperspeedMultiplier(this.effectiveUpgrades());
    const programmerPhase = this.runUpgrades.programmer?.phase ?? null;
    const rawPlayerSpeedMul =
      programmerPhase === "recording" || warping || bouncing || possessing
        ? 0
        : programmerPhase === "running"
          ? levelSpeedMul * HYPERSPEED_MUL
          : hyperspeedActive(this.runUpgrades)
            ? hyperspeedMul
            : levelSpeedMul *
              playerSpeedMultiplier(this.effectiveUpgrades()) *
              cellSpeedMultiplier(this.effectiveUpgrades(), enteringEmptyCell(this.world)) *
              (speedBurstActive(this.runUpgrades)
                ? speedBurstMultiplier(this.effectiveUpgrades())
                : 1) *
              eatDragMultiplier(this.eatDragMs, this.currentTuning) *
              this.turnTuning.speedMultiplier(this.effectiveUpgrades()) *
              trinketPlayerSpeedMul(this.effectiveUpgrades(), playerInTunnel(this.world)) *
              speedZoneMultiplier(this.zoneEffects().effect);
    const playerSpeedMul =
      rawPlayerSpeedMul *
      titheSpeedMultiplier(this.runUpgrades, this.effectiveUpgrades()) *
      tunnelBoringSpeedMul(this.world, this.tunnelBore);
    applyPlayerSpeed(this.world, playerSpeedMul, this.currentTuning);
    this.ghostTraction.tick(this.world, this.effectiveUpgrades(), delta);
    applyGhostSpeed(this.world, this.pelletsForElroy(), this.levelIndex, {
      extraSpeedMul: this.ghostTraction.speedMultiplier(this.effectiveUpgrades()),
      ghostSpeedMul:
        (this.bossState === null ? levelSpeedMul : 1) *
        ghostSpeedMultiplier(this.effectiveUpgrades()),
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      heldGhostEids: new Set([
        ...heldGhostEids(this.ghostCornerWarps),
        ...shieldBounceHeldGhosts(this.shieldBounce),
        ...sonicStunnedEids(this.runUpgrades, this.effectiveUpgrades()),
      ]),
      frightenedGhostEids: frightenedGhostEids(this.runUpgrades),
      tunnelSpeedRatio: ghostTunnelSpeedRatio(this.effectiveUpgrades()),
      tuning: this.currentTuning,
    });
    if (this.bossState?.def.chained === false) {
      bossGhostBlock(this.world);
    }
    this.stepTunnelBoring(delta);
    const playerSolids = this.playerSolids();
    const facingBeforeMove = playerFacing(this.world);
    const positionBeforeMove = this.playerPosition();
    const blockTunnelRow = this.closedGatedTunnelRow();
    this.shieldBounce = tickShieldBounce(this.world, this.shieldBounce, delta, {
      playerSolids,
      ghostsBlockTunnels: this.ghostsBlockedFromTunnels(),
      blockTunnelRow,
      droppedWall: this.runUpgrades.droppedWall,
    });
    const moveFrame = (frameDelta: number): void => {
      movement(
        this.world,
        frameDelta,
        playerSolids,
        playerPreTurnPx(this.currentTuning) + trinketPreTurnBonusPx(this.effectiveUpgrades()),
        this.ghostsBlockedFromTunnels(),
        blockTunnelRow,
        this.runUpgrades.droppedWall,
      );
      this.runUpgrades = trackWallOccupancy(this.world, this.runUpgrades);
    };
    if (bouncing) {
      moveFrame(delta);
    } else if (programmerPhase === "running") {
      this.moveHyperspeed(delta, moveFrame, () => this.stepProgrammer());
    } else if (hyperspeedActive(this.runUpgrades)) {
      this.moveHyperspeed(delta, moveFrame, () => this.noteHyperspeedTurn());
    } else {
      moveFrame(delta);
    }
    this.notePlayerMovement(positionBeforeMove, hasInput, warping, delta);
    this.updateWallDrop(facingBeforeMove);
    this.noteTunnelExit(positionBeforeMove);
    this.tickSpeedTrail(delta);
    this.sonicBoom();
    const facingAfterMove = playerFacing(this.world);
    this.noteTurnCatchGrace(facingBeforeMove, facingAfterMove);
    this.emitTurnSparks(
      this.turnTuning.afterMove(
        this.world,
        this.effectiveUpgrades(),
        facingBeforeMove,
        facingAfterMove,
      ),
    );
    this.checkStreakCell();

    if (ghostExitHouse(this.world) && !this.ghostModeClock.active) {
      this.ghostModeClock = startGhostModeClock(this.levelIndex, this.currentTuning);
    }

    this.clock = tickRunClock(this.clock, hasInput, delta, this.currentTuning);
    this.emit({ type: "timer" });

    const playerFrame = possessionActive(this.runUpgrades)
      ? emptyPlayerPelletFrame()
      : mergePlayerPelletFrames(this.hyperspeedPellets, this.collectBodyPellets());
    this.hyperspeedPellets = emptyPlayerPelletFrame();
    const ghostFrame = ghostHarvestActive(this.runUpgrades)
      ? harvestPelletsByGhosts(this.world)
      : { powerRemoved: 0, removedEids: [], removedPowerPositions: [] };
    const possessed = possessedGhostEid(this.runUpgrades);
    const possessionFrame =
      possessed === null
        ? { powerRemoved: 0, removedEids: [] as number[], removedPowerPositions: [] }
        : harvestPelletsByGhost(this.world, possessed);
    const powerRemoved =
      playerFrame.powerRemoved + ghostFrame.powerRemoved + possessionFrame.powerRemoved;
    const removedPelletEids = [
      ...playerFrame.removedEids,
      ...ghostFrame.removedEids,
      ...possessionFrame.removedEids,
    ];
    const removedPowerPositions = [
      ...playerFrame.removedPowerPositions,
      ...ghostFrame.removedPowerPositions,
      ...possessionFrame.removedPowerPositions,
    ];
    this.nextPowerPelletBreakId = startPowerPelletBreaks(
      this.world,
      this.powerPelletBreaks,
      this.nextPowerPelletBreakId,
      playerFrame.removedPowerPositions,
      (event) => this.emit(event),
      playerSpeed(this.currentTuning),
      this.currentTuning,
    );
    for (const eid of removedPelletEids) {
      this.releaseDrawable(eid);
    }
    let streakFires = 0;
    if (playerFrame.removedCells.length > 0) {
      streakFires = this.applyStreakCells(playerFrame.removedCells);
    } else {
      this.pennies = tickStreakIdle(this.pennies, delta, this.currentTuning.pennyStreakIdleMs);
    }
    streakFires += this.gleanCrumbs();
    const removed = removedPelletEids.length;
    this.eatDragMs = eatDragAfterCollect(
      this.eatDragMs,
      removed - powerRemoved,
      powerRemoved,
      this.currentTuning,
    );
    if (removed > 0) {
      this.emit({
        type: "pelletSfx",
        previousCollected: this.lifetimeCollected,
        removed,
        powerRemoved,
      });
    }
    if (hasUpgrade(this.effectiveUpgrades(), "passivePowerPelletRecharge")) {
      this.queueSecondChomp(removedPowerPositions);
    }
    this.recorder.powerPellets("player", playerFrame.powerRemoved);
    this.recorder.powerPellets("ghostHarvest", ghostFrame.powerRemoved);
    const powerEffects = this.applyPowerEffects(this.bankAndCountPickupFires(powerRemoved));
    let bonusRemoved = 0;
    if (powerEffects.collectExtraPellets > 0) {
      const bonusEids = collectExtraForBodies(
        this.world,
        powerEffects.collectExtraPellets,
        this.twinPosition(),
      );
      for (const eid of bonusEids) {
        this.releaseDrawable(eid);
      }
      bonusRemoved = bonusEids.length;
      if (bonusRemoved > 0) {
        this.emitMunch();
      }
    }
    const transferred = this.applyRemoteTransferStep(removed + bonusRemoved);
    const totalRemoved = removed + bonusRemoved + transferred;
    const collectResult = applyPelletCollect(
      this.pelletProgress,
      totalRemoved,
      noRequiredPelletsLeft(this.world),
    );
    this.pelletProgress = collectResult.progress;
    if (totalRemoved > 0) {
      this.lifetimeCollected += totalRemoved;
    }
    this.notePellets();
    if (this.fireStreakEngine(streakFires)) {
      return;
    }

    const modeStep = resolveGhostModeStep(this.ghostModeClock, delta, this.currentTuning);
    this.ghostModeClock = modeStep.clock;
    const ghostMode = this.settledGhostMode();
    this.previousEffectiveGhostMode = ghostMode;
    ghostAi(
      this.world,
      ghostMode,
      this.pelletsForElroy(),
      this.currentTuning,
      this.ghostsBlockedFromTunnels(),
      new Set([
        ...frightenedGhostEids(this.runUpgrades),
        ...(possessedGhostEid(this.runUpgrades) === null
          ? []
          : [possessedGhostEid(this.runUpgrades)!]),
      ]),
      blockTunnelRow,
      this.runUpgrades.droppedWall,
      this.twinBody(),
      this.runUpgrades.chaff?.decoys,
      scentFieldFor(this.effectiveUpgrades(), this.world, this.runUpgrades.scentLingers),
    );
    frightenedGhostAi(
      this.world,
      frightenedGhostEids(this.runUpgrades),
      this.random.stream("frightened", this.levelIndex),
      this.ghostsBlockedFromTunnels(),
      blockTunnelRow,
      this.runUpgrades.droppedWall,
    );
    for (let recalled = 0; recalled < powerEffects.recallGhostCount; recalled += 1) {
      this.recordRecall(
        recallClosestGhostToHouse(
          this.world,
          this.ghostReleaseClock,
          this.pelletProgress.boardCollected,
          this.afterLifeRelease,
          releaseAdds,
          frozenGhostEid(this.runUpgrades),
        ),
      );
    }
    if (powerEffects.cornerTeleportHoldMs !== null) {
      this.teleportGhostsToCorners(powerEffects.cornerTeleportHoldMs);
    }
    if (powerEffects.warpPlayerFarthest) {
      this.warpPlayer();
    }

    this.runUpgrades = tickScarecrow(this.runUpgrades, this.effectiveUpgrades(), delta);
    const stacksFruit = fruitStacksSideBySide(this.effectiveUpgrades());
    this.msSinceFruitSpawn += Math.max(0, delta);
    this.flushPendingCornucopia();
    this.tickCornucopiaFruit(delta);
    const fruitTick = tickFruitPresence(
      this.fruitPresence,
      this.pelletProgress.boardCollected,
      delta,
      this.levelIndex,
      {
        feastBase: fruitFeastThresholds(this.effectiveUpgrades()),
        lifetimeMul: fruitLifetimeMultiplier(this.effectiveUpgrades()),
        persist: fruitPersistsUntilLevelEnd(this.effectiveUpgrades()),
        stack: stacksFruit,
        blocked:
          this.cornucopiaFruit.length > 0 && !cornucopiaAlongsideOwned(this.effectiveUpgrades()),
        tuning: this.currentTuning,
      },
    );
    if (fruitTick.action === "spawn" || fruitTick.action === "replace") {
      this.spawnFruitEntity(stacksFruit);
    }

    const fruitTilesBefore = fruitTiles(this.world);
    const removedFruitEids = collectFruitForBodies(this.world, this.twinPosition());
    for (const eid of removedFruitEids) {
      this.releaseDrawable(eid);
    }
    this.runUpgrades = leaveScent(
      this.runUpgrades,
      this.effectiveUpgrades(),
      removedFruitEids,
      fruitTilesBefore,
    );
    this.noteFruitRemoved(removedFruitEids);
    this.collectSlotPickupEntities();
    const fruitEaten = removedFruitEids.length + this.hyperspeedFruitEaten;
    this.hyperspeedFruitEaten = 0;
    if (fruitEaten > 0) {
      this.emitMunch();
      this.recorder.fruitEaten(fruitEaten);
      const fruitQuarters = fruitQuartersPerFruit(this.effectiveUpgrades());
      if (fruitQuarters !== null) {
        this.grantQuarters(fruitEaten * fruitQuarters, "fruit", false);
      } else {
        const fruitCharge = addPennyCharge(this.pennies, fruitEaten * FRUIT_BONUS_CHARGE);
        this.emit({ type: "fruitBonus" });
        this.applyPennies({ bar: fruitCharge.bar, tier: 0, filled: fruitCharge.filled });
      }
      this.fruitPresence = markFruitCollected(fruitTick.state, this.regularFruitRemains());
      if (hasUpgrade(this.effectiveUpgrades(), "fruitPowerPellet")) {
        this.recorder.powerPellets("fruit", 1);
        const fires = this.bankAndCountPickupFires(1);
        if (fires > 0) {
          const bases = pickFruitPowerBases(
            this.effectiveUpgrades(),
            this.random.stream("fruitPower", this.levelIndex),
          );
          if (bases.length > 0 && this.firePowerPelletEffects(fires, bases)) {
            return;
          }
        }
      }
    } else if (fruitTick.action === "despawn") {
      this.clearFruitEntities(true);
      this.fruitPresence = fruitTick.state;
    } else {
      this.fruitPresence = fruitTick.state;
    }

    if (collectResult.shouldRecordClear) {
      this.triggerLevelClear();
      return;
    }

    this.tickBoss();
    this.eatFrightenedGhosts();

    const catchOptions = this.catchOptions();
    this.stepPeelTail(delta);
    if (this.tryBreakPeel(catchOptions)) {
      this.emitDraw();
      return;
    }
    const playerCaughtBy =
      catchPlayer(this.world, catchOptions) ?? chainCatch(this.world, catchOptions);
    const playerLava = playerCaughtBy === null && this.touchesLava(catchOptions);
    const twinCatch = playerCaughtBy === null && !playerLava ? this.twinCatch(catchOptions) : null;
    const caughtBy = playerCaughtBy ?? twinCatch?.eid ?? null;
    const lavaKill = playerLava || twinCatch?.lava === true;
    this.emitDraw();

    if (caughtBy === null && !lavaKill) {
      this.recorder.nearMisses(this.world, getActiveLayout().tileSize);
      this.payNearMisses(catchOptions);
    } else {
      if (
        !defyDeathActive(this.runUpgrades) &&
        (this.breakShield(caughtBy, playerCaughtBy) || this.breakHyperspeedShield(caughtBy))
      ) {
        return;
      }
      if (this.runUpgrades.mirrorActive && mirrorSavesLife(this.effectiveUpgrades())) {
        this.popMirror();
        if (twinCatch === null) {
          this.runUpgrades = applyShieldBreakInvuln(this.runUpgrades);
        }
        return;
      }
      const fellAt = twinCatch?.position ?? this.playerPosition();
      const deathCell =
        fellAt === null ? null : { col: worldToCol(fellAt.x), row: worldToRow(fellAt.y) };
      const ghostsOut = query(this.world, [Ghost, GhostPhase]).filter(
        (eid) => GhostPhase.value[eid] !== GHOST_PHASE.inHouse,
      ).length;
      let harvestedCount = 0;
      if (hasUpgrade(this.effectiveUpgrades(), "passiveDeathsHarvest")) {
        const harvested = harvestNearbyPellets(
          this.world,
          deathsHarvestRadiusTiles(this.effectiveUpgrades()),
          fellAt ?? undefined,
        );
        harvestedCount = harvested.length;
        if (harvested.length > 0) {
          for (const eid of harvested) {
            this.releaseDrawable(eid);
          }
          const harvestResult = applyPelletCollect(
            this.pelletProgress,
            harvested.length,
            noRequiredPelletsLeft(this.world),
          );
          this.pelletProgress = harvestResult.progress;
          this.lifetimeCollected += harvested.length;
          if (harvestResult.shouldRecordClear) {
            this.triggerLevelClear();
            return;
          }
        }
      }
      this.fellAt = fellAt;
      this.caughtByEid = caughtBy;
      this.emit({ type: "loopStop", id: "gameplayMusic" });
      const defied = defyDeathActive(this.runUpgrades);
      const boughtFor =
        defied || this.options.infiniteLives
          ? null
          : lastLifeSaveCost(this.lives, this.quarters, moneyTalksCost(this.effectiveUpgrades()));
      if (boughtFor !== null) {
        this.moneyTalksSpend = {
          elapsedMs: 0,
          count: boughtFor,
          paid: 0,
          quartersBefore: this.quarters,
        };
        this.tickMoneyTalks(0);
      }
      const saved = defied || boughtFor !== null;
      this.reviveSplashPending = saved;
      this.emit({ type: "sfx", id: saved ? "revive" : "death" });
      const livesBefore = this.lives;
      const elroyAtDeath = elroyTier(this.pelletsForElroy(), this.currentTuning);
      const result =
        this.options.infiniteLives || saved
          ? { lives: this.lives, gameOver: false }
          : livesRemainingAfterCatch(this.lives);
      this.lives = result.lives;
      if (
        this.lives < livesBefore &&
        elroyAtDeath !== ELROY_TIER.none &&
        caughtBy !== null &&
        GhostKind.kind[caughtBy] === GHOST_KIND.blinky
      ) {
        this.elroySuppressed = true;
      }
      this.emit({ type: "lives", pulse: false });
      const lifeLost = this.lives < livesBefore;
      const owned = this.effectiveUpgrades();
      if (
        shouldFireMartyr(owned, {
          infiniteLives: this.options.infiniteLives === true,
          lifeLost,
          saved,
        })
      ) {
        this.recorder.activation("martyr");
        this.pulseCause = "passiveMartyr";
        const cleared = this.firePowerPelletEffects(1);
        this.emitDraw();
        if (cleared) {
          this.lives = lifeAfterDeathClear(livesBefore);
          this.emit({ type: "lives", pulse: true });
          this.replayRecorder.death(this.world);
          this.recorder.death({
            col: deathCell?.col ?? -1,
            row: deathCell?.row ?? -1,
            ghost: ghostName(this.world, caughtBy),
            bossGhost: caughtBy !== null && hasComponent(this.world, caughtBy, BossGhost),
            lava: lavaKill,
            countdown: this.clock.remaining,
            pelletsLeft: this.pelletProgress.pelletsRemaining,
            ghostMode: nameOf(GHOST_AI_MODE, this.previousEffectiveGhostMode),
            elroyTier: elroyAtDeath,
            ghostsOut,
            livesAfter: this.lives,
            defied,
            moneyTalks: boughtFor !== null,
            bountyPaid: false,
            harvested: harvestedCount,
          });
          return;
        }
      }
      const startPossession = shouldStartPossession(owned, {
        infiniteLives: this.options.infiniteLives === true,
        lifeLost,
        lava: lavaKill,
        caughtBy,
      });
      const bountyPaid = !result.gameOver && this.payDeathsBounty();
      this.replayRecorder.death(this.world);
      this.recorder.death({
        col: deathCell?.col ?? -1,
        row: deathCell?.row ?? -1,
        ghost: ghostName(this.world, caughtBy),
        bossGhost: caughtBy !== null && hasComponent(this.world, caughtBy, BossGhost),
        lava: lavaKill,
        countdown: this.clock.remaining,
        pelletsLeft: this.pelletProgress.pelletsRemaining,
        ghostMode: nameOf(GHOST_AI_MODE, this.previousEffectiveGhostMode),
        elroyTier: elroyAtDeath,
        ghostsOut,
        livesAfter: this.lives,
        defied,
        moneyTalks: boughtFor !== null,
        bountyPaid,
        harvested: harvestedCount,
      });
      if (startPossession && caughtBy !== null) {
        this.beginPossession(caughtBy, result.gameOver, livesBefore);
        return;
      }
      if (result.gameOver) {
        this.saveRun();
        this.recorder.finish("death");
        this.emitRunLog();
      }
      this.death = beginDeathSequence(result.gameOver);
    }
  }

  private twinPosition(): Point | null {
    const player = this.runUpgrades.mirrorActive ? this.playerPosition() : null;
    if (player === null) {
      return null;
    }
    return twinPoint(player, getActiveLayout());
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

  private twinCatch(
    options: CatchOptions,
  ): { eid: number | null; lava: boolean; position: Point } | null {
    const position = this.twinPosition();
    if (position === null) {
      return null;
    }
    const at = { ...options, at: position };
    const eid = catchPlayer(this.world, at) ?? chainCatch(this.world, at);
    const lava = eid === null && this.touchesLava(options, position);
    return eid === null && !lava ? null : { eid, lava, position };
  }

  private collectBodyPellets(): PlayerPelletFrame {
    return collectPelletsForBodies(
      this.world,
      {
        radiusBonusPx: pelletCollectRadiusBonusPx(this.effectiveUpgrades()),
        solids: getActiveLayout().playerSolids,
      },
      this.twinPosition(),
    );
  }

  private twinRenderBody(): NonNullable<SimRenderOptions["mirror"]> | null {
    const position = this.twinPosition();
    return position === null
      ? null
      : { ...position, facing: mirrorFacing(playerFacing(this.world)) };
  }

  private zoneEffects(): ReturnType<typeof sharedZoneEffect> {
    const owned = this.effectiveUpgrades();
    const player = floatingZoneEffect(owned, this.playerSpeedZone());
    const twin = this.twinBody();
    const eid = query(this.world, [Player, Velocity])[0];
    if (twin === null || eid === undefined) {
      return sharedZoneEffect(player, null);
    }
    const velocity = { x: Velocity.x[eid] ?? 0, y: Velocity.y[eid] ?? 0 };
    return sharedZoneEffect(
      player,
      floatingZoneEffect(owned, twinZoneEffect(this.speedZones, twin, velocity)),
    );
  }

  private checkMirrorPop(): void {
    if (!this.runUpgrades.mirrorActive) {
      return;
    }
    const cell = playerCell(this.world);
    const player = this.playerPosition();
    if (
      cell !== null &&
      player !== null &&
      (twinDesynced(this.playerSolids(), cell) ||
        this.zoneEffects().conflict ||
        twinTouchesPlayer(player, getActiveLayout()))
    ) {
      this.popMirror();
    }
  }

  private popMirror(): void {
    const position = this.twinPosition();
    this.runUpgrades = endMirror(this.runUpgrades);
    if (position !== null) {
      this.mirrorPop = { ...position, elapsedMs: 0 };
    }
  }

  private catchOptions(): CatchOptions {
    return {
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      skipGhostEids: new Set([
        ...glidingGhostEids(this.ghostCornerWarps),
        ...shieldBounceCatchSkips(this.shieldBounce),
        ...sonicStunnedEids(this.runUpgrades, this.effectiveUpgrades()),
        ...(possessedGhostEid(this.runUpgrades) === null
          ? []
          : [possessedGhostEid(this.runUpgrades)!]),
      ]),
      edibleGhostEids: frightenedGhostEids(this.runUpgrades),
      playerInvulnerable:
        this.options.godMode ||
        playerIsInvulnerable(this.runUpgrades) ||
        possessionActive(this.runUpgrades),
      turnCatchGrace: this.turnCatchGraceMs > 0,
    };
  }

  private noteTurnCatchGrace(facingBefore: Direction, facingAfter: Direction): void {
    if (!isPerpendicularTurn(facingBefore, facingAfter)) {
      return;
    }
    this.turnCatchGraceMs = Math.max(this.turnCatchGraceMs, TURN_CATCH_GRACE_MS);
  }

  private releaseAdds(): GhostReleaseAdds {
    const haunted = hauntedGhostEid(this.runUpgrades);
    return {
      delayAddMs: ghostHouseReleaseDelayAddMs(this.effectiveUpgrades()),
      reliefPelletAdd: ghostHouseReliefPelletAdd(this.effectiveUpgrades()),
      kindAdds: trinketKindReleaseAdds(this.effectiveUpgrades()),
      tuning: this.currentTuning,
      heldGhostEids: [...(haunted === null ? [] : [haunted]), ...this.runUpgrades.hunterHeldEids],
    };
  }

  private eatFrightenedGhosts(): void {
    const gliding = glidingGhostEids(this.ghostCornerWarps);
    const edible = new Set(
      [...frightenedGhostEids(this.runUpgrades)].filter((eid) => !gliding.has(eid)),
    );
    const possessed = possessedGhostEid(this.runUpgrades);
    const eaten =
      possessed === null
        ? edibleGhostsTouchingPlayer(this.world, edible)
        : edibleGhostsTouchingEid(this.world, possessed, edible);
    for (const eid of eaten) {
      if (eid === frozenGhostEid(this.runUpgrades)) {
        this.runUpgrades = { ...this.runUpgrades, freezeRemainingMs: 0, frozenGhostEid: null };
      }
      const from = { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
      const ate = eatFrightenedGhost(
        this.runUpgrades,
        eid,
        hunterHoldsEaten(this.effectiveUpgrades()),
      );
      this.runUpgrades = ate.state;
      sendGhostToHouse(
        this.world,
        eid,
        this.ghostReleaseClock,
        this.pelletProgress.boardCollected,
        this.afterLifeRelease,
        this.releaseAdds(),
      );
      const to = { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
      this.ghostCornerWarps = mergeGhostCornerWarps(this.ghostCornerWarps, [
        { eid, glide: startWarpGlide(from, to), holdMs: 0 },
      ]);
      const charged = addPennyCharge(this.pennies, ate.charge);
      this.applyPennies({ bar: charged.bar, tier: 0, filled: charged.filled }, "hunter");
      this.recorder.activation("ghostEaten");
    }
    if (eaten.length > 0) {
      this.emitMunch();
    }
  }

  private rosterKinds(): readonly GhostKindId[] {
    return ghostKindsForLevel(this.levelIndex + 1, this.rosterId);
  }

  private pelletsForElroy(): number {
    return this.elroySuppressed ? Number.MAX_SAFE_INTEGER : this.pelletProgress.pelletsRemaining;
  }

  private ghostsBlockedFromTunnels(): boolean {
    return (
      this.bossState?.def.chained === true || ghostsBlockedFromTunnels(this.effectiveUpgrades())
    );
  }

  private timedTunnelWallPassLoopActive(): boolean {
    return wallPassActive(this.runUpgrades) && wallPassLoopOwned(this.effectiveUpgrades());
  }

  private resetTimedTunnel(): void {
    this.timedTunnelElapsedMs = 0;
    if (!isTimedTunnelLevel(this.levelIndex)) {
      this.timedTunnelGatedRow = null;
      return;
    }
    this.timedTunnelGatedRow = pickTimedTunnelRow(
      horizontalTunnelRows(),
      this.random.stream("timedTunnel", this.levelIndex),
    );
  }

  private resetLavaZone(): void {
    this.lavaElapsedMs = 0;
    this.lavaStarted = false;
    this.lavaZone =
      this.options.levelModifiers && isLavaZoneLevel(this.levelIndex)
        ? pickLavaZone(
            getActiveLayout(),
            {
              tunnelRows: horizontalTunnelRows(),
              cells: (this.speedZoneShift
                ? [...this.speedZoneShift.from, ...this.speedZoneShift.to]
                : this.speedZones
              ).flatMap(speedZoneCells),
            },
            this.random.stream("lavaZone", this.levelIndex),
          )
        : null;
  }

  private lavaRenderState(): LavaRenderState | null {
    if (this.lavaZone === null) {
      return null;
    }
    return {
      zone: this.lavaZone,
      phase: lavaPhase(this.lavaElapsedMs),
      reachTiles: lavaReachTiles(this.lavaElapsedMs),
      flashOn: lavaFlashOn(this.lavaElapsedMs),
    };
  }

  private lavaSnapshot() {
    const state = this.lavaRenderState();
    if (state === null) {
      return null;
    }
    const { zone, ...rest } = state;
    return { ...zone, ...rest, started: this.lavaStarted };
  }

  private touchesLava(catchOptions: CatchOptions, at?: Point): boolean {
    const eid = query(this.world, [Player, Position, Drawable])[0];
    if (
      this.lavaZone === null ||
      eid === undefined ||
      catchOptions.playerInvulnerable === true ||
      floatsOverHazards(this.effectiveUpgrades())
    ) {
      return false;
    }
    return lavaTouchesCircle(
      this.lavaZone,
      lavaReachTiles(this.lavaElapsedMs),
      at?.x ?? Position.x[eid] ?? 0,
      at?.y ?? Position.y[eid] ?? 0,
      Drawable.radius[eid] ?? 0,
    );
  }

  private resetSpeedZones(): void {
    this.speedZoneShiftMs = 0;
    if (!this.options.levelModifiers) {
      this.speedZones = [];
      this.speedZoneShift = null;
      return;
    }
    const layout = getActiveLayout();
    const base = this.collapseSpeedBoard ?? layout;
    const [previous, current] = speedZonesByLevel(base, this.levelIndex, (level) =>
      this.random.stream("speedZones", level),
    ).slice(-2);
    const shift = speedZoneShift(previous!, current!);
    this.speedZoneShift = speedZoneShiftSteps(shift) > 0 ? shift : null;
    this.speedZones = speedZoneShiftFrame(shift, 0);
  }

  private tickSpeedZoneShift(deltaMs: number): void {
    if (this.speedZoneShift === null) {
      return;
    }
    const before = Math.floor(this.speedZoneShiftMs / SPEED_ZONE_SHIFT_STEP_MS);
    this.speedZoneShiftMs += deltaMs;
    const step = Math.floor(this.speedZoneShiftMs / SPEED_ZONE_SHIFT_STEP_MS);
    if (step === before) {
      return;
    }
    this.speedZones = speedZoneShiftFrame(this.speedZoneShift, step);
    if (step >= speedZoneShiftSteps(this.speedZoneShift)) {
      this.speedZoneShift = null;
    }
  }

  private speedZoneRider(): SimRenderOptions["speedZoneRider"] {
    const effect =
      this.death === null
        ? floatingZoneEffect(this.effectiveUpgrades(), this.playerSpeedZone())
        : null;
    const eid = query(this.world, [Player, Velocity])[0];
    if (effect === null || eid === undefined) {
      return null;
    }
    return {
      x: Position.x[eid] ?? 0,
      y: Position.y[eid] ?? 0,
      dx: Math.sign(Velocity.x[eid] ?? 0),
      dy: Math.sign(Velocity.y[eid] ?? 0),
      effect,
    };
  }

  private playerSpeedZone(): SpeedZoneEffect | null {
    const cell = playerCell(this.world);
    const zone = cell === null ? null : speedZoneAt(this.speedZones, cell.col, cell.row);
    if (zone === null) {
      return null;
    }
    const eid = query(this.world, [Player, Velocity])[0];
    return eid === undefined
      ? null
      : speedZoneEffect(zone, Velocity.x[eid] ?? 0, Velocity.y[eid] ?? 0);
  }

  private tickTimedTunnel(deltaMs: number): void {
    if (this.timedTunnelGatedRow === null) {
      return;
    }
    this.timedTunnelElapsedMs += deltaMs;
  }

  private closedGatedTunnelRow(): number | null {
    if (
      this.timedTunnelGatedRow === null ||
      timedTunnelPhase(this.timedTunnelElapsedMs) !== "closed" ||
      this.timedTunnelWallPassLoopActive()
    ) {
      return null;
    }
    return this.timedTunnelGatedRow;
  }

  private timedTunnelSnapshot(): {
    row: number;
    phase: TimedTunnelPhase;
    remainingMs: number;
  } | null {
    if (this.timedTunnelGatedRow === null) {
      return null;
    }
    return {
      row: this.timedTunnelGatedRow,
      phase: timedTunnelPhase(this.timedTunnelElapsedMs),
      remainingMs: timedTunnelPhaseRemainingMs(this.timedTunnelElapsedMs),
    };
  }

  private timedTunnelRenderState(): {
    row: number;
    phase: TimedTunnelPhase;
    gateVisible: boolean;
  } | null {
    if (this.timedTunnelGatedRow === null) {
      return null;
    }
    const phase = timedTunnelPhase(this.timedTunnelElapsedMs);
    return {
      row: this.timedTunnelGatedRow,
      phase,
      gateVisible: timedTunnelGateVisible(phase, this.timedTunnelElapsedMs),
    };
  }

  private checkStreakCell(): void {
    const cell = playerCell(this.world);
    const last = this.lastPlayerCell;
    if (cell !== null && last !== null && (cell.col !== last.col || cell.row !== last.row)) {
      const eatenThisFrame = this.hyperspeedPellets.removedCells.some(
        (eaten) => eaten.col === cell.col && eaten.row === cell.row,
      );
      this.pennies = enterCell(
        this.pennies,
        cell,
        eatenThisFrame || pelletAtCell(this.world, cell),
      );
    }
    this.lastPlayerCell = cell;
  }

  private applyPennies(result: PennyResult, source: QuarterSource = "pennyBar"): void {
    this.pennies = result.bar;
    this.recorder.bonus(result.tier, result.filled);
    if (result.filled > 0) {
      this.grantQuarters(result.filled, source, true);
    }
    if (result.tier > 0 || result.filled > 0) {
      this.emit({ type: "pennies", tier: result.tier, filled: result.filled });
    }
  }

  private applyStreakCells(cells: readonly Cell[]): number {
    const prevStreak = this.pennies.streak;
    const weight = titheStreakWeight(this.runUpgrades, this.effectiveUpgrades());
    this.applyPennies(applyStreakPellets(this.pennies, cells, weight));
    const every = streakEngineEvery(this.effectiveUpgrades());
    if (every === null) {
      return 0;
    }
    for (const pop of streakPops(prevStreak, this.pennies.streak, every, weight)) {
      const cell = cells[pop.cellIndex]!;
      this.streakPopCount += 1;
      this.lastStreakPop = pop.value;
      this.emit({
        type: "streakPop",
        value: pop.value,
        x: cellCenterX(cell.col),
        y: cellCenterY(cell.row),
      });
    }
    return streakEngineFires(prevStreak, this.pennies.streak, every);
  }

  private gleanCrumbs(): number {
    for (const eid of takeCrumbsAt(this.world, playerCell(this.world))) {
      this.releaseDrawable(eid);
    }
    const owned = this.effectiveUpgrades();
    const steps = gleaningStreakSteps(owned);
    if (steps === 0) {
      return 0;
    }
    const step = stepGleaning(
      this.gleaning,
      crumbGhostCells(this.world, frightenedGhostEids(this.runUpgrades)),
      pelletCells(this.world),
      this.pennies.streak > 0,
    );
    this.gleaning = step.state;
    const dropped = step.crumbs.length;
    if (dropped === 0) {
      return 0;
    }
    this.crumbCount += dropped;
    const enhanced = gleaningCharge(owned) > 0;
    for (const cell of step.crumbs) {
      spawnCrumb(this.world, cellCenterX(cell.col), cellCenterY(cell.row), enhanced);
    }
    const prevStreak = this.pennies.streak;
    const grown = applyStreakCrumbs(this.pennies, dropped * steps);
    const paid = addPennyCharge(grown.bar, dropped * gleaningCharge(owned));
    this.applyPennies({ bar: paid.bar, tier: grown.tier, filled: grown.filled + paid.filled });
    const every = streakEngineEvery(owned);
    return every === null ? 0 : streakEngineFires(prevStreak, this.pennies.streak, every);
  }

  private fireStreakEngine(fires: number): boolean {
    for (let fired = 0; fired < fires; fired += 1) {
      this.recorder.activation("streakEngine");
      const ended = this.resolvePowerPelletTrigger(1);
      this.runUpgrades = applyStreakEngineInvuln(this.runUpgrades, this.effectiveUpgrades());
      if (ended) {
        return true;
      }
    }
    return false;
  }

  private payDeathsBounty(): boolean {
    const charge = deathsBountyCharge(this.effectiveUpgrades(), this.deathsThisBoard);
    this.deathsThisBoard += 1;
    const charged = addPennyCharge(this.pennies, charge);
    this.applyPennies({ bar: charged.bar, tier: 0, filled: charged.filled }, "deathsBounty");
    return charge > 0;
  }

  private payNearMisses(catchOptions: CatchOptions): void {
    const charge = nearMissCharge(this.effectiveUpgrades());
    if (charge === 0) {
      return;
    }
    const step = stepNearMisses(this.world, this.nearMissPasses, catchOptions);
    this.nearMissPasses = step.passes;
    if (step.completed === 0) {
      return;
    }
    this.nearMissesPaid += step.completed;
    const charged = addPennyCharge(this.pennies, step.completed * charge);
    this.applyPennies({ bar: charged.bar, tier: 0, filled: charged.filled }, "nearMiss");
  }

  private resetStreak(): void {
    this.pennies = breakStreak(this.pennies);
    this.lastPlayerCell = null;
    this.nearMissPasses = createNearMissPasses();
  }

  private applyRemoteTransferStep(removedThisFrame: number): number {
    const every = remoteTransferEvery(this.effectiveUpgrades());
    if (every === null) {
      return 0;
    }
    const before = this.remoteTransferCounter;
    this.remoteTransferCounter += removedThisFrame;
    const triggers = remoteTransferTriggers(before, this.remoteTransferCounter, every);
    const transferredEids = applyRemoteTransference(this.world, triggers);
    for (const eid of transferredEids) {
      this.releaseDrawable(eid);
    }
    if (transferredEids.length > 0) {
      this.emit({
        type: "pelletSfx",
        previousCollected: this.lifetimeCollected + removedThisFrame,
        removed: transferredEids.length,
        powerRemoved: 0,
      });
      this.remoteTransferCounter += transferredEids.length;
    }
    return transferredEids.length;
  }

  private emitMunch(): void {
    this.emit({ type: "sfx", id: "pelletMunch" });
    this.emit({ type: "sfx", id: "pelletMunch2" });
  }

  private queueSecondChomp(positions: readonly { x: number; y: number }[]): void {
    const owned = this.effectiveUpgrades();
    const claim = claimSecondChompRespawns(
      this.secondChompUsed,
      positions,
      secondChompPellets(owned),
    );
    this.secondChompUsed = claim.used;
    this.pendingPowerPelletRespawns = queuePowerPelletRespawns(
      this.pendingPowerPelletRespawns,
      claim.positions,
      secondChompMs(owned),
    );
  }

  private enterStore(): void {
    this.emit({ type: "loopStop", id: "gameplayMusic" });
    activateAsciiLayout(STORE_MAZE_ASCII, "store");
    this.boardLayoutLabel = "store";
    this.runUpgrades = clearUpgradeTimers(this.runUpgrades);
    this.eatDragMs = 0;
    this.turnTuning.reset();
    this.pendingPowerPelletRespawns = [];
    this.secondChompUsed = 0;
    this.powerPelletBreaks = [];
    this.resetHyperspeedMovement();
    this.warpGlide = null;
    this.speedTrail = [];
    this.ghostCornerWarps = [];
    this.shieldBounce = NO_SHIELD_BOUNCE;
    this.resetStreak();
    this.tunnelBore = NO_TUNNEL_BORE;
    this.emit({ type: "resetBoard" });
    this.world = createWorld();
    spawnWalls(this.world);
    spawnPlayer(this.world);
    this.lavaZone = null;
    this.speedZones = [];
    this.speedZoneShift = null;
    this.clearCollapse();

    this.storeSolids = getActiveLayout().playerSolids;
    this.store = createStoreState(
      parseStoreLayout(STORE_MAZE_ASCII),
      this.runUpgrades.owned,
      this.random.stream("storeStock", this.levelIndex),
      this.levelIndex === STORE_FIRST_LEVEL,
      livesAfterLevelRegen(this.lives, this.regenIconFloor(), 1) > this.lives,
      this.nextStoreSchool,
      this.storeOffered,
      this.rosterKinds(),
    );
    this.storeOffered.push(...offeredUpgradeIds(this.store));
    this.nextStoreSchool = null;
    this.payInterest();
    this.recorder.storeOpened(this.levelIndex, this.quarters, this.store.slots.map(storeSlotLabel));
    this.emit({ type: "storeOpened" });
    this.timerVisible = false;
    this.emit({ type: "timerVisible", visible: false });
    this.suppressInputUntilKeyRelease = true;
    this.showLevelBanner("STORE");
    this.emit({ type: "musicAfterFanfare", id: "storeMusic" });
    this.beginStoreEntry();
  }

  private beginStoreEntry(): void {
    const eid = query(this.world, [Player, Position])[0]!;
    Position.x[eid] = (Position.x[eid] ?? 0) - STORE_EXIT_SLIDE_TILES * getActiveLayout().tileSize;
    Facing.direction[eid] = DIRECTION.right;
    this.storeEntrySlidePx = 0;
    this.drawStore(storeExitAlpha(STORE_EXIT_SLIDE_TILES));
  }

  private tickStoreEntrySlide(delta: number): void {
    applyPlayerSpeed(
      this.world,
      speedLevelMultiplier(this.levelIndex, this.currentTuning),
      this.currentTuning,
    );
    this.storeEntrySlidePx! += slidePlayer(this.world, 1, 0, delta);
    const remainingTiles =
      STORE_EXIT_SLIDE_TILES - this.storeEntrySlidePx! / getActiveLayout().tileSize;
    if (remainingTiles > 0) {
      this.drawStore(storeExitAlpha(remainingTiles));
      return;
    }
    const eid = query(this.world, [Player, Position])[0]!;
    Position.x[eid] = playerSpawnCenter().x;
    Facing.direction[eid] = DIRECTION.none;
    this.storeEntrySlidePx = null;
    this.drawStore();
  }

  private payInterest(): void {
    const interest = interestPayout(this.effectiveUpgrades(), this.quarters);
    if (interest <= 0) {
      return;
    }
    this.grantQuarters(interest, "interest", false, false);
    this.interestPop = { count: interest, elapsedMs: 0 };
  }

  private tickInterestPop(delta: number): void {
    const pop = this.interestPop;
    if (pop === null) {
      return;
    }
    const before = interestCoinsShown(pop);
    pop.elapsedMs += delta;
    const shown = interestCoinsShown(pop);
    if (shown > before) {
      this.emit({ type: "quarters", pulse: true });
    }
    if (shown >= pop.count) {
      this.interestPop = null;
    }
  }

  private tickStore(input: SimInput, delta: number): void {
    this.tickInterestPop(delta);
    if (this.storeExitSlide !== null) {
      this.tickStoreExitSlide(delta);
      return;
    }
    if (this.storeEntrySlidePx !== null) {
      this.tickStoreEntrySlide(delta);
      return;
    }
    const confirming = this.storeConfirmOpen();
    const layout = getActiveLayout();
    if (input.storePointer) {
      this.storeRoute = storeExitCellAt(
        this.storeSolids,
        worldToCol(input.storePointer.x),
        worldToRow(input.storePointer.y),
      );
    }
    if (confirming || input.storeCancelRoute || anyKeyHeld(input.keys)) {
      this.storeRoute = null;
    }
    const from = playerCell(this.world);
    const store = this.store!;
    const routeStep =
      this.storeRoute &&
      from &&
      storeRouteStep(
        this.storeSolids,
        from,
        this.storeRoute,
        (col, row) => slotIndexAtCell(store, col, row) !== null,
      );
    if (this.storeRoute && !routeStep) {
      this.storeRoute = null;
    }
    if (confirming) {
      clearPlayerDirectionInput(this.world);
    } else if (routeStep) {
      steerPlayer(this.world, routeStep);
    } else {
      if (this.suppressInputUntilKeyRelease && !anyKeyHeld(input.keys)) {
        this.suppressInputUntilKeyRelease = false;
      }
      if (!this.suppressInputUntilKeyRelease) {
        applyHeldKeys(this.world, input.keys);
      }
    }
    applyPlayerSpeed(
      this.world,
      confirming ? 0 : speedLevelMultiplier(this.levelIndex, this.currentTuning),
      this.currentTuning,
    );
    movement(this.world, delta, this.storeSolids, playerPreTurnPx(this.currentTuning));

    const cell = playerCell(this.world);
    const exit = cell && storeExitDirection(cell.col, cell.row, layout.cols, layout.rows);
    if (exit) {
      this.storeRoute = null;
      this.storeExitSlide = { ...exit, traveledPx: 0 };
      this.emit({ type: "storeSync", prompt: null });
      this.drawStore(storeExitAlpha(0));
      return;
    }

    const step = storeStep(
      this.store!,
      {
        col: cell?.col ?? -1,
        row: cell?.row ?? -1,
        focus: confirming ? input.storeFocus : null,
        dir: confirming ? (input.storeDir ?? null) : null,
        enter: confirming && input.storeConfirm,
        pick: confirming ? (input.storeChoice ?? null) : null,
        click: confirming ? null : (input.storeClick ?? null),
        moving: anyKeyHeld(input.keys) || this.storeRoute !== null,
        quarters: this.quarters,
        owned: this.runUpgrades.owned,
      },
      this.random.stream("storePurchase", this.levelIndex),
    );
    this.store = step.state;
    if (step.dotPicked) {
      this.emitMunch();
    }
    if (step.pickup !== null) {
      this.applyStorePickup(step.pickup);
    }
    if (step.purchase !== null) {
      this.applyStorePurchase(step.purchase);
    }
    if (confirming && !this.storeConfirmOpen()) {
      this.suppressInputUntilKeyRelease = true;
    }
    this.emit({
      type: "storeSync",
      prompt: promptView(this.store, this.quarters, this.runUpgrades.owned),
    });
    this.drawStore();
  }

  private tickStoreExitSlide(delta: number): void {
    const slide = this.storeExitSlide!;
    slide.traveledPx += slidePlayer(this.world, slide.dx, slide.dy, delta);
    const traveledTiles = slide.traveledPx / getActiveLayout().tileSize;
    if (traveledTiles >= STORE_EXIT_SLIDE_TILES) {
      this.exitStore();
      return;
    }
    this.drawStore(storeExitAlpha(traveledTiles));
  }

  private storeConfirmOpen(): boolean {
    return (
      this.store !== null &&
      promptView(this.store, this.quarters, this.runUpgrades.owned)?.kind === "confirm"
    );
  }

  private applyStorePickup(kind: StoreFreebie["kind"]): void {
    this.emitMunch();
    if (kind === "quarter") {
      this.grantQuarters(1, "storeFreebie", true);
      return;
    }
    this.recorder.livesRegenerated(this.lives, this.lives + 1);
    this.lives += 1;
    this.emit({ type: "lives", pulse: true });
  }

  private applyStorePurchase(purchase: StorePurchase): void {
    this.recorder.storePurchase(purchase);
    this.nextStoreSchool = purchaseSchool(purchase) ?? this.nextStoreSchool;
    this.quarters -= purchase.price;
    this.interestPop = null;
    this.emit({ type: "quarters", pulse: false });
    this.emitMunch();
    let id: UpgradeId;
    let queued = false;
    if (purchase.kind === "enhance") {
      id = enhancedIdOf(purchase.targetId);
      this.recorder.lost(purchase.targetId, this.levelIndex);
      this.recorder.gained(id, "enhance", this.levelIndex);
      this.runUpgrades = enhanceUpgrade(this.runUpgrades, purchase.targetId);
      this.payEnhanceLives(purchase.targetId);
      this.topUpStartingShields();
    } else {
      if (purchase.kind === "swap") {
        this.recorder.lost(purchase.outgoingId, this.levelIndex);
        this.runUpgrades = revokeUpgrade(this.runUpgrades, purchase.outgoingId);
        this.runUpgrades = clearStaleUpgradeTimers(this.runUpgrades.owned, this.runUpgrades);
      }
      id = purchase.kind === "swap" ? purchase.incomingId : purchase.id;
      queued = purchase.kind !== "swap" && needsSalvage(this.runUpgrades.owned, id);
      if (queued) {
        this.salvageQueue.push({ incoming: id, source: "store" });
      } else {
        this.grantNow(id, "store");
      }
    }
    this.emit({
      type: "lives",
      pulse: !queued && (grantLivesForUpgrade(id) > 0 || baseIdOf(id) === "passiveMyogenesis"),
    });
    this.recordSeenUpgrades();
    this.emit({ type: "upgrades" });
    this.emit({ type: "storePurchased", id });
  }

  private exitStore(): void {
    this.closeStore();
    this.recorder.storeClosed(this.quarters);
    this.emitRunLog();
    if (this.levelIndex >= MAX_LEVEL) {
      this.beginRunComplete();
    } else {
      this.timerVisible = true;
      this.emit({ type: "timerVisible", visible: true });
      this.advanceToNextLevel();
    }
  }

  private closeStore(): void {
    if (this.interestPop !== null) {
      this.interestPop = null;
      this.emit({ type: "quarters", pulse: false });
    }
    this.storeExitSlide = null;
    this.storeEntrySlidePx = null;
    this.storeRoute = null;
    this.emit({ type: "storeClosed" });
    this.store = null;
  }

  private drawStore(playerAlpha?: number): void {
    this.emitDraw({
      frozenGhostEid: null,
      playerInvulnRemainingMs: 0,
      wallPassActive: false,
      playerAlpha,
    });
  }

  private startBoard(layoutOverride: BoardOverride | null = null): void {
    this.resetStreak();
    this.ghostTraction.reset();
    this.sonicEchoes.reset();
    this.mirrorPop = null;
    this.deathsThisBoard = 0;
    this.elroySuppressed = false;
    this.lastReactiveArmorSent = 0;
    this.nearMissesPaid = 0;
    this.peelTail = [];
    this.peelHeading = 0;
    this.topUpStartingShields();
    const boss = isBossLevel(this.levelIndex)
      ? pickBoss(this.options.boss, this.random.stream("bossPick", this.levelIndex))
      : null;
    const selection = resolveBoardSelection(this.levelIndex, layoutOverride, this.random.seed);
    this.clearCollapse();
    let layoutLabel = "maze2";
    if (selection.kind === "static") {
      activateLayout(selection.id);
      layoutLabel = selection.id;
      const bored = this.boredCellsForMap(layoutLabel);
      if (bored.length > 0) {
        applyBoredCellsToActiveLayout(bored);
      }
    } else if (selection.kind === "custom") {
      layoutLabel = this.activateRunAscii(selection.ascii, "custom");
    } else if (selection.kind === "pool") {
      const map = mazePoolMap(selection.index);
      if (map) {
        layoutLabel = this.activateRunAscii(
          map.ascii,
          `pool-${selection.index}`,
          this.collapseChainsFor(selection.index, map.ascii),
        );
      } else {
        console.warn(`unknown pool index ${selection.index}; falling back to maze2`);
        activateLayout("maze2");
      }
    } else {
      const generated = this.generateBoard(selection.seed, boss);
      if (generated) {
        layoutLabel = this.activateRunAscii(generated.ascii, `gen:${generated.seedUsed}`);
      } else {
        console.warn(
          `maze generate failed after ${GENERATE_MAX_ATTEMPTS} attempts for seed ${selection.seed}; falling back to maze2`,
        );
        activateLayout("maze2");
      }
    }
    this.boardLayoutLabel = layoutLabel;
    this.tunnelBore = NO_TUNNEL_BORE;
    this.emit({ type: "resetBoard" });
    this.world = createWorld();
    spawnWalls(this.world);
    spawnBoardPellets(this.world);
    spawnPlayer(this.world);
    this.bossState = null;
    if (boss !== null) {
      this.startBoss(boss);
      this.recordSeen([...boss.ghostKinds]);
    } else {
      const ghostKinds = (
        this.options.ghosts ?? ghostKindsForLevel(this.levelIndex, this.rosterId)
      ).slice(0, houseSeatCount());
      ghostKinds.forEach((kind, index) => {
        this.spawnGhost(kind, this.options.ghosts === null ? (index as ReleaseSlot) : undefined);
      });
      this.recordSeen(ghostKinds);
    }

    this.clock = createRunClock(this.currentTuning);
    this.recorder.beginLevel({
      level: this.levelIndex,
      layout: layoutLabel,
      boss: boss !== null,
      countdownStart: this.clock.remaining,
      livesStart: this.lives,
    });
    this.ghostReleaseClock = createGhostReleaseClock(this.levelIndex);
    this.ghostModeClock = createGhostModeClock(this.levelIndex, this.currentTuning);
    this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    this.pelletProgress = createPelletProgress(countPellets(this.world));
    this.gleaning = createGleaning(pelletCells(this.world));
    this.replayRecorder.beginSegment(this.world, this.levelIndex);
    this.remoteTransferCounter = 0;
    this.fruitPresence = createFruitPresence();
    this.fruitSequence = { ...this.fruitSequence, spawnIndex: 0 };
    this.resetCornucopiaFruit();
    this.pendingPowerPelletRespawns = [];
    this.secondChompUsed = 0;
    this.tunnelBoringCharges = hasUpgrade(this.effectiveUpgrades(), "passiveTunnelBoring")
      ? TUNNEL_BORING_CHARGES_PER_LEVEL
      : 0;
    this.powerPelletBreaks = [];
    this.resetHyperspeedMovement();
    this.resetTimedTunnel();
    this.resetSpeedZones();
    this.resetLavaZone();
    this.warpGlide = null;
    this.speedTrail = [];
    this.ghostCornerWarps = [];
    this.shieldBounce = NO_SHIELD_BOUNCE;
    this.afterLifeRelease = false;
    placeInHouseGhostsAtPredictedSeats(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
    );
    this.death = null;
    this.finishMoneyTalks();
    this.suppressInputUntilKeyRelease = false;
    this.emit({ type: "timer" });

    this.applyPelletSurge(pelletSurgeCount(this.effectiveUpgrades()));
    if (this.bossState !== null) {
      this.tagBossPellets(this.bossState);
    }
    tagOptionalPellets(
      this.world,
      this.bossState !== null ? null : lazyLooperRings(this.effectiveUpgrades()),
    );
    this.syncSlotPickupsOntoBoard();
    if (this.options.fruit) {
      this.fruitPresence = {
        ...this.fruitPresence,
        active: true,
        remainingMs:
          this.currentTuning.fruitLifetimeMs * fruitLifetimeMultiplier(this.effectiveUpgrades()),
      };
      this.spawnFruitEntity(fruitStacksSideBySide(this.effectiveUpgrades()));
    }
  }

  private collapseChainsFor(poolIndex: number, baseAscii: string): CollapseChain[] | null {
    if (!this.options.levelModifiers) {
      return null;
    }
    if (this.collapsePlan?.poolIndex !== poolIndex) {
      this.collapsePlan = {
        poolIndex,
        baseAscii,
        plan: pickCollapsePlan(baseAscii, this.random.stream("collapse")),
      };
    }
    return collapsedChainsFor(this.collapsePlan.plan, this.levelIndex);
  }

  private clearCollapse(): void {
    this.collapseChains = [];
    this.collapseArts = [];
    this.collapseSpeedBoard = null;
    this.collapseIntroMs = 0;
    this.sinkholeChain = null;
    this.sinkholeLayouts = null;
    this.sinkholeArt = null;
    this.sinkholeSource = null;
    this.sinkholeIntroMs = 0;
  }

  private setUpCollapse(
    chains: readonly CollapseChain[],
    bored: readonly MazeTile[],
    sinkhole: CollapseChain | null,
  ): void {
    const held = this.collapsePlan;
    if (held === null) {
      return;
    }
    const layout = getActiveLayout();
    this.collapseSpeedBoard = layoutFromAscii(
      applyCollapse(
        held.baseAscii,
        held.plan.sinkhole === null ? held.plan.chains : [...held.plan.chains, held.plan.sinkhole],
      ),
    );
    if (sinkhole !== null) {
      this.sinkholeChain = sinkhole;
      this.buildSinkhole({
        board: { ascii: layout.ascii, tileSize: layout.tileSize },
        chain: sinkhole,
        seed: held.plan.artSeed + 404,
        tuning: this.currentTuning,
      });
    }
    if (chains.length === 0) {
      return;
    }
    this.collapseChains = [...chains];
    this.buildCollapseArts(held.plan.artSeed, bored);
  }

  private buildSinkhole(source: SinkholeSource): void {
    const { board, chain, seed, tuning } = source;
    this.sinkholeBoardCount += 1;
    this.sinkholeSource = source;
    this.sinkholeArt = buildSinkholeArt(board, chain, seed, tuning);
    this.sinkholeIntroMs = Math.min(tuning.sinkholeIntroMs, this.sinkholeIntroMs);
  }

  private buildCollapseArts(artSeed: number, bored: readonly MazeTile[]): void {
    const layout = getActiveLayout();
    const boredKeys = new Set(bored.map((cell) => `${cell.col},${cell.row}`));
    const board = {
      ascii: layout.ascii,
      tileSize: layout.tileSize,
      blockedPixels: rubbleBlockedPixels(
        layout.ascii,
        layout.tileSize,
        pixelWallRects(wallPathCommands(), this.currentTuning.wallThickness),
        { x: layout.offsetX, y: layout.offsetY },
      ),
    };
    this.collapseBoardCount += 1;
    this.collapseArts = this.collapseChains.map((chain, index) => ({
      ...buildRubbleArt(
        board,
        chain.filter((cell) => !boredKeys.has(`${cell.col},${cell.row}`)),
        artSeed + index * 101,
      ),
      fresh: isFreshCollapse(index, this.levelIndex),
    }));
  }

  private playerInSinkhole(): boolean {
    const eid = query(this.world, [Player, Position])[0];
    return (
      eid !== undefined &&
      (this.sinkholeChain ?? []).some(
        (cell) =>
          cell.col === worldToCol(Position.x[eid]!) && cell.row === worldToRow(Position.y[eid]!),
      )
    );
  }

  private setSinkholeLayouts(sinkhole: CollapseChain): void {
    const open = getActiveLayout();
    this.sinkholeLayouts = { open, blocked: withSinkholes(open, sinkhole) };
    this.syncSinkholeFloat();
  }

  private syncSinkholeFloat(): void {
    if (this.sinkholeLayouts === null) {
      return;
    }
    const wanted =
      floatsOverHazards(this.effectiveUpgrades()) || this.playerInSinkhole()
        ? this.sinkholeLayouts.open
        : this.sinkholeLayouts.blocked;
    if (getActiveLayout() !== wanted) {
      setActiveLayout(wanted);
    }
  }

  private sinkholeRenderState(): SinkholeRenderState | null {
    return this.sinkholeArt === null
      ? null
      : {
          key: `board-${this.sinkholeBoardCount}`,
          art: this.sinkholeArt,
          elapsedMs: this.sinkholeIntroMs,
          fresh: isFreshSinkhole(this.levelIndex),
          tuning: this.currentTuning,
        };
  }

  private sinkholeChainFor(): CollapseChain | null {
    return this.options.levelModifiers && this.collapsePlan !== null
      ? sinkholeFor(this.collapsePlan.plan, this.levelIndex)
      : null;
  }

  private clearBoredRubble(bored: readonly MazeTile[]): void {
    if (this.collapsePlan !== null && this.collapseChains.length > 0) {
      this.buildCollapseArts(this.collapsePlan.plan.artSeed, bored);
    }
  }

  private collapseRenderState(): CollapseRenderState | null {
    return this.collapseArts.length === 0
      ? null
      : {
          key: `board-${this.collapseBoardCount}`,
          arts: this.collapseArts,
          introMs: this.collapseIntroMs,
        };
  }

  private activateRunAscii(
    ascii: string,
    label: string,
    chains: readonly CollapseChain[] | null = null,
  ): string {
    try {
      const sinkhole = chains === null ? null : this.sinkholeChainFor();
      const collapsed = applySinkhole(applyCollapse(ascii, chains ?? []), sinkhole);
      const boredCells = this.boredCellsForMap(label);
      const bored = applyTunnelBoringAscii(collapsed, boredCells);
      activateAsciiLayout(bored);
      openBoredCellsOnLayout(getActiveLayout(), boredCells);
      if (sinkhole !== null) {
        this.setSinkholeLayouts(sinkhole);
      }
      if (chains !== null) {
        this.setUpCollapse(chains, boredCells, sinkhole);
      }
      return label;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`maze activate failed for ${label}; falling back to maze2: ${message}`);
      if (label === "custom") {
        this.customMazeError = message;
      }
      activateLayout("maze2");
      return "maze2";
    }
  }

  private boredCellsForMap(mapKey: string): readonly MazeTile[] {
    if (this.tunnelBored === null) {
      return [];
    }
    if (this.tunnelBored.mapKey !== mapKey) {
      this.tunnelBored = null;
      return [];
    }
    return this.tunnelBored.cells;
  }

  private readonly isRubbleCell = (cell: MazeTile): boolean =>
    this.collapseChains.some((chain) =>
      chain.some((link) => link.col === cell.col && link.row === cell.row),
    );

  private openBoredSteps(opened: readonly MazeTile[]): void {
    if (opened.length === 0 || this.tunnelBored === null) {
      return;
    }
    const open = openBoredCells(this.tunnelBored.cells, this.tunnelBore);
    applyBoredCellsToActiveLayout(open);
    if (this.sinkholeLayouts !== null) {
      this.setSinkholeLayouts(this.sinkholeChain ?? []);
    }
    const touchesRubble = opened.some((cell) =>
      this.collapseChains.some((chain) =>
        chain.some(
          (link) => Math.abs(link.col - cell.col) <= 1 && Math.abs(link.row - cell.row) <= 1,
        ),
      ),
    );
    if (touchesRubble) {
      this.clearBoredRubble(open);
    }
  }

  private stepTunnelBoring(delta: number): void {
    const stepped = stepTunnelBore(this.world, this.tunnelBore, delta, this.isRubbleCell);
    this.tunnelBore = stepped.bore;
    this.openBoredSteps(stepped.opened);
    if (!hasUpgrade(this.effectiveUpgrades(), "passiveTunnelBoring")) {
      return;
    }
    const attempt = tryTunnelBoring(
      this.world,
      this.tunnelBoringCharges,
      this.prevKeys,
      this.frameKeys,
    );
    if (attempt === null) {
      return;
    }
    const mapKey = this.boardLayoutLabel;
    const prior =
      this.tunnelBored !== null && this.tunnelBored.mapKey === mapKey ? this.tunnelBored.cells : [];
    const cells = mergeBoredCells(prior, attempt.cells);
    this.tunnelBored = { mapKey, cells };
    this.tunnelBoringCharges = attempt.charges;
    const begun = beginTunnelBore(this.tunnelBore, attempt, this.isRubbleCell);
    this.tunnelBore = begun.bore;
    this.openBoredSteps(begun.opened);
    adoptTunnelBoringFacing(this.world, attempt.direction);
    this.recorder.activation("tunnelBoring");
  }

  private generateBoard(
    seed: string,
    boss: BossDef | null,
  ): ReturnType<typeof generateMazeAsciiWithRetries> {
    if (boss?.tunnelCount == null) {
      return generateMazeAsciiWithRetries(seed);
    }
    const bossBoard = generateMazeAsciiWithRetries(seed, GENERATE_MAX_ATTEMPTS, {
      tunnelCount: boss.tunnelCount,
    });
    if (bossBoard !== null) {
      return bossBoard;
    }
    console.warn(
      `boss maze with ${boss.tunnelCount} tunnels failed for seed ${seed}; using a regular board`,
    );
    return generateMazeAsciiWithRetries(seed);
  }

  private startBoss(boss: BossDef): void {
    const { cols } = getActiveLayout();
    this.bossMouths = bossTunnelMouths(horizontalTunnelRows(), cols);
    this.bossState = createBossState(boss, bossStartGhosts(boss, this.currentTuning));
    this.spawnBossGhostsForLife();
  }

  private spawnBossGhostsForLife(): void {
    if (this.bossState === null) {
      return;
    }
    const { def, ghostCount } = this.bossState;
    const { house, tunnel } = splitBossGhosts(def, ghostCount);
    for (let i = 0; i < house; i += 1) {
      this.spawnBossGhostInHouse(
        bossGhostKind(def, i),
        ANCHOR_RELEASE_DELAY_MS + i * def.houseReleaseStaggerMs,
      );
    }
    this.bossState = { ...this.bossState, pendingSpawns: tunnel };
  }

  private tagBossPellets(state: BossState): void {
    const spawnPellets = bossStage(state.def, state.stageIndex).spawnPellets;
    const regular = [...query(this.world, [Pellet, Position])].filter(
      (eid) => Drawable.id[eid] === PELLET_DRAWABLE_ID,
    );
    const cells = regular.map((eid) => ({
      eid,
      col: worldToCol(Position.x[eid] ?? 0),
      row: worldToRow(Position.y[eid] ?? 0),
    }));
    const picks = pickBossPelletCells(cells, getActiveLayout().playerSpawn, spawnPellets);
    if (picks.length < spawnPellets) {
      console.warn(`only ${picks.length} boss pellets fit this board`);
    }
    for (const pick of picks) {
      addComponent(this.world, pick.eid, BossPellet);
      Drawable.id[pick.eid] = BOSS_PELLET_DRAWABLE_ID;
    }
    this.bossState = { ...state, bossPelletsRemaining: picks.length };
  }

  private tickBoss(): void {
    if (this.bossState === null) {
      return;
    }
    let state = recordBossPelletsEaten(this.bossState, countBossPellets(this.world));
    while (state.pendingSpawns > 0) {
      const kind = bossGhostKind(state.def, state.ghostCount - state.pendingSpawns);
      if (this.bossMouths.length === 0) {
        this.spawnBossGhostInHouse(kind, 0);
      } else {
        const index = pickFreeBossMouth(this.world, this.bossMouths, state.nextMouthIndex);
        if (index === null) {
          break;
        }
        this.spawnBossGhostAtMouth(kind, this.bossMouths[index]!);
        state = { ...state, nextMouthIndex: (index + 1) % this.bossMouths.length };
      }
      state = { ...state, pendingSpawns: state.pendingSpawns - 1 };
    }
    this.bossState = state;
  }

  private recordSeen(ghostKinds: readonly GhostKindId[]): void {
    this.emit({ type: "seenGhosts", ghostKinds: [...ghostKinds] });
  }

  private recordSeenUpgrades(): void {
    this.emit({ type: "seenUpgrades", ids: [...this.runUpgrades.owned] });
  }

  private effectiveUpgrades(): readonly UpgradeId[] {
    const owned = this.runUpgrades.owned;
    if (this.effectiveCache?.owned !== owned) {
      this.effectiveCache = { owned, effective: effectiveOwned(owned) };
    }
    return this.effectiveCache.effective;
  }

  private grantSpecialistLives(): void {
    specialistEnhancedBases(this.runUpgrades.owned).forEach((id) => this.payEnhanceLives(id));
  }

  private payEnhanceLives(baseId: BaseUpgradeId): void {
    if (!this.enhanceLivesPaid.has(baseId)) {
      this.enhanceLivesPaid.add(baseId);
      this.lives += enhanceGrantLives(baseId);
    }
  }

  private triggerLevelClear(): void {
    if (possessionActive(this.runUpgrades)) {
      this.clearPossessionForLevelClear();
    }
    if (this.bossState !== null && !isFinalBossStage(this.bossState)) {
      this.beginBossStageTransition();
      return;
    }
    this.notePellets();
    this.recorder.levelCleared(
      this.clock.remaining,
      isBossLevel(this.levelIndex) ? 0 : timePennyCharge(this.clock.remaining),
    );
    this.emit({ type: "loopStop", id: "gameplayMusic" });
    this.emit({ type: "sfx", id: "levelComplete" });
    this.emitDraw();
    this.timePennyDrain = isBossLevel(this.levelIndex)
      ? null
      : createTimePennyDrain(this.clock.remaining);
    if (this.timePennyDrain !== null) {
      this.emit({ type: "timePennies", active: true });
      return;
    }
    this.finishLevelClear();
  }

  private beginBossStageTransition(): void {
    if (this.bossState === null || isFinalBossStage(this.bossState)) {
      return;
    }
    this.bossStageTransition = createBossStageTransition();
    this.bossStageDraw = { entityAlpha: 1, wallAlpha: 1 };
    this.emit({ type: "loopStop", id: "gameplayMusic" });
    this.emit({ type: "sfx", id: "levelComplete" });
    this.emit({ type: "timer" });
    this.emitDraw();
  }

  private tickBossStageTransitionFrame(delta: number): void {
    if (this.bossStageTransition === null) {
      return;
    }
    this.clock = tickRunClock(this.clock, true, delta, this.currentTuning);
    this.emit({ type: "timer" });
    const tick = tickBossStageTransition(this.bossStageTransition, delta);
    this.bossStageTransition = tick.state;
    if (tick.cutSuccessSfx) {
      this.emit({ type: "loopStop", id: "levelComplete" });
    }
    if (tick.shouldRebuild) {
      this.refillBossStageBoard();
    }
    if (tick.startGameplayMusic) {
      this.emit({ type: "loopStart", id: "gameplayMusic" });
    }
    this.bossStageDraw = { entityAlpha: tick.entityAlpha, wallAlpha: tick.wallAlpha };
    this.emitDraw();
    if (tick.done) {
      this.bossStageTransition = null;
      this.bossStageDraw = null;
      this.emit({ type: "timer" });
      this.emitDraw();
    }
  }

  private beginIntermission(): void {
    const id =
      this.options.intermission ??
      pickIntermission(this.random.stream("intermission"), this.lastIntermission);
    this.lastIntermission = id;
    const ghostKinds = [...query(this.world, [Ghost, GhostKind])].map(
      (eid) => GhostKind.kind[eid] as GhostKindId,
    );
    const cast = { ghostKinds };
    this.intermission = { id, elapsedMs: 0, cast };
    this.bossStageDraw = { entityAlpha: 0, wallAlpha: 0 };
    this.emitDraw();
    this.emit({ type: "intermission", frame: intermissionFrame(id, 0, cast) });
    this.emit({ type: "musicAfterFanfare", id: "interstitialMusic" });
  }

  private tickIntermission(intermission: IntermissionRun, delta: number): void {
    intermission.elapsedMs += delta;
    const frame = intermissionFrame(intermission.id, intermission.elapsedMs, intermission.cast);
    if (!frame.done) {
      this.emit({ type: "intermission", frame });
      return;
    }
    this.intermission = null;
    this.bossStageDraw = null;
    this.emit({ type: "intermission", frame: null });
    this.emit({ type: "loopStop", id: "interstitialMusic" });
    this.advanceToNextLevel();
  }

  private refillBossStageBoard(): void {
    if (this.bossState === null) {
      return;
    }
    for (const eid of [...query(this.world, [Pellet])]) {
      removeEntity(this.world, eid);
      this.releaseDrawable(eid);
    }
    this.clearFruitEntities();
    this.fruitPresence = createFruitPresence();
    this.fruitSequence = { ...this.fruitSequence, spawnIndex: 0 };
    this.pendingPowerPelletRespawns = [];
    this.secondChompUsed = 0;
    for (const eid of [...query(this.world, [Ghost])]) {
      removeEntity(this.world, eid);
      this.releaseDrawable(eid);
    }
    this.runUpgrades = clearUpgradeTimers(this.runUpgrades);
    this.bossState = advanceBossStage(this.bossState);
    spawnBoardPellets(this.world);
    this.tagBossPellets(this.bossState);
    tagOptionalPellets(this.world, null);
    this.pelletProgress = createPelletProgress(countPellets(this.world));
    this.gleaning = createGleaning(pelletCells(this.world));
    this.spawnBossGhostsForLife();
    this.ghostReleaseClock = createGhostReleaseClock(this.levelIndex);
    this.ghostModeClock = createGhostModeClock(this.levelIndex, this.currentTuning);
    this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    this.afterLifeRelease = false;
    placeInHouseGhostsAtPredictedSeats(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
    );
    this.resetHyperspeedMovement();
    this.warpGlide = null;
    this.speedTrail = [];
    this.ghostCornerWarps = [];
    this.shieldBounce = NO_SHIELD_BOUNCE;
    this.resetStreak();
  }

  private tickTimePennies(drain: TimePennyDrain, delta: number): void {
    const tick = tickTimePennyDrain(drain, delta);
    this.timePennyDrain = tick.drain;
    this.clock = { ...this.clock, remaining: tick.remaining };
    this.emit({ type: "timer" });
    const charged = addPennyCharge(this.pennies, tick.points);
    this.applyPennies({ bar: charged.bar, tier: 0, filled: charged.filled });
    this.emitDraw();
    if (tick.done) {
      this.timePennyDrain = null;
      this.emit({ type: "timePennies", active: false });
      this.finishLevelClear();
    }
  }

  private beginLevelTransition(): void {
    this.levelTransitionRemainingMs = LEVEL_TRANSITION_MS;
    this.emitRunLog();
  }

  private payInheritance(): void {
    const owned = this.effectiveUpgrades();
    const payout = inheritancePayout(
      owned,
      emptyLifeSlots(this.lives, this.regenIconFloor()),
      this.deathsThisBoard,
    );
    if (payout <= 0) {
      return;
    }
    this.grantQuarters(payout, "inheritance", true);
  }

  private grantQuarters(
    amount: number,
    source: QuarterSource,
    pulse: boolean,
    emitEvent = true,
  ): void {
    if (amount <= 0) {
      return;
    }
    this.quarters += amount;
    this.recorder.quarters(source, amount);
    if (emitEvent) {
      this.emit({ type: "quarters", pulse });
    }
    const { progress, spawns } = tickSlotPickupProgress(this.slotPickupProgress, amount);
    this.slotPickupProgress = progress;
    for (let i = 0; i < spawns; i += 1) {
      this.enqueueSlotPickup();
    }
  }

  private slotPickupBoardEligible(): boolean {
    return this.store === null && !isBossLevel(this.levelIndex);
  }

  private enqueueSlotPickup(): void {
    if (!this.slotPickupBoardEligible()) {
      this.slotPickupsAwaitingPlacement += 1;
      return;
    }
    this.placeAndSpawnSlotPickup();
  }

  private slotPickupAvoidCells(): SlotPickupCell[] {
    const avoid: SlotPickupCell[] = [];
    const player = this.playerPosition();
    if (player !== null) {
      avoid.push({ col: worldToCol(player.x), row: worldToRow(player.y) });
    }
    const twin = this.twinPosition();
    if (twin !== null) {
      avoid.push({ col: worldToCol(twin.x), row: worldToRow(twin.y) });
    }
    return avoid;
  }

  private placeAndSpawnSlotPickup(): void {
    const cell = pickSlotPickupCell(
      this.random.stream("slotPickup", this.levelIndex),
      getActiveLayout().playerSolids,
      this.slotPickupAvoidCells(),
    );
    this.slotPickupCells.push(cell);
    spawnSlotMachine(this.world, { x: cellCenterX(cell.col), y: cellCenterY(cell.row) });
  }

  private syncSlotPickupsOntoBoard(): void {
    if (isBossLevel(this.levelIndex)) {
      this.slotPickupCells = [];
      this.slotPickupsAwaitingPlacement = 0;
      return;
    }
    if (!this.slotPickupBoardEligible()) {
      return;
    }
    const avoid = this.slotPickupAvoidCells();
    const solids = getActiveLayout().playerSolids;
    const rng = this.random.stream("slotPickup", this.levelIndex);
    while (this.slotPickupsAwaitingPlacement > 0) {
      this.slotPickupsAwaitingPlacement -= 1;
      this.slotPickupCells.push(pickSlotPickupCell(rng, solids, avoid));
    }
    if (this.options.slotMachine && this.slotPickupCells.length === 0) {
      this.slotPickupCells.push(pickSlotPickupCell(rng, solids, avoid));
    }
    this.slotPickupCells = this.slotPickupCells.map((cell) =>
      remapSlotPickupCell(cell.col, cell.row, solids),
    );
    for (const cell of this.slotPickupCells) {
      spawnSlotMachine(this.world, { x: cellCenterX(cell.col), y: cellCenterY(cell.row) });
    }
  }

  private collectSlotPickupEntities(): void {
    if (!this.slotPickupBoardEligible()) {
      return;
    }
    for (const item of collectSlotMachinesForBodies(this.world, this.twinPosition())) {
      this.releaseDrawable(item.eid);
      const idx = this.slotPickupCells.findIndex(
        (cell) => cell.col === item.col && cell.row === item.row,
      );
      if (idx < 0) {
        continue;
      }
      this.slotPickupCells.splice(idx, 1);
      this.slotQueue.push("slotPickup");
    }
  }

  private tickSlot(input: SimInput, delta: number): boolean {
    if (this.slot === null) {
      const source = this.slotQueue.shift();
      if (source !== undefined) {
        this.startSlot(source);
        return true;
      }
      if (this.levelClearAwaitsSlots) {
        this.levelClearAwaitsSlots = false;
        this.finishLevelClear();
        return true;
      }
      return false;
    }
    const slot = this.slot;
    if (slotHeld(slot.timeline, slot.elapsedMs)) {
      if (input.acknowledge === true) {
        this.slot = null;
      }
      return true;
    }
    slot.elapsedMs = Math.min(slot.elapsedMs + delta, slot.timeline.durationMs);
    if (!slot.resultSounded && slot.elapsedMs >= slot.timeline.reelStopsMs[SLOT_REELS - 1]!) {
      slot.resultSounded = true;
      this.emit({ type: "sfx", id: slotResultSfx(slot.spin.wins.length) });
    }
    if (
      !slot.megaSounded &&
      slot.spin.wins.length >= SLOT_MEGA_BONUS_WINS &&
      slot.elapsedMs >= slot.timeline.reelStopsMs[SLOT_REELS - 1]! + SLOT_MEGA_BONUS_DELAY_MS
    ) {
      slot.megaSounded = true;
      this.emit({ type: "sfx", id: "slotMegaBonus" });
    }
    while (
      slot.paid < slot.spin.wins.length &&
      slot.elapsedMs >= slot.timeline.winStartsMs[slot.paid]!
    ) {
      this.paySlotWin(slot.spin.wins[slot.paid]!, slot.source);
      slot.paid += 1;
    }
    return true;
  }

  private startSlot(source: QuarterSource): void {
    const livesOnReels = livesAfterLevelRegen(this.lives, this.regenIconFloor(), 1) > this.lives;
    const rng = this.random.stream("slots");
    const outcome = this.options.slot ?? rollSlotOutcome(rng, livesOnReels);
    const spin = spinSlot(outcome, slotSchoolWeights(this.runUpgrades.owned), livesOnReels, rng);
    this.slot = {
      spin,
      timeline: slotTimeline(spin),
      elapsedMs: 0,
      paid: 0,
      won: [],
      source,
      resultSounded: false,
      megaSounded: false,
    };
    this.slotSpins += 1;
    this.emit({ type: "sfx", id: "slotSpin" });
  }

  private paySlotWin(win: SlotWin, source: QuarterSource): void {
    if (win.symbol === "life") {
      this.recorder.livesRegenerated(this.lives, this.lives + 1);
      this.lives += 1;
      this.emit({ type: "lives", pulse: true });
      return;
    }
    const id =
      win.symbol === "quarter"
        ? null
        : pickSlotUpgrade(
            [...this.runUpgrades.owned, ...this.salvageQueue.map((entry) => entry.incoming)],
            win.symbol,
            this.random.stream("slots"),
            this.rosterKinds(),
          );
    if (id === null) {
      this.quarters += 1;
      this.recorder.quarters(source, 1);
      this.emit({ type: "quarters", pulse: true });
      return;
    }
    this.slot?.won.push(id);
    if (needsSalvage(this.runUpgrades.owned, id)) {
      this.salvageQueue.push({ incoming: id, source: "slots" });
      return;
    }
    this.grantNow(id, "slots");
    this.emit({ type: "lives", pulse: false });
    this.recordSeenUpgrades();
    this.emit({ type: "upgrades" });
  }

  private finishLevelClear(): void {
    if (this.slot !== null || this.slotQueue.length > 0) {
      this.levelClearAwaitsSlots = true;
      return;
    }
    this.payInheritance();
    this.applyLifeRegen(this.regenAmount());
    if (this.options.disableLevelUpgrades || !offersUpgradeAfterLevel(this.levelIndex)) {
      this.beginLevelTransition();
      return;
    }
    const offer = pickUpgradeChoiceOffer(
      this.runUpgrades.owned,
      this.runUpgrades.lastDeclinedUpgradeId,
      this.random.stream("upgradeOffer", this.levelIndex),
      enhancedOfferChance(this.levelIndex),
      this.options.forceUpgrade,
      this.levelIndex,
      this.rosterKinds(),
    );
    if (offer.upgrades.length === 0) {
      this.beginLevelTransition();
      return;
    }
    this.pendingLevelClear = true;
    this.awaitingChoice = true;
    this.pendingChoice = offer;
    this.recorder.offered(offer);
    this.emit({ type: "upgradeOffer", offer });
  }

  private jumpToLevelClear(): void {
    const pelletEids = query(this.world, [Pellet, Position]);
    for (const eid of pelletEids) {
      removeEntity(this.world, eid);
      this.releaseDrawable(eid);
    }
    const collectResult = applyPelletCollect(
      this.pelletProgress,
      pelletEids.length,
      noRequiredPelletsLeft(this.world),
    );
    this.pelletProgress = collectResult.progress;
    this.lifetimeCollected += pelletEids.length;
    this.triggerLevelClear();
  }

  private resolvePowerPelletTrigger(powerRemoved: number): boolean {
    const fires = this.bankAndCountPickupFires(powerRemoved);
    return fires > 0 ? this.firePowerPelletEffects(fires) : false;
  }

  private bankAndCountPickupFires(powerRemoved: number): number {
    const overflow = shieldOverflow(this.runUpgrades, powerRemoved);
    if (shieldPelletsCap(this.effectiveUpgrades()) !== null) {
      this.bankShields(powerRemoved);
    }
    if (bananaPeelCap(this.effectiveUpgrades()) !== null) {
      this.bankPeels(powerRemoved);
    }
    return powerPelletPickupFires(this.effectiveUpgrades(), powerRemoved, overflow);
  }

  private bankShields(count: number): void {
    const next = bankShields(this.runUpgrades, count);
    if (next !== this.runUpgrades) {
      this.runUpgrades = next;
    }
  }

  private bankPeels(count: number): void {
    const next = bankPeels(this.runUpgrades, count);
    if (next !== this.runUpgrades) {
      this.runUpgrades = next;
    }
  }

  private peelBeads(): TailBead[] {
    return this.runUpgrades.mirrorActive
      ? [...this.peelTail, ...twinBeads(this.peelTail, getActiveLayout())]
      : this.peelTail;
  }

  private stepPeelTail(delta: number): void {
    this.peelClockMs += Math.max(0, delta);
    const solids = this.playerSolids();
    const stepped = stepBananaPeelTail(
      this.world,
      this.peelTail,
      this.runUpgrades.peelsBanked,
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
    if (this.runUpgrades.peelsBanked <= 0) {
      return false;
    }
    const ghostEid = ghostTouchingPeel(this.world, this.peelBeads(), catchOptions);
    return ghostEid !== null && this.breakPeel(ghostEid);
  }

  private breakPeel(ghostEid: number): boolean {
    const spent = spendPeel(this.runUpgrades);
    if (spent === null) {
      return false;
    }
    this.runUpgrades = spent;
    this.recorder.activation("shieldBreak");
    this.resetStreak();
    const solids = this.playerSolids();
    const resized = stepBananaPeelTail(
      this.world,
      this.peelTail,
      this.runUpgrades.peelsBanked,
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
      this.emit({ type: "peelCrack", x: bead.x, y: bead.y });
    }
    const bounce = startShieldBounce(this.world, ghostEid, { bouncePlayer: false });
    this.fireReactiveArmor(ghostEid);
    if (shieldBreakOwned(this.effectiveUpgrades())) {
      this.firePowerPelletEffects(1);
    }
    if (bounce === null) {
      this.runUpgrades = applyShieldBreakInvuln(this.runUpgrades);
      return true;
    }
    this.shieldBounce = settleShieldBounce(
      this.shieldBounce,
      bounce,
      this.warpGlide !== null,
      heldGhostEids(this.ghostCornerWarps),
    );
    return true;
  }

  private topUpStartingShields(): void {
    const next = grantStartingShields(this.runUpgrades);
    if (next !== this.runUpgrades) {
      this.runUpgrades = next;
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
        const eatenFruit = collectFruitForBodies(this.world, this.twinPosition());
        for (const eid of eatenFruit) {
          this.releaseDrawable(eid);
          this.hyperspeedFruitEaten += 1;
        }
        this.noteFruitRemoved(eatenFruit);
        this.collectSlotPickupEntities();
        this.eatFrightenedGhosts();
        const catchOptions = this.catchOptions();
        if (this.tryBreakPeel(catchOptions)) {
          return false;
        }
        const hit = catchPlayer(this.world, catchOptions) ?? chainCatch(this.world, catchOptions);
        const twin = hit === null ? this.twinCatch(catchOptions) : null;
        const caughtBy = hit ?? twin?.eid ?? null;
        const touched = caughtBy !== null || this.touchesLava(catchOptions) || twin !== null;
        return (
          touched && (defyDeathActive(this.runUpgrades) || !this.breakHyperspeedShield(caughtBy))
        );
      },
      halt: () => this.zeroPlayerSpeed(),
    });
  }

  private noteHyperspeedTurn(): void {
    const facing = playerFacing(this.world);
    const previous = this.hyperspeedDirection;
    const turn = noteHyperspeedFacing(previous, facing, this.runUpgrades.hyperspeedTurnDelayMs > 0);
    this.hyperspeedDirection = turn.lastDirection;
    if (turn.turned) {
      this.runUpgrades = startHyperspeedTurnDelay(this.runUpgrades);
      this.zeroPlayerSpeed();
      if (previous !== null) {
        this.noteTurnCatchGrace(previous, facing);
      }
    }
  }

  private recordProgrammerPresses(keys: HeldKeys): void {
    const tick = recordProgrammerKeys(
      this.world,
      this.runUpgrades.programmer,
      this.prevKeys,
      keys,
      this.playerSolids(),
    );
    this.runUpgrades = { ...this.runUpgrades, programmer: tick.state };
    for (let press = 0; press < tick.recorded; press += 1) {
      this.emit({ type: "sfx", id: "pelletMunch" });
    }
    if (tick.launched) {
      this.recorder.activation("programmer");
    }
  }

  private playerSolids(): SolidGrid {
    return (
      playerSolidsWithWall(
        this.runUpgrades,
        wallPassActive(this.runUpgrades) ? wallPassSolids(this.effectiveUpgrades()) : undefined,
      ) ?? getActiveLayout().playerSolids
    );
  }

  private stepProgrammer(): void {
    this.runUpgrades = {
      ...this.runUpgrades,
      programmer: followProgrammer(this.world, this.runUpgrades.programmer, this.playerSolids()),
    };
  }

  private resetHyperspeedMovement(): void {
    this.hyperspeedDirection = null;
    this.hyperspeedPellets = emptyPlayerPelletFrame();
    this.hyperspeedFruitEaten = 0;
    this.turnCatchGraceMs = 0;
  }

  private zeroPlayerSpeed(): void {
    applyPlayerSpeed(this.world, 0, this.currentTuning);
  }

  private breakHyperspeedShield(caughtBy: number | null): boolean {
    const spent = spendHyperspeedShield(this.runUpgrades);
    if (spent === null) {
      return false;
    }
    this.runUpgrades = spent;
    this.recorder.activation("shieldBreak");
    this.resetStreak();
    this.fireReactiveArmor(caughtBy);
    if (shieldBreakOwned(this.effectiveUpgrades())) {
      this.firePowerPelletEffects(1);
      this.runUpgrades = { ...this.runUpgrades, hyperspeedShieldRemainingMs: 0 };
    }
    return true;
  }

  private breakShield(caughtBy: number | null, bounceFrom: number | null): boolean {
    const spent = spendShield(this.runUpgrades);
    if (spent === null) {
      return false;
    }
    this.runUpgrades = spent;
    this.recorder.activation("shieldBreak");
    this.resetStreak();
    const bounce = bounceFrom === null ? null : startShieldBounce(this.world, bounceFrom);
    this.fireReactiveArmor(caughtBy);
    if (shieldBreakOwned(this.effectiveUpgrades())) {
      this.firePowerPelletEffects(1);
    }
    if (bounce === null) {
      this.runUpgrades = applyShieldBreakInvuln(this.runUpgrades);
      return true;
    }
    this.shieldBounce = settleShieldBounce(
      this.shieldBounce,
      bounce,
      this.warpGlide !== null,
      heldGhostEids(this.ghostCornerWarps),
    );
    this.bounceStaleKeys = this.frameKeys;
    return true;
  }

  private fireReactiveArmor(caughtBy: number | null): void {
    const owned = this.effectiveUpgrades();
    if (!reactiveArmorOwned(owned)) {
      return;
    }
    const sent = applyReactiveArmor(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
      this.releaseAdds(),
      {
        contactEid: caughtBy,
        radiusTiles: reactiveArmorRadiusTiles(owned),
      },
    );
    this.lastReactiveArmorSent = sent.length;
    if (sent.length > 0) {
      this.recorder.activation("reactiveArmor");
    }
  }

  private fireDueEchoes(delta: number): boolean {
    if (this.runUpgrades.pendingEchoes.length === 0) {
      return false;
    }
    const echoTick = tickEchoes(this.runUpgrades.pendingEchoes, delta);
    this.runUpgrades = { ...this.runUpgrades, pendingEchoes: echoTick.pending };
    for (const bases of echoTick.ready) {
      this.recorder.activation("echo");
      if (this.firePowerPelletEffects(1, bases)) {
        return true;
      }
    }
    return false;
  }

  private firePowerPelletEffects(
    powerRemoved: number,
    echoBases?: readonly BaseUpgradeId[],
  ): boolean {
    const powerEffects = this.applyPowerEffects(powerRemoved, echoBases);
    if (powerEffects.collectExtraPellets > 0) {
      const bonusEids = collectExtraForBodies(
        this.world,
        powerEffects.collectExtraPellets,
        this.twinPosition(),
      );
      for (const eid of bonusEids) {
        this.releaseDrawable(eid);
      }
      if (bonusEids.length > 0) {
        this.emitMunch();
        const collectResult = applyPelletCollect(
          this.pelletProgress,
          bonusEids.length,
          noRequiredPelletsLeft(this.world),
        );
        this.pelletProgress = collectResult.progress;
        this.lifetimeCollected += bonusEids.length;
        if (collectResult.shouldRecordClear) {
          this.triggerLevelClear();
          return true;
        }
      }
    }
    for (let recalled = 0; recalled < powerEffects.recallGhostCount; recalled += 1) {
      this.recordRecall(
        recallClosestGhostToHouse(
          this.world,
          this.ghostReleaseClock,
          this.pelletProgress.boardCollected,
          this.afterLifeRelease,
          {
            delayAddMs: ghostHouseReleaseDelayAddMs(this.effectiveUpgrades()),
            reliefPelletAdd: ghostHouseReliefPelletAdd(this.effectiveUpgrades()),
          },
          frozenGhostEid(this.runUpgrades),
        ),
      );
    }
    if (powerEffects.cornerTeleportHoldMs !== null) {
      this.teleportGhostsToCorners(powerEffects.cornerTeleportHoldMs);
    }
    if (powerEffects.warpPlayerFarthest) {
      this.warpPlayer();
    }
    return false;
  }

  private spawnRespawnedPowerPellet(x: number, y: number): void {
    spawnPellet(this.world, x, y, "power");
    this.pelletProgress = addPelletsToProgress(this.pelletProgress, 1);
  }

  private regenIconFloor(): number {
    return levelLivesIconFloor(
      lifeFloorBonus(this.effectiveUpgrades()),
      this.options.maxLives ?? DEFAULT_MAX_LIVES,
    );
  }

  private regenAmount(): number {
    return levelRegenAmount(
      hasUpgrade(this.effectiveUpgrades(), "passiveMyogenesis"),
      regenToFull(this.effectiveUpgrades()),
    );
  }

  private applyLifeRegen(amount: number): void {
    const livesBefore = this.lives;
    if (amount > 0) {
      this.lives = livesAfterLevelRegen(this.lives, this.regenIconFloor(), amount);
    }
    this.recorder.livesRegenerated(livesBefore, this.lives);
    if (this.lives > livesBefore) {
      this.emit({ type: "lives", pulse: true });
    }
  }

  private applyGrantEffects(id: UpgradeId): void {
    this.lives += grantLivesForUpgrade(id);
    this.topUpStartingShields();
    if (baseIdOf(id) === "passiveMyogenesis") {
      this.lives = livesAfterLevelRegen(this.lives, this.regenIconFloor(), 1);
    }
    if (baseIdOf(id) === "passivePelletToPower") {
      this.applyPelletSurge(pelletSurgeCount([id]));
    }
    if (baseIdOf(id) === "passiveTunnelBoring") {
      this.tunnelBoringCharges = TUNNEL_BORING_CHARGES_PER_LEVEL;
    }
    if (id === "fruitFecundity") {
      this.fruitPresence = extendFruitLifetime(this.fruitPresence, FRUIT_FECUNDITY_MUL);
    }
  }

  private applyPelletSurge(count: number, stream: RandomStream = "pelletToPower"): void {
    for (let converted = 0; converted < count; converted += 1) {
      const eid = applyPelletToPowerConvert(
        this.world,
        this.random.stream(stream, this.levelIndex),
      );
      if (eid === null) {
        return;
      }
      this.recorder.activation("pelletSurge");
      this.emitDraw();
      this.emit({ type: "bouncePowerPellet", eid });
    }
  }

  private advanceToNextLevel(): void {
    this.emit({ type: "newLevelModal" });

    this.fruitSequence = {
      sequence: [],
      spawnIndex: 0,
      previousLevelFirstKind:
        this.fruitSequence.sequence[0] ?? this.fruitSequence.previousLevelFirstKind,
    };
    this.levelIndex += 1;
    this.runUpgrades = {
      ...clearUpgradeTimers(this.runUpgrades),
      shieldsBanked: 0,
      peelsBanked: 0,
    };
    this.peelTail = [];
    this.peelHeading = 0;
    this.eatDragMs = 0;
    this.turnTuning.reset();
    this.turnCatchGraceMs = 0;

    this.startBoard(null);
    this.emit({ type: "upgrades" });
    this.showLevelBanner();
    this.emit({ type: "musicAfterFanfare", id: "gameplayMusic" });
    this.emitDraw({ frozenGhostEid: null, playerInvulnRemainingMs: 0, wallPassActive: false });
  }

  private showLevelBanner(text?: string): void {
    this.emit({
      type: "banner",
      text: text ?? `LEVEL ${this.levelIndex}`,
      boss: text === undefined && isBossLevel(this.levelIndex),
    });
  }

  private beginPossession(ghostEid: number, pendingGameOver: boolean, livesBefore: number): void {
    const duration = possessionDurationMs(this.effectiveUpgrades()) ?? 0;
    const others = [...query(this.world, [Ghost, GhostPhase])].filter(
      (eid) => eid !== ghostEid && GhostPhase.value[eid] !== GHOST_PHASE.inHouse,
    );
    this.runUpgrades = armPossession(this.runUpgrades, ghostEid, duration, others);
    this.possessionPendingGameOver = pendingGameOver;
    this.possessionLivesBefore = livesBefore;
    this.possessionHauntAfterMs = possessionHauntMs(this.effectiveUpgrades());
    this.recorder.activation("possession");
    for (const eid of query(this.world, [Player, Velocity, Input])) {
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      Input.direction[eid] = DIRECTION.none;
    }
    this.emitDraw();
  }

  private finishPossession(): void {
    const pendingGameOver = this.possessionPendingGameOver;
    this.runUpgrades = endPossession(this.runUpgrades);
    this.possessionPendingGameOver = false;
    if (pendingGameOver) {
      this.saveRun();
      this.recorder.finish("death");
      this.emitRunLog();
    }
    this.death = beginDeathSequence(pendingGameOver);
  }

  private clearPossessionForLevelClear(): void {
    this.runUpgrades = endPossession(this.runUpgrades);
    this.lives = lifeAfterDeathClear(this.possessionLivesBefore);
    this.possessionPendingGameOver = false;
    this.possessionHauntAfterMs = null;
    this.possessionLivesBefore = 0;
    this.emit({ type: "lives", pulse: true });
  }

  private handleDeathEvent(event: DeathSequenceEvent): void {
    switch (event) {
      case "resetActors":
        this.resetAfterLifeLoss();
        this.emitDraw({
          frozenGhostEid: null,
          playerInvulnRemainingMs: 0,
          wallPassActive: false,
          ...(this.reviveSplashPending ? { playerReviveProgress: 0 } : {}),
        });
        this.reviveSplashElapsedMs = this.reviveSplashPending ? 0 : null;
        this.reviveSplashPending = false;
        break;
      case "startFade":
        this.emit({ type: "deathFade" });
        break;
      case "showGameOver":
        this.emit({ type: "endText", title: "GAME OVER" });
        this.runEndElapsedMs = 0;
        break;
      case "resume":
        this.death = null;
        this.finishMoneyTalks();
        if (this.reviveSplashElapsedMs !== null) {
          this.reviveSplashElapsedMs = null;
          this.emitDraw({ playerReviveProgress: 1 });
        }
        this.emit({ type: "loopStart", id: "gameplayMusic" });
        break;
    }
  }

  private tickDeathEffects(delta: number): void {
    this.tickChaff(delta);
    if (
      this.ghostCornerWarps.length > 0 ||
      this.warpGlide !== null ||
      this.runUpgrades.chaff !== null
    ) {
      this.emitDraw();
    }
  }

  private tickMoneyTalks(delta: number): void {
    const spend = this.moneyTalksSpend;
    if (spend === null) {
      return;
    }
    spend.elapsedMs += delta;
    this.payMoneyTalks(moneyTalksLaunchedCount(spend.elapsedMs, spend.count) - spend.paid);
    this.emit({ type: "walletCoins", spend: { ...spend } });
  }

  private finishMoneyTalks(): void {
    const spend = this.moneyTalksSpend;
    if (spend === null) {
      return;
    }
    this.payMoneyTalks(spend.count - spend.paid);
    this.moneyTalksSpend = null;
    this.emit({ type: "walletCoins", spend: null });
  }

  private payMoneyTalks(coins: number): void {
    if (this.moneyTalksSpend === null || coins <= 0) {
      return;
    }
    this.moneyTalksSpend.paid += coins;
    this.quarters -= coins;
    this.emit({ type: "quarters", pulse: false });
  }

  private tickReviveSplash(delta: number): void {
    if (this.reviveSplashElapsedMs === null) {
      return;
    }
    this.reviveSplashElapsedMs += delta;
    const progress = reviveSplashProgress(this.reviveSplashElapsedMs);
    this.emitDraw({ playerReviveProgress: progress });
    if (progress >= 1) {
      this.reviveSplashElapsedMs = null;
    }
  }

  private beginRunComplete(): void {
    this.emit({ type: "loopStop", id: "gameplayMusic" });
    this.emit({ type: "endText", title: "RUN COMPLETE" });
    this.runEndElapsedMs = 0;
    this.saveRun();
    this.recorder.finish("complete");
    this.emitRunLog();
  }

  private applyPowerEffects(powerRemoved: number, onlyBases?: readonly BaseUpgradeId[]) {
    const before = this.runUpgrades;
    const powerEffects = applyPowerPelletEffects(before, powerRemoved, onlyBases, this.levelIndex);
    if (powerRemoved > 0) {
      this.firedUpgrades.push(...firingPowerUpgrades(before.owned, onlyBases).map(baseIdOf));
    }
    this.runUpgrades = powerEffects.state;
    if (powerEffects.programmerStarted) {
      holdPlayerForProgramming(this.world);
    }
    if (powerEffects.frightenGhosts) {
      const frightened = frightenGhosts(
        this.world,
        hunterFrightenLimit(this.bossState?.def.id ?? null),
      );
      this.runUpgrades = { ...this.runUpgrades, frightenedGhostEids: frightened };
      if (frightened.length > 0) {
        this.recorder.activation("frighten");
      }
    }
    if (onlyBases === undefined && powerRemoved > 0) {
      this.runUpgrades = queueEcho(this.runUpgrades, this.random.stream("echo", this.levelIndex));
    }
    if (powerEffects.freezeClosestMs !== null) {
      this.runUpgrades = freezeClosestGhost(
        this.world,
        this.runUpgrades,
        powerEffects.freezeClosestMs,
      );
      this.recorder.activation("freeze");
      this.recorder.target("freeze", ghostName(this.world, frozenGhostEid(this.runUpgrades)));
    }
    const after = this.runUpgrades;
    const timers = [
      ["wallPass", before.wallPassRemainingMs, after.wallPassRemainingMs],
      ["invuln", before.invulnRemainingMs, after.invulnRemainingMs],
      ["speedBurst", before.speedBurstRemainingMs, after.speedBurstRemainingMs],
      ["hyperspeed", before.hyperspeedRemainingMs, after.hyperspeedRemainingMs],
      ["ghostHarvest", before.ghostHarvestRemainingMs, after.ghostHarvestRemainingMs],
      ["tithe", before.titheRemainingMs, after.titheRemainingMs],
      ["defyDeath", before.defyDeathRemainingMs, after.defyDeathRemainingMs],
    ] as const;
    for (const [kind, was, now] of timers) {
      if (now > was) {
        this.recorder.activation(kind);
      }
    }
    if (after.chaff !== null && after.chaff !== before.chaff) {
      this.recorder.activation("chaff");
    }
    if (powerEffects.mirrorStarted) {
      this.recorder.activation("mirror");
    }
    if (powerEffects.collectExtraPellets > 0) {
      this.recorder.activation("collectExtra");
    }
    if (powerEffects.cornucopiaFruit !== null) {
      this.spawnCornucopiaFruit(powerEffects.cornucopiaFruit);
    }
    if (powerEffects.tunnelBoringRecharge) {
      this.tunnelBoringCharges = TUNNEL_BORING_CHARGES_PER_LEVEL;
    }
    return powerEffects;
  }

  private tickChaff(delta: number): void {
    const result = advanceChaff(
      this.world,
      this.runUpgrades.chaff,
      delta,
      this.random.stream("chaff", this.levelIndex),
    );
    this.runUpgrades = { ...this.runUpgrades, chaff: result.state };
    for (const tile of result.burst) {
      this.emit({ type: "chaffBurst", x: cellCenterX(tile.col), y: cellCenterY(tile.row) });
    }
  }

  private recordRecall(eid: number | null): void {
    if (eid !== null) {
      this.recorder.activation("recall");
      this.recorder.target("recall", ghostName(this.world, eid));
    }
  }

  private warpPlayer(): void {
    const from = this.playerPosition();
    this.warpGlide = warpPlayerFarthestFromGhosts(this.world);
    if (from !== null) {
      this.recorder.warp(from, this.playerPosition() ?? from, getActiveLayout().tileSize);
    }
  }

  private speedTrailActive(): boolean {
    return (
      speedBurstActive(this.runUpgrades) ||
      hyperspeedActive(this.runUpgrades) ||
      this.runUpgrades.programmer?.phase === "running"
    );
  }

  private sonicBoom(): void {
    const owned = this.effectiveUpgrades();
    const atSpeed =
      this.death === null &&
      atTopSpeed(
        owned,
        this.speedTrailActive(),
        movingOverClearedTile(this.world),
        floatingZoneEffect(owned, this.playerSpeedZone()) === "fast",
      );
    const boom = stepSonicBoom(this.world, this.sonicEchoes, this.runUpgrades, owned, atSpeed);
    this.runUpgrades = boom.state;
    if (boom.reversed.length > 0) {
      forceGhostReverse(
        this.world,
        this.ghostsBlockedFromTunnels(),
        new Set(boom.reversed),
        this.closedGatedTunnelRow(),
        this.runUpgrades.droppedWall,
      );
    }
    for (const echo of boom.echoes) {
      this.emit({ type: "sonicBoomEcho", ...echo });
    }
  }

  private tickSpeedTrail(delta: number): void {
    const at = this.playerPosition();
    this.speedTrail =
      at !== null && this.speedTrailActive() ? tickSpeedTrail(this.speedTrail, at, delta) : [];
  }

  playerWorldPosition(): Point | null {
    return this.playerPosition();
  }

  private playerPosition(): Point | null {
    const eid = query(this.world, [Player, Position])[0];
    return eid === undefined ? null : { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
  }

  private noteTunnelExit(before: Point | null): void {
    const after = this.playerPosition();
    if (this.runUpgrades.mirrorActive && playerExitedHorizontalTunnel(before, after)) {
      this.popMirror();
    }
    if (playerExitedTunnel(before, after)) {
      this.runUpgrades = applyTunnelExitInvuln(this.runUpgrades, this.effectiveUpgrades());
    }
  }

  private updateWallDrop(facingBefore: Direction): void {
    const before = this.runUpgrades;
    this.runUpgrades = dropWallOnReversal(
      this.world,
      before,
      this.effectiveUpgrades(),
      facingBefore,
    );
    if (this.runUpgrades !== before) {
      this.recorder.activation("wallDrop");
    }
  }

  private notePlayerMovement(
    before: Point | null,
    hasInput: boolean,
    warping: boolean,
    delta: number,
  ): void {
    const after = this.playerPosition();
    if (before === null || after === null) {
      return;
    }
    const { cols, rows, tileSize } = getActiveLayout();
    this.recorder.movement(
      before,
      after,
      { width: cols * tileSize, height: rows * tileSize, tileSize },
      hasInput,
      warping,
      delta,
    );
  }

  private settledGhostMode(): GhostAiMode {
    return effectiveGhostMode(this.ghostModeClock.mode, this.pelletProgress.pelletsRemaining);
  }

  private notePellets(): void {
    this.recorder.pellets(
      this.pelletProgress.boardCollected,
      this.pelletProgress.pelletsRemaining,
      this.clock.remaining,
    );
  }

  private runTotals() {
    return {
      pelletsCollected: this.lifetimeCollected,
      quarters: this.quarters,
      lives: this.lives,
    };
  }

  private emitRunLog(): void {
    this.emit({ type: "runLog", record: this.recorder.snapshotRecord(this.runTotals()) });
  }

  private saveRun(): void {
    if (!this.options.highScoresDisabled) {
      this.emit({
        type: "saveRun",
        collected: this.lifetimeCollected,
        remaining: this.clock.remaining,
      });
    }
  }

  private resetAfterLifeLoss(): void {
    this.ghostTraction.reset();
    this.sonicEchoes.reset();
    this.lavaElapsedMs = 0;
    this.lavaStarted = false;
    this.resetHyperspeedMovement();
    this.warpGlide = null;
    this.speedTrail = [];
    this.ghostCornerWarps = [];
    this.shieldBounce = NO_SHIELD_BOUNCE;
    this.mirrorPop = null;
    this.resetStreak();
    this.remoteTransferCounter = 0;
    const powerPellets = Array.from(query(this.world, [PowerPellet, Position]), (eid) => ({
      x: Position.x[eid]!,
      y: Position.y[eid]!,
    }));
    const playerSpawn = respawnCenter(this.effectiveUpgrades(), this.fellAt, powerPellets);
    this.fellAt = null;
    for (const eid of query(this.world, [Player, Position, Velocity, Input, Facing])) {
      Position.x[eid] = playerSpawn.x;
      Position.y[eid] = playerSpawn.y;
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      Input.direction[eid] = DIRECTION.none;
      Facing.direction[eid] = DIRECTION.none;
    }

    const save = this.reviveSplashPending;
    const hauntFromHaunting = hauntDurationMs(this.effectiveUpgrades());
    const hauntFromPossession = this.possessionHauntAfterMs;
    this.possessionHauntAfterMs = null;
    const hauntMs =
      hauntFromHaunting === null
        ? hauntFromPossession
        : hauntFromPossession === null
          ? hauntFromHaunting
          : Math.max(hauntFromHaunting, hauntFromPossession);
    let hauntEid = hauntMs !== null ? this.caughtByEid : null;
    if (this.bossState !== null && !save) {
      const caughtKind = hauntEid !== null ? (GhostKind.kind[hauntEid] as GhostKindId) : null;
      for (const eid of [...query(this.world, [Ghost])]) {
        removeEntity(this.world, eid);
        this.releaseDrawable(eid);
      }
      this.spawnBossGhostsForLife();
      hauntEid = caughtKind !== null ? this.pickBossHauntGhost(caughtKind) : null;
    }
    this.caughtByEid = null;

    if (save) {
      if (hauntEid !== null) {
        sendGhostToHouse(
          this.world,
          hauntEid,
          this.ghostReleaseClock,
          this.pelletProgress.boardCollected,
          this.afterLifeRelease,
          { heldGhostEids: [hauntEid] },
        );
      }
      const respawnCell = {
        col: worldToCol(playerSpawn.x),
        row: worldToRow(playerSpawn.y),
      };
      const warps = teleportGhostsToCorners(this.world, 0, {
        onlyOnCell: respawnCell,
        excludeEid: hauntEid,
      });
      this.ghostCornerWarps = mergeGhostCornerWarps(this.ghostCornerWarps, warps);
    } else {
      for (const eid of query(this.world, [
        Ghost,
        GhostPhase,
        Position,
        Velocity,
        Input,
        Facing,
        Speed,
      ])) {
        Velocity.x[eid] = 0;
        Velocity.y[eid] = 0;
        Input.direction[eid] = DIRECTION.none;
        Facing.direction[eid] = DIRECTION.none;
        Speed.px[eid] = 0;
        GhostPhase.value[eid] = GHOST_PHASE.inHouse;
        Ghost.decidedCol[eid] = Number.NaN;
        Ghost.decidedRow[eid] = Number.NaN;
      }

      this.ghostReleaseClock = createGhostReleaseClock(
        this.levelIndex,
        this.pelletProgress.boardCollected,
      );
      this.ghostModeClock = createGhostModeClock(this.levelIndex, this.currentTuning);
      this.previousEffectiveGhostMode = this.settledGhostMode();
      this.afterLifeRelease = true;
      placeInHouseGhostsAtPredictedSeats(
        this.world,
        this.ghostReleaseClock,
        this.pelletProgress.boardCollected,
        this.afterLifeRelease,
        { heldGhostEids: hauntEid === null ? [] : [hauntEid] },
      );
      this.clearFruitEntities();
      this.fruitPresence = {
        ...this.fruitPresence,
        active: false,
        remainingMs: 0,
        gapMs: 0,
      };
    }

    this.runUpgrades = clearUpgradeTimers(this.runUpgrades);
    if (hauntEid !== null && hauntMs !== null) {
      this.runUpgrades = armHaunt(this.runUpgrades, hauntEid, hauntMs);
    }
    this.eatDragMs = 0;
    this.turnTuning.reset();
    this.turnCatchGraceMs = 0;

    this.clock = {
      ...this.clock,
      started: false,
    };
  }

  private pickBossHauntGhost(caughtKind: GhostKindId): number | null {
    const inHouse = [...query(this.world, [Ghost, GhostKind, GhostPhase])].filter(
      (eid) => GhostPhase.value[eid] === GHOST_PHASE.inHouse,
    );
    return inHouse.find((eid) => GhostKind.kind[eid] === caughtKind) ?? inHouse[0] ?? null;
  }

  private clearFruitEntities(keepCornucopia = false): void {
    const keep = new Set(keepCornucopia ? this.cornucopiaFruit.map((fruit) => fruit.eid) : []);
    for (const eid of removeAllFruit(this.world, keep)) {
      this.releaseDrawable(eid);
    }
    if (!keepCornucopia) {
      this.resetCornucopiaFruit();
    }
  }

  private resetCornucopiaFruit(): void {
    this.cornucopiaFruit = [];
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

  private noteFruitRemoved(eids: readonly number[]): void {
    this.cornucopiaFruit = this.cornucopiaFruit.filter((fruit) => !eids.includes(fruit.eid));
  }

  private regularFruitRemains(): boolean {
    return fruitPositions(this.world).length > this.cornucopiaFruit.length;
  }

  private flickerFruitMs(): number {
    const timers = [this.fruitPresence.remainingMs, ...this.cornucopiaFruit.map((f) => f.ms)];
    const running = timers.filter((ms) => ms > 0);
    return running.length === 0 ? 0 : Math.min(...running);
  }

  private tickCornucopiaFruit(delta: number): void {
    if (fruitPersistsUntilLevelEnd(this.effectiveUpgrades())) {
      return;
    }
    const elapsed = Math.max(0, delta);
    const expired = this.cornucopiaFruit.filter((fruit) => fruit.ms <= elapsed);
    for (const { eid } of expired) {
      removeEntity(this.world, eid);
      this.releaseDrawable(eid);
    }
    this.cornucopiaFruit = this.cornucopiaFruit
      .filter((fruit) => fruit.ms > elapsed)
      .map((fruit) => ({ ...fruit, ms: fruit.ms - elapsed }));
  }

  private rollFruitKind(): FruitKind {
    const rolled = takeFruitKind(
      this.fruitSequence,
      this.random.seed,
      this.levelIndex,
      fruitKindsOnBoard(this.world),
      FRUIT_KINDS,
    );
    this.fruitSequence = rolled.state;
    return rolled.kind;
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
    this.cornucopiaFruit.push({
      eid: spawnFruit(this.world, kind, at),
      ms: this.currentTuning.fruitLifetimeMs * fruitLifetimeMultiplier(this.effectiveUpgrades()),
    });
    this.recorder.fruitSpawned(kind);
  }

  private spawnFruitEntity(stack: boolean): void {
    if (!stack) {
      this.clearFruitEntities(true);
      const kind = this.rollFruitKind();
      this.msSinceFruitSpawn = 0;
      spawnFruit(this.world, kind, fruitStackCenter(fruitPositions(this.world)) ?? undefined);
      this.recorder.fruitSpawned(kind);
      return;
    }
    const center = fruitStackCenter(fruitPositions(this.world));
    if (center !== null) {
      const kind = this.rollFruitKind();
      this.msSinceFruitSpawn = 0;
      spawnFruit(this.world, kind, center);
      this.recorder.fruitSpawned(kind);
    } else if (fruitPositions(this.world).length === 0) {
      this.fruitPresence = markFruitCollected(this.fruitPresence);
    }
  }

  private spawnBossGhostInHouse(kind: GhostKindId, releaseDelayMs: number): void {
    const eid = this.spawnBossGhost(kind);
    BossGhost.releaseDelayMs[eid] = releaseDelayMs;
  }

  private spawnBossGhostAtMouth(kind: GhostKindId, mouth: BossTunnelMouth): void {
    const eid = this.spawnBossGhost(kind);
    BossGhost.releaseDelayMs[eid] = 0;
    Position.x[eid] = cellCenterX(mouth.col);
    Position.y[eid] = cellCenterY(mouth.row);
    GhostPhase.value[eid] = GHOST_PHASE.active;
    Facing.direction[eid] = mouth.facing;
    Input.direction[eid] = mouth.facing;
  }

  private spawnBossGhost(kind: GhostKindId): number {
    const eid = this.spawnGhost(kind);
    addComponent(this.world, eid, BossGhost);
    const pair = chainPairForKind(kind);
    if (
      this.bossState?.def.chained === true &&
      pair !== null &&
      bossStage(this.bossState.def, this.bossState.stageIndex).chainPairs.includes(pair)
    ) {
      addComponent(this.world, eid, ChainedGhost);
      ChainedGhost.pair[eid] = pair;
    }
    const corners = [
      blinkyScatterTarget(),
      pinkyScatterTarget(),
      inkyScatterTarget(),
      clydeScatterTarget(),
    ];
    const scatter = this.random.stream("bossScatter", this.levelIndex);
    const corner = corners[Math.floor(scatter() * corners.length)]!;
    BossGhost.scatterCol[eid] = corner.col;
    BossGhost.scatterRow[eid] = corner.row;
    return eid;
  }

  private spawnGhost(kind: GhostKindId, slot: ReleaseSlot = RELEASE_SLOT_BY_KIND[kind]): number {
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

    const seats = ghostHouseSeatCenters();
    const mid = seats[Math.floor(seats.length / 2)] ?? seats[0]!;
    Position.x[eid] = mid.x;
    Position.y[eid] = mid.y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Input.direction[eid] = DIRECTION.none;
    Facing.direction[eid] = DIRECTION.none;
    Speed.px[eid] = 0;
    GhostKind.kind[eid] = kind;
    GhostPhase.value[eid] = GHOST_PHASE.inHouse;
    Ghost.releaseSlot[eid] = slot;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
    Drawable.id[eid] = GHOST_DRAWABLE_BY_KIND[kind];
    Drawable.radius[eid] = ghostRadius();
    return eid;
  }
}
