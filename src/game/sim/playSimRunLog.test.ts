import { query } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, horizontalTunnelRows, TILE_SIZE } from "../../domain/maze";
import { STORE_MAZE_ASCII } from "../../domain/mazeLayouts";
import { defaultPlayOptions, type PlayOptions } from "../../domain/playOptions";
import type { RunLogRecord } from "../../domain/runLog";
import { parseStoreSlots } from "../../domain/store";
import { Fruit } from "../components/Fruit";
import { Ghost } from "../components/Ghost";
import { GHOST_PHASE, GhostPhase } from "../components/GhostPhase";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { PlaySim } from "./playSim";
import type { SimEvent } from "./simEvents";
import { held, runFrames, runUntil } from "./simTesting";

function startSim(
  overrides: Partial<PlayOptions>,
  seed = "runlog",
): { sim: PlaySim; events: SimEvent[] } {
  const sim = new PlaySim({ ...defaultPlayOptions(), ...overrides }, seed);
  return { sim, events: sim.start() };
}

function runLogs(events: readonly SimEvent[]): RunLogRecord[] {
  return events.flatMap((event) => (event.type === "runLog" ? [event.record] : []));
}

function playerEid(sim: PlaySim): number {
  return query(sim.world, [Player, Position])[0]!;
}

function teleportPlayer(sim: PlaySim, x: number, y: number): void {
  const eid = playerEid(sim);
  Position.x[eid] = x;
  Position.y[eid] = y;
}

function firstGhost(sim: PlaySim): number {
  return query(sim.world, [Ghost, Position])[0]!;
}

function ghostOntoPlayer(sim: PlaySim): void {
  const ghost = firstGhost(sim);
  const player = playerEid(sim);
  Position.x[ghost] = Position.x[player]!;
  Position.y[ghost] = Position.y[player]!;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
}

describe("PlaySim run log", () => {
  it("emits an in-progress record at run start with the starting upgrade in the loadout", () => {
    const { events } = startSim({});
    const [record] = runLogs(events);
    expect(record).toMatchObject({ outcome: "inProgress", finalLevel: 1, debug: false });
    expect(record!.levels).toHaveLength(1);
    expect(record!.loadout).toEqual([expect.objectContaining({ source: "start", level: 1 })]);
  });

  it("records every death and finishes as a death on game over", () => {
    const { sim } = startSim({ level: 2, maze: "maze1" });
    const startLives = sim.snapshot().lives;
    const events: SimEvent[] = [];
    for (let i = 0; i < 10 && runLogs(events).at(-1)?.outcome !== "death"; i += 1) {
      runFrames(sim, 5, { keys: held("left") });
      ghostOntoPlayer(sim);
      events.push(...runFrames(sim, 1));
      events.push(...runUntil(sim, () => !sim.snapshot().dying, 600));
    }
    const record = runLogs(events).at(-1)!;
    expect(record.outcome).toBe("death");
    const deaths = record.levels[0]!.deaths;
    expect(deaths).toHaveLength(startLives);
    expect(deaths.map((death) => death.livesAfter)).toEqual(
      Array.from({ length: startLives }, (_, i) => startLives - 1 - i),
    );
    for (const death of deaths) {
      expect(death.ghost).not.toBeNull();
      expect(["scatter", "chase"]).toContain(death.ghostMode);
      expect(death.col).toBeGreaterThanOrEqual(0);
    }
  });

  it("records the level clear, time bonus, offer pick and lives regen", () => {
    const { sim } = startSim({ jumpToUpgrade: true });
    runUntil(sim, () => sim.offer() !== null, 120);
    const pick = sim.offer()!.upgrades[0]!;
    sim.chooseUpgrade({ kind: "upgrade", id: pick });
    const events = runUntil(sim, () => sim.snapshot().levelTransition, 60);
    const level = runLogs(events).at(-1)!.levels[0]!;
    expect(level).toMatchObject({ level: 2, cleared: true, livesEnd: sim.snapshot().lives });
    expect(level.countdownEnd).not.toBeNull();
    expect(level.timeBonusPoints).toBeGreaterThan(0);
    expect(level.pelletsCollected).toBeGreaterThan(0);
    expect(level.pace.p100).not.toBeNull();
    expect(level.offer).toMatchObject({ picked: pick });
    expect(level.offer!.choiceMs).toBeGreaterThanOrEqual(0);
    expect(sim.runLogRecord().loadout).toContainEqual({ id: pick, source: "offer", level: 2 });
  });

  it("sets the 100% pace mark when a board clears with power pellets left", () => {
    const { sim } = startSim({ level: 2, infiniteLives: true });
    const regular = query(sim.world, [Pellet, Position]).filter(
      (eid) => !query(sim.world, [PowerPellet]).includes(eid),
    );
    for (const eid of regular) {
      teleportPlayer(sim, Position.x[eid]!, Position.y[eid]!);
      runFrames(sim, 1);
    }
    expect(query(sim.world, [PowerPellet]).length).toBeGreaterThan(0);
    const level = sim.runLogRecord().levels[0]!;
    expect(level.cleared).toBe(true);
    expect(level.pace.p100).not.toBeNull();
  });

  it("finishes as complete when the last level is cleared", () => {
    const { sim } = startSim({ level: 9, boss: "blinkySwarm", bossStageAdvance: true });
    runUntil(
      sim,
      () => sim.snapshot().boss?.stage === 2 && sim.snapshot().bossStageTransition === false,
      200,
    );
    sim["jumpToLevelClear"]();
    const events = runUntil(sim, () => sim.snapshot().runComplete, 300);
    expect(runLogs(events).at(-1)).toMatchObject({ outcome: "complete", finalLevel: 9 });
  });

  it("finishes as quit once, and never after the run has ended", () => {
    const { sim } = startSim({});
    runFrames(sim, 5);
    expect(runLogs(sim.finishRun("quit"))).toEqual([expect.objectContaining({ outcome: "quit" })]);
    expect(sim.finishRun("quit")).toEqual([]);
  });

  it("counts a tunnel wrap", () => {
    const { sim } = startSim({ level: 2, maze: "maze1", godMode: true });
    const row = horizontalTunnelRows()[0]!;
    teleportPlayer(sim, cellCenterX(0), cellCenterY(row));
    runUntil(sim, () => sim.snapshot().runLog.tunnelWraps === 1, 120, { keys: held("left") });
    expect(sim.runLogRecord().levels[0]!.tunnelWraps).toBe(1);
  });

  it("records first move, travel and idle time", () => {
    const { sim } = startSim({ level: 2, maze: "maze1", godMode: true });
    runFrames(sim, 30, { keys: held("left") });
    runFrames(sim, 30);
    const level = sim.runLogRecord().levels[0]!;
    expect(level.firstMoveMs).not.toBeNull();
    expect(level.tilesTraveled).toBeGreaterThan(0);
    expect(level.simMs).toBeGreaterThan(900);
  });

  it("records a fruit spawn and when it was eaten", () => {
    const { sim } = startSim({ level: 2, maze: "maze1", infiniteLives: true });
    sim["spawnFruitEntity"](false);
    const fruit = query(sim.world, [Fruit, Position])[0]!;
    teleportPlayer(sim, Position.x[fruit]!, Position.y[fruit]!);
    runFrames(sim, 1);
    expect(sim.runLogRecord().levels[0]!.fruit).toEqual([
      { kind: "strawberry", spawnedMs: expect.any(Number), eatenMs: expect.any(Number) },
    ]);
  });

  it("attributes a power pellet, its freeze activation, target and active time", () => {
    const { sim } = startSim({
      level: 2,
      maze: "maze1",
      godMode: true,
      enableUpgrades: ["powerPelletFreeze"],
    });
    GhostPhase.value[firstGhost(sim)] = GHOST_PHASE.active;
    const power = query(sim.world, [Pellet, PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 10);
    const level = sim.runLogRecord().levels[0]!;
    expect(level.powerPellets.player).toBe(1);
    expect(level.activations.freeze).toBe(1);
    expect(level.targets.freeze).toHaveLength(1);
    expect(level.activeMs.freeze).toBeGreaterThan(0);
  });

  it("records a Shield Pellets break as an activation, not a death", () => {
    const { sim } = startSim({ level: 2, maze: "maze1", enableUpgrades: ["passiveShieldPellets"] });
    const power = query(sim.world, [Pellet, PowerPellet, Position])[0]!;
    teleportPlayer(sim, Position.x[power]!, Position.y[power]!);
    runFrames(sim, 1);
    ghostOntoPlayer(sim);
    runFrames(sim, 1);
    const level = sim.runLogRecord().levels[0]!;
    expect(level.activations.shieldBreak).toBe(1);
    expect(level.deaths).toEqual([]);
  });

  it("counts a near miss once per ghost per cooldown", () => {
    const { sim } = startSim({ level: 2, maze: "maze1", godMode: true });
    const ghost = firstGhost(sim);
    for (let frame = 0; frame < 10; frame += 1) {
      const player = playerEid(sim);
      Position.x[ghost] = Position.x[player]! + TILE_SIZE / 2;
      Position.y[ghost] = Position.y[player]!;
      GhostPhase.value[ghost] = GHOST_PHASE.active;
      runFrames(sim, 1);
    }
    expect(sim.runLogRecord().levels[0]!.nearMisses).toBe(1);
  });

  it("records a store visit with its purchases on exit", () => {
    const { sim } = startSim({ store: 1, lives: 2, maxLives: 4, quarters: 10 });
    const life = parseStoreSlots(STORE_MAZE_ASCII).find((slot) => slot.kind === "life")!;
    teleportPlayer(sim, cellCenterX(life.col), cellCenterY(life.row));
    runFrames(sim, 1);
    runFrames(sim, 1, { storeToggle: true });
    runFrames(sim, 1, { storeConfirm: true });
    sim["exitStore"]();
    const visit = sim.runLogRecord().storeVisits[0]!;
    expect(visit).toMatchObject({ quartersIn: 10, purchases: [{ kind: "life" }] });
    expect(visit.quartersOut).toBeLessThan(10);
  });

  it("records an enhancement as the base upgrade leaving and its Plus form arriving", () => {
    const { sim } = startSim({
      store: 1,
      level: 5,
      quarters: 10,
      enableUpgrades: ["passiveGhostSlow"],
    });
    const slot = parseStoreSlots(STORE_MAZE_ASCII).find((cell) => cell.kind === "enhance")!;
    teleportPlayer(sim, cellCenterX(slot.col), cellCenterY(slot.row));
    runFrames(sim, 1);
    runFrames(sim, 1, { storeToggle: true });
    runFrames(sim, 1, { storeConfirm: true });
    expect(sim.runLogRecord().loadout).toEqual([
      { id: "passiveGhostSlow", source: "flag", level: 5, removedLevel: 5 },
      { id: "passiveGhostSlowPlus", source: "enhance", level: 5 },
    ]);
  });

  it("adds paused and hidden time to the current level", () => {
    const { sim } = startSim({});
    sim.notePause(500);
    sim.noteHidden(250);
    expect(sim.runLogRecord().levels[0]).toMatchObject({
      pausedMs: 500,
      pauseCount: 1,
      hiddenMs: 250,
    });
  });

  it("marks runs with high-score-disabling flags as debug", () => {
    const { events } = startSim({ highScoresDisabled: true });
    expect(runLogs(events)[0]!.debug).toBe(true);
  });

  it("records the same log for the same seed and inputs", () => {
    const records = [0, 1].map(() => {
      const { sim } = startSim({ level: 2 }, "replay");
      runFrames(sim, 180, { keys: held("left") });
      return sim.runLogRecord();
    });
    expect(records[0]).toEqual(records[1]);
  });
});
