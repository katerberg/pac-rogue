import { hasComponent, query, removeEntity } from "bitecs";
import { describe, expect, it } from "vitest";
import { FRUIT_FLICKER_MS, FRUIT_LIFETIME_MS } from "../../domain/fruit";
import { ghostTeleportCell, scatterTargetForKind } from "../../domain/ghostCorner";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { CHAIN_PAIR } from "../../domain/bossRules";
import {
  BOSS_STAGE_BLACK_HOLD_MS,
  BOSS_STAGE_ENTITY_FADE_MS,
  BOSS_STAGE_FLICKER_MS,
  BOSS_STAGE_TOTAL_MS,
} from "../../domain/bossStageTransition";
import {
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  clampToGridCenters,
  getActiveLayout,
  ghostHouseSpawnCenter,
  horizontalTunnelRows,
  isAlignedForTurn,
  isWalkable,
  MAZE_OFFSET_X,
  MAZE_PIXEL_WIDTH,
  playerFarthestFromGhostsSpawn,
  TILE_SIZE,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { speedLevelMultiplier } from "../../domain/levelRules";
import { STORE_MAZE_ASCII } from "../../domain/mazeLayouts";
import { defaultPlayOptions, parsePlayOptions, type PlayOptions } from "../../domain/playOptions";
import {
  BLINKY_DRAWABLE_ID,
  CLYDE_DRAWABLE_ID,
  ghostRadius,
  INKY_DRAWABLE_ID,
  PINKY_DRAWABLE_ID,
  PLAYER_DRAWABLE_ID,
  PLAYER_SPEED,
  playerRadius,
} from "../../domain/playfield";
import { PLAYER_INVULN_TINT, brightenColor, playerTint } from "../../domain/playerTint";
import { parseStoreSlots } from "../../domain/store";
import { DEFAULT_TUNING, resolveTuning, type Tuning } from "../../domain/tuning";
import { turnFlashPulse } from "../../domain/turnTuning";
import { WARP_GLIDE_MS } from "../../domain/warpGlide";
import { levelScaledDurationMs } from "../../domain/levelScaledDuration";
import {
  DEFY_DEATH_MS,
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
  STARTING_UPGRADE_POOL,
  ALL_UPGRADE_IDS,
  STORE_RARE_UPGRADE_PRICE,
  WALL_PASS_MS,
  isRare,
  type BaseUpgradeId,
  type UpgradeChoiceOffer,
  type UpgradeId,
} from "../../domain/upgrades";
import { ECHO_DELAY_MS } from "../../domain/echo";
import { lazyLooperRequiredCells } from "../../domain/lazyLooper";
import { BossGhost } from "../components/BossGhost";
import { BossPellet } from "../components/BossPellet";
import { ChainedGhost } from "../components/ChainedGhost";
import { Fruit } from "../components/Fruit";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GHOST_PHASE, GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { OptionalPellet } from "../components/OptionalPellet";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { PlaySim, RUN_END_MENU_ARM_MS } from "./playSim";
import { catchPlayer } from "../systems/catchPlayer";
import { Drawable } from "../components/Drawable";
import { ghostName } from "./runRecorder";
import type { SimEvent } from "./simEvents";
import { NO_KEYS_HELD } from "../systems/heldKeys";
import { convertPelletToPower } from "../systems/pelletToPower";
import { FRAME_MS, held, runFrames, runUntil } from "./simTesting";

const BOSS_STAGE_WAIT_FRAMES = Math.ceil(BOSS_STAGE_TOTAL_MS / FRAME_MS) + 30;

function startSim(overrides: Partial<PlayOptions>, seed = "test"): PlaySim {
  const sim = new PlaySim({ ...defaultPlayOptions(), ...overrides }, seed);
  sim.start();
  return sim;
}

function playerEid(sim: PlaySim): number {
  return query(sim.world, [Player, Position])[0]!;
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

function drainToOffer(sim: PlaySim): UpgradeChoiceOffer {
  runUntil(sim, () => sim.offer() !== null, 90);
  return sim.offer()!;
}

function regularPelletEids(sim: PlaySim): number[] {
  return Array.from(query(sim.world, [Pellet, Position])).filter(
    (eid) => !hasComponent(sim.world, eid, PowerPellet),
  );
}

function eatPelletAt(sim: PlaySim, eid: number): void {
  teleportPlayer(sim, Position.x[eid]!, Position.y[eid]!);
  runFrames(sim, 1);
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
    runFrames(sim, framesFor(FRUIT_LIFETIME_MS - 1_000));
    const { fruitRemainingMs } = sim.renderOptions();
    expect(fruitRemainingMs).toBeLessThanOrEqual(FRUIT_FLICKER_MS);
    expect(fruitRemainingMs).toBeGreaterThan(0);
    expect(sim.snapshot().timers.fruitMs).toBe(fruitRemainingMs);
    runFrames(sim, framesFor(1_500));
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
  function speedRatios(id: UpgradeId | null): { empty: number; pellet: number } {
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

  it("speeds up entering a cell without a pellet and slows entering one with a pellet", () => {
    const ratios = speedRatios("passiveAfterburner");
    expect(ratios.pellet).toBeCloseTo(0.9);
    expect(ratios.empty).toBeCloseTo(1.3);
  });

  it("Afterburner+ gives +50% and keeps the 10% pellet-cell slowdown", () => {
    const ratios = speedRatios("passiveAfterburnerPlus");
    expect(ratios.pellet).toBeCloseTo(0.9);
    expect(ratios.empty).toBeCloseTo(1.5);
  });

  it("changes nothing without the upgrade", () => {
    const ratios = speedRatios(null);
    expect(ratios.empty).toBeCloseTo(1);
    expect(ratios.pellet).toBeCloseTo(1);
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
    [6, 1.05],
    [8, 1.1],
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

  it("Tunnel Dash+ slows ghosts to 0.3x in the tunnel; base Tunnel Dash keeps 0.6x", () => {
    for (const [id, ratio] of [
      ["passiveTunnelDash", 0.6],
      ["passiveTunnelDashPlus", 0.3],
    ] as const) {
      const sim = startSim({ level: 2, maze: "maze1", enableUpgrades: [id] });
      const ghost = query(sim.world, [Ghost, Position])[0]!;
      GhostPhase.value[ghost] = GHOST_PHASE.active;
      Position.x[ghost] = cellCenterX(0);
      Position.y[ghost] = cellCenterY(horizontalTunnelRows()[0]!);
      runFrames(sim, 1);
      expect(Speed.px[ghost]! / Speed.px[playerEid(sim)]!).toBeCloseTo(ratio);
    }
  });

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

  it("collects pellets while the player moves", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    const events = runFrames(sim, 60, { keys: held("left") });
    expect(sim.snapshot().boardCollected).toBeGreaterThan(0);
    expect(count(events, "pelletSfx")).toBeGreaterThan(0);
  });

  describe("pelletAbsorb", () => {
    it("emits absorb for neon regular pellets Dot-Man eats", () => {
      const sim = startSim({ level: 2, maze: "maze1" }, "absorb-neon");
      sim.setGhostStyle("neon");
      const events = runFrames(sim, 60, { keys: held("left") });
      const absorbs = events.filter((event) => event.type === "pelletAbsorb");
      expect(absorbs.length).toBeGreaterThan(0);
      expect(absorbs[0]).toMatchObject({ type: "pelletAbsorb" });
      expect(typeof absorbs[0]!.x).toBe("number");
      expect(typeof absorbs[0]!.y).toBe("number");
      expect(absorbs[0]!.radius).toBeGreaterThan(0);
    });

    it("skips absorb under pixel style", () => {
      const sim = startSim({ level: 2, maze: "maze1" }, "absorb-pixel");
      sim.setGhostStyle("pixel");
      const events = runFrames(sim, 60, { keys: held("left") });
      expect(sim.snapshot().boardCollected).toBeGreaterThan(0);
      expect(events.some((event) => event.type === "pelletAbsorb")).toBe(false);
    });

    it("skips absorb when the Absorb FX knob is off", () => {
      const sim = new PlaySim(
        { ...defaultPlayOptions(), level: 2, maze: "maze1" },
        "absorb-off",
        resolveTuning({ pelletAbsorbEnabled: false }),
      );
      sim.start();
      sim.setGhostStyle("neon");
      const events = runFrames(sim, 60, { keys: held("left") });
      expect(sim.snapshot().boardCollected).toBeGreaterThan(0);
      expect(events.some((event) => event.type === "pelletAbsorb")).toBe(false);
    });

    it("does not absorb power pellets", () => {
      const sim = startSim({ level: 2, maze: "maze1" }, "absorb-power");
      sim.setGhostStyle("neon");
      for (const eid of query(sim.world, [Pellet])) {
        if (!hasComponent(sim.world, eid, PowerPellet)) {
          removeEntity(sim.world, eid);
        }
      }
      const power = query(sim.world, [PowerPellet, Position])[0]!;
      teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
      const events = runFrames(sim, 2);
      expect(events.some((event) => event.type === "pelletAbsorb")).toBe(false);
      expect(count(events, "releaseDrawable")).toBeGreaterThan(0);
    });
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

  it("draws the level-1 starting upgrade only from the starting pool", () => {
    const opts = { ...defaultPlayOptions(), maze: "mazeSmall" as const };
    const allButOne = STARTING_UPGRADE_POOL.slice(1);
    const sim = new PlaySim({ ...opts, enableUpgrades: [...allButOne] }, "test");
    sim.start();
    expect(sim.snapshot().upgrades).toEqual([...allButOne, STARTING_UPGRADE_POOL[0]]);

    const full = new PlaySim({ ...opts, enableUpgrades: [...STARTING_UPGRADE_POOL] }, "test");
    expect(count(full.start(), "startingUpgrade")).toBe(0);
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

  it("level-clear offer stays valid when owned upgrades give school affinity", () => {
    const owned = ["passiveExtraLife", "passiveDeathsHarvest", "passiveDefyDeath"] as const;
    const sim = startSim({
      jumpToUpgrade: true,
      level: 4,
      enableUpgrades: [...owned],
    });
    const offer = drainToOffer(sim);
    expect(offer.upgrades).toHaveLength(3);
    expect(new Set(offer.upgrades).size).toBe(3);
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
          forceUpgrade: "passiveMartyr",
        }),
      ).upgrades;
    expect(offer(["passiveGhostSlow"]).filter(isRare)).toEqual([]);
    expect(offer(["passiveGhostSlow", "passiveAfterburner"])).toContain("passiveMartyr");
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
    runUntil(sim, () => !sim.snapshot().levelTransition, 120);
    expect(sim.snapshot().level).toBe(3);
    expect(sim.snapshot().upgrades).toContain(chosen);
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
    runUntil(sim, () => sim.offer() !== null, 90);
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
  });

  it.each([
    [false, 1],
    [true, 0],
  ])("saves a high score on Game Over unless debug flags are on (%s)", (disabled, saves) => {
    const sim = startSim({ level: 2, maze: "maze1", highScoresDisabled: disabled });
    const events: SimEvent[] = [];
    for (let life = 0; life < 10 && !events.some((e) => e.type === "goToMenu"); life += 1) {
      ghostOntoPlayer(sim);
      events.push(...runFrames(sim, 1));
      events.push(
        ...runUntil(
          sim,
          () => !sim.snapshot().dying || events.some((e) => e.type === "goToMenu"),
          400,
        ),
      );
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
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 240);
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
    const events = runUntil(sim, () => sim.offer() !== null, 90);
    expect(events).not.toContainEqual({ type: "lives", pulse: true });
    expect(sim.snapshot().lives).toBe(1);
  });

  it("Myogenesis regenerates one life before the upgrade offer", () => {
    const sim = startSim({ jumpToUpgrade: true, enableUpgrades: ["passiveMyogenesis"] });
    (sim as unknown as { lives: number }).lives = 1;
    const events = runUntil(sim, () => sim.offer() !== null, 90);
    expect(events).toContainEqual({ type: "lives", pulse: true });
    expect(sim.snapshot().lives).toBe(2);
  });

  it("regenerates one life on store entry", () => {
    const fresh = new PlaySim(
      { ...defaultPlayOptions(), store: 1, lives: 2, maxLives: 4, quarters: 10 },
      "test",
    );
    expect(fresh.start()).toContainEqual({ type: "lives", pulse: true });
    expect(fresh.snapshot().lives).toBe(3);
    expect(startSim({ store: 1, lives: 4, maxLives: 4, quarters: 10 }).snapshot().lives).toBe(4);
  });

  it("stacks Myogenesis level regen with store-entry regen", () => {
    const stacked = startSim({
      jumpToUpgrade: true,
      level: 3,
      enableUpgrades: ["passiveMyogenesis"],
      lives: 1,
      maxLives: 4,
    });
    (stacked as unknown as { lives: number }).lives = 1;
    stacked.chooseUpgrade({ kind: "upgrade", id: drainToOffer(stacked).upgrades[0]! });
    runUntil(stacked, () => stacked.snapshot().inStore, 240);
    expect(stacked.snapshot().lives).toBe(3);

    const natural = startSim({
      jumpToUpgrade: true,
      level: 3,
      enableUpgrades: [],
      lives: 1,
      maxLives: 4,
    });
    (natural as unknown as { lives: number }).lives = 1;
    natural.chooseUpgrade({ kind: "upgrade", id: drainToOffer(natural).upgrades[0]! });
    runUntil(natural, () => natural.snapshot().inStore, 240);
    expect(natural.snapshot().lives).toBe(2);
  });

  it("buys a life at the store", () => {
    const sim = startSim({ store: 1, lives: 2, maxLives: 4, quarters: 10 });
    const life = parseStoreSlots(STORE_MAZE_ASCII).find((slot) => slot.kind === "life")!;
    const before = sim.snapshot();
    teleportPlayer(sim, cellCenterX(life.col), cellCenterY(life.row));
    runFrames(sim, 1);
    runFrames(sim, 1, { storeToggle: true });
    const events = runFrames(sim, 1, { storeConfirm: true });
    expect(sim.snapshot().quarters).toBeLessThan(before.quarters);
    expect(sim.snapshot().lives).toBe(before.lives + 1);
    expect(events).toContainEqual({ type: "lives", pulse: true });
  });

  describe("Money Talks", () => {
    function getCaught(sim: PlaySim): SimEvent[] {
      ghostOntoPlayer(sim);
      return runFrames(sim, 1);
    }

    function toLastLife(sim: PlaySim): void {
      for (let i = 0; i < 10 && sim.snapshot().lives > 1; i += 1) {
        getCaught(sim);
        runUntil(sim, () => !sim.snapshot().dying, 240);
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

    it("keeps a Death's Bounty Quarter paid during the save", () => {
      const sim = moneySim({
        enableUpgrades: ["passiveMoneyTalks", "passiveDeathsBounty"],
        quarters: 3,
        bonus: 68,
      });
      const before = sim.snapshot().quarters;
      getCaught(sim);
      runUntil(sim, () => !sim.snapshot().dying, 240);
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
    function buy(sim: PlaySim, kind: "life" | "upgrade" | "swap" | "enhance", nth = 0): SimEvent[] {
      const slot = parseStoreSlots(STORE_MAZE_ASCII).filter((cell) => cell.kind === kind)[nth]!;
      teleportPlayer(sim, cellCenterX(slot.col), cellCenterY(slot.row));
      runFrames(sim, 1);
      runFrames(sim, 1, { storeToggle: true });
      return runFrames(sim, 1, { storeConfirm: true });
    }

    it("sells a shelved rare for 4 Quarters, and never shelves two", () => {
      const owned = ["passiveGhostSlow", "passiveAfterburner"] as const;
      let bought = false;
      for (let n = 0; n < 60 && !bought; n += 1) {
        const sim = startSim(
          { store: 1, level: 5, quarters: 10, lives: 4, maxLives: 4, enableUpgrades: [...owned] },
          `rare${n}`,
        );
        const shelf = sim
          .snapshot()
          .storeStock!.filter((s) => s !== "life" && !s.includes(":")) as BaseUpgradeId[];
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
      const owned = ALL_UPGRADE_IDS.filter((id) => !isRare(id));
      const sim = startSim({ store: 1, level: 5, quarters: 10, enableUpgrades: owned });
      const shelf = (
        sim
          .snapshot()
          .storeStock!.filter((s) => s !== "life" && !s.includes(":")) as BaseUpgradeId[]
      ).filter(isRare);
      expect(shelf).toHaveLength(1);
      buy(sim, "swap");
      const gained = sim.snapshot().upgrades.filter((id) => !owned.includes(id as BaseUpgradeId));
      expect(gained).toHaveLength(1);
      expect(isRare(gained[0]!)).toBe(true);
      expect(gained).not.toContain(shelf[0]);
    });

    it("the first store stocks two lives, two abilities and an enhancement", () => {
      const sim = startSim({
        store: 1,
        lives: 1,
        maxLives: 4,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlow"],
      });
      expect([...sim.snapshot().storeStock!].map((s) => s.split(":")[0]).sort()).toEqual([
        "enhance",
        "life",
        "life",
        expect.any(String),
        expect.any(String),
      ]);
      expect(sim.snapshot().storeStock).toHaveLength(5);
    });

    it("offers life tiles for room left after store-entry regen", () => {
      const lifeTiles = (lives: number) =>
        startSim({ store: 1, level: 5, quarters: 10, lives, maxLives: 4 })
          .snapshot()
          .storeStock!.filter((s) => s === "life").length;
      expect(lifeTiles(4)).toBe(0);
      expect(lifeTiles(3)).toBe(0);
      expect(lifeTiles(2)).toBe(1);
      expect(lifeTiles(1)).toBe(2);
    });

    it("a later store adds a trade tile and an enhancement tile", () => {
      const sim = startSim({
        store: 1,
        lives: 1,
        maxLives: 4,
        level: 5,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlow"],
      });
      const stock = sim.snapshot().storeStock!;
      expect(stock).toHaveLength(6);
      expect(stock).toContain("enhance:passiveGhostSlow");
      expect(stock).toContain("swap:passiveGhostSlow");
    });

    it("buying a life removes that tile and the second life tile stays", () => {
      const sim = startSim({ store: 1, lives: 1, maxLives: 4, level: 5, quarters: 10 });
      buy(sim, "life", 0);
      expect(sim.snapshot().storeStock!.filter((s) => s === "life")).toHaveLength(1);
    });

    it("charges 1 for a life in the first store and 2 in later stores", () => {
      const first = startSim({ store: 1, lives: 1, maxLives: 4, quarters: 10 });
      buy(first, "life", 0);
      expect(first.snapshot().quarters).toBe(9);
      expect(first.snapshot().lives).toBe(3);

      const later = startSim({ store: 2, lives: 1, maxLives: 4, quarters: 10 });
      buy(later, "life", 0);
      expect(later.snapshot().quarters).toBe(8);
      expect(later.snapshot().lives).toBe(3);
    });

    it("enhancement costs 2, swaps the owned upgrade for its Plus form and keeps order", () => {
      const sim = startSim({
        store: 1,
        level: 5,
        quarters: 10,
        enableUpgrades: ["passiveGhostSlow"],
      });
      const events = buy(sim, "enhance");
      expect(sim.snapshot().quarters).toBe(8);
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

  it("settles on the tile after a diagonal store entry and resumes on a single key", () => {
    const sim = startSim({ store: 1, lives: 1, maxLives: 4, quarters: 10 });
    const life = sim
      .storeState()!
      .slots.filter((slot) => slot.kind === "life")
      .at(-1)!;
    const diagonal = { ...held("down"), right: 0 };
    teleportPlayer(sim, cellCenterX(life.col - 1), cellCenterY(life.row - 1));
    runFrames(sim, 1);
    runFrames(sim, 120, { keys: diagonal });
    expect(sim.storeState()?.activeSlot).not.toBeNull();
    expect(sim.snapshot().storePrompt).toBe("confirm");

    runFrames(sim, 30, { keys: diagonal });
    const settled = sim.snapshot().player!;
    expect(isAlignedForTurn(settled.x, settled.y)).toBe(true);
    expect(settled.facing).toBe("none");

    runFrames(sim, 1, { storeChoice: "no" });
    runFrames(sim, 1);
    expect(sim.snapshot().storePrompt).toBeNull();
    expect(sim.snapshot().inputSuppressed).toBe(false);

    const at = { ...sim.snapshot().player! };
    runFrames(sim, 10, { keys: held("up") });
    expect(sim.snapshot().player?.y).toBeLessThan(at.y);
  });

  it.each([
    ["yes", true],
    ["no", false],
  ] as const)("store modal click %s %s a life", (choice, buys) => {
    const sim = startSim({ store: 1, lives: 2, maxLives: 4, quarters: 10 });
    const life = parseStoreSlots(STORE_MAZE_ASCII).find((slot) => slot.kind === "life")!;
    const before = sim.snapshot();
    teleportPlayer(sim, cellCenterX(life.col), cellCenterY(life.row));
    runFrames(sim, 1);
    runFrames(sim, 1, { storeChoice: choice });
    expect(sim.snapshot().lives).toBe(before.lives + (buys ? 1 : 0));
    expect(sim.snapshot().quarters < before.quarters).toBe(buys);
  });

  it.each([
    ["yes", true],
    ["no", false],
  ] as const)("clicking a store tile opens its modal and %s picks it", (choice, buys) => {
    const sim = startSim({ store: 1, lives: 2, maxLives: 4, quarters: 10 });
    const before = sim.snapshot();
    const lifeIndex = sim.storeState()!.slots.findIndex((slot) => slot.kind === "life");
    runFrames(sim, 1, { storeClick: lifeIndex });
    expect(sim.storeState()?.activeSlot).toBe(lifeIndex);
    runFrames(sim, 1, { storeChoice: choice });
    expect(sim.snapshot().lives).toBe(before.lives + (buys ? 1 : 0));
    expect(sim.snapshot().quarters < before.quarters).toBe(buys);
  });

  describe("store exit click", () => {
    const topTunnel = () => ({ x: cellCenterX(10), y: cellCenterY(0) });

    function travelPx(sim: PlaySim, run: () => void) {
      const before = sim.snapshot().player!;
      run();
      const after = sim.snapshot().player!;
      return Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
    }

    it("walks the player out a clicked tunnel at normal speed", () => {
      const keyed = startSim({ store: 1, quarters: 0 });
      runFrames(keyed, 1);
      const keyedPx = travelPx(keyed, () => runFrames(keyed, 5, { keys: held("left") }));

      const sim = startSim({ store: 1, quarters: 0 });
      const level = sim.snapshot().level;
      runFrames(sim, 1);
      const routedPx = travelPx(sim, () => {
        runFrames(sim, 1, { storePointer: topTunnel() });
        runFrames(sim, 4);
      });
      expect(sim.snapshot().storeRoute).toEqual({ col: 10, row: 0 });
      expect(Math.abs(routedPx - keyedPx)).toBeLessThanOrEqual(1);
      runUntil(sim, () => sim.snapshot().level !== level, 1200);
      expect(sim.snapshot().inStore).toBe(false);
    });

    it.each([
      ["an arrow key", { keys: held("left") }],
      ["Escape", { storeCancelRoute: true }],
      ["a click elsewhere", { storePointer: { x: cellCenterX(5), y: cellCenterY(16) } }],
    ] as const)("%s cancels the route", (_label, cancel) => {
      const sim = startSim({ store: 1, quarters: 0 });
      runFrames(sim, 1, { storePointer: topTunnel() });
      runFrames(sim, 10);
      runFrames(sim, 1, cancel);
      expect(sim.snapshot().storeRoute).toBeNull();
      runFrames(sim, 30);
      const at = sim.snapshot().player;
      runFrames(sim, 30);
      expect(sim.snapshot().player).toEqual(at);
      expect(sim.snapshot().inStore).toBe(true);
    });

    it.each([
      [10, 0],
      [0, 10],
      [21, 10],
      [11, 20],
    ])("routes around affordable tiles to the tunnel at %i,%i", (col, row) => {
      const sim = startSim({ store: 2, quarters: 10, lives: 2, maxLives: 4 });
      const level = sim.snapshot().level;
      runFrames(sim, 1, { storePointer: { x: cellCenterX(col), y: cellCenterY(row) } });
      runUntil(
        sim,
        () => sim.snapshot().level !== level || sim.snapshot().storePrompt === "confirm",
        1200,
      );
      expect(sim.snapshot().level).not.toBe(level);
    });

    it("reports a tunnel under the pointer only while a click there would route", () => {
      const sim = startSim({ store: 1, quarters: 10, lives: 2, maxLives: 4 });
      expect(sim.storeExitUnder(topTunnel().x, topTunnel().y)).toBe(true);
      expect(sim.storeExitUnder(cellCenterX(10), cellCenterY(16))).toBe(false);
      const lifeIndex = sim.storeState()!.slots.findIndex((slot) => slot.kind === "life");
      runFrames(sim, 1, { storeClick: lifeIndex });
      expect(sim.snapshot().storePrompt).toBe("confirm");
      expect(sim.storeExitUnder(topTunnel().x, topTunnel().y)).toBe(false);
      runFrames(sim, 1, { storeChoice: "no" });
      expect(sim.storeExitUnder(topTunnel().x, topTunnel().y)).toBe(true);
      const level = sim.snapshot().level;
      runFrames(sim, 1, { storePointer: topTunnel() });
      runUntil(sim, () => sim.snapshot().level !== level, 1200);
      expect(sim.storeExitUnder(topTunnel().x, topTunnel().y)).toBe(false);
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

    it("advances swarm to stage 2 with 5 boss pellets and carried ghost count", () => {
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
      expect(sim.snapshot().bossPellets).toBe(5);
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
    expect(events.some((event) => event.type === "pelletAbsorb")).toBe(false);

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

describe("PlaySim bonus bar", () => {
  function startCorridor(overrides: Partial<PlayOptions> = {}): PlaySim {
    return startSim({ level: 2, maze: "maze1", infiniteLives: true, ...overrides }, "bonus1");
  }

  function bonusEvents(events: SimEvent[]): Extract<SimEvent, { type: "bonus" }>[] {
    return events.filter((e): e is Extract<SimEvent, { type: "bonus" }> => e.type === "bonus");
  }

  it("bumps the bar when a streak reaches 5", () => {
    const sim = startCorridor();
    const events = runUntil(sim, () => sim.snapshot().bonus.streak >= 5, 120, {
      keys: held("left"),
    });
    expect(sim.snapshot().bonus.charge).toBe(2);
    expect(bonusEvents(events)).toEqual([{ type: "bonus", tier: 1, filled: 0 }]);
  });

  it("breaks the streak when the player walks back over eaten tiles", () => {
    const sim = startCorridor();
    runUntil(sim, () => sim.snapshot().bonus.streak >= 6, 120, { keys: held("left") });
    const { charge } = sim.snapshot().bonus;
    const collected = sim.snapshot().boardCollected;
    runUntil(sim, () => sim.snapshot().bonus.streak === 0, 30, { keys: held("right") });
    expect(sim.snapshot().boardCollected).toBe(collected);
    expect(sim.snapshot().bonus.charge).toBe(charge);
  });

  it("breaks the streak after stopping against a wall", () => {
    const sim = startCorridor();
    runUntil(sim, () => sim.snapshot().bonus.streak === 7, 120, { keys: held("left") });
    runFrames(sim, 20, { keys: held("left") });
    expect(sim.snapshot().bonus.streak).toBe(7);
    runFrames(sim, 10, { keys: held("left") });
    expect(sim.snapshot().bonus).toMatchObject({ streak: 0, charge: 2 });
    expect(sim.snapshot().boardCollected).toBe(7);
  });

  it("pays a Quarter when the bar fills and carries the rest", () => {
    const sim = startCorridor({ bonus: 299, quarters: 0 });
    const events = runUntil(sim, () => sim.snapshot().bonus.streak >= 5, 120, {
      keys: held("left"),
    });
    expect(sim.snapshot().quarters).toBe(1);
    expect(sim.snapshot().bonus.charge).toBe(1);
    expect(bonusEvents(events)).toEqual([{ type: "bonus", tier: 1, filled: 1 }]);
    expect(events).toContainEqual({ type: "quarters", pulse: false });
  });

  it("counts a power pellet once and ignores Extra Hungry's extra pellets", () => {
    const sim = startCorridor({ enableUpgrades: ["powerPelletExtraHungry"] });
    const power = Array.from(query(sim.world, [PowerPellet, Position]))[0]!;
    const collected = sim.snapshot().boardCollected;
    eatPelletAt(sim, power);
    expect(sim.snapshot().boardCollected).toBe(collected + 6);
    expect(sim.snapshot().bonus.streak).toBe(1);
  });

  it("Extra Hungry eats the five farthest regular pellets", () => {
    const sim = startCorridor({ enableUpgrades: ["powerPelletExtraHungry"] });
    const power = Array.from(query(sim.world, [PowerPellet, Position]))[0]!;
    const distFromPower = (eid: number) =>
      Math.hypot(Position.x[eid]! - Position.x[power]!, Position.y[eid]! - Position.y[power]!);
    const regulars = () =>
      Array.from(query(sim.world, [Pellet, Position])).filter((eid) => eid !== power);
    const expected = regulars()
      .sort((a, b) => distFromPower(b) - distFromPower(a) || a - b)
      .slice(0, 5);
    eatPelletAt(sim, power);
    const remaining = new Set(regulars());
    expect(expected.filter((eid) => remaining.has(eid))).toEqual([]);
  });

  it("resets the streak on death and keeps the charge", () => {
    const sim = startCorridor({ bonus: 40 });
    runUntil(sim, () => sim.snapshot().bonus.streak >= 5, 120, { keys: held("left") });
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().bonus).toMatchObject({ streak: 0, charge: 42 });
  });

  it("keeps the charge, plus the time bonus, across a level advance", () => {
    const sim = startSim({ jumpToUpgrade: true, bonus: 50 });
    drainToOffer(sim);
    sim.chooseUpgrade({ kind: "quarters", amount: 2 });
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 240);
    expect(sim.snapshot().bonus).toMatchObject({ streak: 0, charge: 193 });
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

  it("keeps Pac-Man gold through a turn flash while invulnerable", () => {
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
    expect(sim.snapshot()).toMatchObject({ quarters: 0, bonus: { charge: 150 } });
    expect(events).not.toContainEqual({ type: "quarters", pulse: false });
    expect(events).toContainEqual({ type: "fruitBonus" });
  });

  it("emits no fruitBonus when fruit pays Quarters instead of charging", () => {
    const sim = startWithFruit({ quarters: 0, enableUpgrades: ["fruitQuarterBounty"] });
    expect(eatFruit(sim)).not.toContainEqual({ type: "fruitBonus" });
  });

  it("pays a Quarter when fruit fills the bar", () => {
    const sim = startWithFruit({ quarters: 0, bonus: 200 });
    const events = eatFruit(sim);
    expect(sim.snapshot()).toMatchObject({ quarters: 1, bonus: { charge: 50 } });
    expect(events).toContainEqual({ type: "bonus", tier: 0, filled: 1 });
  });

  it("Quarter Bounty pays a Quarter instead of charging the bar; Plus pays two", () => {
    const base = startWithFruit({ quarters: 0, bonus: 10, enableUpgrades: ["fruitQuarterBounty"] });
    eatFruit(base);
    expect(base.snapshot()).toMatchObject({ quarters: 1, bonus: { charge: 10 } });

    const plus = startWithFruit({
      quarters: 0,
      bonus: 10,
      enableUpgrades: ["fruitQuarterBountyPlus"],
    });
    eatFruit(plus);
    expect(plus.snapshot()).toMatchObject({ quarters: 2, bonus: { charge: 10 } });
  });

  it("Fruit Power+ also turns a regular pellet into a power pellet", () => {
    const sim = startWithFruit({ enableUpgrades: ["fruitPowerPelletPlus"] });
    const before = query(sim.world, [Pellet, PowerPellet]).length;
    eatFruit(sim);
    expect(query(sim.world, [Pellet, PowerPellet]).length).toBe(before + 1);

    const base = startWithFruit({ enableUpgrades: ["fruitPowerPellet"] });
    const baseBefore = query(base.world, [Pellet, PowerPellet]).length;
    eatFruit(base);
    expect(query(base.world, [Pellet, PowerPellet]).length).toBe(baseBefore);
  });
});

describe("PlaySim level-end time bonus", () => {
  function startClear(overrides: Partial<PlayOptions>): { sim: PlaySim; events: SimEvent[] } {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), jumpToUpgrade: true, ...overrides },
      "drain",
    );
    return { sim, events: sim.start() };
  }

  it("drains the timer into the bar before the upgrade offer", () => {
    const { sim, events } = startClear({ level: 2 });
    expect(events).toContainEqual({ type: "timeBonus", active: true });
    runFrames(sim, 30);
    expect(sim.snapshot().bonus.draining).toBe(true);
    expect(sim.offer()).toBeNull();
    expect(sim.snapshot().timeRemaining).toBeLessThan(999);
    const rest = runUntil(sim, () => !sim.snapshot().bonus.draining, 60);
    expect(rest).toContainEqual({ type: "timeBonus", active: false });
    expect(sim.snapshot()).toMatchObject({ timeRemaining: 0, quarters: 1, bonus: { charge: 143 } });
    expect(sim.offer()).not.toBeNull();
  });

  it("pays a Quarter mid-drain, before the offer opens", () => {
    const { sim } = startClear({ level: 2, bonus: 200, quarters: 0 });
    const events = runUntil(sim, () => sim.snapshot().quarters === 1, 90);
    expect(sim.offer()).toBeNull();
    expect(events).toContainEqual({ type: "bonus", tier: 0, filled: 1 });
    drainToOffer(sim);
    expect(sim.snapshot()).toMatchObject({ quarters: 2, bonus: { charge: 43 } });
  });

  it("drains on level 1, then moves on to level 2", () => {
    const { sim } = startClear({ level: 1 });
    runUntil(sim, () => !sim.snapshot().bonus.draining, 90);
    expect(sim.snapshot().bonus.charge).toBe(143);
    runUntil(sim, () => sim.snapshot().level === 2, 120);
  });

  it("skips the drain on the final boss clear", () => {
    const sim = new PlaySim(
      { ...defaultPlayOptions(), level: 9, boss: "blinkySwarm", bossStageAdvance: true },
      "drain",
    );
    const startEvents = sim.start();
    expect(startEvents.some((e) => e.type === "timeBonus")).toBe(false);
    runUntil(
      sim,
      () => sim.snapshot().boss?.stage === 2 && sim.snapshot().bossStageTransition === false,
      BOSS_STAGE_WAIT_FRAMES,
    );
    sim["jumpToLevelClear"]();
    const events = runFrames(sim, 90);
    expect(events.some((e) => e.type === "timeBonus")).toBe(false);
    expect(sim.snapshot().bonus).toMatchObject({ charge: 0, draining: false });
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
      levelScaledDurationMs(INVULN_MS, 2),
      levelScaledDurationMs(INVULN_ENHANCED_MS, 2),
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
    const doubled = levelScaledDurationMs(INVULN_MS, 2) * 2;
    const tripled = levelScaledDurationMs(INVULN_ENHANCED_MS, 2) * 3;
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
    runFrames(sim, 30);
    expect(sim.snapshot().timers.ghostWarpGlideMs).toBe(0);
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
});

describe("Death's Bounty", () => {
  function startBounty(enableUpgrades: UpgradeId[], overrides: Partial<PlayOptions> = {}): PlaySim {
    return startSim({ level: 2, maze: "maze1", infiniteLives: true, enableUpgrades, ...overrides });
  }

  function dieAndRespawn(sim: PlaySim): SimEvent[] {
    ghostOntoPlayer(sim);
    const events = runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    return [...events, ...runUntil(sim, () => !sim.snapshot().dying, 240)];
  }

  function bountyTotals(id: UpgradeId, deaths: number): number[] {
    const sim = startBounty([id], { bonus: 100 });
    const totals: number[] = [];
    for (let i = 0; i < deaths; i += 1) {
      dieAndRespawn(sim);
      const { quarters, bonus } = sim.snapshot();
      totals.push(quarters * bonus.max + bonus.charge);
    }
    return totals;
  }

  it("pays a full bar on the first death, then 20% less per death compounding", () => {
    expect(bountyTotals("passiveDeathsBounty", 3)).toEqual([400, 640, 832]);
  });

  it("decays only 10% per death when enhanced", () => {
    expect(bountyTotals("passiveDeathsBountyPlus", 3)).toEqual([400, 670, 913]);
  });

  it("pays the Quarter through the bonus bar fill at the catch", () => {
    const sim = startBounty(["passiveDeathsBounty"]);
    ghostOntoPlayer(sim);
    const events = runFrames(sim, 1);
    expect(events).toContainEqual({ type: "bonus", tier: 0, filled: 1 });
    expect(sim.snapshot().quarters).toBe(1);
    expect(sim.snapshot().bonus.charge).toBe(0);
  });

  it("pays nothing when not owned", () => {
    const sim = startBounty([], { bonus: 100 });
    dieAndRespawn(sim);
    expect(sim.snapshot().quarters).toBe(0);
    expect(sim.snapshot().bonus.charge).toBe(100);
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
    const offer = drainToOffer(sim);
    sim.chooseUpgrade({ kind: "quarters", amount: offer.quarters });
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 300);
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
    const offer = drainToOffer(sim);
    sim.chooseUpgrade({ kind: "quarters", amount: offer.quarters });
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 300);
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

describe("Shield Pellets", () => {
  const LEVEL2_INVULN_MS = levelScaledDurationMs(INVULN_MS, 2);

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

  it("banks a shield instead of firing power-pellet effects", () => {
    const sim = startShieldSim(["passiveShieldPellets", "powerPelletInvuln"]);
    const events = chompPowerPellet(sim);
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 1, invulnMs: 0 });
    expect(sim.hud().shields).toBe(1);
    expect(events).toContainEqual({ type: "shields" });
  });

  it("holds 1 shield, or 3 with Shield Pellets+", () => {
    const base = startShieldSim(["passiveShieldPellets"]);
    chompPowerPellets(base, 2);
    expect(base.snapshot().timers.shieldsBanked).toBe(1);

    const plus = startShieldSim(["passiveShieldPelletsPlus"]);
    chompPowerPellets(plus, 4);
    expect(plus.snapshot().timers.shieldsBanked).toBe(3);
  });

  it("a catch breaks a shield, fires the effects and costs no life or death", () => {
    const sim = startShieldSim(["passiveShieldPellets", "powerPelletInvuln"]);
    chompPowerPellet(sim);
    const livesBefore = sim.snapshot().lives;
    ghostOntoPlayer(sim);
    const events = runFrames(sim, 1);
    expect(sim.snapshot()).toMatchObject({
      dying: false,
      lives: livesBefore,
      deathsThisBoard: 0,
      shieldCrackProgress: 0,
    });
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 0, invulnMs: LEVEL2_INVULN_MS });
    expect(events).toContainEqual({ type: "shieldCrack", index: 0, progress: 0 });
    expect(events).not.toContainEqual({ type: "sfx", id: "death" });
    const crack = runUntil(sim, () => sim.snapshot().shieldCrackProgress === null, 120);
    expect(crack).toContainEqual({ type: "shieldCrack", index: 0, progress: 1 });
  });

  it("breaks the pellet streak and keeps the charge", () => {
    const sim = startSim(
      {
        level: 2,
        maze: "maze1",
        infiniteLives: true,
        enableUpgrades: ["passiveShieldPellets"],
        bonus: 40,
      },
      "shield-streak",
    );
    chompPowerPellet(sim);
    expect(sim.snapshot().timers.shieldsBanked).toBe(1);
    while (sim.snapshot().bonus.streak < 5) {
      const eid = regularPelletEids(sim)[0]!;
      teleportPlayer(sim, Position.x[eid]!, Position.y[eid]!);
      runFrames(sim, 1);
    }
    const { charge, streak } = sim.snapshot().bonus;
    expect(streak).toBeGreaterThanOrEqual(5);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().bonus).toMatchObject({ streak: 0, charge });
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
    expect(sim.snapshot().dying).toBe(false);
  });

  it("grants 1s of immunity on its own, multiplied by Overcharge", () => {
    const sim = startShieldSim(["passiveShieldPellets"]);
    chompPowerPellet(sim);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(SHIELD_BREAK_INVULN_MS - 2 * FRAME_MS);
    expect(sim.snapshot().timers.invulnMs).toBeLessThanOrEqual(SHIELD_BREAK_INVULN_MS);

    const overcharged = startShieldSim(["passiveShieldPellets", "passiveOvercharge"]);
    chompPowerPellet(overcharged);
    ghostOntoPlayer(overcharged);
    runFrames(overcharged, 1);
    expect(overcharged.snapshot().timers.invulnMs).toBeGreaterThan(SHIELD_BREAK_INVULN_MS);
  });

  it("does not trigger Defy Death's save but arms its window", () => {
    const sim = startShieldSim(["passiveShieldPellets", "passiveDefyDeath"]);
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

  it("Fruit Power banks a shield instead of firing", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveShieldPelletsPlus", "fruitPowerPellet", "powerPelletInvuln"],
    });
    sim["spawnFruitEntity"](false);
    const fruit = query(sim.world, [Fruit, Position])[0]!;
    teleportPlayer(sim, Position.x[fruit]!, Position.y[fruit]!);
    runFrames(sim, 1);
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 1, invulnMs: 0 });
  });

  it("empties the bank on level advance", () => {
    const sim = startShieldSim(["passiveShieldPelletsPlus"]);
    chompPowerPellets(sim, 2);
    expect(sim.snapshot().timers.shieldsBanked).toBe(2);
    sim["jumpToLevelClear"]();
    drainToOffer(sim);
    sim.chooseUpgrade({ kind: "quarters", amount: 2 });
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 240);
    expect(sim.snapshot().timers.shieldsBanked).toBe(0);
  });

  it("does nothing without the upgrade", () => {
    const sim = startShieldSim(["powerPelletInvuln"]);
    chompPowerPellet(sim);
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 0, invulnMs: LEVEL2_INVULN_MS });
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

  it("does not kill on a graze short of the 25% overlap bar", () => {
    const sim = ghostAtReachFraction(0.82);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(false);
  });

  it("kills once the ghost overlaps past the 25% overlap bar", () => {
    const sim = ghostAtReachFraction(0.65);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
  });
});

describe("Martyr", () => {
  function startMartyr(enableUpgrades: UpgradeId[]): PlaySim {
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

  it("respawns at spawn without Martyr", () => {
    const sim = startMartyr([]);
    const spawn = { ...sim.snapshot().player! };
    dieAwayFromSpawn(sim);
    expect(sim.snapshot().player).toMatchObject({ col: spawn.col, row: spawn.row });
  });

  it("Martyr sends ghosts that were out to their Scatter Burst corners", () => {
    const sim = startMartyr(["passiveMartyr"]);
    const fell = dieAwayFromSpawn(sim);
    const { player, ghosts } = sim.snapshot();
    expect(player).toMatchObject({ col: fell.col, row: fell.row });
    expect(Position.x[playerEid(sim)]).toBe(cellCenterX(fell.col));
    expect(Position.y[playerEid(sim)]).toBe(cellCenterY(fell.row));
    const out = ghosts.filter((ghost) => ghost.phase === "active");
    expect(out.length).toBeGreaterThan(0);
    for (const ghost of out) {
      const corner = ghostTeleportCell(
        scatterTargetForKind(GhostKind.kind[ghost.eid] as GhostKindId),
        fell,
      );
      expect(ghost).toMatchObject({ col: corner.col, row: corner.row });
    }
    const home = ghosts.filter((ghost) => ghost.phase !== "active");
    expect(home.every((ghost) => ghost.phase === "inHouse")).toBe(true);
  });

  it("Martyr starts the scatter/chase clock so cornered ghosts move on to chase", () => {
    const sim = startMartyr(["passiveMartyr"]);
    dieAwayFromSpawn(sim);
    expect(sim.snapshot().ghostMode).toBe("scatter");
    runUntil(sim, () => sim.snapshot().ghostMode === "chase", 60 * 30);
    expect(sim.snapshot().ghostMode).toBe("chase");
  });

  it("Martyr+ respawns where the player fell with every ghost in the house", () => {
    const sim = startMartyr(["passiveMartyrPlus"]);
    const fell = dieAwayFromSpawn(sim);
    const { player, ghosts } = sim.snapshot();
    expect(player).toMatchObject({ col: fell.col, row: fell.row });
    expect(ghosts.length).toBeGreaterThan(0);
    expect(ghosts.every((ghost) => ghost.phase === "inHouse")).toBe(true);
  });

  it("stacks with Death's Bounty and Death's Harvest", () => {
    const sim = startMartyr(["passiveMartyr", "passiveDeathsBounty", "passiveDeathsHarvest"]);
    const pelletsBefore = sim.snapshot().pelletsRemaining;
    const fell = dieAwayFromSpawn(sim);
    expect(sim.snapshot().player).toMatchObject({ col: fell.col, row: fell.row });
    expect(sim.snapshot().quarters).toBe(1);
    expect(sim.snapshot().pelletsRemaining).toBeLessThan(pelletsBefore - 1);
  });

  it("respawns in place on a Defy Death save", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveMartyr", "passiveDefyDeath"],
    });
    const spawn = sim.snapshot().player!;
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    const fell = sim.snapshot().player!;
    expect(fell.row).not.toBe(spawn.row);
    const lives = sim.snapshot().lives;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().lives).toBe(lives);
    expect(sim.snapshot().player).toMatchObject({ col: fell.col, row: fell.row });
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
    const slot = parseStoreSlots(STORE_MAZE_ASCII).filter((cell) => cell.kind === "life")[0]!;
    teleportPlayer(sim, cellCenterX(slot.col), cellCenterY(slot.row));
    runFrames(sim, 1);
    runFrames(sim, 1, { storeToggle: true });
    runFrames(sim, 1, { storeConfirm: true });
    expect(sim.snapshot().quarters).toBeLessThan(20);
    expect(sim.snapshot().interestPop).toBeNull();
    expect(sim.hud().quarters).toBe(sim.snapshot().quarters);
  });

  it("shows the real wallet as soon as you leave mid pop-in", () => {
    const sim = storeWith(["passiveInterest"], 15);
    expect(sim.hud().quarters).toBe(15);
    expect(sim.snapshot().interestPop).toEqual({ count: 5, shown: 0 });
    teleportPlayer(sim, cellCenterX(10), cellCenterY(0));
    const level = sim.snapshot().level;
    const events = runUntil(sim, () => sim.snapshot().level !== level, 120);
    expect(sim.snapshot().interestPop).toBeNull();
    expect(sim.hud().quarters).toBe(sim.snapshot().quarters);
    expect(events).toContainEqual({ type: "quarters", pulse: false });
  });
});

describe("Near Miss", () => {
  function startNearMiss(enableUpgrades: UpgradeId[]): PlaySim {
    return startSim({ level: 2, maze: "maze1", infiniteLives: true, enableUpgrades, bonus: 100 });
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

  it("charges the BONUS bar 15 when a ghost brushes past", () => {
    const sim = startNearMiss(["passiveNearMiss"]);
    passGhost(sim);
    expect(sim.snapshot().nearMissesPaid).toBe(1);
    expect(sim.snapshot().bonus.charge).toBe(100 + NEAR_MISS_CHARGE);
  });

  it("charges 30 when enhanced", () => {
    const sim = startNearMiss(["passiveNearMissPlus"]);
    passGhost(sim);
    expect(sim.snapshot().bonus.charge).toBe(100 + NEAR_MISS_ENHANCED_CHARGE);
  });

  it("pays every separate pass", () => {
    const sim = startNearMiss(["passiveNearMiss"]);
    passGhost(sim);
    passGhost(sim);
    expect(sim.snapshot().nearMissesPaid).toBe(2);
    expect(sim.snapshot().bonus.charge).toBe(100 + 2 * NEAR_MISS_CHARGE);
  });

  it("pays nothing when not owned", () => {
    const sim = startNearMiss([]);
    passGhost(sim);
    expect(sim.snapshot().nearMissesPaid).toBe(0);
    expect(sim.snapshot().bonus.charge).toBe(100);
  });

  it("pays nothing while the ghost stays within 1 tile", () => {
    const sim = startNearMiss(["passiveNearMiss"]);
    ghostBesidePlayer(sim, query(sim.world, [Ghost, Position])[0]!);
    runFrames(sim, 1);
    expect(sim.snapshot().nearMissesPaid).toBe(0);
  });

  it("pays nothing when the ghost catches you", () => {
    const sim = startNearMiss(["passiveNearMiss"]);
    ghostBesidePlayer(sim, query(sim.world, [Ghost, Position])[0]!);
    runFrames(sim, 1);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    expect(sim.snapshot().dying).toBe(true);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    runFrames(sim, 1);
    expect(sim.snapshot().nearMissesPaid).toBe(0);
    expect(sim.snapshot().bonus.charge).toBe(100);
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

  it("still sends the caged ghost home when Martyr sends the others to their corners", () => {
    const sim = startHaunting(["passiveMartyr", "passiveHaunting"]);
    runFrames(sim, 20, LEFT);
    const killer = query(sim.world, [Ghost, Position])[0]!;
    const others = query(sim.world, [Ghost, Position]).filter((eid) => eid !== killer);
    for (const eid of others) {
      GhostPhase.value[eid] = GHOST_PHASE.active;
    }
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(inHouse(killer)).toBe(true);
    expect(others.some((eid) => !inHouse(eid))).toBe(true);
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
    const killer = query(sim.world, [Ghost, Position])[0]!;
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    runUntil(sim, () => !sim.snapshot().dying, 240);
    expect(sim.snapshot().lives).toBe(lives);
    expect(sim.snapshot().hauntedGhost).toBe(nameOf(sim, killer));
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

  it("does not haunt on the boss level", () => {
    const sim = startHaunting(["passiveHaunting"], 9);
    dieToFirstGhost(sim);
    expect(sim.snapshot().hauntedGhost).toBeNull();
    expect(sim.snapshot().timers.hauntMs).toBe(0);
  });

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

describe("ghost style (neon line art vs pixel)", () => {
  const sorted = (values: readonly string[] | readonly number[] | undefined) =>
    [...(values ?? [])].map(String).sort();

  it("draws no line art by default (pixel STYLE)", () => {
    const sim = startSim({ level: 5 }, "lineart");
    expect(sim.snapshot().lineArtGhosts).toEqual([]);
    expect(sim.snapshot().lineArtPlayer).toBe(false);
    expect(sim.snapshot().lineArtQuarter).toBe(false);
  });

  it("draws every present ghost as neon line art under neon STYLE, on every level", () => {
    const neonSim = startSim({ level: 5 }, "lineart");
    neonSim.setGhostStyle("neon");
    expect(sorted(neonSim.snapshot().lineArtGhosts)).toEqual(["blinky", "clyde", "inky", "pinky"]);
    for (const level of [1, 9]) {
      const sim = startSim({ level }, "lineart");
      sim.setGhostStyle("neon");
      const snap = sim.snapshot();
      expect(snap.lineArtGhosts.length).toBeGreaterThan(0);
      expect(sorted(snap.lineArtGhosts)).toEqual(
        sorted([...new Set(snap.ghosts.map((g) => g.kind))]),
      );
    }
  });

  it("tells the renderer which drawables are line art, Dot-Man included", () => {
    const sim = startSim({ level: 5 }, "lineart");
    sim.setGhostStyle("neon");
    const events = runFrames(sim, 1);
    const draws = events.flatMap((event) => (event.type === "draw" ? [event.options] : []));
    expect(sorted(draws.at(-1)?.lineArtDrawableIds)).toEqual(
      sorted([
        PLAYER_DRAWABLE_ID,
        BLINKY_DRAWABLE_ID,
        PINKY_DRAWABLE_ID,
        INKY_DRAWABLE_ID,
        CLYDE_DRAWABLE_ID,
      ]),
    );
    expect(sim.snapshot().lineArtPlayer).toBe(true);
    expect(sim.snapshot().lineArtQuarter).toBe(true);
  });

  it("draws no line art with the pixel style, and switches back mid-run", () => {
    const sim = startSim({ level: 5 }, "lineart");
    sim.setGhostStyle("pixel");
    const events = runFrames(sim, 1);
    const draws = events.flatMap((event) => (event.type === "draw" ? [event.options] : []));
    expect(draws.at(-1)?.lineArtDrawableIds).toEqual([]);
    expect(sim.snapshot().lineArtGhosts).toEqual([]);
    expect(sim.snapshot().lineArtPlayer).toBe(false);
    expect(sim.snapshot().lineArtQuarter).toBe(false);
    sim.setGhostStyle("neon");
    expect(sim.snapshot().lineArtGhosts).toHaveLength(4);
    expect(sim.snapshot().lineArtPlayer).toBe(true);
    expect(sim.snapshot().lineArtQuarter).toBe(true);
  });

  it("keeps line-art ghosts and Dot-Man under lined style", () => {
    const sim = startSim({ level: 5 }, "lineart");
    sim.setGhostStyle("lined");
    expect(sorted(sim.snapshot().lineArtGhosts)).toEqual(["blinky", "clyde", "inky", "pinky"]);
    expect(sim.snapshot().lineArtPlayer).toBe(true);
    expect(sim.snapshot().lineArtQuarter).toBe(true);
  });

  it("catches with the body circle only, whatever the ghost glow and line-art knobs", () => {
    const furthestCatch = (tuning: Tuning): number => {
      const sim = new PlaySim({ ...defaultPlayOptions(), level: 5 }, "lineart", tuning);
      sim.start();
      const clyde = query(sim.world, [Ghost, GhostKind]).find(
        (eid) => GhostKind.kind[eid] === GHOST_KIND.clyde,
      )!;
      expect(Drawable.radius[clyde]).toBe(ghostRadius());
      GhostPhase.value[clyde] = GHOST_PHASE.active;
      const player = playerEid(sim);
      let furthest = 0;
      for (let d = 0; d <= 40; d += 0.25) {
        Position.x[clyde] = Position.x[player]! + d;
        Position.y[clyde] = Position.y[player]!;
        if (catchPlayer(sim.world) === clyde) {
          furthest = d;
        }
      }
      return furthest;
    };
    const plain = furthestCatch(DEFAULT_TUNING);
    expect(plain).toBeGreaterThan(0);
    expect(plain).toBeLessThan(2 * ghostRadius());
    expect(
      furthestCatch(
        resolveTuning({
          ghostGlow: 4,
          ghostGlowRadius: 12,
          ghostLineWidth: 15,
          ghostWidth: 1.5,
          ghostHeight: 1.5,
        }),
      ),
    ).toBe(plain);
  });

  it("follows a ghosts override", () => {
    const sim = startSim({ level: 5, ghosts: [GHOST_KIND.blinky, GHOST_KIND.pinky] }, "lineart");
    sim.setGhostStyle("neon");
    expect(sorted(sim.snapshot().lineArtGhosts)).toEqual(["blinky", "pinky"]);
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

  it("keeps the faster ghost tunnel speed when Tunnel Dash+ is also owned", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveTunnelDashPlus", "passiveTunnelSanctuary"],
    });
    const ghost = ghostInTunnelMouth(sim);
    runFrames(sim, 1);
    expect(Speed.px[ghost]! / Speed.px[playerEid(sim)]!).toBeCloseTo(0.9);
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

  it("grants Ghost Proof when a Tunnel Dash lands the player at the far mouth", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["passiveTunnelSanctuary", "passiveTunnelDash"],
    });
    teleportPlayer(sim, cellCenterX(3), cellCenterY(tunnelRow()));
    runUntil(sim, () => sim.snapshot().timers.invulnMs > 0, 240, { keys: held("left") });
    expect(sim.snapshot().timers.invulnMs).toBeLessThanOrEqual(1000);
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

describe("Streak Engine", () => {
  function startStreak(enableUpgrades: UpgradeId[]): PlaySim {
    return startSim({ level: 2, maze: "maze1", infiniteLives: true, enableUpgrades }, "streak1");
  }

  function eatUntilStreak(sim: PlaySim, streak: number): SimEvent[] {
    const events: SimEvent[] = [];
    while (sim.snapshot().bonus.streak < streak) {
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
    expect(sim.snapshot().bonus.streak).toBe(0);
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

  it("banks a shield instead of firing when Shield Pellets is owned", () => {
    const sim = startStreak([
      "passiveStreakEngine",
      "passiveShieldPellets",
      "powerPelletSpeedBurst",
    ]);
    eatUntilStreak(sim, 30);
    expect(sim.snapshot().timers).toMatchObject({ shieldsBanked: 1, speedBurstMs: 0 });
  });
});

describe("Echo", () => {
  const AFTER_ECHO_MS = ECHO_DELAY_MS + 500;
  const LEVEL2_INVULN_MS = levelScaledDurationMs(INVULN_MS, 2);

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
    runMs(sim, AFTER_ECHO_MS);
    expect(sim.snapshot().timers.invulnMs).toBe(0);
  });

  it("echoes one random effect, or every effect when enhanced", () => {
    const echoed = (id: UpgradeId): number => {
      const sim = startEcho([id, "powerPelletInvuln", "powerPelletSpeedBurst"]);
      chompPowerPellet(sim);
      runMs(sim, AFTER_ECHO_MS);
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
    runMs(sim, 2 * LEVEL2_INVULN_MS - 100);
    expect(sim.snapshot().timers.invulnMs).toBeGreaterThan(LEVEL2_INVULN_MS);
  });

  it("does not echo a shield banked by Shield Pellets", () => {
    const sim = startEcho(["passiveEcho", "passiveShieldPellets", "powerPelletInvuln"]);
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
    ["powerPelletInvuln", "invulnMs", levelScaledDurationMs(INVULN_MS, 5)],
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
    const charge = sim.snapshot().bonus.charge;
    const quarters = sim.snapshot().quarters;

    const events = ghostOnto(sim, first!);
    expect(sim.snapshot().dying).toBe(false);
    expect(GhostPhase.value[first!]).toBe(GHOST_PHASE.inHouse);
    expect(sim.renderOptions().ghostWarpGlides?.[first!]).toBeDefined();
    expect(events).toContainEqual({ type: "sfx", id: "pelletMunch2" });
    expect(sim.snapshot().bonus.charge).toBe(charge + 75);

    ghostOnto(sim, second!);
    expect(sim.snapshot().bonus.charge).toBe(charge + 225);
    ghostOnto(sim, third!);
    expect(sim.snapshot().quarters).toBe(quarters + 1);
    expect(sim.snapshot().bonus.charge).toBe(charge + 225);
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

  it("Shield Pellets banks the chomp instead of frightening", () => {
    const sim = startHunter(["powerPelletHunter", "passiveShieldPellets"]);
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

  it("cancels an in-flight Tunnel Dash when the gate closes", () => {
    const sim = startSim(
      {
        level: 7,
        maze: "maze1",
        infiniteLives: true,
        enableUpgrades: ["passiveTunnelDash"],
      },
      "tt-dash",
    );
    const row = sim.snapshot().timedTunnel!.row;
    runUntil(
      sim,
      () => {
        const state = sim.snapshot().timedTunnel!;
        return state.phase === "warn" && state.remainingMs <= FRAME_MS * 2;
      },
      framesFor(20_000),
    );
    sim["tunnelDashAnim"] = {
      targetX: cellCenterX(0),
      wrapToX: cellCenterX(getActiveLayout().cols - 1),
      y: cellCenterY(row),
    };
    Position.x[playerEid(sim)] = MAZE_OFFSET_X - 20;
    Position.y[playerEid(sim)] = cellCenterY(row);
    advanceToPhase(sim, "closed");
    expect(sim["tunnelDashAnim"]).toBeNull();
    const x = Position.x[playerEid(sim)]!;
    expect(x).toBeGreaterThanOrEqual(clampToGridCenters(-1e9, 0).x);
    expect(x).toBeLessThanOrEqual(clampToGridCenters(1e9, 0).x);
  });
});
