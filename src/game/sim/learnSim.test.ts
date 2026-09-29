import { query } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
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
});
