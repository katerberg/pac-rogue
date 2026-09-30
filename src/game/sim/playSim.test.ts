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
} from "../../domain/maze";
import { STORE_MAZE_ASCII } from "../../domain/mazeLayouts";
import { defaultPlayOptions, type PlayOptions } from "../../domain/playOptions";
import { PLAYER_SPEED } from "../../domain/playfield";
import { parseStoreSlots } from "../../domain/store";
import { grantUpgrade } from "../../domain/upgrades";
import { BossPellet } from "../components/BossPellet";
import { Ghost } from "../components/Ghost";
import { GHOST_PHASE, GhostPhase } from "../components/GhostPhase";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { Speed } from "../components/Speed";
import { PlaySim } from "./playSim";
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
  it.each([1, 2, 5])(
    "slows ghosts to half of Maze-Man's speed in the tunnel on level %i",
    (level) => {
      const sim = startSim({ level, maze: "maze1" });
      const ghost = query(sim.world, [Ghost, Position])[0]!;
      GhostPhase.value[ghost] = GHOST_PHASE.active;
      Position.x[ghost] = cellCenterX(0);
      Position.y[ghost] = cellCenterY(horizontalTunnelRows()[0]!);
      runFrames(sim, 1);
      expect(Speed.px[ghost]! / Speed.px[playerEid(sim)]!).toBeCloseTo(0.5);
    },
  );

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

  it("clears a board into an upgrade offer, then the next level", () => {
    const sim = startSim({ jumpToUpgrade: true });
    const offer = sim.offer();
    expect(offer).not.toBeNull();
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
    const pick = sim
      .offer()!
      .upgrades.find((id) => id !== "passiveExtraLife" && id !== "passiveMyogenesis")!;
    sim.chooseUpgrade({ kind: "upgrade", id: pick });
    runUntil(sim, () => sim.snapshot().level === 3 && !sim.snapshot().levelTransition, 240);
    expect(sim.snapshot().lives).toBe(endLives);
  });

  it("buys a life at the store", () => {
    const sim = startSim({ store: true, quarters: 10 });
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
    expect(sim.offer()).not.toBeNull();
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

  function setup(enable: boolean) {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      enableUpgrades: enable ? ["passiveTurnTuning"] : [],
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

  it("does not boost a turn that is not a right angle", () => {
    const { sim, turn } = setup(true);
    cruiseFrom(sim, turn, 3);
    runFrames(sim, 4, { keys: held("left") });
    expect(sim.snapshot().player!.facing).toBe("left");
    expect(sim.snapshot().timers.turnBoostMs).toBe(0);
  });
});
