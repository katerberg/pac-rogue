import { query } from "bitecs";
import { describe, expect, it } from "vitest";
import { ghostTeleportCell, scatterTargetForKind } from "../../domain/ghostCorner";
import { GHOST_KIND } from "../../domain/ghostKind";
import {
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { WARP_GLIDE_MS } from "../../domain/warpGlide";
import { NO_KEYS_HELD } from "../systems/heldKeys";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { worldSnapshot } from "../systems/worldSnapshot";
import { LearnSim } from "./learnSim";
import { FRAME_MS, held } from "./simTesting";

describe("LearnSim", () => {
  it("runs a chosen ghost and moves the player", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.inky);
    expect(sim.ghostEid).not.toBeNull();
    expect(sim.helperBlinkyEid).not.toBeNull();
    const player = query(sim.world, [Player, Position])[0]!;
    const startX = Position.x[player]!;
    for (let i = 0; i < 60; i += 1) {
      sim.step(held("right"), FRAME_MS);
    }
    expect(Position.x[player]!).toBeGreaterThan(startX);
    expect(worldSnapshot(sim.world).ghosts).toHaveLength(2);
  });

  it("turns one pellet into a power pellet when Pellet Surge is toggled on", () => {
    const sim = new LearnSim("learn");
    sim.start();
    const before = worldSnapshot(sim.world);
    const events = sim.toggleUpgrade("passivePelletToPower");
    const after = worldSnapshot(sim.world);
    expect(after.powerPellets).toBe(before.powerPellets + 1);
    expect(after.pellets).toBe(before.pellets - 1);
    expect(events.some((event) => event.type === "bouncePowerPellet")).toBe(true);
  });

  it("toggles an enhanced form on and off for a selected upgrade", () => {
    const sim = new LearnSim("learn");
    sim.start();
    expect(sim.toggleEnhanced("passiveGhostSlow")).toEqual([]);
    expect(sim.ownedUpgrades).toEqual([]);
    sim.toggleUpgrade("passiveGhostSlow");
    sim.toggleEnhanced("passiveGhostSlow");
    expect(sim.ownedUpgrades).toEqual(["passiveGhostSlowPlus"]);
    sim.toggleEnhanced("passiveGhostSlow");
    expect(sim.ownedUpgrades).toEqual(["passiveGhostSlow"]);
    sim.toggleEnhanced("passiveGhostSlow");
    sim.toggleUpgrade("passiveGhostSlow");
    expect(sim.ownedUpgrades).toEqual([]);
  });

  it("converts one more pellet when Pellet Surge is enhanced", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.toggleUpgrade("passivePelletToPower");
    const before = worldSnapshot(sim.world).powerPellets;
    sim.toggleEnhanced("passivePelletToPower");
    expect(worldSnapshot(sim.world).powerPellets).toBe(before + 1);
  });

  it("removes an extra far pellet every five eaten when Remote Transference is on", () => {
    const pelletsAfterWalking = (upgraded: boolean): number => {
      const sim = new LearnSim("learn");
      sim.start();
      if (upgraded) {
        sim.toggleUpgrade("passiveRemoteTransference");
      }
      for (let i = 0; i < 90; i += 1) {
        sim.step(held("left"), FRAME_MS);
      }
      return worldSnapshot(sim.world).pellets;
    };
    expect(pelletsAfterWalking(true)).toBeLessThan(pelletsAfterWalking(false));
  });

  it("exposes the overlay model only while a visible ghost is selected", () => {
    const sim = new LearnSim("learn");
    sim.start();
    expect(sim.overlayModel()).toBeNull();
    sim.selectGhost(GHOST_KIND.inky);
    const model = sim.overlayModel()!;
    expect(model.kind).toBe(GHOST_KIND.inky);
    expect(model.blinkyPx).not.toBeNull();
    expect(model.playerPx).not.toBeNull();
    expect(Number.isFinite(model.target.col)).toBe(true);
  });

  it("Scatter Burst warps the chosen ghost to its corner with a glide", () => {
    const sim = new LearnSim("learn");
    sim.start();
    sim.selectGhost(GHOST_KIND.clyde);
    sim.toggleUpgrade("powerPelletScatterBurst");
    const ghost = sim.ghostEid!;
    const start = { x: Position.x[ghost]!, y: Position.y[ghost]! };
    const power = Array.from(query(sim.world, [PowerPellet, Position]))
      .map((eid) => ({ x: Position.x[eid]!, y: Position.y[eid]! }))
      .find((p) => p.y < start.y)!;
    const player = query(sim.world, [Player, Position])[0]!;
    Position.x[player] = power.x;
    Position.y[player] = power.y;
    const draw = sim
      .step(NO_KEYS_HELD, FRAME_MS)
      .flatMap((e) => (e.type === "draw" ? [e.options] : []))[0]!;
    const cell = ghostTeleportCell(scatterTargetForKind(GHOST_KIND.clyde), {
      col: worldToCol(power.x),
      row: worldToRow(power.y),
    });
    expect({ x: Position.x[ghost], y: Position.y[ghost] }).toEqual({
      x: cellCenterX(cell.col),
      y: cellCenterY(cell.row),
    });
    const head = draw.ghostWarpGlides?.[ghost]?.[0];
    expect(Math.hypot(head!.x - start.x, head!.y - start.y)).toBeLessThan(4);
    for (let ms = 0; ms < WARP_GLIDE_MS; ms += FRAME_MS) {
      sim.step(NO_KEYS_HELD, FRAME_MS);
    }
    const after = sim.step(NO_KEYS_HELD, FRAME_MS);
    expect(after.some((e) => e.type === "draw" && e.options.ghostWarpGlides)).toBe(false);
  });
});

describe("LearnSim Turn Tuning", () => {
  const tapUp = { ...NO_KEYS_HELD, right: 0, up: 1 };

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

  function tapOnTheBeat(owned: boolean) {
    const sim = new LearnSim("learn");
    sim.start();
    if (owned) {
      sim.toggleUpgrade("passiveTurnTuning");
    }
    const turn = findSideTurn();
    const player = query(sim.world, [Player, Position])[0]!;
    Position.x[player] = cellCenterX(turn.col - 2);
    Position.y[player] = cellCenterY(turn.row);
    sim.step(held("right"), FRAME_MS);
    sim.step(held("right"), FRAME_MS);
    Position.x[player] = cellCenterX(turn.col) - 6;
    const events = sim.step(tapUp, FRAME_MS);
    for (let i = 0; i < 30; i += 1) {
      events.push(...sim.step({ ...NO_KEYS_HELD, right: 0, up: 1 }, FRAME_MS));
    }
    return { sim, events };
  }

  it("emits perfect sparks and a turn flash on a clean tap on the beat", () => {
    const { events } = tapOnTheBeat(true);
    const perfect = events.filter(
      (event) => event.type === "turnSparks" && event.kind === "perfect",
    );
    expect(perfect).toHaveLength(1);
    const flashes = events.flatMap((event) =>
      event.type === "draw" ? [event.options.turnFlashRemainingMs ?? 0] : [],
    );
    expect(Math.max(...flashes)).toBeGreaterThan(200);
  });

  it("does nothing on the same tap without Turn Tuning", () => {
    const { events } = tapOnTheBeat(false);
    expect(events.some((event) => event.type === "turnSparks")).toBe(false);
  });
});
