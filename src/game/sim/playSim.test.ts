import { hasComponent, query, removeEntity } from "bitecs";
import { describe, expect, it, vi } from "vitest";
import {
  createFruitPresence,
  FRUIT_FLICKER_MS,
  FRUIT_LIFETIME_MS,
  CORNUCOPIA_SPAWN_DEBOUNCE_MS,
  nextFruitKind,
} from "../../domain/fruit";
import { FRUIT_KINDS } from "../fruitArt";
import { ghostTeleportCell, scatterTargetForKind } from "../../domain/ghostCorner";
import { GHOST_KIND, ghostKindLabel, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_ROSTERS, rosterIdForSeed } from "../../domain/ghostRoster";
import { CHAIN_PAIR } from "../../domain/bossRules";
import {
  BOSS_STAGE_BLACK_HOLD_MS,
  BOSS_STAGE_ENTITY_FADE_MS,
  BOSS_STAGE_FLICKER_MS,
  BOSS_STAGE_TOTAL_MS,
} from "../../domain/bossStageTransition";
import {
  actorDisplaySize,
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  ghostHouseSpawnCenter,
  horizontalTunnelRows,
  isWalkable,
  MAZE_OFFSET_X,
  MAZE_PIXEL_WIDTH,
  playerFarthestFromGhostsSpawn,
  TILE_SIZE,
  worldToCol,
  worldToRow,
  type MazeTile,
} from "../../domain/maze";
import {
  boreSteps,
  TUNNEL_BORE_STEP_MS,
  TUNNEL_BORING_SPEED_MUL,
  tunnelBoringCells,
} from "../../domain/tunnelBoring";
import { ghostBaseSpeedRatio, speedLevelMultiplier } from "../../domain/levelRules";
import { GHOST_AI_MODE } from "../../domain/ghostMode";
import { CLASSIC_MAZE_ASCII, STORE_MAZE_ASCII, tinyHouseMazeAscii } from "../../domain/mazeLayouts";
import { parseQueryParams } from "../../domain/queryParams";
import { defaultPlayOptions, parsePlayOptions, type PlayOptions } from "../../domain/playOptions";
import { INTERMISSION_IDS } from "../../domain/intermission";
import {
  GHOST_DRAWABLE_BY_KIND,
  ghostRadius,
  PLAYER_SPEED,
  playerRadius,
} from "../../domain/playfield";
import { PLAYER_INVULN_TINT, brightenColor, playerTint } from "../../domain/playerTint";
import {
  offeredUpgradeIds,
  parseStoreLayout,
  STORE_ENHANCE_PRICE,
  STORE_SWAP_PRICE,
  swapIncomingSchool,
} from "../../domain/store";
import { DEFAULT_TUNING, resolveTuning, type Tuning } from "../../domain/tuning";
import { TURN_CATCH_GRACE_MS } from "../../domain/turnCatchGrace";
import { turnFlashPulse } from "../../domain/turnTuning";
import { WARP_GLIDE_MS } from "../../domain/warpGlide";
import {
  GHOST_WALL_STUN_MS,
  SHIELD_BOUNCE_MS,
  SHIELD_BOUNCE_TILES,
} from "../../domain/shieldBounce";
import { LAVA_CYCLE_MS, LAVA_EMERGE_MS, LAVA_MAX_REACH_TILES } from "../../domain/lavaZone";
import {
  FAST_ZONE_MULTIPLIER,
  SLOW_ZONE_MULTIPLIER,
  SPEED_ZONE_MIN_LENGTH,
  SPEED_ZONE_SHIFT_STEP_MS,
  speedZoneCells,
  type SpeedZone,
} from "../../domain/speedZones";
import { WALL_DROP_MS, wallDropSpot } from "../../domain/wallDrop";
import { POWER_PELLET_BREAK_MS } from "../../domain/powerPelletBreak";
import { INVULN_FLOOR_RATIO, levelScaledDurationMs } from "../../domain/levelScaledDuration";
import {
  DEFY_DEATH_MS,
  EXTRA_HUNGRY_COUNT,
  FREEZE_MS,
  HAUNTING_MS,
  frozenGhostEid,
  grantUpgrade,
  INVULN_ENHANCED_MS,
  INVULN_MS,
  NEAR_MISS_CHARGE,
  NEAR_MISS_ENHANCED_CHARGE,
  SHIELD_BREAK_INVULN_MS,
  STREAK_ENGINE_ENHANCED_INVULN_MS,
  TITHE_ENHANCED_MS,
  TITHE_MS,
  TITHE_SPEED_MUL,
  STARTING_UPGRADE_POOL,
  CORNER_TELEPORT_HOLD_MS,
  ALL_UPGRADE_IDS,
  STORE_RARE_UPGRADE_PRICE,
  WALL_PASS_MS,
  baseIdOf,
  getUpgradeDef,
  isRare,
  type BaseUpgradeId,
  type UpgradeChoiceOffer,
  type UpgradeId,
} from "../../domain/upgrades";
import {
  TRINKET_IDS,
  TRINKET_MAX_COPIES,
  TRINKET_SLOWDOWN_CUT,
  TRINKET_SPEED_ADD,
  TRINKET_TUNNEL_SPEED_ADD,
  TRINKET_VORTEX_CUT,
  TRINKET_HOUSE_DELAY_MS,
  TRINKET_TRACTION_CUT,
  isTrinketId,
} from "../../domain/trinkets";
import { slotFrame, slotWinTotals } from "../../domain/slotMachine";
import { schoolArtTextureKey } from "../../domain/schoolArt";
import { upgradeArtTextureKey } from "../../domain/upgradeArt";
import { upgradeIconTexture } from "../upgradeArt";
import { ECHO_DELAY_MS } from "../../domain/echo";
import type { ProgramDir } from "../../domain/programmer";
import { lazyLooperRequiredCells } from "../../domain/lazyLooper";
import { BossGhost } from "../components/BossGhost";
import { BossPellet } from "../components/BossPellet";
import { ChainedGhost } from "../components/ChainedGhost";
import { Fruit } from "../components/Fruit";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GHOST_PHASE, GhostPhase } from "../components/GhostPhase";
import { ghostMovementRules } from "../../domain/ghostMovement";
import { SINKHOLE_INTRO_MS } from "../../domain/sinkholeArt";
import { DIRECTION, Input } from "../components/Input";
import { OptionalPellet } from "../components/OptionalPellet";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { PlaySim, RUN_END_MENU_ARM_MS } from "./playSim";
import { ghostName } from "./runRecorder";
import type { SimEvent } from "./simEvents";
import { IDLE_INPUT, type SimInput } from "./simInput";
import { NO_KEYS_HELD } from "../systems/heldKeys";
import { convertPelletToPower } from "../systems/pelletToPower";
import { FRAME_MS, held, runFrames, runUntil } from "./simTesting";

const BOSS_STAGE_WAIT_FRAMES = Math.ceil(BOSS_STAGE_TOTAL_MS / FRAME_MS) + 30;

const MAXED_TRINKETS: UpgradeId[] = TRINKET_IDS.flatMap((id) =>
  Array.from({ length: TRINKET_MAX_COPIES }, () => id),
);

const ONE_QUARTER_SLOT = { quarters: 1, upgrades: 0, lives: 0 };

function startSim(overrides: Partial<PlayOptions>, seed = "test"): PlaySim {
  const sim = new PlaySim({ ...defaultPlayOptions(), slot: ONE_QUARTER_SLOT, ...overrides }, seed);
  sim.start();
  if (sim.snapshot().storeEntering) {
    runUntil(sim, () => !sim.snapshot().storeEntering, 120);
  }
  return sim;
}

function playerEid(sim: PlaySim): number {
  return query(sim.world, [Player, Position])[0]!;
}

function settledZones(sim: PlaySim): SpeedZone[] {
  runUntil(sim, () => !sim.snapshot().speedZonesShifting, 600);
  return sim.snapshot().speedZones;
}

function teleportPlayer(sim: PlaySim, x: number, y: number): void {
  const eid = playerEid(sim);
  Position.x[eid] = x;
  Position.y[eid] = y;
}

function ghostOntoPlayer(sim: PlaySim): void {
  const ghost = query(sim.world, [Ghost, Position])[0]!;
  const player = playerEid(sim);
  Position.x[ghost] = Position.x[player]!;
  Position.y[ghost] = Position.y[player]!;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
}

function bounceIdle(sim: PlaySim): boolean {
  const { player, ghosts, stunned } = sim.snapshot().shieldBounce;
  return player === null && ghosts.length === 0 && stunned.length === 0;
}

function reviveProgresses(events: SimEvent[]): number[] {
  return events.flatMap((event) =>
    event.type === "draw" && event.options.playerReviveProgress !== undefined
      ? [event.options.playerReviveProgress]
      : [],
  );
}

function count(events: SimEvent[], type: SimEvent["type"]): number {
  return events.filter((event) => event.type === type).length;
}

function settleSlots(sim: PlaySim): SimEvent[] {
  return runUntil(
    sim,
    () => !sim.snapshot().slot.active && sim.snapshot().slot.queued === 0,
    3000,
    { acknowledge: true },
  );
}

function drainToOffer(sim: PlaySim): UpgradeChoiceOffer {
  runUntil(sim, () => sim.offer() !== null, 900, { acknowledge: true });
  return sim.offer()!;
}

function takeFirstOffered(sim: PlaySim): void {
  sim.chooseUpgrade({ kind: "upgrade", id: drainToOffer(sim).upgrades[0]! });
}

function cellSpeedRatios(id: UpgradeId | null): { empty: number; pellet: number } {
  const baseline = startSim({ level: 2, maze: "maze1" });
  const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: id === null ? [] : [id] });
  const target = regularPelletEids(sim)[0]!;
  const col = worldToCol(Position.x[target]!);
  const row = worldToRow(Position.y[target]!);
  const measure = (world: PlaySim, vx: number): number => {
    const pellets = Array.from(query(world.world, [Pellet, Position]));
    const keep = regularPelletEids(world).find(
      (eid) => worldToCol(Position.x[eid]!) === col && worldToRow(Position.y[eid]!) === row,
    );
    for (const eid of pellets) {
      if (eid !== keep) {
        removeEntity(world.world, eid);
      }
    }
    teleportPlayer(world, cellCenterX(col - 1), cellCenterY(row));
    Velocity.x[playerEid(world)] = vx;
    Velocity.y[playerEid(world)] = 0;
    runFrames(world, 1);
    return Speed.px[playerEid(world)]!;
  };
  const base = measure(baseline, 1);
  return { pellet: measure(sim, 1) / base, empty: measure(sim, -1) / base };
}

function regularPelletEids(sim: PlaySim): number[] {
  return Array.from(query(sim.world, [Pellet, Position])).filter(
    (eid) => !hasComponent(sim.world, eid, PowerPellet),
  );
}

function eatPelletAt(sim: PlaySim, eid: number): void {
  teleportPlayer(sim, Position.x[eid]!, Position.y[eid]!);
  runFrames(sim, 1);
  settleSlots(sim);
}

describe("PlaySim fruit lifetime", () => {
  const framesFor = (ms: number): number => Math.ceil(ms / FRAME_MS);

  function startWithFruit(enableUpgrades: PlayOptions["enableUpgrades"]): PlaySim {
    const sim = startSim({ level: 2, enableUpgrades });
    const [threshold] = getActiveLayout().fruitThresholds;
    for (const eid of regularPelletEids(sim).slice(0, threshold)) {
      eatPelletAt(sim, eid);
    }
    teleportPlayer(sim, 0, 0);
    expect(sim.snapshot().fruit).toBe(true);
    return sim;
  }

  it("despawns after the base 10s without the upgrade", () => {
    const sim = startWithFruit([]);
    runFrames(sim, framesFor(FRUIT_LIFETIME_MS - 500));
    expect(sim.snapshot().fruit).toBe(true);
    runFrames(sim, framesFor(1_000));
    expect(sim.snapshot().fruit).toBe(false);
  });

  it("reports the countdown to render and the snapshot so the fruit can flicker before it goes", () => {
    const sim = startWithFruit([]);
    expect(sim.renderOptions().fruitRemainingMs).toBe(FRUIT_LIFETIME_MS);
    runFrames(sim, framesFor(FRUIT_LIFETIME_MS - FRUIT_FLICKER_MS + 100));
    const { fruitRemainingMs } = sim.renderOptions();
    expect(fruitRemainingMs).toBeLessThanOrEqual(FRUIT_FLICKER_MS);
    expect(fruitRemainingMs).toBeGreaterThan(0);
    expect(sim.snapshot().timers.fruitMs).toBe(fruitRemainingMs);
    runFrames(sim, framesFor(FRUIT_FLICKER_MS + 500));
    expect(sim.snapshot().fruit).toBe(false);
    expect(sim.renderOptions().fruitRemainingMs).toBe(0);
  });

  it("lasts twice as long with fruitFecundity", () => {
    const sim = startWithFruit(["fruitFecundity"]);
    runFrames(sim, framesFor(FRUIT_LIFETIME_MS * 2 - 500));
    expect(sim.snapshot().fruit).toBe(true);
    runFrames(sim, framesFor(1_000));
    expect(sim.snapshot().fruit).toBe(false);
  });

  it("doubles the remaining time of a fruit already on the board when granted", () => {
    const sim = startWithFruit([]);
    runFrames(sim, framesFor(6_000));
    expect(sim.snapshot().fruit).toBe(true);
    sim["runUpgrades"] = grantUpgrade(sim["runUpgrades"], "fruitFecundity");
    sim["applyGrantEffects"]("fruitFecundity");
    runFrames(sim, framesFor(7_000));
    expect(sim.snapshot().fruit).toBe(true);
    runFrames(sim, framesFor(2_000));
    expect(sim.snapshot().fruit).toBe(false);
  });
});

describe("PlaySim Fruit Fecundity+", () => {
  const framesFor = (ms: number): number => Math.ceil(ms / FRAME_MS);

  function eatPellets(sim: PlaySim, n: number): void {
    for (const eid of regularPelletEids(sim).slice(0, n)) {
      eatPelletAt(sim, eid);
    }
  }

  it("keeps fruit until the level ends and stacks the next one in the same row", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["fruitFecundityPlus"] });
    const [first, second] = getActiveLayout().fruitThresholds;
    eatPellets(sim, first);
    teleportPlayer(sim, 0, 0);
    runFrames(sim, framesFor(FRUIT_LIFETIME_MS * 4));
    expect(query(sim.world, [Fruit, Position])).toHaveLength(1);

    eatPellets(sim, second - first);
    runFrames(sim, 2);
    const fruit = query(sim.world, [Fruit, Position]);
    expect(fruit).toHaveLength(2);
    expect(Position.y[fruit[0]!]).toBe(Position.y[fruit[1]!]);
    expect(Position.x[fruit[0]!]).not.toBe(Position.x[fruit[1]!]);
  });

  it("base Fecundity still expires and never stacks", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["fruitFecundity"] });
    const [first] = getActiveLayout().fruitThresholds;
    eatPellets(sim, first);
    teleportPlayer(sim, 0, 0);
    runFrames(sim, framesFor(FRUIT_LIFETIME_MS * 2 + 500));
    expect(query(sim.world, [Fruit, Position])).toHaveLength(0);
  });

  it("stacks two different fruit kinds when both are on the board", () => {
    const sim = startSim(
      { level: 2, maze: "maze1", enableUpgrades: ["fruitFecundityPlus"] },
      "fruit-kinds",
    );
    const [first, second] = getActiveLayout().fruitThresholds;
    eatPellets(sim, first);
    teleportPlayer(sim, 0, 0);
    eatPellets(sim, second - first);
    runFrames(sim, 2);
    const kinds = sim.snapshot().fruitKinds;
    expect(kinds).toHaveLength(2);
    expect(kinds[0]).not.toBe(kinds[1]);
  });

  it("can spawn watermelon from the art-folder fruit pool", () => {
    expect(FRUIT_KINDS).toContain("watermelon");
    const others = FRUIT_KINDS.filter((kind) => kind !== "watermelon");
    expect(
      nextFruitKind({
        seed: "fruit-watermelon",
        level: 2,
        spawnIndex: 1,
        previousLevelFirstKind: null,
        onBoard: others,
        alreadyChosen: undefined,
        kinds: FRUIT_KINDS,
      }),
    ).toBe("watermelon");

    const sim = startSim({ level: 2, maze: "maze1" }, "fruit-watermelon");
    sim["fruitSequence"] = {
      sequence: ["watermelon"],
      spawnIndex: 0,
      previousLevelFirstKind: null,
    };
    const [first] = getActiveLayout().fruitThresholds;
    eatPellets(sim, first);
    teleportPlayer(sim, 0, 0);
    expect(sim.snapshot().fruitKinds).toEqual(["watermelon"]);
  });

  it("keeps the first fruit kind when the level's spawn sequence is replayed", () => {
    const seed = "fruit-replay";
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["fruitFecundityPlus"] }, seed);
    const [first] = getActiveLayout().fruitThresholds;
    eatPellets(sim, first);
    teleportPlayer(sim, 0, 0);
    const firstKind = sim.snapshot().fruitKinds[0];
    expect(firstKind).toBeDefined();

    sim["fruitSequence"] = { ...sim["fruitSequence"], spawnIndex: 0 };
    sim["clearFruitEntities"]();
    sim["fruitPresence"] = createFruitPresence();
    sim["spawnFruitEntity"](false);
    expect(sim.snapshot().fruitKinds[0]).toBe(firstKind);
    expect(sim.snapshot().fruitKinds[0]).toBe(
      nextFruitKind({
        seed,
        level: 2,
        spawnIndex: 0,
        previousLevelFirstKind: null,
        onBoard: [],
        alreadyChosen: firstKind,
        kinds: FRUIT_KINDS,
      }),
    );
  });
});

describe("PlaySim Fruit Feast+", () => {
  function eatPellets(sim: PlaySim, n: number): void {
    for (const eid of regularPelletEids(sim).slice(0, n)) {
      eatPelletAt(sim, eid);
    }
  }

  it("spawns a fourth fruit at 200 pellets and the first at 45", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      infiniteLives: true,
      enableUpgrades: ["fruitFeastPlus"],
    });
    eatPellets(sim, 44);
    expect(sim.snapshot().fruit).toBe(false);
    eatPellets(sim, 1);
    expect(sim.snapshot().fruit).toBe(true);
  });
});

describe("PlaySim fruit feast", () => {
  function eatPellets(sim: PlaySim, n: number): void {
    for (const eid of regularPelletEids(sim).slice(0, n)) {
      eatPelletAt(sim, eid);
    }
  }

  it("spawns fruit at 60, waits for the gap after the first is gone, then spawns at 130", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      infiniteLives: true,
      enableUpgrades: ["fruitFeast"],
    });
    eatPellets(sim, 59);
    expect(sim.snapshot().fruit).toBe(false);
    eatPellets(sim, 1);
    expect(sim.snapshot().fruit).toBe(true);

    eatPellets(sim, 70);
    expect(sim.snapshot().boardCollected).toBeGreaterThanOrEqual(130);
    expect(sim.snapshot().fruit).toBe(true);

    teleportPlayer(sim, 0, 0);
    runUntil(sim, () => !sim.snapshot().fruit, 700);
    runFrames(sim, 280);
    expect(sim.snapshot().fruit).toBe(false);
    runUntil(sim, () => sim.snapshot().fruit, 60);
  });

  it("does not spawn fruit at 60 pellets without the upgrade", () => {
    const sim = startSim({ level: 2, maze: "maze1", infiniteLives: true });
    eatPellets(sim, 60);
    expect(sim.snapshot().fruit).toBe(false);
  });
});

describe("PlaySim Afterburner", () => {
  it("speeds up entering a cell without a pellet and slows entering one with a pellet", () => {
    const ratios = cellSpeedRatios("passiveAfterburner");
    expect(ratios.pellet).toBeCloseTo(0.8);
    expect(ratios.empty).toBeCloseTo(1.3);
  });

  it("Afterburner+ gives +50% and keeps the 20% pellet-cell slowdown", () => {
    const ratios = cellSpeedRatios("passiveAfterburnerPlus");
    expect(ratios.pellet).toBeCloseTo(0.8);
    expect(ratios.empty).toBeCloseTo(1.5);
  });

  it("changes nothing without the upgrade", () => {
    const ratios = cellSpeedRatios(null);
    expect(ratios.empty).toBeCloseTo(1);
    expect(ratios.pellet).toBeCloseTo(1);
  });
});

describe("PlaySim Mole", () => {
  it("speeds up entering a pellet cell and slows entering an empty cell", () => {
    const ratios = cellSpeedRatios("passiveMole");
    expect(ratios.pellet).toBeCloseTo(1.2);
    expect(ratios.empty).toBeCloseTo(0.9);
  });

  it("Mole+ gives +30% on pellets and keeps the 10% empty-cell slowdown", () => {
    const ratios = cellSpeedRatios("passiveMolePlus");
    expect(ratios.pellet).toBeCloseTo(1.3);
    expect(ratios.empty).toBeCloseTo(0.9);
  });
});

describe("PlaySim remote transference", () => {
  function startOwned(): PlaySim {
    return startSim({ level: 2, enableUpgrades: ["passiveRemoteTransference"] });
  }

  it("removes nothing extra for pellets 1-4 and the farthest regular pellet on the 5th", () => {
    const sim = startOwned();
    const startCount = regularPelletEids(sim).length;
    const nearby = regularPelletEids(sim).slice(0, 5);
    for (const eid of nearby.slice(0, 4)) {
      eatPelletAt(sim, eid);
    }
    expect(regularPelletEids(sim)).toHaveLength(startCount - 4);

    teleportPlayer(sim, Position.x[nearby[4]!]!, Position.y[nearby[4]!]!);
    const px = Position.x[playerEid(sim)]!;
    const py = Position.y[playerEid(sim)]!;
    const farthest = regularPelletEids(sim)
      .filter((eid) => eid !== nearby[4])
      .sort(
        (a, b) =>
          (Position.x[b]! - px) ** 2 +
            (Position.y[b]! - py) ** 2 -
            ((Position.x[a]! - px) ** 2 + (Position.y[a]! - py) ** 2) || a - b,
      )[0]!;
    runFrames(sim, 1);
    expect(regularPelletEids(sim)).toHaveLength(startCount - 6);
    expect(regularPelletEids(sim)).not.toContain(farthest);
    expect(query(sim.world, [Pellet, PowerPellet]).length).toBeGreaterThan(0);
  });

  it("does nothing without the upgrade", () => {
    const sim = startSim({ level: 2 });
    const startCount = regularPelletEids(sim).length;
    for (const eid of regularPelletEids(sim).slice(0, 5)) {
      eatPelletAt(sim, eid);
    }
    expect(regularPelletEids(sim)).toHaveLength(startCount - 5);
  });
});

describe("PlaySim", () => {
  it.each([1, 2, 5])("slows ghosts to 0.6x Maze-Man's speed in the tunnel on level %i", (level) => {
    const sim = startSim({ level, maze: "maze1" });
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    Position.x[ghost] = cellCenterX(0);
    Position.y[ghost] = cellCenterY(horizontalTunnelRows()[0]!);
    runFrames(sim, 1);
    expect(Speed.px[ghost]! / Speed.px[playerEid(sim)]!).toBeCloseTo(0.6);
  });

  it.each([
    [5, 1],
    [6, 1 + 0.2 / 3],
    [7, 1 + 0.4 / 3],
    [8, 1.2],
  ] as const)(
    "moves open-maze ghosts on level %i at %f× Maze-Man (past-parity ramp)",
    (level, ratio) => {
      const sim = startSim({ level, maze: "maze1" });
      const ghost = query(sim.world, [Ghost, Position])[0]!;
      GhostPhase.value[ghost] = GHOST_PHASE.active;
      Position.x[ghost] = cellCenterX(13);
      Position.y[ghost] = cellCenterY(11);
      runFrames(sim, 1);
      expect(Speed.px[ghost]! / Speed.px[playerEid(sim)]!).toBeCloseTo(ratio);
    },
  );

  it("spawns no pellets in a generated board's tunnels, up to the first turn-off", () => {
    for (let i = 0; i < 20; i += 1) {
      const sim = startSim({ level: 2 }, `tunnel-${i}`);
      const solids = getActiveLayout().playerSolids;
      const open = (col: number, row: number): boolean => isWalkable(col, row, solids);
      const tunnel = new Set<string>();
      for (const row of horizontalTunnelRows()) {
        for (const [start, step] of [
          [0, 1],
          [solids[row]!.length - 1, -1],
        ] as const) {
          for (
            let col = start;
            open(col, row) && !open(col, row - 1) && !open(col, row + 1);
            col += step
          ) {
            tunnel.add(`${col},${row}`);
          }
        }
      }
      for (const eid of query(sim.world, [Pellet, Position])) {
        const cell = `${worldToCol(Position.x[eid]!)},${worldToRow(Position.y[eid]!)}`;
        expect(tunnel.has(cell), `seed tunnel-${i} pellet in tunnel at ${cell}`).toBe(false);
      }
    }
  });

  it("plays levels 2-8 on one pool map per run", () => {
    const solidsAt = (level: number, seed = "one-map"): string[] => {
      startSim({ level }, seed);
      return getActiveLayout().playerSolids.map((row) => row.join(","));
    };
    const base = solidsAt(2);
    expect(startSim({ level: 2 }, "one-map").snapshot().layout).toMatch(/^pool-\d+$/);
    expect(solidsAt(3)).toEqual(base);
    const noneBlocked = (rows: string[]): boolean =>
      rows.every((row, r) =>
        row.split(",").every((solid, c) => solid === "true" || base[r]!.split(",")[c] === "false"),
      );
    for (const level of [4, 5, 6, 7, 8]) {
      expect(noneBlocked(solidsAt(level)), `level ${level} only adds walls`).toBe(true);
    }
    expect(solidsAt(6)).toEqual(solidsAt(5));
    expect(solidsAt(7)).toEqual(solidsAt(8));
    expect(solidsAt(2, "another-map")).not.toEqual(base);
    const forced = startSim({ level: 2, maze: 0 }, "force-pool");
    expect(forced.snapshot().layout).toBe("pool-0");
    expect(getActiveLayout().ascii).toContain("#");
  });

  it("skips speed lanes when level modifiers are off", () => {
    expect(startSim({ level: 6, levelModifiers: false }, "one-map").snapshot().speedZones).toEqual(
      [],
    );
    expect(settledZones(startSim({ level: 6 }, "one-map"))).toHaveLength(2);
  });

  it("collects pellets while the player moves", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    const events = runFrames(sim, 60, { keys: held("left") });
    expect(sim.snapshot().boardCollected).toBeGreaterThan(0);
    expect(count(events, "pelletSfx")).toBeGreaterThan(0);
  });

  it("releases the drawable of a power pellet Dot-Man eats", () => {
    const sim = startSim({ level: 2, maze: "maze1" }, "release-power");
    for (const eid of query(sim.world, [Pellet])) {
      if (!hasComponent(sim.world, eid, PowerPellet)) {
        removeEntity(sim.world, eid);
      }
    }
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    const events = runFrames(sim, 2);
    expect(events.some((event) => event.type === "releaseDrawable" && event.eid === power)).toBe(
      true,
    );
  });

  it("drags Maze-Man's speed briefly after eating a dot, then eases back to full", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    runFrames(sim, 1);
    const baseSpeed = Speed.px[playerEid(sim)]!;
    expect(sim.snapshot().timers.eatDragMs).toBe(0);

    const left = { keys: held("left") };
    runUntil(sim, () => sim.snapshot().timers.eatDragMs > 0, 240, left);
    runFrames(sim, 1, left);
    expect(Speed.px[playerEid(sim)]!).toBeLessThan(baseSpeed * 0.85);

    runUntil(sim, () => sim.snapshot().timers.eatDragMs === 0, 240);
    runFrames(sim, 1);
    expect(Speed.px[playerEid(sim)]!).toBeCloseTo(baseSpeed);
  });

  it("grants a level-1 starting upgrade unless disableLevelUpgrades is set", () => {
    const opts = { ...defaultPlayOptions(), maze: "mazeSmall" as const };
    const withCard = new PlaySim(opts, "test");
    expect(count(withCard.start(), "startingUpgrade")).toBe(1);
    expect(withCard.snapshot().upgrades).toHaveLength(1);

    const without = new PlaySim({ ...opts, disableLevelUpgrades: true }, "test");
    expect(count(without.start(), "startingUpgrade")).toBe(0);
    expect(without.snapshot().upgrades).toHaveLength(0);
  });

  it("forceStartingUpgrade grants that id on level 1 when eligible", () => {
    const opts = {
      ...defaultPlayOptions(),
      maze: "mazeSmall" as const,
      forceStartingUpgrade: "powerPelletFreeze" as const,
    };
    const sim = new PlaySim(opts, "test");
    const events = sim.start();
    expect(count(events, "startingUpgrade")).toBe(1);
    expect(sim.snapshot().upgrades).toEqual(["powerPelletFreeze"]);
    const card = events.find((e) => e.type === "startingUpgrade");
    expect(card).toMatchObject({ type: "startingUpgrade", id: "powerPelletFreeze" });
  });

  it("forceStartingUpgrade falls back when that id is already owned", () => {
    const opts = {
      ...defaultPlayOptions(),
      maze: "mazeSmall" as const,
      enableUpgrades: ["powerPelletFreeze" as const],
      forceStartingUpgrade: "powerPelletFreeze" as const,
    };
    const sim = new PlaySim(opts, "test");
    sim.start();
    expect(sim.snapshot().upgrades).toHaveLength(2);
    expect(sim.snapshot().upgrades[0]).toBe("powerPelletFreeze");
    expect(sim.snapshot().upgrades[1]).not.toBe("powerPelletFreeze");
    expect(STARTING_UPGRADE_POOL).toContain(sim.snapshot().upgrades[1]);
  });

  it("draws the level-1 starting upgrade only from the starting pool", () => {
    const opts = { ...defaultPlayOptions(), maze: "mazeSmall" as const };
    const allButOne = STARTING_UPGRADE_POOL.slice(1);
    const sim = new PlaySim({ ...opts, enableUpgrades: [...allButOne] }, "test");
    sim.start();
    expect(sim.snapshot().upgrades).toEqual([...allButOne, STARTING_UPGRADE_POOL[0]]);

    const full = new PlaySim({ ...opts, enableUpgrades: [...STARTING_UPGRADE_POOL] }, "test");
    expect(count(full.start(), "startingUpgrade")).toBe(0);
  });

  it("can start a run with Shield or Defy Death", () => {
    const opts = { ...defaultPlayOptions(), maze: "mazeSmall" as const };
    const others = STARTING_UPGRADE_POOL.filter(
      (id) => id !== "passiveShieldPellets" && id !== "passiveDefyDeath",
    );
    const sim = new PlaySim({ ...opts, enableUpgrades: [...others] }, "test");
    sim.start();
    const granted = sim.snapshot().upgrades.filter((id) => !others.includes(id as never));
    expect(granted).toHaveLength(1);
    expect(["passiveShieldPellets", "passiveDefyDeath"]).toContain(granted[0]);
  });

  it("forceUpgrade puts that upgrade in the level-clear offer", () => {
    for (const seed of ["f1", "f2", "f3"]) {
      const sim = startSim(
        { jumpToUpgrade: true, forceUpgrade: "passiveRemoteTransference" },
        seed,
      );
      expect(drainToOffer(sim)!.upgrades).toContain("passiveRemoteTransference");
    }
  });

  it("offers exactly two upgrades and no Quarters option at level clear", () => {
    const offer = drainToOffer(startSim({ jumpToUpgrade: true, level: 4 }));
    expect(offer.upgrades).toHaveLength(2);
    expect(offer).not.toHaveProperty("quarters");
  });

  it("skips the offer when no upgrade is eligible", () => {
    const sim = startSim({
      jumpToUpgrade: true,
      level: 4,
      enableUpgrades: [...ALL_UPGRADE_IDS, ...MAXED_TRINKETS],
    });
    runFrames(sim, 90);
    expect(sim.offer()).toBeNull();
    runUntil(sim, () => sim.snapshot().levelTransition, 900, { acknowledge: true });
    expect(sim.snapshot().levelTransition).toBe(true);
  });

  it("level-clear offer stays valid when owned upgrades give school affinity", () => {
    const owned = ["passiveExtraLife", "passiveDeathsHarvest", "passiveDefyDeath"] as const;
    const sim = startSim({
      jumpToUpgrade: true,
      level: 4,
      enableUpgrades: [...owned],
    });
    const offer = drainToOffer(sim);
    expect(offer.upgrades).toHaveLength(2);
    expect(new Set(offer.upgrades).size).toBe(2);
    for (const id of offer.upgrades) {
      expect(owned).not.toContain(id);
    }
  });

  it("offers rares at level clear only once two upgrades are owned", () => {
    const offer = (owned: UpgradeId[]) =>
      drainToOffer(
        startSim({
          jumpToUpgrade: true,
          level: 4,
          enableUpgrades: owned,
          forceUpgrade: "fruitPowerPellet",
        }),
      ).upgrades;
    expect(offer(["passiveGhostSlow"]).filter(isRare)).toEqual([]);
    expect(offer(["passiveGhostSlow", "passiveAfterburner"])).toContain("fruitPowerPellet");
  });

  it("offers Streak Engine at level clear without the rare ownership gate", () => {
    const offer = drainToOffer(
      startSim({
        jumpToUpgrade: true,
        level: 4,
        enableUpgrades: ["passiveGhostSlow"],
        forceUpgrade: "passiveStreakEngine",
      }),
    ).upgrades;
    expect(offer).toContain("passiveStreakEngine");
    expect(isRare("passiveStreakEngine")).toBe(false);
  });

  it("keeps rares out of the level-1 clear offer even when two upgrades are owned", () => {
    const offer = drainToOffer(
      startSim({
        jumpToUpgrade: true,
        level: 1,
        enableUpgrades: ["passiveGhostSlow", "passiveAfterburner"],
        forceUpgrade: "fruitPowerPellet",
      }),
    );
    expect(offer.upgrades).not.toContain("fruitPowerPellet");
    expect(offer.upgrades.every((id) => !isRare(id))).toBe(true);
  });

  it("never offers Programmer when Hyperspeed is owned, or the reverse", () => {
    const pad = ["passiveAfterburner", "passiveGhostSlow"] as const;
    const withHyperspeed = drainToOffer(
      startSim({
        jumpToUpgrade: true,
        level: 4,
        enableUpgrades: [...pad, "powerPelletHyperspeed"],
        forceUpgrade: "powerPelletProgrammer",
      }),
    ).upgrades;
    expect(withHyperspeed).not.toContain("powerPelletProgrammer");
    const withProgrammer = drainToOffer(
      startSim({
        jumpToUpgrade: true,
        level: 4,
        enableUpgrades: [...pad, "powerPelletProgrammer"],
        forceUpgrade: "powerPelletHyperspeed",
      }),
    ).upgrades;
    expect(withProgrammer).not.toContain("powerPelletHyperspeed");
  });

  it("never offers Mole when Afterburner is owned, or the reverse", () => {
    const pad = ["passiveGhostSlow", "fruitFeast"] as const;
    const withAfterburner = drainToOffer(
      startSim({
        jumpToUpgrade: true,
        level: 4,
        enableUpgrades: [...pad, "passiveAfterburner"],
        forceUpgrade: "passiveMole",
      }),
    ).upgrades;
    expect(withAfterburner).not.toContain("passiveMole");
    const withMole = drainToOffer(
      startSim({
        jumpToUpgrade: true,
        level: 4,
        enableUpgrades: [...pad, "passiveMole"],
        forceUpgrade: "passiveAfterburner",
      }),
    ).upgrades;
    expect(withMole).not.toContain("passiveAfterburner");
  });

  it("clears a board into an upgrade offer, then the next level", () => {
    const sim = startSim({ jumpToUpgrade: true });
    const offer = drainToOffer(sim);
    runFrames(sim, 30);
    expect(sim.snapshot().level).toBe(2);
    const chosen = offer!.upgrades[0]!;
    sim.chooseUpgrade({ kind: "upgrade", id: chosen });
    runFrames(sim, 1);
    expect(sim.snapshot().levelTransition).toBe(true);
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 500);
    expect(sim.snapshot().level).toBe(3);
    expect(sim.snapshot().upgrades).toContain(chosen);
  });

  it("plays the forced intermission between level 2 and level 3", () => {
    const sim = startSim({ jumpToUpgrade: true, intermission: "blinkyChase" });
    takeFirstOffered(sim);
    const events = runUntil(sim, () => sim.snapshot().intermission !== null, 120);
    expect(sim.snapshot().level).toBe(2);
    expect(sim.snapshot().levelTransition).toBe(false);
    const first = sim.snapshot().intermission!;
    expect(first.id).toBe("blinkyChase");
    runFrames(sim, 60);
    const later = sim.snapshot().intermission!;
    const x = (frame: typeof first, key: string) => frame.actors.find((a) => a.key === key)!.x;
    expect(x(later, "blinky")).toBeGreaterThan(x(first, "blinky"));
    expect(x(later, "dotMan")).toBeGreaterThan(x(later, "blinky"));
    expect(sim.snapshot().level).toBe(2);
    const rest = runUntil(sim, () => sim.snapshot().level === 3, 300);
    expect(sim.snapshot().intermission).toBeNull();
    const all = [...events, ...rest];
    expect(all).toContainEqual({ type: "musicAfterFanfare", id: "interstitialMusic" });
    expect(all).toContainEqual({ type: "loopStop", id: "interstitialMusic" });
    expect(all.some((event) => event.type === "intermission" && event.frame === null)).toBe(true);
  });

  it("picks the level-2 intermission at random per seed from every registered one", () => {
    const picked = new Set<string>();
    for (let i = 0; i < 80 && picked.size < INTERMISSION_IDS.length; i++) {
      const sim = startSim({ jumpToUpgrade: true }, `pick${i}`);
      takeFirstOffered(sim);
      runUntil(sim, () => sim.snapshot().intermission !== null, 120);
      picked.add(sim.snapshot().intermission!.id);
    }
    expect(picked).toEqual(new Set(INTERMISSION_IDS));
  });

  it("plays a different intermission after level 4 than after level 2", () => {
    for (let i = 0; i < 12; i++) {
      const sim = startSim({ jumpToUpgrade: true }, `twice${i}`);
      takeFirstOffered(sim);
      runUntil(sim, () => sim.snapshot().intermission !== null, 120);
      const afterTwo = sim.snapshot().intermission!.id;
      runUntil(sim, () => sim.snapshot().level === 3, 600);
      sim["jumpToLevelClear"]();
      takeFirstOffered(sim);
      runUntil(sim, () => sim.snapshot().storeEntering, 600);
      sim["exitStore"]();
      runUntil(sim, () => sim.snapshot().level === 4, 600);
      expect(sim.snapshot().intermission).toBeNull();
      sim["jumpToLevelClear"]();
      takeFirstOffered(sim);
      runUntil(sim, () => sim.snapshot().intermission !== null, 120);
      expect(sim.snapshot().level).toBe(4);
      expect(sim.snapshot().intermission!.id).not.toBe(afterTwo);
      runUntil(sim, () => sim.snapshot().level === 5, 600);
      expect(sim.snapshot().intermission).toBeNull();
    }
  });

  it.each(INTERMISSION_IDS)("?intermission=%s plays that cutscene through to level 3", (id) => {
    const sim = new PlaySim({ ...defaultPlayOptions(), intermission: id, level: 2 }, "each");
    sim.start();
    expect(sim.snapshot().intermission).toMatchObject({ id, done: false });
    runUntil(sim, () => sim.snapshot().level === 3, 600);
    expect(sim.snapshot().level).toBe(3);
    expect(sim.snapshot().intermission).toBeNull();
  });

  it("casts the scatter-burst pack from the ghosts on the cleared board", () => {
    const ghosts = [GHOST_KIND.wardy, GHOST_KIND.spunky, GHOST_KIND.inky];
    const sim = new PlaySim(
      { ...defaultPlayOptions(), intermission: "scatterBurst", level: 2, ghosts },
      "cast",
    );
    sim.start();
    const onScreen = sim
      .snapshot()
      .intermission!.actors.filter((actor) => actor.kind === "ghost")
      .map((actor) => (actor.kind === "ghost" ? actor.drawableId : null));
    expect(onScreen).toEqual(ghosts.map((kind) => GHOST_DRAWABLE_BY_KIND[kind]));
    const rostered = startSim({ jumpToUpgrade: true, intermission: "scatterBurst" }, "roster");
    takeFirstOffered(rostered);
    runUntil(rostered, () => rostered.snapshot().intermission !== null, 120);
    expect(
      rostered.snapshot().intermission!.actors.filter((actor) => actor.kind === "ghost"),
    ).toHaveLength(rostered.snapshot().ghosts.length);
  });

  it("opens ?intermission=bananaGrab straight into the banana grab, then plays level 3", () => {
    const sim = new PlaySim({ ...defaultPlayOptions(), intermission: "bananaGrab", level: 2 }, "t");
    const startEvents = sim.start();
    expect(sim.snapshot().level).toBe(2);
    expect(sim.snapshot().intermission).toMatchObject({ id: "bananaGrab", beat: "chase" });
    expect(startEvents).not.toContainEqual({ type: "loopStart", id: "gameplayMusic" });
    expect(startEvents).toContainEqual({ type: "musicAfterFanfare", id: "interstitialMusic" });
    const beats: string[] = [];
    const rest = runUntil(
      sim,
      () => {
        const beat = sim.snapshot().intermission?.beat;
        if (beat !== undefined && beats.at(-1) !== beat) {
          beats.push(beat);
        }
        return sim.snapshot().level === 3;
      },
      400,
    );
    expect(beats).toEqual(["chase", "peel", "bounce", "exit"]);
    expect(sim.snapshot().intermission).toBeNull();
    expect(rest).toContainEqual({ type: "loopStop", id: "interstitialMusic" });
    expect(rest).toContainEqual({ type: "musicAfterFanfare", id: "gameplayMusic" });
  });

  it("offers an upgrade after clearing level 1, then skips the intermission", () => {
    const sim = startSim({ level: 1, maze: "mazeSmall" });
    const startOwned = sim.snapshot().upgrades.length;
    sim["jumpToLevelClear"]();
    const offer = drainToOffer(sim);
    expect(offer.upgrades).toHaveLength(2);
    sim.chooseUpgrade({ kind: "upgrade", id: offer.upgrades[0]! });
    runUntil(sim, () => sim.snapshot().level === 2, 400);
    expect(sim.snapshot().intermission).toBeNull();
    expect(sim.snapshot().upgrades.length).toBe(startOwned + 1);
  });

  it("offers enhanced upgrades only from level 4, and grants the enhanced form when picked", () => {
    const early = drainToOffer(startSim({ jumpToUpgrade: true, level: 3 }));
    expect(early.enhanced).toEqual([]);

    let found: { sim: PlaySim; offer: UpgradeChoiceOffer } | null = null;
    for (let n = 0; n < 200 && found === null; n += 1) {
      const sim = startSim({ jumpToUpgrade: true, level: 4 }, `enh${n}`);
      const offer = drainToOffer(sim);
      if (offer.enhanced.length > 0) {
        found = { sim, offer };
      }
    }
    expect(found).not.toBeNull();
    const { sim, offer } = found!;
    const pick = offer.enhanced[0]!;
    sim.chooseUpgrade({ kind: "upgrade", id: pick, enhanced: true });
    expect(sim.snapshot().upgrades).toContain(`${pick}Plus`);
    expect(sim.snapshot().upgrades).not.toContain(pick);
  });

  it("an enhanced offer pick pays the enhanced life bonus once", () => {
    const livesAfter = (enhanced: boolean) => {
      const sim = startSim({ jumpToUpgrade: true, level: 4, lives: 2, maxLives: 6 });
      drainToOffer(sim);
      sim.chooseUpgrade({ kind: "upgrade", id: "passiveExtraLife", enhanced });
      return sim.snapshot().lives;
    };
    expect(livesAfter(true)).toBe(livesAfter(false) + 1);
  });

  it("a plain Extra Life offer still pays when Death Specialist enhances it", () => {
    const livesAfter = (enableSpecialist: boolean) => {
      const sim = startSim({
        jumpToUpgrade: true,
        level: 4,
        lives: 2,
        maxLives: 6,
        enableUpgrades: [
          "passiveDefyDeath",
          "passiveMoneyTalks",
          ...(enableSpecialist ? (["passiveDeathSpecialist"] as const) : []),
        ],
      });
      drainToOffer(sim);
      sim.chooseUpgrade({ kind: "upgrade", id: "passiveExtraLife" });
      return sim.snapshot().lives;
    };
    expect(livesAfter(true)).toBe(livesAfter(false) + 1);
  });

  it("clears a board once every non-power pellet is eaten, leaving power pellets", () => {
    const sim = startSim({ level: 2, infiniteLives: true });
    const eids = regularPelletEids(sim);
    for (const eid of eids.slice(0, -1)) {
      eatPelletAt(sim, eid);
    }
    expect(sim.offer()).toBeNull();
    eatPelletAt(sim, eids.at(-1)!);
    expect(query(sim.world, [Pellet, PowerPellet]).length).toBeGreaterThan(0);
    runUntil(sim, () => sim.offer() !== null, 900, { acknowledge: true });
    expect(sim.offer()).not.toBeNull();
  });

  it.each([
    ["before", 3],
    ["after", -3],
  ])("cuts a corner %s the junction center without snapping", (_, offset) => {
    const sim = startSim({ level: 2, maze: "maze1" });
    const cx = cellCenterX(6);
    const cy = cellCenterY(5);
    const eid = playerEid(sim);
    teleportPlayer(sim, cellCenterX(7), cy);
    runUntil(sim, () => Position.x[eid]! <= cx + 8, 60, { keys: held("left") });
    teleportPlayer(sim, cx + offset, cy);
    const before = { x: Position.x[eid]!, y: Position.y[eid]! };

    runFrames(sim, 1, { keys: held("up") });

    expect(sim.snapshot().player!.facing).toBe("up");
    const travel = (PLAYER_SPEED * speedLevelMultiplier(2) * FRAME_MS) / 1000;
    expect(Position.y[eid]!).toBeLessThan(before.y - travel / 2);
    expect(Math.abs(Position.x[eid]! - cx)).toBeLessThan(Math.abs(before.x - cx));
    expect(Math.abs(Position.x[eid]! - cx)).toBeGreaterThan(0);
  });

  it("does not catch on a perpendicular turn even when a fast ghost overlaps", () => {
    const sim = startSim({ level: 2, maze: "maze1", infiniteLives: false, godMode: false });
    const cx = cellCenterX(6);
    const cy = cellCenterY(5);
    const eid = playerEid(sim);
    teleportPlayer(sim, cellCenterX(7), cy);
    runUntil(sim, () => Position.x[eid]! <= cx + 8, 60, { keys: held("left") });
    teleportPlayer(sim, cx + 3, cy);
    Facing.direction[eid] = DIRECTION.left;
    Input.direction[eid] = DIRECTION.left;
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    Position.x[ghost] = cx + TILE_SIZE;
    Position.y[ghost] = cy;
    Speed.px[ghost] = PLAYER_SPEED * 3;

    ghostOntoPlayer(sim);
    runFrames(sim, 1, { keys: held("up") });

    expect(sim.snapshot().player!.facing).toBe("up");
    expect(sim.snapshot().timers.turnCatchGraceMs).toBeGreaterThan(0);
    expect(sim.snapshot().dying).toBe(false);
  });

  it("still catches after turn catch grace expires", () => {
    const sim = startSim({ level: 2, maze: "maze1", infiniteLives: false, godMode: false });
    const cx = cellCenterX(6);
    const cy = cellCenterY(5);
    const eid = playerEid(sim);
    teleportPlayer(sim, cellCenterX(7), cy);
    runUntil(sim, () => Position.x[eid]! <= cx + 8, 60, { keys: held("left") });
    teleportPlayer(sim, cx, cy);
    Facing.direction[eid] = DIRECTION.left;
    runFrames(sim, 1, { keys: held("up") });
    expect(sim.snapshot().timers.turnCatchGraceMs).toBeGreaterThan(0);
    runFrames(sim, 6, { keys: held("up") });
    expect(sim.snapshot().timers.turnCatchGraceMs).toBe(0);

    ghostOntoPlayer(sim);
    runFrames(sim, 1, { keys: held("up") });
    expect(sim.snapshot().dying).toBe(true);
  });

  it("cannot phase through a ghost by turning into it", () => {
    const sim = startSim({ level: 2, maze: "maze1", infiniteLives: false, godMode: false });
    const cx = cellCenterX(6);
    const cy = cellCenterY(5);
    const eid = playerEid(sim);
    teleportPlayer(sim, cellCenterX(7), cy);
    runUntil(sim, () => Position.x[eid]! <= cx + 8, 60, { keys: held("left") });
    teleportPlayer(sim, cx + 3, cy);
    Facing.direction[eid] = DIRECTION.left;
    Input.direction[eid] = DIRECTION.left;
    ghostOntoPlayer(sim);
    runFrames(sim, 1, { keys: held("up") });
    expect(sim.snapshot().player!.facing).toBe("up");
    expect(sim.snapshot().dying).toBe(false);
    while (sim.snapshot().timers.turnCatchGraceMs > 0) {
      ghostOntoPlayer(sim);
      runFrames(sim, 1, { keys: held("up") });
    }
    ghostOntoPlayer(sim);
    runFrames(sim, 1, { keys: held("up") });
    expect(sim.snapshot().dying).toBe(true);
  });

  it("still catches on a reverse with no turn catch grace", () => {
    const sim = startSim({ level: 2, maze: "maze1", infiniteLives: false, godMode: false });
    const eid = playerEid(sim);
    teleportPlayer(sim, cellCenterX(12), cellCenterY(1));
    Facing.direction[eid] = DIRECTION.left;
    Input.direction[eid] = DIRECTION.left;
    runFrames(sim, 1, { keys: held("left") });
    ghostOntoPlayer(sim);
    runFrames(sim, 1, { keys: held("right") });
    expect(sim.snapshot().timers.turnCatchGraceMs).toBe(0);
    expect(sim.snapshot().dying).toBe(true);
  });

  it("moves Maze-Man at the level-2 speed along an empty corridor", () => {
    const sim = startSim({ level: 2, maze: "maze1", godMode: true });
    const eid = playerEid(sim);
    const row = 1;
    const col = 12;
    for (let c = col - 6; c <= col; c++) {
      expect(isWalkable(c, row)).toBe(true);
    }
    for (const pellet of query(sim.world, [Pellet, Position])) {
      if (worldToRow(Position.y[pellet]!) === row) {
        removeEntity(sim.world, pellet);
      }
    }
    teleportPlayer(sim, cellCenterX(col), cellCenterY(row));
    runFrames(sim, 1, { keys: held("left") });
    const startX = Position.x[eid]!;

    runFrames(sim, 30, { keys: held("left") });

    const arcadeTilesPerSec = 7.315;
    const expectedPx =
      arcadeTilesPerSec * TILE_SIZE * speedLevelMultiplier(2) * ((30 * FRAME_MS) / 1000);
    expect(startX - Position.x[eid]!).toBeCloseTo(expectedPx, 1);
  });

  it("spends a life when caught and respawns at the spawn point", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    const spawn = { ...sim.snapshot().player! };
    runFrames(sim, 20, { keys: held("left") });
    const livesBefore = sim.snapshot().lives;
    ghostOntoPlayer(sim);
    const events = runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    expect(sim.snapshot().lives).toBe(livesBefore - 1);
    expect(events).toContainEqual({ type: "sfx", id: "death" });
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().player).toMatchObject({ col: spawn.col, row: spawn.row });
  });

  it("ignores ghost contact in god mode", () => {
    const sim = startSim({ level: 2, maze: "maze1", godMode: true });
    runFrames(sim, 20, { keys: held("left") });
    const livesBefore = sim.snapshot().lives;
    for (let frame = 0; frame < 30; frame++) {
      ghostOntoPlayer(sim);
      const events = runFrames(sim, 1, { keys: held("left") });
      expect(events).not.toContainEqual({ type: "sfx", id: "death" });
      expect(sim.snapshot().dying).toBe(false);
    }
    expect(sim.snapshot().lives).toBe(livesBefore);
  });

  describe("School Specialists", () => {
    const THREE_DEATH = ["passiveDefyDeath", "passiveMoneyTalks", "passiveMyogenesis"] as const;

    function defyWindowAfterPowerPellet(sim: PlaySim): number {
      const power = query(sim.world, [PowerPellet, Position])[0]!;
      teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      runFrames(sim, 1);
      return sim.snapshot().timers.defyDeathMs;
    }

    it("Death Specialist with three Death upgrades arms the enhanced Defy Death window", () => {
      const sim = startSim({
        level: 2,
        maze: "maze1",
        enableUpgrades: [...THREE_DEATH, "passiveDeathSpecialist"],
      });
      expect(defyWindowAfterPowerPellet(sim)).toBeGreaterThan(DEFY_DEATH_MS);
      expect(sim.hud().upgrades).toEqual([
        "passiveDefyDeathPlus",
        "passiveMoneyTalksPlus",
        "passiveMyogenesisPlus",
        "passiveDeathSpecialist",
      ]);
      expect(sim.snapshot().upgrades).toEqual([...THREE_DEATH, "passiveDeathSpecialist"]);
    });

    it("without the specialist, or below three, Defy Death keeps its base window", () => {
      const without = startSim({ level: 2, maze: "maze1", enableUpgrades: [...THREE_DEATH] });
      expect(defyWindowAfterPowerPellet(without)).toBeLessThanOrEqual(DEFY_DEATH_MS);
      const below = startSim({
        level: 2,
        maze: "maze1",
        enableUpgrades: ["passiveDefyDeath", "passiveMoneyTalks", "passiveDeathSpecialist"],
      });
      expect(defyWindowAfterPowerPellet(below)).toBeLessThanOrEqual(DEFY_DEATH_MS);
      expect(below.hud().upgrades).toContain("passiveDefyDeath");
    });

    it("HUD icons use upgrade art when it exists and the school icon otherwise", () => {
      const sim = startSim({
        level: 2,
        maze: "maze1",
        enableUpgrades: ["powerPelletSpeedBurst", "passiveGhostSlow"],
      });
      expect(sim.hud().upgrades.map(upgradeIconTexture)).toEqual([
        upgradeArtTextureKey("powerPelletSpeedBurst"),
        schoolArtTextureKey("disruption"),
      ]);
    });

    it("Death Specialist Plus enhances a lone Death upgrade", () => {
      const sim = startSim({
        level: 2,
        maze: "maze1",
        enableUpgrades: ["passiveDefyDeath", "passiveDeathSpecialistPlus"],
      });
      expect(defyWindowAfterPowerPellet(sim)).toBeGreaterThan(DEFY_DEATH_MS);
    });

    it("grants Extra Life's enhanced life once and hides it from the enhance tile", () => {
      const owned = ["passiveExtraLife", "passiveDefyDeath", "passiveMoneyTalks"] as const;
      const base = startSim({
        store: 1,
        level: 5,
        quarters: 10,
        lives: 2,
        enableUpgrades: [...owned],
      });
      const sim = startSim({
        store: 1,
        level: 5,
        quarters: 10,
        lives: 2,
        enableUpgrades: [...owned, "passiveDeathSpecialist"],
      });
      expect(sim.snapshot().lives).toBe(base.snapshot().lives + 1);
      expect(
        sim
          .snapshot()
          .storeStock!.filter(
            (s) => s.startsWith("enhance:passive") && s !== "enhance:passiveDeathSpecialist",
          ),
      ).toEqual([]);
    });
  });

  describe("Defy Death", () => {
    function startDefySim(): PlaySim {
      return startSim({ level: 2, maze: "maze1", enableUpgrades: ["passiveDefyDeath"] });
    }

    function chompPowerPellet(sim: PlaySim): void {
      const power = query(sim.world, [PowerPellet, Position])[0]!;
      teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      runFrames(sim, 1);
    }

    function getCaught(sim: PlaySim): void {
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(true);
    }

    it("keeps the life and respawns at spawn when caught after a power pellet", () => {
      const sim = startDefySim();
      const spawn = { ...sim.snapshot().player! };
      chompPowerPellet(sim);
      const livesBefore = sim.snapshot().lives;
      getCaught(sim);
      expect(sim.snapshot().lives).toBe(livesBefore);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot().player).toMatchObject({ col: spawn.col, row: spawn.row });
      expect(sim.snapshot().lives).toBe(livesBefore);
    });

    it("keeps board fruit through a Defy Death save, and clears it on a real life loss", () => {
      const sim = startDefySim();
      sim["spawnFruitEntity"](false);
      sim["fruitPresence"] = {
        ...sim["fruitPresence"],
        active: true,
        remainingMs: FRUIT_LIFETIME_MS,
      };
      expect(sim.snapshot().fruit).toBe(true);
      const kindBefore = sim.snapshot().fruitKinds[0];

      chompPowerPellet(sim);
      getCaught(sim);
      const fruitMsWhileDying = sim.snapshot().timers.fruitMs;
      expect(fruitMsWhileDying).toBeGreaterThan(0);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot().fruit).toBe(true);
      expect(sim.snapshot().fruitKinds[0]).toBe(kindBefore);
      expect(sim.snapshot().timers.fruitMs).toBe(fruitMsWhileDying);

      getCaught(sim);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot().fruit).toBe(false);
      expect(sim.snapshot().timers.fruitMs).toBe(0);
    });

    it("feeds the invulnerability tint while the window is armed and clears it after", () => {
      const sim = startDefySim();
      const tints = (events: SimEvent[]) =>
        events.flatMap((e) => (e.type === "draw" ? [e.options.playerInvulnRemainingMs] : []));
      expect(tints(runFrames(sim, 1)).every((ms) => ms === 0)).toBe(true);
      chompPowerPellet(sim);
      expect(tints(runFrames(sim, 1)).every((ms) => ms > 0)).toBe(true);
      runFrames(sim, Math.ceil(5100 / (1000 / 60)));
      expect(tints(runFrames(sim, 1)).every((ms) => ms === 0)).toBe(true);
    });

    it("plays the revive sound instead of the death sound on a save", () => {
      const sim = startDefySim();
      chompPowerPellet(sim);
      ghostOntoPlayer(sim);
      const events = runFrames(sim, 1);
      expect(events).toContainEqual({ type: "sfx", id: "revive" });
      expect(events).not.toContainEqual({ type: "sfx", id: "death" });
    });

    it("plays the death sound and no revive splash on a normal death", () => {
      const sim = startDefySim();
      ghostOntoPlayer(sim);
      const events = [...runFrames(sim, 1), ...runUntil(sim, () => !sim.snapshot().dying, 240)];
      expect(events).toContainEqual({ type: "sfx", id: "death" });
      expect(events).not.toContainEqual({ type: "sfx", id: "revive" });
      expect(reviveProgresses(events)).toEqual([]);
    });

    it("fades the player in from 0 to 1 through the READY pause after a save", () => {
      const sim = startDefySim();
      chompPowerPellet(sim);
      ghostOntoPlayer(sim);
      const events = [...runFrames(sim, 1), ...runUntil(sim, () => !sim.snapshot().dying, 240)];
      const progresses = reviveProgresses(events);
      expect(progresses[0]).toBe(0);
      expect(progresses.at(-1)).toBe(1);
      expect(progresses).toEqual([...progresses].sort((a, b) => a - b));
      expect(reviveProgresses(runFrames(sim, 5))).toEqual([]);
    });

    it("spends a life when caught without a recent power pellet", () => {
      const sim = startDefySim();
      const livesBefore = sim.snapshot().lives;
      getCaught(sim);
      expect(sim.snapshot().lives).toBe(livesBefore - 1);
    });

    it("spends a life when caught after the 5s window expires", () => {
      const sim = startDefySim();
      chompPowerPellet(sim);
      runFrames(sim, Math.ceil(5100 / (1000 / 60)));
      const livesBefore = sim.snapshot().lives;
      expect(sim.snapshot().dying).toBe(false);
      getCaught(sim);
      expect(sim.snapshot().lives).toBe(livesBefore - 1);
    });

    it("consumes the window on a save, and re-arms on the next power pellet", () => {
      const sim = startDefySim();
      chompPowerPellet(sim);
      getCaught(sim);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      const livesBefore = sim.snapshot().lives;
      getCaught(sim);
      expect(sim.snapshot().lives).toBe(livesBefore - 1);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      chompPowerPellet(sim);
      const livesAfter = sim.snapshot().lives;
      getCaught(sim);
      expect(sim.snapshot().lives).toBe(livesAfter);
    });

    it("does not end the run on the last life", () => {
      const sim = startDefySim();
      for (let i = 0; i < 10 && sim.snapshot().lives > 1; i += 1) {
        getCaught(sim);
        runUntil(sim, () => !sim.snapshot().dying, 240);
      }
      expect(sim.snapshot().lives).toBe(1);
      chompPowerPellet(sim);
      const events: SimEvent[] = [];
      ghostOntoPlayer(sim);
      events.push(...runFrames(sim, 1));
      events.push(...runUntil(sim, () => !sim.snapshot().dying, 240));
      expect(sim.snapshot().lives).toBe(1);
      expect(events.some((e) => e.type === "endText" || e.type === "saveRun")).toBe(false);
    });

    it("leaves ghosts where they are on a save, scattering only those on the respawn tile", () => {
      const sim = startDefySim();
      const spawn = { ...sim.snapshot().player! };
      const ghosts = query(sim.world, [Ghost, Position, GhostPhase]);
      expect(ghosts.length).toBeGreaterThanOrEqual(2);
      const catcher = ghosts[0]!;
      const onSpawn = ghosts[1]!;
      chompPowerPellet(sim);
      const fell = { ...sim.snapshot().player! };
      expect(fell.col !== spawn.col || fell.row !== spawn.row).toBe(true);
      for (const eid of ghosts) {
        GhostPhase.value[eid] = GHOST_PHASE.active;
      }
      Position.x[onSpawn] = cellCenterX(spawn.col);
      Position.y[onSpawn] = cellCenterY(spawn.row);
      const onSpawnKind = GhostKind.kind[onSpawn] as GhostKindId;
      const expectedScatter = ghostTeleportCell(scatterTargetForKind(onSpawnKind), {
        col: spawn.col,
        row: spawn.row,
      });
      ghostOntoPlayer(sim);
      expect(Position.x[catcher]).toBe(Position.x[playerEid(sim)]);
      const catcherAt = { x: Position.x[catcher]!, y: Position.y[catcher]! };
      runFrames(sim, 1);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot().player).toMatchObject({ col: spawn.col, row: spawn.row });
      expect(GhostPhase.value[catcher]).toBe(GHOST_PHASE.active);
      expect({ x: Position.x[catcher], y: Position.y[catcher] }).toEqual(catcherAt);
      expect(GhostPhase.value[onSpawn]).toBe(GHOST_PHASE.active);
      expect({ x: Position.x[onSpawn], y: Position.y[onSpawn] }).toEqual({
        x: cellCenterX(expectedScatter.col),
        y: cellCenterY(expectedScatter.row),
      });
    });

    it("still cages every ghost on a real life loss", () => {
      const sim = startDefySim();
      for (const eid of query(sim.world, [Ghost, GhostPhase])) {
        GhostPhase.value[eid] = GHOST_PHASE.active;
      }
      getCaught(sim);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot().ghosts.every((ghost) => ghost.phase === "inHouse")).toBe(true);
    });

    it("with Reanimation scatters the catcher off the fell tile", () => {
      const sim = startSim({
        level: 2,
        maze: "maze1",
        enableUpgrades: ["passiveDefyDeath", "passiveReanimation"],
      });
      chompPowerPellet(sim);
      const fell = { ...sim.snapshot().player! };
      const catcher = query(sim.world, [Ghost, Position])[0]!;
      GhostPhase.value[catcher] = GHOST_PHASE.active;
      ghostOntoPlayer(sim);
      expect(worldToCol(Position.x[catcher]!)).toBe(fell.col);
      expect(worldToRow(Position.y[catcher]!)).toBe(fell.row);
      runFrames(sim, 1);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot().player).toMatchObject({ col: fell.col, row: fell.row });
      expect(GhostPhase.value[catcher]).toBe(GHOST_PHASE.active);
      const kind = GhostKind.kind[catcher] as GhostKindId;
      const expected = ghostTeleportCell(scatterTargetForKind(kind), {
        col: fell.col,
        row: fell.row,
      });
      expect({
        col: worldToCol(Position.x[catcher]!),
        row: worldToRow(Position.y[catcher]!),
      }).toEqual(expected);
    });

    it("leaves boss ghosts in place on a save instead of wiping the roster", () => {
      const sim = startSim({
        level: 9,
        boss: "blinkySwarm",
        enableUpgrades: ["passiveDefyDeath"],
        infiniteLives: true,
      });
      const power = query(sim.world, [PowerPellet, Position])[0]!;
      teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      runFrames(sim, 1);
      const ghosts = query(sim.world, [Ghost, Position, GhostPhase]);
      expect(ghosts.length).toBeGreaterThanOrEqual(2);
      const catcher = ghosts[0]!;
      const bystander = ghosts[1]!;
      for (const eid of ghosts) {
        GhostPhase.value[eid] = GHOST_PHASE.active;
      }
      Position.x[bystander] = cellCenterX(2);
      Position.y[bystander] = cellCenterY(2);
      const bystanderAt = { x: Position.x[bystander]!, y: Position.y[bystander]! };
      const eidsBefore = new Set(ghosts);
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      const eidsAfter = new Set(query(sim.world, [Ghost]));
      expect(eidsAfter).toEqual(eidsBefore);
      expect(GhostPhase.value[catcher]).toBe(GHOST_PHASE.active);
      expect(GhostPhase.value[bystander]).toBe(GHOST_PHASE.active);
      expect({ x: Position.x[bystander], y: Position.y[bystander] }).toEqual(bystanderAt);
    });
  });

  it.each([
    [false, 1],
    [true, 0],
  ])("saves a high score on Game Over unless debug flags are on (%s)", (disabled, saves) => {
    const sim = startSim({ level: 2, maze: "maze1", highScoresDisabled: disabled });
    const events: SimEvent[] = [];
    for (let life = 0; life < 10 && !sim.snapshot().runEnd; life += 1) {
      ghostOntoPlayer(sim);
      events.push(...runFrames(sim, 1));
      events.push(...runUntil(sim, () => !sim.snapshot().dying || sim.snapshot().runEnd, 400));
    }
    expect(events).toContainEqual({ type: "endText", title: "GAME OVER" });
    expect(count(events, "saveRun")).toBe(saves);
  });

  it("starts at 4 lives, or 5 with Extra Life's grant", () => {
    expect(startSim({ level: 1, enableUpgrades: [] }).snapshot().lives).toBe(4);
    expect(startSim({ level: 1, enableUpgrades: ["passiveExtraLife"] }).snapshot().lives).toBe(5);
  });

  it("starts with exactly ?lives= and does not regen on non-store level clear", () => {
    const sim = startSim({ level: 1, enableUpgrades: [], lives: 7, maxLives: 7 });
    expect(sim.snapshot().lives).toBe(7);
    expect(livesAfterLevelClear({ lives: 7, maxLives: 7 }, 5)).toBe(5);
    expect(livesAfterLevelClear({ lives: 7, maxLives: 7 }, 7)).toBe(7);
  });

  it("starts with ?lives= even when ?maxLives= is higher", () => {
    const sim = startSim({ level: 1, enableUpgrades: [], lives: 2, maxLives: 6 });
    expect(sim.snapshot().lives).toBe(2);
    expect(livesAfterLevelClear({ lives: 2, maxLives: 6 }, 5)).toBe(5);
    expect(
      livesAfterLevelClear({ lives: 2, maxLives: 6, enableUpgrades: ["passiveMyogenesis"] }, 5),
    ).toBe(6);
  });

  it("adds upgrade life grants on top of ?lives=", () => {
    const sim = startSim({ level: 1, enableUpgrades: ["passiveExtraLife"], lives: 2, maxLives: 2 });
    expect(sim.snapshot().lives).toBe(3);
  });

  it("taking Myogenesis fills an empty life slot, but not when full", () => {
    const take = (livesBefore: number): number => {
      const sim = startSim({ jumpToUpgrade: true, enableUpgrades: [] });
      (sim as unknown as { lives: number }).lives = livesBefore;
      drainToOffer(sim);
      sim.chooseUpgrade({ kind: "upgrade", id: "passiveMyogenesis" });
      return sim.snapshot().lives;
    };
    expect(take(2)).toBe(3);
    expect(take(4)).toBe(4);
  });

  it("keeps START_LIVES above ?maxLives= without trimming", () => {
    expect(startSim({ level: 1, enableUpgrades: [], maxLives: 3 }).snapshot().lives).toBe(4);
    expect(startSim({ level: 1, enableUpgrades: [], maxLives: 6 }).snapshot().lives).toBe(4);
  });

  function livesAfterLevelClear(options: Partial<PlayOptions>, livesBefore: number): number {
    const sim = startSim({ jumpToUpgrade: true, enableUpgrades: [], ...options });
    (sim as unknown as { lives: number }).lives = livesBefore;
    const pick = drainToOffer(sim).upgrades.find(
      (id) => id !== "passiveExtraLife" && id !== "passiveMyogenesis",
    )!;
    sim.chooseUpgrade({ kind: "upgrade", id: pick });
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 500);
    return sim.snapshot().lives;
  }

  it.each([
    ["passiveMyogenesis", 1, 2],
    ["passiveMyogenesis", 3, 4],
    [null, 1, 1],
    [null, 3, 3],
  ] as const)("level clear with %s from %i lives ends at %i", (upgrade, startLives, endLives) => {
    expect(livesAfterLevelClear({ enableUpgrades: upgrade ? [upgrade] : [] }, startLives)).toBe(
      endLives,
    );
  });

  it("does not regenerate on level clear without Myogenesis", () => {
    const sim = startSim({ jumpToUpgrade: true, enableUpgrades: [] });
    (sim as unknown as { lives: number }).lives = 1;
    const events = runUntil(sim, () => sim.offer() !== null, 900, { acknowledge: true });
    expect(events).not.toContainEqual({ type: "lives", pulse: true });
    expect(sim.snapshot().lives).toBe(1);
  });

  it("Myogenesis regenerates one life before the upgrade offer", () => {
    const sim = startSim({ jumpToUpgrade: true, enableUpgrades: ["passiveMyogenesis"] });
    (sim as unknown as { lives: number }).lives = 1;
    const events = runUntil(sim, () => sim.offer() !== null, 900, { acknowledge: true });
    expect(events).toContainEqual({ type: "lives", pulse: true });
    expect(sim.snapshot().lives).toBe(2);
  });

  it("ignores speed upgrades for Maze-Man's speed in the store", () => {
    const storeSpeed = (enableUpgrades: UpgradeId[]): number => {
      const sim = startSim({ store: 1, quarters: 10, enableUpgrades });
      runFrames(sim, 2, { keys: held("right") });
      return Speed.px[playerEid(sim)]!;
    };
    expect(storeSpeed(["passiveAfterburnerPlus"])).toBe(storeSpeed([]));
  });

  it("stocks a free centre life on store entry instead of regenerating one", () => {
    const fresh = new PlaySim(
      { ...defaultPlayOptions(), store: 1, lives: 2, maxLives: 4, quarters: 10 },
      "test",
    );
    expect(fresh.start()).not.toContainEqual({ type: "lives", pulse: true });
    expect(fresh.snapshot().lives).toBe(2);
    expect(fresh.snapshot().storeFreebie).toBe("life");
    const full = startSim({ store: 1, lives: 4, maxLives: 4, quarters: 10 });
    expect(full.snapshot().lives).toBe(4);
    expect(full.snapshot().storeFreebie).toBe("quarter");
  });

  it("Myogenesis level regen still lands before the store, which then offers the free life", () => {
    const enter = (enableUpgrades: UpgradeId[]) => {
      const sim = startSim({
        jumpToUpgrade: true,
        level: 3,
        enableUpgrades,
        lives: 1,
        maxLives: 4,
      });
      (sim as unknown as { lives: number }).lives = 1;
      sim.chooseUpgrade({ kind: "upgrade", id: drainToOffer(sim).upgrades[0]! });
      runUntil(sim, () => sim.snapshot().inStore, 240);
      return sim.snapshot();
    };
    expect(enter(["passiveMyogenesis"])).toMatchObject({ lives: 2, storeFreebie: "life" });
    expect(enter([])).toMatchObject({ lives: 1, storeFreebie: "life" });
  });

  it.each([
    [2, "life", 3, 10],
    [4, "quarter", 4, 11],
  ] as const)(
    "with %i lives, stepping on the centre freebie picks up a free %s",
    (lives, kind, livesAfter, quartersAfter) => {
      const sim = startSim({ store: 1, lives, maxLives: 4, quarters: 10 });
      const { freebie } = parseStoreLayout(STORE_MAZE_ASCII);
      teleportPlayer(sim, cellCenterX(freebie.col), cellCenterY(freebie.row));
      const events = runFrames(sim, 1);
      expect(events).toContainEqual(
        kind === "life" ? { type: "lives", pulse: true } : { type: "quarters", pulse: true },
      );
      expect(sim.snapshot()).toMatchObject({
        lives: livesAfter,
        quarters: quartersAfter,
        storeFreebie: null,
      });
      runFrames(sim, 5);
      expect(sim.snapshot()).toMatchObject({ lives: livesAfter, quarters: quartersAfter });
    },
  );

  describe("Money Talks", () => {
    function getCaught(sim: PlaySim): SimEvent[] {
      ghostOntoPlayer(sim);
      return runFrames(sim, 1);
    }

    function toLastLife(sim: PlaySim): void {
      for (let i = 0; i < 10 && sim.snapshot().lives > 1; i += 1) {
        getCaught(sim);
        runUntil(sim, () => !sim.snapshot().dying, 240);
        settleSlots(sim);
      }
    }

    function moneySim(overrides: Partial<PlayOptions>): PlaySim {
      const sim = startSim({ level: 2, maze: "maze1", ...overrides });
      toLastLife(sim);
      return sim;
    }

    it("spends 3 Quarters one at a time to keep the last life", () => {
      const sim = moneySim({ enableUpgrades: ["passiveMoneyTalks"], quarters: 4 });
      const events = getCaught(sim);
      expect(events).toContainEqual({ type: "sfx", id: "revive" });
      expect(count(events, "saveRun")).toBe(0);
      expect(sim.snapshot().quarters).toBe(3);
      const seen = new Set<number>([sim.snapshot().quarters]);
      runUntil(
        sim,
        () => {
          seen.add(sim.snapshot().quarters);
          return !sim.snapshot().dying;
        },
        240,
      );
      expect([...seen]).toEqual([3, 2, 1]);
      expect(sim.snapshot()).toMatchObject({ lives: 1, quarters: 1, moneyTalksElapsedMs: null });
    });

    it("streams wallet coins during the save and clears them on resume", () => {
      const sim = moneySim({ enableUpgrades: ["passiveMoneyTalks"], quarters: 3 });
      const events = [...getCaught(sim), ...runUntil(sim, () => !sim.snapshot().dying, 240)];
      const coins = events.flatMap((e) => (e.type === "walletCoins" ? [e.spend] : []));
      expect(coins[0]).toEqual({ elapsedMs: 0, count: 3, paid: 1, quartersBefore: 3 });
      expect(coins.at(-1)).toBeNull();
    });

    it("costs 1 Quarter when enhanced", () => {
      const sim = moneySim({ enableUpgrades: ["passiveMoneyTalksPlus"], quarters: 1 });
      getCaught(sim);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot()).toMatchObject({ lives: 1, quarters: 0 });
    });

    it("ends the run when the Quarters fall short", () => {
      const sim = moneySim({ enableUpgrades: ["passiveMoneyTalks"], quarters: 2 });
      const events = getCaught(sim);
      expect(events).toContainEqual({ type: "sfx", id: "death" });
      expect(count(events, "saveRun")).toBe(1);
      expect(sim.snapshot()).toMatchObject({ lives: 0, quarters: 2 });
    });

    it("ends the run when not owned", () => {
      const sim = moneySim({ quarters: 5 });
      getCaught(sim);
      expect(sim.snapshot()).toMatchObject({ lives: 0, quarters: 5 });
    });

    it("spends a life, not Quarters, before the last life", () => {
      const sim = startSim({
        level: 2,
        maze: "maze1",
        enableUpgrades: ["passiveMoneyTalks"],
        quarters: 5,
      });
      const livesBefore = sim.snapshot().lives;
      getCaught(sim);
      expect(sim.snapshot()).toMatchObject({ lives: livesBefore - 1, quarters: 5 });
    });

    it("lets an armed Defy Death save for free", () => {
      const sim = moneySim({
        enableUpgrades: ["passiveMoneyTalks", "passiveDefyDeath"],
        quarters: 3,
      });
      const power = query(sim.world, [PowerPellet, Position])[0]!;
      teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      runFrames(sim, 1);
      getCaught(sim);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot()).toMatchObject({ lives: 1, quarters: 3 });
    });

    it("leaves off-respawn ghosts in place on a Money Talks save", () => {
      const sim = moneySim({ enableUpgrades: ["passiveMoneyTalks"], quarters: 3 });
      const spawn = { ...sim.snapshot().player! };
      const ghosts = query(sim.world, [Ghost, Position, GhostPhase]);
      const catcher = ghosts[0]!;
      const bystander = ghosts[1]!;
      for (const eid of ghosts) {
        GhostPhase.value[eid] = GHOST_PHASE.active;
      }
      Position.x[bystander] = cellCenterX(spawn.col === 1 ? 3 : 1);
      Position.y[bystander] = cellCenterY(1);
      const bystanderAt = { x: Position.x[bystander]!, y: Position.y[bystander]! };
      getCaught(sim);
      expect(Position.x[catcher]).toBe(Position.x[playerEid(sim)]);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot().lives).toBe(1);
      expect(GhostPhase.value[bystander]).toBe(GHOST_PHASE.active);
      expect({ x: Position.x[bystander], y: Position.y[bystander] }).toEqual(bystanderAt);
    });

    it("keeps a Death's Bounty Quarter paid during the save", () => {
      const sim = moneySim({
        enableUpgrades: ["passiveMoneyTalks", "passiveDeathsBounty"],
        quarters: 3,
        pennyCharge: 68,
      });
      const before = sim.snapshot().quarters;
      getCaught(sim);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      settleSlots(sim);
      expect(sim.snapshot()).toMatchObject({ lives: 1, quarters: before - 3 + 1 });
    });

    it("never spends Quarters with infiniteLives", () => {
      const sim = startSim({
        level: 2,
        maze: "maze1",
        enableUpgrades: ["passiveMoneyTalks"],
        quarters: 3,
        infiniteLives: true,
      });
      for (let i = 0; i < 4; i += 1) {
        getCaught(sim);
        runUntil(sim, () => !sim.snapshot().dying, 240);
      }
      expect(sim.snapshot().quarters).toBe(3);
    });
  });

  describe("store tiles", () => {
    function buy(sim: PlaySim, kind: "upgrade" | "swap" | "enhance", nth = 0): SimEvent[] {
      const slot = sim.storeState()!.slots.filter((cell) => cell.kind === kind)[nth]!;
      teleportPlayer(sim, cellCenterX(slot.col), cellCenterY(slot.row));
      runFrames(sim, 1);
      if (kind === "swap") {
        runFrames(sim, 1, { storeDir: "right" });
        return runFrames(sim, 1, { storeDir: "right" });
      }
      runFrames(sim, 1, { storeFocus: "yes" });
      return runFrames(sim, 1, { storeConfirm: true });
    }

    it("sacrifices the power picked with up/down, not the stocked one", () => {
      const owned = ["passiveGhostSlow", "passiveAfterburner"] as const;
      const sim = startSim({ store: 1, level: 5, quarters: 10, enableUpgrades: [...owned] });
      const swap = sim.storeState()!.slots.find((s) => s.kind === "swap");
      if (swap?.kind !== "swap") throw new Error("no swap slot");
      const keep = baseIdOf(swap.outgoingId);
      const sacrificed = owned.find((id) => id !== keep)!;
      teleportPlayer(sim, cellCenterX(swap.col), cellCenterY(swap.row));
      runFrames(sim, 1);
      runFrames(sim, 1, { storeDir: "up" });
      expect(sim.storeState()!.sacrifice?.id).toBe(sacrificed);
      runFrames(sim, 1, { storeDir: "right" });
      const events = runFrames(sim, 1, { storeDir: "right" });
      expect(events.some((event) => event.type === "storePurchased")).toBe(true);
      expect(sim.snapshot().upgrades).toContain(keep);
      expect(sim.snapshot().upgrades).not.toContain(sacrificed);
      expect(sim.snapshot().quarters).toBe(10 - STORE_SWAP_PRICE);
    });

    it("clears the sacrificed upgrade's live timers on a swap", () => {
      const owned = ["powerPelletFreeze", "passiveAfterburner"] as const;
      const sim = startSim({ store: 1, level: 5, quarters: 10, enableUpgrades: [...owned] });
      sim["runUpgrades"] = { ...sim["runUpgrades"], freezeRemainingMs: 4000, frozenGhostEid: 7 };
      const swap = sim.storeState()!.slots.find((s) => s.kind === "swap")!;
      teleportPlayer(sim, cellCenterX(swap.col), cellCenterY(swap.row));
      runFrames(sim, 1);
      if (sim.storeState()!.sacrifice?.id !== "powerPelletFreeze") {
        runFrames(sim, 1, { storeDir: "up" });
      }
      expect(sim.storeState()!.sacrifice?.id).toBe("powerPelletFreeze");
      runFrames(sim, 1, { storeDir: "right" });
      runFrames(sim, 1, { storeDir: "right" });
      expect(sim.snapshot().upgrades).not.toContain("powerPelletFreeze");
      expect(sim["runUpgrades"].freezeRemainingMs).toBe(0);
      expect(sim["runUpgrades"].frozenGhostEid).toBeNull();
    });

    it("leaves the sacrifice selection on left without paying", () => {
      const sim = startSim({
        store: 1,
        level: 5,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlow", "passiveAfterburner"],
      });
      const swap = sim.storeState()!.slots.find((s) => s.kind === "swap")!;
      teleportPlayer(sim, cellCenterX(swap.col), cellCenterY(swap.row));
      runFrames(sim, 1);
      runFrames(sim, 1, { storeDir: "left" });
      expect(sim.snapshot().quarters).toBe(10);
      expect(sim.snapshot().upgrades).toHaveLength(2);
      expect(sim.storeState()!.slots.find((s) => s.kind === "swap")!.sold).toBe(false);
    });

    it("sells a shelved rare for 5 Quarters, and never shelves two", () => {
      const owned = ["passiveGhostSlow", "passiveAfterburner"] as const;
      let bought = false;
      for (let n = 0; n < 60 && !bought; n += 1) {
        const sim = startSim(
          { store: 1, level: 5, quarters: 10, lives: 4, maxLives: 4, enableUpgrades: [...owned] },
          `rare${n}`,
        );
        const shelf = sim.snapshot().storeStock!.filter((s) => !s.includes(":")) as BaseUpgradeId[];
        expect(shelf.filter(isRare).length).toBeLessThanOrEqual(1);
        const nth = shelf.findIndex(isRare);
        if (nth === -1) {
          continue;
        }
        buy(sim, "upgrade", nth);
        expect(sim.snapshot().quarters).toBe(10 - STORE_RARE_UPGRADE_PRICE);
        expect(sim.snapshot().upgrades).toEqual([...owned, shelf[nth]]);
        bought = true;
      }
      expect(bought).toBe(true);
    });

    it("trades into a rare even when the shelf already shows one", () => {
      const owned = [
        ...ALL_UPGRADE_IDS.filter((id) => !isRare(id) && !isTrinketId(id)),
        ...MAXED_TRINKETS,
      ];
      const sim = startSim({ store: 1, level: 5, quarters: 10, enableUpgrades: owned });
      const shelf = (
        sim.snapshot().storeStock!.filter((s) => !s.includes(":")) as BaseUpgradeId[]
      ).filter(isRare);
      expect(shelf).toHaveLength(1);
      buy(sim, "swap");
      const gained = sim.snapshot().upgrades.filter((id) => !owned.includes(id as BaseUpgradeId));
      expect(gained).toHaveLength(1);
      expect(isRare(gained[0]!)).toBe(true);
      expect(gained).not.toContain(shelf[0]);
    });

    it("the trade tile's shown school is the school of the upgrade gained", () => {
      const sim = startSim({
        store: 1,
        level: 5,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlow", "passiveAfterburner"],
      });
      const swap = sim.storeState()!.slots.find((s) => s.kind === "swap");
      if (swap?.kind !== "swap") throw new Error("no swap slot");
      const school = swapIncomingSchool(swap);
      expect(school).not.toBeNull();
      buy(sim, "swap");
      const gained = sim
        .snapshot()
        .upgrades.filter((id) => id !== "passiveGhostSlow" && id !== "passiveAfterburner");
      expect(gained).toHaveLength(1);
      expect(getUpgradeDef(gained[0]!).school).toBe(school);
    });

    it("the first store fills the trade corner with a third upgrade", () => {
      const sim = startSim({
        store: 1,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlow"],
      });
      const kinds = sim.storeState()!.slots.map((slot) => slot.kind);
      expect(kinds).toEqual(["upgrade", "upgrade", "enhance", "upgrade"]);
    });

    it("a later store shows two upgrades, an enhancement and a trade", () => {
      const sim = startSim({
        store: 1,
        lives: 1,
        maxLives: 4,
        level: 5,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlow", "passiveAfterburner"],
      });
      const stock = sim.snapshot().storeStock!;
      expect(stock).toHaveLength(4);
      const enhance = stock.find((s) => s.startsWith("enhance:"))!.slice("enhance:".length);
      const swap = stock.find((s) => s.startsWith("swap:"))!.slice("swap:".length);
      expect(new Set([enhance, swap])).toEqual(new Set(["passiveGhostSlow", "passiveAfterburner"]));
    });

    it("a store with a single owned upgrade offers the enhancement but no trade", () => {
      const sim = startSim({
        store: 1,
        level: 5,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlow"],
      });
      const stock = sim.snapshot().storeStock!;
      expect(stock).toHaveLength(4);
      expect(stock).toContain("enhance:passiveGhostSlow");
      expect(stock.some((s) => s.startsWith("swap:"))).toBe(false);
    });

    it("the next store guarantees an upgrade of the school last bought", () => {
      const schoolOf = (id: string) => getUpgradeDef(id as UpgradeId).school;
      for (let n = 0; n < 12; n += 1) {
        const sim = startSim({ store: 1, level: 5, quarters: 10 }, `school${n}`);
        const shelf = (): string[] => sim.snapshot().storeStock!.filter((s) => !s.includes(":"));
        buy(sim, "upgrade", 0);
        buy(sim, "upgrade", 1);
        const last = sim.snapshot().upgrades.at(-1)!;
        teleportPlayer(sim, cellCenterX(31), cellCenterY(20));
        runUntil(sim, () => !sim.snapshot().inStore, 600);
        (sim as unknown as { enterStore(): void }).enterStore();
        expect(shelf().some((id) => schoolOf(id) === schoolOf(last))).toBe(true);
      }
    });

    it("a later store never re-offers an upgrade an earlier store showed", () => {
      for (let n = 0; n < 12; n += 1) {
        const sim = startSim(
          {
            store: 1,
            level: 5,
            quarters: 10,
            enableUpgrades: ["passiveGhostSlow", "passiveAfterburner", "passiveMoneyTalks"],
          },
          `repeat${n}`,
        );
        const offered = offeredUpgradeIds(sim.storeState()!);
        teleportPlayer(sim, cellCenterX(31), cellCenterY(20));
        runUntil(sim, () => !sim.snapshot().inStore, 600);
        (sim as unknown as { enterStore(): void }).enterStore();
        const again = offeredUpgradeIds(sim.storeState()!);
        expect(offered.length).toBeGreaterThan(0);
        expect(again.filter((id) => offered.includes(id))).toEqual([]);
      }
    });

    it("taking only the free pickup sets no school guarantee", () => {
      const sim = startSim({ store: 1, level: 5, quarters: 10 });
      expect((sim as unknown as { nextStoreSchool: unknown }).nextStoreSchool).toBeNull();
      const { freebie } = parseStoreLayout(STORE_MAZE_ASCII);
      teleportPlayer(sim, cellCenterX(freebie.col), cellCenterY(freebie.row));
      runFrames(sim, 1);
      expect(sim.snapshot().storeFreebie).toBeNull();
      expect((sim as unknown as { nextStoreSchool: unknown }).nextStoreSchool).toBeNull();
    });

    it("a trade does not change the school guarantee", () => {
      const sim = startSim({
        store: 1,
        level: 5,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlow", "passiveAfterburner"],
      });
      const hint = () => (sim as unknown as { nextStoreSchool: unknown }).nextStoreSchool;
      buy(sim, "swap");
      expect(hint()).toBeNull();
      buy(sim, "upgrade", 0);
      const school = hint();
      expect(school).not.toBeNull();
      buy(sim, "swap");
      expect(hint()).toBe(school);
    });

    it("enhancement costs 3, swaps the owned upgrade for its Plus form and keeps order", () => {
      const sim = startSim({
        store: 1,
        level: 5,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlow"],
      });
      const events = buy(sim, "enhance");
      expect(sim.snapshot().quarters).toBe(10 - STORE_ENHANCE_PRICE);
      expect(sim.snapshot().upgrades).toEqual(["passiveGhostSlowPlus"]);
      expect(events).toContainEqual({ type: "storePurchased", id: "passiveGhostSlowPlus" });
      expect(sim.snapshot().storeStock!.some((s) => s.startsWith("enhance"))).toBe(false);
    });

    it("enhancing Extra Life grants the extra life", () => {
      const sim = startSim({
        store: 1,
        level: 5,
        quarters: 10,
        enableUpgrades: ["passiveExtraLife"],
      });
      const before = sim.snapshot().lives;
      buy(sim, "enhance");
      expect(sim.snapshot().lives).toBe(before + 1);
      expect(sim.snapshot().upgrades).toEqual(["passiveExtraLifePlus"]);
    });

    it("swapping an enhanced upgrade yields an enhanced one", () => {
      const sim = startSim({
        store: 1,
        level: 5,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlowPlus"],
      });
      buy(sim, "swap");
      const owned = sim.snapshot().upgrades;
      expect(owned).toHaveLength(1);
      expect(owned[0]!.endsWith("Plus")).toBe(true);
      expect(owned[0]).not.toBe("passiveGhostSlowPlus");
    });
  });

  it.each([
    [1, 3],
    [3, 8],
  ] as const)("store=%i starts in the store at level %i", (store, level) => {
    const sim = startSim({ store, quarters: 10 });
    expect(sim.snapshot().level).toBe(level);
    expect(sim.storeState()).not.toBeNull();
  });

  it("store=2 starts in the mid-run store level", () => {
    const sim = startSim({ store: 2, quarters: 10 });
    expect([5, 6]).toContain(sim.snapshot().level);
    expect(sim.storeState()).not.toBeNull();
  });

  describe("store dots", () => {
    it("picks a dot up on running over it with no quarters or bonus effect", () => {
      const sim = startSim({ store: 1, quarters: 5 });
      const dots = sim.storeState()!.dots;
      const dot = dots[0]!;
      const before = sim.snapshot();
      teleportPlayer(sim, cellCenterX(dot.col), cellCenterY(dot.row));
      runFrames(sim, 1);
      expect(sim.storeState()!.dots).toHaveLength(dots.length - 1);
      const after = sim.snapshot();
      expect(after).toMatchObject({
        quarters: before.quarters,
        pennies: before.pennies,
        inStore: true,
      });
    });

    it("plays the munch sound for a dot but not twice for the same cell", () => {
      const sim = startSim({ store: 1, quarters: 0 });
      const dot = sim.storeState()!.dots[0]!;
      teleportPlayer(sim, cellCenterX(dot.col), cellCenterY(dot.row));
      const munches = () =>
        sim.step(IDLE_INPUT, 16).filter((e) => e.type === "sfx" && e.id === "pelletMunch").length;
      expect(munches()).toBe(1);
      expect(munches()).toBe(0);
    });
  });

  describe("store entrance", () => {
    it("slides the player in through the left entrance as the store starts", () => {
      const sim = new PlaySim({ ...defaultPlayOptions(), store: 1, quarters: 0 }, "test");
      sim.start();
      const entrance = { col: 0, row: getActiveLayout().playerSpawn.row };
      const start = sim.snapshot();
      expect(start.storeEntering).toBe(true);
      expect(start.player!.x).toBeLessThan(cellCenterX(entrance.col));
      expect(start.player).toMatchObject({ row: entrance.row, facing: "right" });
      expect(sim.readsStoreKeys()).toBe(false);
      runFrames(sim, 5, { keys: held("up") });
      expect(sim.snapshot().player!.y).toBe(start.player!.y);
      expect(sim.snapshot().player!.x).toBeGreaterThan(start.player!.x);
      runUntil(sim, () => !sim.snapshot().storeEntering, 120);
      expect(sim.snapshot().player).toMatchObject({
        col: entrance.col + 1,
        row: entrance.row,
        facing: "none",
      });
      expect(sim.readsStoreKeys()).toBe(true);
    });

    it("leaves the store by walking back out the entrance", () => {
      const sim = startSim({ store: 1, quarters: 0 });
      const level = sim.snapshot().level;
      runUntil(sim, () => !sim.snapshot().storeEntering, 120);
      runFrames(sim, 1);
      runUntil(sim, () => !sim.snapshot().inStore, 600, { keys: held("left") });
      expect(sim.snapshot()).toMatchObject({ inStore: false });
      expect(sim.snapshot().level).not.toBe(level);
    });
  });

  describe("store movement matches a regular level", () => {
    it("keeps moving after release until a wall, like a level", () => {
      const sim = startSim({ store: 1, quarters: 0 });
      runFrames(sim, 1);
      runFrames(sim, 5, { keys: held("right") });
      const released = sim.snapshot().player!;
      runFrames(sim, 20);
      expect(sim.snapshot().player!.x).toBeGreaterThan(released.x);
      runUntil(sim, () => sim.snapshot().player?.facing === "none", 400);
      const { freebie } = parseStoreLayout(STORE_MAZE_ASCII);
      expect(sim.snapshot().player).toMatchObject({ col: freebie.col, row: freebie.row });
    });

    it("has no diagonals: two held keys move along one axis", () => {
      const sim = startSim({ store: 1, quarters: 0 });
      runFrames(sim, 1);
      const start = sim.snapshot().player!;
      runFrames(sim, 10, { keys: { ...held("up"), right: 5 } });
      const moved = sim.snapshot().player!;
      expect(moved.facing).toBe("right");
      expect(moved.y).toBe(start.y);
      expect(moved.x).toBeGreaterThan(start.x);
    });

    it("runs at the level's own speed, before speed upgrades", () => {
      const speed = (options: Partial<PlayOptions>): number => {
        const sim = startSim({ quarters: 0, ...options });
        runFrames(sim, 2, { keys: held("right") });
        return Speed.px[playerEid(sim)]!;
      };
      expect(speed({ store: 1 })).toBe(speed({ level: 3, enableUpgrades: [] }));
    });

    it("pauses the player while a BUY prompt is open, then resumes like a level", () => {
      const sim = startSim({ store: 1, quarters: 10 });
      runFrames(sim, 1);
      runFrames(sim, 1, { storeClick: 1 });
      runFrames(sim, 1);
      expect(sim.snapshot().storePrompt).toBe("confirm");
      const at = sim.snapshot().player!;
      runFrames(sim, 20, { keys: held("right") });
      expect(sim.snapshot().player).toMatchObject({ x: at.x, y: at.y });
      runFrames(sim, 1, { storeChoice: "no" });
      runFrames(sim, 1);
      runFrames(sim, 10, { keys: held("right") });
      expect(sim.snapshot().player!.x).toBeGreaterThan(at.x);
    });
  });

  it.each([
    ["yes", true],
    ["no", false],
  ] as const)("store prompt click %s %s a corner upgrade", (choice, buys) => {
    const sim = startSim({ store: 1, quarters: 10 });
    const corner = sim.storeState()!.slots[0]!;
    const before = sim.snapshot();
    teleportPlayer(sim, cellCenterX(corner.col), cellCenterY(corner.row));
    runFrames(sim, 1);
    runFrames(sim, 1, { storeChoice: choice });
    expect(sim.snapshot().upgrades.length).toBe(before.upgrades.length + (buys ? 1 : 0));
    expect(sim.snapshot().quarters < before.quarters).toBe(buys);
  });

  it.each([
    ["yes", true],
    ["no", false],
  ] as const)("clicking a store tile opens its prompt and %s picks it", (choice, buys) => {
    const sim = startSim({ store: 1, quarters: 10 });
    const before = sim.snapshot();
    runFrames(sim, 1, { storeClick: 1 });
    expect(sim.storeState()?.activeSlot).toBe(1);
    runFrames(sim, 1, { storeChoice: choice });
    expect(sim.snapshot().upgrades.length).toBe(before.upgrades.length + (buys ? 1 : 0));
    expect(sim.snapshot().quarters < before.quarters).toBe(buys);
  });

  describe("store exit click", () => {
    const storeExit = () => ({ x: cellCenterX(0), y: cellCenterY(10) });

    function travelPx(sim: PlaySim, run: () => void) {
      const before = sim.snapshot().player!;
      run();
      const after = sim.snapshot().player!;
      return Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
    }

    it("walks the player out a clicked tunnel at normal speed", () => {
      const startAtFreebie = () => {
        const sim = startSim({ store: 1, quarters: 0 });
        const { freebie } = parseStoreLayout(STORE_MAZE_ASCII);
        teleportPlayer(sim, cellCenterX(freebie.col), cellCenterY(freebie.row));
        runFrames(sim, 1);
        return sim;
      };
      const keyed = startAtFreebie();
      const keyedPx = travelPx(keyed, () => runFrames(keyed, 5, { keys: held("left") }));

      const sim = startAtFreebie();
      const level = sim.snapshot().level;
      const routedPx = travelPx(sim, () => {
        runFrames(sim, 1, { storePointer: storeExit() });
        runFrames(sim, 4);
      });
      expect(sim.snapshot().storeRoute).toEqual({ col: 0, row: 10 });
      expect(Math.abs(routedPx - keyedPx)).toBeLessThanOrEqual(1);
      runUntil(sim, () => sim.snapshot().level !== level, 1200);
      expect(sim.snapshot().inStore).toBe(false);
    });

    it.each([
      ["an arrow key", { keys: held("up") }],
      ["Escape", { storeCancelRoute: true }],
      ["a click elsewhere", { storePointer: { x: cellCenterX(5), y: cellCenterY(16) } }],
    ] as const)("%s cancels the route", (_label, cancel) => {
      const sim = startSim({ store: 1, quarters: 0 });
      const { freebie } = parseStoreLayout(STORE_MAZE_ASCII);
      teleportPlayer(sim, cellCenterX(freebie.col), cellCenterY(freebie.row));
      runFrames(sim, 1, { storePointer: storeExit() });
      runFrames(sim, 10);
      runFrames(sim, 1, cancel);
      expect(sim.snapshot().storeRoute).toBeNull();
      runFrames(sim, 30);
      expect(sim.snapshot().storeRoute).toBeNull();
    });

    it("routes around affordable tiles to the exit", () => {
      const sim = startSim({ store: 2, quarters: 10, lives: 2, maxLives: 4 });
      const level = sim.snapshot().level;
      teleportPlayer(sim, cellCenterX(25), cellCenterY(15));
      runFrames(sim, 1, { storePointer: storeExit() });
      runUntil(
        sim,
        () => sim.snapshot().level !== level || sim.snapshot().storePrompt === "confirm",
        1200,
      );
      expect(sim.snapshot().level).not.toBe(level);
    });

    it("reports a tunnel under the pointer only while a click there would route", () => {
      const sim = startSim({ store: 1, quarters: 10, lives: 2, maxLives: 4 });
      expect(sim.storeExitUnder(storeExit().x, storeExit().y)).toBe(true);
      expect(sim.storeExitUnder(cellCenterX(10), cellCenterY(16))).toBe(false);
      runFrames(sim, 1, { storeClick: 0 });
      expect(sim.snapshot().storePrompt).toBe("confirm");
      expect(sim.storeExitUnder(storeExit().x, storeExit().y)).toBe(false);
      runFrames(sim, 1, { storeChoice: "no" });
      expect(sim.storeExitUnder(storeExit().x, storeExit().y)).toBe(true);
      const level = sim.snapshot().level;
      runFrames(sim, 1, { storePointer: storeExit() });
      runUntil(sim, () => sim.snapshot().level !== level, 1200);
      expect(sim.storeExitUnder(storeExit().x, storeExit().y)).toBe(false);
    });

    it("ignores clicks that are not on a tunnel", () => {
      const sim = startSim({ store: 1, quarters: 0 });
      runFrames(sim, 1, { storePointer: { x: cellCenterX(0), y: cellCenterY(5) } });
      expect(sim.snapshot().storeRoute).toBeNull();
      expect(sim.storeRouting()).toBe(false);
    });
  });

  it("adds a Blinky when the player eats a boss pellet", () => {
    const sim = startSim({ level: 9, boss: "blinkySwarm" });
    expect(sim.snapshot().boss?.ghostCount).toBe(2);
    const pellet = query(sim.world, [BossPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[pellet]!, Position.y[pellet]!);
    runUntil(sim, () => sim.snapshot().boss?.ghostCount === 3, 30);
    expect(sim.snapshot().bossPellets).toBe(2);
  });

  it("lets a boss Blinky leave its tunnel mouth when Tunnel Sanctuary+ blocks tunnels", () => {
    const sim = startSim({
      level: 9,
      boss: "blinkySwarm",
      godMode: true,
      enableUpgrades: ["passiveTunnelSanctuaryPlus"],
    });
    const before = new Set(query(sim.world, [BossGhost, Position]));
    const pellet = query(sim.world, [BossPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[pellet]!, Position.y[pellet]!);
    runUntil(sim, () => sim.snapshot().boss?.ghostCount === 3, 30);
    const spawned = query(sim.world, [BossGhost, Position]).find((eid) => !before.has(eid))!;
    const startX = Position.x[spawned]!;
    runFrames(sim, 180);
    expect(Math.abs(Position.x[spawned]! - startX)).toBeGreaterThan(20);
  });

  describe("boss pick", () => {
    it("rolls either boss from the seed, the same boss for the same seed", () => {
      const picks = new Set<string>();
      for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]) {
        const id = startSim({ level: 9 }, seed).snapshot().boss?.id;
        expect(startSim({ level: 9 }, seed).snapshot().boss?.id).toBe(id);
        picks.add(id!);
      }
      expect([...picks].sort()).toEqual(["blinkySwarm", "chainedGhosts"]);
    });

    it("starts the Blinky Swarm with the knob's Blinky count", () => {
      const sim = new PlaySim(
        { ...defaultPlayOptions(), level: 9, boss: "blinkySwarm" },
        "test",
        resolveTuning({ bossSwarmStartGhosts: 6 }),
      );
      sim.start();
      expect(sim.snapshot().boss?.ghostCount).toBe(6);
      runFrames(sim, 1);
      expect(query(sim.world, [BossGhost]).length).toBe(6);
    });
  });

  describe("Chained Ghosts boss", () => {
    function startChained(overrides: Partial<PlayOptions> = {}): PlaySim {
      return startSim({ level: 9, boss: "chainedGhosts", infiniteLives: true, ...overrides });
    }

    function chainedEids(sim: PlaySim): number[] {
      return [...query(sim.world, [ChainedGhost, Ghost])];
    }

    function pairEnds(sim: PlaySim, pair: number): [number, number] {
      const ends = chainedEids(sim).filter((eid) => ChainedGhost.pair[eid] === pair);
      expect(ends).toHaveLength(2);
      return ends as [number, number];
    }

    function placePair(sim: PlaySim, pair: number, row: number, cols: [number, number]): void {
      pairEnds(sim, pair).forEach((eid, i) => {
        GhostPhase.value[eid] = GHOST_PHASE.active;
        Position.x[eid] = cellCenterX(cols[i]!);
        Position.y[eid] = cellCenterY(row) + TILE_SIZE * 3 * (i === 0 ? -1 : 1);
      });
    }

    it("spawns all four ghosts with only Blinky↔Clyde chained in stage 1", () => {
      const sim = startChained();
      expect(sim.snapshot().boss).toMatchObject({
        id: "chainedGhosts",
        ghostCount: 4,
        chainLive: false,
        stage: 1,
        chainPairs: [CHAIN_PAIR.blinkyClyde],
        mazeColorInverted: false,
      });
      expect(sim.snapshot().bossPellets).toBe(0);
      const kinds = [...query(sim.world, [Ghost, GhostKind])].map((eid) => GhostKind.kind[eid]);
      expect(kinds).toEqual([
        GHOST_KIND.blinky,
        GHOST_KIND.pinky,
        GHOST_KIND.inky,
        GHOST_KIND.clyde,
      ]);
      expect(query(sim.world, [Ghost]).length).toBe(4);
      expect(chainedEids(sim)).toHaveLength(2);
      for (const eid of pairEnds(sim, CHAIN_PAIR.blinkyClyde)) {
        expect([GHOST_KIND.blinky, GHOST_KIND.clyde]).toContain(GhostKind.kind[eid]);
      }
    });

    it("releases ghosts in classic order with the house stagger", () => {
      const sim = startChained();
      const delays = [...query(sim.world, [BossGhost, GhostKind])]
        .map((eid) => ({
          kind: GhostKind.kind[eid],
          delay: BossGhost.releaseDelayMs[eid],
        }))
        .sort((a, b) => a.delay! - b.delay!);
      expect(delays.map((d) => d.kind)).toEqual([
        GHOST_KIND.blinky,
        GHOST_KIND.pinky,
        GHOST_KIND.inky,
        GHOST_KIND.clyde,
      ]);
      expect(delays.map((d) => d.delay)).toEqual([100, 1600, 3100, 4600]);
    });

    it("catches the player on the line between a chained pair, away from both", () => {
      const sim = startChained();
      const player = playerEid(sim);
      const row = worldToRow(Position.y[player]!);
      const col = worldToCol(Position.x[player]!);
      placePair(sim, CHAIN_PAIR.blinkyClyde, row, [col - 4, col + 4]);
      expect(sim.snapshot().boss?.chainLive).toBe(true);
      const events = runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(true);
      expect(events).toContainEqual({ type: "sfx", id: "death" });
    });

    it("does not catch a player off the line", () => {
      const sim = startChained();
      const player = playerEid(sim);
      const row = worldToRow(Position.y[player]!);
      const col = worldToCol(Position.x[player]!);
      placePair(sim, CHAIN_PAIR.blinkyClyde, row, [col + 2, col + 6]);
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(false);
    });

    it("has no chain for a pair while either end is still in the house", () => {
      const sim = startChained();
      const player = playerEid(sim);
      const row = worldToRow(Position.y[player]!);
      const col = worldToCol(Position.x[player]!);
      placePair(sim, CHAIN_PAIR.blinkyClyde, row, [col - 4, col + 4]);
      GhostPhase.value[pairEnds(sim, CHAIN_PAIR.blinkyClyde)[1]] = GHOST_PHASE.inHouse;
      expect(sim.snapshot().boss?.chainLive).toBe(false);
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(false);
    });

    it("draws the live Blinky↔Clyde chain in stage 1", () => {
      const sim = startChained();
      const player = playerEid(sim);
      const row = worldToRow(Position.y[player]!);
      placePair(sim, CHAIN_PAIR.blinkyClyde, row, [1, 2]);
      const [a, b] = pairEnds(sim, CHAIN_PAIR.blinkyClyde);
      expect(sim.renderOptions().bossChains).toEqual([
        expect.objectContaining({
          x1: Position.x[a],
          y1: Position.y[a],
          x2: Position.x[b],
          y2: Position.y[b],
        }),
      ]);
    });

    it("releases ghosts so a chain goes live in play", () => {
      const sim = startChained({ godMode: true });
      runUntil(sim, () => sim.snapshot().boss?.chainLive === true, 600, { keys: held("left") });
      expect(sim.snapshot().boss?.chainLive).toBe(true);
    });

    it("keeps the chained ghosts out of the side tunnels", () => {
      const sim = startChained({ godMode: true });
      const [row] = horizontalTunnelRows();
      const [a] = pairEnds(sim, CHAIN_PAIR.blinkyClyde);
      GhostPhase.value[a] = GHOST_PHASE.active;
      Position.x[a] = cellCenterX(0);
      Position.y[a] = cellCenterY(row!);
      Facing.direction[a] = DIRECTION.left;
      Input.direction[a] = DIRECTION.left;
      runFrames(sim, 30);
      expect(Position.x[a]!).toBeLessThan(getActiveLayout().cols * TILE_SIZE * 0.5);
    });

    it("chains both pairs after the stage advance", () => {
      const sim = startChained({ bossStageAdvance: true });
      runUntil(
        sim,
        () => sim.snapshot().boss?.stage === 2 && sim.snapshot().bossStageTransition === false,
        BOSS_STAGE_WAIT_FRAMES,
      );
      expect(sim.snapshot().boss).toMatchObject({
        stage: 2,
        chainPairs: [CHAIN_PAIR.blinkyClyde, CHAIN_PAIR.pinkyInky],
        mazeColorInverted: true,
      });
      expect(chainedEids(sim)).toHaveLength(4);
      const player = playerEid(sim);
      const row = worldToRow(Position.y[player]!);
      placePair(sim, CHAIN_PAIR.blinkyClyde, row, [1, 2]);
      placePair(sim, CHAIN_PAIR.pinkyInky, row + 2, [4, 5]);
      expect(sim.renderOptions().bossChains).toHaveLength(2);
    });
  });

  describe("boss second stage", () => {
    function waitStage2(sim: PlaySim): void {
      runUntil(
        sim,
        () => sim.snapshot().boss?.stage === 2 && sim.snapshot().bossStageTransition === false,
        BOSS_STAGE_WAIT_FRAMES,
      );
    }

    it("starts Blinky Swarm with 3 boss pellets in stage 1", () => {
      const sim = startSim({ level: 9, boss: "blinkySwarm" });
      expect(sim.snapshot().boss).toMatchObject({
        id: "blinkySwarm",
        stage: 1,
        ghostCount: 2,
        mazeColorInverted: false,
      });
      expect(sim.snapshot().bossPellets).toBe(3);
    });

    it("advances swarm to stage 2 with 3 boss pellets and carried ghost count", () => {
      const sim = startSim({ level: 9, boss: "blinkySwarm", godMode: true });
      for (const pellet of [...query(sim.world, [BossPellet, Position])]) {
        teleportPlayer(sim, Position.x[pellet]!, Position.y[pellet]!);
        runUntil(sim, () => !hasComponent(sim.world, pellet, BossPellet), 30);
      }
      expect(sim.snapshot().boss?.ghostCount).toBe(5);
      sim["jumpToLevelClear"]();
      expect(sim.snapshot().bossStageTransition).toBe(true);
      expect(sim.snapshot().runComplete).toBe(false);
      const player = playerEid(sim);
      const col = worldToCol(Position.x[player]!);
      const row = worldToRow(Position.y[player]!);
      waitStage2(sim);
      expect(sim.snapshot().boss).toMatchObject({
        stage: 2,
        ghostCount: 5,
        mazeColorInverted: true,
      });
      expect(sim.snapshot().bossPellets).toBe(3);
      expect(worldToCol(Position.x[player]!)).toBe(col);
      expect(worldToRow(Position.y[player]!)).toBe(row);
      expect(sim.snapshot().runComplete).toBe(false);
    });

    it("ends the run only after the final boss stage clear", () => {
      const sim = startSim({ level: 9, boss: "blinkySwarm", bossStageAdvance: true });
      waitStage2(sim);
      const events = (() => {
        sim["jumpToLevelClear"]();
        return runFrames(sim, 90);
      })();
      expect(events).toContainEqual({ type: "endText", title: "RUN COMPLETE" });
    });

    it("preserves stage across a mid-fight death", () => {
      const sim = startSim({
        level: 9,
        boss: "blinkySwarm",
        bossStageAdvance: true,
        infiniteLives: true,
      });
      waitStage2(sim);
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      runUntil(sim, () => !sim.snapshot().dying, 400);
      expect(sim.snapshot().boss?.stage).toBe(2);
      expect(sim.snapshot().boss?.mazeColorInverted).toBe(true);
    });

    it("keeps the timer ticking during the stage transition", () => {
      const sim = startSim({ level: 9, boss: "chainedGhosts", bossStageAdvance: true });
      expect(sim.snapshot().bossStageTransition).toBe(true);
      const before = sim.snapshot().timeRemaining;
      runFrames(sim, 60);
      expect(sim.snapshot().bossStageTransition).toBe(true);
      expect(sim.snapshot().timeRemaining).toBeLessThan(before);
    });

    it("keeps the player in place across a chained stage advance", () => {
      const sim = startSim({ level: 9, boss: "chainedGhosts", godMode: true });
      const player = playerEid(sim);
      Position.x[player] = cellCenterX(10);
      Position.y[player] = cellCenterY(12);
      sim["jumpToLevelClear"]();
      waitStage2(sim);
      expect(worldToCol(Position.x[player]!)).toBe(10);
      expect(worldToRow(Position.y[player]!)).toBe(12);
    });

    it("keeps wallAlpha at 0 on the rebuild draw frame", () => {
      const sim = startSim({ level: 9, boss: "blinkySwarm", godMode: true });
      sim["jumpToLevelClear"]();
      expect(sim.snapshot().bossStageTransition).toBe(true);
      sim["tickBossStageTransitionFrame"](BOSS_STAGE_ENTITY_FADE_MS + BOSS_STAGE_FLICKER_MS);
      expect(sim.snapshot().boss?.stage).toBe(2);
      expect(sim.renderOptions().wallAlpha).toBe(0);
      expect(sim.renderOptions().entityAlpha).toBe(0);
    });

    it("keeps draw alphas at 0 mid black-hold after rebuild", () => {
      const sim = startSim({ level: 9, boss: "blinkySwarm", godMode: true });
      sim["jumpToLevelClear"]();
      sim["tickBossStageTransitionFrame"](BOSS_STAGE_ENTITY_FADE_MS + BOSS_STAGE_FLICKER_MS);
      expect(sim.snapshot().boss?.stage).toBe(2);
      sim["tickBossStageTransitionFrame"](BOSS_STAGE_BLACK_HOLD_MS / 2);
      expect(sim.snapshot().bossStageTransition).toBe(true);
      expect(sim.snapshot().boss?.stage).toBe(2);
      expect(sim.renderOptions().wallAlpha).toBe(0);
      expect(sim.renderOptions().entityAlpha).toBe(0);
    });

    it("clears eid-bound upgrade timers when the stage board refills", () => {
      const sim = startSim({ level: 9, boss: "blinkySwarm", godMode: true });
      const [ghost] = query(sim.world, [Ghost]);
      expect(ghost).toBeDefined();
      sim["runUpgrades"] = {
        ...sim["runUpgrades"],
        freezeRemainingMs: 4000,
        frozenGhostEid: ghost!,
      };
      expect(frozenGhostEid(sim["runUpgrades"])).toBe(ghost);
      sim["jumpToLevelClear"]();
      waitStage2(sim);
      expect(frozenGhostEid(sim["runUpgrades"])).toBeNull();
      expect(sim["runUpgrades"].freezeRemainingMs).toBe(0);
    });
  });

  it("replays the same run from the same seed and inputs", () => {
    const script = (sim: PlaySim) => {
      runFrames(sim, 100, { keys: held("left") });
      runFrames(sim, 100, { keys: held("up") });
      runFrames(sim, 100, { keys: held("right") });
      return sim.snapshot();
    };
    const first = startSim({ level: 4 }, "replay");
    const firstBoard = getActiveLayout().ascii;
    const firstRun = script(first);
    const second = startSim({ level: 4 }, "replay");
    expect(getActiveLayout().ascii).toBe(firstBoard);
    expect(script(second)).toEqual(firstRun);

    startSim({ level: 4 }, "other");
    expect(getActiveLayout().ascii).not.toBe(firstBoard);
  });

  describe("ghost house release", () => {
    const allGhosts = [GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky, GHOST_KIND.clyde];

    function inHouse(sim: PlaySim, kind: string): boolean {
      return sim.snapshot().ghosts.find((g) => g.kind === kind)!.phase === "inHouse";
    }

    function getCaught(sim: PlaySim): void {
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      runUntil(sim, () => !sim.snapshot().dying, 400);
    }

    it("level 3 lets all four ghosts out without eating a dot", () => {
      const sim = startSim({ level: 3, maze: "maze1", ghosts: allGhosts });
      runFrames(sim, 30, { keys: held("up") });
      const snap = sim.snapshot();
      expect(snap.boardCollected).toBe(0);
      expect(snap.ghosts.map((g) => g.phase)).not.toContain("inHouse");
    });

    it("keeps ghosts in until the first direction input", () => {
      const sim = startSim({ level: 3, maze: "maze1", ghosts: allGhosts });
      runFrames(sim, 120);
      expect(sim.snapshot().ghosts.every((g) => g.phase === "inHouse")).toBe(true);
      runFrames(sim, 30, { keys: held("up") });
      expect(sim.snapshot().ghosts.some((g) => g.phase === "inHouse")).toBe(false);
    });

    it("level 2 pushes out Clyde after 4s without eating", () => {
      const sim = startSim({
        level: 2,
        maze: "maze1",
        ghosts: [GHOST_KIND.clyde],
      });
      runFrames(sim, 230, { keys: held("up") });
      expect(inHouse(sim, "clyde")).toBe(true);
      runFrames(sim, 20, { keys: held("up") });
      expect(inHouse(sim, "clyde")).toBe(false);
      expect(sim.snapshot().boardCollected).toBe(0);
    });

    it("after a death, Pinky waits for 7 dots eaten since the death", () => {
      const sim = startSim({
        level: 3,
        maze: "maze1",
        ghosts: [GHOST_KIND.blinky, GHOST_KIND.pinky],
      });
      runFrames(sim, 40, { keys: held("left") });
      getCaught(sim);
      const baseline = sim.snapshot().boardCollected;
      expect(baseline).toBeGreaterThan(0);
      expect(inHouse(sim, "pinky")).toBe(true);
      runUntil(sim, () => !inHouse(sim, "pinky"), 600, { keys: held("right") });
      const eaten = sim.snapshot().boardCollected - baseline;
      expect(eaten).toBeGreaterThanOrEqual(7);
      expect(eaten).toBeLessThanOrEqual(8);
    });

    it("level 5 idle release comes after 3s, not 4s", () => {
      const sim = startSim({
        level: 5,
        maze: "maze1",
        ghosts: [GHOST_KIND.clyde],
      });
      getCaught(sim);
      runFrames(sim, 170, { keys: held("up") });
      expect(inHouse(sim, "clyde")).toBe(true);
      runFrames(sim, 30, { keys: held("up") });
      expect(inHouse(sim, "clyde")).toBe(false);
    });
  });

  it("opens later levels in scatter, then switches to chase after the arcade scatter", () => {
    const sim = startSim(
      { level: 5, infiniteLives: true, ghosts: [GHOST_KIND.blinky] },
      "scatter-open",
    );
    expect(sim.snapshot().ghostMode).toBe("scatter");
    runUntil(sim, () => sim.snapshot().ghosts.some((g) => g.phase === "active"), 1200, {
      keys: held("left"),
    });
    expect(sim.snapshot().ghostMode).toBe("scatter");
    runFrames(sim, Math.ceil(5.5 * 60), { keys: held("left") });
    expect(sim.snapshot().ghostMode).toBe("chase");
  });

  it("aims Blinky's eyes at Dot-Man from level 4 on", () => {
    const early = startSim(
      { level: 3, infiniteLives: true, ghosts: [GHOST_KIND.blinky] },
      "eyes-3",
    );
    expect(early.renderOptions().pupilTarget).toBeNull();

    const sim = startSim({ level: 4, infiniteLives: true, ghosts: [GHOST_KIND.blinky] }, "eyes-4");
    const target = sim.renderOptions().pupilTarget;
    const blinky = query(sim.world, [Ghost, GhostKind]).filter(
      (eid) => GhostKind.kind[eid] === GHOST_KIND.blinky,
    );
    expect(blinky).toHaveLength(1);
    expect(target?.eids).toEqual(blinky);
    const player = sim.playerWorldPosition()!;
    expect(target).toMatchObject({ x: player.x, y: player.y });
  });

  it("tapers scatter to one short window on level 8 and none on the level 9 boss", () => {
    const l8 = startSim(
      { level: 8, maze: "maze1", godMode: true, ghosts: [GHOST_KIND.blinky] },
      "taper-8",
    );
    expect(l8.snapshot().ghostMode).toBe("scatter");
    runFrames(l8, Math.ceil(3.5 * 60), { keys: held("left") });
    expect(l8.snapshot().ghostMode).toBe("chase");
    runFrames(l8, 60 * 30, { keys: held("left") });
    expect(l8.snapshot().ghostMode).toBe("chase");

    const boss = startSim({ level: 9, boss: "blinkySwarm", infiniteLives: true }, "taper-9");
    const modes = new Set<string>();
    for (let i = 0; i < 60 * 30; i += 1) {
      runFrames(boss, 1, { keys: held("left") });
      modes.add(boss.snapshot().ghostMode);
    }
    expect([...modes]).toEqual(["chase"]);
  });

  it("drops out of scatter once fewer than 15 pellets remain", () => {
    const sim = startSim({ level: 2, godMode: true }, "scatter-low-pellets");
    const eatDownTo = (left: number): void => {
      for (const eid of regularPelletEids(sim)) {
        if (sim.snapshot().pelletsRemaining <= left) {
          return;
        }
        eatPelletAt(sim, eid);
      }
    };
    eatDownTo(15);
    expect(sim.snapshot().pelletsRemaining).toBe(15);
    expect(sim.snapshot().ghostMode).toBe("scatter");
    eatDownTo(14);
    expect(sim.snapshot().pelletsRemaining).toBe(14);
    expect(sim.snapshot().ghostMode).toBe("chase");
    runFrames(sim, 60 * 8);
    expect(sim.snapshot().ghostMode).toBe("chase");
  });

  describe("Cruise Elroy", () => {
    function eatDownTo(sim: PlaySim, left: number): void {
      for (const eid of regularPelletEids(sim)) {
        if (sim.snapshot().pelletsRemaining <= left) {
          return;
        }
        eatPelletAt(sim, eid);
      }
    }

    function kindOntoPlayer(sim: PlaySim, kind: GhostKindId): void {
      const ghost = query(sim.world, [Ghost, GhostKind, Position]).find(
        (eid) => GhostKind.kind[eid] === kind,
      )!;
      const player = playerEid(sim);
      Position.x[ghost] = Position.x[player]!;
      Position.y[ghost] = Position.y[player]!;
      GhostPhase.value[ghost] = GHOST_PHASE.active;
    }

    function blinkySpeed(sim: PlaySim): number {
      const eid = query(sim.world, [Ghost, GhostKind]).find(
        (e) => GhostKind.kind[e] === GHOST_KIND.blinky,
      )!;
      return Speed.px[eid]!;
    }

    function waitBlinkyActive(sim: PlaySim): void {
      runUntil(
        sim,
        () => sim.snapshot().ghosts.find((g) => g.kind === "blinky")?.phase === "active",
        3000,
        { keys: held("left") },
      );
      runFrames(sim, 1, { keys: held("left") });
    }

    it("suppresses Elroy for the rest of the board after Blinky takes a life", () => {
      const sim = startSim(
        { level: 2, maze: "maze1", ghosts: [GHOST_KIND.blinky, GHOST_KIND.pinky] },
        "elroy-life",
      );
      const livesBefore = sim.snapshot().lives;
      eatDownTo(sim, 10);
      waitBlinkyActive(sim);
      expect(sim.snapshot().elroyTier).toBe(2);
      const elroySpeed = blinkySpeed(sim);
      expect(elroySpeed).toBeGreaterThan(0);
      kindOntoPlayer(sim, GHOST_KIND.blinky);
      runFrames(sim, 1);
      expect(sim.snapshot().lives).toBe(livesBefore - 1);
      expect(sim.snapshot().elroySuppressed).toBe(true);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      waitBlinkyActive(sim);
      expect(sim.snapshot().elroyTier).toBe(0);
      expect(sim.snapshot().elroySuppressed).toBe(true);
      expect(blinkySpeed(sim)).toBeLessThan(elroySpeed);
      expect(blinkySpeed(sim)).toBeCloseTo(
        PLAYER_SPEED * ghostBaseSpeedRatio(2) * speedLevelMultiplier(2),
      );
    });

    it("keeps Elroy when a non-Blinky ghost takes the life", () => {
      const sim = startSim(
        { level: 2, maze: "maze1", ghosts: [GHOST_KIND.blinky, GHOST_KIND.pinky] },
        "elroy-pinky-kill",
      );
      const livesBefore = sim.snapshot().lives;
      eatDownTo(sim, 10);
      waitBlinkyActive(sim);
      expect(sim.snapshot().elroyTier).toBe(2);
      kindOntoPlayer(sim, GHOST_KIND.pinky);
      runFrames(sim, 1);
      expect(sim.snapshot().lives).toBe(livesBefore - 1);
      expect(sim.snapshot().elroySuppressed).toBe(false);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      waitBlinkyActive(sim);
      expect(sim.snapshot().elroyTier).toBe(2);
    });

    it("keeps Elroy when Defy Death saves without spending a life", () => {
      const sim = startSim(
        {
          level: 2,
          maze: "maze1",
          ghosts: [GHOST_KIND.blinky],
          enableUpgrades: ["passiveDefyDeath"],
        },
        "elroy-defy",
      );
      eatDownTo(sim, 10);
      waitBlinkyActive(sim);
      const power = query(sim.world, [PowerPellet, Position])[0]!;
      teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      runFrames(sim, 1);
      const livesBefore = sim.snapshot().lives;
      kindOntoPlayer(sim, GHOST_KIND.blinky);
      runFrames(sim, 1);
      expect(sim.snapshot().lives).toBe(livesBefore);
      expect(sim.snapshot().elroySuppressed).toBe(false);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      waitBlinkyActive(sim);
      expect(sim.snapshot().elroyTier).toBe(2);
    });
  });

  it("moves ghosts at tunnel speed while they leave the house, then at full speed", () => {
    const sim = startSim({ level: 2, infiniteLives: true }, "house-exit-speed");
    const leaving = () =>
      sim.snapshot().ghosts.find((g) => g.phase === "leaving" && g.kind !== "blinky");
    runUntil(sim, () => leaving() !== undefined, 3000, { keys: held("left") });
    const ghost = leaving();
    expect(ghost).toBeDefined();
    const leavingSpeed = Speed.px[ghost!.eid] ?? 0;

    runUntil(
      sim,
      () => sim.snapshot().ghosts.find((g) => g.eid === ghost!.eid)?.phase === "active",
      600,
      {
        keys: held("left"),
      },
    );
    runFrames(sim, 2, { keys: held("left") });
    const activeSpeed = Speed.px[ghost!.eid] ?? 0;
    expect(leavingSpeed).toBeLessThan(PLAYER_SPEED);
    expect(leavingSpeed / activeSpeed).toBeCloseTo(0.5 / 0.85);
  });
});

describe("Ghost Harvester", () => {
  function regularPelletFarFrom(sim: PlaySim, x: number, y: number): number {
    return query(sim.world, [Pellet, Position])
      .filter((eid) => !hasComponent(sim.world, eid, PowerPellet))
      .sort(
        (a, b) =>
          Math.hypot(Position.x[b]! - x, Position.y[b]! - y) -
          Math.hypot(Position.x[a]! - x, Position.y[a]! - y),
      )[0]!;
  }

  function armWithPowerPellet(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.ghostHarvestMs).toBeGreaterThan(0);
  }

  function parkGhostOn(sim: PlaySim, pellet: number): void {
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    Position.x[ghost] = Position.x[pellet]!;
    Position.y[ghost] = Position.y[pellet]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
  }

  it("lets ghosts eat pellets for the player while the timer runs, then stops", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletGhostHarvester"],
    });
    armWithPowerPellet(sim);
    const player = playerEid(sim);
    const target = regularPelletFarFrom(sim, Position.x[player]!, Position.y[player]!);
    const house = ghostHouseSpawnCenter();
    teleportPlayer(sim, house.x, house.y);
    const before = sim.snapshot().boardCollected;
    parkGhostOn(sim, target);
    const events = runFrames(sim, 1);
    expect(query(sim.world, [Pellet]).includes(target)).toBe(false);
    expect(sim.snapshot().boardCollected).toBeGreaterThan(before);
    expect(count(events, "pelletSfx")).toBeGreaterThan(0);

    runUntil(sim, () => sim.snapshot().timers.ghostHarvestMs === 0, 400);
    const next = regularPelletFarFrom(sim, Position.x[player]!, Position.y[player]!);
    parkGhostOn(sim, next);
    runFrames(sim, 1);
    expect(query(sim.world, [Pellet]).includes(next)).toBe(true);
  });

  it("does not recolor ghosts while the timer runs", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletGhostHarvester"],
    });
    armWithPowerPellet(sim);
    const events = runFrames(sim, 5);
    const draws = events.flatMap((event) => (event.type === "draw" ? [event.options] : []));
    expect(draws.length).toBeGreaterThan(0);
    expect(draws.every((options) => !("ghostHarvestActive" in options))).toBe(true);
  });

  it("leaves power pellets to the player", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletGhostHarvester"],
    });
    armWithPowerPellet(sim);
    const player = playerEid(sim);
    const target = [...query(sim.world, [PowerPellet, Position])].sort(
      (a, b) =>
        Math.hypot(Position.x[b]! - Position.x[player]!, Position.y[b]! - Position.y[player]!) -
        Math.hypot(Position.x[a]! - Position.x[player]!, Position.y[a]! - Position.y[player]!),
    )[0]!;
    parkGhostOn(sim, target);
    runFrames(sim, 1);
    expect(query(sim.world, [PowerPellet]).includes(target)).toBe(true);
  });

  it("does nothing without the upgrade", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [] });
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.ghostHarvestMs).toBe(0);
  });

  it("counts a ghost eating the last pellet as a level clear", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletGhostHarvester"],
    });
    armWithPowerPellet(sim);
    for (let i = 0; i < 2000 && sim.offer() === null; i += 1) {
      const pellets = [...query(sim.world, [Pellet, Position])];
      const power = pellets.find((eid) => hasComponent(sim.world, eid, PowerPellet));
      const regular = pellets.find((eid) => !hasComponent(sim.world, eid, PowerPellet));
      const rearm = sim.snapshot().timers.ghostHarvestMs < 500;
      if (power !== undefined && (rearm || regular === undefined)) {
        teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      } else if (regular !== undefined) {
        parkGhostOn(sim, regular);
      } else {
        break;
      }
      runFrames(sim, 1);
    }
    drainToOffer(sim);
  });
});

describe("PlaySim pennies", () => {
  function startCorridor(overrides: Partial<PlayOptions> = {}): PlaySim {
    return startSim({ level: 2, maze: "maze1", infiniteLives: true, ...overrides }, "bonus1");
  }

  function penniesEvents(events: SimEvent[]): Extract<SimEvent, { type: "pennies" }>[] {
    return events.filter((e): e is Extract<SimEvent, { type: "pennies" }> => e.type === "pennies");
  }

  it("bumps the bar when a streak reaches 5", () => {
    const sim = startCorridor();
    const events = runUntil(sim, () => sim.snapshot().pennies.streak >= 5, 120, {
      keys: held("left"),
    });
    expect(sim.snapshot().pennies.charge).toBe(2);
    expect(penniesEvents(events)).toEqual([{ type: "pennies", tier: 1, filled: 0 }]);
  });

  it("breaks the streak when the player walks back over eaten tiles", () => {
    const sim = startCorridor();
    runUntil(sim, () => sim.snapshot().pennies.streak >= 6, 120, { keys: held("left") });
    const { charge } = sim.snapshot().pennies;
    const collected = sim.snapshot().boardCollected;
    runUntil(sim, () => sim.snapshot().pennies.streak === 0, 30, { keys: held("right") });
    expect(sim.snapshot().boardCollected).toBe(collected);
    expect(sim.snapshot().pennies.charge).toBe(charge);
  });

  it("breaks the streak after stopping against a wall", () => {
    const sim = startCorridor();
    runUntil(sim, () => sim.snapshot().pennies.streak === 7, 120, { keys: held("left") });
    runFrames(sim, 20, { keys: held("left") });
    expect(sim.snapshot().pennies.streak).toBe(7);
    runFrames(sim, 10, { keys: held("left") });
    expect(sim.snapshot().pennies).toMatchObject({ streak: 0, charge: 2 });
    expect(sim.snapshot().boardCollected).toBe(7);
  });

  it("reports whole pennies in the charge and wraps to the remainder when a Quarter pays", () => {
    const sim = startCorridor({ pennyCharge: 299, quarters: 0 });
    expect(sim.snapshot().pennies).toMatchObject({ charge: 299, count: 23, max: 300 });
    runUntil(sim, () => sim.snapshot().pennies.streak >= 5, 120, { keys: held("left") });
    expect(sim.snapshot()).toMatchObject({ quarters: 1, pennies: { charge: 1, count: 0 } });
  });

  it("pays a Quarter when the bar fills and carries the rest", () => {
    const sim = startCorridor({ pennyCharge: 299, quarters: 0 });
    const events = runUntil(sim, () => sim.snapshot().pennies.streak >= 5, 120, {
      keys: held("left"),
    });
    expect(sim.snapshot().quarters).toBe(1);
    expect(sim.snapshot().slot).toMatchObject({ queued: 0, active: false, spins: 0 });
    expect(sim.snapshot().pennies.charge).toBe(1);
    expect(penniesEvents(events)).toEqual([{ type: "pennies", tier: 1, filled: 1 }]);
    expect(events).toContainEqual({ type: "quarters", pulse: true });
  });

  it("counts a power pellet once and ignores Extra Hungry's extra pellets", () => {
    const sim = startCorridor({ enableUpgrades: ["powerPelletExtraHungry"] });
    const power = Array.from(query(sim.world, [PowerPellet, Position]))[0]!;
    const collected = sim.snapshot().boardCollected;
    eatPelletAt(sim, power);
    expect(sim.snapshot().boardCollected).toBe(collected + 1 + EXTRA_HUNGRY_COUNT);
    expect(sim.snapshot().pennies.streak).toBe(1);
  });

  it("Extra Hungry eats the eight farthest regular pellets", () => {
    const sim = startCorridor({ enableUpgrades: ["powerPelletExtraHungry"] });
    const power = Array.from(query(sim.world, [PowerPellet, Position]))[0]!;
    const distFromPower = (eid: number) =>
      Math.hypot(Position.x[eid]! - Position.x[power]!, Position.y[eid]! - Position.y[power]!);
    const regulars = () =>
      Array.from(query(sim.world, [Pellet, Position])).filter((eid) => eid !== power);
    const expected = regulars()
      .sort((a, b) => distFromPower(b) - distFromPower(a) || a - b)
      .slice(0, EXTRA_HUNGRY_COUNT);
    eatPelletAt(sim, power);
    const remaining = new Set(regulars());
    expect(expected.filter((eid) => remaining.has(eid))).toEqual([]);
  });

  it("resets the streak on death and keeps the charge", () => {
    const sim = startCorridor({ pennyCharge: 40 });
    runUntil(sim, () => sim.snapshot().pennies.streak >= 5, 120, { keys: held("left") });
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().pennies).toMatchObject({ streak: 0, charge: 42 });
  });

  it("keeps the charge, plus the time bonus, across a level advance", () => {
    const sim = startSim({ jumpToUpgrade: true, pennyCharge: 50 });
    takeFirstOffered(sim);
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 500);
    expect(sim.snapshot().pennies).toMatchObject({ streak: 0, charge: 193 });
  });
});

describe("PlaySim slot machine", () => {
  function startSlotSim(overrides: Partial<PlayOptions> = {}, seed = "slots1"): PlaySim {
    return startSim(
      { level: 2, maze: "maze1", infiniteLives: true, pennyCharge: 299, slot: null, ...overrides },
      seed,
    );
  }

  function spinFromStreak(sim: PlaySim): void {
    sim["slotQueue"].push("pennyBar");
    runUntil(sim, () => sim.snapshot().slot.active, 180, { keys: held("left") });
  }

  it("pauses play on a queued spin and pays every line the reels show", () => {
    const sim = startSlotSim();
    spinFromStreak(sim);
    const before = sim.snapshot();
    const totals = slotWinTotals(before.slot.wins!);
    runFrames(sim, 30, { keys: held("left") });
    const during = sim.snapshot();
    expect(during.slot.active).toBe(true);
    expect(during.player).toEqual(before.player);
    expect(during.timeRemaining).toBe(before.timeRemaining);
    expect(during.boardCollected).toBe(before.boardCollected);
    settleSlots(sim);
    const after = sim.snapshot();
    expect(after.slot.spins).toBe(1);
    expect(after.quarters - before.quarters).toBe(totals.quarters);
    expect(after.lives - before.lives).toBe(totals.lives);
    expect(after.upgrades.length - before.upgrades.length).toBe(totals.upgrades);
  });

  it("holds on the final grid until the player acknowledges it", () => {
    const sim = startSlotSim({ slot: { quarters: 1, upgrades: 0, lives: 0 }, quarters: 0 });
    spinFromStreak(sim);
    runUntil(sim, () => sim.snapshot().slot.held, 600, { keys: held("left") });
    expect(sim.snapshot().quarters).toBe(1);
    const before = sim.snapshot();
    runFrames(sim, 600, { keys: held("left") });
    expect(sim.snapshot().slot).toMatchObject({ active: true, held: true });
    expect(sim.snapshot().player).toEqual(before.player);
    expect(sim.snapshot().timeRemaining).toBe(before.timeRemaining);
    runFrames(sim, 1, { acknowledge: true });
    expect(sim.snapshot().slot.active).toBe(false);
    runFrames(sim, 10, { keys: held("left") });
    expect(sim.snapshot().player).not.toEqual(before.player);
  });

  it("ignores a press during the spin; only a press on the held grid closes it", () => {
    const sim = startSlotSim({ slot: { quarters: 1, upgrades: 0, lives: 0 } });
    spinFromStreak(sim);
    runFrames(sim, 30, { acknowledge: true });
    expect(sim.snapshot().slot).toMatchObject({ active: true, held: false });
  });

  it("plays the spin sound at the start and one result sound per spin, named for its outcome", () => {
    const cases = [
      [{ quarters: 0, upgrades: 0, lives: 0 }, ["slotFailure"]],
      [{ quarters: 1, upgrades: 0, lives: 0 }, ["slotSingleSuccess"]],
      [{ quarters: 2, upgrades: 0, lives: 0 }, ["slotMultiSuccess"]],
      [{ quarters: 3, upgrades: 0, lives: 0 }, ["slotMultiSuccess", "slotMegaBonus"]],
    ] as const;
    const slotSfx = [
      "slotSpin",
      "slotFailure",
      "slotSingleSuccess",
      "slotMultiSuccess",
      "slotMegaBonus",
    ];
    for (const [slot, expected] of cases) {
      const sim = startSlotSim({ slot });
      sim["slotQueue"].push("pennyBar");
      const events = [
        ...runUntil(sim, () => sim.snapshot().slot.active, 180, { keys: held("left") }),
        ...settleSlots(sim),
      ];
      const heard = events.flatMap((e) =>
        e.type === "sfx" && slotSfx.includes(e.id) ? [e.id] : [],
      );
      expect(heard).toEqual(["slotSpin", ...expected]);
    }
  });

  it("titles a miss NO PRIZE and a win BONUS! on the held grid", () => {
    for (const [slot, title] of [
      [{ quarters: 0, upgrades: 0, lives: 0 }, "NO PRIZE"],
      [{ quarters: 1, upgrades: 0, lives: 0 }, "BONUS!"],
    ] as const) {
      const sim = startSlotSim({ slot });
      spinFromStreak(sim);
      runUntil(sim, () => sim.snapshot().slot.held, 600, { keys: held("left") });
      const view = sim.slotView()!;
      expect(slotFrame(view.spin, view.timeline, view.elapsedMs).title).toBe(title);
    }
  });

  it("jumpToSpinner starts on level 2 with one spin queued", () => {
    const sim = startSim({ jumpToSpinner: true, slot: null });
    expect(sim.snapshot()).toMatchObject({ level: 2, quarters: 0 });
    expect(sim.snapshot().slot.queued).toBe(1);
    runFrames(sim, 1);
    expect(sim.snapshot().slot.active).toBe(true);
    settleSlots(sim);
    expect(sim.snapshot().slot).toMatchObject({ spins: 1, active: false, queued: 0 });
  });

  it("replays the same reels for the same seed", () => {
    const grids = [0, 1].map(() => {
      const sim = startSlotSim({}, "slots-replay");
      spinFromStreak(sim);
      return sim.snapshot().slot.grid;
    });
    expect(grids[0]).toEqual(grids[1]);
  });

  it("grants a random upgrade from the school on the winning line", () => {
    const sim = startSlotSim({ slot: { quarters: 0, upgrades: 1, lives: 0 } });
    spinFromStreak(sim);
    const school = sim.snapshot().slot.wins![0]!.symbol;
    const owned = sim.snapshot().upgrades.length;
    const events = runUntil(sim, () => sim.snapshot().slot.held, 600);
    expect(sim.snapshot().slot.won).toEqual([sim.snapshot().upgrades.at(-1)]);
    settleSlots(sim);
    const { upgrades } = sim.snapshot();
    expect(upgrades).toHaveLength(owned + 1);
    expect(getUpgradeDef(upgrades.at(-1)!).school).toBe(school);
    expect(events).toContainEqual({ type: "upgrades" });
    expect(sim.runLogRecord().loadout.at(-1)).toMatchObject({ source: "slots", level: 2 });
  });

  it("pays a Quarter instead when the school has nothing left", () => {
    const sim = startSlotSim({
      slot: { quarters: 0, upgrades: 1, lives: 0 },
      enableUpgrades: [...ALL_UPGRADE_IDS],
      quarters: 0,
    });
    spinFromStreak(sim);
    const owned = sim.snapshot().upgrades.length;
    settleSlots(sim);
    expect(sim.snapshot().upgrades).toHaveLength(owned);
    expect(sim.snapshot().quarters).toBe(1);
  });

  it("adds a life on a life line while below the life cap", () => {
    const sim = startSlotSim({
      infiniteLives: false,
      lives: 2,
      maxLives: 4,
      slot: { quarters: 0, upgrades: 0, lives: 1 },
    });
    spinFromStreak(sim);
    settleSlots(sim);
    expect(sim.snapshot().lives).toBe(3);
  });

  it("keeps the life symbol off the reels at the life cap", () => {
    for (const seed of ["cap-a", "cap-b", "cap-c", "cap-d"]) {
      const sim = startSlotSim({ infiniteLives: false, lives: 4, maxLives: 4 }, seed);
      spinFromStreak(sim);
      expect(sim.snapshot().slot.grid!.flat()).not.toContain("life");
    }
  });

  it("runs one spin per fill, back to back, and pays them in order", () => {
    const sim = startSlotSim({ slot: { quarters: 2, upgrades: 0, lives: 0 }, quarters: 0 });
    sim["slotQueue"].push("pennyBar", "pennyBar");
    expect(sim.snapshot().slot.queued).toBe(2);
    runFrames(sim, 1);
    expect(sim.snapshot().slot).toMatchObject({ active: true, queued: 1 });
    settleSlots(sim);
    expect(sim.snapshot().slot.spins).toBe(2);
    expect(sim.snapshot().quarters).toBe(4);
  });

  it("holds the time drain and the upgrade offer until the spin ends", () => {
    const sim = startSlotSim({ jumpToUpgrade: true, slot: { quarters: 1, upgrades: 0, lives: 0 } });
    runUntil(sim, () => sim.snapshot().pennies.draining, 120);
    sim["slotQueue"].push("pennyBar");
    runFrames(sim, 1);
    expect(sim.snapshot().slot.active).toBe(true);
    const remaining = sim.snapshot().timeRemaining;
    expect(sim.snapshot().pennies.draining).toBe(true);
    runFrames(sim, 60);
    expect(sim.snapshot().timeRemaining).toBe(remaining);
    expect(sim.offer()).toBeNull();
    settleSlots(sim);
    expect(drainToOffer(sim)).not.toBeNull();
  });
});

describe("PlaySim slot-machine world pickup", () => {
  it("spawns one machine every four non-slot Quarters", () => {
    const sim = startSim({ level: 2, maze: "maze1" }, "slot-pick-spawn");
    expect(sim.snapshot().slotPickup).toMatchObject({
      progress: 0,
      count: 0,
      awaitingPlacement: 0,
    });
    sim["grantQuarters"](3, "inheritance", true);
    expect(sim.snapshot().slotPickup).toMatchObject({ progress: 3, count: 0 });
    sim["grantQuarters"](1, "inheritance", true);
    expect(sim.snapshot().slotPickup.count).toBe(1);
    expect(sim.snapshot().slotPickup.progress).toBe(0);
    expect(sim.snapshot().slotPickup.cells).toHaveLength(1);
  });

  it("does not advance progress from slot-spin Quarter payouts", () => {
    const sim = startSim(
      { level: 2, maze: "maze1", slot: { quarters: 1, upgrades: 0, lives: 0 }, quarters: 0 },
      "slot-pick-pay",
    );
    sim["grantQuarters"](3, "inheritance", true);
    expect(sim.snapshot().slotPickup.progress).toBe(3);
    sim["slotQueue"].push("pennyBar");
    runFrames(sim, 1);
    settleSlots(sim);
    expect(sim.snapshot().quarters).toBeGreaterThan(0);
    expect(sim.snapshot().slotPickup).toMatchObject({ progress: 3, count: 0 });
  });

  it("queues a slot spin when the player crosses a machine", () => {
    const sim = startSim(
      { level: 2, maze: "maze1", slotMachine: true, slot: { quarters: 0, upgrades: 0, lives: 0 } },
      "slot-pick-collect",
    );
    expect(sim.snapshot().slotPickup.count).toBe(1);
    const cell = sim.snapshot().slotPickup.cells[0]!;
    teleportPlayer(sim, cellCenterX(cell.col), cellCenterY(cell.row));
    runFrames(sim, 1);
    expect(sim.snapshot().slotPickup.count).toBe(0);
    expect(sim.snapshot().slot.active || sim.snapshot().slot.queued > 0).toBe(true);
    settleSlots(sim);
    expect(sim.snapshot().slot.spins).toBe(1);
  });

  it("keeps exact cells across a level advance on the pool map", () => {
    const sim = startSim(
      {
        level: 2,
        slotMachine: true,
        disableLevelUpgrades: true,
        jumpToUpgrade: true,
        levelModifiers: false,
      },
      "slot-pick-carry",
    );
    const cells = sim.snapshot().slotPickup.cells.map((cell) => ({ ...cell }));
    expect(cells).toHaveLength(1);
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 900, {
      acknowledge: true,
    });
    expect(sim.snapshot().level).toBe(3);
    expect(sim.snapshot().slotPickup.cells).toEqual(cells);
  });

  it("hides through a store and respawns on the next play board", () => {
    const sim = startSim({ level: 3, slotMachine: true, levelModifiers: false }, "slot-pick-store");
    expect(sim.snapshot().slotPickup.count).toBe(1);
    const cells = sim.snapshot().slotPickup.cells.map((cell) => ({ ...cell }));
    (sim as unknown as { enterStore(): void }).enterStore();
    runUntil(sim, () => !sim.snapshot().storeEntering, 120);
    expect(sim.snapshot().inStore).toBe(true);
    expect(sim.snapshot().slotPickup.cells).toEqual(cells);
    (sim as unknown as { exitStore(): void }).exitStore();
    expect(sim.snapshot().level).toBe(4);
    expect(sim.snapshot().slotPickup.count).toBe(1);
    expect(sim.snapshot().slotPickup.cells).toEqual(cells);
  });

  it("banks spawns earned in the store until the next play board", () => {
    const sim = startSim({ store: 1, level: 3, levelModifiers: false }, "slot-pick-await");
    expect(sim.snapshot().inStore).toBe(true);
    sim["grantQuarters"](4, "inheritance", true);
    expect(sim.snapshot().slotPickup).toMatchObject({
      awaitingPlacement: 1,
      count: 0,
    });
    (sim as unknown as { exitStore(): void }).exitStore();
    expect(sim.snapshot().slotPickup).toMatchObject({ awaitingPlacement: 0, count: 1 });
  });

  it("drops carried machines when the boss board starts", () => {
    const sim = startSim(
      {
        level: 8,
        slotMachine: true,
        disableLevelUpgrades: true,
        jumpToUpgrade: true,
        levelModifiers: false,
      },
      "slot-pick-boss",
    );
    expect(sim.snapshot().slotPickup.count).toBe(1);
    runUntil(sim, () => sim.snapshot().inStore && !sim.snapshot().storeEntering, 1200, {
      acknowledge: true,
    });
    expect(sim.snapshot().slotPickup.count).toBeGreaterThan(0);
    sim["grantQuarters"](4, "inheritance", true);
    expect(sim.snapshot().slotPickup.awaitingPlacement).toBeGreaterThanOrEqual(1);
    (sim as unknown as { exitStore(): void }).exitStore();
    expect(sim.snapshot().level).toBe(9);
    expect(sim.snapshot().boss).not.toBeNull();
    expect(sim.snapshot().slotPickup).toMatchObject({ count: 0, awaitingPlacement: 0 });
  });

  it("remaps a carried cell that collapse turns into a wall", () => {
    const sim = startSim({ level: 5, slotMachine: true }, "slot-pick-collapse");
    const wall = sim.snapshot().collapse.chains[0]?.[0];
    expect(wall).toBeDefined();
    sim["slotPickupCells"] = [{ col: wall!.col, row: wall!.row }];
    (sim as unknown as { startBoard(override: null): void }).startBoard(null);
    const cell = sim.snapshot().slotPickup.cells[0]!;
    expect(isWalkable(cell.col, cell.row)).toBe(true);
    expect(cell).not.toEqual({ col: wall!.col, row: wall!.row });
  });

  it("places a machine when ?slotMachine=1 starts an eligible board", () => {
    const sim = startSim({ level: 2, maze: "maze1", slotMachine: true }, "slot-pick-flag");
    expect(sim.snapshot().slotPickup.count).toBe(1);
  });
});

describe("PlaySim ?fruit=1", () => {
  it("starts each board with a fruit already out", () => {
    const sim = startSim({ level: 2, maze: "maze1", fruit: true });
    expect(sim.snapshot().fruit).toBe(true);
    expect(query(sim.world, [Fruit, Position])).toHaveLength(1);
  });

  it("still spawns the pellet-threshold fruit after the flag fruit expires", () => {
    const sim = startSim({ level: 2, maze: "maze1", fruit: true });
    runFrames(sim, Math.ceil((FRUIT_LIFETIME_MS + 500) / FRAME_MS));
    expect(sim.snapshot().fruit).toBe(false);
    const [threshold] = getActiveLayout().fruitThresholds;
    for (const eid of regularPelletEids(sim).slice(0, threshold)) {
      eatPelletAt(sim, eid);
    }
    teleportPlayer(sim, 0, 0);
    expect(sim.snapshot().fruit).toBe(true);
  });

  it("starts with no fruit when the flag is off", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    expect(sim.snapshot().fruit).toBe(false);
  });
});

describe("Turn Tuning", () => {
  function findSideTurn(): { col: number; row: number } {
    const { playerSolids, cols, rows } = getActiveLayout();
    const open = (col: number, row: number, dx: number, dy: number) =>
      canEnterDirection(cellCenterX(col), cellCenterY(row), dx, dy, playerSolids);
    for (let row = 1; row < rows - 1; row += 1) {
      for (let col = 3; col < cols - 1; col += 1) {
        const straight = [3, 2, 1].every((back) => open(col - back, row, 1, 0));
        const sideless = [3, 2, 1].every(
          (back) => !open(col - back, row, 0, -1) && !open(col - back, row, 0, 1),
        );
        if (straight && sideless && open(col, row, 0, -1)) {
          return { col, row };
        }
      }
    }
    throw new Error("no side turn found");
  }

  function setup(enable: boolean | "plus") {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades:
        enable === "plus" ? ["passiveTurnTuningPlus"] : enable ? ["passiveTurnTuning"] : [],
    });
    const turn = findSideTurn();
    return { sim, turn };
  }

  const cruise = { keys: held("right") };
  const tapUp = { keys: { ...NO_KEYS_HELD, right: 0, up: 1 } };

  function cruiseFrom(sim: PlaySim, turn: { col: number; row: number }, tilesBefore: number) {
    teleportPlayer(sim, cellCenterX(turn.col - tilesBefore), cellCenterY(turn.row));
    runFrames(sim, 2, cruise);
  }

  function placeAhead(sim: PlaySim, turn: { col: number; row: number }, aheadPx: number) {
    teleportPlayer(sim, cellCenterX(turn.col) - aheadPx, cellCenterY(turn.row));
  }

  it("ignores a turn tapped more than two tiles before the junction, even if held into it", () => {
    const { sim, turn } = setup(true);
    cruiseFrom(sim, turn, 3);
    runFrames(sim, 1, tapUp);
    runUntil(sim, () => sim.snapshot().player!.col > turn.col, 120, tapUp);
    expect(sim.snapshot().player!.row).toBe(turn.row);
    expect(sim.snapshot().player!.facing).toBe("right");
    expect(sim.snapshot().timers.turnBoostMs).toBe(0);
  });

  it("takes an early turn normally without the upgrade", () => {
    const { sim, turn } = setup(false);
    cruiseFrom(sim, turn, 3);
    runFrames(sim, 1, tapUp);
    runUntil(sim, () => sim.snapshot().player!.row < turn.row, 120, tapUp);
    expect(sim.snapshot().player!.facing).toBe("up");
  });

  it("turns on a tap up to two tiles early but only rewards a tap on the beat", () => {
    const { sim, turn } = setup(true);
    cruiseFrom(sim, turn, 2);
    placeAhead(sim, turn, 28);
    runFrames(sim, 1, tapUp);
    runUntil(sim, () => sim.snapshot().player!.row < turn.row, 60, cruise);
    expect(sim.snapshot().player!.col).toBe(turn.col);
    expect(sim.snapshot().player!.facing).toBe("up");
    expect(sim.snapshot().timers.turnBoostMs).toBe(0);
    expect(sim.snapshot().timers.turnFlashMs).toBe(0);
  });

  it("boosts and flashes on a clean tap on the beat, then eases both out", () => {
    const { sim, turn } = setup(true);
    cruiseFrom(sim, turn, 2);
    placeAhead(sim, turn, 6);
    runFrames(sim, 1, tapUp);
    runUntil(sim, () => sim.snapshot().timers.turnBoostMs > 0, 60, cruise);
    expect(sim.snapshot().player!.facing).toBe("up");
    expect(sim.snapshot().timers.turnBoostMs).toBeGreaterThan(400);
    expect(sim.renderOptions().turnFlashRemainingMs).toBeGreaterThan(200);

    runFrames(sim, 40, { keys: held("up") });
    expect(sim.snapshot().timers.turnBoostMs).toBe(0);
    expect(sim.renderOptions().turnFlashRemainingMs).toBe(0);
  });

  it("keeps Dot-Man gold through a turn flash while invulnerable", () => {
    const { sim, turn } = setup(true);
    sim["runUpgrades"] = { ...sim["runUpgrades"], invulnRemainingMs: INVULN_MS };
    cruiseFrom(sim, turn, 2);
    placeAhead(sim, turn, 6);
    runFrames(sim, 1, tapUp);
    runUntil(sim, () => sim.snapshot().timers.turnFlashMs > 0, 60, cruise);
    runFrames(sim, 3, { keys: held("up") });
    const opts = sim.renderOptions();
    const flash = turnFlashPulse(opts.turnFlashRemainingMs ?? 0);
    expect(opts.playerInvulnRemainingMs).toBeGreaterThan(0);
    expect(flash.brighten).toBeGreaterThan(0);
    expect(
      playerTint({
        wallPassOn: opts.wallPassActive === true,
        invulnRemainingMs: opts.playerInvulnRemainingMs ?? 0,
        nowMs: 0,
        flashBrighten: flash.brighten,
      }),
    ).toEqual({ color: brightenColor(PLAYER_INVULN_TINT, flash.brighten), mode: "multiply" });
  });

  it("Turn Tuning+ rewards a tap 10px early and holds the boost for 750ms", () => {
    for (const mode of [true, "plus"] as const) {
      const { sim, turn } = setup(mode);
      cruiseFrom(sim, turn, 2);
      placeAhead(sim, turn, 10);
      runFrames(sim, 1, tapUp);
      runUntil(sim, () => sim.snapshot().player!.row < turn.row, 60, cruise);
      const boost = sim.snapshot().timers.turnBoostMs;
      if (mode === true) {
        expect(boost).toBe(0);
      } else {
        expect(boost).toBeGreaterThan(600);
        expect(boost).toBeLessThanOrEqual(750);
      }
    }
  });

  it("gives no reward when the same key was pressed just before the beat", () => {
    const { sim, turn } = setup(true);
    cruiseFrom(sim, turn, 3);
    runFrames(sim, 1, tapUp);
    runFrames(sim, 4, cruise);
    placeAhead(sim, turn, 6);
    runFrames(sim, 1, tapUp);
    runUntil(sim, () => sim.snapshot().player!.row < turn.row, 60, cruise);
    expect(sim.snapshot().timers.turnBoostMs).toBe(0);
    expect(sim.snapshot().timers.turnFlashMs).toBe(0);
  });

  it("rewards the beat again once the earlier press is old enough", () => {
    const { sim, turn } = setup(true);
    cruiseFrom(sim, turn, 3);
    runFrames(sim, 1, tapUp);
    runFrames(sim, 20, cruise);
    placeAhead(sim, turn, 6);
    runFrames(sim, 1, tapUp);
    runUntil(sim, () => sim.snapshot().timers.turnBoostMs > 0, 60, cruise);
  });

  describe("turn feedback sparks", () => {
    function sparks(events: SimEvent[]) {
      return events.filter((event) => event.type === "turnSparks");
    }

    function tapAt(aheadPx: number, priorTap = false) {
      const { sim, turn } = setup(true);
      cruiseFrom(sim, turn, 3);
      const events: SimEvent[] = [];
      if (priorTap) {
        events.push(...runFrames(sim, 1, tapUp));
        events.push(...runFrames(sim, 4, cruise));
      }
      placeAhead(sim, turn, aheadPx);
      events.push(...runFrames(sim, 1, tapUp));
      events.push(...runFrames(sim, 30, cruise));
      return sparks(events);
    }

    it("sprays sparks out the front for a close tap, and only a shockwave on the beat", () => {
      const [close] = tapAt(14);
      expect(close).toMatchObject({ type: "turnSparks", kind: "close", dx: 1, dy: 0 });
      expect(close!.type === "turnSparks" && close!.count).toBeGreaterThan(0);
      const [perfect] = tapAt(6);
      expect(perfect).toMatchObject({ type: "turnSparks", kind: "perfect", count: 0 });
    });

    it("shows nothing for a far tap or a spammed tap", () => {
      expect(tapAt(28)).toHaveLength(0);
      expect(tapAt(14, true)).toHaveLength(0);
      expect(tapAt(6, true)).toHaveLength(0);
    });
  });

  it("does not boost a turn that is not a right angle", () => {
    const { sim, turn } = setup(true);
    cruiseFrom(sim, turn, 3);
    runFrames(sim, 4, { keys: held("left") });
    expect(sim.snapshot().player!.facing).toBe("left");
    expect(sim.snapshot().timers.turnBoostMs).toBe(0);
  });
});

describe("PlaySim fruit bonus charge", () => {
  function eatFruit(sim: PlaySim): SimEvent[] {
    const fruit = query(sim.world, [Fruit, Position])[0]!;
    teleportPlayer(sim, Position.x[fruit]!, Position.y[fruit]!);
    return runFrames(sim, 1);
  }

  function startWithFruit(overrides: Partial<PlayOptions>): PlaySim {
    const sim = startSim({ level: 2, maze: "maze1", infiniteLives: true, ...overrides });
    sim["spawnFruitEntity"](false);
    return sim;
  }

  it("charges half a bar and pays no Quarter on its own", () => {
    const sim = startWithFruit({ quarters: 0 });
    const events = eatFruit(sim);
    expect(sim.snapshot()).toMatchObject({ quarters: 0, pennies: { charge: 150 } });
    expect(events).not.toContainEqual({ type: "quarters", pulse: false });
    expect(events).toContainEqual({ type: "fruitBonus" });
  });

  it("emits no fruitBonus when fruit pays Quarters instead of charging", () => {
    const sim = startWithFruit({ quarters: 0, enableUpgrades: ["fruitQuarterBounty"] });
    expect(eatFruit(sim)).not.toContainEqual({ type: "fruitBonus" });
  });

  it("pays a Quarter when fruit fills the bar", () => {
    const sim = startWithFruit({ quarters: 0, pennyCharge: 200 });
    const events = eatFruit(sim);
    expect(sim.snapshot().slot.queued).toBe(0);
    expect(sim.snapshot()).toMatchObject({ quarters: 1, pennies: { charge: 50 } });
    expect(events).toContainEqual({ type: "pennies", tier: 0, filled: 1 });
  });

  it("Quarter Bounty pays a Quarter instead of charging the bar; Plus pays two", () => {
    const base = startWithFruit({
      quarters: 0,
      pennyCharge: 10,
      enableUpgrades: ["fruitQuarterBounty"],
    });
    eatFruit(base);
    expect(base.snapshot()).toMatchObject({ quarters: 1, pennies: { charge: 10 } });

    const plus = startWithFruit({
      quarters: 0,
      pennyCharge: 10,
      enableUpgrades: ["fruitQuarterBountyPlus"],
    });
    eatFruit(plus);
    expect(plus.snapshot()).toMatchObject({ quarters: 2, pennies: { charge: 10 } });
  });

  it("Fruit Power fires one random power effect; Plus fires all; neither turns a pellet hot", () => {
    const base = startWithFruit({
      enableUpgrades: ["fruitPowerPellet", "powerPelletInvuln", "powerPelletSpeedBurst"],
    });
    const basePowerBefore = query(base.world, [Pellet, PowerPellet]).length;
    eatFruit(base);
    const baseTimers = base.snapshot().timers;
    const baseFired = Number(baseTimers.invulnMs > 0) + Number(baseTimers.speedBurstMs > 0);
    expect(baseFired).toBe(1);
    expect(query(base.world, [Pellet, PowerPellet]).length).toBe(basePowerBefore);

    const plus = startWithFruit({
      enableUpgrades: ["fruitPowerPelletPlus", "powerPelletInvuln", "powerPelletSpeedBurst"],
    });
    const plusPowerBefore = query(plus.world, [Pellet, PowerPellet]).length;
    eatFruit(plus);
    expect(plus.snapshot().timers.invulnMs).toBeGreaterThan(0);
    expect(plus.snapshot().timers.speedBurstMs).toBeGreaterThan(0);
    expect(query(plus.world, [Pellet, PowerPellet]).length).toBe(plusPowerBefore);
  });
});

describe("PlaySim level-end time bonus", () => {
  function startClear(overrides: Partial<PlayOptions>): { sim: PlaySim; events: SimEvent[] } {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), jumpToUpgrade: true, slot: ONE_QUARTER_SLOT, ...overrides },
      "drain",
    );
    return { sim, events: sim.start() };
  }

  it("drains the timer into the bar before the upgrade offer", () => {
    const { sim, events } = startClear({ level: 2 });
    expect(events).toContainEqual({ type: "timePennies", active: true });
    runFrames(sim, 30);
    expect(sim.snapshot().pennies.draining).toBe(true);
    expect(sim.offer()).toBeNull();
    expect(sim.snapshot().timeRemaining).toBeLessThan(999);
    const rest = runUntil(sim, () => !sim.snapshot().pennies.draining, 600, { acknowledge: true });
    expect(rest).toContainEqual({ type: "timePennies", active: false });
    expect(sim.snapshot()).toMatchObject({
      timeRemaining: 0,
      quarters: 1,
      pennies: { charge: 143 },
    });
    expect(sim.offer()).not.toBeNull();
  });

  it("pays a Quarter mid-drain, before the offer opens", () => {
    const { sim } = startClear({ level: 2, pennyCharge: 200, quarters: 0 });
    const events = runUntil(sim, () => sim.snapshot().quarters === 1, 600);
    expect(sim.offer()).toBeNull();
    expect(sim.snapshot().pennies.draining).toBe(true);
    expect(events).toContainEqual({ type: "pennies", tier: 0, filled: 1 });
    drainToOffer(sim);
    expect(sim.snapshot()).toMatchObject({ quarters: 2, pennies: { charge: 43 } });
  });

  it("drains on level 1, then offers an upgrade before level 2", () => {
    const { sim } = startClear({ level: 1 });
    runUntil(sim, () => !sim.snapshot().pennies.draining, 600, { acknowledge: true });
    expect(sim.snapshot().pennies.charge).toBe(143);
    takeFirstOffered(sim);
    runUntil(sim, () => sim.snapshot().level === 2, 120);
  });

  it("skips the drain on the final boss clear", () => {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), level: 9, boss: "blinkySwarm", bossStageAdvance: true },
      "drain",
    );
    const startEvents = sim.start();
    expect(startEvents.some((e) => e.type === "timePennies")).toBe(false);
    runUntil(
      sim,
      () => sim.snapshot().boss?.stage === 2 && sim.snapshot().bossStageTransition === false,
      BOSS_STAGE_WAIT_FRAMES,
    );
    sim["jumpToLevelClear"]();
    const events = runFrames(sim, 90);
    expect(events.some((e) => e.type === "timePennies")).toBe(false);
    expect(sim.snapshot().pennies).toMatchObject({ charge: 0, draining: false });
    expect(events).toContainEqual({ type: "endText", title: "RUN COMPLETE" });
  });
});

describe("PlaySim run complete menu", () => {
  function clearBossRun(sim: PlaySim): void {
    if (sim.snapshot().bossStageTransition) {
      runUntil(
        sim,
        () => sim.snapshot().boss?.stage === 2 && sim.snapshot().bossStageTransition === false,
        BOSS_STAGE_WAIT_FRAMES,
      );
    } else if (sim.snapshot().boss?.stage === 1) {
      sim["jumpToLevelClear"]();
      runUntil(
        sim,
        () => sim.snapshot().boss?.stage === 2 && sim.snapshot().bossStageTransition === false,
        BOSS_STAGE_WAIT_FRAMES,
      );
    }
    sim["jumpToLevelClear"]();
    runUntil(sim, () => sim.snapshot().runComplete, 300);
  }

  function startRunComplete(): PlaySim {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), level: 9, boss: "blinkySwarm", bossStageAdvance: true },
      "run-end",
    );
    sim.start();
    clearBossRun(sim);
    return sim;
  }

  function armRunEndMenu(sim: PlaySim): void {
    runUntil(
      sim,
      () => sim.snapshot().runEndMenuArmed,
      Math.ceil(RUN_END_MENU_ARM_MS / FRAME_MS) + 1,
    );
  }

  it("waits on the screen instead of returning to the menu", () => {
    const sim = startRunComplete();
    const events = runFrames(sim, 600);
    expect(events.some((e) => e.type === "goToMenu")).toBe(false);
    expect(sim.snapshot()).toMatchObject({ runComplete: true, runEndMenuArmed: true });
  });

  it("ignores choices until the menu arms", () => {
    const sim = startRunComplete();
    expect(sim.snapshot().runEndMenuArmed).toBe(false);
    expect(sim.chooseRunEnd("menu")).toEqual([]);
    armRunEndMenu(sim);
    expect(sim.chooseRunEnd("menu")).toEqual([{ type: "goToMenu" }]);
  });

  it("starts a new game when chosen", () => {
    const sim = startRunComplete();
    armRunEndMenu(sim);
    expect(sim.chooseRunEnd("newGame")).toEqual([{ type: "newGame" }]);
  });

  it("saves the run once when it completes", () => {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), level: 9, boss: "blinkySwarm", bossStageAdvance: true },
      "run-end-save",
    );
    const events = [
      ...sim.start(),
      ...runUntil(
        sim,
        () => sim.snapshot().boss?.stage === 2 && sim.snapshot().bossStageTransition === false,
        BOSS_STAGE_WAIT_FRAMES,
      ),
    ];
    sim["jumpToLevelClear"]();
    events.push(...runUntil(sim, () => sim.snapshot().runComplete, 300));
    events.push(...runFrames(sim, 120));
    expect(count(events, "saveRun")).toBe(1);
  });

  it("skips the save when high scores are disabled", () => {
    const options = {
      ...defaultPlayOptions(),
      level: 9,
      boss: "blinkySwarm" as const,
      bossStageAdvance: true,
      highScoresDisabled: true,
    };
    const sim = new PlaySim(options, "run-end");
    const events = [
      ...sim.start(),
      ...runUntil(
        sim,
        () => sim.snapshot().boss?.stage === 2 && sim.snapshot().bossStageTransition === false,
        BOSS_STAGE_WAIT_FRAMES,
      ),
    ];
    sim["jumpToLevelClear"]();
    events.push(...runUntil(sim, () => sim.snapshot().runComplete, 300));
    expect(count(events, "saveRun")).toBe(0);
  });

  it("ignores choices before the run is complete", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    runFrames(sim, 120);
    expect(sim.chooseRunEnd("menu")).toEqual([]);
  });
});

describe("PlaySim Wall Pass+", () => {
  function startLooping(id: "powerPelletWallPass" | "powerPelletWallPassPlus"): PlaySim {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [id] });
    sim["runUpgrades"] = { ...sim["runUpgrades"], wallPassRemainingMs: 6000 };
    return sim;
  }

  it("loops through the top edge to the bottom", () => {
    const sim = startLooping("powerPelletWallPassPlus");
    const { rows } = getActiveLayout();
    teleportPlayer(sim, cellCenterX(3), cellCenterY(1));
    runFrames(sim, 30, { keys: held("up") });
    expect(sim.snapshot().player!.row).toBeGreaterThan(rows - 4);
    expect(sim.renderOptions().wallPassLoopActive).toBe(true);
  });

  it("loops through the left edge to the right", () => {
    const sim = startLooping("powerPelletWallPassPlus");
    const { cols } = getActiveLayout();
    teleportPlayer(sim, cellCenterX(1), cellCenterY(5));
    runFrames(sim, 30, { keys: held("left") });
    expect(sim.snapshot().player!.col).toBeGreaterThan(cols - 4);
  });

  it("base Wall Pass stops at the solid perimeter", () => {
    const sim = startLooping("powerPelletWallPass");
    const { rows } = getActiveLayout();
    teleportPlayer(sim, cellCenterX(3), cellCenterY(1));
    runFrames(sim, 30, { keys: held("up") });
    expect(sim.snapshot().player!.row).toBeLessThan(rows / 2);
    expect(sim.renderOptions().wallPassLoopActive).toBe(false);
  });
});

describe("PlaySim Pickup Range+", () => {
  function pelletReachedAt(id: UpgradeId | null, tilesAway: number): boolean {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: id === null ? [] : [id] });
    const { playerSolids } = getActiveLayout();
    for (const eid of regularPelletEids(sim)) {
      const col = worldToCol(Position.x[eid]!);
      const row = worldToRow(Position.y[eid]!);
      const open = [1, 2, 3].every((step) => isWalkable(col - step, row, playerSolids));
      if (!open) {
        continue;
      }
      teleportPlayer(sim, Position.x[eid]! - tilesAway * TILE_SIZE, Position.y[eid]!);
      runFrames(sim, 1);
      return !Array.from(query(sim.world, [Pellet])).includes(eid);
    }
    throw new Error("no open corridor pellet found");
  }

  it("reaches 1 tile for Pickup Range and 2 tiles only for Plus", () => {
    expect(pelletReachedAt(null, 1.5)).toBe(false);
    expect(pelletReachedAt("passivePickupRange", 1.5)).toBe(true);
    expect(pelletReachedAt("passivePickupRange", 2.5)).toBe(false);
    expect(pelletReachedAt("passivePickupRangePlus", 2.5)).toBe(true);
    expect(pelletReachedAt("passivePickupRangePlus", 3.5)).toBe(false);
  });
});

describe("PlaySim enhanced upgrades", () => {
  function chomp(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  function powerPelletCount(sim: PlaySim): number {
    return query(sim.world, [Pellet, PowerPellet]).length;
  }

  it.each([
    [
      "powerPelletInvuln",
      "invulnMs",
      levelScaledDurationMs(INVULN_MS, 2, INVULN_FLOOR_RATIO),
      levelScaledDurationMs(INVULN_ENHANCED_MS, 2, INVULN_FLOOR_RATIO),
    ],
    ["powerPelletGhostHarvester", "ghostHarvestMs", 5000, 8000],
    [
      "powerPelletWallPass",
      "wallPassMs",
      levelScaledDurationMs(WALL_PASS_MS, 2),
      levelScaledDurationMs(WALL_PASS_MS, 2),
    ],
    ["passiveDefyDeath", "defyDeathMs", 5000, 8000],
  ] as const)("%s: power-pellet timer %s is %i ms, Plus %i ms", (id, key, base, plus) => {
    for (const [owned, expected] of [
      [id, base],
      [`${id}Plus` as UpgradeId, plus],
    ] as const) {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [owned] });
      chomp(sim);
      const ms = sim.snapshot().timers[key];
      expect(ms).toBeLessThanOrEqual(expected);
      expect(ms).toBeGreaterThan(expected - 200);
    }
  });

  it("Overcharge triples enhanced timers (and only doubles with the base)", () => {
    const doubled = levelScaledDurationMs(INVULN_MS, 2, INVULN_FLOOR_RATIO) * 2;
    const tripled = levelScaledDurationMs(INVULN_ENHANCED_MS, 2, INVULN_FLOOR_RATIO) * 3;
    const base = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletInvuln", "passiveOvercharge"],
    });
    chomp(base);
    expect(base.snapshot().timers.invulnMs).toBeGreaterThan(doubled - 200);
    expect(base.snapshot().timers.invulnMs).toBeLessThanOrEqual(doubled);

    const plus = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletInvulnPlus", "passiveOverchargePlus"],
    });
    chomp(plus);
    expect(plus.snapshot().timers.invulnMs).toBeGreaterThan(tripled - 200);
    expect(plus.snapshot().timers.invulnMs).toBeLessThanOrEqual(tripled);
  });

  it("Overcharge extends the Defy Death window", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveDefyDeath", "passiveOvercharge"],
    });
    chomp(sim);
    expect(sim.snapshot().timers.defyDeathMs).toBeGreaterThan(9800);
    expect(sim.snapshot().timers.defyDeathMs).toBeLessThanOrEqual(10000);
  });

  it("Warp Farthest+ shields for 2s and Overcharge does not extend it", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletWarpFarthestPlus", "passiveOvercharge"],
    });
    chomp(sim);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(1800);
    expect(sim.snapshot().timers.invulnMs).toBeLessThanOrEqual(2000);
    const base = startSim({ level: 2, maze: "maze1", enableUpgrades: ["powerPelletWarpFarthest"] });
    chomp(base);
    expect(base.snapshot().timers.invulnMs).toBe(0);
  });

  it("Warp Farthest puts the player on the tile farthest from active ghosts", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["powerPelletWarpFarthest"] });
    const ghosts = query(sim.world, [Ghost, Position]);
    for (const eid of ghosts) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
    chomp(sim);
    const player = query(sim.world, [Player, Position])[0]!;
    const expected = playerFarthestFromGhostsSpawn(
      Array.from(ghosts, (eid) => ({ x: Position.x[eid]!, y: Position.y[eid]! })),
    );
    expect(Position.x[player]).toBe(expected.x);
    expect(Position.y[player]).toBe(expected.y);
  });

  it("Warp Farthest leaves the player facing a wall so they stop on landing", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["powerPelletWarpFarthest"] });
    for (const eid of query(sim.world, [Ghost, Position])) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1, { keys: held("left") });
    const player = playerEid(sim);
    const landed = { x: Position.x[player]!, y: Position.y[player]! };
    const steps: Record<number, number[]> = {
      [DIRECTION.up]: [0, -1],
      [DIRECTION.down]: [0, 1],
      [DIRECTION.left]: [-1, 0],
      [DIRECTION.right]: [1, 0],
    };
    const toWall = steps[Input.direction[player]!]!;
    expect(canEnterDirection(landed.x, landed.y, toWall[0]!, toWall[1]!)).toBe(false);
    expect(Facing.direction[player]).toBe(Input.direction[player]);
    runFrames(sim, Math.ceil(WARP_GLIDE_MS / FRAME_MS) + 30);
    expect(Position.x[player]).toBe(landed.x);
    expect(Position.y[player]).toBe(landed.y);
  });

  it("Warp Farthest glides the sprite there over WARP_GLIDE_MS and holds controls until it lands", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["powerPelletWarpFarthest"] });
    for (const eid of query(sim.world, [Ghost, Position])) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    const origin = { x: Position.x[power]!, y: Position.y[power]! };
    teleportPlayer(sim, origin.x, origin.y);
    const warpDraw = runFrames(sim, 1).flatMap((e) => (e.type === "draw" ? [e.options] : []))[0]!;
    const player = playerEid(sim);
    const landed = { x: Position.x[player]!, y: Position.y[player]! };
    expect(landed).not.toEqual(origin);
    expect(warpDraw.playerWarpGlide?.[0]).toMatchObject(origin);
    expect(sim.snapshot().timers.warpGlideMs).toBe(WARP_GLIDE_MS);

    const step = [
      ["left", -1, 0],
      ["right", 1, 0],
      ["up", 0, -1],
      ["down", 0, 1],
    ] as const;
    const [key] = step.find(([, dx, dy]) => canEnterDirection(landed.x, landed.y, dx, dy))!;
    const glideFrames = Math.ceil(WARP_GLIDE_MS / FRAME_MS) - 1;
    const glideEvents = runFrames(sim, glideFrames, { keys: held(key) });
    expect(Position.x[player]).toBe(landed.x);
    expect(Position.y[player]).toBe(landed.y);
    expect(sim.snapshot().timers.warpGlideMs).toBeGreaterThan(0);
    const heads = glideEvents.flatMap((e) =>
      e.type === "draw" && e.options.playerWarpGlide ? [e.options.playerWarpGlide[0]!] : [],
    );
    expect(heads).toHaveLength(glideFrames);
    expect(Math.hypot(heads.at(-1)!.x - landed.x, heads.at(-1)!.y - landed.y)).toBeLessThan(
      Math.hypot(heads[0]!.x - landed.x, heads[0]!.y - landed.y),
    );

    const afterEvents = runFrames(sim, 10, { keys: held(key) });
    expect(sim.snapshot().timers.warpGlideMs).toBe(0);
    expect(afterEvents.some((e) => e.type === "draw" && e.options.playerWarpGlide)).toBe(false);
    expect({ x: Position.x[player], y: Position.y[player] }).not.toEqual(landed);
  });

  it("Speed Burst trails faded afterimages behind the player only while the burst runs", () => {
    const trailsAfterChomp = (enableUpgrades: UpgradeId[]) => {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades });
      chomp(sim);
      const player = playerEid(sim);
      const at = { x: Position.x[player]!, y: Position.y[player]! };
      const step = [
        ["left", -1, 0],
        ["right", 1, 0],
        ["up", 0, -1],
        ["down", 0, 1],
      ] as const;
      const [key] = step.find(([, dx, dy]) => canEnterDirection(at.x, at.y, dx, dy))!;
      const draws = runFrames(sim, 8, { keys: held(key) }).flatMap((e) =>
        e.type === "draw" ? [e.options] : [],
      );
      return { sim, key, trail: draws.at(-1)?.playerSpeedTrail ?? [] };
    };

    const { sim, key, trail } = trailsAfterChomp(["powerPelletSpeedBurst"]);
    expect(sim.snapshot().timers.speedBurstMs).toBeGreaterThan(0);
    expect(trail).toHaveLength(2);
    const player = playerEid(sim);
    const head = { x: Position.x[player]!, y: Position.y[player]! };
    const gap = (p: { x: number; y: number }) => Math.hypot(p.x - head.x, p.y - head.y);
    expect(gap(trail[0]!)).toBeGreaterThan(0);
    expect(gap(trail[1]!)).toBeGreaterThan(gap(trail[0]!));
    expect(trail[1]!.alpha).toBeLessThan(trail[0]!.alpha);
    expect(trail[0]!.alpha).toBeLessThan(1);

    expect(trailsAfterChomp([]).trail).toEqual([]);

    let frames = 0;
    while (sim.snapshot().timers.speedBurstMs > 0 && frames < 1000) {
      runFrames(sim, 1, { keys: held(key) });
      frames += 1;
    }
    const after = runFrames(sim, 1, { keys: held(key) });
    expect(after.some((e) => e.type === "draw" && e.options.playerSpeedTrail)).toBe(false);
  });

  function scatterBurstSetup(id: UpgradeId) {
    const sim = startSim({ level: 3, maze: "maze1", enableUpgrades: [id] });
    const ghosts = Array.from(query(sim.world, [Ghost, Position]));
    const [houseGhost, ...active] = ghosts;
    for (const eid of active) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    const origin = { x: Position.x[power]!, y: Position.y[power]! };
    const playerCell = { col: worldToCol(origin.x), row: worldToRow(origin.y) };
    const starts = new Map(
      active.map((eid) => [eid, { x: Position.x[eid]!, y: Position.y[eid]! }]),
    );
    const houseStart = { x: Position.x[houseGhost!]!, y: Position.y[houseGhost!]! };
    const modeBefore = sim.snapshot().ghostMode;
    teleportPlayer(sim, origin.x, origin.y);
    const draw = runFrames(sim, 1).flatMap((e) => (e.type === "draw" ? [e.options] : []))[0]!;
    const landings = new Map(
      active.map((eid) => {
        const kind = GhostKind.kind[eid] as GhostKindId;
        const cell = ghostTeleportCell(scatterTargetForKind(kind), playerCell);
        return [eid, { x: cellCenterX(cell.col), y: cellCenterY(cell.row) }];
      }),
    );
    return { sim, active, houseGhost: houseGhost!, houseStart, starts, landings, draw, modeBefore };
  }

  it("Scatter Burst warps active ghosts to their corners (or the house exit near the player) without touching the wave mode", () => {
    const { sim, active, houseGhost, houseStart, starts, landings, draw, modeBefore } =
      scatterBurstSetup("powerPelletScatterBurst");
    const exit = getActiveLayout().ghostHouseExit;
    const exitCenter = { x: cellCenterX(exit.col), y: cellCenterY(exit.row) };
    for (const eid of active) {
      expect({ x: Position.x[eid], y: Position.y[eid] }).toEqual(landings.get(eid));
      expect(draw.ghostWarpGlides?.[eid]?.[0]).toMatchObject(starts.get(eid)!);
    }
    expect(Array.from(landings.values())).toContainEqual(exitCenter);
    expect(Array.from(landings.values()).some((p) => p.x !== exitCenter.x)).toBe(true);
    expect({ x: Position.x[houseGhost], y: Position.y[houseGhost] }).toEqual(houseStart);
    expect(draw.ghostWarpGlides?.[houseGhost]).toBeUndefined();
    expect(sim.snapshot().ghostMode).toBe(modeBefore);
    expect(sim.snapshot().timers.ghostWarpGlideMs).toBe(WARP_GLIDE_MS);
  });

  it("Scatter Burst ghosts hold still and cannot catch during the glide, then move on", () => {
    const { sim, active, landings } = scatterBurstSetup("powerPelletScatterBurst");
    const victim = active[0]!;
    const landed = landings.get(victim)!;
    teleportPlayer(sim, landed.x, landed.y);
    const glideFrames = Math.ceil(WARP_GLIDE_MS / FRAME_MS) - 2;
    runFrames(sim, glideFrames);
    expect(sim.snapshot().dying).toBe(false);
    for (const eid of active) {
      expect({ x: Position.x[eid], y: Position.y[eid] }).toEqual(landings.get(eid));
    }
    expect(sim.snapshot().timers.ghostWarpGlideMs).toBeGreaterThan(0);

    teleportPlayer(sim, cellCenterX(1), cellCenterY(1));
    runFrames(sim, 4);
    expect(sim.snapshot().timers.ghostWarpGlideMs).toBe(0);
    runFrames(sim, Math.floor((CORNER_TELEPORT_HOLD_MS - 150) / FRAME_MS));
    for (const eid of active) {
      expect({ x: Position.x[eid], y: Position.y[eid] }).toEqual(landings.get(eid));
      expect(Speed.px[eid]).toBe(0);
    }
    runFrames(sim, 30);
    expect(
      active.some(
        (eid) =>
          Position.x[eid] !== landings.get(eid)!.x || Position.y[eid] !== landings.get(eid)!.y,
      ),
    ).toBe(true);
  });

  it("Scatter Burst+ pins ghosts at their landing cell for 2s after the glide", () => {
    const { sim, active, landings } = scatterBurstSetup("powerPelletScatterBurstPlus");
    teleportPlayer(sim, cellCenterX(1), cellCenterY(1));
    runFrames(sim, Math.floor((WARP_GLIDE_MS + 1900) / FRAME_MS));
    for (const eid of active) {
      expect({ x: Position.x[eid], y: Position.y[eid] }).toEqual(landings.get(eid));
      expect(Speed.px[eid]).toBe(0);
    }
    runFrames(sim, 30);
    expect(active.some((eid) => (Speed.px[eid] ?? 0) > 0)).toBe(true);
  });

  it("Scatter Burst lands boss ghosts sharing a corner on one cell, and they still split up", () => {
    const sim = startSim({
      level: 9,
      boss: "blinkySwarm",
      enableUpgrades: ["powerPelletScatterBurst"],
    });
    const bosses = Array.from(query(sim.world, [Ghost, BossGhost, Position]));
    expect(bosses.length).toBeGreaterThanOrEqual(2);
    for (const eid of bosses) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
      BossGhost.scatterCol[eid] = BossGhost.scatterCol[bosses[0]!]!;
      BossGhost.scatterRow[eid] = BossGhost.scatterRow[bosses[0]!]!;
    }
    const power = Array.from(query(sim.world, [PowerPellet, Position]))
      .map((eid) => ({ x: Position.x[eid]!, y: Position.y[eid]! }))
      .sort((a, b) => b.y - a.y)[0]!;
    teleportPlayer(sim, power.x, power.y);
    runFrames(sim, 1);
    const [a, b] = bosses as [number, number];
    expect({ x: Position.x[a], y: Position.y[a] }).toEqual({ x: Position.x[b], y: Position.y[b] });

    runFrames(sim, Math.ceil((WARP_GLIDE_MS + 3000) / FRAME_MS));
    expect(
      Math.hypot(Position.x[a]! - Position.x[b]!, Position.y[a]! - Position.y[b]!),
    ).toBeGreaterThan(TILE_SIZE);
  });

  it("Ghost Recall+ sends two ghosts home, the base sends one", () => {
    const homeCount = (id: UpgradeId): number => {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [id] });
      for (const eid of query(sim.world, [Ghost, Position])) {
        GhostPhase.value[eid] = GHOST_PHASE.active;
      }
      chomp(sim);
      return query(sim.world, [Ghost, Position]).filter(
        (eid) => GhostPhase.value[eid] === GHOST_PHASE.inHouse,
      ).length;
    };
    expect(homeCount("powerPelletGhostRecall")).toBe(1);
    expect(homeCount("powerPelletGhostRecallPlus")).toBe(2);
  });

  it("Freeze and Ghost Recall never hit the same ghost", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletFreeze", "powerPelletGhostRecall"],
    });
    for (const eid of query(sim.world, [Ghost, Position])) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
    chomp(sim);
    const ghosts = query(sim.world, [Ghost, Position]);
    const frozen = ghosts.filter((eid) => eid === frozenGhostEid(sim["runUpgrades"]));
    const home = ghosts.filter((eid) => GhostPhase.value[eid] === GHOST_PHASE.inHouse);
    expect(frozen).toHaveLength(1);
    expect(home).toHaveLength(1);
    expect(home).not.toContain(frozen[0]);
  });

  it("Freeze hands render the time left so the ghost can blink before thawing", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["powerPelletFreeze"] });
    for (const eid of query(sim.world, [Ghost, Position])) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
    chomp(sim);
    const start = sim.renderOptions().frozenGhostRemainingMs;
    expect(start).toBeGreaterThan(1000);
    runFrames(sim, 10);
    const later = sim.renderOptions();
    expect(later.frozenGhostRemainingMs).toBeLessThan(start);
    expect(later.frozenGhostRemainingMs).toBe(sim.snapshot().timers.freezeMs);
    runUntil(sim, () => frozenGhostEid(sim["runUpgrades"]) === null, 600);
    expect(sim.renderOptions().frozenGhostRemainingMs).toBe(0);
  });

  it("Second Chomp+ respawns a power pellet after 7s instead of 10s", () => {
    for (const [id, ms] of [
      ["passivePowerPelletRecharge", 10000],
      ["passivePowerPelletRechargePlus", 7000],
    ] as const) {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [id] });
      chomp(sim);
      const [pending] = sim["pendingPowerPelletRespawns"];
      expect(pending!.remainingMs).toBeLessThanOrEqual(ms);
      expect(pending!.remainingMs).toBeGreaterThan(ms - 200);
    }
  });

  it("Second Chomp only respawns the first two power pellets per level, four when enhanced", () => {
    for (const [id, cap] of [
      ["passivePowerPelletRecharge", 2],
      ["passivePowerPelletRechargePlus", 4],
    ] as const) {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [id] });
      for (let i = 0; i < 6; i += 1) {
        sim["queueSecondChomp"]([{ x: i, y: 0 }]);
      }
      expect(sim["pendingPowerPelletRespawns"]).toHaveLength(cap);
    }
  });

  it("Pellet Surge+ converts two pellets per board, the base one", () => {
    const none = powerPelletCount(startSim({ level: 2, maze: "maze1" }));
    const base = powerPelletCount(
      startSim({ level: 2, maze: "maze1", enableUpgrades: ["passivePelletToPower"] }),
    );
    const plus = powerPelletCount(
      startSim({ level: 2, maze: "maze1", enableUpgrades: ["passivePelletToPowerPlus"] }),
    );
    expect(base).toBe(none + 1);
    expect(plus).toBe(none + 2);
  });

  it("Extra Life+ grants two lives and a floor of 5", () => {
    const lives = (id?: UpgradeId) =>
      startSim({ level: 2, maze: "maze1", enableUpgrades: id ? [id] : [] }).snapshot().lives;
    expect(lives("passiveExtraLife") - lives()).toBe(1);
    expect(lives("passiveExtraLifePlus") - lives()).toBe(2);
    const plus = startSim({ level: 2, maze: "maze1", enableUpgrades: ["passiveExtraLifePlus"] });
    expect(plus["regenIconFloor"]()).toBe(5);
  });

  it("Myogenesis+ regenerates to full, the base one per level", () => {
    const base = startSim({ level: 2, maze: "maze1", enableUpgrades: ["passiveMyogenesis"] });
    expect(base["regenAmount"]()).toBe(1);
    const plus = startSim({ level: 2, maze: "maze1", enableUpgrades: ["passiveMyogenesisPlus"] });
    expect(plus["regenAmount"]()).toBe(Number.POSITIVE_INFINITY);
  });

  it("Death's Harvest+ harvests a wider radius when caught", () => {
    const harvested = (id: UpgradeId): number => {
      const sim = startSim({ level: 2, maze: "maze1", infiniteLives: true, enableUpgrades: [id] });
      const before = sim.snapshot().boardCollected;
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      return sim.snapshot().boardCollected - before;
    };
    expect(harvested("passiveDeathsHarvestPlus")).toBeGreaterThan(
      harvested("passiveDeathsHarvest"),
    );
  });

  it("Death's Harvest leaves power pellets on the board", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      infiniteLives: true,
      enableUpgrades: ["passiveDeathsHarvestPlus"],
    });
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    const player = playerEid(sim);
    Position.x[power] = Position.x[player]! + TILE_SIZE;
    Position.y[power] = Position.y[player]!;
    const powerCount = query(sim.world, [PowerPellet]).length;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    expect(query(sim.world, [PowerPellet])).toHaveLength(powerCount);
  });
});

describe("Death's Bounty", () => {
  function startBounty(enableUpgrades: UpgradeId[], overrides: Partial<PlayOptions> = {}): PlaySim {
    return startSim({ level: 2, maze: "maze1", infiniteLives: true, enableUpgrades, ...overrides });
  }

  function dieAndRespawn(sim: PlaySim): SimEvent[] {
    ghostOntoPlayer(sim);
    const events = runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    return [...events, ...runUntil(sim, () => !sim.snapshot().dying, 240), ...settleSlots(sim)];
  }

  function bountyTotals(id: UpgradeId, deaths: number): number[] {
    const sim = startBounty([id], { pennyCharge: 100 });
    const totals: number[] = [];
    for (let i = 0; i < deaths; i += 1) {
      dieAndRespawn(sim);
      const { quarters, pennies } = sim.snapshot();
      totals.push(quarters * pennies.max + pennies.charge);
    }
    return totals;
  }

  it("pays a full bar on the first death, then 20% less per death compounding", () => {
    expect(bountyTotals("passiveDeathsBounty", 3)).toEqual([400, 640, 832]);
  });

  it("decays only 10% per death when enhanced", () => {
    expect(bountyTotals("passiveDeathsBountyPlus", 3)).toEqual([400, 670, 913]);
  });

  it("pays the Quarter through the penny fill at the catch", () => {
    const sim = startBounty(["passiveDeathsBounty"]);
    ghostOntoPlayer(sim);
    const events = runFrames(sim, 1);
    expect(events).toContainEqual({ type: "pennies", tier: 0, filled: 1 });
    expect(sim.snapshot().slot.queued).toBe(0);
    expect(sim.snapshot().pennies.charge).toBe(0);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().quarters).toBe(1);
  });

  it("pays nothing when not owned", () => {
    const sim = startBounty([], { pennyCharge: 100 });
    dieAndRespawn(sim);
    expect(sim.snapshot().quarters).toBe(0);
    expect(sim.snapshot().pennies.charge).toBe(100);
  });

  it("pays on a Defy Death save", () => {
    const sim = startBounty(["passiveDeathsBounty", "passiveDefyDeath"], { infiniteLives: false });
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    const lives = sim.snapshot().lives;
    dieAndRespawn(sim);
    expect(sim.snapshot().lives).toBe(lives);
    expect(sim.snapshot().quarters).toBe(1);
  });

  it("pays nothing on the catch that ends the run", () => {
    const sim = startBounty(["passiveDeathsBounty"], { infiniteLives: false });
    sim["lives"] = 1;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().quarters).toBe(0);
  });

  it("pays nothing when Death's Harvest turns the catch into a level clear", () => {
    const sim = startBounty(["passiveDeathsBounty", "passiveDeathsHarvest"]);
    const eids = regularPelletEids(sim);
    for (const eid of eids.slice(0, -1)) {
      eatPelletAt(sim, eid);
    }
    const last = eids.at(-1)!;
    const player = playerEid(sim);
    Position.x[last] = Position.x[player]! + 2 * TILE_SIZE;
    Position.y[last] = Position.y[player]!;
    const quarters = sim.snapshot().quarters;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().quarters).toBe(quarters);
    expect(sim.snapshot().deathsThisBoard).toBe(0);
  });

  it("restarts the decay on the next board", () => {
    const sim = startBounty(["passiveDeathsBounty"]);
    dieAndRespawn(sim);
    expect(sim.snapshot().deathsThisBoard).toBe(1);
    for (const eid of regularPelletEids(sim)) {
      eatPelletAt(sim, eid);
    }
    takeFirstOffered(sim);
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 560);
    expect(sim.snapshot().deathsThisBoard).toBe(0);
    const before = sim.snapshot().quarters;
    dieAndRespawn(sim);
    expect(sim.snapshot().quarters).toBe(before + 1);
  });
});

describe("level 4+ ghosts", () => {
  it("leaves every ghost unmodified and ignores a stale forceCorruption flag", () => {
    const parsed = parsePlayOptions(
      new URLSearchParams("level=4&forceCorruption=slimeTrail&forceCorruptionGhost=pinky"),
    );
    expect(parsed.warnings).toEqual([]);
    expect(parsed.options.highScoresDisabled).toBe(true);

    const sim = new PlaySim(parsed.options, "test");
    const events = sim.start();
    events.push(...runFrames(sim, 120));

    expect(Object.keys(sim.snapshot())).not.toContain("corruption");
    const draws = events.flatMap((event) => (event.type === "draw" ? [event.options] : []));
    expect(draws.length).toBeGreaterThan(0);
    expect(draws.every((options) => !("corruptedTint" in options))).toBe(true);
    expect(events.some((event) => event.type === "seenGhosts")).toBe(true);
  });
});

describe("Lazy Looper", () => {
  function startLooper(enableUpgrades: UpgradeId[], overrides: Partial<PlayOptions> = {}): PlaySim {
    return startSim({ level: 2, maze: "maze1", enableUpgrades, ...overrides });
  }

  function partition(sim: PlaySim): { required: number[]; optional: number[] } {
    const regular = regularPelletEids(sim);
    return {
      required: regular.filter((eid) => !hasComponent(sim.world, eid, OptionalPellet)),
      optional: regular.filter((eid) => hasComponent(sim.world, eid, OptionalPellet)),
    };
  }

  it("clears the board once only the ring pellets are eaten", () => {
    const sim = startLooper(["passiveLazyLooper"]);
    const { required, optional } = partition(sim);
    expect(optional.length).toBeGreaterThan(0);
    expect(sim.snapshot().optionalPellets).toBe(optional.length);
    for (const eid of required.slice(0, -1)) {
      eatPelletAt(sim, eid);
    }
    expect(sim.offer()).toBeNull();
    eatPelletAt(sim, required.at(-1)!);
    expect(drainToOffer(sim)).not.toBeNull();
    expect(sim.snapshot().optionalPellets).toBe(optional.length);
  });

  it("Plus needs only the outer ring, so fewer pellets than the base", () => {
    const base = partition(startLooper(["passiveLazyLooper"]));
    const plus = partition(startLooper(["passiveLazyLooperPlus"]));
    expect(plus.required.length).toBeLessThan(base.required.length);
    expect(plus.required.length + plus.optional.length).toBe(
      base.required.length + base.optional.length,
    );
  });

  it("without the upgrade every pellet is required", () => {
    const sim = startLooper([]);
    expect(sim.snapshot().optionalPellets).toBe(0);
    const ring = partition(startLooper(["passiveLazyLooper"])).required.map((eid) => ({
      x: Position.x[eid]!,
      y: Position.y[eid]!,
    }));
    for (const eid of regularPelletEids(sim)) {
      if (ring.some((cell) => cell.x === Position.x[eid] && cell.y === Position.y[eid])) {
        eatPelletAt(sim, eid);
      }
    }
    runFrames(sim, 90);
    expect(sim.offer()).toBeNull();
  });

  it("re-tags each new board", () => {
    const sim = startLooper(["passiveLazyLooperPlus"], { maze: null });
    for (const eid of partition(sim).required) {
      eatPelletAt(sim, eid);
    }
    takeFirstOffered(sim);
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 560);
    expect(sim.snapshot().optionalPellets).toBeGreaterThan(0);
    expect(sim.snapshot().optionalPellets).toBe(partition(sim).optional.length);
  });

  it("drops the optional tag from a pellet turned into a power pellet", () => {
    const sim = startLooper(["passiveLazyLooper"]);
    const [optional] = partition(sim).optional;
    const before = sim.snapshot().optionalPellets;
    expect(convertPelletToPower(sim.world, optional!)).toBe(true);
    expect(hasComponent(sim.world, optional!, OptionalPellet)).toBe(false);
    expect(sim.snapshot().optionalPellets).toBe(before - 1);
  });

  it("does nothing on boss fights", () => {
    for (const boss of ["blinkySwarm", "chainedGhosts"] as const) {
      const sim = startSim({
        level: 9,
        boss,
        enableUpgrades: ["passiveLazyLooperPlus"],
      });
      expect(sim.snapshot().optionalPellets).toBe(0);
      expect(partition(sim).optional).toEqual([]);
      const required = new Set(
        lazyLooperRequiredCells(getActiveLayout(), "outer").map(({ col, row }) => `${col},${row}`),
      );
      for (const eid of regularPelletEids(sim)) {
        const cell = `${worldToCol(Position.x[eid]!)},${worldToRow(Position.y[eid]!)}`;
        if (required.has(cell)) {
          eatPelletAt(sim, eid);
        }
      }
      runFrames(sim, 90);
      expect(sim.snapshot().runComplete).toBe(false);
      expect(sim.snapshot().pellets).toBeGreaterThan(0);
    }
  });
});

describe("debug tuning", () => {
  function startTuned(tuning: Partial<Tuning>, overrides: Partial<PlayOptions> = {}): PlaySim {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), level: 2, maze: "maze1", godMode: true, ...overrides },
      "test",
      resolveTuning(tuning),
    );
    sim.start();
    return sim;
  }

  function corridorTravel(sim: PlaySim, frames: number): number {
    const eid = playerEid(sim);
    for (const pellet of query(sim.world, [Pellet, Position])) {
      if (worldToRow(Position.y[pellet]!) === 1) {
        removeEntity(sim.world, pellet);
      }
    }
    teleportPlayer(sim, cellCenterX(12), cellCenterY(1));
    runFrames(sim, 1, { keys: held("left") });
    const startX = Position.x[eid]!;
    runFrames(sim, frames, { keys: held("left") });
    return startX - Position.x[eid]!;
  }

  it("reports default tuning and knobs off unless given", () => {
    const sim = startSim({});
    expect(sim.snapshot().knobs).toBe(false);
    expect(sim.snapshot().tuning).toBe(DEFAULT_TUNING);
  });

  it("starts the timer at timerMax", () => {
    const sim = startTuned({ timerMax: 50 });
    expect(sim.snapshot().timeRemaining).toBe(50);
  });

  it("moves Maze-Man at the tuned player speed", () => {
    const fast = corridorTravel(startTuned({ playerSpeedTiles: 14 }), 20);
    const normal = corridorTravel(startTuned({}), 20);
    expect(fast).toBeCloseTo(normal * (14 / DEFAULT_TUNING.playerSpeedTiles), 0);
  });

  it("applies setTuning on the next step", () => {
    const sim = startTuned({});
    const before = corridorTravel(sim, 10);
    sim.setTuning(resolveTuning({ playerSpeedTiles: 14 }));
    const after = corridorTravel(sim, 10);
    expect(after).toBeGreaterThan(before * 1.5);
  });

  it("resumes from a death sooner with a shorter death hold", () => {
    const framesToResume = (tuning: Partial<Tuning>): number => {
      const sim = startTuned(tuning, { godMode: false });
      runFrames(sim, 20, { keys: held("left") });
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(true);
      let frames = 0;
      runUntil(
        sim,
        () => {
          frames += 1;
          return !sim.snapshot().dying;
        },
        600,
      );
      return frames;
    };
    expect(framesToResume({ deathHoldMs: 100, readyPauseMs: 100 })).toBeLessThan(
      framesToResume({}) - 60,
    );
  });
});

describe("Shield", () => {
  const LEVEL2_INVULN_MS = levelScaledDurationMs(INVULN_MS, 2, INVULN_FLOOR_RATIO);

  function startShieldSim(enableUpgrades: PlayOptions["enableUpgrades"]): PlaySim {
    return startSim({ level: 2, maze: "maze1", enableUpgrades });
  }

  function chompPowerPellet(sim: PlaySim): SimEvent[] {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    return runFrames(sim, 1);
  }

  function chompPowerPellets(sim: PlaySim, n: number): void {
    for (let i = 0; i < n; i += 1) {
      chompPowerPellet(sim);
      runUntil(sim, () => sim.snapshot().timers.invulnMs === 0, 400);
    }
  }

  it("banks a shield and still fires power-pellet effects at pickup", () => {
    const sim = startShieldSim(["passiveShieldPellets", "powerPelletInvuln"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(0);
    expect(sim.hud().shields).toBe(1);
  });

  it("holds 1 shield, or 3 with Shield Pellets+", () => {
    const base = startShieldSim(["passiveShieldPellets"]);
    chompPowerPellets(base, 2);
    expect(base.snapshot().timers.shieldsBanked).toBe(1);

    const plus = startShieldSim(["passiveShieldPelletsPlus"]);
    chompPowerPellets(plus, 4);
    expect(plus.snapshot().timers.shieldsBanked).toBe(3);
  });

  it("passes the banked shield count to the renderer", () => {
    const sim = startShieldSim(["passiveShieldPellets"]);
    expect(sim.renderOptions().shields).toBe(0);
    chompPowerPellets(sim, 1);
    expect(sim.renderOptions().shields).toBe(1);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.renderOptions().shields).toBe(0);
  });

  it("a catch breaks a shield, fires nothing and costs no life or death", () => {
    const sim = startShieldSim(["passiveShieldPellets", "powerPelletInvuln"]);
    chompPowerPellets(sim, 1);
    const livesBefore = sim.snapshot().lives;
    ghostOntoPlayer(sim);
    const events = runFrames(sim, 1);
    expect(sim.snapshot()).toMatchObject({
      dying: false,
      lives: livesBefore,
      deathsThisBoard: 0,
    });
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
    expect(sim.snapshot().timers.invulnMs).toBeLessThanOrEqual(SHIELD_BREAK_INVULN_MS);
    expect(events).not.toContainEqual({ type: "sfx", id: "death" });
  });

  it("breaks the pellet streak and keeps the charge", () => {
    const sim = startSim(
      {
        level: 2,
        maze: "maze1",
        infiniteLives: true,
        enableUpgrades: ["passiveShieldPellets"],
        pennyCharge: 40,
      },
      "shield-streak",
    );
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    while (sim.snapshot().pennies.streak < 5) {
      const eid = regularPelletEids(sim)[0]!;
      teleportPlayer(sim, Position.x[eid]!, Position.y[eid]!);
      runFrames(sim, 1);
    }
    const { charge, streak } = sim.snapshot().pennies;
    expect(streak).toBeGreaterThanOrEqual(5);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().pennies).toMatchObject({ streak: 0, charge });
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
    expect(sim.snapshot().dying).toBe(false);
  });

  it("an active Defy Death window saves the catch and keeps the shield", () => {
    const sim = startShieldSim(["passiveShieldPellets", "passiveDefyDeath"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.defyDeathMs).toBeGreaterThan(0);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    ghostOntoPlayer(sim);
    const events = runFrames(sim, 1);
    expect(events).toContainEqual({ type: "sfx", id: "revive" });
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
  });

  it("does not trigger Defy Death's save but arms its window", () => {
    const sim = startShieldSim(["passiveShieldPellets", "passiveShieldBreak", "passiveDefyDeath"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.defyDeathMs).toBe(0);
    ghostOntoPlayer(sim);
    const events = runFrames(sim, 1);
    expect(events).not.toContainEqual({ type: "sfx", id: "revive" });
    expect(sim.snapshot().timers.defyDeathMs).toBeGreaterThan(0);
  });

  it("dies normally with an empty bank", () => {
    const sim = startShieldSim(["passiveShieldPellets"]);
    const livesBefore = sim.snapshot().lives;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot()).toMatchObject({ dying: true, lives: livesBefore - 1 });
  });

  it("Fruit Power banks a shield and fires the effects", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveShieldPelletsPlus", "fruitPowerPellet", "powerPelletInvuln"],
    });
    sim["spawnFruitEntity"](false);
    const fruit = query(sim.world, [Fruit, Position])[0]!;
    teleportPlayer(sim, Position.x[fruit]!, Position.y[fruit]!);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(0);
  });

  it("empties the bank on level advance", () => {
    const sim = startShieldSim(["passiveShieldPelletsPlus"]);
    chompPowerPellets(sim, 2);
    expect(sim.snapshot().timers.shieldsBanked).toBe(2);
    sim["jumpToLevelClear"]();
    takeFirstOffered(sim);
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 500);
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
  });

  it("does nothing without the upgrade", () => {
    const sim = startShieldSim(["powerPelletInvuln"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 0, invulnMs: LEVEL2_INVULN_MS });
  });
});

describe("Shield Break", () => {
  function startBreakSim(enableUpgrades: PlayOptions["enableUpgrades"]): PlaySim {
    return startSim({ level: 2, maze: "maze1", enableUpgrades });
  }

  function chomp(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  it("holds power pellet effects at pickup and still banks the shield", () => {
    const sim = startBreakSim(["passiveShieldPellets", "passiveShieldBreak", "powerPelletInvuln"]);
    chomp(sim);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    expect(sim.snapshot().timers.invulnMs).toBe(0);
  });

  it("fires every power pellet effect when the shield breaks", () => {
    const sim = startBreakSim([
      "passiveShieldPellets",
      "passiveShieldBreak",
      "powerPelletSpeedBurst",
      "powerPelletInvuln",
    ]);
    chomp(sim);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot()).toMatchObject({ dying: false });
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
    expect(sim.snapshot().timers.speedBurstMs).toBeGreaterThan(0);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(SHIELD_BREAK_INVULN_MS - 2 * FRAME_MS);
  });

  it("applies without Shield, firing on a Starting Shield break", () => {
    const sim = startBreakSim([
      "passiveStartingShield",
      "passiveShieldBreak",
      "powerPelletSpeedBurst",
    ]);
    chomp(sim);
    expect(sim.snapshot().timers.speedBurstMs).toBe(0);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.speedBurstMs).toBeGreaterThan(0);
  });

  it("fires on a Hyperspeed+ shield break without renewing the shield", () => {
    const sim = startBreakSim(["powerPelletHyperspeedPlus", "passiveShieldBreak"]);
    chomp(sim);
    expect(sim.snapshot().timers.hyperspeedMs).toBe(0);
    sim["runUpgrades"] = {
      ...sim["runUpgrades"],
      hyperspeedRemainingMs: 3000,
      hyperspeedShieldRemainingMs: 2000,
    };
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot()).toMatchObject({ dying: false });
    expect(sim.snapshot().timers.hyperspeedMs).toBeGreaterThan(2500);
    expect(sim.snapshot().timers.hyperspeedShieldMs).toBe(0);
  });

  it("Plus fires effects when a pellet is eaten with a full bank", () => {
    const sim = startBreakSim([
      "passiveShieldPellets",
      "passiveShieldBreakPlus",
      "powerPelletSpeedBurst",
    ]);
    const [first, second] = query(sim.world, [PowerPellet, Position]);
    teleportPlayer(sim, Position.x[first!]!, Position.y[first!]!);
    runFrames(sim, 1);
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 1, speedBurstMs: 0 });
    teleportPlayer(sim, Position.x[second!]!, Position.y[second!]!);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    expect(sim.snapshot().timers.speedBurstMs).toBeGreaterThan(0);
  });

  it("base Shield Break wastes the pellet at a full bank", () => {
    const sim = startBreakSim([
      "passiveShieldPellets",
      "passiveShieldBreak",
      "powerPelletSpeedBurst",
    ]);
    for (const power of query(sim.world, [PowerPellet, Position]).slice(0, 2)) {
      teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      runFrames(sim, 1);
    }
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 1, speedBurstMs: 0 });
  });
});

describe("Starting Shield", () => {
  function startShieldSim(enableUpgrades: PlayOptions["enableUpgrades"]): PlaySim {
    return startSim({ level: 2, maze: "maze1", enableUpgrades });
  }

  it("starts the board with 1 shield, or 2 with Starting Shield+", () => {
    expect(startShieldSim(["passiveStartingShield"]).snapshot().timers.shieldsBanked).toBe(1);
    expect(startShieldSim(["passiveStartingShieldPlus"]).snapshot().timers.shieldsBanked).toBe(2);
    expect(startShieldSim(["passiveStartingShield"]).hud().shields).toBe(1);
  });

  it("a catch breaks a shield, costing no life, then a second catch is a death", () => {
    const sim = startShieldSim(["passiveStartingShield"]);
    const livesBefore = sim.snapshot().lives;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot()).toMatchObject({ dying: false, lives: livesBefore });
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
    runUntil(sim, () => bounceIdle(sim), 400);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
  });

  it("refills the shields on every new level", () => {
    const sim = startShieldSim(["passiveStartingShieldPlus"]);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    sim["jumpToLevelClear"]();
    takeFirstOffered(sim);
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 500);
    expect(sim.snapshot().timers.shieldsBanked).toBe(2);
  });

  it("does not refill on a death, and does nothing without the upgrade", () => {
    expect(startShieldSim(["powerPelletInvuln"]).snapshot().timers.shieldsBanked).toBe(0);
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveStartingShield"],
      infiniteLives: true,
    });
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
    runUntil(sim, () => bounceIdle(sim), 400);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    runUntil(sim, () => !sim.snapshot().dying, 400);
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
  });

  it("banks shields when bought in a store and tops up when enhanced", () => {
    const sim = startShieldSim([]);
    sim["applyStorePurchase"]({ kind: "upgrade", id: "passiveStartingShield", price: 0 });
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    sim["applyStorePurchase"]({ kind: "enhance", targetId: "passiveStartingShield", price: 0 });
    expect(sim.snapshot().timers.shieldsBanked).toBe(2);
  });

  it("adds its cap to Shield Pellets", () => {
    const sim = startShieldSim(["passiveStartingShield", "passiveShieldPellets"]);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    const [first, second] = query(sim.world, [PowerPellet, Position]);
    for (const power of [first!, second!]) {
      teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      runFrames(sim, 1);
    }
    expect(sim.snapshot().timers.shieldsBanked).toBe(2);
  });

  it("a break fires power-pellet effects only with Shield Break", () => {
    const alone = startShieldSim(["passiveStartingShield", "powerPelletSpeedBurst"]);
    ghostOntoPlayer(alone);
    runFrames(alone, 1);
    expect(alone.snapshot().timers).toMatchObject({ shieldsBanked: 0, speedBurstMs: 0 });

    const paired = startShieldSim([
      "passiveStartingShield",
      "passiveShieldBreak",
      "powerPelletSpeedBurst",
    ]);
    ghostOntoPlayer(paired);
    runFrames(paired, 1);
    expect(paired.snapshot().timers.speedBurstMs).toBeGreaterThan(0);
  });
});

describe("Shield bounce", () => {
  const NUDGE_PX = 4;

  function corridorCell(fits: (col: number, row: number) => boolean): { x: number; y: number } {
    const { cols, rows } = getActiveLayout();
    for (let row = 0; row < rows; row += 1) {
      for (let col = 4; col < cols - 4; col += 1) {
        if (fits(col, row)) {
          return { x: cellCenterX(col), y: cellCenterY(row) };
        }
      }
    }
    throw new Error("no matching corridor cell");
  }

  const openRun = (col: number, row: number, from: number, to: number): boolean => {
    for (let step = from; step <= to; step += 1) {
      if (!isWalkable(col + step, row)) {
        return false;
      }
    }
    return true;
  };

  function breakSim(): { sim: PlaySim; player: number; ghost: number } {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["passiveStartingShield"] });
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    return { sim, player: playerEid(sim), ghost };
  }

  function place(eid: number, at: { x: number; y: number }, dx = 0): void {
    Position.x[eid] = at.x + dx;
    Position.y[eid] = at.y;
  }

  it("bounces Dot-Man and the ghost apart with no immunity, then both keep going the new way", () => {
    const { sim, player, ghost } = breakSim();
    const at = corridorCell((col, row) => openRun(col, row, -3, 4));
    place(player, at);
    place(ghost, at, -NUDGE_PX);
    const holdLeft = { keys: { ...NO_KEYS_HELD, left: 7 } };
    runFrames(sim, 1, holdLeft);
    expect(sim.snapshot()).toMatchObject({ dying: false });
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 0, invulnMs: 0 });
    expect(sim.snapshot().shieldBounce.player?.step).toEqual({ dx: 1, dy: 0 });
    expect(sim.snapshot().shieldBounce.ghosts).toEqual([
      { eid: ghost, step: { dx: -1, dy: 0 }, elapsedMs: 0 },
    ]);
    expect(Facing.direction[player]).toBe(DIRECTION.right);
    expect(Facing.direction[ghost]).toBe(DIRECTION.left);
    const playerStart = Position.x[player]!;
    const ghostStart = Position.x[ghost]!;

    runUntil(sim, () => bounceIdle(sim), 30, holdLeft);
    expect(Position.x[player]! - playerStart).toBeCloseTo(SHIELD_BOUNCE_TILES * TILE_SIZE, 0);
    expect(ghostStart - Position.x[ghost]!).toBeCloseTo(SHIELD_BOUNCE_TILES * TILE_SIZE, 0);

    const afterX = Position.x[player]!;
    runFrames(sim, 4, holdLeft);
    expect(Position.x[player]!).toBeGreaterThan(afterX);
    expect(Facing.direction[player]).toBe(DIRECTION.right);
    expect(Facing.direction[ghost]).toBe(DIRECTION.left);

    runFrames(sim, 2, { keys: { ...NO_KEYS_HELD, left: 8 } });
    expect(Facing.direction[player]).toBe(DIRECTION.left);
  });

  it("takes 300ms and hops in an arc, tipping the ghost as it slips", () => {
    const { sim, player, ghost } = breakSim();
    const at = corridorCell((col, row) => openRun(col, row, -3, 4));
    place(player, at);
    place(ghost, at, -NUDGE_PX);
    runFrames(sim, 1);
    const frames = Math.ceil(SHIELD_BOUNCE_MS / FRAME_MS);
    runFrames(sim, Math.floor(frames / 2));
    const hop = sim.renderOptions().spriteOffsets?.[player];
    expect(hop?.y).toBeLessThan(-TILE_SIZE / 4);
    expect(hop?.rotation).toBeUndefined();
    expect(Math.abs(sim.renderOptions().spriteOffsets?.[ghost]?.rotation ?? 0)).toBeGreaterThan(
      0.2,
    );
    runFrames(sim, frames - Math.floor(frames / 2) - 1);
    expect(sim.snapshot().shieldBounce.player).not.toBeNull();
    runFrames(sim, 1);
    expect(bounceIdle(sim)).toBe(true);
    expect(sim.renderOptions().spriteOffsets).toBeUndefined();
  });

  it("carries ghosts overlapping the breaking ghost along with it", () => {
    const { sim, player, ghost } = breakSim();
    const [, rider, bystander] = query(sim.world, [Ghost, Position]);
    const at = corridorCell((col, row) => openRun(col, row, -3, 4));
    place(player, at);
    place(ghost, at, -NUDGE_PX);
    place(rider!, at, -NUDGE_PX - 2);
    GhostPhase.value[rider!] = GHOST_PHASE.active;
    const far = corridorCell(
      (col, row) => openRun(col, row, -1, 1) && Math.abs(cellCenterY(row) - at.y) > 4 * TILE_SIZE,
    );
    place(bystander!, far);
    GhostPhase.value[bystander!] = GHOST_PHASE.active;
    runFrames(sim, 1);
    expect(
      sim
        .snapshot()
        .shieldBounce.ghosts.map((body) => body.eid)
        .sort(),
    ).toEqual([ghost, rider!].sort());
    expect(Facing.direction[rider!]).toBe(DIRECTION.left);
    const riderStart = Position.x[rider!]!;
    runUntil(sim, () => sim.snapshot().shieldBounce.ghosts.length === 0, 30);
    expect(riderStart - Position.x[rider!]!).toBeCloseTo(SHIELD_BOUNCE_TILES * TILE_SIZE, 0);
    expect(sim.snapshot().dying).toBe(false);
  });

  it("hands Dot-Man control back as soon as he hits a wall", () => {
    const { sim, player, ghost } = breakSim();
    const at = corridorCell((col, row) => !isWalkable(col + 1, row) && openRun(col, row, -4, 0));
    place(player, at);
    place(ghost, at, -NUDGE_PX);
    runFrames(sim, 1);
    expect(sim.snapshot().shieldBounce.player).not.toBeNull();
    runFrames(sim, 1);
    expect(sim.snapshot().shieldBounce.player).toBeNull();
    expect(sim.snapshot().shieldBounce.ghosts).toHaveLength(1);
    expect(Position.x[player]).toBe(at.x);
    runFrames(sim, 1, { keys: { ...NO_KEYS_HELD, left: 1 } });
    expect(Input.direction[player]).toBe(DIRECTION.left);
  });

  it("stuns a ghost that hits a wall for 750ms with a slip rotation, then it re-picks its way ignoring its facing", () => {
    const { sim, player, ghost } = breakSim();
    const at = corridorCell((col, row) => !isWalkable(col + 1, row) && openRun(col, row, -4, 0));
    place(ghost, at);
    place(player, at, -NUDGE_PX);
    runFrames(sim, 2);
    expect(sim.snapshot().shieldBounce.ghosts).toEqual([]);
    expect(sim.snapshot().shieldBounce.stunned).toEqual([
      { eid: ghost, remainingMs: GHOST_WALL_STUN_MS, slipSign: 1 },
    ]);
    expect(Facing.direction[ghost]).toBe(DIRECTION.none);
    expect(sim.renderOptions().spriteOffsets?.[ghost]?.y).toBe(0);
    expect(sim.renderOptions().spriteOffsets?.[ghost]?.rotation).toBeGreaterThan(0.2);
    const remaining = (): number => sim.snapshot().shieldBounce.stunned[0]?.remainingMs ?? 0;
    runUntil(sim, () => remaining() <= GHOST_WALL_STUN_MS * 0.72, 20);
    expect(sim.renderOptions().spriteOffsets?.[ghost]?.rotation).toBeLessThan(-0.05);
    runUntil(sim, () => remaining() <= GHOST_WALL_STUN_MS * 0.2, 40);
    expect(Position.x[ghost]).toBe(at.x);
    expect(sim.snapshot().shieldBounce.stunned).toHaveLength(1);
    const lateRotation = sim.renderOptions().spriteOffsets?.[ghost]?.rotation ?? 0;
    expect(Math.abs(lateRotation)).toBeLessThan(0.02);
    runUntil(sim, () => sim.snapshot().shieldBounce.stunned.length === 0, 20);
    runUntil(sim, () => Position.x[ghost] !== at.x || Position.y[ghost] !== at.y, 30);
    expect(Facing.direction[ghost]).not.toBe(DIRECTION.none);
  });

  it("bounces only Dot-Man when Reactive Armor sends the ghost home", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveStartingShield", "passiveReactiveArmor"],
    });
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    const at = corridorCell((col, row) => openRun(col, row, -3, 4));
    place(playerEid(sim), at);
    place(ghost, at, -NUDGE_PX);
    runFrames(sim, 1);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.inHouse);
    expect(sim.snapshot().shieldBounce.ghosts).toEqual([]);
    expect(sim.snapshot().shieldBounce.player?.step).toEqual({ dx: 1, dy: 0 });
  });

  it("keeps the immunity fallback for a lava break", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["passiveStartingShield"] });
    sim["breakShield"](null, null);
    expect(sim.snapshot().timers.invulnMs).toBe(SHIELD_BREAK_INVULN_MS);
    expect(bounceIdle(sim)).toBe(true);
  });
});

describe("PlaySim ghost catch overlap", () => {
  function ghostAtReachFraction(fraction: number): PlaySim {
    const sim = startSim({ level: 2, maze: "maze1", infiniteLives: true });
    ghostOntoPlayer(sim);
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    Position.x[ghost] = Position.x[playerEid(sim)]! + fraction * (playerRadius() + ghostRadius());
    return sim;
  }

  it("does not kill on a graze short of the 30% overlap bar", () => {
    const sim = ghostAtReachFraction(0.78);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(false);
  });

  it("kills once the ghost overlaps past the 30% overlap bar", () => {
    const sim = ghostAtReachFraction(0.6);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
  });
});

describe("Reanimation", () => {
  function startReanimation(enableUpgrades: UpgradeId[]): PlaySim {
    return startSim({ level: 2, maze: "maze1", infiniteLives: true, enableUpgrades });
  }

  function dieAwayFromSpawn(sim: PlaySim): { col: number; row: number } {
    const spawn = sim.snapshot().player!;
    const pellet = regularPelletEids(sim).find(
      (eid) => worldToRow(Position.y[eid]!) !== spawn.row,
    )!;
    eatPelletAt(sim, pellet);
    const fell = sim.snapshot().player!;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    return { col: fell.col, row: fell.row };
  }

  it("respawns at spawn without Reanimation", () => {
    const sim = startReanimation([]);
    const spawn = { ...sim.snapshot().player! };
    dieAwayFromSpawn(sim);
    expect(sim.snapshot().player).toMatchObject({ col: spawn.col, row: spawn.row });
  });

  it("respawns where the player fell", () => {
    const sim = startReanimation(["passiveReanimation"]);
    const fell = dieAwayFromSpawn(sim);
    const { player, ghosts } = sim.snapshot();
    expect(player).toMatchObject({ col: fell.col, row: fell.row });
    expect(Position.x[playerEid(sim)]).toBe(cellCenterX(fell.col));
    expect(Position.y[playerEid(sim)]).toBe(cellCenterY(fell.row));
    expect(ghosts.length).toBeGreaterThan(0);
    expect(ghosts.every((ghost) => ghost.phase === "inHouse")).toBe(true);
  });

  it("enhanced respawns next to a remaining power pellet", () => {
    const sim = startReanimation(["passiveReanimationPlus"]);
    const powers = query(sim.world, [PowerPellet, Position]);
    expect(powers.length).toBeGreaterThan(0);
    dieAwayFromSpawn(sim);
    const player = sim.snapshot().player!;
    const besidePower = powers.some((eid) => {
      const dCol = Math.abs(player.col - worldToCol(Position.x[eid]!));
      const dRow = Math.abs(player.row - worldToRow(Position.y[eid]!));
      return dCol + dRow === 1;
    });
    expect(besidePower).toBe(true);
  });

  it("enhanced falls back to where the player fell when no power pellet remains", () => {
    const sim = startReanimation(["passiveReanimationPlus"]);
    for (const eid of [...query(sim.world, [PowerPellet])]) {
      removeEntity(sim.world, eid);
    }
    expect(query(sim.world, [PowerPellet])).toHaveLength(0);
    const fell = dieAwayFromSpawn(sim);
    expect(sim.snapshot().player).toMatchObject({ col: fell.col, row: fell.row });
  });

  it("stacks with Death's Bounty and Death's Harvest", () => {
    const sim = startReanimation([
      "passiveReanimation",
      "passiveDeathsBounty",
      "passiveDeathsHarvest",
    ]);
    const pelletsBefore = sim.snapshot().pelletsRemaining;
    const fell = dieAwayFromSpawn(sim);
    expect(sim.snapshot().player).toMatchObject({ col: fell.col, row: fell.row });
    settleSlots(sim);
    expect(sim.snapshot().quarters).toBe(1);
    expect(sim.snapshot().pelletsRemaining).toBeLessThan(pelletsBefore - 1);
  });

  it("wins over the default spawn-on-save path on a Defy Death save", () => {
    const spawnAt = (enableUpgrades: UpgradeId[]) => {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades });
      const spawn = { ...sim.snapshot().player! };
      const power = query(sim.world, [PowerPellet, Position])[0]!;
      teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      runFrames(sim, 1);
      const fell = { ...sim.snapshot().player! };
      expect(fell.row).not.toBe(spawn.row);
      const lives = sim.snapshot().lives;
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot().lives).toBe(lives);
      return { spawn, fell, player: sim.snapshot().player! };
    };

    const without = spawnAt(["passiveDefyDeath"]);
    expect(without.player).toMatchObject({ col: without.spawn.col, row: without.spawn.row });

    const withBase = spawnAt(["passiveReanimation", "passiveDefyDeath"]);
    expect(withBase.player).toMatchObject({ col: withBase.fell.col, row: withBase.fell.row });
  });

  it("enhanced wins over spawn-on-save and warps beside a power pellet on Defy Death", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveReanimationPlus", "passiveDefyDeath"],
    });
    const spawn = { ...sim.snapshot().player! };
    const powersBefore = query(sim.world, [PowerPellet, Position]);
    expect(powersBefore.length).toBeGreaterThan(1);
    const power = powersBefore[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    const lives = sim.snapshot().lives;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().lives).toBe(lives);
    const player = sim.snapshot().player!;
    expect(player).not.toMatchObject({ col: spawn.col, row: spawn.row });
    const remaining = query(sim.world, [PowerPellet, Position]);
    expect(remaining.length).toBeGreaterThan(0);
    const besidePower = remaining.some((eid) => {
      const dCol = Math.abs(player.col - worldToCol(Position.x[eid]!));
      const dRow = Math.abs(player.row - worldToRow(Position.y[eid]!));
      return dCol + dRow === 1;
    });
    expect(besidePower).toBe(true);
  });

  it("wins over the default spawn-on-save path on a Money Talks save", () => {
    const runSave = (enableUpgrades: UpgradeId[]) => {
      const sim = startSim({
        level: 2,
        maze: "maze1",
        lives: 1,
        maxLives: 4,
        quarters: 5,
        enableUpgrades,
      });
      const spawn = { ...sim.snapshot().player! };
      const pellet = regularPelletEids(sim).find(
        (eid) => worldToRow(Position.y[eid]!) !== spawn.row,
      )!;
      eatPelletAt(sim, pellet);
      const fell = { ...sim.snapshot().player! };
      expect(fell.row).not.toBe(spawn.row);
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(true);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      expect(sim.snapshot().lives).toBe(1);
      return { spawn, fell, player: sim.snapshot().player! };
    };

    const without = runSave(["passiveMoneyTalks"]);
    expect(without.player).toMatchObject({ col: without.spawn.col, row: without.spawn.row });

    const withBase = runSave(["passiveMoneyTalks", "passiveReanimation"]);
    expect(withBase.player).toMatchObject({ col: withBase.fell.col, row: withBase.fell.row });
  });
});

describe("Interest", () => {
  const storeWith = (enableUpgrades: PlayOptions["enableUpgrades"], quarters = 9) =>
    startSim({ store: 1, level: 5, quarters, lives: 2, maxLives: 4, enableUpgrades });

  it("pays 1 Quarter per 3 held on store entry, 1 per 2 enhanced, nothing without it", () => {
    expect(storeWith(["passiveInterest"]).snapshot().quarters).toBe(12);
    expect(storeWith(["passiveInterestPlus"]).snapshot().quarters).toBe(13);
    expect(storeWith(["passiveInterest"], 2).snapshot().quarters).toBe(2);
    expect(storeWith([]).snapshot().quarters).toBe(9);
  });

  it("is enhanced by Automation Specialist, not Harvest Specialist", () => {
    const automation = storeWith([
      "passiveInterest",
      "passivePickupRange",
      "passiveEcho",
      "passivePelletToPower",
      "passiveAutomationSpecialist",
    ]);
    expect(automation.snapshot().quarters).toBe(13);
    expect(automation.hud().upgrades).toEqual([
      "passiveInterestPlus",
      "passivePickupRangePlus",
      "passiveEchoPlus",
      "passivePelletToPowerPlus",
      "passiveAutomationSpecialist",
    ]);
    const harvest = storeWith([
      "passiveInterest",
      "fruitQuarterBounty",
      "fruitFecundity",
      "fruitFeast",
      "passiveHarvestSpecialist",
    ]);
    expect(harvest.snapshot().quarters).toBe(12);
  });

  it("pops the paid Quarters into the HUD one at a time", () => {
    const sim = storeWith(["passiveInterest"]);
    expect(sim.hud().quarters).toBe(9);
    expect(sim.snapshot().interestPop).toEqual({ count: 3, shown: 0 });
    const seen: number[] = [];
    let pulses = 0;
    for (let i = 0; i < 240 && sim.snapshot().interestPop !== null; i += 1) {
      const events = runFrames(sim, 1);
      pulses += events.filter((e) => e.type === "quarters" && e.pulse).length;
      seen.push(sim.hud().quarters);
    }
    expect([...new Set(seen)]).toEqual([9, 10, 11, 12]);
    expect(pulses).toBe(3);
    expect(sim.hud().quarters).toBe(12);
  });

  it("shows the real wallet as soon as a purchase lands mid pop-in", () => {
    const sim = storeWith(["passiveInterest"], 15);
    const slot = sim.storeState()!.slots[0]!;
    teleportPlayer(sim, cellCenterX(slot.col), cellCenterY(slot.row));
    runFrames(sim, 1);
    runFrames(sim, 1, { storeFocus: "yes" });
    runFrames(sim, 1, { storeConfirm: true });
    expect(sim.snapshot().quarters).toBeLessThan(20);
    expect(sim.snapshot().interestPop).toBeNull();
    expect(sim.hud().quarters).toBe(sim.snapshot().quarters);
  });

  it("shows the real wallet as soon as you leave mid pop-in", () => {
    const sim = storeWith(["passiveInterest"], 15);
    expect(sim.hud().quarters).toBe(15);
    expect(sim.snapshot().interestPop).toEqual({ count: 5, shown: 0 });
    teleportPlayer(sim, cellCenterX(31), cellCenterY(20));
    const level = sim.snapshot().level;
    const events = runUntil(sim, () => sim.snapshot().level !== level, 120);
    expect(sim.snapshot().interestPop).toBeNull();
    expect(sim.hud().quarters).toBe(sim.snapshot().quarters);
    expect(events).toContainEqual({ type: "quarters", pulse: false });
  });
});

describe("Near Miss", () => {
  function startNearMiss(enableUpgrades: UpgradeId[]): PlaySim {
    return startSim({
      level: 2,
      maze: "maze1",
      infiniteLives: true,
      enableUpgrades,
      pennyCharge: 100,
    });
  }

  function ghostBesidePlayer(sim: PlaySim, ghost: number): void {
    const player = playerEid(sim);
    Position.x[ghost] = Position.x[player]! + 0.8 * TILE_SIZE;
    Position.y[ghost] = Position.y[player]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
  }

  function passGhost(sim: PlaySim): SimEvent[] {
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    const home = { x: Position.x[ghost]!, y: Position.y[ghost]! };
    ghostBesidePlayer(sim, ghost);
    const events = runFrames(sim, 1);
    Position.x[ghost] = home.x;
    Position.y[ghost] = home.y;
    return [...events, ...runFrames(sim, 1)];
  }

  it("earns 15 charge in pennies when a ghost brushes past", () => {
    const sim = startNearMiss(["passiveNearMiss"]);
    passGhost(sim);
    expect(sim.snapshot().nearMissesPaid).toBe(1);
    expect(sim.snapshot().pennies.charge).toBe(100 + NEAR_MISS_CHARGE);
  });

  it("charges 30 when enhanced", () => {
    const sim = startNearMiss(["passiveNearMissPlus"]);
    passGhost(sim);
    expect(sim.snapshot().pennies.charge).toBe(100 + NEAR_MISS_ENHANCED_CHARGE);
  });

  it("pays every separate pass", () => {
    const sim = startNearMiss(["passiveNearMiss"]);
    passGhost(sim);
    passGhost(sim);
    expect(sim.snapshot().nearMissesPaid).toBe(2);
    expect(sim.snapshot().pennies.charge).toBe(100 + 2 * NEAR_MISS_CHARGE);
  });

  it("pays again on a fresh touch after separating by only a little", () => {
    const sim = startNearMiss(["passiveNearMiss"]);
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    const player = playerEid(sim);
    ghostBesidePlayer(sim, ghost);
    runFrames(sim, 1);
    Position.x[ghost] = Position.x[player]! + 1.2 * TILE_SIZE;
    runFrames(sim, 1);
    ghostBesidePlayer(sim, ghost);
    runFrames(sim, 1);
    expect(sim.snapshot().nearMissesPaid).toBe(2);
  });

  it("pays nothing when not owned", () => {
    const sim = startNearMiss([]);
    passGhost(sim);
    expect(sim.snapshot().nearMissesPaid).toBe(0);
    expect(sim.snapshot().pennies.charge).toBe(100);
  });

  it("pays on contact even while the ghost stays touching, once", () => {
    const sim = startNearMiss(["passiveNearMiss"]);
    ghostBesidePlayer(sim, query(sim.world, [Ghost, Position])[0]!);
    runFrames(sim, 3);
    expect(sim.snapshot().nearMissesPaid).toBe(1);
    expect(sim.snapshot().pennies.charge).toBe(100 + NEAR_MISS_CHARGE);
  });

  it("pays nothing when the ghost catches you", () => {
    const sim = startNearMiss(["passiveNearMiss"]);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    runFrames(sim, 1);
    expect(sim.snapshot().nearMissesPaid).toBe(0);
    expect(sim.snapshot().pennies.charge).toBe(100);
  });

  it("pays nothing for the frozen ghost", () => {
    const sim = startNearMiss(["passiveNearMiss", "powerPelletFreeze"]);
    GhostPhase.value[query(sim.world, [Ghost])[0]!] = GHOST_PHASE.active;
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    const frozen = frozenGhostEid(sim["runUpgrades"])!;
    expect(frozen).not.toBeNull();
    const home = { x: Position.x[frozen]!, y: Position.y[frozen]! };
    ghostBesidePlayer(sim, frozen);
    runFrames(sim, 1);
    Position.x[frozen] = home.x;
    Position.y[frozen] = home.y;
    runFrames(sim, 1);
    expect(sim.snapshot().nearMissesPaid).toBe(0);
  });

  it("pays nothing while Ghost Proof makes the pass safe", () => {
    const sim = startNearMiss(["passiveNearMiss", "powerPelletInvuln"]);
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(0);
    passGhost(sim);
    expect(sim.snapshot().nearMissesPaid).toBe(0);
  });
});

describe("Haunting", () => {
  const LEFT = { keys: held("left") };

  function startHaunting(enableUpgrades: UpgradeId[], level = 3): PlaySim {
    return startSim({ level, maze: "maze1", infiniteLives: true, enableUpgrades });
  }

  function dieToFirstGhost(sim: PlaySim): number {
    runFrames(sim, 20, LEFT);
    const killer = query(sim.world, [Ghost, Position])[0]!;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    return killer;
  }

  function nameOf(sim: PlaySim, eid: number): string | null {
    return ghostName(sim.world, eid);
  }

  function ignoreFurtherCatches(sim: PlaySim): void {
    (sim as unknown as { options: PlayOptions }).options.godMode = true;
  }

  function inHouse(eid: number): boolean {
    return GhostPhase.value[eid] === GHOST_PHASE.inHouse;
  }

  it("seats the caged ghost last even when its gate has already passed", () => {
    const sim = startHaunting(["passiveHaunting"]);
    runFrames(sim, 20, LEFT);
    const blinky = query(sim.world, [Ghost, Position]).find(
      (eid) => GhostKind.kind[eid] === GHOST_KIND.blinky,
    )!;
    const player = playerEid(sim);
    Position.x[blinky] = Position.x[player]!;
    Position.y[blinky] = Position.y[player]!;
    GhostPhase.value[blinky] = GHOST_PHASE.active;
    runFrames(sim, 1);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().hauntedGhost).toBe("blinky");
    const inHouseGhosts = query(sim.world, [Ghost, Position]).filter(inHouse);
    const bySeat = [...inHouseGhosts].sort((a, b) => (Position.x[a] ?? 0) - (Position.x[b] ?? 0));
    expect(bySeat.at(-1)).toBe(blinky);
  });

  it("without Haunting the ghost that caught you leaves the house as usual", () => {
    const sim = startHaunting([]);
    const killer = dieToFirstGhost(sim);
    expect(sim.snapshot().hauntedGhost).toBeNull();
    runUntil(sim, () => !inHouse(killer), 60 * 5, LEFT);
    expect(inHouse(killer)).toBe(false);
  });

  it("cages the ghost that caught you for 10 seconds, then lets it out", () => {
    const sim = startHaunting(["passiveHaunting"]);
    const killer = dieToFirstGhost(sim);
    expect(sim.snapshot().hauntedGhost).toBe(nameOf(sim, killer));
    expect(sim.snapshot().timers.hauntMs).toBe(HAUNTING_MS);
    expect(sim.renderOptions().hauntedGhost).toEqual({ eid: killer, remainingMs: HAUNTING_MS });
    ignoreFurtherCatches(sim);

    runFrames(sim, Math.floor((HAUNTING_MS - 200) / FRAME_MS), LEFT);
    expect(sim.snapshot().dying).toBe(false);
    expect(inHouse(killer)).toBe(true);
    expect(sim.snapshot().hauntedGhost).toBe(nameOf(sim, killer));

    runUntil(sim, () => !inHouse(killer), 60 * 5, LEFT);
    expect(inHouse(killer)).toBe(false);
    expect(sim.snapshot().hauntedGhost).toBeNull();
    expect(sim.renderOptions().hauntedGhost).toBeNull();
  });

  it("Haunting+ keeps the ghost caged for the rest of the level", () => {
    const sim = startHaunting(["passiveHauntingPlus"]);
    const killer = dieToFirstGhost(sim);
    expect(sim.snapshot().timers.hauntMs).toBe(-1);
    ignoreFurtherCatches(sim);
    runFrames(sim, Math.floor((HAUNTING_MS * 2) / FRAME_MS), LEFT);
    expect(sim.snapshot().dying).toBe(false);
    expect(inHouse(killer)).toBe(true);
    expect(sim.snapshot().hauntedGhost).toBe(nameOf(sim, killer));
  });

  it("still cages the killer when Reanimation is owned", () => {
    const sim = startHaunting(["passiveReanimation", "passiveHaunting"]);
    runFrames(sim, 20, LEFT);
    const killer = query(sim.world, [Ghost, Position])[0]!;
    for (const eid of query(sim.world, [Ghost, Position]).filter((eid) => eid !== killer)) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(inHouse(killer)).toBe(true);
    expect(sim.snapshot().hauntedGhost).toBe(nameOf(sim, killer));
  });

  it("haunts on a Defy Death save", () => {
    const sim = startSim({
      level: 3,
      maze: "maze1",
      enableUpgrades: ["passiveHaunting", "passiveDefyDeath"],
    });
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    const lives = sim.snapshot().lives;
    const ghosts = query(sim.world, [Ghost, Position, GhostPhase]);
    const killer = ghosts[0]!;
    const bystander = ghosts[1]!;
    for (const eid of ghosts) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
    Position.x[bystander] = cellCenterX(1);
    Position.y[bystander] = cellCenterY(1);
    const bystanderAt = { x: Position.x[bystander]!, y: Position.y[bystander]! };
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().lives).toBe(lives);
    expect(sim.snapshot().hauntedGhost).toBe(nameOf(sim, killer));
    expect(inHouse(killer)).toBe(true);
    expect(GhostPhase.value[bystander]).toBe(GHOST_PHASE.active);
    expect({ x: Position.x[bystander], y: Position.y[bystander] }).toEqual(bystanderAt);
  });

  it("does not haunt on a shield break", () => {
    const sim = startHaunting(["passiveHaunting", "passiveShieldPellets"]);
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().hauntedGhost).toBeNull();
  });

  it.each(["blinkySwarm", "chainedGhosts"] as const)(
    "cages the ghost that caught you in the %s boss fight",
    (boss) => {
      const sim = startSim({
        level: 9,
        boss,
        infiniteLives: true,
        enableUpgrades: ["passiveHaunting"],
      });
      runFrames(sim, 20, LEFT);
      const killer = query(sim.world, [Ghost, Position])[0]!;
      const killerKind = GhostKind.kind[killer];
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(true);
      runUntil(sim, () => !sim.snapshot().dying, 240);
      const haunted = sim.renderOptions().hauntedGhost;
      expect(haunted).not.toBeNull();
      expect(GhostKind.kind[haunted!.eid]).toBe(killerKind);
      expect(inHouse(haunted!.eid)).toBe(true);
      expect(sim.snapshot().timers.hauntMs).toBe(HAUNTING_MS);
      ignoreFurtherCatches(sim);

      runFrames(sim, Math.floor((HAUNTING_MS - 200) / FRAME_MS), LEFT);
      expect(inHouse(haunted!.eid)).toBe(true);
      runUntil(sim, () => !inHouse(haunted!.eid), 60 * 5, LEFT);
      expect(inHouse(haunted!.eid)).toBe(false);
      expect(sim.snapshot().hauntedGhost).toBeNull();
    },
  );

  it("frees the caged ghost once the level ends", () => {
    const sim = startHaunting(["passiveHauntingPlus"]);
    const killer = dieToFirstGhost(sim);
    expect(sim.snapshot().hauntedGhost).toBe(nameOf(sim, killer));
    const [last, ...rest] = regularPelletEids(sim);
    for (const eid of [...rest, ...query(sim.world, [PowerPellet])]) {
      removeEntity(sim.world, eid);
    }
    ignoreFurtherCatches(sim);
    eatPelletAt(sim, last!);
    expect(sim.snapshot().timers.hauntMs).toBe(-1);
    sim.chooseUpgrade({ kind: "upgrade", id: drainToOffer(sim).upgrades[0]! });
    runUntil(sim, () => sim.snapshot().inStore || sim.snapshot().level === 4, 600);
    expect(sim.snapshot().timers.hauntMs).toBe(0);
    expect(sim.snapshot().hauntedGhost).toBeNull();
  });
});

describe("Tunnel Sanctuary", () => {
  const tunnelRow = () => horizontalTunnelRows()[0]!;

  function wrapPlayerLeft(sim: PlaySim): void {
    teleportPlayer(sim, cellCenterX(0), cellCenterY(tunnelRow()));
    runUntil(sim, () => sim.snapshot().runLog.tunnelWraps === 1, 120, { keys: held("left") });
  }

  function ghostInTunnelMouth(sim: PlaySim): number {
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    Position.x[ghost] = cellCenterX(0);
    Position.y[ghost] = cellCenterY(tunnelRow());
    return ghost;
  }

  it.each([
    ["passiveTunnelSanctuary", 0.9],
    ["passiveTunnelSanctuaryPlus", 0.6],
  ] as const)("%s sets the ghost tunnel speed to %f x Maze-Man's", (id, ratio) => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [id] });
    const ghost = ghostInTunnelMouth(sim);
    runFrames(sim, 1);
    expect(Speed.px[ghost]! / Speed.px[playerEid(sim)]!).toBeCloseTo(ratio);
  });

  it.each(["passiveTunnelSanctuary", "passiveTunnelSanctuaryPlus"] as const)(
    "%s grants 1s of Ghost Proof on coming out of a tunnel",
    (id) => {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [id] });
      expect(sim.snapshot().timers.invulnMs).toBe(0);
      wrapPlayerLeft(sim);
      expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(1000 - 2 * FRAME_MS);
      expect(sim.snapshot().timers.invulnMs).toBeLessThanOrEqual(1000);
    },
  );

  it("grants nothing on a tunnel wrap without the upgrade", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    wrapPlayerLeft(sim);
    expect(sim.snapshot().timers.invulnMs).toBe(0);
  });

  it("never shortens a longer Ghost Proof", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveTunnelSanctuary"],
    });
    teleportPlayer(sim, cellCenterX(0), cellCenterY(tunnelRow()));
    sim["runUpgrades"] = { ...sim["runUpgrades"], invulnRemainingMs: INVULN_MS };
    runUntil(sim, () => sim.snapshot().runLog.tunnelWraps === 1, 120, { keys: held("left") });
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(1000);
    expect(sim.snapshot().timers.invulnMs).toBeLessThanOrEqual(INVULN_MS);
  });

  it("is not doubled by Overcharge", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveTunnelSanctuary", "passiveOvercharge"],
    });
    wrapPlayerLeft(sim);
    expect(sim.snapshot().timers.invulnMs).toBeLessThanOrEqual(1000);
  });

  it("does not grant Ghost Proof for a teleport that is not a tunnel exit", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      godMode: true,
      enableUpgrades: ["passiveTunnelSanctuary", "powerPelletWarpFarthest"],
    });
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    const before = { x: Position.x[power]!, y: Position.y[power]! };
    teleportPlayer(sim, before.x, before.y);
    runFrames(sim, 30);
    expect(Math.abs(Position.x[playerEid(sim)]! - before.x)).toBeGreaterThan(0);
    expect(sim.snapshot().timers.invulnMs).toBe(0);
    expect(sim.snapshot().runLog.tunnelWraps).toBe(0);
  });

  it("lets a ghost wrap through the tunnel in the base form and blocks it in the enhanced form", () => {
    for (const [id, wraps] of [
      ["passiveTunnelSanctuary", true],
      ["passiveTunnelSanctuaryPlus", false],
    ] as const) {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [id] });
      const ghost = ghostInTunnelMouth(sim);
      const width = getActiveLayout().cols * getActiveLayout().tileSize;
      let wrapped = false;
      for (let frame = 0; frame < 90; frame += 1) {
        Facing.direction[ghost] = DIRECTION.left;
        Input.direction[ghost] = DIRECTION.left;
        Ghost.decidedCol[ghost] = 0;
        Ghost.decidedRow[ghost] = tunnelRow();
        Position.x[ghost] = Math.min(Position.x[ghost]!, cellCenterX(0) + 1);
        runFrames(sim, 1);
        wrapped ||= Position.x[ghost]! > width / 2;
      }
      expect(wrapped).toBe(wraps);
    }
  });

  it("still lets a blocked ghost walk out of the tunnel", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveTunnelSanctuaryPlus"],
    });
    const ghost = ghostInTunnelMouth(sim);
    Facing.direction[ghost] = DIRECTION.right;
    Input.direction[ghost] = DIRECTION.right;
    runFrames(sim, 30);
    expect(Position.x[ghost]!).toBeGreaterThan(cellCenterX(0) + 2);
  });
});

describe("Tithe", () => {
  function startTithe(enableUpgrades: UpgradeId[]): PlaySim {
    return startSim({ level: 2, maze: "maze1", infiniteLives: true, enableUpgrades }, "tithe1");
  }

  function chompPower(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  function settledSpeed(sim: PlaySim): number {
    runUntil(sim, () => sim.snapshot().timers.eatDragMs === 0, 240);
    runFrames(sim, 1);
    return Speed.px[playerEid(sim)]!;
  }

  function eatRegular(sim: PlaySim, count: number): void {
    for (let eaten = 0; eaten < count; eaten += 1) {
      const eid = regularPelletEids(sim)[0]!;
      teleportPlayer(sim, Position.x[eid]!, Position.y[eid]!);
      runFrames(sim, 1);
    }
  }

  function streakGainedByThree(sim: PlaySim): number {
    const before = sim.snapshot().pennies.streak;
    eatRegular(sim, 3);
    return sim.snapshot().pennies.streak - before;
  }

  it("slows Maze-Man to 0.9x and counts each pellet twice for the window", () => {
    const sim = startTithe(["powerPelletTithe"]);
    runFrames(sim, 1);
    const baseSpeed = Speed.px[playerEid(sim)]!;
    expect(streakGainedByThree(sim)).toBe(3);
    chompPower(sim);
    expect(sim.snapshot().timers.titheMs).toBeGreaterThan(0);
    expect(settledSpeed(sim)).toBeCloseTo(baseSpeed * TITHE_SPEED_MUL);
    expect(streakGainedByThree(sim)).toBe(6);
  });

  it("returns to normal speed and streak once the window ends", () => {
    const sim = startTithe(["powerPelletTithe"]);
    runFrames(sim, 1);
    const baseSpeed = Speed.px[playerEid(sim)]!;
    chompPower(sim);
    runUntil(sim, () => sim.snapshot().timers.titheMs === 0, 600);
    runFrames(sim, 1);
    expect(Speed.px[playerEid(sim)]!).toBeCloseTo(baseSpeed);
    expect(streakGainedByThree(sim)).toBe(3);
  });

  it("lasts 5 seconds, or 8 when enhanced", () => {
    const base = startTithe(["powerPelletTithe"]);
    chompPower(base);
    expect(base.snapshot().timers.titheMs).toBeGreaterThan(TITHE_MS - 100);
    expect(base.snapshot().timers.titheMs).toBeLessThanOrEqual(TITHE_MS);

    const plus = startTithe(["powerPelletTithePlus"]);
    chompPower(plus);
    expect(plus.snapshot().timers.titheMs).toBeGreaterThan(TITHE_ENHANCED_MS - 100);
    expect(plus.snapshot().timers.titheMs).toBeLessThanOrEqual(TITHE_ENHANCED_MS);
  });

  it("does nothing without the upgrade", () => {
    const sim = startTithe([]);
    runFrames(sim, 1);
    const baseSpeed = Speed.px[playerEid(sim)]!;
    chompPower(sim);
    expect(sim.snapshot().timers.titheMs).toBe(0);
    expect(settledSpeed(sim)).toBeCloseTo(baseSpeed);
    expect(streakGainedByThree(sim)).toBe(3);
  });

  it("doubles the Streak Engine count and still pops on real pellets", () => {
    const sim = startTithe(["powerPelletTithe", "passiveStreakEngine", "powerPelletSpeedBurst"]);
    chompPower(sim);
    const events: SimEvent[] = [];
    while (sim.snapshot().pennies.streak < 30) {
      const eid = regularPelletEids(sim)[0]!;
      teleportPlayer(sim, Position.x[eid]!, Position.y[eid]!);
      events.push(...runFrames(sim, 1));
    }
    const pops = events.flatMap((event) => (event.type === "streakPop" ? [event.value] : []));
    expect(pops).toEqual([5, 10, 15, 20, 25, 30]);
    expect(sim.snapshot().timers.speedBurstMs).toBeGreaterThan(0);
  });

  it("is doubled by Overcharge", () => {
    const sim = startTithe(["powerPelletTithe", "passiveOvercharge"]);
    chompPower(sim);
    expect(sim.snapshot().timers.titheMs).toBeGreaterThan(2 * TITHE_MS - 100);
  });
});

describe("Streak Engine", () => {
  function startStreak(enableUpgrades: UpgradeId[]): PlaySim {
    return startSim({ level: 2, maze: "maze1", infiniteLives: true, enableUpgrades }, "streak1");
  }

  function eatUntilStreak(sim: PlaySim, streak: number): SimEvent[] {
    const events: SimEvent[] = [];
    while (sim.snapshot().pennies.streak < streak) {
      const eid = regularPelletEids(sim)[0]!;
      teleportPlayer(sim, Position.x[eid]!, Position.y[eid]!);
      events.push(...runFrames(sim, 1));
    }
    return events;
  }

  function popValues(events: SimEvent[]): number[] {
    return events.flatMap((event) => (event.type === "streakPop" ? [event.value] : []));
  }

  it("fires the power-pellet effects when the streak reaches 30", () => {
    const sim = startStreak(["passiveStreakEngine", "powerPelletSpeedBurst"]);
    eatUntilStreak(sim, 29);
    expect(sim.snapshot().timers.speedBurstMs).toBe(0);
    eatUntilStreak(sim, 30);
    expect(sim.snapshot().timers.speedBurstMs).toBeGreaterThan(0);
  });

  it("does nothing without the upgrade", () => {
    const sim = startStreak(["powerPelletSpeedBurst"]);
    const events = eatUntilStreak(sim, 30);
    expect(sim.snapshot().timers.speedBurstMs).toBe(0);
    expect(popValues(events)).toEqual([]);
  });

  it("starts over when the streak breaks", () => {
    const sim = startStreak(["passiveStreakEngine", "powerPelletSpeedBurst"]);
    eatUntilStreak(sim, 20);
    runFrames(sim, 40);
    expect(sim.snapshot().pennies.streak).toBe(0);
    eatUntilStreak(sim, 29);
    expect(sim.snapshot().timers.speedBurstMs).toBe(0);
  });

  it("pops 5 through 30 from the pellets along the streak", () => {
    const sim = startStreak(["passiveStreakEngine"]);
    const events = eatUntilStreak(sim, 30);
    expect(popValues(events)).toEqual([5, 10, 15, 20, 25, 30]);
    expect(sim.snapshot().streakPops).toEqual({ count: 6, last: 30 });
  });

  it("restarts the pop-offs at 5 after 30", () => {
    const sim = startStreak(["passiveStreakEngine"]);
    eatUntilStreak(sim, 30);
    expect(popValues(eatUntilStreak(sim, 35))).toEqual([5]);
  });

  it("keeps Plus Ghost Proof when Warp Farthest+ also fires", () => {
    const sim = startStreak(["passiveStreakEnginePlus", "powerPelletWarpFarthestPlus"]);
    eatUntilStreak(sim, 30);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(STREAK_ENGINE_ENHANCED_INVULN_MS - 100);
  });

  it("grants 3s of Ghost Proof only when enhanced", () => {
    const base = startStreak(["passiveStreakEngine"]);
    eatUntilStreak(base, 30);
    expect(base.snapshot().timers.invulnMs).toBe(0);

    const plus = startStreak(["passiveStreakEnginePlus"]);
    eatUntilStreak(plus, 30);
    expect(plus.snapshot().timers.invulnMs).toBeGreaterThan(STREAK_ENGINE_ENHANCED_INVULN_MS - 100);
    expect(plus.snapshot().timers.invulnMs).toBeLessThanOrEqual(STREAK_ENGINE_ENHANCED_INVULN_MS);
  });

  it("grants the Ghost Proof when Harvest Specialist enhances it", () => {
    const sim = startStreak([
      "passiveStreakEngine",
      "passiveHarvestSpecialist",
      "fruitPowerPellet",
      "fruitFecundity",
      "fruitFeast",
    ]);
    eatUntilStreak(sim, 30);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(STREAK_ENGINE_ENHANCED_INVULN_MS - 100);
  });

  it("doubles the Ghost Proof with Overcharge", () => {
    const sim = startStreak(["passiveStreakEnginePlus", "passiveOvercharge"]);
    eatUntilStreak(sim, 30);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(
      2 * STREAK_ENGINE_ENHANCED_INVULN_MS - 100,
    );
  });

  it("banks a shield instead of firing when Shield Break is owned", () => {
    const sim = startStreak([
      "passiveStreakEngine",
      "passiveShieldPellets",
      "passiveShieldBreak",
      "powerPelletSpeedBurst",
    ]);
    eatUntilStreak(sim, 30);
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 1, speedBurstMs: 0 });
  });
});

describe("Echo", () => {
  const AFTER_ECHO_MS = ECHO_DELAY_MS + 500;
  const AFTER_EXPIRY_MS = INVULN_MS + 100;
  const LEVEL2_INVULN_MS = levelScaledDurationMs(INVULN_MS, 2, INVULN_FLOOR_RATIO);

  function startEcho(enableUpgrades: UpgradeId[], godMode = true): PlaySim {
    return startSim({ level: 2, maze: "maze1", godMode, enableUpgrades }, "echo1");
  }

  function chompPowerPellet(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  function runMs(sim: PlaySim, ms: number): SimEvent[] {
    return runFrames(sim, Math.ceil(ms / FRAME_MS));
  }

  it("fires a power-pellet effect again 3s after the chomp", () => {
    const sim = startEcho(["passiveEcho", "powerPelletInvuln"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.echoesMs).toEqual([ECHO_DELAY_MS]);
    runMs(sim, AFTER_ECHO_MS);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(LEVEL2_INVULN_MS - 600);
    expect(sim.snapshot().timers.echoesMs).toEqual([]);
  });

  it("leaves the effect to expire without the upgrade", () => {
    const sim = startEcho(["powerPelletInvuln"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.echoesMs).toEqual([]);
    runMs(sim, AFTER_EXPIRY_MS);
    expect(sim.snapshot().timers.invulnMs).toBe(0);
  });

  it("echoes one random effect, or every effect when enhanced", () => {
    const echoed = (id: UpgradeId): number => {
      const sim = startEcho([id, "powerPelletInvuln", "powerPelletSpeedBurst"]);
      chompPowerPellet(sim);
      runMs(sim, AFTER_EXPIRY_MS);
      const { invulnMs, speedBurstMs } = sim.snapshot().timers;
      return [invulnMs, speedBurstMs].filter((ms) => ms > 0).length;
    };
    expect(echoed("passiveEcho")).toBe(1);
    expect(echoed("passiveEchoPlus")).toBe(2);
  });

  it("queues a separate echo for each trigger", () => {
    const sim = startEcho(["passiveEcho", "powerPelletInvuln"]);
    chompPowerPellet(sim);
    runMs(sim, 1000);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.echoesMs).toHaveLength(2);
    runMs(sim, AFTER_ECHO_MS);
    expect(sim.snapshot().timers.echoesMs).toEqual([]);
  });

  it("doubles the echoed duration with Overcharge", () => {
    const sim = startEcho(["passiveEcho", "powerPelletInvuln", "passiveOvercharge"]);
    chompPowerPellet(sim);
    runMs(sim, ECHO_DELAY_MS + LEVEL2_INVULN_MS - 100);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(LEVEL2_INVULN_MS);
  });

  it("does not echo a shield banked under Shield Break", () => {
    const sim = startEcho([
      "passiveEcho",
      "passiveShieldPellets",
      "passiveShieldBreak",
      "powerPelletInvuln",
    ]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 1, echoesMs: [] });
  });

  it("drops pending echoes when a life is lost", () => {
    const sim = startEcho(["passiveEcho", "powerPelletSpeedBurst"], false);
    chompPowerPellet(sim);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().timers.echoesMs).toEqual([]);
  });
});

describe("level-scaled Freeze / Ghost Proof / Wall Pass", () => {
  function chompPowerPellet(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  it.each([
    ["powerPelletFreeze", "freezeMs", levelScaledDurationMs(FREEZE_MS, 5)],
    ["powerPelletInvuln", "invulnMs", levelScaledDurationMs(INVULN_MS, 5, INVULN_FLOOR_RATIO)],
    ["powerPelletWallPass", "wallPassMs", levelScaledDurationMs(WALL_PASS_MS, 5)],
  ] as const)("%s shortens to %i ms by level 5", (id, key, expected) => {
    const sim = startSim({ level: 5, maze: "maze1", enableUpgrades: [id] }, "level-scale");
    if (id === "powerPelletFreeze") {
      for (const eid of query(sim.world, [Ghost, Position])) {
        GhostPhase.value[eid] = GHOST_PHASE.active;
      }
    }
    chompPowerPellet(sim);
    const ms = sim.snapshot().timers[key];
    expect(ms).toBeLessThanOrEqual(expected);
    expect(ms).toBeGreaterThan(expected - 200);
  });
});

describe("Hunter", () => {
  const LEFT = { keys: held("left") };

  function startHunter(enableUpgrades: UpgradeId[], overrides: Partial<PlayOptions> = {}): PlaySim {
    return startSim(
      { level: 2, maze: "maze1", infiniteLives: true, enableUpgrades, ...overrides },
      "hunter",
    );
  }

  function ghosts(sim: PlaySim): number[] {
    return [...query(sim.world, [Ghost, Position])];
  }

  function outOfHouse(sim: PlaySim): number[] {
    return ghosts(sim).filter((eid) => GhostPhase.value[eid] !== GHOST_PHASE.inHouse);
  }

  function letGhostsOut(sim: PlaySim, count: number): void {
    (sim as unknown as { options: PlayOptions }).options.godMode = true;
    runUntil(sim, () => outOfHouse(sim).length >= count, 60 * 15, LEFT);
    (sim as unknown as { options: PlayOptions }).options.godMode = false;
  }

  function chompPowerPellet(sim: PlaySim): SimEvent[] {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    return runFrames(sim, 1);
  }

  function ghostOnto(sim: PlaySim, eid: number): SimEvent[] {
    const player = playerEid(sim);
    Position.x[eid] = Position.x[player]!;
    Position.y[eid] = Position.y[player]!;
    return runFrames(sim, 1);
  }

  it("frightens every ghost out of the house on a chomp and slows it to 0.6x speed", () => {
    const plain = startHunter([]);
    const sim = startHunter(["powerPelletHunter"]);
    letGhostsOut(plain, 2);
    letGhostsOut(sim, 2);
    const out = outOfHouse(sim);
    const speedOf = (of: PlaySim) => {
      runFrames(of, 1);
      return Speed.px[out[0]!]!;
    };
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.frightenedMs).toBe(5500);
    expect(sim.renderOptions().frightenedGhosts?.eids.sort()).toEqual(out.sort());
    expect(sim.snapshot().frightenedGhosts).toHaveLength(out.length);
    const frightenedSpeed = speedOf(sim);
    chompPowerPellet(plain);
    expect(plain.snapshot().frightenedGhosts).toEqual([]);
    expect(frightenedSpeed).toBeCloseTo(speedOf(plain) * 0.6);
  });

  it("eats a frightened ghost on touch: home with a glide, 75 then 150 then a full bar", () => {
    const sim = startHunter(["powerPelletHunter"]);
    letGhostsOut(sim, 3);
    chompPowerPellet(sim);
    const [first, second, third] = outOfHouse(sim);
    const charge = sim.snapshot().pennies.charge;
    const quarters = sim.snapshot().quarters;

    const events = ghostOnto(sim, first!);
    expect(sim.snapshot().dying).toBe(false);
    expect(GhostPhase.value[first!]).toBe(GHOST_PHASE.inHouse);
    expect(sim.renderOptions().ghostWarpGlides?.[first!]).toBeDefined();
    expect(events).toContainEqual({ type: "sfx", id: "pelletMunch2" });
    expect(sim.snapshot().pennies.charge).toBe(charge + 75);

    ghostOnto(sim, second!);
    expect(sim.snapshot().pennies.charge).toBe(charge + 225);
    ghostOnto(sim, third!);
    expect(sim.snapshot().slot.queued).toBe(0);
    expect(sim.snapshot().quarters).toBe(quarters + 1);
    expect(sim.snapshot().pennies.charge).toBe(charge + 225);
    expect(sim.snapshot().ghostsEatenThisFright).toBe(3);
    expect(sim.snapshot().dying).toBe(false);
  });

  it("eating the frozen ghost thaws it", () => {
    const sim = startHunter(["powerPelletHunter", "powerPelletFreeze"]);
    letGhostsOut(sim, 1);
    chompPowerPellet(sim);
    const frozen = frozenGhostEid(sim["runUpgrades"])!;
    expect(sim.renderOptions().frightenedGhosts?.eids).toContain(frozen);
    ghostOnto(sim, frozen);
    expect(GhostPhase.value[frozen]).toBe(GHOST_PHASE.inHouse);
    expect(frozenGhostEid(sim["runUpgrades"])).toBeNull();
  });

  it("does not eat a ghost still gliding to its Scatter Burst corner", () => {
    const sim = startHunter(["powerPelletHunter", "powerPelletScatterBurst"], { godMode: true });
    runUntil(
      sim,
      () => ghosts(sim).some((eid) => GhostPhase.value[eid] === GHOST_PHASE.active),
      60 * 15,
      LEFT,
    );
    chompPowerPellet(sim);
    const [ghost] = outOfHouse(sim).filter(
      (eid) => sim.renderOptions().ghostWarpGlides?.[eid] !== undefined,
    );
    expect(ghost).toBeDefined();
    ghostOnto(sim, ghost!);
    expect(GhostPhase.value[ghost!]).not.toBe(GHOST_PHASE.inHouse);
    expect(sim.snapshot().ghostsEatenThisFright).toBe(0);
  });

  it("eats through Ghost Proof", () => {
    const sim = startHunter(["powerPelletHunter", "powerPelletInvuln"]);
    letGhostsOut(sim, 1);
    chompPowerPellet(sim);
    const [ghost] = outOfHouse(sim);
    ghostOnto(sim, ghost!);
    expect(GhostPhase.value[ghost!]).toBe(GHOST_PHASE.inHouse);
    expect(sim.snapshot().ghostsEatenThisFright).toBe(1);
  });

  it("an eaten ghost comes back out normal and catches again, until the next chomp", () => {
    const sim = startHunter(["powerPelletHunter"]);
    letGhostsOut(sim, 1);
    chompPowerPellet(sim);
    const [ghost] = outOfHouse(sim);
    ghostOnto(sim, ghost!);
    (sim as unknown as { options: PlayOptions }).options.godMode = true;
    runUntil(sim, () => GhostPhase.value[ghost!] !== GHOST_PHASE.inHouse, 60 * 5, LEFT);
    expect(sim.snapshot().frightenedGhosts).not.toContain(ghostName(sim.world, ghost!));
    (sim as unknown as { options: PlayOptions }).options.godMode = false;

    chompPowerPellet(sim);
    expect(sim.renderOptions().frightenedGhosts?.eids).toContain(ghost);
    expect(sim.snapshot().ghostsEatenThisFright).toBe(0);
  });

  it("a touch kills again once the fright runs out", () => {
    const sim = startHunter(["powerPelletHunter"]);
    letGhostsOut(sim, 1);
    chompPowerPellet(sim);
    const [ghost] = outOfHouse(sim);
    runUntil(sim, () => sim.snapshot().timers.frightenedMs === 0, 60 * 7);
    expect(sim.snapshot().frightenedGhosts).toEqual([]);
    ghostOnto(sim, ghost!);
    expect(sim.snapshot().dying).toBe(true);
  });

  it("without Hunter a power pellet frightens nothing and a touch kills", () => {
    const sim = startHunter([]);
    letGhostsOut(sim, 1);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.frightenedMs).toBe(0);
    ghostOnto(sim, outOfHouse(sim)[0]!);
    expect(sim.snapshot().dying).toBe(true);
  });

  it("Hunter+ keeps an eaten ghost home until the fright ends, at 6s on any level", () => {
    const sim = startHunter(["powerPelletHunterPlus"], { level: 5 });
    letGhostsOut(sim, 1);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.frightenedMs).toBe(6000);
    const [ghost] = outOfHouse(sim);
    ghostOnto(sim, ghost!);
    expect(sim.snapshot().hunterHeld).toEqual([ghostName(sim.world, ghost!)]);
    (sim as unknown as { options: PlayOptions }).options.godMode = true;
    runUntil(sim, () => sim.snapshot().timers.frightenedMs === 0, 60 * 7, LEFT);
    expect(GhostPhase.value[ghost!]).toBe(GHOST_PHASE.inHouse);
    expect(sim.snapshot().hunterHeld).toEqual([]);
    runUntil(sim, () => GhostPhase.value[ghost!] !== GHOST_PHASE.inHouse, 60 * 5, LEFT);
  });

  it("base Hunter shortens to 4s by level 5, and Overcharge doubles it", () => {
    const base = startHunter(["powerPelletHunter"], { level: 5 });
    chompPowerPellet(base);
    expect(base.snapshot().timers.frightenedMs).toBe(4000);
    const overcharged = startHunter(["powerPelletHunter", "passiveOvercharge"], { level: 5 });
    chompPowerPellet(overcharged);
    expect(overcharged.snapshot().timers.frightenedMs).toBe(8000);
  });

  it("Shield Break banks the chomp instead of frightening", () => {
    const sim = startHunter(["powerPelletHunter", "passiveShieldPellets", "passiveShieldBreak"]);
    letGhostsOut(sim, 1);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.frightenedMs).toBe(0);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
  });

  it("clears the fright on a death", () => {
    const sim = startHunter(["powerPelletHunter"]);
    letGhostsOut(sim, 2);
    chompPowerPellet(sim);
    runUntil(sim, () => sim.snapshot().timers.frightenedMs === 0, 60 * 7);
    ghostOnto(sim, outOfHouse(sim)[0]!);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().frightenedGhosts).toEqual([]);
  });

  it("frightens only the 4 closest Blinkys on the Blinky Swarm", () => {
    const sim = new PlaySim(
      {
        ...defaultPlayOptions(),
        level: 9,
        boss: "blinkySwarm",
        enableUpgrades: ["powerPelletHunter"],
        godMode: true,
      },
      "hunter",
      resolveTuning({ bossSwarmStartGhosts: 6 }),
    );
    sim.start();
    const target = regularPelletEids(sim)[0]!;
    convertPelletToPower(sim.world, target);
    ghosts(sim).forEach((eid, i) => {
      GhostPhase.value[eid] = GHOST_PHASE.active;
      Position.x[eid] = Position.x[target]! + TILE_SIZE * (i + 2);
      Position.y[eid] = Position.y[target]!;
    });
    teleportPlayer(sim, Position.x[target]!, Position.y[target]!);
    runFrames(sim, 1);
    const frightened = sim.renderOptions().frightenedGhosts?.eids ?? [];
    expect(frightened).toHaveLength(4);
    expect(frightened.sort()).toEqual(ghosts(sim).slice(0, 4).sort());
  });

  it("frightens the Chained Ghosts, but their lightning still kills", () => {
    const sim = startSim(
      {
        level: 9,
        boss: "chainedGhosts",
        infiniteLives: true,
        enableUpgrades: ["powerPelletHunter"],
      },
      "hunter",
    );
    const chained = [...query(sim.world, [ChainedGhost, Ghost])];
    const ends = chained.filter((eid) => ChainedGhost.pair[eid] === CHAIN_PAIR.blinkyClyde);
    const target = regularPelletEids(sim)[0]!;
    convertPelletToPower(sim.world, target);
    chained.forEach((eid, i) => {
      GhostPhase.value[eid] = GHOST_PHASE.active;
      Position.x[eid] = cellCenterX(1 + i);
      Position.y[eid] = cellCenterY(1);
    });
    teleportPlayer(sim, Position.x[target]!, Position.y[target]!);
    runFrames(sim, 1);
    expect(sim.renderOptions().frightenedGhosts?.eids.sort()).toEqual(chained.sort());

    const player = playerEid(sim);
    const row = worldToRow(Position.y[player]!);
    const col = worldToCol(Position.x[player]!);
    ends.forEach((eid, i) => {
      Position.x[eid] = cellCenterX(col + (i === 0 ? -4 : 4));
      Position.y[eid] = cellCenterY(row) + TILE_SIZE * 3 * (i === 0 ? -1 : 1);
    });
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
  });
});

describe("timed tunnels", () => {
  function framesFor(ms: number): number {
    return Math.ceil(ms / FRAME_MS);
  }

  function advanceToPhase(sim: PlaySim, phase: "open" | "warn" | "closed"): void {
    runUntil(sim, () => sim.snapshot().timedTunnel?.phase === phase, framesFor(20_000));
  }

  it("gates one seeded tunnel row on levels 7 and 8 only", () => {
    const a = startSim({ level: 7, maze: "maze1" }, "tt-seed");
    const b = startSim({ level: 7, maze: "maze1" }, "tt-seed");
    const row = a.snapshot().timedTunnel?.row;
    expect(row).toBeDefined();
    expect(horizontalTunnelRows()).toContain(row);
    expect(b.snapshot().timedTunnel?.row).toBe(row);
    expect(startSim({ level: 8, maze: "maze1" }, "tt-seed").snapshot().timedTunnel).not.toBeNull();
    expect(startSim({ level: 6, maze: "maze1" }, "tt-seed").snapshot().timedTunnel).toBeNull();
  });

  function wrapLeftFromMouth(sim: PlaySim, row: number): void {
    const wrapsBefore = sim.snapshot().runLog.tunnelWraps;
    teleportPlayer(sim, cellCenterX(0), cellCenterY(row));
    runUntil(sim, () => sim.snapshot().runLog.tunnelWraps > wrapsBefore, 120, {
      keys: held("left"),
    });
  }

  it("still wraps during open and warn, then clamps when closed", () => {
    const sim = startSim({ level: 7, maze: "maze1", infiniteLives: true }, "tt-wrap");
    const row = sim.snapshot().timedTunnel!.row;
    expect(sim.snapshot().timedTunnel!.phase).toBe("open");

    wrapLeftFromMouth(sim, row);
    expect(Position.x[playerEid(sim)]!).toBeGreaterThan(MAZE_OFFSET_X + MAZE_PIXEL_WIDTH / 2);

    advanceToPhase(sim, "warn");
    wrapLeftFromMouth(sim, row);
    expect(sim.snapshot().timedTunnel!.phase).toBe("warn");

    advanceToPhase(sim, "closed");
    teleportPlayer(sim, cellCenterX(0), cellCenterY(row));
    const wrapsBefore = sim.snapshot().runLog.tunnelWraps;
    runFrames(sim, 90, { keys: held("left") });
    expect(sim.snapshot().runLog.tunnelWraps).toBe(wrapsBefore);
    expect(Position.x[playerEid(sim)]!).toBeLessThan(MAZE_PIXEL_WIDTH / 2);
  });

  it("blocks ghosts from wrapping the gated row while closed", () => {
    const sim = startSim({ level: 8, maze: "maze1", infiniteLives: true }, "tt-ghost");
    const row = sim.snapshot().timedTunnel!.row;
    advanceToPhase(sim, "closed");
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    Position.x[ghost] = cellCenterX(0);
    Position.y[ghost] = cellCenterY(row);
    const width = getActiveLayout().cols * getActiveLayout().tileSize;
    let wrapped = false;
    for (let frame = 0; frame < 90; frame += 1) {
      Facing.direction[ghost] = DIRECTION.left;
      Input.direction[ghost] = DIRECTION.left;
      Ghost.decidedCol[ghost] = 0;
      Ghost.decidedRow[ghost] = row;
      Position.x[ghost] = Math.min(Position.x[ghost]!, cellCenterX(0) + 1);
      runFrames(sim, 1);
      wrapped ||= Position.x[ghost]! > width / 2;
    }
    expect(wrapped).toBe(false);
  });

  it("lets Wall Pass+ walk through a closed gate while bars stay up", () => {
    const sim = startSim(
      {
        level: 7,
        maze: "maze1",
        infiniteLives: true,
        enableUpgrades: ["powerPelletWallPassPlus"],
      },
      "tt-wpp",
    );
    const row = sim.snapshot().timedTunnel!.row;
    advanceToPhase(sim, "closed");
    sim["runUpgrades"] = {
      ...sim["runUpgrades"],
      wallPassRemainingMs: WALL_PASS_MS,
    };
    expect(sim.renderOptions().timedTunnel?.gateVisible).toBe(true);
    wrapLeftFromMouth(sim, row);
    expect(sim.snapshot().timedTunnel!.phase).toBe("closed");
    expect(sim.renderOptions().timedTunnel?.gateVisible).toBe(true);
  });
});

describe("lava zone", () => {
  function framesFor(ms: number): number {
    return Math.ceil(ms / FRAME_MS);
  }

  function lavaSim(seed: string, overrides: Partial<PlayOptions> = {}): PlaySim {
    const sim = startSim({ level: 8, maze: "maze1", infiniteLives: true, ...overrides }, seed);
    for (const eid of query(sim.world, [Ghost])) {
      removeEntity(sim.world, eid);
    }
    runFrames(sim, 1, { keys: held("left") });
    return sim;
  }

  function parkAwayFromLava(sim: PlaySim): void {
    const spawn = getActiveLayout().playerSpawn;
    teleportPlayer(sim, cellCenterX(spawn.col), cellCenterY(spawn.row));
  }

  function lavaDeaths(sim: PlaySim) {
    return sim
      .runLogRecord()
      .levels.at(-1)!
      .deaths.filter((death) => death.lava);
  }

  it("does not advance the cycle until Dot-Man starts moving", () => {
    const sim = startSim({ level: 8, maze: "maze1", infiniteLives: true }, "lava-wait");
    for (const eid of query(sim.world, [Ghost])) {
      removeEntity(sim.world, eid);
    }
    expect(sim.snapshot().lava).toMatchObject({
      phase: "dormant",
      reachTiles: 0,
      flashOn: false,
      started: false,
    });
    runFrames(sim, framesFor(10_000));
    expect(sim.snapshot().lava).toMatchObject({
      phase: "dormant",
      reachTiles: 0,
      flashOn: false,
      started: false,
    });
    runFrames(sim, 1, { keys: held("left") });
    expect(sim.snapshot().lava!.started).toBe(true);
    parkAwayFromLava(sim);
    runUntil(sim, () => sim.snapshot().lava!.phase === "warn", framesFor(10_000));
    expect(sim.snapshot().lava!.phase).toBe("warn");
  });

  it("places one seeded zone on level 8 only, centred on a straight hallway away from intersections", () => {
    const lava = startSim({ level: 8, maze: "maze1" }, "lava-seed").snapshot().lava!;
    expect(startSim({ level: 8, maze: "maze1" }, "lava-seed").snapshot().lava).toEqual(lava);
    expect(lava.phase).toBe("dormant");
    expect(lava.started).toBe(false);
    expect(lava.cells.length).toBeGreaterThanOrEqual(3);
    const open = (col: number, row: number) => isWalkable(col, row);
    const { col, row } = lava;
    expect(open(col - 1, row) === open(col + 1, row)).toBe(true);
    expect(open(col, row - 1) === open(col, row + 1)).toBe(true);
    expect(open(col - 1, row) !== open(col, row - 1)).toBe(true);
    for (const cell of lava.cells) {
      const exits = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([dx, dy]) => open(cell.col + dx!, cell.row + dy!));
      expect(exits.length).toBeLessThanOrEqual(2);
    }
    for (const level of [2, 5, 7]) {
      expect(startSim({ level, maze: "maze1" }, "lava-seed").snapshot().lava).toBeNull();
    }
  });

  it("is a level modifier that ?levelModifiers=0 turns off", () => {
    expect(startSim({ level: 8 }, "lava-mods").snapshot().lava).not.toBeNull();
    expect(startSim({ level: 8, levelModifiers: false }, "lava-mods").snapshot().lava).toBeNull();
  });

  it("never puts a lava cell on a speed lane", () => {
    for (const i of [...Array.from({ length: 40 }, (_, n) => n), 147]) {
      const sim = startSim({ level: 8 }, `lava-lane-${i}`);
      const lava = sim.snapshot().lava!;
      const zones = settledZones(sim);
      const laneCells = new Set(zones.flatMap(speedZoneCells).map((c) => `${c.col},${c.row}`));
      expect(zones).toHaveLength(3);
      for (const cell of lava.cells) {
        expect(laneCells.has(`${cell.col},${cell.row}`)).toBe(false);
      }
    }
  });

  it("still dies on lava while turn catch grace is active", () => {
    const sim = lavaSim("lava-turn-grace", { infiniteLives: false });
    parkAwayFromLava(sim);
    runUntil(sim, () => sim.snapshot().lava!.phase === "full", framesFor(15_000));
    const { col, row } = sim.snapshot().lava!;
    sim["turnCatchGraceMs"] = TURN_CATCH_GRACE_MS;
    teleportPlayer(sim, cellCenterX(col), cellCenterY(row));
    runFrames(sim, 1);
    expect(sim.snapshot().timers.turnCatchGraceMs).toBeGreaterThan(0);
    expect(sim.snapshot().dying).toBe(true);
    expect(lavaDeaths(sim)).toHaveLength(1);
  });

  it("is harmless while dormant and warning, then kills Dot-Man at full reach", () => {
    const sim = lavaSim("lava-kill");
    const { col, row } = sim.snapshot().lava!;
    teleportPlayer(sim, cellCenterX(col), cellCenterY(row));
    const flashes = { dormant: new Set<boolean>(), warn: new Set<boolean>() };
    runUntil(
      sim,
      () => {
        const lava = sim.snapshot().lava!;
        if (lava.phase === "dormant" || lava.phase === "warn") {
          flashes[lava.phase].add(lava.flashOn);
        }
        return flashes.warn.has(true) && flashes.warn.has(false);
      },
      framesFor(10_000),
    );
    expect([...flashes.dormant]).toEqual([false]);
    expect(flashes.warn).toEqual(new Set([true, false]));
    expect(sim.snapshot().dying).toBe(false);

    parkAwayFromLava(sim);
    runUntil(sim, () => sim.snapshot().lava!.phase === "full", framesFor(15_000));
    expect(sim.snapshot().lava!.reachTiles).toBe(LAVA_MAX_REACH_TILES);
    expect(sim.snapshot().dying).toBe(false);
    teleportPlayer(sim, cellCenterX(col), cellCenterY(row));
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    expect(lavaDeaths(sim)).toHaveLength(1);
    expect(lavaDeaths(sim)[0]).toMatchObject({ ghost: null, col, row });
  });

  it("creeps out from the centre, so an outer cell is safe early and deadly later", () => {
    const sim = lavaSim("lava-creep");
    const outer = sim.snapshot().lava!.cells.at(-1)!;
    parkAwayFromLava(sim);
    runUntil(sim, () => sim.snapshot().lava!.phase === "emerging", framesFor(10_000));
    runUntil(sim, () => sim.snapshot().lava!.reachTiles >= 0.5, framesFor(5000));
    teleportPlayer(sim, cellCenterX(outer.col), cellCenterY(outer.row));
    Velocity.x[playerEid(sim)] = 0;
    Velocity.y[playerEid(sim)] = 0;
    Input.direction[playerEid(sim)] = DIRECTION.none;
    runFrames(sim, 1);
    expect(sim.snapshot().player).toMatchObject({ col: outer.col, row: outer.row });
    expect(sim.snapshot().dying).toBe(false);
    runUntil(sim, () => sim.snapshot().dying, framesFor(LAVA_EMERGE_MS));
    expect(sim.snapshot().lava!.phase).toBe("emerging");
    expect(sim.snapshot().lava!.reachTiles).toBeLessThan(LAVA_MAX_REACH_TILES);
  });

  it("retracts to nothing, rests, and comes back on a 16s cycle", () => {
    const sim = lavaSim("lava-cycle");
    parkAwayFromLava(sim);
    const phases: string[] = [];
    for (let frame = 0; frame < framesFor(LAVA_CYCLE_MS + 7500); frame += 1) {
      runFrames(sim, 1);
      const phase = sim.snapshot().lava!.phase;
      if (phases.at(-1) !== phase) {
        phases.push(phase);
      }
    }
    expect(phases).toEqual([
      "dormant",
      "warn",
      "emerging",
      "full",
      "retracting",
      "dormant",
      "warn",
      "emerging",
    ]);
    expect(sim.snapshot().dying).toBe(false);
  });

  it("restarts the cycle dormant after a lava death so a respawn on the spot is safe", () => {
    const sim = lavaSim("lava-respawn");
    const { col, row } = sim.snapshot().lava!;
    parkAwayFromLava(sim);
    runUntil(sim, () => sim.snapshot().lava!.phase === "full", framesFor(15_000));
    teleportPlayer(sim, cellCenterX(col), cellCenterY(row));
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    runUntil(sim, () => !sim.snapshot().dying, 600);
    expect(sim.snapshot().lava).toMatchObject({ phase: "dormant", reachTiles: 0, started: false });
    runFrames(sim, framesFor(10_000));
    expect(sim.snapshot().lava).toMatchObject({ phase: "dormant", reachTiles: 0, started: false });
  });

  it("catches a Hyperspeed dash that would skip over a thin sliver of lava", () => {
    const sim = lavaSim("lava-dash", { enableUpgrades: ["powerPelletHyperspeed"] });
    const lava = sim.snapshot().lava!;
    const step = lava.cells.find(
      (c) => isWalkable(2 * c.col - lava.col, 2 * c.row - lava.row) && c !== lava.cells[0],
    )!;
    const dx = step.col - lava.col;
    const dy = step.row - lava.row;
    const toward = dx > 0 ? "left" : dx < 0 ? "right" : dy > 0 ? "up" : "down";
    parkAwayFromLava(sim);
    runUntil(sim, () => sim.snapshot().lava!.phase === "emerging", framesFor(10_000));
    expect(sim.snapshot().lava!.reachTiles).toBeLessThan(0.05);
    sim["runUpgrades"] = { ...sim["runUpgrades"], hyperspeedRemainingMs: 2000 };
    teleportPlayer(sim, cellCenterX(lava.col + 2 * dx), cellCenterY(lava.row + 2 * dy));
    runFrames(sim, 4, { keys: held(toward) });
    expect(sim.snapshot().dying).toBe(true);
    expect(lavaDeaths(sim)).toHaveLength(1);
  });

  it("does not kill an invulnerable Dot-Man", () => {
    const sim = lavaSim("lava-god", { godMode: true });
    const { col, row } = sim.snapshot().lava!;
    parkAwayFromLava(sim);
    runUntil(sim, () => sim.snapshot().lava!.phase === "full", framesFor(15_000));
    teleportPlayer(sim, cellCenterX(col), cellCenterY(row));
    runFrames(sim, 10);
    expect(sim.snapshot().dying).toBe(false);
  });

  it("lets ghosts cross it unharmed", () => {
    const sim = startSim({ level: 8, maze: "maze1", godMode: true }, "lava-ghost");
    const { col, row } = sim.snapshot().lava!;
    runFrames(sim, 1, { keys: held("left") });
    runUntil(sim, () => sim.snapshot().lava!.phase === "full", framesFor(15_000));
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    Position.x[ghost] = cellCenterX(col);
    Position.y[ghost] = cellCenterY(row);
    runFrames(sim, 20);
    expect(hasComponent(sim.world, ghost, Ghost)).toBe(true);
    expect(GhostPhase.value[ghost]).toBe(GHOST_PHASE.active);
    expect(
      Math.hypot(Position.x[ghost]! - cellCenterX(col), Position.y[ghost]! - cellCenterY(row)),
    ).toBeGreaterThan(TILE_SIZE);
  });

  it("carries the zone into render options and clears it on store floors", () => {
    const sim = startSim({ level: 8, maze: "maze1" }, "lava-render");
    expect(sim.renderOptions().lava?.zone.col).toBe(sim.snapshot().lava!.col);
    const cleared = startSim({ level: 8, maze: "maze1", jumpToUpgrade: true }, "lava-store");
    expect(cleared.snapshot().lava).not.toBeNull();
    takeFirstOffered(cleared);
    runUntil(cleared, () => cleared.snapshot().inStore, framesFor(20_000));
    expect(cleared.snapshot().lava).toBeNull();
    expect(cleared.renderOptions().lava).toBeNull();
  });
});

describe("Hyperspeed", () => {
  const RIGHT = { keys: held("right") };
  const UP = { keys: held("up") };
  const DOWN = { keys: held("down") };

  function startHyper(enableUpgrades: UpgradeId[], overrides: Partial<PlayOptions> = {}): PlaySim {
    return startSim(
      { level: 2, maze: "maze1", infiniteLives: true, enableUpgrades, ...overrides },
      "hyperspeed",
    );
  }

  function chompPowerPellet(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  it("does nothing without the upgrade", () => {
    const sim = startHyper([]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.hyperspeedMs).toBe(0);
  });

  it("arms a 2s window, 3s with Hyperspeed+, doubled by Overcharge", () => {
    const base = startHyper(["powerPelletHyperspeed"]);
    chompPowerPellet(base);
    expect(base.snapshot().timers.hyperspeedMs).toBeGreaterThan(1900);
    expect(base.snapshot().timers.hyperspeedMs).toBeLessThanOrEqual(2000);
    expect(base.snapshot().timers.hyperspeedShieldMs).toBe(0);

    const plus = startHyper(["powerPelletHyperspeedPlus"]);
    chompPowerPellet(plus);
    expect(plus.snapshot().timers.hyperspeedMs).toBeGreaterThan(2900);
    expect(plus.snapshot().timers.hyperspeedShieldMs).toBeGreaterThan(1900);

    const charged = startHyper(["powerPelletHyperspeed", "passiveOvercharge"]);
    chompPowerPellet(charged);
    expect(charged.snapshot().timers.hyperspeedMs).toBeGreaterThan(3900);
  });

  function runDownColumn(enableUpgrades: UpgradeId[]) {
    const sim = startHyper(enableUpgrades);
    chompPowerPellet(sim);
    const inColumn = (): number =>
      query(sim.world, [Pellet, Position]).filter(
        (eid) =>
          Math.abs(Position.x[eid]! - 200) < 1 && Position.y[eid]! > 130 && Position.y[eid]! < 202,
      ).length;
    const before = inColumn();
    runFrames(sim, 8, DOWN);
    return { before, left: inColumn(), speed: Speed.px[playerEid(sim)]! };
  }

  it("runs at 10x speed and eats every pellet along the way along a straight run", () => {
    const plain = runDownColumn([]);
    const hyper = runDownColumn(["powerPelletHyperspeed"]);
    expect(hyper.before).toBeGreaterThan(2);
    expect(plain.left).toBeGreaterThan(0);
    expect(hyper.left).toBe(0);
    expect(hyper.speed).toBeGreaterThan(plain.speed * 10);
  });

  it("keeps the pellet streak alive through a power pellet and the hyperspeed run after it", () => {
    const sim = startHyper(["powerPelletHyperspeed"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().pennies.streak).toBe(1);
    const boardBefore = sim.snapshot().boardCollected;
    let previous = 1;
    for (let frame = 0; frame < 8; frame += 1) {
      runFrames(sim, 1, DOWN);
      const { streak } = sim.snapshot().pennies;
      expect(streak).toBeGreaterThanOrEqual(previous);
      previous = streak;
    }
    expect(previous).toBe(sim.snapshot().boardCollected - boardBefore + 1);
    expect(previous).toBeGreaterThan(3);
  });

  it("returns to normal speed when the window ends", () => {
    const speedAfter = (enableUpgrades: UpgradeId[]) => {
      const sim = startHyper(enableUpgrades);
      chompPowerPellet(sim);
      runFrames(sim, 130, DOWN);
      return { speed: Speed.px[playerEid(sim)]!, left: sim.snapshot().timers.hyperspeedMs };
    };
    const plain = speedAfter([]);
    const hyper = speedAfter(["powerPelletHyperspeed"]);
    expect(hyper.left).toBe(0);
    expect(hyper.speed).toBe(plain.speed);
  });

  it("holds movement for 200ms after a turn but lets facing change", () => {
    const sim = startHyper(["powerPelletHyperspeed"]);
    chompPowerPellet(sim);
    runFrames(sim, 8, UP);
    expect(sim.snapshot().timers.hyperspeedTurnDelayMs).toBe(0);
    runFrames(sim, 1, RIGHT);
    expect(sim.snapshot().timers.hyperspeedTurnDelayMs).toBeGreaterThan(150);
    const x = Position.x[playerEid(sim)]!;
    runFrames(sim, 4, DOWN);
    expect(Position.x[playerEid(sim)]).toBe(x);
    runFrames(sim, 8, RIGHT);
    expect(sim.snapshot().timers.hyperspeedTurnDelayMs).toBe(0);
    runFrames(sim, 2, RIGHT);
    expect(Position.x[playerEid(sim)]).toBeGreaterThan(x + TILE_SIZE);
  });

  it("does not catch on the hyperspeed turn beat, then catches once grace ends", () => {
    const sim = startHyper(["powerPelletHyperspeed"], { infiniteLives: false });
    chompPowerPellet(sim);
    const player = playerEid(sim);
    const cx = cellCenterX(6);
    const cy = cellCenterY(5);
    teleportPlayer(sim, cellCenterX(8), cy);
    Facing.direction[player] = DIRECTION.left;
    Input.direction[player] = DIRECTION.left;
    runUntil(sim, () => Position.x[player]! <= cx + 8, 30, { keys: held("left") });
    teleportPlayer(sim, cx + 3, cy);
    Facing.direction[player] = DIRECTION.left;
    runFrames(sim, 1, { keys: held("up") });
    expect(sim.snapshot().player!.facing).toBe("up");
    expect(sim.snapshot().timers.turnCatchGraceMs).toBeGreaterThan(0);
    ghostOntoPlayer(sim);
    runFrames(sim, 1, { keys: held("up") });
    expect(sim.snapshot().dying).toBe(false);
    while (sim.snapshot().timers.turnCatchGraceMs > 0) {
      ghostOntoPlayer(sim);
      runFrames(sim, 1, { keys: held("up") });
    }
    ghostOntoPlayer(sim);
    runFrames(sim, 1, { keys: held("up") });
    expect(sim.snapshot().dying).toBe(true);
  });

  it("still catches on a hyperspeed reverse with no turn catch grace", () => {
    const sim = startHyper(["powerPelletHyperspeed"], { infiniteLives: false });
    chompPowerPellet(sim);
    const player = playerEid(sim);
    teleportPlayer(sim, cellCenterX(10), cellCenterY(1));
    Facing.direction[player] = DIRECTION.left;
    Input.direction[player] = DIRECTION.left;
    runFrames(sim, 2, { keys: held("left") });
    expect(sim.snapshot().player!.facing).toBe("left");
    ghostOntoPlayer(sim);
    runFrames(sim, 1, RIGHT);
    expect(sim.snapshot().timers.hyperspeedTurnDelayMs).toBeGreaterThan(150);
    expect(sim.snapshot().timers.turnCatchGraceMs).toBe(0);
    expect(sim.snapshot().dying).toBe(true);
  });

  it("is caught by a ghost on the path", () => {
    const sim = startHyper(["powerPelletHyperspeed"], { infiniteLives: false });
    chompPowerPellet(sim);
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    const player = playerEid(sim);
    Position.x[ghost] = Position.x[player]!;
    Position.y[ghost] = Position.y[player]! + TILE_SIZE * 3;
    runFrames(sim, 10, DOWN);
    expect(sim.snapshot().dying).toBe(true);
  });

  it("eats fruit along the run", () => {
    const sim = startHyper(["powerPelletHyperspeed"]);
    sim["spawnFruitEntity"](false);
    const fruit = query(sim.world, [Fruit, Position])[0]!;
    chompPowerPellet(sim);
    Position.x[fruit] = 200;
    Position.y[fruit] = 170;
    const events = runFrames(sim, 8, DOWN);
    expect(sim.snapshot().fruit).toBe(false);
    expect(events).toContainEqual({ type: "fruitBonus" });
  });

  it("keeps running past a ghost once the Hyperspeed+ shield pops", () => {
    const sim = startHyper(["powerPelletHyperspeedPlus"], { infiniteLives: false });
    chompPowerPellet(sim);
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    Position.x[ghost] = Position.x[playerEid(sim)]!;
    Position.y[ghost] = Position.y[playerEid(sim)]! + TILE_SIZE * 2;
    runFrames(sim, 8, DOWN);
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().timers.hyperspeedShieldMs).toBe(0);
    expect(Position.y[playerEid(sim)]).toBeGreaterThan(Position.y[ghost]!);
  });

  it("Hyperspeed+ shield absorbs one catch with 1s of grace and fires no power pellet effect", () => {
    const sim = startHyper(["powerPelletHyperspeedPlus"], { infiniteLives: false });
    chompPowerPellet(sim);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().timers.hyperspeedShieldMs).toBe(0);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(900);
    expect(sim.snapshot().timers.hyperspeedMs).toBeGreaterThan(0);
  });

  it("an armed Defy Death saves the catch before the Hyperspeed+ shield pops", () => {
    const sim = startHyper(["powerPelletHyperspeedPlus", "passiveDefyDeath"], {
      infiniteLives: false,
    });
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.defyDeathMs).toBeGreaterThan(0);
    const shieldBefore = sim.snapshot().timers.hyperspeedShieldMs;
    expect(shieldBefore).toBeGreaterThan(0);
    ghostOntoPlayer(sim);
    const events = runFrames(sim, 1);
    expect(events).toContainEqual({ type: "sfx", id: "revive" });
    expect(sim.snapshot().timers.hyperspeedShieldMs).toBeGreaterThan(0);
  });

  it("clears the window on life loss", () => {
    const sim = startHyper(["powerPelletHyperspeed"], { infiniteLives: false });
    chompPowerPellet(sim);
    ghostOntoPlayer(sim);
    runFrames(sim, 90);
    expect(sim.snapshot().timers.hyperspeedMs).toBe(0);
  });
});

describe("bare query flags", () => {
  it("treats a flag without a value as =1 when starting a run", () => {
    const parsed = parsePlayOptions(parseQueryParams("?godMode&infiniteLives&jumpToUpgrade"));
    expect(parsed.options).toMatchObject({
      godMode: true,
      infiniteLives: true,
      jumpToUpgrade: true,
      highScoresDisabled: true,
    });

    const sim = new PlaySim(parsed.options, "test");
    const events = sim.start();
    events.push(...runFrames(sim, 30));
    expect(events.length).toBeGreaterThan(0);
  });
});

describe("PlaySim rosters", () => {
  const kindsOf = (sim: PlaySim) => sim.snapshot().ghosts.map((g) => g.kind);

  it("spawns each roster in slot order, introduced over levels 1-3", () => {
    GHOST_ROSTERS.forEach((roster, id) => {
      const names = roster.map((kind) => ghostKindLabel(kind).toLowerCase());
      expect(kindsOf(startSim({ level: 1, roster: id }, "roster"))).toEqual(names.slice(0, 2));
      expect(kindsOf(startSim({ level: 2, roster: id }, "roster"))).toEqual(names.slice(0, 3));
      expect(kindsOf(startSim({ level: 3, roster: id }, "roster"))).toEqual(names);
      expect(startSim({ level: 3, roster: id }, "roster").snapshot().roster).toBe(id);
    });
  });

  it("keeps the same roster on levels 3 through 8", () => {
    for (const id of [0, 3, 5]) {
      const level3 = kindsOf(startSim({ level: 3, roster: id }, "roster"));
      for (const level of [4, 5, 6, 7, 8]) {
        expect(kindsOf(startSim({ level, roster: id }, "roster"))).toEqual(level3);
      }
    }
  });

  it("rolls the roster once from the seed, and replays it", () => {
    const rolled = startSim({ level: 3 }, "roster-seed-a").snapshot().roster;
    expect(startSim({ level: 3 }, "roster-seed-a").snapshot().roster).toBe(rolled);
    expect(rolled).toBe(rosterIdForSeed("roster-seed-a"));
  });

  it("releases by slot: a Wardy in the front slot leaves on the first input like Pinky did", () => {
    const sim = startSim({ level: 2, maze: "maze1", roster: 2 }, "roster-release");
    const phaseOf = (name: string) => sim.snapshot().ghosts.find((g) => g.kind === name)!.phase;
    expect(phaseOf("wardy")).toBe("inHouse");
    runFrames(sim, 2, { keys: held("left") });
    expect(phaseOf("wardy")).not.toBe("inHouse");
  });

  it("releases the same slot gates whichever ghosts fill them", () => {
    const flankLeaves = (roster: number, flank: string) => {
      const sim = startSim({ level: 2, maze: "maze1", roster }, "roster-flank");
      runFrames(sim, 30, { keys: held("left") });
      return sim.snapshot().ghosts.find((g) => g.kind === flank)!.phase !== "inHouse";
    };
    expect(flankLeaves(0, "inky")).toBe(true);
    expect(flankLeaves(4, "wardy")).toBe(true);
  });
});

describe("Cornucopia", () => {
  const framesFor = (ms: number): number => Math.ceil(ms / FRAME_MS);

  function start(enableUpgrades: UpgradeId[]): PlaySim {
    return startSim({ level: 2, maze: "maze1", infiniteLives: true, enableUpgrades });
  }

  function eatPower(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  const fruitCount = (sim: PlaySim): number => query(sim.world, [Fruit]).length;

  function eatNextPower(sim: PlaySim): void {
    eatPower(sim);
    teleportPlayer(sim, 0, 0);
  }

  it("spawns a fruit right away on a power pellet", () => {
    const sim = start(["powerPelletCornucopia"]);
    expect(fruitCount(sim)).toBe(0);
    eatPower(sim);
    expect(fruitCount(sim)).toBe(1);
    const { cornucopiaFruitMs } = sim.snapshot().timers;
    expect(cornucopiaFruitMs).toBeGreaterThan(FRUIT_LIFETIME_MS - 100);
    expect(cornucopiaFruitMs).toBeLessThanOrEqual(FRUIT_LIFETIME_MS);
  });

  it("does nothing without the upgrade", () => {
    const sim = start([]);
    eatPower(sim);
    expect(fruitCount(sim)).toBe(0);
  });

  it("does not spawn a second fruit while one is out", () => {
    const sim = start(["powerPelletCornucopia"]);
    eatNextPower(sim);
    eatNextPower(sim);
    expect(fruitCount(sim)).toBe(1);
  });

  it("Plus spawns another fruit on every power pellet, even with its own fruit out", () => {
    const sim = start(["powerPelletCornucopiaPlus"]);
    eatNextPower(sim);
    runFrames(sim, framesFor(CORNUCOPIA_SPAWN_DEBOUNCE_MS));
    eatNextPower(sim);
    expect(fruitCount(sim)).toBe(2);
  });

  it("does not spawn beside a regular fruit, but Plus does", () => {
    for (const [id, expected] of [
      ["powerPelletCornucopia", 1],
      ["powerPelletCornucopiaPlus", 2],
    ] as const) {
      const sim = start([id]);
      sim["spawnFruitEntity"](false);
      runFrames(sim, framesFor(CORNUCOPIA_SPAWN_DEBOUNCE_MS));
      eatPower(sim);
      expect(fruitCount(sim)).toBe(expected);
    }
  });

  it("debounces: a power pellet within the window spawns once the window has passed", () => {
    const sim = start(["powerPelletCornucopiaPlus"]);
    eatNextPower(sim);
    eatNextPower(sim);
    eatNextPower(sim);
    expect(fruitCount(sim)).toBe(1);
    runFrames(sim, framesFor(CORNUCOPIA_SPAWN_DEBOUNCE_MS - 200));
    expect(fruitCount(sim)).toBe(1);
    runFrames(sim, framesFor(400));
    expect(fruitCount(sim)).toBe(2);
    runFrames(sim, framesFor(CORNUCOPIA_SPAWN_DEBOUNCE_MS * 2));
    expect(fruitCount(sim)).toBe(2);
  });

  it("debounces against regular fruit spawns too", () => {
    const sim = start(["powerPelletCornucopiaPlus"]);
    sim["spawnFruitEntity"](true);
    eatPower(sim);
    expect(fruitCount(sim)).toBe(1);
    runFrames(sim, framesFor(CORNUCOPIA_SPAWN_DEBOUNCE_MS + 100));
    expect(fruitCount(sim)).toBe(2);
  });

  it("solo defers a power pellet eaten inside the window and spawns once it passes", () => {
    const sim = start(["powerPelletCornucopia"]);
    sim["spawnFruitEntity"](false);
    const regular = query(sim.world, [Fruit, Position])[0]!;
    teleportPlayer(sim, Position.x[regular]!, Position.y[regular]!);
    runFrames(sim, 1);
    expect(fruitCount(sim)).toBe(0);
    eatPower(sim);
    expect(fruitCount(sim)).toBe(0);
    runFrames(sim, framesFor(CORNUCOPIA_SPAWN_DEBOUNCE_MS + 100));
    expect(fruitCount(sim)).toBe(1);
  });

  it("solo drops a deferred spawn when a fruit is out at the end of the window", () => {
    const sim = start(["powerPelletCornucopia"]);
    sim["spawnFruitEntity"](false);
    const regular = query(sim.world, [Fruit, Position])[0]!;
    teleportPlayer(sim, Position.x[regular]!, Position.y[regular]!);
    runFrames(sim, 1);
    eatPower(sim);
    sim["spawnFruitEntity"](false);
    runFrames(sim, framesFor(CORNUCOPIA_SPAWN_DEBOUNCE_MS + 100));
    expect(fruitCount(sim)).toBe(1);
  });

  it("a deferred spawn is dropped when a life is lost", () => {
    const sim = start(["powerPelletCornucopiaPlus"]);
    eatNextPower(sim);
    eatNextPower(sim);
    ghostOntoPlayer(sim);
    runFrames(sim, framesFor(CORNUCOPIA_SPAWN_DEBOUNCE_MS + 2_000));
    expect(fruitCount(sim)).toBe(0);
  });

  it("expires after the fruit lifetime", () => {
    const sim = start(["powerPelletCornucopia"]);
    eatNextPower(sim);
    runFrames(sim, framesFor(FRUIT_LIFETIME_MS + 100));
    expect(fruitCount(sim)).toBe(0);
    expect(sim.snapshot().timers.cornucopiaFruitMs).toBe(0);
  });

  it("swallows a scheduled fruit that would spawn while its fruit is out", () => {
    const sim = start(["powerPelletCornucopia"]);
    eatNextPower(sim);
    const [threshold] = getActiveLayout().fruitThresholds;
    for (const eid of regularPelletEids(sim).slice(0, threshold)) {
      eatPelletAt(sim, eid);
    }
    teleportPlayer(sim, 0, 0);
    expect(fruitCount(sim)).toBe(1);
    expect(sim.snapshot().timers.fruitMs).toBe(0);
  });

  it("Plus lets the scheduled fruit spawn alongside its fruit", () => {
    const sim = start(["powerPelletCornucopiaPlus"]);
    eatNextPower(sim);
    const [threshold] = getActiveLayout().fruitThresholds;
    for (const eid of regularPelletEids(sim).slice(0, threshold)) {
      eatPelletAt(sim, eid);
    }
    teleportPlayer(sim, 0, 0);
    expect(fruitCount(sim)).toBe(2);
    const xs = query(sim.world, [Fruit, Position]).map((eid) => Position.x[eid]);
    expect(new Set(xs).size).toBe(2);
  });

  it("Plus keeps its fruit when the regular fruit expires", () => {
    const sim = start(["powerPelletCornucopiaPlus"]);
    const [threshold] = getActiveLayout().fruitThresholds;
    for (const eid of regularPelletEids(sim).slice(0, threshold)) {
      eatPelletAt(sim, eid);
    }
    runFrames(sim, framesFor(CORNUCOPIA_SPAWN_DEBOUNCE_MS));
    eatNextPower(sim);
    expect(fruitCount(sim)).toBe(2);
    sim["fruitPresence"] = { ...sim["fruitPresence"], remainingMs: 50 };
    runFrames(sim, 10);
    expect(sim.snapshot().timers.fruitMs).toBe(0);
    expect(fruitCount(sim)).toBe(1);
    expect(sim.snapshot().timers.cornucopiaFruitMs).toBeGreaterThan(0);
  });

  it("clears its fruit when a life is lost", () => {
    const sim = start(["powerPelletCornucopia"]);
    eatNextPower(sim);
    ghostOntoPlayer(sim);
    runFrames(sim, framesFor(5_000));
    expect(fruitCount(sim)).toBe(0);
    expect(sim.snapshot().timers.cornucopiaFruitMs).toBe(0);
  });

  it("pays out like any fruit when eaten and lets a new one spawn", () => {
    const sim = start(["powerPelletCornucopia"]);
    eatNextPower(sim);
    const fruit = query(sim.world, [Fruit, Position])[0]!;
    teleportPlayer(sim, Position.x[fruit]!, Position.y[fruit]!);
    runFrames(sim, 1);
    expect(fruitCount(sim)).toBe(0);
    expect(sim.snapshot().pennies.charge).toBeGreaterThan(0);
    runFrames(sim, framesFor(CORNUCOPIA_SPAWN_DEBOUNCE_MS));
    eatNextPower(sim);
    expect(fruitCount(sim)).toBe(1);
  });
});

describe("speed zones", () => {
  const KEY_FOR: Record<SpeedZone["fastDir"], "up" | "down" | "left" | "right"> = {
    up: "up",
    down: "down",
    left: "left",
    right: "right",
  };
  const OPPOSITE: Record<SpeedZone["fastDir"], SpeedZone["fastDir"]> = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };

  function laneMiddle(zone: SpeedZone): { col: number; row: number } {
    return speedZoneCells(zone)[Math.floor(zone.length / 2)]!;
  }

  function speedMovingThrough(
    zoneIndex: number,
    dir: SpeedZone["fastDir"],
    zonesOn: boolean,
  ): { speed: number; effect: string | null } {
    const sim = startSim({ level: 6, infiniteLives: true }, "zones");
    const zone = settledZones(sim)[zoneIndex]!;
    if (!zonesOn) {
      sim["speedZones"] = [];
    }
    const cell = laneMiddle(zone);
    const player = playerEid(sim);
    for (let frame = 0; frame < 2; frame += 1) {
      sim["eatDragMs"] = 0;
      Position.x[player] = cellCenterX(cell.col);
      Position.y[player] = cellCenterY(cell.row);
      runFrames(sim, 1, { keys: held(KEY_FOR[dir]) });
    }
    return { speed: Speed.px[player]!, effect: sim.snapshot().playerSpeedZone };
  }

  it("lays 1, 1, 2, 3, 3 straight seeded lanes of SPEED_ZONE_MIN_LENGTH+ tiles on levels 4-8", () => {
    for (const [level, count] of [
      [4, 1],
      [5, 1],
      [6, 2],
      [7, 3],
      [8, 3],
    ] as const) {
      const zones = settledZones(startSim({ level }, "zones"));
      expect(zones).toHaveLength(count);
      for (const zone of zones) {
        expect(zone.length).toBeGreaterThanOrEqual(SPEED_ZONE_MIN_LENGTH);
        for (const cell of speedZoneCells(zone)) {
          expect(getActiveLayout().playerSolids[cell.row]![cell.col]).toBe(false);
        }
      }
      expect(settledZones(startSim({ level }, "zones"))).toEqual(zones);
    }
    for (const level of [1, 2, 3, 9]) {
      expect(startSim({ level }, "zones").snapshot().speedZones).toEqual([]);
    }
  });

  it("speeds Dot-Man up along the fast direction and slows him the other way", () => {
    for (const index of [0, 1]) {
      const fastDir = settledZones(startSim({ level: 6 }, "zones"))[index]!.fastDir;
      const slowDir = OPPOSITE[fastDir];
      const fast = speedMovingThrough(index, fastDir, true);
      const slow = speedMovingThrough(index, slowDir, true);
      expect(fast.effect).toBe("fast");
      expect(slow.effect).toBe("slow");
      expect(fast.speed).toBeCloseTo(
        speedMovingThrough(index, fastDir, false).speed * FAST_ZONE_MULTIPLIER,
      );
      expect(slow.speed).toBeCloseTo(
        speedMovingThrough(index, slowDir, false).speed * SLOW_ZONE_MULTIPLIER,
      );
    }
  });

  it("has no effect while Dot-Man stands still in a lane", () => {
    const sim = startSim({ level: 5, infiniteLives: true }, "zones");
    const cell = laneMiddle(sim.snapshot().speedZones[0]!);
    teleportPlayer(sim, cellCenterX(cell.col), cellCenterY(cell.row));
    runFrames(sim, 2);
    expect(sim.snapshot().playerSpeedZone).toBeNull();
  });

  it("leaves ghost speed alone inside a lane", () => {
    const sim = startSim({ level: 5, infiniteLives: true }, "zones");
    const zones = sim.snapshot().speedZones;
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    for (const zone of zones) {
      const cell = laneMiddle(zone);
      const ghostSpeed = (): number => {
        Position.x[ghost] = cellCenterX(cell.col);
        Position.y[ghost] = cellCenterY(cell.row);
        runFrames(sim, 1);
        return Speed.px[ghost]!;
      };
      sim["speedZones"] = zones;
      const inLane = ghostSpeed();
      sim["speedZones"] = [];
      expect(ghostSpeed()).toBe(inLane);
    }
  });

  it("clears the lanes when the store floor opens", () => {
    const sim = startSim({ level: 6 }, "zones");
    expect(settledZones(sim)).toHaveLength(2);
    (sim as unknown as { enterStore(): void }).enterStore();
    expect(sim.snapshot().inStore).toBe(true);
    expect(sim.snapshot().speedZones).toEqual([]);
    expect(sim.snapshot().playerSpeedZone).toBeNull();
  });

  it("keeps each lane from the level before, nudged at the ends, and leaks it in tile by tile", () => {
    for (const seed of ["zones", "drift-a", "drift-b"]) {
      const four = settledZones(startSim({ level: 4 }, seed));
      const sim = startSim({ level: 5 }, seed);
      const five = settledZones(sim);
      expect(five).toHaveLength(1);
      expect(five[0]!.axis).toBe(four[0]!.axis);
      expect(five[0]!.fastDir).toBe(four[0]!.fastDir);
      const lane = (z: SpeedZone) => (z.axis === "horizontal" ? z.row : z.col);
      expect(lane(five[0]!)).toBe(lane(four[0]!));
      const start = (z: SpeedZone) => (z.axis === "horizontal" ? z.col : z.row);
      expect(Math.abs(start(five[0]!) - start(four[0]!))).toBeLessThanOrEqual(2);
      expect(Math.abs(five[0]!.length - four[0]!.length)).toBeLessThanOrEqual(4);
    }
  });

  it("grows a new lane out from nothing at board start and only speeds the tiles it covers", () => {
    const sim = startSim({ level: 4, infiniteLives: true }, "zones");
    expect(sim.snapshot().speedZones).toEqual([]);
    expect(sim.snapshot().speedZonesShifting).toBe(true);
    const target = settledZones(startSim({ level: 4 }, "zones"))[0]!;
    const end = speedZoneCells(target).at(-1)!;
    teleportPlayer(sim, cellCenterX(end.col), cellCenterY(end.row));
    runFrames(sim, 1, { keys: held(KEY_FOR[target.fastDir]) });
    expect(sim.snapshot().playerSpeedZone).toBeNull();
    runFrames(sim, Math.ceil((SPEED_ZONE_SHIFT_STEP_MS * 3) / FRAME_MS));
    expect(sim.snapshot().speedZones[0]!.length).toBeGreaterThan(0);
    expect(sim.snapshot().speedZones[0]!.length).toBeLessThan(target.length);
    expect(settledZones(sim)).toEqual([target]);
  });

  it("keeps lane cells walkable on levels that have speed lanes", () => {
    for (const level of [5, 6, 7, 8]) {
      const sim = startSim({ level }, "zones");
      for (const zone of settledZones(sim)) {
        for (const cell of speedZoneCells(zone)) {
          expect(getActiveLayout().playerSolids[cell.row]![cell.col]).toBe(false);
        }
      }
    }
  });

  it("draws the lanes for the render bridge", () => {
    const sim = startSim({ level: 6 }, "zones");
    expect(sim.renderOptions().speedZones).toEqual(sim.snapshot().speedZones);
  });
});

describe("Wall Drop", () => {
  const RIGHT = { keys: held("right") };
  const LEFT = { keys: held("left") };

  function start(enableUpgrades: UpgradeId[]): PlaySim {
    return startSim({ level: 2, maze: "maze1", godMode: true, enableUpgrades });
  }

  function eatPower(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  function corridorStart(otherThanRow = -1): { col: number; row: number } {
    const layout = getActiveLayout();
    for (let row = 1; row < layout.rows - 1; row += 1) {
      for (let col = 1; col + 6 < layout.cols - 1; col += 1) {
        const run = [0, 1, 2, 3, 4, 5].every((d) => isWalkable(col + d, row));
        if (
          run &&
          row !== otherThanRow &&
          wallDropSpot(col + 2, row, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }) !== null &&
          wallDropSpot(col + 3, row, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }) !== null
        ) {
          return { col, row };
        }
      }
    }
    throw new Error("no straight corridor");
  }

  function playerCell(sim: PlaySim): { col: number; row: number } {
    const eid = playerEid(sim);
    return { col: worldToCol(Position.x[eid]!), row: worldToRow(Position.y[eid]!) };
  }

  function reverse(sim: PlaySim, otherThanRow = -1): { col: number; row: number } {
    const { col, row } = corridorStart(otherThanRow);
    teleportPlayer(sim, cellCenterX(col), cellCenterY(row));
    Facing.direction[playerEid(sim)] = DIRECTION.right;
    runUntil(sim, () => playerCell(sim).col === col + 3, 60, RIGHT);
    runFrames(sim, 1, LEFT);
    return playerCell(sim);
  }

  it("does nothing without the upgrade", () => {
    const sim = start([]);
    eatPower(sim);
    reverse(sim);
    expect(sim.snapshot().wallDrop).toEqual({ armed: false, wall: null });
  });

  it("needs a power pellet before a reversal drops a wall", () => {
    const sim = start(["powerPelletWallDrop"]);
    reverse(sim);
    expect(sim.snapshot().wallDrop).toEqual({ armed: false, wall: null });
    eatPower(sim);
    expect(sim.snapshot().wallDrop.armed).toBe(true);
  });

  it("drops one wall where you reversed that blocks your way back, then expires after 8s", () => {
    const sim = start(["powerPelletWallDrop"]);
    eatPower(sim);
    const cell = reverse(sim);
    expect(sim.snapshot().wallDrop).toEqual({
      armed: false,
      wall: { ...cell, passable: false },
    });
    expect(sim.snapshot().timers.wallDropMs).toBeGreaterThan(WALL_DROP_MS - 2 * FRAME_MS);
    expect(sim.renderOptions().droppedWall).toMatchObject(cell);

    runUntil(sim, () => playerCell(sim).col === cell.col - 1, 30, LEFT);
    runFrames(sim, 60, RIGHT);
    expect(playerCell(sim).col).toBe(cell.col - 1);

    runFrames(sim, 30, LEFT);
    runFrames(sim, 1, RIGHT);
    expect(sim.snapshot().wallDrop.wall).toEqual({ ...cell, passable: false });

    runUntil(sim, () => sim.snapshot().wallDrop.wall === null, Math.ceil(WALL_DROP_MS / FRAME_MS));
    expect(sim.snapshot().timers.wallDropMs).toBe(0);
  });

  function ghostHeadingInto(sim: PlaySim, cell: { col: number; row: number }): () => boolean {
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    Position.x[ghost] = cellCenterX(cell.col + 2);
    Position.y[ghost] = cellCenterY(cell.row);
    Facing.direction[ghost] = DIRECTION.left;
    Input.direction[ghost] = DIRECTION.left;
    return () =>
      worldToCol(Position.x[ghost]!) === cell.col && worldToRow(Position.y[ghost]!) === cell.row;
  }

  it("keeps ghosts out of the wall tile", () => {
    const sim = start(["powerPelletWallDrop"]);
    eatPower(sim);
    const inWall = ghostHeadingInto(sim, reverse(sim));
    for (let frame = 0; frame < 120; frame += 1) {
      runFrames(sim, 1);
      expect(inWall()).toBe(false);
    }
  });

  it("lets a ghost caught on the wall tile leave, but never toward Dot-Man", () => {
    const sim = start(["powerPelletWallDrop"]);
    eatPower(sim);
    const cell = reverse(sim);
    runUntil(sim, () => playerCell(sim).col === cell.col - 2, 60, LEFT);
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    Position.x[ghost] = cellCenterX(cell.col);
    Position.y[ghost] = cellCenterY(cell.row);
    Facing.direction[ghost] = DIRECTION.left;
    Input.direction[ghost] = DIRECTION.left;
    const ghostCol = () => worldToCol(Position.x[ghost]!);
    for (let frame = 0; frame < 60 && ghostCol() <= cell.col; frame += 1) {
      runFrames(sim, 1);
      expect(ghostCol()).toBeGreaterThanOrEqual(cell.col);
    }
    expect(ghostCol()).toBeGreaterThan(cell.col);
  });

  it("without the upgrade the same ghost walks into that tile", () => {
    const sim = start([]);
    eatPower(sim);
    runUntil(sim, ghostHeadingInto(sim, reverse(sim)), 120);
  });

  it("Plus: the wall stays, lets you through, and walking through removes it", () => {
    const sim = start(["powerPelletWallDropPlus"]);
    eatPower(sim);
    const cell = reverse(sim);
    expect(playerCell(sim)).toEqual(cell);
    expect(sim.snapshot().wallDrop.wall).toEqual({ ...cell, passable: true });
    expect(sim.snapshot().timers.wallDropMs).toBe(-1);
    runFrames(sim, Math.ceil(WALL_DROP_MS / FRAME_MS) + 60);
    expect(sim.snapshot().wallDrop.wall).toEqual({ ...cell, passable: true });

    teleportPlayer(sim, cellCenterX(cell.col - 1), cellCenterY(cell.row));
    runUntil(sim, () => sim.snapshot().wallDrop.wall === null, 60, RIGHT);
    expect(playerCell(sim)).toEqual(cell);
  });

  it("Plus: crossing the wall at Hyperspeed still removes it", () => {
    const sim = start(["powerPelletWallDropPlus", "powerPelletHyperspeed"]);
    eatPower(sim);
    sim["runUpgrades"] = {
      ...sim["runUpgrades"],
      hyperspeedRemainingMs: 0,
      hyperspeedTurnDelayMs: 0,
    };
    const cell = reverse(sim);
    expect(sim.snapshot().wallDrop.wall).toMatchObject(cell);
    teleportPlayer(sim, cellCenterX(cell.col - 2), cellCenterY(cell.row));
    sim["runUpgrades"] = { ...sim["runUpgrades"], hyperspeedRemainingMs: 3000 };
    runUntil(sim, () => playerCell(sim).col > cell.col, 30, RIGHT);
    expect(sim.snapshot().wallDrop.wall).toBeNull();
  });

  it("a second power pellet re-arms, and the next drop replaces the old wall", () => {
    const sim = start(["powerPelletWallDropPlus"]);
    eatPower(sim);
    const first = reverse(sim);
    expect(sim.snapshot().wallDrop.wall).toMatchObject(first);

    eatPower(sim);
    expect(sim.snapshot().wallDrop.armed).toBe(true);
    const second = reverse(sim, first.row);
    expect(second.row).not.toBe(first.row);
    expect(sim.snapshot().wallDrop).toEqual({
      armed: false,
      wall: { ...second, passable: true },
    });
  });

  it("losing a life clears the wall and the charge", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      infiniteLives: true,
      enableUpgrades: ["powerPelletWallDropPlus"],
    });
    eatPower(sim);
    reverse(sim);
    eatPower(sim);
    expect(sim.snapshot().wallDrop.wall).not.toBeNull();
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().wallDrop).toEqual({ armed: false, wall: null });
  });
});

describe("power pellet break VFX", () => {
  it("emits a facing-biased break at each collected power pellet through progress 1", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [] }, "pp-break");
    sim.start();
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    const x = Position.x[power]!;
    const y = Position.y[power]!;
    teleportPlayer(sim, x, y);
    const left = { keys: held("left") };
    const events = runFrames(sim, 1, left);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "powerPelletBreak",
        id: 1,
        x,
        y,
        facingDx: -1,
        facingDy: 0,
        progress: 0,
      }),
    );
    expect(sim.snapshot().powerPelletBreaks).toEqual([
      expect.objectContaining({ id: 1, progress: 0 }),
    ]);

    const done = runUntil(sim, () => sim.snapshot().powerPelletBreaks.length === 0, 60, left);
    expect(done).toContainEqual(
      expect.objectContaining({
        type: "powerPelletBreak",
        id: 1,
        x,
        y,
        facingDx: -1,
        facingDy: 0,
        progress: 1,
      }),
    );
    expect(sim.snapshot().powerPelletBreaks).toEqual([]);
    expect(Math.ceil(POWER_PELLET_BREAK_MS / FRAME_MS)).toBeLessThanOrEqual(60);
  });

  it("starts one break per power-pellet position in the same frame", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [] }, "pp-break-2");
    sim.start();
    const powers = query(sim.world, [PowerPellet, Position]);
    expect(powers.length).toBeGreaterThanOrEqual(2);
    const a = powers[0]!;
    const b = powers[1]!;
    Position.x[b] = Position.x[a]!;
    Position.y[b] = Position.y[a]!;
    teleportPlayer(sim, Position.x[a]!, Position.y[a]!);
    const events = runFrames(sim, 1, { keys: held("right") });
    const breaks = events.filter((e) => e.type === "powerPelletBreak" && e.progress === 0);
    expect(breaks).toHaveLength(2);
    expect(breaks.every((e) => e.type === "powerPelletBreak" && e.facingDx === 1)).toBe(true);
    expect(sim.snapshot().powerPelletBreaks).toHaveLength(2);
  });

  it("clears in-flight breaks on board reset", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [] }, "pp-break-reset");
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1, { keys: held("left") });
    expect(sim.snapshot().powerPelletBreaks).toHaveLength(1);
    (sim as unknown as { enterStore(): void }).enterStore();
    expect(sim.snapshot().powerPelletBreaks).toEqual([]);
  });

  it("plays a pasted custom maze as the first board", () => {
    const sim = startSim({ mazeAscii: CLASSIC_MAZE_ASCII });
    expect(getActiveLayout().ascii).toBe(CLASSIC_MAZE_ASCII);
    expect(sim.snapshot().layout).toBe("custom");
  });

  it("plays a custom maze whose ghost house is only 2x2", () => {
    const ascii = tinyHouseMazeAscii();
    const sim = startSim({
      mazeAscii: ascii,
      level: 3,
      ghosts: [GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky, GHOST_KIND.clyde],
    });
    expect(getActiveLayout().ascii).toBe(ascii);
    expect(sim.snapshot().layout).toBe("custom");
    expect(getActiveLayout().ghostHouseSpawn).toEqual({ col: 13, row: 9 });
    expect(sim.snapshot().ghosts).toHaveLength(1);
    runFrames(sim, 30, { keys: held("up") });
    expect(sim.snapshot().ghosts.map((g) => g.phase)).not.toContain("inHouse");
  });

  it("seats level-1 mazeSmall ghosts apart instead of stacking them", () => {
    const sim = startSim({ level: 1, maze: "mazeSmall", roster: 0 }, "house-seats");
    const ghosts = sim.snapshot().ghosts;
    expect(ghosts).toHaveLength(2);
    expect(ghosts.every((g) => g.phase === "inHouse")).toBe(true);
    const gap = Math.abs(ghosts[0]!.x - ghosts[1]!.x);
    expect(gap).toBeGreaterThanOrEqual(actorDisplaySize());
  });

  it("trims a full roster on mazeSmall to the house seat cap without stacking", () => {
    const sim = startSim({ level: 3, maze: "mazeSmall", roster: 0 }, "house-cap");
    const ghosts = [...sim.snapshot().ghosts].sort((a, b) => a.x - b.x);
    expect(ghosts).toHaveLength(3);
    expect(ghosts.every((g) => g.phase === "inHouse")).toBe(true);
    for (let i = 1; i < ghosts.length; i += 1) {
      expect(ghosts[i]!.x - ghosts[i - 1]!.x).toBeGreaterThanOrEqual(actorDisplaySize());
    }
  });

  it("shows a notice instead of the starting upgrade when the pasted maze fails", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const sim = new PlaySim({ ...defaultPlayOptions(), mazeAscii: "#####" }, "test");
      const events = sim.start();
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /maze activate failed for custom; falling back to maze2: maze cols 5/,
        ),
      );
      expect(count(events, "startingNotice")).toBe(1);
      expect(count(events, "startingUpgrade")).toBe(0);
      expect(sim.snapshot().layout).toBe("maze2");
      expect(sim.snapshot().upgrades).toHaveLength(0);
    } finally {
      warn.mockRestore();
    }
  });
});

describe("Programmer", () => {
  const STEP: Record<ProgramDir, { dx: number; dy: number }> = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  };
  let pressClock = 1;

  function start(enableUpgrades: UpgradeId[], overrides: Partial<PlayOptions> = {}): PlaySim {
    return startSim(
      { level: 2, maze: "maze1", godMode: true, enableUpgrades, ...overrides },
      "programmer",
    );
  }

  function chompPowerPellet(sim: PlaySim, input: Partial<SimInput> = {}): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1, input);
  }

  function press(sim: PlaySim, dir: ProgramDir): void {
    pressClock += 1;
    runFrames(sim, 1, { keys: { ...NO_KEYS_HELD, [dir]: pressClock } });
  }

  function cell(sim: PlaySim): { col: number; row: number } {
    const eid = playerEid(sim);
    return { col: worldToCol(Position.x[eid]!), row: worldToRow(Position.y[eid]!) };
  }

  function openDirs(at: { col: number; row: number }): ProgramDir[] {
    return (Object.keys(STEP) as ProgramDir[]).filter((dir) =>
      canEnterDirection(cellCenterX(at.col), cellCenterY(at.row), STEP[dir].dx, STEP[dir].dy),
    );
  }

  const PERPENDICULAR: Record<ProgramDir, ProgramDir[]> = {
    up: ["left", "right"],
    down: ["left", "right"],
    left: ["up", "down"],
    right: ["up", "down"],
  };

  function plannedRun(from: { col: number; row: number }): {
    program: ProgramDir[];
    turnCells: { col: number; row: number }[];
  } {
    const cols = getActiveLayout().cols;
    let heading = openDirs(from)[0]!;
    const program: ProgramDir[] = [heading];
    const turnCells: { col: number; row: number }[] = [];
    let at = from;
    for (let tiles = 0; program.length < 5 && tiles < 200; tiles += 1) {
      at = { col: (at.col + STEP[heading].dx + cols) % cols, row: at.row + STEP[heading].dy };
      const turn = PERPENDICULAR[heading].find((dir) => openDirs(at).includes(dir));
      if (turn !== undefined) {
        program.push(turn);
        turnCells.push(at);
        heading = turn;
      }
    }
    return { program, turnCells };
  }

  function runVisitingCells(sim: PlaySim): string[] {
    const visited: string[] = [];
    for (let ms = 0; sim.snapshot().timers.programmer !== null && ms < 4000; ms += 2) {
      sim.step(IDLE_INPUT, 2);
      const key = `${cell(sim).col},${cell(sim).row}`;
      if (visited.at(-1) !== key) {
        visited.push(key);
      }
    }
    return visited;
  }

  it("does nothing without the upgrade", () => {
    const sim = start([]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.programmer).toBeNull();
    expect(sim.renderOptions().programmerQueue).toBeNull();
  });

  it("stops you on a power pellet and ignores held keys until five presses are in", () => {
    const sim = start(["powerPelletProgrammer"]);
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    const dir = openDirs({
      col: worldToCol(Position.x[power]!),
      row: worldToRow(Position.y[power]!),
    })[0]!;
    chompPowerPellet(sim, { keys: held(dir) });
    const stoppedAt = cell(sim);
    const eid = playerEid(sim);
    expect(Position.x[eid]).toBe(cellCenterX(stoppedAt.col));
    expect(sim.snapshot().timers.programmer).toEqual({
      phase: "recording",
      presses: [],
      setsLeft: 0,
    });
    runFrames(sim, 30, { keys: held(dir) });
    expect(cell(sim)).toEqual(stoppedAt);
    expect(sim.snapshot().timers.programmer).toMatchObject({ presses: [] });

    for (let i = 0; i < 4; i += 1) {
      press(sim, dir);
    }
    expect(cell(sim)).toEqual(stoppedAt);
    expect(sim.snapshot().timers.programmer).toMatchObject({
      phase: "recording",
      presses: [dir, dir, dir, dir],
    });
    expect(sim.renderOptions().programmerQueue?.map((slot) => slot.dir)).toEqual([
      dir,
      dir,
      dir,
      dir,
      null,
    ]);
  });

  it("runs the program at hyperspeed, turning at each intersection, then hands control back", () => {
    const sim = start(["powerPelletProgrammer"]);
    chompPowerPellet(sim);
    const { program, turnCells } = plannedRun(cell(sim));
    expect(turnCells).toHaveLength(4);
    for (const dir of program) {
      press(sim, dir);
    }
    expect(sim.snapshot().timers.programmer?.phase).toBe("running");
    const runningSpeed = Speed.px[playerEid(sim)]!;
    const visited = runVisitingCells(sim);
    expect(sim.snapshot().timers.programmer).toBeNull();
    const turnIndexes = turnCells.map((at) => visited.indexOf(`${at.col},${at.row}`));
    expect(turnIndexes.every((index) => index >= 0)).toBe(true);
    expect([...turnIndexes].sort((a, b) => a - b)).toEqual(turnIndexes);
    const plain = start([]);
    runFrames(plain, 2, { keys: held(program[0]!) });
    expect(runningSpeed).toBeGreaterThan(Speed.px[playerEid(plain)]! * 9);
  });

  it("skips a blocked press and takes the next one at the same intersection", () => {
    const sim = start(["powerPelletProgrammer"]);
    chompPowerPellet(sim);
    const { program, turnCells } = plannedRun(cell(sim));
    const blocked = PERPENDICULAR[program[0]!].find(
      (dir) => !openDirs(turnCells[0]!).includes(dir),
    );
    expect(blocked).toBeDefined();
    for (const dir of [program[0]!, blocked!, program[1]!, program[2]!, program[3]!]) {
      press(sim, dir);
    }
    const visited = runVisitingCells(sim);
    const turnIndexes = turnCells.slice(0, 3).map((at) => visited.indexOf(`${at.col},${at.row}`));
    expect(turnIndexes.every((index) => index >= 0)).toBe(true);
    expect([...turnIndexes].sort((a, b) => a - b)).toEqual(turnIndexes);
  });

  it("a power pellet eaten mid-run starts programming over", () => {
    const sim = start(["powerPelletProgrammer"]);
    chompPowerPellet(sim);
    const dir = openDirs(cell(sim))[0]!;
    for (let i = 0; i < 5; i += 1) {
      press(sim, dir);
    }
    expect(sim.snapshot().timers.programmer?.phase).toBe("running");
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.programmer).toEqual({
      phase: "recording",
      presses: [],
      setsLeft: 0,
    });
  });

  it("Plus: after the first set, stops you again for a second set of five", () => {
    const sim = start(["powerPelletProgrammerPlus"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.programmer).toMatchObject({ setsLeft: 1 });
    const dir = openDirs(cell(sim))[0]!;
    for (let i = 0; i < 5; i += 1) {
      press(sim, dir);
    }
    runUntil(sim, () => sim.snapshot().timers.programmer?.phase === "recording", 240);
    expect(sim.snapshot().timers.programmer).toEqual({
      phase: "recording",
      presses: [],
      setsLeft: 0,
    });
    const stoppedAt = cell(sim);
    runFrames(sim, 20);
    expect(cell(sim)).toEqual(stoppedAt);
  });

  it("with Hyperspeed also owned, still stops you and runs turns without the beat", () => {
    const sim = start(["powerPelletProgrammer", "powerPelletHyperspeed"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.hyperspeedMs).toBeGreaterThan(0);
    runFrames(sim, 5);
    expect(Speed.px[playerEid(sim)]).toBe(0);
    const { program } = plannedRun(cell(sim));
    for (const dir of program) {
      press(sim, dir);
    }
    for (let frame = 0; sim.snapshot().timers.programmer !== null && frame < 240; frame += 1) {
      runFrames(sim, 1);
      expect(sim.snapshot().timers.hyperspeedTurnDelayMs).toBe(0);
    }
    expect(sim.snapshot().timers.programmer).toBeNull();
  });

  it("a catch while programming clears it", () => {
    const sim = start(["powerPelletProgrammer"], { godMode: false, infiniteLives: true });
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.programmer).not.toBeNull();
    ghostOntoPlayer(sim);
    runUntil(sim, () => sim.snapshot().dying, 10);
    runUntil(sim, () => !sim.snapshot().dying, 600);
    expect(sim.snapshot().timers.programmer).toBeNull();
  });
});

describe("Inheritance", () => {
  function quartersAfterLevelClear(
    enableUpgrades: UpgradeId[],
    lives: number,
    deaths: number,
  ): number {
    const sim = startSim({ jumpToUpgrade: true, enableUpgrades });
    const internals = sim as unknown as { lives: number; deathsThisBoard: number };
    internals.lives = lives;
    internals.deathsThisBoard = deaths;
    runUntil(sim, () => sim.offer() !== null, 900, { acknowledge: true });
    return sim.snapshot().quarters;
  }

  const baseline = (lives: number, deaths: number): number =>
    quartersAfterLevelClear([], lives, deaths);

  it("pays a Quarter per empty life slot on level clear", () => {
    expect(quartersAfterLevelClear(["passiveInheritance"], 2, 0)).toBe(baseline(2, 0) + 2);
    expect(quartersAfterLevelClear(["passiveInheritance"], 4, 3)).toBe(baseline(4, 3));
  });

  it("pays a Quarter per death on the cleared level when enhanced", () => {
    expect(quartersAfterLevelClear(["passiveInheritancePlus"], 2, 3)).toBe(baseline(2, 3) + 3);
    expect(quartersAfterLevelClear(["passiveInheritancePlus"], 2, 0)).toBe(baseline(2, 0));
  });

  it("pays nothing when not owned", () => {
    expect(quartersAfterLevelClear([], 1, 3)).toBe(baseline(1, 3));
  });

  it("pays before Myogenesis refills the empty slots", () => {
    expect(quartersAfterLevelClear(["passiveInheritance", "passiveMyogenesisPlus"], 1, 0)).toBe(
      baseline(1, 0) + 3,
    );
  });

  it("counts real deaths on the level it clears", () => {
    const quartersAfterTwoDeaths = (enableUpgrades: UpgradeId[]): number => {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades, infiniteLives: true });
      for (let i = 0; i < 2; i += 1) {
        ghostOntoPlayer(sim);
        runFrames(sim, 1);
        runUntil(sim, () => !sim.snapshot().dying, 240);
      }
      for (const eid of query(sim.world, [Ghost])) {
        removeEntity(sim.world, eid);
      }
      for (const eid of Array.from(query(sim.world, [Pellet, Position]))) {
        eatPelletAt(sim, eid);
      }
      runUntil(sim, () => sim.offer() !== null, 600, { acknowledge: true });
      return sim.snapshot().quarters;
    };
    expect(quartersAfterTwoDeaths(["passiveInheritancePlus"])).toBe(quartersAfterTwoDeaths([]) + 2);
  });
});

describe("Mirror", () => {
  const RIGHT = { keys: held("right") };

  function start(enableUpgrades: UpgradeId[], overrides: Partial<PlayOptions> = {}): PlaySim {
    return startSim({ level: 2, maze: "maze1", enableUpgrades, ...overrides }, "mirror");
  }

  function clearGhosts(sim: PlaySim): void {
    for (const eid of query(sim.world, [Ghost])) {
      removeEntity(sim.world, eid);
    }
  }

  function centerX(): number {
    const layout = getActiveLayout();
    return layout.offsetX + layout.pixelWidth / 2;
  }

  function openRow(): number {
    const layout = getActiveLayout();
    for (let row = 2; row < layout.rows - 2; row += 1) {
      if (
        Array.from({ length: layout.cols - 4 }, (_, i) => i + 2).every((c) => isWalkable(c, row))
      ) {
        return row;
      }
    }
    throw new Error("no open row");
  }

  function arm(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    expect(sim.snapshot().mirror.active).toBe(true);
  }

  function placeOnRow(sim: PlaySim, col: number): number {
    const row = openRow();
    teleportPlayer(sim, cellCenterX(col), cellCenterY(row));
    return row;
  }

  function ghostOnTwin(sim: PlaySim): void {
    const twin = sim.snapshot().mirror;
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    Position.x[ghost] = twin.x!;
    Position.y[ghost] = twin.y!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
  }

  function lastDeath(sim: PlaySim) {
    return sim.runLogRecord().levels.at(-1)!.deaths.at(-1)!;
  }

  it("does nothing without the upgrade", () => {
    const sim = start([]);
    clearGhosts(sim);
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 3);
    expect(sim.snapshot().mirror).toMatchObject({ active: false, x: null, popProgress: null });
    expect(sim.renderOptions().mirror).toBeNull();
  });

  it("appears on a power pellet and mirrors the player across the middle", () => {
    const sim = start(["powerPelletMirror"]);
    clearGhosts(sim);
    arm(sim);
    placeOnRow(sim, 4);
    runFrames(sim, 20, RIGHT);
    const player = playerEid(sim);
    const twin = sim.snapshot().mirror;
    expect(twin.x).toBeCloseTo(2 * centerX() - Position.x[player]!);
    expect(twin.y).toBeCloseTo(Position.y[player]!);
    expect(sim.renderOptions().mirror).toMatchObject({ x: twin.x, y: twin.y });
  });

  it("pops the twin when the bodies touch at the midline", () => {
    const sim = start(["powerPelletMirror"]);
    clearGhosts(sim);
    arm(sim);
    placeOnRow(sim, 10);
    const lives = sim.snapshot().lives;
    runUntil(sim, () => !sim.snapshot().mirror.active, 600, RIGHT);
    const player = playerEid(sim);
    expect(Math.abs(2 * centerX() - Position.x[player]! - Position.x[player]!)).toBeLessThan(
      TILE_SIZE / 2,
    );
    expect(sim.snapshot().mirror.popProgress).not.toBeNull();
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().lives).toBe(lives);
  });

  it("eats pellets the twin stands on", () => {
    const sim = start(["powerPelletMirror"]);
    clearGhosts(sim);
    arm(sim);
    const target = regularPelletEids(sim).find((eid) => worldToCol(Position.x[eid]!) <= 5)!;
    const before = sim.snapshot().boardCollected;
    teleportPlayer(sim, 2 * centerX() - Position.x[target]!, Position.y[target]!);
    runFrames(sim, 1);
    expect(query(sim.world, [Pellet]).includes(target)).toBe(false);
    expect(sim.snapshot().boardCollected).toBeGreaterThanOrEqual(before + 2);
  });

  it("eats fruit the twin stands on", () => {
    const sim = start(["powerPelletMirror"]);
    clearGhosts(sim);
    arm(sim);
    const row = placeOnRow(sim, 17);
    sim["spawnFruitEntity"](false);
    const fruit = query(sim.world, [Fruit, Position])[0]!;
    Position.x[fruit] = cellCenterX(getActiveLayout().cols - 1 - 17);
    Position.y[fruit] = cellCenterY(row);
    expect(sim.snapshot().fruit).toBe(true);
    runFrames(sim, 1);
    expect(sim.snapshot().fruit).toBe(false);
  });

  it("keeps the twin while both bodies are inside walls with Wall Pass", () => {
    const sim = start(["powerPelletMirror", "powerPelletWallPass"]);
    clearGhosts(sim);
    arm(sim);
    expect(sim.snapshot().timers.wallPassMs).toBeGreaterThan(0);
    const layout = getActiveLayout();
    const col = 6;
    const wallRow = Array.from({ length: layout.rows }, (_, row) => row).find(
      (row) => !isWalkable(col, row) && !isWalkable(layout.cols - 1 - col, row),
    )!;
    teleportPlayer(sim, cellCenterX(col), cellCenterY(wallRow));
    runFrames(sim, 3);
    expect(sim.snapshot().mirror.active).toBe(true);
  });

  function pelletAt(sim: PlaySim, col: number, row: number): number | undefined {
    return query(sim.world, [Pellet, Position]).find(
      (eid) =>
        !hasComponent(sim.world, eid, PowerPellet) &&
        worldToCol(Position.x[eid]!) === col &&
        worldToRow(Position.y[eid]!) === row,
    );
  }

  function mirror(col: number): number {
    return getActiveLayout().cols - 1 - col;
  }

  describe("is you", () => {
    it("eats along the mirrored path at hyperspeed, not just where each frame ends", () => {
      const sim = start(["powerPelletMirror", "powerPelletHyperspeed"]);
      clearGhosts(sim);
      arm(sim);
      expect(sim.snapshot().timers.hyperspeedMs).toBeGreaterThan(0);
      const startCol = 3;
      const row = placeOnRow(sim, startCol);
      Facing.direction[playerEid(sim)] = DIRECTION.right;
      runFrames(sim, 10, RIGHT);
      const endCol = worldToCol(Position.x[playerEid(sim)]!);
      expect(endCol - startCol).toBeGreaterThan(8);
      const span = Array.from({ length: endCol - startCol + 1 }, (_, i) => mirror(startCol + i));
      expect(span.filter((col) => pelletAt(sim, col, row) !== undefined)).toEqual([]);
    });

    it("is caught by a ghost mid-path at hyperspeed, not only where a frame ends", () => {
      const sim = start(["powerPelletMirror", "powerPelletHyperspeed"]);
      arm(sim);
      const row = placeOnRow(sim, 3);
      Facing.direction[playerEid(sim)] = DIRECTION.right;
      runFrames(sim, 2, RIGHT);
      const frameStep = (): number => {
        const before = sim.snapshot().mirror.x!;
        sim.step({ ...IDLE_INPUT, ...RIGHT }, 50);
        return before - sim.snapshot().mirror.x!;
      };
      const startX = sim.snapshot().mirror.x!;
      const travel = frameStep();
      expect(travel).toBeGreaterThan(2 * TILE_SIZE);
      teleportPlayer(sim, 2 * centerX() - startX, cellCenterY(row));
      sim["runUpgrades"] = { ...sim["runUpgrades"], hyperspeedRemainingMs: 5000 };
      const ghost = query(sim.world, [Ghost, Position])[0]!;
      Position.x[ghost] = startX - travel / 2;
      Position.y[ghost] = cellCenterY(row);
      GhostPhase.value[ghost] = GHOST_PHASE.active;
      sim.step({ ...IDLE_INPUT, ...RIGHT }, 50);
      expect(sim.snapshot().dying).toBe(true);
    });

    it("dies on lava the player is not touching", () => {
      const sim = startSim({ level: 8, maze: "maze1", enableUpgrades: ["powerPelletMirror"] });
      clearGhosts(sim);
      sim["speedZones"] = [];
      arm(sim);
      const { col, row } = sim.snapshot().lava!;
      runUntil(sim, () => sim.snapshot().lava!.phase === "full", 1500, { keys: held("left") });
      const lives = sim.snapshot().lives;
      teleportPlayer(sim, cellCenterX(mirror(col)), cellCenterY(row));
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(true);
      expect(sim.snapshot().lives).toBe(lives - 1);
      expect(lastDeath(sim)).toMatchObject({ lava: true, col, row });
    });

    it("Floating lets the twin stand in lava", () => {
      const sim = startSim({
        level: 8,
        maze: "maze1",
        enableUpgrades: ["powerPelletMirror", "passiveFloating"],
      });
      clearGhosts(sim);
      sim["speedZones"] = [];
      arm(sim);
      const { col, row } = sim.snapshot().lava!;
      runUntil(sim, () => sim.snapshot().lava!.phase === "full", 1500, { keys: held("left") });
      teleportPlayer(sim, cellCenterX(mirror(col)), cellCenterY(row));
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(false);
    });

    it("Plus: lava only pops the twin", () => {
      const sim = startSim({
        level: 8,
        maze: "maze1",
        enableUpgrades: ["powerPelletMirrorPlus"],
      });
      clearGhosts(sim);
      sim["speedZones"] = [];
      arm(sim);
      const { col, row } = sim.snapshot().lava!;
      runUntil(sim, () => sim.snapshot().lava!.phase === "full", 1500, { keys: held("left") });
      const lives = sim.snapshot().lives;
      teleportPlayer(sim, cellCenterX(mirror(col)), cellCenterY(row));
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(false);
      expect(sim.snapshot().lives).toBe(lives);
      expect(sim.snapshot().mirror.active).toBe(false);
    });

    function twinReaches(enableUpgrades: UpgradeId[]): boolean {
      const sim = start(["powerPelletMirror", ...enableUpgrades]);
      clearGhosts(sim);
      arm(sim);
      const row = openRow();
      const twinCol = 8;
      const own = pelletAt(sim, twinCol, row);
      if (own !== undefined) {
        removeEntity(sim.world, own);
      }
      const neighbor = pelletAt(sim, twinCol + 1, row)!;
      teleportPlayer(sim, cellCenterX(mirror(twinCol)), cellCenterY(row));
      runFrames(sim, 1);
      return !query(sim.world, [Pellet]).includes(neighbor);
    }

    it("gets Pickup Range", () => {
      expect(twinReaches([])).toBe(false);
      expect(twinReaches(["passivePickupRange"])).toBe(true);
    });

    function pelletsGone(enableUpgrades: UpgradeId[]): number {
      const sim = start(enableUpgrades);
      clearGhosts(sim);
      const before = query(sim.world, [Pellet]).length;
      const power = query(sim.world, [PowerPellet, Position])[0]!;
      teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      runFrames(sim, 1);
      return before - query(sim.world, [Pellet]).length;
    }

    it("gets Extra Hungry", () => {
      const solo = pelletsGone(["powerPelletExtraHungry"]);
      const withTwin = pelletsGone(["powerPelletExtraHungry", "powerPelletMirror"]);
      expect(withTwin - solo).toBe(8);
    });
  });

  it("ignores power pellets while active", () => {
    const sim = start(["powerPelletMirror"]);
    clearGhosts(sim);
    arm(sim);
    const total = query(sim.world, [PowerPellet]).length;
    runFrames(sim, 3);
    expect(query(sim.world, [PowerPellet]).length).toBeLessThan(total);
    expect(sim.snapshot().mirror.active).toBe(true);
    expect(sim.runLogRecord().levels.at(-1)!.activations.mirror).toBe(1);
  });

  it("targets whichever body is nearer by path", () => {
    const sim = start(["powerPelletMirror"]);
    arm(sim);
    placeOnRow(sim, 4);
    runFrames(sim, 1);
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    const twin = sim.snapshot().mirror;
    Position.x[ghost] = twin.x! - 3 * TILE_SIZE;
    Position.y[ghost] = twin.y!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    Facing.direction[ghost] = DIRECTION.none;
    sim["ghostModeClock"] = { ...sim["ghostModeClock"], mode: GHOST_AI_MODE.chase };
    sim["previousEffectiveGhostMode"] = GHOST_AI_MODE.chase;
    const gap = (): number => Math.abs(Position.x[ghost]! - sim.snapshot().mirror.x!);
    const before = gap();
    runFrames(sim, 20);
    expect(gap()).toBeLessThan(before);
  });

  it("counts a catch of the twin as a death from the twin's spot", () => {
    const sim = start(["powerPelletMirror"]);
    arm(sim);
    placeOnRow(sim, 4);
    runFrames(sim, 1);
    const lives = sim.snapshot().lives;
    const twinCol = sim.snapshot().mirror.col!;
    ghostOnTwin(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    expect(sim.snapshot().lives).toBe(lives - 1);
    expect(lastDeath(sim)).toMatchObject({ col: twinCol, row: openRow() });
    runUntil(sim, () => !sim.snapshot().dying, 400);
    expect(sim.snapshot().mirror.active).toBe(false);
  });

  it("counts a catch of the player as a normal death and removes the twin", () => {
    const sim = start(["powerPelletMirror"]);
    arm(sim);
    placeOnRow(sim, 4);
    runFrames(sim, 1);
    const lives = sim.snapshot().lives;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().lives).toBe(lives - 1);
    runUntil(sim, () => !sim.snapshot().dying, 400);
    expect(sim.snapshot().mirror.active).toBe(false);
  });

  it("spares the twin and the player under Ghost Proof", () => {
    const sim = start(["powerPelletMirror", "powerPelletInvuln"]);
    arm(sim);
    placeOnRow(sim, 4);
    runFrames(sim, 1);
    ghostOnTwin(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().mirror.active).toBe(true);
  });

  describe("enhanced", () => {
    it("pops only the twin when a ghost catches it, without costing a life", () => {
      const sim = start(["powerPelletMirrorPlus"]);
      arm(sim);
      placeOnRow(sim, 4);
      runFrames(sim, 1);
      const lives = sim.snapshot().lives;
      ghostOnTwin(sim);
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(false);
      expect(sim.snapshot().lives).toBe(lives);
      expect(sim.snapshot().deathsThisBoard).toBe(0);
      expect(sim.snapshot().mirror).toMatchObject({ active: false, x: null });
      expect(sim.snapshot().mirror.popProgress).not.toBeNull();
      expect(sim.renderOptions().mirrorPop).not.toBeNull();
    });

    it("pops the twin and shields the player when a ghost catches the player", () => {
      const sim = start(["powerPelletMirrorPlus"]);
      arm(sim);
      placeOnRow(sim, 4);
      runFrames(sim, 1);
      const lives = sim.snapshot().lives;
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(false);
      expect(sim.snapshot().lives).toBe(lives);
      expect(sim.snapshot().mirror.active).toBe(false);
      expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(0);
      runFrames(sim, 10);
      expect(sim.snapshot().dying).toBe(false);
    });

    it("is a normal death again once the twin is gone", () => {
      const sim = start(["powerPelletMirrorPlus"]);
      arm(sim);
      placeOnRow(sim, 4);
      runFrames(sim, 1);
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      runUntil(sim, () => sim.snapshot().timers.invulnMs === 0, 120);
      ghostOntoPlayer(sim);
      runFrames(sim, 1);
      expect(sim.snapshot().dying).toBe(true);
    });

    it("finishes the pop animation", () => {
      const sim = start(["powerPelletMirrorPlus"]);
      arm(sim);
      placeOnRow(sim, 4);
      runFrames(sim, 1);
      ghostOnTwin(sim);
      runFrames(sim, 1);
      runUntil(sim, () => sim.snapshot().mirror.popProgress === null, 120);
      expect(sim.renderOptions().mirrorPop).toBeNull();
    });
  });

  describe("speed zones", () => {
    function zoneRun(
      zoneFor: (row: number, playerCol: number, twinCol: number) => SpeedZone[],
      extra: readonly UpgradeId[] = [],
    ) {
      const sim = start(["powerPelletMirror", ...extra], { level: 6 });
      const livesBefore = sim.snapshot().lives;
      clearGhosts(sim);
      settledZones(sim);
      arm(sim);
      const playerCol = 6;
      const twinCol = getActiveLayout().cols - 1 - playerCol;
      const row = openRow();
      sim["speedZones"] = zoneFor(row, playerCol, twinCol);
      const player = playerEid(sim);
      for (let frame = 0; frame < 3; frame += 1) {
        sim["eatDragMs"] = 0;
        Position.x[player] = cellCenterX(playerCol);
        Position.y[player] = cellCenterY(row);
        runFrames(sim, 1, RIGHT);
      }
      return { sim, livesBefore, speed: Speed.px[player]! };
    }

    const lane = (col: number, row: number, fastDir: SpeedZone["fastDir"]): SpeedZone => ({
      col: col - 1,
      row,
      axis: "horizontal",
      length: 3,
      fastDir,
    });

    it("pops the twin when the two bodies hit opposite zone effects", () => {
      const { sim, livesBefore } = zoneRun((row, playerCol, twinCol) => [
        lane(playerCol, row, "right"),
        lane(twinCol, row, "right"),
      ]);
      expect(sim.snapshot().mirror.active).toBe(false);
      expect(sim.snapshot().mirror.popProgress).not.toBeNull();
      expect(sim.snapshot().dying).toBe(false);
      expect(sim.snapshot().lives).toBe(livesBefore);
    });

    it("Floating+ spares the twin when one body is on the slow side", () => {
      const { sim } = zoneRun(
        (row, playerCol, twinCol) => [lane(playerCol, row, "right"), lane(twinCol, row, "right")],
        ["passiveFloatingPlus"],
      );
      expect(sim.snapshot().mirror.active).toBe(true);
      expect(sim.snapshot().playerSpeedZone).toBe("fast");
    });

    it("keeps the twin when both bodies get the same effect", () => {
      const { sim } = zoneRun((row, playerCol, twinCol) => [
        lane(playerCol, row, "right"),
        lane(twinCol, row, "left"),
      ]);
      expect(sim.snapshot().mirror.active).toBe(true);
      expect(sim.snapshot().playerSpeedZone).toBe("fast");
    });

    it("applies the zone to both bodies when only one is in it", () => {
      const open = zoneRun(() => []);
      const solo = zoneRun((row, playerCol) => [lane(playerCol, row, "right")]);
      expect(solo.sim.snapshot().mirror.active).toBe(true);
      expect(solo.speed).toBeCloseTo(open.speed * FAST_ZONE_MULTIPLIER);
      const twinOnly = zoneRun((row, _playerCol, twinCol) => [lane(twinCol, row, "left")]);
      expect(twinOnly.sim.snapshot().mirror.active).toBe(true);
      expect(twinOnly.speed).toBeCloseTo(open.speed * FAST_ZONE_MULTIPLIER);
    });
  });

  it("pops when the mirrored cell is a wall the player cell is not", () => {
    const sim = start(["powerPelletMirror"]);
    clearGhosts(sim);
    arm(sim);
    const col = 6;
    const row = placeOnRow(sim, col);
    const mirror = getActiveLayout().cols - 1 - col;
    sim["runUpgrades"] = {
      ...sim["runUpgrades"],
      droppedWall: {
        col: mirror,
        row,
        remainingMs: 5000,
        passable: false,
        awayStep: { dx: 1, dy: 0 },
        vacated: true,
      },
    };
    runFrames(sim, 1);
    expect(sim.snapshot().mirror.active).toBe(false);
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().mirror.popProgress).not.toBeNull();
  });

  it("ends on level advance and can start again", () => {
    const sim = start(["powerPelletMirror"]);
    clearGhosts(sim);
    arm(sim);
    for (const eid of Array.from(query(sim.world, [Pellet, Position]))) {
      eatPelletAt(sim, eid);
    }
    takeFirstOffered(sim);
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 1200);
    expect(sim.snapshot().mirror.active).toBe(false);
  });
});

describe("Chaff", () => {
  function start(enableUpgrades: UpgradeId[]): PlaySim {
    return startSim({ level: 2, maze: "maze1", godMode: true, enableUpgrades });
  }

  function eatPower(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  function activeGhost(sim: PlaySim): number {
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
    return ghost;
  }

  it("does nothing without the upgrade", () => {
    const sim = start([]);
    eatPower(sim);
    expect(sim.snapshot().chaff).toEqual([]);
    expect(sim.snapshot().timers.chaffMs).toBe(0);
  });

  it("drops one decoy that expires after 5s", () => {
    const sim = start(["powerPelletChaff"]);
    eatPower(sim);
    expect(sim.snapshot().chaff).toHaveLength(1);
    expect(sim.renderOptions().chaff).toHaveLength(1);
    expect(sim.snapshot().timers.chaffMs).toBeGreaterThan(5000 - 2 * FRAME_MS);
    const events = runUntil(sim, () => sim.snapshot().chaff.length === 0, 400);
    expect(sim.snapshot().timers.chaffMs).toBe(0);
    expect(events.filter((e) => e.type === "chaffBurst")).toHaveLength(1);
  });

  it("enhanced drops four decoys that last 7s", () => {
    const sim = start(["powerPelletChaffPlus"]);
    eatPower(sim);
    expect(sim.snapshot().chaff).toHaveLength(4);
    expect(sim.snapshot().timers.chaffMs).toBeGreaterThan(7000 - 2 * FRAME_MS);
  });

  it("re-triggering refreshes instead of stacking", () => {
    const sim = start(["powerPelletChaff"]);
    eatPower(sim);
    runFrames(sim, 60);
    const before = sim.snapshot().timers.chaffMs;
    const second = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[second]!, Position.y[second]!);
    runFrames(sim, 1);
    expect(sim.snapshot().chaff).toHaveLength(1);
    expect(sim.snapshot().timers.chaffMs).toBeGreaterThan(before);
  });

  it("ghosts chase the decoy, and a touch bursts it and sends them back to you", () => {
    const sim = start(["powerPelletChaff"]);
    const ghost = activeGhost(sim);
    eatPower(sim);
    const decoy = sim.snapshot().chaff[0]!;
    Position.x[ghost] = decoy.x;
    Position.y[ghost] = decoy.y;
    const events = runFrames(sim, 1);
    expect(sim.snapshot().chaff).toHaveLength(0);
    expect(events.filter((e) => e.type === "chaffBurst")).toHaveLength(1);
  });

  it("clears the decoy when a life is lost", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletChaff"],
      infiniteLives: true,
    });
    eatPower(sim);
    expect(sim.snapshot().chaff).toHaveLength(1);
    ghostOntoPlayer(sim);
    runUntil(sim, () => sim.snapshot().dying, 120);
    runUntil(sim, () => !sim.snapshot().dying, 600);
    expect(sim.snapshot().chaff).toEqual([]);
    expect(sim.snapshot().timers.chaffMs).toBe(0);
  });
});

describe("collapsed tunnels", () => {
  const SEED = "collapse-run";
  const chainsAt = (level: number, overrides: Partial<PlayOptions> = {}) =>
    startSim({ level, ...overrides }, SEED).snapshot().collapse;

  it("adds one collapse on level 4, another on 5 and a third on 7, and keeps them", () => {
    const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => chainsAt(level).chains.length);
    expect(counts).toEqual([0, 0, 0, 1, 2, 2, 3, 3, 0]);
  });

  it("flags only the collapse that arrives on this level as fresh", () => {
    expect(chainsAt(4).fresh).toEqual([true]);
    expect(chainsAt(5).fresh).toEqual([false, true]);
    expect(chainsAt(6).fresh).toEqual([false, false]);
    expect(chainsAt(7).fresh).toEqual([false, false, true]);
    expect(chainsAt(8).fresh).toEqual([false, false, false]);
  });

  it("keeps the same collapses in the same place across pool levels", () => {
    const five = chainsAt(5).chains;
    expect(chainsAt(6).chains).toEqual(five);
    expect(chainsAt(7).chains.slice(0, 2)).toEqual(five);
    expect(chainsAt(8).chains.slice(0, 2)).toEqual(five);
  });

  it("walls the collapsed lanes off for Dot-Man and the ghosts and drops their pellets", () => {
    const plain = startSim({ level: 3 }, SEED);
    const plainPellets = query(plain.world, [Pellet]).length;
    for (const level of [4, 5, 7]) {
      const sim = startSim({ level }, SEED);
      const { chains } = sim.snapshot().collapse;
      const layout = getActiveLayout();
      const cells = chains.flat();
      for (const { col, row } of cells) {
        expect(layout.playerSolids[row]![col]).toBe(true);
        expect(layout.ghostSolids[row]![col]).toBe(true);
      }
      const pellets = query(sim.world, [Pellet, Position]);
      const onCollapse = pellets.filter((eid) =>
        cells.some(
          (c) => c.col === worldToCol(Position.x[eid]!) && c.row === worldToRow(Position.y[eid]!),
        ),
      );
      expect(onCollapse).toEqual([]);
      expect(pellets.length).toBeLessThan(plainPellets);
      expect(layout.pelletCount).toBe(pellets.length);
    }
  });

  it("leaves every remaining pellet reachable from the spawn", () => {
    for (const seed of ["collapse-a", "collapse-b", "collapse-c", SEED]) {
      for (const level of [4, 5, 7, 8]) {
        const sim = startSim({ level }, seed);
        const { playerSolids, playerSpawn } = getActiveLayout();
        const seen = new Set<string>([`${playerSpawn.col},${playerSpawn.row}`]);
        const queue = [playerSpawn];
        for (let i = 0; i < queue.length; i += 1) {
          const { col, row } = queue[i]!;
          for (const [dc, dr] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const next = { col: col + dc, row: row + dr };
            const key = `${next.col},${next.row}`;
            if (!seen.has(key) && isWalkable(next.col, next.row, playerSolids)) {
              seen.add(key);
              queue.push(next);
            }
          }
        }
        for (const eid of query(sim.world, [Pellet, Position])) {
          const cell = `${worldToCol(Position.x[eid]!)},${worldToRow(Position.y[eid]!)}`;
          expect(seen.has(cell), `${seed} level ${level} pellet at ${cell}`).toBe(true);
        }
      }
    }
  });

  it("replays speed lanes on the final collapsed board so they carry over when a lane collapses", () => {
    const seeds = ["find-0", "find-1", "find-2", "find-5", "find-6", "find-8", "find-10"];
    for (const seed of seeds) {
      const four = settledZones(startSim({ level: 4 }, seed));
      expect(startSim({ level: 5 }, seed).snapshot().speedZones, seed).toEqual(four);
      const collapsed = new Set(
        startSim({ level: 8 }, seed)
          .snapshot()
          .collapse.chains.flat()
          .map((cell) => `${cell.col},${cell.row}`),
      );
      for (const zone of four) {
        for (const cell of speedZoneCells(zone)) {
          expect(collapsed.has(`${cell.col},${cell.row}`), seed).toBe(false);
        }
      }
    }
  });

  it("starts the dust intro at the board start and stops it at its full length", () => {
    const sim = startSim({ level: 4 }, SEED);
    expect(sim.snapshot().collapse.introMs).toBe(0);
    runFrames(sim, 30, { keys: held("left") });
    const early = sim.snapshot().collapse.introMs;
    expect(early).toBeGreaterThan(0);
    runFrames(sim, 400);
    expect(sim.snapshot().collapse.introMs).toBeGreaterThan(early);
    const settled = sim.snapshot().collapse.introMs;
    runFrames(sim, 60);
    expect(sim.snapshot().collapse.introMs).toBe(settled);
  });

  it("hands the renderer the rubble art only while collapses exist", () => {
    expect(startSim({ level: 3 }, SEED).renderOptions().collapse).toBeNull();
    const state = startSim({ level: 5 }, SEED).renderOptions().collapse;
    expect(state?.arts).toHaveLength(2);
    expect(state?.arts.map((art) => art.fresh)).toEqual([false, true]);
    expect(state?.arts.every((art) => art.pixels.length > 0 && art.motes.length > 0)).toBe(true);
  });

  it("clears the rubble art off collapsed cells that tunnel boring opens", () => {
    const sim = startSim({ level: 5, enableUpgrades: ["passiveTunnelBoring"] }, SEED);
    const before = sim.renderOptions().collapse!;
    const chain = sim.snapshot().collapse.chains[0]!;
    sim["clearBoredRubble"](chain);
    const after = sim.renderOptions().collapse!;
    expect(after.key).not.toBe(before.key);
    expect(after.arts[0]!.pixels.length).toBeLessThan(before.arts[0]!.pixels.length / 2);
    expect(after.arts[1]!.pixels).toEqual(before.arts[1]!.pixels);
    expect(after.arts.map((art) => art.fresh)).toEqual(before.arts.map((art) => art.fresh));
  });

  it("bores through rubble tile by tile, clearing its art as each tile opens and leaving a bigger pile", () => {
    const sim = startSim(
      { level: 5, godMode: true, enableUpgrades: ["passiveTunnelBoring"] },
      SEED,
    );
    const rubble = new Set(
      sim
        .snapshot()
        .collapse.chains.flat()
        .map((cell) => `${cell.col},${cell.row}`),
    );
    const isRubble = (cell: MazeTile): boolean => rubble.has(`${cell.col},${cell.row}`);
    const layout = getActiveLayout();
    const dirs = [
      { dx: 1, dy: 0, dir: "right" as const },
      { dx: -1, dy: 0, dir: "left" as const },
      { dx: 0, dy: 1, dir: "down" as const },
      { dx: 0, dy: -1, dir: "up" as const },
    ];
    let spot: {
      col: number;
      row: number;
      dir: (typeof dirs)[number]["dir"];
      cells: MazeTile[];
    } | null = null;
    for (let row = 0; row < layout.rows && spot === null; row += 1) {
      for (let col = 0; col < layout.cols && spot === null; col += 1) {
        for (const step of dirs) {
          const cells = isWalkable(col, row) ? tunnelBoringCells(col, row, step.dx, step.dy) : null;
          if (cells !== null && cells.some(isRubble) && !cells.every(isRubble)) {
            spot = { col, row, dir: step.dir, cells };
            break;
          }
        }
      }
    }
    expect(spot).not.toBeNull();
    const { cells } = spot!;
    const artPixels = (): number =>
      sim.renderOptions().collapse!.arts.reduce((sum, art) => sum + art.pixels.length, 0);
    const before = artPixels();
    const eid = playerEid(sim);
    teleportPlayer(sim, cellCenterX(spot!.col), cellCenterY(spot!.row));
    Facing.direction[eid] = DIRECTION.none;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    const keys = new Set<string>();
    for (
      let frame = 0;
      frame < 300 && sim.snapshot().tunnelBoring.openCells < cells.length;
      frame += 1
    ) {
      runFrames(sim, 1, { keys: held(spot!.dir) });
      keys.add(sim.renderOptions().collapse!.key);
    }
    expect(sim.snapshot().tunnelBoring.openCells).toBe(cells.length);
    expect(keys.size).toBeGreaterThan(1);
    expect(keys.size).toBeLessThanOrEqual(boreSteps(cells).length + 1);
    expect(artPixels()).toBeLessThan(before);
    const chips = sim.renderOptions().boreJunk!.map((pile) => pile.chips.length);
    const rubbleChips = cells.map((cell, i) => (isRubble(cell) ? chips[i]! : 0)).filter(Boolean);
    const wallChips = cells.map((cell, i) => (isRubble(cell) ? 0 : chips[i]!)).filter(Boolean);
    expect(Math.min(...rubbleChips)).toBeGreaterThan(Math.max(...wallChips));
  });

  it("leaves the rubble art alone when a bore opens tiles nowhere near rubble", () => {
    const sim = startSim(
      { level: 5, godMode: true, enableUpgrades: ["passiveTunnelBoring"] },
      SEED,
    );
    const chains = sim.snapshot().collapse.chains.flat();
    const near = (cell: MazeTile): boolean =>
      chains.some(
        (link) => Math.abs(link.col - cell.col) <= 2 && Math.abs(link.row - cell.row) <= 2,
      );
    const layout = getActiveLayout();
    let spot: { col: number; row: number; dir: "left" | "right" | "up" | "down" } | null = null;
    for (let row = 0; row < layout.rows && spot === null; row += 1) {
      for (let col = 0; col < layout.cols && spot === null; col += 1) {
        for (const [dx, dy, dir] of [
          [1, 0, "right"],
          [-1, 0, "left"],
          [0, 1, "down"],
          [0, -1, "up"],
        ] as const) {
          const cells = isWalkable(col, row) ? tunnelBoringCells(col, row, dx, dy) : null;
          if (cells !== null && !cells.some(near)) {
            spot = { col, row, dir };
            break;
          }
        }
      }
    }
    expect(spot).not.toBeNull();
    const before = sim.renderOptions().collapse!.key;
    const eid = playerEid(sim);
    teleportPlayer(sim, cellCenterX(spot!.col), cellCenterY(spot!.row));
    Facing.direction[eid] = DIRECTION.none;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    runFrames(sim, 60, { keys: held(spot!.dir) });
    expect(sim.snapshot().tunnelBoring.openCells).toBeGreaterThan(0);
    expect(sim.renderOptions().collapse!.key).toBe(before);
  });

  it("is a level modifier that ?levelModifiers=0 turns off, and the boss board has none", () => {
    expect(chainsAt(7, { levelModifiers: false }).chains).toEqual([]);
    expect(startSim({ level: 7, levelModifiers: false }, SEED).renderOptions().collapse).toBeNull();
    expect(chainsAt(9).chains).toEqual([]);
  });

  it("replays the same collapses for the same seed and differs between seeds", () => {
    expect(chainsAt(7)).toEqual(chainsAt(7));
    const other = startSim({ level: 7 }, "collapse-other").snapshot().collapse.chains;
    expect(other).not.toEqual(chainsAt(7).chains);
  });
});

describe("sinkhole", () => {
  const SEED = "collapse-run";
  const sinkholeAt = (level: number, overrides: Partial<PlayOptions> = {}) =>
    startSim({ level, ...overrides }, SEED).snapshot().sinkhole;
  const cellKey = (cell: MazeTile): string => `${cell.col},${cell.row}`;

  it("appears on level 6 as a single corridor run and stays through the pool levels", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => sinkholeAt(level).cells !== null)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
    ]);
    const six = sinkholeAt(6).cells!;
    expect(six.length).toBeGreaterThanOrEqual(3);
    expect(six.length).toBeLessThanOrEqual(5);
    expect(sinkholeAt(7).cells).toEqual(six);
    expect(sinkholeAt(8).cells).toEqual(six);
  });

  it("is a level modifier that ?levelModifiers=0 turns off", () => {
    expect(sinkholeAt(6, { levelModifiers: false }).cells).toBeNull();
    expect(startSim({ level: 6, levelModifiers: false }, SEED).renderOptions().sinkhole).toBeNull();
  });

  it("blocks Dot-Man in its cells but lets the ghosts cross, and drops their pellets", () => {
    const sim = startSim({ level: 6 }, SEED);
    const layout = getActiveLayout();
    const cells = sim.snapshot().sinkhole.cells!;
    for (const { col, row } of cells) {
      expect(layout.playerSolids[row]![col]).toBe(true);
      expect(layout.wallPassPlayerSolids[row]![col]).toBe(true);
      expect(layout.ghostActiveSolids[row]![col]).toBe(false);
      expect(layout.ghostSolids[row]![col]).toBe(false);
    }
    const pellets = query(sim.world, [Pellet, Position]);
    const inside = pellets.filter((eid) =>
      cells.some(
        (c) => c.col === worldToCol(Position.x[eid]!) && c.row === worldToRow(Position.y[eid]!),
      ),
    );
    expect(inside).toEqual([]);
    expect(layout.pelletCount).toBe(pellets.length);
  });

  it("keeps every remaining pellet reachable around it", () => {
    for (const seed of ["collapse-a", "collapse-b", "collapse-c", SEED]) {
      const sim = startSim({ level: 6 }, seed);
      const { playerSolids, playerSpawn } = getActiveLayout();
      const seen = new Set<string>([cellKey(playerSpawn)]);
      const queue = [playerSpawn];
      for (let i = 0; i < queue.length; i += 1) {
        const { col, row } = queue[i]!;
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const next = { col: col + dc, row: row + dr };
          if (!seen.has(cellKey(next)) && isWalkable(next.col, next.row, playerSolids)) {
            seen.add(cellKey(next));
            queue.push(next);
          }
        }
      }
      for (const eid of query(sim.world, [Pellet, Position])) {
        const cell = { col: worldToCol(Position.x[eid]!), row: worldToRow(Position.y[eid]!) };
        expect(seen.has(cellKey(cell)), `${seed} pellet at ${cellKey(cell)}`).toBe(true);
      }
    }
  });

  const approach = (sim: PlaySim) => {
    const cells = sim.snapshot().sinkhole.cells!;
    const inChain = new Set(cells.map(cellKey));
    const first = cells[0]!;
    const layout = getActiveLayout();
    const side = [
      { dc: 1, dr: 0, key: "left" },
      { dc: -1, dr: 0, key: "right" },
      { dc: 0, dr: 1, key: "up" },
      { dc: 0, dr: -1, key: "down" },
    ]
      .map((entry) => ({
        ...entry,
        from: { col: first.col + entry.dc, row: first.row + entry.dr },
      }))
      .find(
        (entry) =>
          !inChain.has(cellKey(entry.from)) &&
          isWalkable(entry.from.col, entry.from.row, layout.playerSolids),
      )!;
    teleportPlayer(sim, cellCenterX(side.from.col), cellCenterY(side.from.row));
    runFrames(sim, 90, { keys: held(side.key as "left" | "right" | "up" | "down") });
    const eid = playerEid(sim);
    const at = { col: worldToCol(Position.x[eid]!), row: worldToRow(Position.y[eid]!) };
    return { inside: inChain.has(cellKey(at)), first, side };
  };

  it("stops Dot-Man at the edge while a ghost may enter the same cell", () => {
    const { inside, first, side } = approach(startSim({ level: 6 }, SEED));
    expect(inside).toBe(false);
    const rules = ghostMovementRules(GHOST_PHASE.active);
    expect(
      rules.canEnter(
        cellCenterX(side.from.col),
        cellCenterY(side.from.row),
        first.col - side.from.col,
        first.row - side.from.row,
      ),
    ).toBe(true);
  });

  it("lets a floating Dot-Man pass over it, enhanced or not", () => {
    for (const id of ["passiveFloating", "passiveFloatingPlus"] as const) {
      const sim = startSim({ level: 6, enableUpgrades: [id] }, SEED);
      expect(approach(sim).inside, id).toBe(true);
    }
  });

  it("lets Dot-Man walk out if he loses Floating inside it, then blocks him again", () => {
    const sim = startSim({ level: 6, enableUpgrades: ["passiveFloating"] }, SEED);
    const cells = sim.snapshot().sinkhole.cells!;
    const inChain = new Set(cells.map(cellKey));
    const mid = cells[Math.floor(cells.length / 2)]!;
    teleportPlayer(sim, cellCenterX(mid.col), cellCenterY(mid.row));
    runFrames(sim, 5);
    expect(sim.salvageOwned("passiveFloating").length).toBeGreaterThan(0);
    runFrames(sim, 2);
    const eid = playerEid(sim);
    const at = () => ({ col: worldToCol(Position.x[eid]!), row: worldToRow(Position.y[eid]!) });
    const towardStart = cells.slice(0, cells.indexOf(mid) + 1).reverse();
    const keyBetween = (from: MazeTile, to: MazeTile) =>
      to.col > from.col ? "right" : to.col < from.col ? "left" : to.row > from.row ? "down" : "up";
    for (let i = 0; i + 1 < towardStart.length; i += 1) {
      runFrames(sim, 40, { keys: held(keyBetween(towardStart[i]!, towardStart[i + 1]!)) });
    }
    const [end, beforeEnd] = [cells[0]!, cells[1]!];
    runFrames(sim, 60, { keys: held(keyBetween(beforeEnd, end)) });
    expect(inChain.has(cellKey(at()))).toBe(false);
    for (const { col, row } of cells) {
      expect(getActiveLayout().playerSolids[row]![col]).toBe(true);
    }
  });

  it("is never dug out by Tunnel Boring", () => {
    const sim = startSim(
      { level: 6, godMode: true, enableUpgrades: ["passiveTunnelBoring"] },
      SEED,
    );
    const inChain = new Set(sim.snapshot().sinkhole.cells!.map(cellKey));
    const layout = getActiveLayout();
    let nextToHole = 0;
    for (let row = 0; row < layout.rows; row += 1) {
      for (let col = 0; col < layout.cols; col += 1) {
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          if (!isWalkable(col, row, layout.playerSolids)) {
            continue;
          }
          nextToHole += inChain.has(cellKey({ col: col + dx, row: row + dy })) ? 1 : 0;
          const run = tunnelBoringCells(col, row, dx, dy, layout) ?? [];
          expect(run.some((cell) => inChain.has(cellKey(cell)))).toBe(false);
        }
      }
    }
    expect(nextToHole).toBeGreaterThan(0);
  });

  it("flags only the level-6 sinkhole as fresh and runs its opening clock to full length", () => {
    expect(sinkholeAt(6).fresh).toBe(true);
    expect(sinkholeAt(7).fresh).toBe(false);
    const sim = startSim({ level: 6 }, SEED);
    expect(sim.snapshot().sinkhole.introMs).toBe(0);
    runFrames(sim, 30, { keys: held("left") });
    const early = sim.snapshot().sinkhole.introMs;
    expect(early).toBeGreaterThan(0);
    runFrames(sim, 600, { keys: held("left") });
    expect(sim.snapshot().sinkhole.introMs).toBeGreaterThan(early);
    const settled = sim.snapshot().sinkhole.introMs;
    expect(settled).toBe(SINKHOLE_INTRO_MS);
    runFrames(sim, 60);
    expect(sim.snapshot().sinkhole.introMs).toBe(settled);
  });

  it("hands the renderer its art only while a sinkhole exists", () => {
    expect(startSim({ level: 5 }, SEED).renderOptions().sinkhole).toBeNull();
    const state = startSim({ level: 6 }, SEED).renderOptions().sinkhole;
    expect(state?.fresh).toBe(true);
    expect(state?.art.pixels.length).toBeGreaterThan(0);
    expect(startSim({ level: 7 }, SEED).renderOptions().sinkhole?.fresh).toBe(false);
  });

  it("replays the same sinkhole for the same seed and differs between seeds", () => {
    expect(sinkholeAt(6)).toEqual(sinkholeAt(6));
    expect(startSim({ level: 6 }, "collapse-other").snapshot().sinkhole.cells).not.toEqual(
      sinkholeAt(6).cells,
    );
  });
});

describe("upgrade HUD timers", () => {
  function chompPowerPellet(sim: PlaySim): SimEvent[] {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    return runFrames(sim, 1);
  }

  it("pulses fired upgrades and drains timed ones from full to empty", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletSpeedBurst", "powerPelletScatterBurst", "passiveGhostSlow"],
    });
    expect(sim.hud().upgradeTimers).toEqual({});
    const events = chompPowerPellet(sim);
    const pulses = events.flatMap((event) => (event.type === "upgradePulse" ? event.ids : []));
    expect(pulses.sort()).toEqual(["powerPelletScatterBurst", "powerPelletSpeedBurst"]);
    expect(sim.hud().upgradeTimers.powerPelletSpeedBurst).toBe(1);
    expect(sim.hud().upgradeTimers.powerPelletScatterBurst).toBeUndefined();

    runFrames(sim, 30);
    const draining = sim.hud().upgradeTimers.powerPelletSpeedBurst!;
    expect(draining).toBeGreaterThan(0);
    expect(draining).toBeLessThan(1);
    expect(sim.snapshot().upgradePulses.count).toBe(1);

    runUntil(sim, () => sim.snapshot().timers.speedBurstMs === 0, 600);
    runFrames(sim, 1);
    expect(sim.hud().upgradeTimers).toEqual({});
  });

  it("pulses nothing when Shield Break holds power effects back at pickup", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveShieldBreak", "passiveShieldPellets", "powerPelletSpeedBurst"],
    });
    const events = chompPowerPellet(sim);
    expect(events.some((event) => event.type === "upgradePulse")).toBe(false);
    expect(sim.hud().upgradeTimers).toEqual({});
  });
});

describe("Reactive Armor", () => {
  function startArmorSim(enableUpgrades: PlayOptions["enableUpgrades"]): PlaySim {
    return startSim({ level: 2, maze: "maze1", enableUpgrades });
  }

  function chomp(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  function ghostPhase(sim: PlaySim, eid: number): string {
    return sim.snapshot().ghosts.find((g) => g.eid === eid)!.phase;
  }

  it("sends the contacting ghost home when a shield breaks", () => {
    const sim = startArmorSim(["passiveShieldPellets", "passiveReactiveArmor"]);
    chomp(sim);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    const contact = query(sim.world, [Ghost, Position])[0]!;
    const player = playerEid(sim);
    Position.x[contact] = Position.x[player]!;
    Position.y[contact] = Position.y[player]!;
    GhostPhase.value[contact] = GHOST_PHASE.active;
    const livesBefore = sim.snapshot().lives;
    runFrames(sim, 1);
    expect(sim.snapshot()).toMatchObject({
      dying: false,
      lives: livesBefore,
      deathsThisBoard: 0,
    });
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
    expect(sim.snapshot().lastReactiveArmorSent).toBe(1);
    expect(ghostPhase(sim, contact)).toBe("inHouse");
  });

  it("does not send the ghost home without Reactive Armor", () => {
    const sim = startArmorSim(["passiveShieldPellets"]);
    chomp(sim);
    const contact = query(sim.world, [Ghost, Position])[0]!;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().lastReactiveArmorSent).toBe(0);
    expect(ghostPhase(sim, contact)).not.toBe("inHouse");
  });

  it("Plus sends every nearby ghost home, not far ones", () => {
    const sim = startArmorSim(["passiveShieldPellets", "passiveReactiveArmorPlus"]);
    chomp(sim);
    const player = playerEid(sim);
    const ghosts = query(sim.world, [Ghost, Position]);
    expect(ghosts.length).toBeGreaterThanOrEqual(3);
    const [contact, near, far] = ghosts;
    const px = Position.x[player]!;
    const py = Position.y[player]!;
    Position.x[contact!] = px;
    Position.y[contact!] = py;
    GhostPhase.value[contact!] = GHOST_PHASE.active;
    Position.x[near!] = px + 2 * TILE_SIZE;
    Position.y[near!] = py;
    GhostPhase.value[near!] = GHOST_PHASE.active;
    Position.x[far!] = px + 6 * TILE_SIZE;
    Position.y[far!] = py;
    GhostPhase.value[far!] = GHOST_PHASE.active;
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().lastReactiveArmorSent).toBeGreaterThanOrEqual(2);
    expect(ghostPhase(sim, contact!)).toBe("inHouse");
    expect(ghostPhase(sim, near!)).toBe("inHouse");
    expect(ghostPhase(sim, far!)).not.toBe("inHouse");
  });

  it("fires on a Hyperspeed+ shield break", () => {
    const sim = startArmorSim(["powerPelletHyperspeedPlus", "passiveReactiveArmor"]);
    sim["runUpgrades"] = {
      ...sim["runUpgrades"],
      hyperspeedRemainingMs: 3000,
      hyperspeedShieldRemainingMs: 2000,
    };
    const contact = query(sim.world, [Ghost, Position])[0]!;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().timers.hyperspeedShieldMs).toBe(0);
    expect(ghostPhase(sim, contact)).toBe("inHouse");
  });

  it("does not fire when armed Defy Death keeps the shield", () => {
    const sim = startArmorSim(["passiveShieldPellets", "passiveReactiveArmor", "passiveDefyDeath"]);
    chomp(sim);
    expect(sim.snapshot().timers.defyDeathMs).toBeGreaterThan(0);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    const contact = query(sim.world, [Ghost, Position])[0]!;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    expect(ghostPhase(sim, contact)).not.toBe("inHouse");
  });
});

describe("PlaySim Trinkets", () => {
  const copies = (id: UpgradeId, n: number): UpgradeId[] => Array.from({ length: n }, () => id);
  const speedOf = (eid: number): number => Speed.px[eid]!;

  function activeGhost(sim: PlaySim, kind: GhostKindId): number {
    const eid = query(sim.world, [Ghost, GhostKind]).find((e) => GhostKind.kind[e] === kind)!;
    GhostPhase.value[eid] = GHOST_PHASE.active;
    Position.x[eid] = cellCenterX(13);
    Position.y[eid] = cellCenterY(11);
    return eid;
  }

  function playerSpeedAt(upgrades: UpgradeId[], col: number, row: number): number {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: upgrades });
    teleportPlayer(sim, cellCenterX(col), cellCenterY(row));
    runFrames(sim, 1);
    return speedOf(playerEid(sim));
  }

  function ghostSpeedOf(
    upgrades: UpgradeId[],
    kind: GhostKindId,
    at = { col: 13, row: 11 },
  ): number {
    const sim = startSim({ level: 2, maze: "maze1", roster: 0, enableUpgrades: upgrades });
    const eid = activeGhost(sim, kind);
    Position.x[eid] = cellCenterX(at.col);
    Position.y[eid] = cellCenterY(at.row);
    runFrames(sim, 1);
    return speedOf(eid);
  }

  it.each(TRINKET_IDS)("%s stacks up to the cap and no further", (id) => {
    const sim = startSim({
      level: 2,
      enableUpgrades: copies(id, TRINKET_MAX_COPIES + 3),
    });
    expect(sim.snapshot().upgrades.filter((owned) => owned === id)).toHaveLength(
      TRINKET_MAX_COPIES,
    );
  });

  it("Speed adds a flat share of Dot-Man's speed per copy", () => {
    const base = playerSpeedAt([], 13, 11);
    expect(playerSpeedAt(["lowSpeed"], 13, 11) / base).toBeCloseTo(1 + TRINKET_SPEED_ADD);
    expect(playerSpeedAt(copies("lowSpeed", 3), 13, 11) / base).toBeCloseTo(
      1 + 3 * TRINKET_SPEED_ADD,
    );
  });

  it("Tunnel Speed only speeds Dot-Man up inside a tunnel", () => {
    const tunnelRow = horizontalTunnelRows()[0]!;
    const base = playerSpeedAt([], 0, tunnelRow);
    expect(playerSpeedAt(copies("lowTunnelSpeed", 2), 0, tunnelRow) / base).toBeCloseTo(
      1 + 2 * TRINKET_TUNNEL_SPEED_ADD,
    );
    expect(playerSpeedAt(copies("lowTunnelSpeed", 2), 13, 11)).toBeCloseTo(
      playerSpeedAt([], 13, 11),
    );
  });

  it("Tunnel Vortex slows every ghost in a tunnel and none outside", () => {
    const tunnel = { col: 0, row: horizontalTunnelRows()[0]! };
    const base = ghostSpeedOf([], GHOST_KIND.blinky, tunnel);
    expect(
      ghostSpeedOf(copies("lowTunnelVortex", 2), GHOST_KIND.blinky, tunnel) / base,
    ).toBeCloseTo(1 - 2 * TRINKET_VORTEX_CUT);
    expect(ghostSpeedOf(copies("lowTunnelVortex", 2), GHOST_KIND.blinky)).toBeCloseTo(
      ghostSpeedOf([], GHOST_KIND.blinky),
    );
  });

  it("a ghost slowdown slows only the named ghost", () => {
    const base = ghostSpeedOf([], GHOST_KIND.blinky);
    expect(ghostSpeedOf(copies("lowSlowdownBlinky", 3), GHOST_KIND.blinky) / base).toBeCloseTo(
      1 - 3 * TRINKET_SLOWDOWN_CUT,
    );
    expect(ghostSpeedOf(copies("lowSlowdownBlinky", 3), GHOST_KIND.inky)).toBeCloseTo(
      ghostSpeedOf([], GHOST_KIND.inky),
    );
  });

  it("Traction widens the window Dot-Man can corner early in", () => {
    const turnedAfter = (upgrades: UpgradeId[]): boolean => {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: upgrades });
      const cx = cellCenterX(6);
      const cy = cellCenterY(5);
      const eid = playerEid(sim);
      teleportPlayer(sim, cellCenterX(7), cy);
      runUntil(sim, () => Position.x[eid]! <= cx + 12, 60, { keys: held("left") });
      teleportPlayer(sim, cx + 5, cy);
      runFrames(sim, 1, { keys: held("up") });
      return sim.snapshot().player!.facing === "up";
    };
    expect(turnedAfter([])).toBe(false);
    expect(turnedAfter(copies("lowTurning", 3))).toBe(true);
  });

  it("Ghost Traction drags only the named ghost for a moment after it turns", () => {
    const dragged = (upgrades: UpgradeId[], kind: GhostKindId): boolean => {
      const sim = startSim({ level: 2, maze: "maze1", roster: 0, enableUpgrades: upgrades });
      const eid = activeGhost(sim, kind);
      Facing.direction[eid] = DIRECTION.left;
      runFrames(sim, 1);
      const before = speedOf(eid);
      Facing.direction[eid] = DIRECTION.up;
      runFrames(sim, 1);
      return speedOf(eid) < before * (1 - TRINKET_TRACTION_CUT / 2);
    };
    expect(dragged(["lowTractionBlinky"], GHOST_KIND.blinky)).toBe(true);
    expect(dragged(["lowTractionBlinky"], GHOST_KIND.inky)).toBe(false);
    expect(dragged([], GHOST_KIND.blinky)).toBe(false);
  });

  it("a ghost house delay holds the named ghost in the house longer", () => {
    const releaseMs = (upgrades: UpgradeId[]): number => {
      const sim = startSim({ level: 2, maze: "maze1", roster: 0, enableUpgrades: upgrades });
      const blinky = query(sim.world, [Ghost, GhostKind]).find(
        (e) => GhostKind.kind[e] === GHOST_KIND.blinky,
      )!;
      let frames = 0;
      while (GhostPhase.value[blinky] === GHOST_PHASE.inHouse && frames < 2000) {
        runFrames(sim, 1, { keys: held("left") });
        frames += 1;
      }
      return frames * FRAME_MS;
    };
    const plain = releaseMs([]);
    const delayed = releaseMs(copies("lowHouseDelayBlinky", 2));
    expect(delayed - plain).toBeGreaterThanOrEqual(2 * TRINKET_HOUSE_DELAY_MS - 2 * FRAME_MS);
    expect(delayed - plain).toBeLessThanOrEqual(2 * TRINKET_HOUSE_DELAY_MS + 2 * FRAME_MS);
  });

  it("offers a ghost's upgrades only when the ghost is in the run's roster", () => {
    const rostered = GHOST_ROSTERS[0]!;
    const missing = (Object.values(GHOST_KIND) as GhostKindId[]).find(
      (kind) => !rostered.includes(kind),
    )!;
    const offered = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const sim = startSim({ jumpToUpgrade: true, level: 4, roster: 0 }, `roster-offer-${i}`);
      runFrames(sim, 90);
      for (const id of sim.offer()?.upgrades ?? []) {
        offered.add(id);
      }
    }
    expect([...offered].some((id) => isTrinketId(id))).toBe(true);
    const ghostName = Object.entries(GHOST_KIND).find(([, v]) => v === missing)![0];
    const suffix = ghostName.charAt(0).toUpperCase() + ghostName.slice(1);
    expect([...offered].filter((id) => id.endsWith(suffix) && isTrinketId(id))).toEqual([]);
  });

  it("taking an owned Trinket from an offer adds another copy", () => {
    const sim = startSim({ jumpToUpgrade: true, level: 4, enableUpgrades: ["lowSpeed"] });
    drainToOffer(sim);
    sim.chooseUpgrade({ kind: "upgrade", id: "lowSpeed" });
    expect(sim.snapshot().upgrades.filter((id) => id === "lowSpeed")).toHaveLength(2);
  });

  it("the cap keeps any Trinket out of the pool once it is reached", () => {
    const sim = startSim({ level: 4, jumpToUpgrade: true, enableUpgrades: MAXED_TRINKETS });
    runFrames(sim, 90);
    const offered = sim.offer()?.upgrades ?? [];
    expect(offered.filter((id) => isTrinketId(id))).toEqual([]);
  });
});

describe("Banana Trail", () => {
  function startBananaSim(enableUpgrades: PlayOptions["enableUpgrades"]): PlaySim {
    return startSim({ level: 2, maze: "maze1", enableUpgrades });
  }

  function chompPowerPellet(sim: PlaySim): void {
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
  }

  function ghostOntoPeel(sim: PlaySim): void {
    const peel = sim.snapshot().peels[0];
    expect(peel).toBeDefined();
    const ghost = query(sim.world, [Ghost, Position])[0]!;
    Position.x[ghost] = peel!.x;
    Position.y[ghost] = peel!.y;
    GhostPhase.value[ghost] = GHOST_PHASE.active;
  }

  it("banks a peel on power pellet pickup", () => {
    const sim = startBananaSim(["passiveBananaShield"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.peelsBanked).toBe(1);
    expect(sim.snapshot().peels).toHaveLength(1);
    expect(sim.renderOptions().peels).toHaveLength(1);
  });

  it("holds 1 peel, or 3 with Banana Trail+", () => {
    const base = startBananaSim(["passiveBananaShield"]);
    chompPowerPellet(base);
    chompPowerPellet(base);
    expect(base.snapshot().timers.peelsBanked).toBe(1);

    const plus = startBananaSim(["passiveBananaShieldPlus"]);
    for (let i = 0; i < 4; i += 1) {
      chompPowerPellet(plus);
    }
    expect(plus.snapshot().timers.peelsBanked).toBe(3);
    expect(plus.snapshot().peels).toHaveLength(3);
  });

  it("a ghost on a peel slips, bounces, and spends the peel without a death", () => {
    const sim = startBananaSim(["passiveBananaShield"]);
    chompPowerPellet(sim);
    const livesBefore = sim.snapshot().lives;
    ghostOntoPeel(sim);
    const events = runFrames(sim, 1);
    expect(sim.snapshot()).toMatchObject({
      dying: false,
      lives: livesBefore,
      deathsThisBoard: 0,
    });
    expect(sim.snapshot().timers.peelsBanked).toBe(0);
    expect(bounceIdle(sim)).toBe(false);
    expect(events).not.toContainEqual({ type: "sfx", id: "death" });
    expect(events.some((event) => event.type === "peelCrack")).toBe(true);
  });

  it("a peel slip bounces only the ghost — Dot-Man keeps control", () => {
    const sim = startBananaSim(["passiveBananaShield"]);
    chompPowerPellet(sim);
    const player = playerEid(sim);
    ghostOntoPeel(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().shieldBounce.player).toBeNull();
    expect(sim.snapshot().shieldBounce.ghosts.length).toBeGreaterThan(0);
    Facing.direction[player] = DIRECTION.right;
    Input.direction[player] = DIRECTION.right;
    runFrames(sim, 1, { keys: { ...NO_KEYS_HELD, left: 1 } });
    expect(Input.direction[player]).toBe(DIRECTION.left);
  });

  it("a body catch with peels still behind you is still a death", () => {
    const sim = startBananaSim(["passiveBananaShield"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.peelsBanked).toBe(1);
    const player = playerEid(sim);
    // Open corridor so the peel sits behind Dot-Man instead of snapping onto him.
    teleportPlayer(sim, cellCenterX(12), cellCenterY(1));
    Facing.direction[player] = DIRECTION.right;
    runFrames(sim, 2);
    const peel = sim.snapshot().peels[0]!;
    expect(Math.hypot(peel.x - Position.x[player]!, peel.y - Position.y[player]!)).toBeGreaterThan(
      playerRadius(),
    );
    const livesBefore = sim.snapshot().lives;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot()).toMatchObject({ dying: true, lives: livesBefore - 1 });
    expect(sim.snapshot().timers.peelsBanked).toBe(1);
  });

  it("slides peels through Dot-Man on reverse instead of jumping them to the new hook", () => {
    const sim = startBananaSim(["passiveBananaShieldPlus"]);
    for (let i = 0; i < 3; i += 1) {
      chompPowerPellet(sim);
    }
    expect(sim.snapshot().timers.peelsBanked).toBe(3);
    const player = playerEid(sim);
    teleportPlayer(sim, cellCenterX(12), cellCenterY(1));
    Facing.direction[player] = DIRECTION.right;
    runFrames(sim, 40, { keys: held("right") });
    const before = sim.snapshot().peels.map((peel) => ({ ...peel }));
    expect(before).toHaveLength(3);
    expect(before[0]!.x).toBeLessThan(Position.x[player]!);
    runFrames(sim, 1, { keys: held("left") });
    const after = sim.snapshot().peels;
    const hops = before.map((peel, i) => Math.hypot(after[i]!.x - peel.x, after[i]!.y - peel.y));
    expect(Math.max(...hops)).toBeLessThan(TILE_SIZE);
    for (let i = 0; i < 45; i += 1) {
      runFrames(sim, 1, { keys: held("left") });
    }
    const settled = sim.snapshot().peels[0]!;
    expect(settled.x).toBeGreaterThan(Position.x[player]!);
  });

  it("fires Shield Break when a peel slips", () => {
    const sim = startBananaSim([
      "passiveBananaShield",
      "passiveShieldBreak",
      "powerPelletSpeedBurst",
    ]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.speedBurstMs).toBe(0);
    ghostOntoPeel(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.peelsBanked).toBe(0);
    expect(sim.snapshot().timers.speedBurstMs).toBeGreaterThan(0);
  });

  it("empties peels on level advance", () => {
    const sim = startBananaSim(["passiveBananaShieldPlus"]);
    chompPowerPellet(sim);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.peelsBanked).toBe(2);
    sim["jumpToLevelClear"]();
    takeFirstOffered(sim);
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 500);
    expect(sim.snapshot().timers.peelsBanked).toBe(0);
    expect(sim.snapshot().peels).toEqual([]);
  });

  it("does nothing without the upgrade", () => {
    const sim = startBananaSim(["powerPelletInvuln"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.peelsBanked).toBe(0);
    expect(sim.snapshot().peels).toEqual([]);
  });
});

describe("PlaySim salvage", () => {
  const SIX: UpgradeId[] = [
    "powerPelletFreeze",
    "passiveAfterburner",
    "passiveGhostSlow",
    "powerPelletScatterBurst",
    "powerPelletGhostRecall",
    "powerPelletWarpFarthest",
  ];

  function slotIds(sim: PlaySim): UpgradeId[] {
    return sim.snapshot().upgrades.filter((id) => !isTrinketId(id));
  }

  function trinketIds(sim: PlaySim): UpgradeId[] {
    return sim.snapshot().upgrades.filter((id) => isTrinketId(id));
  }

  function offerAtCap(seed = "salvage"): { sim: PlaySim; picked: BaseUpgradeId } {
    const sim = startSim({ jumpToUpgrade: true, level: 4, enableUpgrades: SIX }, seed);
    const offer = drainToOffer(sim);
    const picked = offer.upgrades.find((id) => !isTrinketId(id))!;
    sim.chooseUpgrade({ kind: "upgrade", id: picked });
    return { sim, picked };
  }

  it("opens a prompt for a level-clear pick at 6 and freezes the sim", () => {
    const { sim, picked } = offerAtCap();
    expect(sim.snapshot().salvage).toMatchObject({ open: true, incoming: picked, slotCount: 6 });
    const before = sim.snapshot().timeRemaining;
    runFrames(sim, 30);
    expect(sim.snapshot().timeRemaining).toBe(before);
    expect(sim.snapshot().salvage.open).toBe(true);
  });

  it("salvaging the new card keeps the six and adds one Trinket", () => {
    const { sim } = offerAtCap();
    const events = sim.salvageNew();
    const gained = events.find((e) => e.type === "salvage");
    expect(gained).toMatchObject({ type: "salvage", quarters: 0 });
    expect(slotIds(sim)).toEqual(SIX);
    expect(trinketIds(sim)).toEqual([(gained as { gained: UpgradeId }).gained]);
    expect(sim.snapshot().salvage).toMatchObject({ open: false, trinketCount: 1 });
    expect(sim.runLogRecord().loadout.at(-1)).toMatchObject({ source: "salvage" });
  });

  it("salvaging an owned card keeps the new one", () => {
    const { sim, picked } = offerAtCap();
    sim.salvageReplace("passiveGhostSlow");
    expect(slotIds(sim)).toEqual([...SIX.filter((id) => id !== "passiveGhostSlow"), picked]);
    expect(trinketIds(sim)).toHaveLength(1);
    expect(
      sim.runLogRecord().loadout.find((entry) => entry.id === "passiveGhostSlow"),
    ).toMatchObject({ removedLevel: 4 });
  });

  it("refuses to salvage a Trinket or an unowned id at the prompt", () => {
    const { sim } = offerAtCap();
    expect(sim.salvageReplace("lowSpeed")).toEqual([]);
    expect(sim.salvageReplace("passiveExtraLife")).toEqual([]);
    expect(sim.snapshot().salvage.open).toBe(true);
  });

  it("salvagePick salvages the new card when it is picked, else the picked owned card", () => {
    const kept = offerAtCap();
    kept.sim.salvagePick(kept.picked);
    expect(slotIds(kept.sim)).toEqual(SIX);
    const swapped = offerAtCap();
    swapped.sim.salvagePick("passiveGhostSlow");
    expect(slotIds(swapped.sim)).toEqual([
      ...SIX.filter((id) => id !== "passiveGhostSlow"),
      swapped.picked,
    ]);
    expect(trinketIds(swapped.sim)).toHaveLength(1);
  });

  it("replays the same Trinket for the same seed", () => {
    const gained = ["a", "b"].map(() => {
      const { sim } = offerAtCap("salvage-seed");
      sim.salvageNew();
      return trinketIds(sim);
    });
    expect(gained[0]).toEqual(gained[1]);
  });

  it("keeps the life an Extra Life already paid", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      infiniteLives: false,
      lives: 2,
      maxLives: 6,
      enableUpgrades: ["passiveExtraLife"],
    });
    const lives = sim.snapshot().lives;
    sim.salvageOwned("passiveExtraLife");
    expect(sim.snapshot().lives).toBe(lives);
    expect(sim.snapshot().upgrades).not.toContain("passiveExtraLife");
  });

  it("salvages on demand under the cap and rejects a Trinket", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["lowSpeed", ...SIX.slice(0, 2)],
    });
    expect(sim.salvageOwned("lowSpeed")).toEqual([]);
    const events = sim.salvageOwned("passiveAfterburner");
    expect(events.some((e) => e.type === "salvage")).toBe(true);
    expect(slotIds(sim)).toEqual(["powerPelletFreeze"]);
    expect(trinketIds(sim)).toHaveLength(2);
  });

  it("clears a live freeze when Freeze is salvaged mid-level", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["powerPelletFreeze"] });
    sim["runUpgrades"] = { ...sim["runUpgrades"], freezeRemainingMs: 4000, frozenGhostEid: 5 };
    sim.salvageOwned("powerPelletFreeze");
    expect(sim["runUpgrades"]).toMatchObject({ freezeRemainingMs: 0, frozenGhostEid: null });
  });

  it("pays a Quarter, logged as salvage, when no Trinket is eligible", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      quarters: 0,
      enableUpgrades: ["powerPelletFreeze", ...MAXED_TRINKETS],
    });
    const events = sim.salvageOwned("powerPelletFreeze");
    expect(events).toContainEqual({ type: "salvage", gained: null, quarters: 1 });
    expect(sim.snapshot().quarters).toBe(1);
    expect(sim.runLogRecord().levels.at(-1)!.quartersEarned.salvage).toBe(1);
  });

  it("refuses on-demand salvage during a death sequence", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: ["powerPelletFreeze"] });
    sim["death"] = {} as never;
    expect(sim.salvageOwned("powerPelletFreeze")).toEqual([]);
    expect(sim.snapshot().salvage.canSalvage).toBe(false);
  });

  it("never prompts for the starting upgrade or debug flags past 6", () => {
    const sim = startSim({ maze: "mazeSmall", enableUpgrades: [...SIX, "passiveExtraLife"] });
    runFrames(sim, 5, { uiOpen: true });
    expect(slotIds(sim).length).toBeGreaterThanOrEqual(7);
    expect(sim.snapshot().salvage.open).toBe(false);
  });

  it("opens the prompt after a store U purchase at 6, with the Quarters spent", () => {
    const sim = startSim({ store: 1, level: 5, quarters: 10, enableUpgrades: SIX });
    const slot = sim
      .storeState()!
      .slots.find((cell) => cell.kind === "upgrade" && !isTrinketId(cell.id))!;
    if (slot.kind !== "upgrade") throw new Error("no upgrade tile");
    teleportPlayer(sim, cellCenterX(slot.col), cellCenterY(slot.row));
    runFrames(sim, 1);
    runFrames(sim, 1, { storeFocus: "yes" });
    runFrames(sim, 1, { storeConfirm: true });
    expect(sim.snapshot().quarters).toBeLessThan(10);
    expect(sim.snapshot().salvage).toMatchObject({
      open: true,
      incoming: slot.id,
    });
    expect(slotIds(sim)).toEqual(SIX);
    sim.salvageNew();
    expect(slotIds(sim)).toEqual(SIX);
    expect(trinketIds(sim)).toHaveLength(1);
  });

  it("grants a neutral slot win's Trinket at 6 without a prompt", () => {
    const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: SIX });
    sim["paySlotWin"]({ line: 0, symbol: "neutral" }, "pennyBar");
    expect(sim.snapshot().salvage.open).toBe(false);
    expect(slotIds(sim)).toEqual(SIX);
    expect(trinketIds(sim)).toHaveLength(1);
  });

  it("prompts for a neutral Overcharge win at 6, and pays a Quarter once the pool is empty", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      quarters: 0,
      enableUpgrades: [...SIX, ...MAXED_TRINKETS],
    });
    sim["paySlotWin"]({ line: 0, symbol: "neutral" }, "pennyBar");
    expect(sim.snapshot().salvage).toMatchObject({ open: true, incoming: "passiveOvercharge" });
    sim.salvageReplace("passiveGhostSlow");
    expect(sim.snapshot().upgrades).toContain("passiveOvercharge");
    sim["paySlotWin"]({ line: 0, symbol: "neutral" }, "pennyBar");
    expect(sim.snapshot().salvage.open).toBe(false);
    expect(sim.snapshot().quarters).toBe(2);
  });

  it("holds slot wins at 6 until the final grid is dismissed, one prompt per upgrade", () => {
    const sim = startSim(
      {
        level: 2,
        maze: "maze1",
        infiniteLives: true,
        pennyCharge: 299,
        slot: { quarters: 0, upgrades: 2, lives: 0 },
        enableUpgrades: SIX,
      },
      "salvage-slots",
    );
    sim["slotQueue"].push("pennyBar");
    runUntil(sim, () => sim.snapshot().slot.held, 900, { keys: held("left") });
    const won = sim.snapshot().slot.won!.filter((id) => !isTrinketId(id));
    expect(won).toHaveLength(2);
    expect(sim.snapshot().salvage).toMatchObject({ open: false, queued: won.length });
    runFrames(sim, 1, { acknowledge: true });
    expect(sim.snapshot().salvage.open).toBe(won.length > 0);
    for (const incoming of won) {
      expect(sim.snapshot().salvage.incoming).toBe(incoming);
      sim.salvageNew();
    }
    expect(sim.snapshot().salvage).toMatchObject({ open: false, queued: 0 });
    expect(new Set(won).size).toBe(won.length);
  });
});

describe("Martyr", () => {
  const LEFT = { keys: held("left") };

  function dieOnce(sim: PlaySim): void {
    runFrames(sim, 20, LEFT);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
  }

  it("fires owned power-pellet effects on a real death", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveMartyr", "powerPelletInvuln"],
    });
    dieOnce(sim);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(0);
  });

  it("base skips Defy Death saves; Plus fires on them", () => {
    const base = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveMartyr", "passiveDefyDeath", "powerPelletInvuln"],
    });
    const power = query(base.world, [PowerPellet, Position])[0]!;
    teleportPlayer(base, Position.x[power]!, Position.y[power]!);
    runFrames(base, 1);
    expect(base.snapshot().timers.defyDeathMs).toBeGreaterThan(0);
    const livesBefore = base.snapshot().lives;
    const invulnBefore = base.snapshot().timers.invulnMs;
    ghostOntoPlayer(base);
    runFrames(base, 1);
    expect(base.snapshot().lives).toBe(livesBefore);
    expect(base.snapshot().timers.invulnMs).toBeLessThanOrEqual(invulnBefore);

    const plus = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveMartyrPlus", "passiveDefyDeath", "powerPelletInvuln"],
    });
    const power2 = query(plus.world, [PowerPellet, Position])[0]!;
    teleportPlayer(plus, Position.x[power2]!, Position.y[power2]!);
    runFrames(plus, 1);
    ghostOntoPlayer(plus);
    runFrames(plus, 1);
    expect(plus.snapshot().timers.invulnMs).toBeGreaterThan(3000);
  });

  it("skips when infiniteLives is on", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      infiniteLives: true,
      enableUpgrades: ["passiveMartyr", "powerPelletInvuln"],
    });
    dieOnce(sim);
    expect(sim.snapshot().timers.invulnMs).toBe(0);
  });

  it("animates Scatter Burst's ghost glides through the death hold", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveMartyr", "powerPelletScatterBurst"],
    });
    runFrames(sim, 20, LEFT);
    ghostOntoPlayer(sim);
    const draws = runFrames(sim, 12).flatMap((e) => (e.type === "draw" ? [e.options] : []));
    expect(sim.snapshot().dying).toBe(true);
    expect(draws.some((d) => Object.keys(d.ghostWarpGlides ?? {}).length > 0)).toBe(true);
  });

  it("restores the life when Martyr clears the board on a would-be game over", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      lives: 1,
      enableUpgrades: ["passiveMartyr", "powerPelletExtraHungry"],
    });
    expect(sim.snapshot().lives).toBe(1);
    const eids = query(sim.world, [Pellet, Position]).filter(
      (eid) => !hasComponent(sim.world, eid, PowerPellet),
    );
    // Leave only Extra Hungry's bite so the Martyr fire clears the board.
    for (const eid of eids.slice(EXTRA_HUNGRY_COUNT)) {
      removeEntity(sim.world, eid);
      sim["pelletProgress"] = {
        ...sim["pelletProgress"],
        pelletsRemaining: Math.max(0, sim["pelletProgress"].pelletsRemaining - 1),
      };
    }
    runFrames(sim, 20, LEFT);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(false);
    expect(sim.snapshot().lives).toBe(1);
  });
});

describe("Possession", () => {
  const LEFT = { keys: held("left") };

  function startPossession(enableUpgrades: UpgradeId[]): PlaySim {
    return startSim({ level: 2, maze: "maze1", enableUpgrades });
  }

  function enterPossession(sim: PlaySim): number {
    runFrames(sim, 20, LEFT);
    const killer = query(sim.world, [Ghost, Position])[0]!;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().possessing).toBe(true);
    expect(sim.snapshot().timers.possessionMs).toBeGreaterThan(0);
    expect(sim.snapshot().dying).toBe(false);
    return killer;
  }

  it("refuses to salvage anything while a possession defers the death", () => {
    const sim = startPossession(["passivePossession", "powerPelletFreeze"]);
    enterPossession(sim);
    expect(sim.snapshot().salvage.canSalvage).toBe(false);
    expect(sim.salvageOwned("passivePossession")).toEqual([]);
    expect(sim.snapshot().possessing).toBe(true);
  });

  it("hides the player and marks the possessed ghost for the renderer", () => {
    const sim = startPossession(["passivePossession"]);
    expect(sim.renderOptions().playerAlpha).toBeUndefined();
    const killer = enterPossession(sim);
    const options = sim.renderOptions();
    expect(options.playerAlpha).toBe(0);
    expect(options.possessedGhostEid).toBe(killer);
  });

  it("possesses the catching ghost and frightens the others", () => {
    const sim = startPossession(["passivePossession"]);
    const killer = enterPossession(sim);
    expect(sim.snapshot().possessedGhost).toBe(ghostName(sim.world, killer));
    expect(sim.snapshot().frightenedGhosts.length).toBeGreaterThan(0);
    expect(sim.snapshot().frightenedGhosts).not.toContain(ghostName(sim.world, killer));
  });

  it("ends into the normal death hold, then respawns", () => {
    const sim = startPossession(["passivePossession"]);
    enterPossession(sim);
    runUntil(sim, () => sim.snapshot().dying === true, 400);
    expect(sim.snapshot().possessing).toBe(false);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().dying).toBe(false);
  });

  it("Possession+ haunts the steered ghost after the death hold", () => {
    const sim = startPossession(["passivePossessionPlus"]);
    const killer = enterPossession(sim);
    runUntil(sim, () => !sim.snapshot().dying && sim.snapshot().hauntedGhost !== null, 500);
    expect(sim.snapshot().hauntedGhost).toBe(ghostName(sim.world, killer));
    expect(sim.snapshot().timers.hauntMs).toBe(5000);
  });

  it("skips on lava and with infiniteLives", () => {
    const infinite = startSim({
      level: 2,
      maze: "maze1",
      infiniteLives: true,
      enableUpgrades: ["passivePossession"],
    });
    runFrames(infinite, 20, LEFT);
    ghostOntoPlayer(infinite);
    runFrames(infinite, 1);
    expect(infinite.snapshot().possessing).toBe(false);
    expect(infinite.snapshot().dying).toBe(true);
  });

  it("eats regular pellets without growing the streak", () => {
    const sim = startPossession(["passivePossession"]);
    const killer = enterPossession(sim);
    const before = sim.snapshot().boardCollected;
    const streakBefore = sim.snapshot().pennies?.streak ?? 0;
    const pellet = query(sim.world, [Pellet, Position]).find(
      (eid) => !hasComponent(sim.world, eid, PowerPellet),
    )!;
    Position.x[killer] = Position.x[pellet]!;
    Position.y[killer] = Position.y[pellet]!;
    runFrames(sim, 1);
    expect(sim.snapshot().boardCollected).toBeGreaterThan(before);
    expect(sim.snapshot().pennies?.streak ?? 0).toBe(streakBefore);
  });
});

describe("Tunnel Boring", () => {
  function start(enableUpgrades: UpgradeId[] = ["passiveTunnelBoring"]): PlaySim {
    return startSim({ level: 2, maze: "maze1", godMode: true, enableUpgrades });
  }

  function boreSpot(minSteps = 1): {
    col: number;
    row: number;
    dx: number;
    dy: number;
    dir: "left" | "right" | "up" | "down";
  } {
    const layout = getActiveLayout();
    const dirs = [
      { dx: 1, dy: 0, dir: "right" as const },
      { dx: -1, dy: 0, dir: "left" as const },
      { dx: 0, dy: 1, dir: "down" as const },
      { dx: 0, dy: -1, dir: "up" as const },
    ];
    for (let row = 1; row < layout.rows - 1; row += 1) {
      for (let col = 1; col < layout.cols - 1; col += 1) {
        if (!isWalkable(col, row)) {
          continue;
        }
        for (const step of dirs) {
          const target = { col: col + step.dx, row: row + step.dy };
          if (
            !isWalkable(target.col, target.row) &&
            !layout.house[target.row]?.[target.col] &&
            !layout.door[target.row]?.[target.col]
          ) {
            const nearHouse = [
              [0, -1],
              [0, 1],
              [-1, 0],
              [1, 0],
            ].some(
              ([dx, dy]) =>
                layout.house[target.row + dy!]?.[target.col + dx!] ||
                layout.door[target.row + dy!]?.[target.col + dx!],
            );
            const cells = nearHouse ? null : tunnelBoringCells(col, row, step.dx, step.dy);
            if (cells !== null && boreSteps(cells).length >= minSteps) {
              return { col, row, ...step };
            }
          }
        }
      }
    }
    throw new Error("no bore spot");
  }

  function pressBore(sim: PlaySim, spot = boreSpot()): MazeTile[] {
    const expected = tunnelBoringCells(spot.col, spot.row, spot.dx, spot.dy)!;
    const eid = playerEid(sim);
    teleportPlayer(sim, cellCenterX(spot.col), cellCenterY(spot.row));
    Facing.direction[eid] = DIRECTION.none;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    runFrames(sim, 1, { keys: held(spot.dir) });
    return expected;
  }

  it("keeps bored walls open on a board with a sinkhole", () => {
    const sim = startSim({ level: 6, godMode: true, enableUpgrades: ["passiveTunnelBoring"] });
    expect(sim.snapshot().sinkhole.cells).not.toBeNull();
    const bored = pressBore(sim);
    runFrames(sim, 120);
    const layout = getActiveLayout();
    for (const cell of bored) {
      expect(isWalkable(cell.col, cell.row, layout.playerSolids), `${cell.col},${cell.row}`).toBe(
        true,
      );
    }
    for (const cell of sim.snapshot().sinkhole.cells!) {
      expect(isWalkable(cell.col, cell.row, layout.playerSolids), `${cell.col},${cell.row}`).toBe(
        false,
      );
    }
  });

  it("needs a fresh press at rest: a held key never bores until released and re-pressed", () => {
    const sim = start();
    const spot = boreSpot();
    const eid = playerEid(sim);
    const rest = () => {
      teleportPlayer(sim, cellCenterX(spot.col), cellCenterY(spot.row));
      Facing.direction[eid] = DIRECTION.none;
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
    };
    Facing.direction[eid] = DIRECTION.up;
    runFrames(sim, 1, { keys: held(spot.dir) });
    rest();
    runFrames(sim, 5, { keys: held(spot.dir) });
    expect(sim.snapshot().tunnelBoring.cells).toHaveLength(0);
    runFrames(sim, 1, { keys: NO_KEYS_HELD });
    rest();
    runFrames(sim, 1, { keys: held(spot.dir) });
    expect(sim.snapshot().tunnelBoring.cells.length).toBeGreaterThan(0);
  });

  it("does not bore a wall that would leave a single-line wall", () => {
    const sim = start();
    const layout = getActiveLayout();
    const eid = playerEid(sim);
    const dirs = [
      { dx: 1, dy: 0, dir: "right" as const },
      { dx: -1, dy: 0, dir: "left" as const },
      { dx: 0, dy: 1, dir: "down" as const },
      { dx: 0, dy: -1, dir: "up" as const },
    ];
    let thin: { col: number; row: number; dir: "left" | "right" | "up" | "down" } | null = null;
    for (let row = 1; row < layout.rows - 1 && thin === null; row += 1) {
      for (let col = 1; col < layout.cols - 1 && thin === null; col += 1) {
        for (const step of dirs) {
          const tc = col + step.dx;
          const tr = row + step.dy;
          if (
            isWalkable(col, row) &&
            !isWalkable(tc, tr) &&
            layout.ascii.split("\n")[tr]?.[tc] === "#" &&
            tunnelBoringCells(col, row, step.dx, step.dy) === null
          ) {
            thin = { col, row, dir: step.dir };
            break;
          }
        }
      }
    }
    expect(thin).not.toBeNull();
    teleportPlayer(sim, cellCenterX(thin!.col), cellCenterY(thin!.row));
    Facing.direction[eid] = DIRECTION.none;
    runFrames(sim, 1, { keys: held(thin!.dir) });
    expect(sim.snapshot().tunnelBoring.charges).toBe(1);
    expect(sim.snapshot().tunnelBoring.cells).toHaveLength(0);
  });

  it("does nothing without the upgrade", () => {
    const sim = start([]);
    const spot = boreSpot();
    expect(isWalkable(spot.col + spot.dx, spot.row + spot.dy)).toBe(false);
    const eid = playerEid(sim);
    teleportPlayer(sim, cellCenterX(spot.col), cellCenterY(spot.row));
    Facing.direction[eid] = DIRECTION.none;
    runFrames(sim, 1, { keys: held(spot.dir) });
    expect(isWalkable(spot.col + spot.dx, spot.row + spot.dy)).toBe(false);
    expect(sim.snapshot().tunnelBoring).toEqual({
      charges: 0,
      cells: [],
      openCells: 0,
      junkCells: 0,
      slowed: false,
    });
  });

  it("a press spends the charge and opens only the first tile; the rest digs open tile by tile", () => {
    const sim = start();
    expect(sim.snapshot().tunnelBoring.charges).toBe(1);
    const spot = boreSpot(3);
    const cells = pressBore(sim, spot);
    const steps = boreSteps(cells);
    expect(sim.snapshot().tunnelBoring).toMatchObject({
      charges: 0,
      cells,
      openCells: steps[0]!.length,
      junkCells: steps[0]!.length,
    });
    expect(steps[0]!.every((cell) => isWalkable(cell.col, cell.row))).toBe(true);
    expect(
      steps
        .slice(1)
        .flat()
        .some((cell) => isWalkable(cell.col, cell.row)),
    ).toBe(false);
    const seen = new Set<number>();
    for (
      let frame = 0;
      frame < 240 && sim.snapshot().tunnelBoring.openCells < cells.length;
      frame += 1
    ) {
      runFrames(sim, 1, { keys: held(spot.dir) });
      seen.add(sim.snapshot().tunnelBoring.openCells);
    }
    const boundaries = steps.map((_, i) => steps.slice(0, i + 1).flat().length);
    expect([...seen].sort((a, b) => a - b)).toEqual(boundaries);
    for (const cell of cells) {
      expect(isWalkable(cell.col, cell.row)).toBe(true);
    }
    expect(sim.snapshot().tunnelBoring.junkCells).toBe(cells.length);
    pressBore(sim);
    expect(sim.snapshot().tunnelBoring.cells).toEqual(cells);
  });

  it("slows Dot-Man 25% while he is inside the bore, and not after he leaves it", () => {
    const sim = start();
    const spot = boreSpot(3);
    const cells = pressBore(sim, spot);
    const eid = playerEid(sim);
    const inBore = (): boolean =>
      cells.some(
        (cell) =>
          cell.col === worldToCol(Position.x[eid]!) && cell.row === worldToRow(Position.y[eid]!),
      );
    const frames: { inside: boolean; speed: number; slowed: boolean }[] = [];
    for (let frame = 0; frame < 300; frame += 1) {
      const inside = inBore();
      runFrames(sim, 1, { keys: held(spot.dir) });
      frames.push({ inside, speed: Speed.px[eid]!, slowed: sim.snapshot().tunnelBoring.slowed });
      if (frames.some((f) => f.inside) && !inside) {
        break;
      }
    }
    const full = PLAYER_SPEED * speedLevelMultiplier(sim["levelIndex"]);
    const exit = frames.length - 1;
    expect(frames[exit - 1]!.inside).toBe(true);
    expect(Math.max(...frames.filter((f) => f.inside).map((f) => f.speed))).toBeCloseTo(
      full * TUNNEL_BORING_SPEED_MUL,
      6,
    );
    expect(frames[0]!.speed).toBeGreaterThan(full * TUNNEL_BORING_SPEED_MUL);
    expect(frames[exit]!.slowed).toBe(false);
    expect(sim["tunnelBore"].progress).toBeNull();
  });

  it("keeps digging on its timer when Dot-Man backs away, and never slows him outside it", () => {
    const sim = start();
    const spot = boreSpot(3);
    const cells = pressBore(sim, spot);
    const back = ({ left: "right", right: "left", up: "down", down: "up" } as const)[spot.dir];
    runFrames(sim, 1, { keys: NO_KEYS_HELD });
    const steps = boreSteps(cells).length;
    runFrames(sim, Math.ceil((steps * TUNNEL_BORE_STEP_MS) / FRAME_MS), { keys: held(back) });
    expect(sim.snapshot().tunnelBoring).toMatchObject({
      openCells: cells.length,
      junkCells: cells.length,
      slowed: false,
    });
    expect(sim["tunnelBore"].progress).toBeNull();
  });

  it("press-through adopts facing into the opened cell", () => {
    const sim = start();
    const spot = boreSpot();
    const eid = playerEid(sim);
    teleportPlayer(sim, cellCenterX(spot.col), cellCenterY(spot.row));
    Facing.direction[eid] = DIRECTION.none;
    runFrames(sim, 8, { keys: held(spot.dir) });
    expect(sim.snapshot().tunnelBoring.cells).toContainEqual({
      col: spot.col + spot.dx,
      row: spot.row + spot.dy,
    });
    const at = { col: worldToCol(Position.x[eid]!), row: worldToRow(Position.y[eid]!) };
    expect([
      { col: spot.col, row: spot.row },
      { col: spot.col + spot.dx, row: spot.row + spot.dy },
    ]).toContainEqual(at);
  });

  it("Plus recharges on power pellet pickup", () => {
    const sim = start(["passiveTunnelBoringPlus"]);
    pressBore(sim);
    expect(sim.snapshot().tunnelBoring.charges).toBe(0);
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    expect(sim.snapshot().tunnelBoring.charges).toBe(1);
  });

  it("base form does not recharge on power pellet pickup", () => {
    const sim = start(["passiveTunnelBoring"]);
    pressBore(sim);
    expect(sim.snapshot().tunnelBoring.charges).toBe(0);
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    expect(sim.snapshot().tunnelBoring.charges).toBe(0);
  });

  it("keeps the whole bore, even mid-dig, on the next board with the same map, but not its junk", () => {
    const sim = startSim(
      {
        level: 2,
        godMode: true,
        enableUpgrades: ["passiveTunnelBoring"],
        levelModifiers: false,
      },
      "tunnelPersist",
    );
    expect(sim.snapshot().layout.startsWith("pool-")).toBe(true);
    const cells = pressBore(sim, boreSpot(2));
    expect(sim.snapshot().tunnelBoring.cells).toEqual(cells);
    expect(sim.snapshot().tunnelBoring.openCells).toBeLessThan(cells.length);
    const mapKey = sim.snapshot().layout;
    sim["levelIndex"] = 3;
    sim["startBoard"](null);
    expect(sim.snapshot().layout).toBe(mapKey);
    expect(sim.snapshot().tunnelBoring).toMatchObject({
      cells,
      openCells: cells.length,
      junkCells: 0,
      charges: 1,
    });
    expect(sim.renderOptions().boreJunk).toEqual([]);
    for (const cell of cells) {
      expect(isWalkable(cell.col, cell.row)).toBe(true);
    }
  });
});

describe("Floating", () => {
  const framesFor = (ms: number): number => Math.ceil(ms / FRAME_MS);

  function lavaSim(enableUpgrades: PlayOptions["enableUpgrades"]): PlaySim {
    const sim = startSim(
      { level: 8, maze: "maze1", infiniteLives: true, enableUpgrades },
      "floating-lava",
    );
    for (const eid of query(sim.world, [Ghost])) {
      removeEntity(sim.world, eid);
    }
    runFrames(sim, 1, { keys: held("left") });
    return sim;
  }

  function standInFullLava(sim: PlaySim): void {
    const { col, row } = sim.snapshot().lava!;
    const spawn = getActiveLayout().playerSpawn;
    teleportPlayer(sim, cellCenterX(spawn.col), cellCenterY(spawn.row));
    runUntil(sim, () => sim.snapshot().lava!.phase === "full", framesFor(15_000));
    teleportPlayer(sim, cellCenterX(col), cellCenterY(row));
    runFrames(sim, 10);
  }

  it.each(["passiveFloating", "passiveFloatingPlus"] as const)(
    "%s lets Dot-Man stand in full lava",
    (id) => {
      const sim = lavaSim([id]);
      standInFullLava(sim);
      expect(sim.snapshot().dying).toBe(false);
    },
  );

  it("kills Dot-Man in full lava without it", () => {
    const sim = lavaSim([]);
    standInFullLava(sim);
    expect(sim.snapshot().dying).toBe(true);
  });

  function laneRun(
    enableUpgrades: PlayOptions["enableUpgrades"],
    side: "fast" | "slow",
  ): { speed: number; effect: string | null } {
    const sim = startSim({ level: 6, infiniteLives: true, enableUpgrades }, "zones");
    const zone = settledZones(sim)[0]!;
    const cell = speedZoneCells(zone)[Math.floor(zone.length / 2)]!;
    const opposite = { up: "down", down: "up", left: "right", right: "left" } as const;
    const dir = side === "fast" ? zone.fastDir : opposite[zone.fastDir];
    const player = playerEid(sim);
    for (let frame = 0; frame < 2; frame += 1) {
      sim["eatDragMs"] = 0;
      Position.x[player] = cellCenterX(cell.col);
      Position.y[player] = cellCenterY(cell.row);
      runFrames(sim, 1, { keys: held(dir) });
    }
    return { speed: Speed.px[player]!, effect: sim.snapshot().playerSpeedZone };
  }

  it("slows the slow side of a speed zone at base and not when enhanced", () => {
    const none = laneRun([], "slow");
    const plus = laneRun(["passiveFloatingPlus"], "slow");
    expect(none.effect).toBe("slow");
    expect(laneRun(["passiveFloating"], "slow")).toEqual(none);
    expect(plus.effect).toBeNull();
    expect(plus.speed).toBeCloseTo(none.speed / SLOW_ZONE_MULTIPLIER);
  });

  it("keeps the fast side boost when enhanced", () => {
    expect(laneRun(["passiveFloatingPlus"], "fast").effect).toBe("fast");
  });
});
