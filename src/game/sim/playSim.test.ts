import { hasComponent, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { FRUIT_LIFETIME_MS } from "../../domain/fruit";
import { GHOST_KIND } from "../../domain/ghostKind";
import {
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  horizontalTunnelRows,
  isWalkable,
  playerFarthestFromGhostsSpawn,
  TILE_SIZE,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { STORE_MAZE_ASCII } from "../../domain/mazeLayouts";
import { defaultPlayOptions, parsePlayOptions, type PlayOptions } from "../../domain/playOptions";
import { PLAYER_SPEED } from "../../domain/playfield";
import { parseStoreSlots } from "../../domain/store";
import { WARP_GLIDE_MS } from "../../domain/warpGlide";
import {
  frozenGhostEid,
  grantUpgrade,
  STARTING_UPGRADE_POOL,
  type UpgradeChoiceOffer,
  type UpgradeId,
} from "../../domain/upgrades";
import { BossPellet } from "../components/BossPellet";
import { Fruit } from "../components/Fruit";
import { Ghost } from "../components/Ghost";
import { GHOST_PHASE, GhostPhase } from "../components/GhostPhase";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { Speed } from "../components/Speed";
import { PlaySim, RUN_END_MENU_ARM_MS } from "./playSim";
import type { SimEvent } from "./simEvents";
import { NO_KEYS_HELD } from "../systems/heldKeys";
import { FRAME_MS, held, runFrames, runUntil } from "./simTesting";

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

  it("collects pellets while the player moves", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    const events = runFrames(sim, 60, { keys: held("left") });
    expect(sim.snapshot().boardCollected).toBeGreaterThan(0);
    expect(count(events, "pelletSfx")).toBeGreaterThan(0);
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
    expect(Position.y[eid]!).toBeLessThan(before.y - 2);
    expect(Math.abs(Position.x[eid]! - cx)).toBeLessThan(Math.abs(before.x - cx));
    expect(Math.abs(Position.x[eid]! - cx)).toBeGreaterThan(0);
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

  it("regenerates up to 4 icons at level 1 when Extra Life is owned", () => {
    const sim = startSim({ level: 1, enableUpgrades: ["passiveExtraLife"] });
    expect(sim.snapshot().lives).toBe(5);
  });

  it("regenerates up to 3 icons at level 1 without Extra Life", () => {
    const sim = startSim({ level: 1, enableUpgrades: [] });
    expect(sim.snapshot().lives).toBe(4);
  });

  it.each([
    ["passiveMyogenesis", 1, 3],
    ["passiveMyogenesis", 3, 4],
    [null, 1, 2],
    [null, 3, 4],
  ] as const)("level clear with %s from %i lives ends at %i", (upgrade, startLives, endLives) => {
    const sim = startSim({ jumpToUpgrade: true, enableUpgrades: upgrade ? [upgrade] : [] });
    (sim as unknown as { lives: number }).lives = startLives;
    const pick = drainToOffer(sim).upgrades.find(
      (id) => id !== "passiveExtraLife" && id !== "passiveMyogenesis",
    )!;
    sim.chooseUpgrade({ kind: "upgrade", id: pick });
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 240);
    expect(sim.snapshot().lives).toBe(endLives);
  });

  it("buys a life at the store", () => {
    const sim = startSim({ store: 1, quarters: 10 });
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

  describe("store tiles", () => {
    function buy(sim: PlaySim, kind: "life" | "upgrade" | "swap" | "enhance", nth = 0): SimEvent[] {
      const slot = parseStoreSlots(STORE_MAZE_ASCII).filter((cell) => cell.kind === kind)[nth]!;
      teleportPlayer(sim, cellCenterX(slot.col), cellCenterY(slot.row));
      runFrames(sim, 1);
      runFrames(sim, 1, { storeToggle: true });
      return runFrames(sim, 1, { storeConfirm: true });
    }

    it("the first store stocks only two lives and two abilities", () => {
      const sim = startSim({ store: 1, quarters: 10, enableUpgrades: ["passiveGhostSlow"] });
      expect([...sim.snapshot().storeStock!].map((s) => s.split(":")[0]).sort()).toEqual([
        "life",
        "life",
        expect.any(String),
        expect.any(String),
      ]);
      expect(sim.snapshot().storeStock).toHaveLength(4);
    });

    it("a later store adds a trade tile and an enhancement tile", () => {
      const sim = startSim({
        store: 1,
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
      const sim = startSim({ store: 1, level: 5, quarters: 10 });
      buy(sim, "life", 0);
      expect(sim.snapshot().storeStock!.filter((s) => s === "life")).toHaveLength(1);
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

  it("stops a diagonal walk when it opens a store prompt", () => {
    const sim = startSim({ store: 1, quarters: 10 });
    const life = parseStoreSlots(STORE_MAZE_ASCII)
      .filter((slot) => slot.kind === "life")
      .at(-1)!;
    teleportPlayer(sim, cellCenterX(life.col - 1), cellCenterY(life.row - 1));
    runFrames(sim, 1);
    runFrames(sim, 120, { keys: { ...held("down"), right: 0 } });
    expect(sim.storeState()?.activeSlot).not.toBeNull();
    const at = { x: sim.snapshot().player?.x, y: sim.snapshot().player?.y };
    runFrames(sim, 30, { keys: { ...held("down"), right: 0 } });
    expect(sim.snapshot().player).toMatchObject(at);
  });

  it.each([
    ["yes", true],
    ["no", false],
  ] as const)("store modal click %s %s a life", (choice, buys) => {
    const sim = startSim({ store: 1, quarters: 10 });
    const life = parseStoreSlots(STORE_MAZE_ASCII).find((slot) => slot.kind === "life")!;
    const before = sim.snapshot();
    teleportPlayer(sim, cellCenterX(life.col), cellCenterY(life.row));
    runFrames(sim, 1);
    runFrames(sim, 1, { storeChoice: choice });
    expect(sim.snapshot().lives).toBe(before.lives + (buys ? 1 : 0));
    expect(sim.snapshot().quarters < before.quarters).toBe(buys);
  });

  it("adds a Blinky when the player eats a boss pellet", () => {
    const sim = startSim({ level: 9 });
    expect(sim.snapshot().boss?.ghostCount).toBe(2);
    const pellet = query(sim.world, [BossPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[pellet]!, Position.y[pellet]!);
    runUntil(sim, () => sim.snapshot().boss?.ghostCount === 3, 30);
    expect(sim.snapshot().bossPellets).toBe(7);
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
    const byPowerFirst = (eid: number) => (hasComponent(sim.world, eid, PowerPellet) ? 0 : 1);
    for (let i = 0; i < 2000 && sim.offer() === null; i += 1) {
      const [next] = [...query(sim.world, [Pellet, Position])].sort(
        (x, y) => byPowerFirst(x) - byPowerFirst(y),
      );
      if (next === undefined) {
        break;
      }
      parkGhostOn(sim, next);
      runFrames(sim, 1);
    }
    expect(query(sim.world, [Pellet])).toHaveLength(0);
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
    expect(events).toContainEqual({ type: "quarters" });
  });

  it("counts a power pellet once and ignores Triple Chomp's extra pellets", () => {
    const sim = startCorridor({ enableUpgrades: ["powerPelletCollectThree"] });
    const power = Array.from(query(sim.world, [PowerPellet, Position]))[0]!;
    const collected = sim.snapshot().boardCollected;
    eatPelletAt(sim, power);
    expect(sim.snapshot().boardCollected).toBe(collected + 4);
    expect(sim.snapshot().bonus.streak).toBe(1);
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
    expect(sim.snapshot().bonus).toMatchObject({ streak: 0, charge: 249 });
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

    it("sprays sparks out the front for a close tap, and bursts on the beat", () => {
      const [close] = tapAt(14);
      expect(close).toMatchObject({ type: "turnSparks", kind: "close", dx: 1, dy: 0 });
      const [perfect] = tapAt(6);
      expect(perfect).toMatchObject({ type: "turnSparks", kind: "perfect", count: 12 });
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
    expect(events).not.toContainEqual({ type: "quarters" });
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
    expect(sim.snapshot()).toMatchObject({ timeRemaining: 0, bonus: { charge: 199 } });
    expect(sim.offer()).not.toBeNull();
  });

  it("pays a Quarter mid-drain, before the offer opens", () => {
    const { sim } = startClear({ level: 2, bonus: 200, quarters: 0 });
    const events = runUntil(sim, () => sim.snapshot().quarters === 1, 90);
    expect(sim.offer()).toBeNull();
    expect(events).toContainEqual({ type: "bonus", tier: 0, filled: 1 });
    drainToOffer(sim);
    expect(sim.snapshot().bonus.charge).toBe(99);
  });

  it("drains on level 1, then moves on to level 2", () => {
    const { sim } = startClear({ level: 1 });
    runUntil(sim, () => !sim.snapshot().bonus.draining, 90);
    expect(sim.snapshot().bonus.charge).toBe(199);
    runUntil(sim, () => sim.snapshot().level === 2, 120);
  });

  it("skips the drain on the boss clear", () => {
    const { sim, events } = startClear({ level: 9 });
    expect(events.some((e) => e.type === "timeBonus")).toBe(false);
    expect(sim.snapshot().bonus).toMatchObject({ charge: 0, draining: false });
    expect(runFrames(sim, 90)).toContainEqual({ type: "endText", title: "RUN COMPLETE" });
  });
});

describe("PlaySim run complete menu", () => {
  function startRunComplete(): PlaySim {
    const sim = new PlaySim({ ...defaultPlayOptions(), jumpToUpgrade: true, level: 9 }, "run-end");
    sim.start();
    runUntil(sim, () => sim.snapshot().runComplete, 300);
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
    ["powerPelletScatterBurst", "scatterBurstMs", 3000, 5000],
    ["powerPelletInvuln", "invulnMs", 3000, 5000],
    ["powerPelletGhostHarvester", "ghostHarvestMs", 5000, 8000],
    ["powerPelletWallPass", "wallPassMs", 6000, 6000],
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
    const base = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletScatterBurst", "passiveOvercharge"],
    });
    chomp(base);
    expect(base.snapshot().timers.scatterBurstMs).toBeGreaterThan(5800);
    expect(base.snapshot().timers.scatterBurstMs).toBeLessThanOrEqual(6000);

    const plus = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: ["powerPelletScatterBurstPlus", "passiveOverchargePlus"],
    });
    chomp(plus);
    expect(plus.snapshot().timers.scatterBurstMs).toBeGreaterThan(14800);
    expect(plus.snapshot().timers.scatterBurstMs).toBeLessThanOrEqual(15000);
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

  it("Power Freeze and Ghost Recall never hit the same ghost", () => {
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

  it("Myogenesis+ regenerates to full, the base two per level", () => {
    const base = startSim({ level: 2, maze: "maze1", enableUpgrades: ["passiveMyogenesis"] });
    expect(base["regenAmount"]()).toBe(2);
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
