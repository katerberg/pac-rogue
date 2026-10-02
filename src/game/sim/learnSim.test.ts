import { query } from "bitecs";
import { describe, expect, it } from "vitest";
import { ghostTeleportCell, scatterTargetForKind } from "../../domain/ghostCorner";
import { GHOST_KIND } from "../../domain/ghostKind";
import { cellCenterX, cellCenterY, worldToCol, worldToRow } from "../../domain/maze";
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

  it("greys the pellets Lazy Looper does not need, fewer kept with Plus, none once off", () => {
    const sim = new LearnSim("learn");
    sim.start();
    expect(worldSnapshot(sim.world).optionalPellets).toBe(0);
    sim.toggleUpgrade("passiveLazyLooper");
    const base = worldSnapshot(sim.world).optionalPellets;
    expect(base).toBeGreaterThan(0);
    sim.toggleEnhanced("passiveLazyLooper");
    expect(worldSnapshot(sim.world).optionalPellets).toBeGreaterThan(base);
    sim.toggleUpgrade("passiveLazyLooperPlus");
    expect(worldSnapshot(sim.world).optionalPellets).toBe(0);
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
