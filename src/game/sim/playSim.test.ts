import { query } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import { getActiveLayout, cellCenterX, cellCenterY, horizontalTunnelRows } from "../../domain/maze";
import { STORE_MAZE_ASCII } from "../../domain/mazeLayouts";
import { defaultPlayOptions, type PlayOptions } from "../../domain/playOptions";
import { PLAYER_SPEED } from "../../domain/playfield";
import { parseStoreSlots } from "../../domain/store";
import { BossPellet } from "../components/BossPellet";
import { Ghost } from "../components/Ghost";
import { GHOST_PHASE, GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { PlaySim } from "./playSim";
import type { SimEvent } from "./simEvents";
import { held, runFrames, runUntil } from "./simTesting";

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

function count(events: SimEvent[], type: SimEvent["type"]): number {
  return events.filter((event) => event.type === type).length;
}

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
