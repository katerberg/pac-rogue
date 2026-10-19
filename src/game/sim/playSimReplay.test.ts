import { query } from "bitecs";
import { describe, expect, it } from "vitest";
import { defaultPlayOptions, type PlayOptions } from "../../domain/playOptions";
import { PLAYER_INVULN_TINT } from "../../domain/playerTint";
import { REPLAY_MAX_SIM_MS, REPLAY_SAMPLE_MS } from "../../domain/replay";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Pellet } from "../components/Pellet";
import { PowerPellet } from "../components/PowerPellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PlaySim, RUN_END_MENU_ARM_MS } from "./playSim";
import { FRAME_MS, held, runFrames, runUntil } from "./simTesting";

function startSim(overrides: Partial<PlayOptions>): PlaySim {
  const sim = new PlaySim({ ...defaultPlayOptions(), ...overrides }, "replay");
  sim.start();
  return sim;
}

function ghostOntoPlayer(sim: PlaySim): void {
  const ghost = query(sim.world, [Ghost, Position])[0]!;
  const player = query(sim.world, [Player, Position])[0]!;
  Position.x[ghost] = Position.x[player]!;
  Position.y[ghost] = Position.y[player]!;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
}

describe("PlaySim run replay", () => {
  it("records ordered frames and a pellet removal while the player eats", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    runFrames(sim, 120, { keys: held("left") });
    const [segment, ...rest] = sim.replay().segments;
    expect(rest).toEqual([]);
    expect(segment!.level).toBe(2);
    expect(segment!.layout.walls.some((row) => row.some(Boolean))).toBe(true);
    expect(segment!.frames[0]!.mazeColorInverted).toBe(false);
    expect(segment!.frames.length).toBeGreaterThan(10);
    const times = segment!.frames.map((frame) => frame.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(segment!.frames[0]!.player).not.toBeNull();
    expect(segment!.items.some((event) => event.op === "add" && event.art === "pellet")).toBe(true);
    expect(segment!.items.some((event) => event.op === "remove" && event.art === "pellet")).toBe(
      true,
    );
  });

  it("records a death and then reaches the shared run-end screen on game over", () => {
    const sim = startSim({ level: 2, maze: "maze1", lives: 1 });
    runFrames(sim, 30);
    ghostOntoPlayer(sim);
    const events = runUntil(sim, () => sim.snapshot().runEnd, 600);
    expect(events).toContainEqual({ type: "endText", title: "GAME OVER" });
    expect(events.some((event) => event.type === "goToMenu")).toBe(false);
    expect(sim.replay().segments[0]!.deaths).toHaveLength(1);

    expect(sim.chooseRunEnd("menu")).toEqual([]);
    runUntil(
      sim,
      () => sim.snapshot().runEndMenuArmed,
      Math.ceil(RUN_END_MENU_ARM_MS / FRAME_MS) + 1,
    );
    expect(sim.snapshot()).toMatchObject({ runEnd: true, runComplete: false });
    expect(runFrames(sim, 600).some((event) => event.type === "goToMenu")).toBe(false);
    expect(sim.chooseRunEnd("menu")).toEqual([{ type: "goToMenu" }]);
  });

  it("starts a new segment on the next level and keeps the earlier one", () => {
    const sim = startSim({ level: 2, maze: "maze1", godMode: true, disableLevelUpgrades: true });
    runFrames(sim, 60);
    sim["jumpToLevelClear"]();
    runUntil(sim, () => sim.snapshot().level === 3, 1200, { acknowledge: true });
    runFrames(sim, 60);
    const { segments } = sim.replay();
    expect(segments.map((segment) => segment.level)).toEqual([2, 3]);
    expect(segments[0]!.layout).not.toBe(segments[1]!.layout);
  });

  it("keeps the replay when a boss run completes", () => {
    const sim = startSim({ level: 9, boss: "blinkySwarm", bossStageAdvance: true, godMode: true });
    runFrames(sim, 30);
    sim["jumpToLevelClear"]();
    runUntil(
      sim,
      () => sim.snapshot().boss?.stage === 2 && !sim.snapshot().bossStageTransition,
      3000,
    );
    runFrames(sim, 30);
    sim["jumpToLevelClear"]();
    const events = runUntil(sim, () => sim.snapshot().runComplete, 600);
    expect(events).toContainEqual({ type: "endText", title: "RUN COMPLETE" });
    const { segments } = sim.replay();
    expect(segments).toHaveLength(1);
    expect(segments[0]!.frames.length).toBeGreaterThan(5);
  });

  it("records a replaced entity as remove then add", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    runFrames(sim, 10);
    const [pellet] = query(sim.world, [Pellet, Position]);
    Position.x[pellet!] = Position.x[pellet!]! + 3;
    runFrames(sim, 10);
    const events = sim.replay().segments[0]!.items.filter((event) => event.eid === pellet);
    expect(events.map((event) => event.op)).toEqual(["add", "remove", "add"]);
  });

  it("records the invulnerable tint on the player", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    runFrames(sim, 30);
    sim["runUpgrades"] = { ...sim["runUpgrades"], invulnRemainingMs: 5000 };
    runFrames(sim, 30);
    const { frames } = sim.replay().segments[0]!;
    expect(frames[0]!.player!.tint).toBeNull();
    expect(frames.at(-1)!.player!.tint).toBe(PLAYER_INVULN_TINT);
  });

  it("records frightened ghosts after a Hunter power pellet", () => {
    const sim = startSim({
      level: 2,
      maze: "maze1",
      infiniteLives: true,
      godMode: true,
      enableUpgrades: ["powerPelletHunter"],
    });
    const out = () =>
      [...query(sim.world, [Ghost, Position])].filter(
        (eid) => GhostPhase.value[eid] !== GHOST_PHASE.inHouse,
      );
    runUntil(sim, () => out().length > 0, 60 * 15, { keys: held("left") });
    const power = query(sim.world, [PowerPellet, Position])[0]!;
    const player = query(sim.world, [Player, Position])[0]!;
    Position.x[player] = Position.x[power]!;
    Position.y[player] = Position.y[power]!;
    runFrames(sim, 20);
    const last = sim.replay().segments[0]!.frames.at(-1)!;
    expect(last.ghosts.some((ghost) => ghost.look === "frightened")).toBe(true);
    expect(
      sim.replay().segments[0]!.frames[0]!.ghosts.every((ghost) => ghost.look === "normal"),
    ).toBe(true);
  });

  it("has no replay before any play frame", () => {
    expect(startSim({ level: 2, maze: "maze1" }).replay().segments).toEqual([]);
  });

  it("samples at the replay rate", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    runFrames(sim, 120);
    const { frames } = sim.replay().segments[0]!;
    const gap = frames[2]!.t - frames[1]!.t;
    expect(gap).toBeGreaterThan(REPLAY_SAMPLE_MS - 1);
    expect(gap).toBeLessThan(REPLAY_SAMPLE_MS + FRAME_MS);
  });

  it("stops recording past the replay cap", () => {
    const sim = startSim({ level: 2, maze: "maze1", godMode: true });
    sim["replayRecorder"]["totalMs"] = REPLAY_MAX_SIM_MS;
    runFrames(sim, 60);
    expect(sim.replay().segments).toEqual([]);
  });
});
