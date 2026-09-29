import { query } from "bitecs";
import { describe, expect, it } from "vitest";
import { getActiveLayout, cellCenterX, cellCenterY } from "../../domain/maze";
import { STORE_MAZE_ASCII } from "../../domain/mazeLayouts";
import { defaultPlayOptions, type PlayOptions } from "../../domain/playOptions";
import { parseStoreSlots } from "../../domain/store";
import { BossPellet } from "../components/BossPellet";
import { Ghost } from "../components/Ghost";
import { GHOST_PHASE, GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
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
  it("collects pellets while the player moves", () => {
    const sim = startSim({ level: 2, maze: "maze1" });
    const events = runFrames(sim, 60, { keys: held("left") });
    expect(sim.snapshot().boardCollected).toBeGreaterThan(0);
    expect(count(events, "pelletSfx")).toBeGreaterThan(0);
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

  it("opens later levels in scatter, then switches to chase after the arcade scatter", () => {
    const sim = startSim({ level: 5, infiniteLives: true }, "scatter-open");
    expect(sim.snapshot().ghostMode).toBe("scatter");
    runUntil(sim, () => sim.snapshot().ghosts.some((g) => g.phase === "active"), 1200, {
      keys: held("left"),
    });
    expect(sim.snapshot().ghostMode).toBe("scatter");
    runFrames(sim, Math.ceil(5.5 * 60), { keys: held("left") });
    expect(sim.snapshot().ghostMode).toBe("chase");
  });
});
